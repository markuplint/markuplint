//! MLDOM builder and traversal tests.

use markuplint_dom::arena::NodeId;
use markuplint_dom::builder;
use markuplint_dom::node::DomNode;

fn load_fixture(name: &str) -> String {
    let path = format!(
        "{}/tests/fixtures/{}.json",
        env!("CARGO_MANIFEST_DIR").replace("markuplint-dom", "markuplint-core"),
        name
    );
    std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("Failed to read fixture {path}: {e}"))
}

fn build_from_fixture(name: &str) -> markuplint_dom::arena::DomArena {
    let json = load_fixture(name);
    builder::build_from_json(&json).expect("Failed to build DOM")
}

// --- Empty document ---

#[test]
fn empty_document_has_only_root() {
    let arena = build_from_fixture("empty-document");
    // Document root + no children
    assert_eq!(arena.len(), 1);
    assert!(matches!(arena.get(0), Some(DomNode::Document(_))));
    assert!(arena.children_of(0).unwrap().is_empty());
}

// --- Single element ---

#[test]
fn simple_document_structure() {
    let arena = build_from_fixture("simple");
    // Should have Document + some nodes
    assert!(arena.len() > 1);

    // Document root
    let doc = arena.document().unwrap();
    assert!(matches!(doc, DomNode::Document(_)));

    // First child should be an element (div)
    let children = arena.children_of(0).unwrap();
    assert!(!children.is_empty());

    // Find the div element
    let div = arena.elements().find(|(_, el)| el.base.node_name == "div");
    assert!(div.is_some(), "Expected a <div> element");
}

// --- Nested elements ---

#[test]
fn nested_parent_child_links() {
    let arena = build_from_fixture("nested");

    // Find div and span
    let div = arena.elements().find(|(_, el)| el.base.node_name == "div");
    let span = arena.elements().find(|(_, el)| el.base.node_name == "span");
    assert!(div.is_some(), "Expected <div>");
    assert!(span.is_some(), "Expected <span>");

    let (div_id, _) = div.unwrap();
    let (span_id, _) = span.unwrap();

    // span's parent should be div
    let span_parent = arena.parent(span_id);
    assert!(span_parent.is_some());
    assert_eq!(span_parent.unwrap().id(), div_id);

    // div should have span as child
    let div_children = arena.children_of(div_id).unwrap();
    assert!(div_children.contains(&span_id));
}

// --- Sibling links ---

#[test]
fn sibling_links() {
    let arena = build_from_fixture("multiple-elements");

    // Find all <p> elements
    let ps: Vec<(NodeId, _)> = arena.elements().filter(|(_, el)| el.base.node_name == "p").collect();
    assert!(ps.len() >= 3, "Expected at least 3 <p> elements");

    // Check next/prev sibling links between top-level nodes
    let doc_children = arena.children_of(0).unwrap();
    if doc_children.len() >= 2 {
        let first = doc_children[0];
        let second = doc_children[1];
        assert_eq!(arena.next_sibling(first).map(|n| n.id()), Some(second));
        assert_eq!(arena.prev_sibling(second).map(|n| n.id()), Some(first));
    }
}

// --- Root parent is None ---

#[test]
fn root_has_no_parent() {
    let arena = build_from_fixture("simple");
    assert!(arena.parent(0).is_none());
}

// --- Leaf children are empty ---

#[test]
fn leaf_has_no_children() {
    let arena = build_from_fixture("simple");
    // Find a text node
    let text_node = arena.descendants(0).find(|n| matches!(n, DomNode::Text(_)));
    if let Some(text) = text_node {
        assert!(text.children().is_empty());
    }
}

// --- Invalid NodeId ---

#[test]
fn invalid_node_id_returns_none() {
    let arena = build_from_fixture("simple");
    assert!(arena.get(999_999).is_none());
}

// --- Nonexistent UUID ---

#[test]
fn nonexistent_uuid_returns_none() {
    let arena = build_from_fixture("simple");
    assert!(arena.get_by_uuid("nonexistent-uuid").is_none());
}

// --- UUID lookup ---

#[test]
fn uuid_lookup_works() {
    let arena = build_from_fixture("simple");
    // All non-Document nodes should have UUIDs that resolve
    for node in arena.descendants(0) {
        if let Some(uuid) = node.uuid() {
            let found = arena.get_by_uuid(uuid);
            assert!(found.is_some(), "UUID {uuid} not found in arena");
            assert_eq!(found.unwrap().id(), node.id());
        }
    }
}

// --- Ancestors iterator ---

#[test]
fn ancestors_terminate_at_root() {
    let arena = build_from_fixture("nested");

    // Find the deepest text node
    let text = arena.descendants(0).find(|n| matches!(n, DomNode::Text(_)));
    if let Some(text_node) = text {
        let ancestor_count = arena.ancestors(text_node.id()).count();
        // Should have at least Document > div > span > text (3 ancestors for text)
        assert!(
            ancestor_count >= 1,
            "Expected at least 1 ancestor, got {ancestor_count}"
        );

        // Last ancestor should be Document
        let last = arena.ancestors(text_node.id()).last();
        assert!(matches!(last, Some(DomNode::Document(_))));
    }
}

// --- Descendants iterator (document order) ---

#[test]
fn descendants_document_order() {
    let arena = build_from_fixture("nested");
    let descendants: Vec<_> = arena.descendants(0).collect();
    // Should visit nodes in depth-first pre-order
    assert!(!descendants.is_empty());

    // First descendant should be the first child of document
    let first_child_id = arena.children_of(0).unwrap()[0];
    assert_eq!(descendants[0].id(), first_child_id);
}

// --- Elements iterator ---

#[test]
fn elements_iterator() {
    let arena = build_from_fixture("multiple-elements");
    let elements: Vec<_> = arena.elements().collect();
    assert!(elements.len() >= 3, "Expected at least 3 elements");
}

// --- Doctype node ---

#[test]
fn doctype_node_in_dom() {
    let arena = build_from_fixture("doctype");
    let has_doctype = arena.descendants(0).any(|n| matches!(n, DomNode::Doctype(_)));
    assert!(has_doctype, "Expected a doctype node in DOM");
}

// --- Comment node ---

#[test]
fn comment_node_in_dom() {
    let arena = build_from_fixture("comment");
    let has_comment = arena.descendants(0).any(|n| matches!(n, DomNode::Comment(_)));
    assert!(has_comment, "Expected a comment node in DOM");
}

// --- Deep nesting ---

/// Generate a minimal MLAST JSON document with `depth` levels of nested `<div>` elements.
/// The innermost element contains a text node "leaf".
/// This produces deeply nested `childNodes` that exercise serde's recursion limit.
fn generate_deep_nested_json(depth: u32) -> String {
    use std::fmt::Write;

    let mut json = String::with_capacity(depth as usize * 512);

    let raw_html = format!(
        "{}leaf{}",
        "<div>".repeat(depth as usize),
        "</div>".repeat(depth as usize)
    );

    write!(json, r#"{{"raw":"{}","nodeList":["#, raw_html).unwrap();

    for i in 0..depth {
        if i > 0 {
            json.push(',');
        }
        let parent = if i == 0 {
            "null".to_owned()
        } else {
            format!(r#""el-{}""#, i - 1)
        };
        write!(
            json,
            r#"{{"type":"starttag","uuid":"el-{i}","raw":"<div>","offset":{offset},"line":1,"col":{col},"nodeName":"div","depth":{i},"namespace":"http://www.w3.org/1999/xhtml","elementType":"html","isFragment":false,"attributes":[],"childNodes":[],"blockBehavior":null,"pairNodeUuid":"end-{i}","tagOpenChar":"<","tagCloseChar":">","isGhost":false,"parentNodeUuid":{parent}}}"#,
            offset = i * 5,
            col = i * 5 + 1,
        )
        .unwrap();
    }

    let text_offset = depth * 5;
    write!(
        json,
        r##",{{"type":"text","uuid":"txt","raw":"leaf","offset":{text_offset},"line":1,"col":{col},"nodeName":"#text","depth":{depth},"parentNodeUuid":"el-{parent}"}}"##,
        col = text_offset + 1,
        parent = depth - 1,
    )
    .unwrap();

    for i in (0..depth).rev() {
        let end_offset = text_offset + 4 + (depth - 1 - i) * 6;
        let parent = if i == 0 {
            "null".to_owned()
        } else {
            format!(r#""el-{}""#, i - 1)
        };
        write!(
            json,
            r#",{{"type":"endtag","uuid":"end-{i}","raw":"</div>","offset":{end_offset},"line":1,"col":{col},"nodeName":"div","depth":{i},"pairNodeUuid":"el-{i}","tagOpenChar":"</","tagCloseChar":">","parentNodeUuid":{parent}}}"#,
            col = end_offset + 1,
        )
        .unwrap();
    }

    json.push_str(r#"],"isFragment":true}"#);

    let mut doc: serde_json::Value = serde_json::from_str(&json).unwrap();
    let node_list = doc["nodeList"].as_array().unwrap().clone();

    let mut starttags: Vec<serde_json::Value> = node_list.iter().filter(|n| n["type"] == "starttag").cloned().collect();
    let text_node: serde_json::Value = node_list.iter().find(|n| n["type"] == "text").cloned().unwrap();

    let mut inner_child = text_node;
    for i in (0..starttags.len()).rev() {
        starttags[i]["childNodes"] = serde_json::json!([inner_child]);
        inner_child = starttags[i].clone();
    }

    let node_list_mut = doc["nodeList"].as_array_mut().unwrap();
    node_list_mut[0] = inner_child;

    serde_json::to_string(&doc).unwrap()
}

#[test]
fn deep_nesting_builds_successfully() {
    let json = generate_deep_nested_json(130);
    let doc = markuplint_core::mlast::parse_mlast_deep(&json).expect("Failed to parse deep JSON");
    let arena = builder::build(&doc);
    // 130 elements + 1 text + 1 document root = 132 nodes
    assert!(arena.len() > 130, "Expected many nodes for deep nesting");
}

// --- OmittedTag (ghost element) ---

#[test]
fn omitted_tag_is_ghost_element() {
    use markuplint_core::mlast::{MLASTDocument, MLASTNode, MLASTOmittedTag};

    let doc = MLASTDocument {
        node_list: vec![MLASTNode::OmittedTag(MLASTOmittedTag {
            uuid: "omitted-1".to_owned(),
            raw: String::new(),
            offset: 0,
            line: 1,
            col: 1,
            node_name: "tbody".to_owned(),
            depth: 1,
            parent_node_uuid: None,
        })],
        raw: String::new(),
        is_fragment: false,
        unknown_parse_error: None,
    };
    let arena = builder::build(&doc);

    let (_, el) = arena.elements().next().expect("should have one element");
    assert_eq!(el.base.node_name, "tbody");
    assert!(el.is_ghost, "OmittedTag should produce is_ghost = true");
    assert!(el.attributes.is_empty());
}

// --- Invalid node with kind=starttag ---

#[test]
fn invalid_starttag_becomes_element() {
    use markuplint_core::mlast::{MLASTDocument, MLASTInvalid, MLASTNode};

    let doc = MLASTDocument {
        node_list: vec![MLASTNode::Invalid(MLASTInvalid {
            uuid: "invalid-1".to_owned(),
            raw: "<bad>".to_owned(),
            offset: 0,
            line: 1,
            col: 1,
            node_name: "#invalid".to_owned(),
            depth: 1,
            kind: Some("starttag".to_owned()),
            is_bogus: false,
            parent_node_uuid: None,
        })],
        raw: String::new(),
        is_fragment: false,
        unknown_parse_error: None,
    };
    let arena = builder::build(&doc);

    let (_, el) = arena.elements().next().expect("should have one element");
    assert_eq!(el.base.node_name, "x-invalid");
    assert!(!el.is_ghost);
}

// --- Invalid node without starttag ---

#[test]
fn invalid_non_starttag_becomes_invalid_node() {
    use markuplint_core::mlast::{MLASTDocument, MLASTInvalid, MLASTNode};

    let doc = MLASTDocument {
        node_list: vec![MLASTNode::Invalid(MLASTInvalid {
            uuid: "invalid-2".to_owned(),
            raw: "garbage".to_owned(),
            offset: 0,
            line: 1,
            col: 1,
            node_name: "#invalid".to_owned(),
            depth: 1,
            kind: Some("other".to_owned()),
            is_bogus: false,
            parent_node_uuid: None,
        })],
        raw: String::new(),
        is_fragment: false,
        unknown_parse_error: None,
    };
    let arena = builder::build(&doc);

    let has_invalid = arena.descendants(0).any(|n| matches!(n, DomNode::Invalid(_)));
    assert!(has_invalid, "should have an Invalid node");
    // No elements should exist
    assert_eq!(arena.elements().count(), 0);
}

// --- Source location is preserved ---

#[test]
fn source_location_preserved() {
    let arena = build_from_fixture("simple");
    let (_, div) = arena
        .elements()
        .find(|(_, el)| el.base.node_name == "div")
        .expect("Expected <div>");

    assert!(div.base.line >= 1, "line should be at least 1");
    assert!(div.base.col >= 1, "col should be at least 1");
    assert_eq!(div.base.offset, 0, "first element offset should be 0");
    // MLAST parser sets top-level element depth to 0
    assert_eq!(div.base.depth, 0, "top-level element depth should be 0");
}

// --- Ancestor strict bottom-up order ---

#[test]
fn ancestors_are_strictly_bottom_up() {
    let arena = build_from_fixture("nested");

    // Find the text node inside span
    let text = arena
        .descendants(0)
        .find(|n| matches!(n, DomNode::Text(t) if t.base.raw == "text"))
        .expect("Expected text node");

    let ancestors: Vec<_> = arena.ancestors(text.id()).collect();

    // Each ancestor[i] must be the parent of ancestor[i-1]
    for i in 1..ancestors.len() {
        let parent = arena.parent(ancestors[i - 1].id());
        assert_eq!(
            parent.map(|p| p.id()),
            Some(ancestors[i].id()),
            "ancestors[{i}] should be parent of ancestors[{}]",
            i - 1
        );
    }
}

// --- Insta snapshot for simple document tree ---

#[test]
fn snapshot_simple_tree() {
    let arena = build_from_fixture("simple");
    let mut output = String::new();
    format_tree(&arena, 0, 0, &mut output);
    insta::assert_snapshot!(output);
}

fn format_tree(arena: &markuplint_dom::arena::DomArena, id: NodeId, indent: usize, output: &mut String) {
    let Some(node) = arena.get(id) else { return };
    let prefix = "  ".repeat(indent);
    match node {
        DomNode::Document(_) => output.push_str(&format!("{prefix}Document\n")),
        DomNode::Element(d) => output.push_str(&format!("{prefix}Element({})\n", d.base.node_name)),
        DomNode::Text(d) => {
            let raw = d.base.raw.replace('\n', "\\n");
            output.push_str(&format!("{prefix}Text({raw})\n"));
        }
        DomNode::Comment(d) => output.push_str(&format!("{prefix}Comment({})\n", d.base.raw)),
        DomNode::Doctype(d) => output.push_str(&format!("{prefix}Doctype({})\n", d.name)),
        DomNode::PSBlock(d) => output.push_str(&format!("{prefix}PSBlock({})\n", d.base.node_name)),
        DomNode::Invalid(d) => output.push_str(&format!("{prefix}Invalid({})\n", d.base.node_name)),
        DomNode::EndTag(d) => output.push_str(&format!("{prefix}EndTag({})\n", d.base.node_name)),
    }
    for &child_id in node.children() {
        format_tree(arena, child_id, indent + 1, output);
    }
}
