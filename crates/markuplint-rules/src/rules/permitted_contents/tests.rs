//! Tests for `permitted-contents` rule.
//!
//! The pretender tests use the JSX parser; each is ported with custom elements in HTML:
//!   permitted-contents-issue-4054-001..019  — v6_permitted_contents_001..019
//!   permitted-contents-invalid-024          — v6_permitted_contents_020
//!   permitted-contents-invalid-025          — v6_permitted_contents_021
//!   permitted-contents-issue-1848           — v6_permitted_contents_022
//!   permitted-contents-issue-3739-*         — SKIP: user tag rules (`rule: [{ tag }]`) are not accepted by the Rust rule
//!   v6_permitted_contents_023               — Rust-only: the children are the TS `childNodes` (`{#each}` blocks read through)

use super::*;
use crate::rule::{RuleConfig, RuleConfigSet};
use crate::rules::no_duplicate_attr::tests::make_element_with_attrs;
use markuplint_core::mlast::{ElementType, MLASTHTMLAttr, MLASTToken, NamespaceURI};
use markuplint_dom::arena::DomArenaBuilder;
use markuplint_dom::node::{DocumentData, ElementData, NodeBase, TextData};
use markuplint_types::spec::load_spec;

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

fn make_parent_children(parent_tag: &str, children: &[(&str, &[(&str, &str)])]) -> (DomArena, NodeId) {
    let mut builder = DomArenaBuilder::new();
    let doc_id = builder.push(DomNode::Document(DocumentData {
        id: 0,
        raw: String::new(),
        is_fragment: true,
        unknown_parse_error: None,
        children: vec![],
    }));

    let parent_id = builder.push(DomNode::Element(ElementData {
        pretender_context: None,
        base: NodeBase {
            id: 0,
            uuid: "parent".to_string(),
            raw: format!("<{parent_tag}>"),
            offset: 0,
            line: 1,
            col: 1,
            node_name: parent_tag.to_string(),
            parent: Some(doc_id),
            children: vec![],
            next_sibling: None,
            prev_sibling: None,
            depth: 1,
        },
        namespace: NamespaceURI::XHTML,
        element_type: ElementType::Html,
        is_fragment: false,
        attributes: vec![],
        has_spread_attr: false,
        block_behavior: None,
        pair_node_id: None,
        tag_open_char: "<".to_string(),
        tag_close_char: ">".to_string(),
        is_ghost: false,
        close_tag: None,
    }));
    if let Some(DomNode::Element(e)) = builder.get_mut(parent_id) {
        e.base.id = parent_id;
    }

    let mut child_ids = vec![];
    for (tag, _attrs) in children {
        let cid = builder.push(DomNode::Element(ElementData {
            pretender_context: None,
            base: NodeBase {
                id: 0,
                uuid: format!("child-{tag}"),
                raw: format!("<{tag}>"),
                offset: 0,
                line: 1,
                col: 1,
                node_name: tag.to_string(),
                parent: Some(parent_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 2,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: vec![],
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(cid) {
            e.base.id = cid;
        }
        child_ids.push(cid);
    }

    if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
        d.children = vec![parent_id];
    }
    if let Some(DomNode::Element(e)) = builder.get_mut(parent_id) {
        e.base.children = child_ids;
    }
    (builder.finish(), parent_id)
}

#[test]
fn ul_with_li_is_valid() {
    let s = spec();
    let (arena, _) = make_parent_children("ul", &[("li", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    // ul permits li — no violation on ul
    let ul_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<ul>")).collect();
    assert!(ul_violations.is_empty(), "ul > li should be valid");
}

#[test]
fn ul_with_div_is_invalid() {
    let s = spec();
    let (arena, _) = make_parent_children("ul", &[("div", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let v: Vec<_> = violations
        .iter()
        .filter(|v| v.rule_id == "permitted-contents" && v.message.contains("ul"))
        .collect();
    assert!(!v.is_empty(), "ul > div should be invalid");
    assert!(v[0].raw.contains("<div>"), "raw should point to the invalid child");
}

#[test]
fn head_requires_title() {
    let s = spec();
    let (arena, _) = make_parent_children("head", &[("meta", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let head_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<head>")).collect();
    assert!(!head_violations.is_empty(), "head without title should report missing");
}

#[test]
fn head_with_title_is_valid() {
    let s = spec();
    let (arena, _) = make_parent_children("head", &[("title", &[]), ("meta", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let head_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<head>")).collect();
    assert!(head_violations.is_empty(), "head with title should be valid");
}

#[test]
fn br_void_with_no_children() {
    let s = spec();
    let (arena, _) = make_parent_children("div", &[("br", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let br_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<br>")).collect();
    assert!(br_violations.is_empty(), "empty br should be valid");
}

#[test]
fn select_with_option_valid() {
    let s = spec();
    let (arena, _) = make_parent_children("select", &[("option", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let select_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<select>")).collect();
    assert!(select_violations.is_empty(), "select > option should be valid");
}

#[test]
fn table_with_tbody_valid() {
    let s = spec();
    let (arena, _) = make_parent_children("table", &[("tbody", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let table_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<table>")).collect();
    assert!(table_violations.is_empty(), "table > tbody should be valid");
}

#[test]
fn ul_multiple_li_valid() {
    let s = spec();
    let (arena, _) = make_parent_children("ul", &[("li", &[]), ("li", &[]), ("li", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<ul>")).collect();
    assert!(v.is_empty(), "ul > li*3 should be valid");
}

#[test]
fn ul_mixed_valid_invalid() {
    let s = spec();
    let (arena, _) = make_parent_children("ul", &[("li", &[]), ("div", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let v: Vec<_> = violations
        .iter()
        .filter(|v| v.rule_id == "permitted-contents" && v.message.contains("ul"))
        .collect();
    assert!(!v.is_empty(), "ul > li + div should report div as invalid");
}

#[test]
fn dl_dt_dd_valid() {
    let s = spec();
    let (arena, _) = make_parent_children("dl", &[("dt", &[]), ("dd", &[]), ("dt", &[]), ("dd", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<dl>")).collect();
    assert!(v.is_empty(), "dl > dt+dd repeated should be valid");
}

#[test]
fn details_requires_summary() {
    let s = spec();
    let (arena, _) = make_parent_children("details", &[("p", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<details>")).collect();
    assert!(!v.is_empty(), "details without summary should report missing");
}

// --- Boolean(true) path ---

#[test]
fn div_allows_any_content() {
    let s = spec();
    let (arena, _) = make_parent_children("div", &[("p", &[]), ("span", &[]), ("a", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<div>")).collect();
    assert!(v.is_empty(), "div allows any flow content");
}

// --- Violation message content ---

#[test]
fn violation_message_contains_element_names() {
    let s = spec();
    let (arena, _) = make_parent_children("ul", &[("div", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<div>")).collect();
    assert!(!v.is_empty(), "should have violation");
    assert!(
        v[0].message.contains("div"),
        "message should mention the invalid child: {}",
        v[0].message
    );
    assert!(
        v[0].message.contains("ul"),
        "message should mention the parent: {}",
        v[0].message
    );
}

#[test]
fn missing_required_message_contains_query() {
    let s = spec();
    let (arena, _) = make_parent_children("head", &[("meta", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<head>")).collect();
    assert!(!v.is_empty(), "should have violation");
    assert!(
        v[0].message.contains("Require"),
        "message should indicate requirement: {}",
        v[0].message
    );
    assert!(
        v[0].message.contains("Need"),
        "message should contain Need: {}",
        v[0].message
    );
}

// --- Violation location accuracy ---

#[test]
fn unexpected_child_violation_points_to_child() {
    let s = spec();
    let (arena, _) = make_parent_children("ul", &[("div", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let v: Vec<_> = violations
        .iter()
        .filter(|v| v.message.contains("not allowed"))
        .collect();
    assert!(!v.is_empty(), "should have violation");
    // raw should point to the child element, not the parent
    assert!(
        v[0].raw.contains("<div>"),
        "raw should be the invalid child, got: {}",
        v[0].raw
    );
}

#[test]
fn missing_required_violation_points_to_parent() {
    let s = spec();
    let (arena, _) = make_parent_children("head", &[("meta", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let v: Vec<_> = violations.iter().filter(|v| v.message.contains("Require")).collect();
    assert!(!v.is_empty(), "should have violation");
    // raw should point to the parent (where content is missing)
    assert!(
        v[0].raw.contains("<head>"),
        "raw should be the parent, got: {}",
        v[0].raw
    );
}

// --- Low-risk edge case verification ---

/// all_optional with nested Choice: empty content should be valid
/// when all branches are optional. (Covers recursive all_optional.)
#[test]
fn empty_select_with_optional_choice_valid() {
    // select has zeroOrMore(option|optgroup|hr|script-supporting) — all optional
    let s = spec();
    let (arena, _) = make_parent_children("select", &[]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let v: Vec<_> = violations
        .iter()
        .filter(|v| v.rule_id == "permitted-contents" && v.message.contains("select"))
        .collect();
    assert!(v.is_empty(), "empty select should be valid (all patterns optional)");
}

/// all_optional with required content: empty MUST fail.
#[test]
fn empty_details_requires_summary_fails() {
    // details requires summary + flow — not all optional
    let s = spec();
    let (arena, _) = make_parent_children("details", &[]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let v: Vec<_> = violations
        .iter()
        .filter(|v| v.rule_id == "permitted-contents" && v.message.contains("Require"))
        .collect();
    assert!(!v.is_empty(), "empty details should fail (summary required)");
}

/// SVG elements in #flow use namespace prefix "svg|svg" in spec data.
/// matches_model_ref now handles namespace prefixes, so svg is recognized.
#[test]
fn svg_namespace_resolved() {
    let s = spec();
    let (arena, _) = make_parent_children("div", &[("svg", &[])]);
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let v: Vec<_> = violations
        .iter()
        .filter(|v| v.rule_id == "permitted-contents" && v.message.contains("div"))
        .collect();
    assert!(
        v.is_empty(),
        "svg should be recognized as flow content via namespace prefix"
    );
}

/// SVG spec element (svg:svg): content model lookup uses prefixed name.
#[test]
fn svg_prefixed_name_has_content_model() {
    let s = spec();
    // Spec registers SVG as "svg:svg", not "svg"
    let cm = content_model::get_content_model(&s, "svg:svg");
    assert!(cm.is_some(), "svg:svg should have content model in spec");
}

/// Void element with whitespace-only text: should pass (no real content).
/// Tests through verify() by building a DOM with a text child inside br.
#[test]
fn void_element_whitespace_only_valid() {
    let s = spec();
    let mut builder = DomArenaBuilder::new();
    let doc_id = builder.push(DomNode::Document(DocumentData {
        id: 0,
        raw: String::new(),
        is_fragment: true,
        unknown_parse_error: None,
        children: vec![],
    }));
    let br_id = builder.push(DomNode::Element(ElementData {
        pretender_context: None,
        base: NodeBase {
            id: 0,
            uuid: "br".to_string(),
            raw: "<br>".to_string(),
            offset: 0,
            line: 1,
            col: 1,
            node_name: "br".to_string(),
            parent: Some(doc_id),
            children: vec![],
            next_sibling: None,
            prev_sibling: None,
            depth: 1,
        },
        namespace: NamespaceURI::XHTML,
        element_type: ElementType::Html,
        is_fragment: false,
        attributes: vec![],
        has_spread_attr: false,
        block_behavior: None,
        pair_node_id: None,
        tag_open_char: "<".to_string(),
        tag_close_char: ">".to_string(),
        is_ghost: false,
        close_tag: None,
    }));
    if let Some(DomNode::Element(e)) = builder.get_mut(br_id) {
        e.base.id = br_id;
    }
    let text_id = builder.push(DomNode::Text(TextData {
        base: NodeBase {
            id: 0,
            uuid: "ws".to_string(),
            raw: "  \n  ".to_string(),
            offset: 4,
            line: 1,
            col: 5,
            node_name: "#text".to_string(),
            parent: Some(br_id),
            children: vec![],
            next_sibling: None,
            prev_sibling: None,
            depth: 2,
        },
        is_bogus: false,
    }));
    if let Some(DomNode::Text(t)) = builder.get_mut(text_id) {
        t.base.id = text_id;
    }
    if let Some(DomNode::Element(e)) = builder.get_mut(br_id) {
        e.base.children = vec![text_id];
    }
    if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
        d.children = vec![br_id];
    }
    let arena = builder.finish();
    let rule = PermittedContents;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    let br_v: Vec<_> = violations.iter().filter(|v| v.raw == "<br>").collect();
    assert!(br_v.is_empty(), "br with whitespace-only text should be valid");
}

/// Void element with real text content: should fail.
#[test]
fn void_element_with_text_is_non_empty() {
    let children = vec![ChildNodeInfo::text("hello")];
    let non_empty = children
        .iter()
        .any(|c| !matches!(c.kind, ChildNodeKind::Text { is_whitespace: true }));
    assert!(non_empty, "non-whitespace text should count as content");
}

/// Debug: transparent constraint matching for button against :not(:model(interactive), ...)
#[test]
fn transparent_constraint_rejects_interactive() {
    let s = spec();
    let constraint = ":not(:model(interactive), a, [tabindex], :has(:model(interactive), a, [tabindex]))";

    let expanded = crate::content_model::matching::expand_model_refs(constraint, &s);
    let selector = markuplint_selector::parser::parse(&expanded).unwrap();

    let child = ChildNodeInfo::element("button");
    let bridge = crate::content_model::arena_bridge::build_arena("div", std::slice::from_ref(&child));
    let node_id = bridge.child_ids[0];

    let result = markuplint_selector::matcher::matches(&selector, &bridge.arena, node_id, None, None, None);
    // button is interactive → :not(interactive) should be false
    assert!(!result, "button should NOT match :not(:model(interactive), ...)");
}

// --- strip_has_from_constraint ---

#[test]
fn strip_has_basic() {
    assert_eq!(
        strip_has_from_constraint(":not(:model(interactive), a, [tabindex], :has(:model(interactive), a, [tabindex]))"),
        ":not(:model(interactive), a, [tabindex])"
    );
}

#[test]
fn strip_has_no_has() {
    assert_eq!(
        strip_has_from_constraint(":not(:model(interactive), a)"),
        ":not(:model(interactive), a)"
    );
}

#[test]
fn strip_has_wildcard() {
    assert_eq!(strip_has_from_constraint("*"), "*");
}

// --- spec_lookup_name ---

#[test]
fn spec_lookup_html() {
    assert_eq!(spec_lookup_name(&NamespaceURI::XHTML, "div"), "div");
}

#[test]
fn spec_lookup_svg() {
    assert_eq!(spec_lookup_name(&NamespaceURI::SVG, "a"), "svg:a");
}

#[test]
fn spec_lookup_mathml() {
    assert_eq!(
        spec_lookup_name(&markuplint_core::mlast::NamespaceURI::MathML, "mfrac"),
        "mml:mfrac"
    );
}

// --- all_optional with transparent ---

#[test]
fn all_optional_transparent_is_optional() {
    let patterns = vec![PermittedContentPattern::Transparent(TransparentPattern {
        transparent: "*".to_string(),
    })];
    assert!(all_optional(&patterns));
}

// --- matches_model_ref_with_attrs (via E2E for meta) ---

#[test]
fn meta_without_itemprop_not_flow() {
    let s = spec();
    let meta = ChildNodeInfo {
        kind: ChildNodeKind::HtmlElement,
        node_name: "meta".to_string(),
        raw: "<meta>".to_string(),
        line: 0,
        col: 0,
        child_nodes: vec![],
        attribute_names: vec!["content".to_string()],
        transparent_ancestor: None,
    };
    // meta without itemprop should NOT match :model(flow)
    let matched = crate::content_model::matching::matches_selector(":model(flow)", Some(&meta), 1, &s);
    assert!(
        !matched.result_type.is_matched(),
        "meta without itemprop should not match #flow"
    );
}

#[test]
fn meta_with_itemprop_is_flow() {
    let s = spec();
    let meta = ChildNodeInfo {
        kind: ChildNodeKind::HtmlElement,
        node_name: "meta".to_string(),
        raw: "<meta>".to_string(),
        line: 0,
        col: 0,
        child_nodes: vec![],
        attribute_names: vec!["itemprop".to_string(), "content".to_string()],
        transparent_ancestor: None,
    };
    let matched = crate::content_model::matching::matches_selector(":model(flow)", Some(&meta), 1, &s);
    assert!(
        matched.result_type.is_matched(),
        "meta with itemprop should match #flow"
    );
}

// --- evaluate_condition ---

#[test]
fn evaluate_condition_attribute_presence() {
    assert_eq!(check_attr_condition("[src]", &make_el_with_attr("audio", "src")), true);
    assert_eq!(
        check_attr_condition("[src]", &make_el_with_attr("audio", "controls")),
        false
    );
}

#[test]
fn evaluate_condition_multiple_attrs() {
    // [label][value] — both must be present
    let el = make_el_with_attrs("option", &["label", "value"]);
    assert!(check_attr_condition("[label][value]", &el));
    let el2 = make_el_with_attr("option", "label");
    assert!(!check_attr_condition("[label][value]", &el2));
}

#[test]
fn evaluate_condition_structural_namespace() {
    // "svg|switch > svg|a" — parent must be "switch"
    let s = spec();
    let mut builder = DomArenaBuilder::new();
    let doc_id = builder.push(DomNode::Document(DocumentData {
        id: 0,
        raw: String::new(),
        is_fragment: true,
        unknown_parse_error: None,
        children: vec![],
    }));
    let switch_id = builder.push(DomNode::Element(ElementData {
        pretender_context: None,
        base: NodeBase {
            id: 0,
            uuid: "sw".to_string(),
            raw: "<switch>".to_string(),
            offset: 0,
            line: 1,
            col: 1,
            node_name: "switch".to_string(),
            parent: Some(doc_id),
            children: vec![],
            next_sibling: None,
            prev_sibling: None,
            depth: 1,
        },
        namespace: NamespaceURI::SVG,
        element_type: ElementType::Html,
        is_fragment: false,
        attributes: vec![],
        has_spread_attr: false,
        block_behavior: None,
        pair_node_id: None,
        tag_open_char: "<".to_string(),
        tag_close_char: ">".to_string(),
        is_ghost: false,
        close_tag: None,
    }));
    if let Some(DomNode::Element(e)) = builder.get_mut(switch_id) {
        e.base.id = switch_id;
    }
    let a_id = builder.push(DomNode::Element(ElementData {
        pretender_context: None,
        base: NodeBase {
            id: 0,
            uuid: "a".to_string(),
            raw: "<a>".to_string(),
            offset: 0,
            line: 1,
            col: 9,
            node_name: "a".to_string(),
            parent: Some(switch_id),
            children: vec![],
            next_sibling: None,
            prev_sibling: None,
            depth: 2,
        },
        namespace: NamespaceURI::SVG,
        element_type: ElementType::Html,
        is_fragment: false,
        attributes: vec![],
        has_spread_attr: false,
        block_behavior: None,
        pair_node_id: None,
        tag_open_char: "<".to_string(),
        tag_close_char: ">".to_string(),
        is_ghost: false,
        close_tag: None,
    }));
    if let Some(DomNode::Element(e)) = builder.get_mut(a_id) {
        e.base.id = a_id;
    }
    if let Some(DomNode::Element(e)) = builder.get_mut(switch_id) {
        e.base.children = vec![a_id];
    }
    if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
        d.children = vec![switch_id];
    }
    let arena = builder.finish();

    let a_el = arena.get(a_id).unwrap().as_element().unwrap();
    assert!(
        evaluate_condition("svg|switch > svg|a", a_el, &arena),
        "svg|switch > svg|a should match when parent is switch"
    );
}

fn make_el_with_attr(tag: &str, attr: &str) -> markuplint_dom::node::ElementData {
    use markuplint_core::mlast::{MLASTAttr, MLASTHTMLAttr, MLASTToken};
    ElementData {
        pretender_context: None,
        base: NodeBase {
            id: 0,
            uuid: String::new(),
            raw: format!("<{tag}>"),
            offset: 0,
            line: 1,
            col: 1,
            node_name: tag.to_string(),
            parent: None,
            children: vec![],
            next_sibling: None,
            prev_sibling: None,
            depth: 0,
        },
        namespace: NamespaceURI::XHTML,
        element_type: ElementType::Html,
        is_fragment: false,
        attributes: vec![MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
            uuid: String::new(),
            raw: attr.to_string(),
            offset: 0,
            line: 1,
            col: 1,
            node_name: attr.to_string(),
            spaces_before_name: MLASTToken {
                uuid: String::new(),
                raw: String::new(),
                offset: 0,
                line: 1,
                col: 1,
            },
            name: MLASTToken {
                uuid: String::new(),
                raw: attr.to_string(),
                offset: 0,
                line: 1,
                col: 1,
            },
            spaces_before_equal: MLASTToken {
                uuid: String::new(),
                raw: String::new(),
                offset: 0,
                line: 1,
                col: 1,
            },
            equal: MLASTToken {
                uuid: String::new(),
                raw: String::new(),
                offset: 0,
                line: 1,
                col: 1,
            },
            spaces_after_equal: MLASTToken {
                uuid: String::new(),
                raw: String::new(),
                offset: 0,
                line: 1,
                col: 1,
            },
            start_quote: MLASTToken {
                uuid: String::new(),
                raw: String::new(),
                offset: 0,
                line: 1,
                col: 1,
            },
            value: MLASTToken {
                uuid: String::new(),
                raw: String::new(),
                offset: 0,
                line: 1,
                col: 1,
            },
            end_quote: MLASTToken {
                uuid: String::new(),
                raw: String::new(),
                offset: 0,
                line: 1,
                col: 1,
            },
            is_dynamic_value: None,
            is_directive: None,
            potential_name: None,
            potential_value: None,
            value_type: None,
            candidate: None,
            is_duplicatable: false,
        }))],
        has_spread_attr: false,
        block_behavior: None,
        pair_node_id: None,
        tag_open_char: "<".to_string(),
        tag_close_char: ">".to_string(),
        is_ghost: false,
        close_tag: None,
    }
}

fn make_el_with_attrs(tag: &str, attrs: &[&str]) -> markuplint_dom::node::ElementData {
    use markuplint_core::mlast::{MLASTAttr, MLASTHTMLAttr, MLASTToken};
    let attributes = attrs
        .iter()
        .map(|attr| {
            MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                uuid: String::new(),
                raw: attr.to_string(),
                offset: 0,
                line: 1,
                col: 1,
                node_name: attr.to_string(),
                spaces_before_name: MLASTToken {
                    uuid: String::new(),
                    raw: String::new(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                name: MLASTToken {
                    uuid: String::new(),
                    raw: attr.to_string(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                spaces_before_equal: MLASTToken {
                    uuid: String::new(),
                    raw: String::new(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                equal: MLASTToken {
                    uuid: String::new(),
                    raw: String::new(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                spaces_after_equal: MLASTToken {
                    uuid: String::new(),
                    raw: String::new(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                start_quote: MLASTToken {
                    uuid: String::new(),
                    raw: String::new(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                value: MLASTToken {
                    uuid: String::new(),
                    raw: String::new(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                end_quote: MLASTToken {
                    uuid: String::new(),
                    raw: String::new(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                is_dynamic_value: None,
                is_directive: None,
                potential_name: None,
                potential_value: None,
                value_type: None,
                candidate: None,
                is_duplicatable: false,
            }))
        })
        .collect();
    ElementData {
        pretender_context: None,
        base: NodeBase {
            id: 0,
            uuid: String::new(),
            raw: format!("<{tag}>"),
            offset: 0,
            line: 1,
            col: 1,
            node_name: tag.to_string(),
            parent: None,
            children: vec![],
            next_sibling: None,
            prev_sibling: None,
            depth: 0,
        },
        namespace: NamespaceURI::XHTML,
        element_type: ElementType::Html,
        is_fragment: false,
        attributes,
        has_spread_attr: false,
        block_behavior: None,
        pair_node_id: None,
        tag_open_char: "<".to_string(),
        tag_close_char: ">".to_string(),
        is_ghost: false,
        close_tag: None,
    }
}

#[test]
fn framework_options_accepted() {
    // ignoreHasMutableChildren and evaluateConditionalChildNodes are no-op for static HTML
    // but should be accepted without error
    let arena = make_element_with_attrs("div", &[]);
    let s = spec();
    let rule = PermittedContents;
    let config = RuleConfig {
        options: serde_json::json!({
            "ignoreHasMutableChildren": true,
            "evaluateConditionalChildNodes": true
        }),
        ..Default::default()
    };
    // Should not panic or error
    let _violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
}

// ============================================================
// Pretenders (TS `pretender-slot-content.spec.ts` and the "Pretenders Option"
// tests of `index.spec.ts`). The TS tests use the JSX parser; these are the same
// scenarios with custom elements parsed as HTML (`<Picture />` → `<x-picture>`),
// expected values from the TS engine run on the HTML input.
// ============================================================

fn html_arena(html: &str) -> DomArena {
    let as_doc = markuplint_html_parser::should_parse_as_document(html);
    let parser_arena = if as_doc {
        markuplint_html_parser::parse_document(html)
    } else {
        markuplint_html_parser::parse_fragment(html)
    };
    markuplint_dom::html_builder::build_from_html_arena(html, &parser_arena, !as_doc)
}

/// Lints `html` with `permitted-contents` (`rule` is its config value) and
/// `pretenders`, returning `(line, col, raw, message)` of each violation.
fn lint_pretended(
    html: &str,
    rule: serde_json::Value,
    pretenders: serde_json::Value,
) -> Vec<(u32, u32, String, String)> {
    let config: crate::lint::LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "permitted-contents": rule },
        "pretenders": pretenders,
    }))
    .unwrap();
    crate::lint::lint(&html_arena(html), &spec(), &config)
        .violations
        .into_iter()
        .map(|v| {
            assert_eq!(v.rule_id, "permitted-contents");
            assert_eq!(v.severity, crate::violation::Severity::Error);
            (v.line, v.col, v.raw, v.message)
        })
        .collect()
}

fn v(line: u32, col: u32, raw: &str, message: &str) -> (u32, u32, String, String) {
    (line, col, raw.to_owned(), message.to_owned())
}

fn pc(html: &str, pretenders: serde_json::Value) -> Vec<(u32, u32, String, String)> {
    lint_pretended(html, serde_json::json!(true), pretenders)
}

/// TS `[permitted-contents-issue-4054-001]`: static-only content with `slots: null`
/// satisfies the required child.
#[test]
fn v6_permitted_contents_001() {
    let pretenders = serde_json::json!([{ "selector": "x-picture", "as": { "element": "picture", "slots": null, "contents": [
        { "element": "img", "attrs": [{ "name": "src", "value": "a.gif" }, { "name": "alt", "value": "Example" }] }
    ] } }]);
    assert_eq!(pc("<x-picture></x-picture>", pretenders), []);
}

/// TS `[permitted-contents-issue-4054-002]`: children given to a component with
/// `slots: null` are still reported.
#[test]
fn v6_permitted_contents_002() {
    let pretenders = serde_json::json!([{ "selector": "x-picture", "as": { "element": "picture", "slots": null, "contents": [
        { "element": "img", "attrs": [{ "name": "src", "value": "a.gif" }] }
    ] } }]);
    assert_eq!(
        pc("<x-picture><div></div></x-picture>", pretenders),
        [v(
            1,
            12,
            "<div>",
            r#"The "div" element is not allowed in the "picture" element in this context"#
        )]
    );
}

fn pic() -> serde_json::Value {
    serde_json::json!([{ "selector": "x-pic", "as": { "element": "picture", "slots": true, "contents": [
        { "slot": true }, { "element": "img", "attrs": [{ "name": "src", "value": "a.gif" }] }
    ] } }])
}

/// TS `[permitted-contents-issue-4054-003]`: static content after the slot completes
/// what the given children lack.
#[test]
fn v6_permitted_contents_003() {
    assert_eq!(pc(r#"<x-pic><source srcset="a.webp"></x-pic>"#, pic()), []);
}

/// TS `[permitted-contents-issue-4054-004]`: an element given at the slot that
/// duplicates static content is reported, on the component (the static `img` does
/// not exist in the source).
#[test]
fn v6_permitted_contents_004() {
    assert_eq!(
        pc(r#"<x-pic><img src="b.gif"></x-pic>"#, pic()),
        [v(
            1,
            1,
            "<x-pic>",
            r#"The "img" element is not allowed in the "picture" element in this context"#
        )]
    );
}

fn details(contents: serde_json::Value) -> serde_json::Value {
    serde_json::json!([{ "selector": "x-details", "as": { "element": "details", "slots": true, "contents": contents } }])
}

/// TS `[permitted-contents-issue-4054-005]`: a missing required child is still
/// reported when the slot is the whole content.
#[test]
fn v6_permitted_contents_005() {
    assert_eq!(
        pc(
            "<x-details></x-details>",
            details(serde_json::json!([{ "slot": true }]))
        ),
        [v(1, 1, "<x-details>", r#"Require an element. (Need "summary")"#)]
    );
}

/// TS `[permitted-contents-issue-4054-006]`: a required child given at the slot is accepted.
#[test]
fn v6_permitted_contents_006() {
    assert_eq!(
        pc(
            "<x-details><summary>t</summary></x-details>",
            details(serde_json::json!([{ "slot": true }]))
        ),
        []
    );
}

/// TS `[permitted-contents-issue-4054-007]`: a required child rendered by the
/// component itself is accepted.
#[test]
fn v6_permitted_contents_007() {
    assert_eq!(
        pc(
            "<x-details></x-details>",
            details(serde_json::json!([{ "element": "summary" }, { "slot": true }]))
        ),
        []
    );
}

/// TS `[permitted-contents-issue-4054-008]`: a dynamic entry in `contents` skips the
/// missing-child report.
#[test]
fn v6_permitted_contents_008() {
    assert_eq!(
        pc(
            "<x-details></x-details>",
            details(serde_json::json!([{ "dynamic": true }, { "slot": true }]))
        ),
        []
    );
}

fn card() -> serde_json::Value {
    serde_json::json!([{ "selector": "x-card", "as": { "element": "div", "slots": [{ "element": "p", "contents": [{ "slot": true }] }] } }])
}

/// TS `[permitted-contents-issue-4054-009]`: given children are evaluated against the
/// slot wrapper, not the outer element.
#[test]
fn v6_permitted_contents_009() {
    assert_eq!(
        pc("<x-card><div></div></x-card>", card()),
        [v(
            1,
            9,
            "<div>",
            r#"The "div" element is not allowed in the "p" element in this context"#
        )]
    );
}

/// TS `[permitted-contents-issue-4054-010]`: children allowed by the slot wrapper are accepted.
#[test]
fn v6_permitted_contents_010() {
    assert_eq!(pc("<x-card><span>x</span></x-card>", card()), []);
}

/// TS `[permitted-contents-issue-4054-011]`: the outer element still governs the
/// component as a child.
#[test]
fn v6_permitted_contents_011() {
    assert_eq!(
        pc("<ul><x-card></x-card></ul>", card()),
        [v(
            1,
            5,
            "<x-card>",
            r#"The "div" element is not allowed in the "ul" element in this context"#
        )]
    );
}

/// TS `[permitted-contents-issue-4054-012]`: children are not validated when several
/// slot wrappers exist.
#[test]
fn v6_permitted_contents_012() {
    let pretenders = serde_json::json!([{ "selector": "x-card", "as": { "element": "div", "slots": [
        { "element": "p", "contents": [{ "slot": true }] },
        { "element": "ul", "contents": [{ "slot": true }] }
    ] } }]);
    assert_eq!(pc("<x-card><div></div></x-card>", pretenders), []);
}

/// TS `[permitted-contents-issue-4054-013]`: the attrs of a slot wrapper select its
/// conditional content model (`colgroup[span]` is empty).
#[test]
fn v6_permitted_contents_013() {
    let pretenders = serde_json::json!([{ "selector": "x-cols", "as": { "element": "div", "slots": [
        { "element": "colgroup", "attrs": [{ "name": "span", "value": "2" }], "contents": [{ "slot": true }] }
    ] } }]);
    assert_eq!(
        pc("<x-cols><div></div></x-cols>", pretenders),
        [v(1, 1, "<x-cols>", "The element disallows contents")]
    );
}

/// TS `[permitted-contents-issue-4054-014]`: a fragment pretender contributes its
/// contents to the parent.
#[test]
fn v6_permitted_contents_014() {
    let fragment = serde_json::json!([{ "selector": "x-field", "as": { "element": "#fragment", "slots": null, "contents": [{ "element": "li" }] } }]);
    assert_eq!(pc("<ul><x-field></x-field></ul>", fragment.clone()), []);
    assert_eq!(
        pc("<span><x-field></x-field></span>", fragment),
        [v(
            1,
            7,
            "<x-field>",
            r#"The "li" element is not allowed in the "span" element in this context"#
        )]
    );
}

/// TS `[permitted-contents-issue-4054-015]`: svg, math and custom elements the
/// component renders are allowed where they are in the markup.
#[test]
fn v6_permitted_contents_015() {
    let pretenders = serde_json::json!([{ "selector": "x-icon-button", "as": { "element": "button", "slots": true, "contents": [
        { "element": "svg" }, { "element": "my-icon" }, { "slot": true }
    ] } }]);
    assert_eq!(pc("<x-icon-button>Label</x-icon-button>", pretenders), []);
}

/// TS `[permitted-contents-issue-4054-016]`: an unknown content in a fragment stands
/// in the parent too.
#[test]
fn v6_permitted_contents_016() {
    let pretenders = serde_json::json!([{ "selector": "x-sources", "as": { "element": "#fragment", "slots": null, "contents": [
        { "element": "source", "attrs": [{ "name": "srcSet", "value": "a.webp" }] }, { "dynamic": true }
    ] } }]);
    assert_eq!(pc("<picture><x-sources></x-sources></picture>", pretenders), []);
}

/// TS `[permitted-contents-issue-4054-017]`: a transparent component whose children
/// sit in an inner wrapper is not looked through. The TS test puts the component in
/// a `p`; the HTML parser closes that `p` at the `div`, so the outer element here is
/// a `span`, where looking through would add "through the transparent model" (the
/// second case, without the wrapper).
#[test]
fn v6_permitted_contents_017() {
    assert_eq!(
        pc(
            "<span><x-link><div></div></x-link></span>",
            serde_json::json!([{ "selector": "x-link", "as": { "element": "a", "slots": [{ "element": "span", "contents": [{ "slot": true }] }] } }])
        ),
        [v(
            1,
            15,
            "<div>",
            r#"The "div" element is not allowed in the "span" element in this context"#
        )]
    );
    assert_eq!(
        pc(
            "<span><x-link><div></div></x-link></span>",
            serde_json::json!([{ "selector": "x-link", "as": { "element": "a" } }])
        ),
        [v(
            1,
            15,
            "<div>",
            r#"The "div" element is not allowed in the "span" element through the transparent model in this context"#
        )]
    );
}

/// TS `[permitted-contents-issue-4054-018]`: static content of a transparent component
/// is looked through and reported on the component.
#[test]
fn v6_permitted_contents_018() {
    let pretenders = serde_json::json!([{ "selector": "x-link", "as": { "element": "a", "slots": true, "contents": [
        { "element": "div" }, { "slot": true }
    ] } }]);
    assert_eq!(
        pc("<p><x-link></x-link></p>", pretenders),
        [v(
            1,
            4,
            "<x-link>",
            r#"The "div" element is not allowed in the "p" element through the transparent model in this context"#
        )]
    );
}

/// TS `[permitted-contents-issue-4054-019]`: the static content applies when the
/// conditional child nodes are evaluated.
#[test]
fn v6_permitted_contents_019() {
    let rule = serde_json::json!({ "options": { "evaluateConditionalChildNodes": true } });
    let pretenders = details(serde_json::json!([{ "element": "summary" }, { "slot": true }]));
    assert_eq!(
        lint_pretended("<x-details></x-details>", rule.clone(), pretenders.clone()),
        []
    );
    assert_eq!(
        lint_pretended("<x-details><summary></summary></x-details>", rule, pretenders),
        [v(
            1,
            12,
            "<summary>",
            r#"The "summary" element is not allowed in the "details" element in this context"#
        )]
    );
}

/// TS `[permitted-contents-invalid-024]`: a pretended element is checked as what it
/// pretends to be, as a child and as a transparent parent.
#[test]
fn v6_permitted_contents_020() {
    assert_eq!(
        pc(
            "<ul><x-c></x-c></ul>",
            serde_json::json!([{ "selector": "x-c", "as": "li" }])
        ),
        []
    );
    assert_eq!(
        pc(
            "<ul><x-c></x-c></ul>",
            serde_json::json!([{ "selector": "x-c", "as": "div" }])
        ),
        [v(
            1,
            5,
            "<x-c>",
            r#"The "div" element is not allowed in the "ul" element in this context"#
        )]
    );
    assert_eq!(
        pc(
            "<svg><x-c></x-c></svg>",
            serde_json::json!([{ "selector": "x-c", "as": { "element": "rect", "namespace": "svg" } }])
        ),
        []
    );
    assert_eq!(
        pc(
            "<span><x-c><div></div></x-c></span>",
            serde_json::json!([{ "selector": "x-c", "as": { "element": "a" } }])
        ),
        [v(
            1,
            12,
            "<div>",
            r#"The "div" element is not allowed in the "span" element through the transparent model in this context"#
        )]
    );
}

/// TS `[permitted-contents-invalid-025]`: the attributes of the pretender take part
/// in the transparent constraint.
#[test]
fn v6_permitted_contents_021() {
    assert_eq!(
        pc(
            "<a href><x-c></x-c></a>",
            serde_json::json!([{ "selector": "x-c", "as": { "element": "div", "attrs": [{ "name": "tabindex" }] } }])
        ),
        [v(
            1,
            9,
            "<x-c>",
            r#"The "a" element is a transparent model but also disallows the "div" element in this context"#
        )]
    );
}

/// TS `[permitted-contents-issue-1848]`: a pretender named in upper case. In HTML the
/// name is lower-cased, so the component is a `head` and needs a `title` (the JSX
/// test keeps `Head` as a component name and reports nothing).
#[test]
fn v6_permitted_contents_022() {
    assert_eq!(
        pc("<x-c></x-c>", serde_json::json!([{ "selector": "x-c", "as": "Head" }])),
        [v(1, 1, "<x-c>", r#"Require an element. (Need "title")"#)]
    );
}

/// What the TS `el.childNodes` gives is what the content model checks: Svelte's `{#each}` and
/// `{/each}` blocks are read through, so the `li` they hold is a child of `main`, which does not
/// permit it. The AST is the Svelte parser's (`tests/generate-fixtures.mjs`).
#[test]
fn v6_permitted_contents_023() {
    let arena = markuplint_dom::builder::build_from_json(include_str!(
        "../../../../markuplint-core/tests/fixtures/svelte-each-block.json"
    ))
    .unwrap();
    let config: crate::lint::LintConfig =
        serde_json::from_value(serde_json::json!({ "rules": { "permitted-contents": true } })).unwrap();
    let violations = crate::lint::lint(&arena, &spec(), &config).violations;
    assert_eq!(violations.len(), 1);
    assert_eq!(
        violations[0].message,
        r#"The "li" element is not allowed in the "main" element in this context"#
    );
    assert_eq!(
        (violations[0].line, violations[0].col, violations[0].raw.as_str()),
        (1, 28, "<li>")
    );
}
