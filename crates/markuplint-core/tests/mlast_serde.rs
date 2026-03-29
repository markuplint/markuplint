//! MLAST deserialization tests using JSON fixtures generated from the TS parser.

use markuplint_core::mlast::{self, MLASTAttr, MLASTBlockBehaviorType, MLASTNode, Namespace, NamespaceURI};

fn load_fixture(name: &str) -> String {
    let path = format!("{}/tests/fixtures/{}.json", env!("CARGO_MANIFEST_DIR"), name);
    std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("Failed to read fixture {path}: {e}"))
}

#[test]
fn simple_document() {
    let json = load_fixture("simple");
    let doc = mlast::parse_mlast(&json).expect("Failed to parse simple.json");
    assert!(doc.is_fragment);
    assert_eq!(doc.raw, r#"<div class="foo">text</div>"#);
    assert!(!doc.node_list.is_empty());

    // First node should be a starttag (Element)
    let MLASTNode::Element(el) = &doc.node_list[0] else {
        panic!("Expected Element, got {:?}", doc.node_list[0]);
    };
    assert_eq!(el.node_name, "div");
    assert_eq!(el.namespace, NamespaceURI::XHTML);
    assert_eq!(el.line, 1);
    assert_eq!(el.col, 1);
    assert!(!el.is_ghost);
    assert!(!el.is_fragment);

    // Check attribute
    assert_eq!(el.attributes.len(), 1);
    let MLASTAttr::HTMLAttr(attr) = &el.attributes[0] else {
        panic!("Expected HTMLAttr");
    };
    assert_eq!(attr.node_name, "class");
    assert_eq!(attr.value.raw, "foo");
    assert!(!attr.is_duplicatable);

    // Child text node
    assert_eq!(el.child_nodes.len(), 1);
}

#[test]
fn empty_document() {
    let json = load_fixture("empty-document");
    let doc = mlast::parse_mlast(&json).expect("Failed to parse empty-document.json");
    assert!(doc.node_list.is_empty());
    assert!(doc.is_fragment);
}

#[test]
fn full_attributes() {
    let json = load_fixture("full-attributes");
    let doc = mlast::parse_mlast(&json).expect("Failed to parse full-attributes.json");
    let MLASTNode::Element(el) = &doc.node_list[0] else {
        panic!("Expected Element");
    };
    assert_eq!(el.node_name, "input");
    // Should have multiple attributes
    assert!(el.attributes.len() >= 3);

    // Check boolean attribute (disabled)
    let has_disabled = el.attributes.iter().any(|a| {
        if let MLASTAttr::HTMLAttr(attr) = a {
            attr.node_name == "disabled"
        } else {
            false
        }
    });
    assert!(has_disabled, "Expected 'disabled' attribute");
}

#[test]
fn nested_elements() {
    let json = load_fixture("nested");
    let doc = mlast::parse_mlast(&json).expect("Failed to parse nested.json");
    let MLASTNode::Element(el) = &doc.node_list[0] else {
        panic!("Expected Element");
    };
    assert_eq!(el.node_name, "div");
    assert_eq!(el.depth, 0);
    assert!(!el.child_nodes.is_empty());
}

#[test]
fn namespace_svg() {
    let json = load_fixture("namespace-svg");
    let doc = mlast::parse_mlast(&json).expect("Failed to parse namespace-svg.json");
    // Find the SVG element
    let svg = doc
        .node_list
        .iter()
        .find(|n| matches!(n, MLASTNode::Element(el) if el.node_name == "svg"));
    assert!(svg.is_some(), "Expected <svg> element");
}

#[test]
fn doctype() {
    let json = load_fixture("doctype");
    let doc = mlast::parse_mlast(&json).expect("Failed to parse doctype.json");
    let has_doctype = doc.node_list.iter().any(|n| matches!(n, MLASTNode::Doctype(_)));
    assert!(has_doctype, "Expected a doctype node");
}

#[test]
fn comment() {
    let json = load_fixture("comment");
    let doc = mlast::parse_mlast(&json).expect("Failed to parse comment.json");
    let has_comment = doc.node_list.iter().any(|n| matches!(n, MLASTNode::Comment(_)));
    assert!(has_comment, "Expected a comment node");
}

/// Generate a minimal MLAST JSON document with `depth` levels of nested `<div>` elements.
/// The innermost element contains a text node "leaf".
/// This produces deeply nested `childNodes` that exercise serde's recursion limit.
fn generate_deep_nested_json(depth: u32) -> String {
    use std::fmt::Write;

    let mut json = String::with_capacity(depth as usize * 512);

    // Build raw HTML: <div><div>...<div>leaf</div>...</div></div>
    let raw_html = format!(
        "{}leaf{}",
        "<div>".repeat(depth as usize),
        "</div>".repeat(depth as usize)
    );

    write!(json, r#"{{"raw":"{}","nodeList":["#, raw_html).unwrap();

    // Emit flat nodeList: starttags, then text, then endtags
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

    // Text node
    let text_offset = depth * 5;
    write!(
        json,
        r##",{{"type":"text","uuid":"txt","raw":"leaf","offset":{text_offset},"line":1,"col":{col},"nodeName":"#text","depth":{depth},"parentNodeUuid":"el-{parent}"}}"##,
        col = text_offset + 1,
        parent = depth - 1,
    )
    .unwrap();

    // Endtags (innermost first)
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

    // Now inject nested childNodes into the JSON.
    // Re-parse as serde_json::Value and rebuild the tree structure.
    let mut doc: serde_json::Value = serde_json::from_str(&json).unwrap();
    let node_list = doc["nodeList"].as_array().unwrap().clone();

    // Find starttag nodes and build childNodes tree
    // Strategy: walk depth 0..depth, each element's childNodes = [next element or text]
    let mut starttags: Vec<serde_json::Value> = node_list.iter().filter(|n| n["type"] == "starttag").cloned().collect();
    let text_node: serde_json::Value = node_list.iter().find(|n| n["type"] == "text").cloned().unwrap();

    // Build from innermost out
    let mut inner_child = text_node;
    for i in (0..starttags.len()).rev() {
        starttags[i]["childNodes"] = serde_json::json!([inner_child]);
        inner_child = starttags[i].clone();
    }

    // Replace nodeList[0] with the fully nested root
    let node_list_mut = doc["nodeList"].as_array_mut().unwrap();
    node_list_mut[0] = inner_child;

    serde_json::to_string(&doc).unwrap()
}

#[test]
fn nested_deep_exceeds_default_limit() {
    let json = generate_deep_nested_json(130);
    // parse_mlast uses from_str which has a recursion limit of 128.
    // 130-depth should fail with the default parser.
    assert!(mlast::parse_mlast(&json).is_err(), "Expected recursion limit error");
    // parse_mlast_deep bypasses the limit using disable_recursion_limit().
    let doc = mlast::parse_mlast_deep(&json).expect("Failed to parse deep JSON with deep parser");
    assert!(!doc.node_list.is_empty());
}

#[test]
fn unknown_fields_are_ignored() {
    // Add an unknown field to a valid document
    let json = r#"{
        "raw": "",
        "nodeList": [],
        "isFragment": true,
        "unknownField": "should be ignored",
        "anotherUnknownField": 42
    }"#;
    let doc = mlast::parse_mlast(json).expect("Unknown fields should be ignored");
    assert!(doc.node_list.is_empty());
}

#[test]
fn unknown_parse_error_field() {
    let json = r#"{
        "raw": "",
        "nodeList": [],
        "isFragment": true,
        "unknownParseError": "Something went wrong"
    }"#;
    let doc = mlast::parse_mlast(json).expect("Should parse with unknownParseError");
    assert_eq!(doc.unknown_parse_error.as_deref(), Some("Something went wrong"));
}

#[test]
fn block_behavior_types() {
    let types = [
        ("if", MLASTBlockBehaviorType::If),
        ("if:elseif", MLASTBlockBehaviorType::IfElseIf),
        ("if:else", MLASTBlockBehaviorType::IfElse),
        ("switch:case", MLASTBlockBehaviorType::SwitchCase),
        ("switch:default", MLASTBlockBehaviorType::SwitchDefault),
        ("each", MLASTBlockBehaviorType::Each),
        ("each:empty", MLASTBlockBehaviorType::EachEmpty),
        ("await", MLASTBlockBehaviorType::Await),
        ("await:then", MLASTBlockBehaviorType::AwaitThen),
        ("await:catch", MLASTBlockBehaviorType::AwaitCatch),
        ("end", MLASTBlockBehaviorType::End),
    ];

    for (json_type, expected) in types {
        let json = format!(r#"{{"type": "{json_type}", "expression": "test"}}"#);
        let behavior: mlast::MLASTBlockBehavior =
            serde_json::from_str(&json).unwrap_or_else(|e| panic!("Failed for type {json_type}: {e}"));
        assert_eq!(behavior.behavior_type, expected);
    }
}

#[test]
fn all_namespace_uris() {
    let cases = [
        (r#""http://www.w3.org/1999/xhtml""#, NamespaceURI::XHTML),
        (r#""http://www.w3.org/2000/svg""#, NamespaceURI::SVG),
        (r#""http://www.w3.org/1998/Math/MathML""#, NamespaceURI::MathML),
        (r#""http://www.w3.org/1999/xlink""#, NamespaceURI::XLink),
    ];
    for (json, expected) in cases {
        let ns: NamespaceURI = serde_json::from_str(json).unwrap();
        assert_eq!(ns, expected);
    }
}

#[test]
fn all_namespaces() {
    let cases = [
        (r#""html""#, Namespace::Html),
        (r#""svg""#, Namespace::Svg),
        (r#""mml""#, Namespace::Mml),
        (r#""xlink""#, Namespace::Xlink),
    ];
    for (json, expected) in cases {
        let ns: Namespace = serde_json::from_str(json).unwrap();
        assert_eq!(ns, expected);
    }
}

#[test]
fn endtag_deserialization() {
    let json = load_fixture("simple");
    let doc = mlast::parse_mlast(&json).expect("Failed to parse");
    let has_endtag = doc.node_list.iter().any(|n| matches!(n, MLASTNode::EndTag(_)));
    assert!(has_endtag, "Expected an EndTag node in simple document");
}

#[test]
fn multiple_elements() {
    let json = load_fixture("multiple-elements");
    let doc = mlast::parse_mlast(&json).expect("Failed to parse multiple-elements.json");
    let element_count = doc
        .node_list
        .iter()
        .filter(|n| matches!(n, MLASTNode::Element(_)))
        .count();
    assert!(element_count >= 3, "Expected at least 3 elements, got {element_count}");
}
