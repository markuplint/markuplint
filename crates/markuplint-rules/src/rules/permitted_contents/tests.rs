//! Tests for `permitted-contents` rule.
//!
//! The pretender tests use the JSX parser; each is ported with custom elements in HTML:
//!   permitted-contents-issue-4054-001..019  — v6_permitted_contents_001..019
//!   permitted-contents-invalid-024          — v6_permitted_contents_020
//!   permitted-contents-invalid-025          — v6_permitted_contents_021
//!   permitted-contents-issue-1848           — v6_permitted_contents_022
//!   v6_permitted_contents_023               — Rust-only: the children are the TS `childNodes` (`{#each}` blocks read through)
//!   permitted-contents-issue-3635-003/002/006 — v6_permitted_contents_024..026 (`#nonEmptyText`)
//!   permitted-contents-issue-3635-001/004/005 — v6_permitted_contents_027..029
//!   v6_permitted_contents_030               — Rust-only: U+3000 is text for `#nonEmptyText`
//!   permitted-contents-valid-001            — permitted_contents_valid_001 (the DOM keeps `<image>` as written)
//!   permitted-contents-issue-4475-019       — permitted_contents_issue_4475_019

use super::*;
use crate::rule::{RuleConfig, RuleConfigSet};
use crate::rules::no_duplicate_attr::tests::make_element_with_attrs;
use markuplint_core::mlast::{ElementType, NamespaceURI};
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

/// The `svg` element is flow content by the entry `svg|svg` of the spec, which names it with its
/// namespace.
#[test]
fn svg_namespace_resolved() {
    assert_eq!(
        lint_pretended("<div><svg></svg></div>", serde_json::json!(true), serde_json::json!([])),
        []
    );
}

/// SVG spec element (svg:svg): content model lookup uses prefixed name.
#[test]
fn svg_prefixed_name_has_content_model() {
    let s = spec();
    // Spec registers SVG as "svg:svg", not "svg"
    let cm = markuplint_types::spec::content_model::get_content_model(&s, "svg:svg");
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

/// TS `[permitted-contents-issue-3635-003]`: a `title` with text satisfies `#nonEmptyText`.
#[test]
fn v6_permitted_contents_024() {
    assert_eq!(
        lint_pretended(
            "<html><head><title>Page Title</title></head><body></body></html>",
            serde_json::json!(true),
            serde_json::json!([])
        ),
        []
    );
}

/// TS `[permitted-contents-issue-3635-002]`: a whitespace-only `title` is rejected.
#[test]
fn v6_permitted_contents_025() {
    assert_eq!(
        lint_pretended(
            "<html><head><title>  </title></head><body></body></html>",
            serde_json::json!(true),
            serde_json::json!([])
        ),
        [v(1, 13, "<title>", r##"Require an element. (Need "#nonEmptyText")"##)]
    );
}

/// TS `[permitted-contents-issue-3635-001]`: an empty `title` is rejected.
#[test]
fn v6_permitted_contents_027() {
    assert_eq!(
        lint_pretended(
            "<html><head><title></title></head><body></body></html>",
            serde_json::json!(true),
            serde_json::json!([])
        ),
        [v(1, 13, "<title>", r##"Require an element. (Need "#nonEmptyText")"##)]
    );
}

/// TS `[permitted-contents-issue-3635-004]`: an empty `option` without `label` is rejected.
#[test]
fn v6_permitted_contents_028() {
    assert_eq!(
        lint_pretended(
            "<select><option></option></select>",
            serde_json::json!(true),
            serde_json::json!([])
        ),
        [v(1, 9, "<option>", r##"Require an element. (Need "#nonEmptyText")"##)]
    );
}

/// TS `[permitted-contents-issue-3635-005]`: an empty `option` with `label` is valid.
#[test]
fn v6_permitted_contents_029() {
    assert_eq!(
        lint_pretended(
            r#"<select><option label="x" value="v"></option></select>"#,
            serde_json::json!(true),
            serde_json::json!([])
        ),
        []
    );
}

/// A `title` whose only text is U+3000 has text for `#nonEmptyText`: inter-element whitespace is
/// ASCII whitespace only.
#[test]
fn v6_permitted_contents_030() {
    assert_eq!(
        lint_pretended(
            "<html><head><title>\u{3000}</title></head><body></body></html>",
            serde_json::json!(true),
            serde_json::json!([])
        ),
        []
    );
}

/// TS `[permitted-contents-issue-3635-006]`: an `option` with text is valid.
#[test]
fn v6_permitted_contents_026() {
    assert_eq!(
        lint_pretended(
            "<select><option>Text</option></select>",
            serde_json::json!(true),
            serde_json::json!([])
        ),
        []
    );
}

// ============================================================
// The steps of the evaluation, as the TS unit specs of `recursive-branch.ts`, `count-pattern.ts`,
// `choice.ts` and `order.ts` run them: on the children of a `<div>` written as the tags given.
// ============================================================
mod engine_steps {
    use super::super::context::{Caches, Ctx, MatchResult, Mode, Options, ResultType};
    use super::super::engine;
    use super::{html_arena, spec};
    use markuplint_dom::arena::NodeId;
    use markuplint_types::spec::content_model::{ChoicePattern, ModelOrPatterns, PermittedContentPattern};

    /// Runs `f` on the children of a `<div>` holding `tags`: `#text` is text, any other an element.
    fn with_children(tags: &[&str], f: impl FnOnce(&Ctx<'_>, &[NodeId]) -> MatchResult) -> MatchResult {
        let inner: String = tags
            .iter()
            .map(|&tag| {
                if tag == "#text" {
                    "text".to_string()
                } else {
                    format!("<{tag}></{tag}>")
                }
            })
            .collect();
        let arena = html_arena(&format!("<div>{inner}</div>"));
        let spec = spec();
        let caches = Caches::default();
        let ctx = Ctx {
            arena: &arena,
            spec: &spec,
            rules: &[],
            options: Options {
                ignore_has_mutable_children: true,
                evaluate_conditional_child_nodes: false,
            },
            mode: Mode::Pretended,
            caches: &caches,
            transparent_mode: std::cell::RefCell::default(),
        };
        let div = arena
            .elements()
            .find(|(_, el)| el.base.node_name == "div")
            .map(|(id, _)| id)
            .unwrap();
        f(&ctx, &arena.child_nodes(div))
    }

    // recursive-branch.spec.ts
    // ================================================================
    mod recursive_branch {
        use super::*;

        fn run(model_json: &str, tags: &[&str]) -> MatchResult {
            let model: ModelOrPatterns = serde_json::from_str(model_json).unwrap();
            with_children(tags, |ctx, children| engine::recursive_branch(ctx, &model, children))
        }

        #[test]
        fn single_tag_a() {
            assert_eq!(run(r##""a""##, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(r##""a""##, &["b"]).ty, ResultType::UnmatchedSelectors);
            assert_eq!(run(r##""a""##, &["c"]).ty, ResultType::UnmatchedSelectors);
            assert_eq!(run(r##""a""##, &["#text"]).ty, ResultType::UnexpectedExtraNode);
            assert_eq!(run(r##""a""##, &[]).ty, ResultType::MissingNode);
        }

        #[test]
        fn flow_category() {
            assert_eq!(run(r##""#flow""##, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(r##""#flow""##, &["b"]).ty, ResultType::Matched);
            assert_eq!(run(r##""#flow""##, &["c"]).ty, ResultType::UnmatchedSelectorButMayEmpty);
            assert_eq!(run(r##""#flow""##, &["#text"]).ty, ResultType::Matched);
            assert_eq!(run(r##""#flow""##, &[]).ty, ResultType::MatchedZero);
        }

        #[test]
        fn array_a_flow() {
            assert_eq!(run(r##"["a", "#flow"]"##, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(r##"["a", "#flow"]"##, &["b"]).ty, ResultType::Matched);
            assert_eq!(
                run(r##"["a", "#flow"]"##, &["c"]).ty,
                ResultType::UnmatchedSelectorButMayEmpty
            );
            assert_eq!(run(r##"["a", "#flow"]"##, &["#text"]).ty, ResultType::Matched);
            assert_eq!(run(r##"["a", "#flow"]"##, &[]).ty, ResultType::MatchedZero);
        }

        #[test]
        fn array_c_flow() {
            assert_eq!(run(r##"["c", "#flow"]"##, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(r##"["c", "#flow"]"##, &["b"]).ty, ResultType::Matched);
            assert_eq!(run(r##"["c", "#flow"]"##, &["c"]).ty, ResultType::Matched);
            assert_eq!(run(r##"["c", "#flow"]"##, &["#text"]).ty, ResultType::Matched);
            assert_eq!(run(r##"["c", "#flow"]"##, &[]).ty, ResultType::MatchedZero);
        }
    }

    // ================================================================
    // count-pattern.spec.ts — all 166 TS assertions ported 1:1
    // ================================================================
    mod count_pattern {
        use super::*;

        fn run(pattern_json: &str, tags: &[&str]) -> MatchResult {
            let pattern: PermittedContentPattern = serde_json::from_str(pattern_json).unwrap();
            with_children(tags, |ctx, children| engine::count_pattern(ctx, &pattern, children))
        }

        #[test]
        fn require_a() {
            let p = r##"{"require": "a"}"##;
            assert_eq!(run(p, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["c"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["#text"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &[]).ty, ResultType::MissingNodeRequired);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 0);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 0);
            assert_eq!(run(p, &[]).matched.len(), 0);
        }

        #[test]
        fn optional_a() {
            let p = r##"{"optional": "a"}"##;
            assert_eq!(run(p, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["a", "a"]).ty, ResultType::UnexpectedExtraNode);
            assert_eq!(run(p, &["b"]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &["c"]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &["#text"]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &[]).ty, ResultType::MatchedZero);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["a", "a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 0);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 0);
            assert_eq!(run(p, &[]).matched.len(), 0);
        }

        #[test]
        fn one_or_more_a() {
            let p = r##"{"oneOrMore": "a"}"##;
            assert_eq!(run(p, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["c"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["#text"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &[]).ty, ResultType::MissingNodeOneOrMore);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 0);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 0);
            assert_eq!(run(p, &[]).matched.len(), 0);

            assert_eq!(run(p, &["a", "a", "a"]).matched.len(), 3);
            assert_eq!(run(p, &["a", "a", "b"]).matched.len(), 2);
            assert_eq!(run(p, &["a", "c", "c"]).matched.len(), 1);
        }

        #[test]
        fn zero_or_more_a() {
            let p = r##"{"zeroOrMore": "a"}"##;
            assert_eq!(run(p, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b"]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &["c"]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &["#text"]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &[]).ty, ResultType::MatchedZero);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 0);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 0);
            assert_eq!(run(p, &[]).matched.len(), 0);

            assert_eq!(run(p, &["a", "a", "a"]).matched.len(), 3);
            assert_eq!(run(p, &["a", "a", "b"]).matched.len(), 2);
            assert_eq!(run(p, &["a", "c", "c"]).matched.len(), 1);
        }

        #[test]
        fn require_flow() {
            let p = r##"{"require": "#flow"}"##;
            assert_eq!(run(p, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["c"]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &["#text"]).ty, ResultType::Matched);
            assert_eq!(run(p, &[]).ty, ResultType::MatchedZero);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 1);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 1);
            assert_eq!(run(p, &[]).matched.len(), 0);

            assert_eq!(run(p, &["a", "a", "a"]).matched.len(), 1);
            assert_eq!(run(p, &["b", "a"]).matched.len(), 1);
            assert_eq!(run(p, &["c", "a"]).matched.len(), 0);
            assert_eq!(run(p, &["#text", "a"]).matched.len(), 1);
            assert_eq!(run(p, &["a"]).matched.len(), 1);
        }

        #[test]
        fn optional_flow() {
            let p = r##"{"optional": "#flow"}"##;
            assert_eq!(run(p, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["c"]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &["#text"]).ty, ResultType::Matched);
            assert_eq!(run(p, &[]).ty, ResultType::MatchedZero);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 1);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 1);
            assert_eq!(run(p, &[]).matched.len(), 0);
        }

        #[test]
        fn one_or_more_flow() {
            let p = r##"{"oneOrMore": "#flow"}"##;
            assert_eq!(run(p, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["c"]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &["#text"]).ty, ResultType::Matched);
            assert_eq!(run(p, &[]).ty, ResultType::MatchedZero);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 1);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 1);
            assert_eq!(run(p, &[]).matched.len(), 0);

            assert_eq!(run(p, &["a", "a", "a"]).matched.len(), 3);
            assert_eq!(run(p, &["a", "a", "b"]).matched.len(), 3);
            assert_eq!(run(p, &["a", "c", "c"]).matched.len(), 1);
        }

        #[test]
        fn zero_or_more_flow() {
            let p = r##"{"zeroOrMore": "#flow"}"##;
            assert_eq!(run(p, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["c"]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &["#text"]).ty, ResultType::Matched);
            assert_eq!(run(p, &[]).ty, ResultType::MatchedZero);

            assert_eq!(run(p, &["a"]).matched.len(), 1);
            assert_eq!(run(p, &["b"]).matched.len(), 1);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 1);
            assert_eq!(run(p, &[]).matched.len(), 0);

            assert_eq!(run(p, &["a", "a", "a"]).matched.len(), 3);
            assert_eq!(run(p, &["a", "a", "b"]).matched.len(), 3);
            assert_eq!(run(p, &["a", "c", "c"]).matched.len(), 1);
        }

        #[test]
        fn zero_or_more_script_supporting() {
            let p = r##"{"zeroOrMore": ":model(script-supporting)"}"##;
            assert_eq!(run(p, &["a"]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &["b"]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &["c"]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &["#text"]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &[]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &["script"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["template"]).ty, ResultType::Matched);

            assert_eq!(run(p, &["a"]).matched.len(), 0);
            assert_eq!(run(p, &["b"]).matched.len(), 0);
            assert_eq!(run(p, &["c"]).matched.len(), 0);
            assert_eq!(run(p, &["#text"]).matched.len(), 0);
            assert_eq!(run(p, &[]).matched.len(), 0);
            assert_eq!(run(p, &["script"]).matched.len(), 1);
            assert_eq!(run(p, &["template"]).matched.len(), 1);
        }

        #[test]
        fn min_max() {
            assert_eq!(
                run(r##"{"require": "c", "min": 2}"##, &[]).ty,
                ResultType::MissingNodeRequired
            );
            assert_eq!(
                run(r##"{"require": "c", "min": 2}"##, &["c"]).ty,
                ResultType::MissingNodeRequired
            );
            assert_eq!(
                run(r##"{"require": "c", "min": 2}"##, &["c", "c"]).ty,
                ResultType::Matched
            );
            assert_eq!(
                run(r##"{"require": "c", "max": 1}"##, &["c", "c"]).ty,
                ResultType::UnexpectedExtraNode
            );
            assert_eq!(run(r##"{"require": "c", "max": 1}"##, &["c", "c"]).hint.max, Some(1));
        }

        #[test]
        fn dl_element_one_or_more_pattern() {
            let p = r##"{"oneOrMore": [
                {"zeroOrMore": ":model(script-supporting)"},
                {"oneOrMore": "dt"},
                {"zeroOrMore": ":model(script-supporting)"},
                {"oneOrMore": "dd"},
                {"zeroOrMore": ":model(script-supporting)"}
            ]}"##;
            assert_eq!(run(p, &["dt"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dd"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dd"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dt", "dd"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dd"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dd", "dt"]).ty, ResultType::MissingNodeOneOrMore);
        }

        // --- ruby element part #1 (TS: oneOrMore with model array selectors) ---
        #[test]
        fn ruby_part1_phrasing_model_array() {
            let p = r##"{"oneOrMore": [
                ":model(phrasing):not(ruby, :has(ruby))",
                "ruby:not(:has(ruby))"
            ]}"##;
            assert_eq!(run(p, &["span"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["#text"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["#text", "span"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["ruby"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["ruby", "span"]).ty, ResultType::Matched);
        }

        // --- ruby element part #2 (TS: complex nested with choice) ---
        #[test]
        fn ruby_part2_complex_nested() {
            let p = r##"{"oneOrMore": [
                {"oneOrMore": [
                    ":model(phrasing):not(ruby, :has(ruby))",
                    "ruby:not(:has(rt, rp))"
                ]},
                {"choice": [
                    [{"oneOrMore": "rt"}],
                    [{"require": "rp"}, {"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}]
                ]}
            ]}"##;
            assert_eq!(run(p, &["span"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["span"]).query, "rt");
            assert_eq!(run(p, &["span", "rp", "rt", "rp"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["span", "rp", "rt"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["span", "rp", "rt"]).query, "rp");
            assert_eq!(run(p, &["span", "rp", "rt", "rp"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["span", "rt"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["span", "rt", "span", "rt"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["#text", "rt", "#text", "rt"]).ty, ResultType::Matched);
            assert_eq!(
                run(p, &["#text", "rt", "rt", "#text", "rt", "rt"]).ty,
                ResultType::Matched
            );
            assert_eq!(
                run(p, &["#text", "rp", "rt", "rp", "#text", "rt"]).ty,
                ResultType::Matched
            );
        }

        // --- ruby element part #3 (TS: oneOrMore rt/rp) ---
        #[test]
        fn ruby_part3_one_or_more_rt_rp() {
            let p = r##"{"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}"##;
            assert_eq!(run(p, &["rt"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rt"]).query, "rp");
            assert_eq!(run(p, &["rt", "rp"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["rt", "rp", "rt"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rt", "rp", "rt"]).query, "rp");
            assert_eq!(run(p, &["rt", "rp", "rt", "rp"]).ty, ResultType::Matched);
        }

        // --- Issue #1146 1/2 (TS: oneOrMore with single-branch choice) ---
        #[test]
        fn issue_1146_one_or_more_choice() {
            let p = r##"{"oneOrMore": [{"choice": [[{"require": "b"}]]}]}"##;
            assert_eq!(run(p, &["b"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b", "b"]).ty, ResultType::Matched);
        }

        // --- Issue #1146 2/2 (TS: oneOrMore with optional + choice) ---
        #[test]
        fn issue_1146_one_or_more_optional_choice() {
            let p = r##"{"oneOrMore": [
                {"optional": "a"},
                {"choice": [
                    [{"optional": "b"}],
                    [{"require": "c"}]
                ]}
            ]}"##;
            assert_eq!(run(p, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["a", "a", "a"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["a", "b"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["a", "c"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b", "b"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b", "c"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["c", "c"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["a", "b", "c"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["a", "c", "c"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["c", "b", "a"]).ty, ResultType::Matched);
        }
    }

    // ================================================================
    // choice.spec.ts
    // ================================================================
    mod choice {
        use super::*;

        fn run(pattern_json: &str, tags: &[&str]) -> MatchResult {
            let pattern: ChoicePattern = serde_json::from_str(pattern_json).unwrap();
            with_children(tags, |ctx, children| engine::choice(ctx, &pattern, children))
        }

        #[test]
        fn ordered_requires() {
            let p = r##"{"choice": [[{"require": "a"}], [{"require": "b"}], [{"require": "c"}]]}"##;
            assert_eq!(run(p, &[]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["a", "a"]).ty, ResultType::UnexpectedExtraNode);
            assert_eq!(run(p, &["b"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b", "c"]).ty, ResultType::UnexpectedExtraNode);
            assert_eq!(run(p, &["c"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["d"]).ty, ResultType::MissingNodeRequired);
        }

        #[test]
        fn optional() {
            let p = r##"{"choice": [[{"require": "a"}], [{"require": "b"}], [{"optional": "c"}]]}"##;
            assert_eq!(run(p, &[]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["c"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["d"]).ty, ResultType::UnexpectedExtraNode);
        }

        #[test]
        fn interleave() {
            let p = r##"{"choice": [[{"require": "a"}, {"require": "b"}], [{"require": "b"}, {"require": "a"}]]}"##;
            assert_eq!(run(p, &["a"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["b"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a", "b"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b", "a"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b", "a", "c"]).ty, ResultType::UnexpectedExtraNode);
            assert_eq!(run(p, &["b", "a", "a"]).ty, ResultType::UnexpectedExtraNode);
        }

        #[test]
        fn dl_element() {
            let p = r##"{"choice": [
                [{"oneOrMore": [
                    {"zeroOrMore": ":model(script-supporting)"},
                    {"oneOrMore": "dt"},
                    {"zeroOrMore": ":model(script-supporting)"},
                    {"oneOrMore": "dd"},
                    {"zeroOrMore": ":model(script-supporting)"}
                ]}],
                [
                    {"zeroOrMore": ":model(script-supporting)"},
                    {"oneOrMore": "div"},
                    {"zeroOrMore": ":model(script-supporting)"}
                ]
            ]}"##;
            assert_eq!(run(p, &["dt", "dd"]).ty, ResultType::Matched);
            assert_eq!(run(p, &[]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &[]).query, "dt");
            assert_eq!(run(p, &["dt"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["div"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["div", "div"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dt"]).ty, ResultType::MissingNodeOneOrMore);
        }

        #[test]
        fn ruby_part() {
            let p = r##"{"choice": [
                [{"oneOrMore": "rt"}],
                [{"require": "rp"}, {"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}]
            ]}"##;
            assert_eq!(run(p, &["rt"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["rp"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rp"]).query, "rt");
            assert_eq!(run(p, &["rt", "rt"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["rp", "rt", "rp"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["rp", "rt"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rp", "rt"]).query, "rp");
            assert_eq!(run(p, &["rt", "rp"]).ty, ResultType::UnexpectedExtraNode);
            assert_eq!(run(p, &["rt", "rp"]).query, "rt");
        }

        #[test]
        fn issue_1146() {
            let p = r##"{"choice": [[{"optional": "b"}], [{"require": "c"}]]}"##;
            assert_eq!(run(p, &["b"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b", "b"]).ty, ResultType::UnexpectedExtraNode);
            assert_eq!(run(p, &["c"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["c", "c"]).ty, ResultType::UnexpectedExtraNode);
        }
    }

    // ================================================================
    // order.spec.ts
    // ================================================================
    mod order {
        use super::*;

        fn run(patterns_json: &str, tags: &[&str]) -> MatchResult {
            let patterns: Vec<PermittedContentPattern> = serde_json::from_str(patterns_json).unwrap();
            with_children(tags, |ctx, children| engine::order(ctx, &patterns, children))
        }

        #[test]
        fn ordered_requires() {
            let p = r##"[{"require": "a"}, {"require": "b"}, {"require": "c"}]"##;
            assert_eq!(run(p, &["a"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a", "b"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a", "b", "c"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["a", "b", "c", "d"]).ty, ResultType::UnexpectedExtraNode);
        }

        #[test]
        fn ordered_requires_with_flow() {
            let p = r##"[{"require": "#flow"}, {"require": "a"}, {"require": "#flow"}, {"require": "b"}]"##;
            assert_eq!(run(p, &[]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a", "b"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["a", "b", "c"]).ty, ResultType::UnexpectedExtraNode);
        }

        #[test]
        fn ordered_requires_and_optionals() {
            let p = r##"[{"require": "a"}, {"optional": "b"}, {"require": "c"}]"##;
            assert_eq!(run(p, &["a", "b", "c"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["a", "b", "b", "c"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["b", "a"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a", "c"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["a", "c", "b"]).ty, ResultType::UnexpectedExtraNode);
        }

        #[test]
        fn ordered_requires_and_optionals_with_flow() {
            let p = r##"[{"require": "a"}, {"optional": "b"}, {"optional": "c"}, {"require": "#flow"}]"##;
            assert_eq!(run(p, &["a", "b", "c"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["a", "b", "b", "c"]).ty, ResultType::UnexpectedExtraNode);
            assert_eq!(run(p, &["a"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["b", "a"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["a", "c"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["a", "c", "b"]).ty, ResultType::Matched);
        }

        #[test]
        fn ordered_zero_or_more_combination() {
            let p = r##"[{"zeroOrMore": "a"}, {"zeroOrMore": "b"}, {"zeroOrMore": "c"}]"##;
            assert_eq!(run(p, &["b"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["c"]).ty, ResultType::Matched);
            assert_eq!(run(p, &[]).ty, ResultType::MatchedZero);
            assert_eq!(run(p, &["b", "c"]).ty, ResultType::Matched);
        }

        #[test]
        fn dl_element_flat() {
            let p = r##"[
                {"zeroOrMore": ":model(script-supporting)"},
                {"oneOrMore": "dt"},
                {"zeroOrMore": ":model(script-supporting)"},
                {"oneOrMore": "dd"},
                {"zeroOrMore": ":model(script-supporting)"}
            ]"##;
            assert_eq!(run(p, &["dt"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dt"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dd"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dd"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dt"]).ty, ResultType::UnexpectedExtraNode);
        }

        #[test]
        fn dl_element_nested() {
            let p = r##"[{"oneOrMore": [
                {"zeroOrMore": ":model(script-supporting)"},
                {"oneOrMore": "dt"},
                {"zeroOrMore": ":model(script-supporting)"},
                {"oneOrMore": "dd"},
                {"zeroOrMore": ":model(script-supporting)"}
            ]}]"##;
            assert_eq!(run(p, &["dt"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dt"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dd"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dd"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dt"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dd", "dt", "dd"]).ty, ResultType::Matched);
            assert_eq!(
                run(p, &["dt", "dd", "dt", "dd", "dd", "dt"]).ty,
                ResultType::MissingNodeOneOrMore
            );
        }

        #[test]
        fn dl_element_full_choice() {
            let p = r##"[{"choice": [
                [{"oneOrMore": [
                    {"zeroOrMore": ":model(script-supporting)"},
                    {"oneOrMore": "dt"},
                    {"zeroOrMore": ":model(script-supporting)"},
                    {"oneOrMore": "dd"},
                    {"zeroOrMore": ":model(script-supporting)"}
                ]}],
                [
                    {"zeroOrMore": ":model(script-supporting)"},
                    {"oneOrMore": "div"},
                    {"zeroOrMore": ":model(script-supporting)"}
                ]
            ]}]"##;
            assert_eq!(run(p, &["dt"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt"]).query, "dd");
            assert_eq!(run(p, &["dt", "dt"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dd"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dd"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["dt", "dd", "dt"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["dt", "dd", "dt", "dd"]).ty, ResultType::Matched);
            assert_eq!(
                run(p, &["dt", "dd", "dt", "dd", "dd", "dt"]).ty,
                ResultType::MissingNodeOneOrMore
            );
            assert_eq!(run(p, &["div"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["div", "div"]).ty, ResultType::Matched);
        }

        #[test]
        fn ruby_element() {
            let p = r##"[{"oneOrMore": [
                {"require": ":model(phrasing):not(ruby, :has(ruby))"},
                {"choice": [
                    [{"oneOrMore": "rt"}],
                    [{"oneOrMore": [
                        {"require": "rp"},
                        {"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}
                    ]}]
                ]}
            ]}]"##;
            assert_eq!(run(p, &["span"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["span"]).query, "rt");
            assert_eq!(run(p, &["span", "rt"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["span", "rp", "rt"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["span", "rp", "rt"]).query, "rp");
        }

        #[test]
        fn ruby_part_order() {
            let p = r##"[
                {"require": ":model(phrasing):not(ruby, :has(ruby))"},
                {"choice": [
                    [{"oneOrMore": "rt"}],
                    [{"oneOrMore": [{"require": "rp"}, {"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}]}]
                ]}
            ]"##;
            assert_eq!(run(p, &["span"]).ty, ResultType::MissingNodeOneOrMore);
            assert_eq!(run(p, &["span"]).query, "rt");
            assert_eq!(run(p, &["span", "rt"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["span", "rp", "rt"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["span", "rp", "rt"]).query, "rp");
        }

        #[test]
        fn ruby_rp_rt_rp_nested() {
            let p = r##"[{"oneOrMore": [
                {"require": "rp"},
                {"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}
            ]}]"##;
            assert_eq!(run(p, &["span"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["span"]).query, "rp");
            assert_eq!(run(p, &["rp"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rp"]).query, "rt");
            assert_eq!(run(p, &["rp", "rt", "rp"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["rp", "rt", "rp", "rt"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rp", "rt", "rp", "rt"]).query, "rp");
            assert_eq!(run(p, &["rp", "rt", "rp", "rt", "rp"]).ty, ResultType::Matched);
        }

        #[test]
        fn ruby_rt_rp_pattern() {
            let p = r##"[{"oneOrMore": [{"require": "rt"}, {"require": "rp"}]}]"##;
            assert_eq!(run(p, &["rt"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rt"]).query, "rp");
            assert_eq!(run(p, &["rt", "rp"]).ty, ResultType::Matched);
            assert_eq!(run(p, &["rt", "rp", "rt"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rt", "rp", "rt"]).query, "rp");
            assert_eq!(run(p, &["rt", "rp", "rt", "rp"]).ty, ResultType::Matched);
        }

        #[test]
        fn simple_rt_rp() {
            let p = r##"[{"require": "rt"}, {"require": "rp"}]"##;
            assert_eq!(run(p, &["rt"]).ty, ResultType::MissingNodeRequired);
            assert_eq!(run(p, &["rt"]).query, "rp");
            assert_eq!(run(p, &["rt", "rp"]).ty, ResultType::Matched);
        }

        #[test]
        fn issue_1146() {
            let p = r##"[{"choice": [[{"require": "b"}]]}]"##;
            let r = run(p, &["b", "b"]);
            assert_eq!(r.ty, ResultType::UnexpectedExtraNode);
            assert_eq!(r.query, "b");
            assert_eq!(r.hint.max, Some(1));
            assert_eq!(r.matched.len(), 1);
            assert_eq!(r.unmatched.len(), 1);
        }
    }
}

fn permitted_contents_brief(html: &str) -> Vec<crate::test_util::Brief> {
    crate::test_util::lint_brief(
        "permitted-contents",
        html,
        serde_json::json!({ "rules": { "permitted-contents": true } }),
    )
}

/// TS: `[permitted-contents-valid-001]` The SVG <image> element and the HTML obsolete <image> element
#[test]
fn permitted_contents_valid_001() {
    const _ID: &str = "permitted-contents-valid-001";
    assert_eq!(
        permitted_contents_brief(r#"<svg><g><image width="100" height="100" xlink:href="path/to"/></g></svg>"#),
        []
    );
    assert_eq!(
        permitted_contents_brief(r#"<div><span><image width="100" height="100" xlink:href="path/to"/></span></div>"#),
        [crate::test_util::brief(
            crate::violation::Severity::Error,
            1,
            12,
            "The \"image\" element is not allowed in the \"span\" element in this context",
            r#"<image width="100" height="100" xlink:href="path/to"/>"#
        )]
    );
}

/// TS: `[permitted-contents-issue-4475-019]` a decimal character reference to a line feed without a
/// semicolon before a style element is inter-element whitespace
#[test]
fn permitted_contents_issue_4475_019() {
    const _ID: &str = "permitted-contents-issue-4475-019";
    assert_eq!(permitted_contents_brief("<div>&#10<style></style></div>"), []);
}
