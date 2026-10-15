//! Tests for `no-restricted-element` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-restricted-element-invalid-001  → no_restricted_element_invalid_001
//!   no-restricted-element-invalid-002  → no_restricted_element_invalid_002
//!   no-restricted-element-invalid-003  → no_restricted_element_invalid_003
//!   v6_no_restricted_element_001       — Rust-only: `:model(palpable)` evaluates conditional entries
//!   v6_no_restricted_element_002       — Rust-only: the same entries without their condition
//!   v6_no_restricted_element_003       — Rust-only: `#custom` covers a custom element
//!   v6_no_restricted_element_004       — Rust-only: `:model(custom)` selects nothing
//!   v6_no_restricted_element_005       — Rust-only: a category is found case-insensitively
//!   v6_no_restricted_element_006       — Rust-only: `#custom` and `#text` are not id selectors

use crate::lint::{LintConfig, lint};
use crate::violation::Severity;
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

fn html_arena(html: &str) -> markuplint_dom::arena::DomArena {
    let as_doc = markuplint_html_parser::should_parse_as_document(html);
    let is_fragment = !as_doc;
    let parser_arena = if is_fragment {
        markuplint_html_parser::parse_fragment(html)
    } else {
        markuplint_html_parser::parse_document(html)
    };
    html_builder::build_from_html_arena(html, &parser_arena, is_fragment)
}

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

/// TS: `[no-restricted-element-invalid-001]` — global rule
#[test]
fn no_restricted_element_invalid_001() {
    const _ID: &str = "no-restricted-element-invalid-001";
    let arena = html_arena("<div><hgroup><h1>Heading</h1></hgroup></div>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "no-restricted-element": ["hgroup"]
        }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 6);
    assert_eq!(result.violations[0].raw, "<hgroup>");
    assert_eq!(result.violations[0].message, "The \"hgroup\" element is disallowed");
}

/// TS: `[no-restricted-element-invalid-002]` — node rule (check children)
#[test]
fn no_restricted_element_invalid_002() {
    const _ID: &str = "no-restricted-element-invalid-002";
    let arena = html_arena("<h1><span>Title</span><small>Sub-title</small></h1>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "no-restricted-element": true
        },
        "nodeRules": [
            {
                "selector": "h1, h2, h3, h4, h5, h6",
                "rules": {
                    "no-restricted-element": ["small"]
                }
            }
        ]
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 23);
    assert_eq!(result.violations[0].raw, "<small>");
    assert_eq!(result.violations[0].message, "The \"small\" element is disallowed");
}

/// TS: `[no-restricted-element-invalid-003]` — Recommend (label + :model(interactive))
#[test]
fn no_restricted_element_invalid_003() {
    const _ID: &str = "no-restricted-element-invalid-003";

    // Sub-test 1: nodeRule with ['label'] selector
    let arena = html_arena(r#"<details><summary><label id="foo">foo</label></summary><input id="foo"/></details>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-element": true },
        "nodeRules": [
            { "selector": "summary", "rules": { "no-restricted-element": ["label"] } }
        ]
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 19);
    assert_eq!(result.violations[0].raw, r#"<label id="foo">"#);
    assert_eq!(result.violations[0].message, "The \"label\" element is disallowed");

    // Sub-test 2: nodeRule with [':model(interactive)'] selector
    let arena2 = html_arena(r#"<details><summary><label id="foo">foo</label></summary><input id="foo"/></details>"#);
    let config2: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-element": true },
        "nodeRules": [
            { "selector": "summary", "rules": { "no-restricted-element": [":model(interactive)"] } }
        ]
    }))
    .unwrap();
    let result2 = lint(&arena2, &spec, &config2);
    assert_eq!(result2.violations.len(), 1);
    assert_eq!(result2.violations[0].severity, Severity::Error);
    assert_eq!(result2.violations[0].line, 1);
    assert_eq!(result2.violations[0].col, 19);
    assert_eq!(result2.violations[0].raw, r#"<label id="foo">"#);
    assert_eq!(
        result2.violations[0].message,
        "The \":model(interactive)\" element is disallowed"
    );
}

/// The raw start tags of the elements `selector` selects in `html`, as `no-restricted-element`
/// reports them, in document order.
fn selected(html: &str, selector: &str) -> Vec<String> {
    let arena = html_arena(html);
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-element": { "value": [selector] } }
    }))
    .unwrap();
    let mut violations = lint(&arena, &spec(), &config).violations;
    violations.sort_by_key(|v| (v.line, v.col));
    violations.into_iter().map(|v| v.raw).collect()
}

/// A `:model(palpable)` entry with a condition is evaluated, not reduced to a tag name. Expected
/// values are the TS output on the same input (`MLEngine`, default engine).
#[test]
fn v6_no_restricted_element_001() {
    assert_eq!(selected("<sup></sup>", ":model(palpable)"), ["<sup>"]);
    assert_eq!(selected("<ul><li></li></ul>", ":model(palpable)"), ["<ul>"]);
    assert_eq!(selected("<dl><dt>a</dt><dd>b</dd></dl>", ":model(palpable)"), ["<dl>"]);
    assert_eq!(
        selected(r#"<input type="text">"#, ":model(palpable)"),
        [r#"<input type="text">"#]
    );
    assert_eq!(selected("<math></math>", ":model(palpable)"), ["<math>"]);
    assert_eq!(
        selected("<audio controls></audio>", ":model(palpable)"),
        ["<audio controls>"]
    );
}

/// The condition of an entry is the other half: without it the element is not in the category.
/// Expected values are the TS output on the same input.
#[test]
fn v6_no_restricted_element_002() {
    assert!(selected("<ul></ul>", ":model(palpable)").is_empty());
    assert!(selected("<dl></dl>", ":model(palpable)").is_empty());
    assert!(selected("<audio></audio>", ":model(palpable)").is_empty());
    assert!(selected(r#"<input type="hidden">"#, ":model(palpable)").is_empty());
}

/// `#custom` covers a custom element in `#flow`, `#phrasing` and `#palpable` and no other category;
/// a reserved hyphenated name is an HTML element. Expected values are the TS output on the same
/// input.
#[test]
fn v6_no_restricted_element_003() {
    for category in ["flow", "phrasing", "palpable"] {
        assert_eq!(
            selected("<x-foo></x-foo>", &format!(":model({category})")),
            ["<x-foo>"],
            "{category}"
        );
    }
    assert!(selected("<x-foo></x-foo>", ":model(interactive)").is_empty());
    assert!(selected("<annotation-xml></annotation-xml>", ":model(flow)").is_empty());
    assert_eq!(
        selected("<div><x-foo></x-foo></div>", "div:has(:model(phrasing))"),
        ["<div>"]
    );
}

/// `custom` is not a category, so `:model(custom)` selects nothing, a custom element included.
/// Expected values are the TS output on the same input.
#[test]
fn v6_no_restricted_element_004() {
    assert!(selected("<x-foo></x-foo>", ":model(custom)").is_empty());
    assert!(selected("<annotation-xml></annotation-xml>", ":model(custom)").is_empty());
    assert!(selected("<div></div>", ":model(nonexistent)").is_empty());
}

/// A category is found by its lower-cased name first and then case-insensitively, and the name is
/// trimmed. Expected values are the TS output on the same input.
#[test]
fn v6_no_restricted_element_005() {
    let rect = ["<svg>", "<rect>"];
    assert_eq!(selected("<svg><rect></rect></svg>", ":model(SVGRenderable)"), rect);
    assert_eq!(selected("<svg><rect></rect></svg>", ":model(svgrenderable)"), rect);
    assert_eq!(selected("<svg><rect></rect></svg>", ":model(SVGShape)"), ["<rect>"]);
    assert_eq!(
        selected("<div></div><span></span>", ":model( Flow )"),
        ["<div>", "<span>"]
    );
}

/// `#custom` and `#text` are entries of a category, not selectors: an element whose `id` is
/// `custom` or `text` is not covered by them (as CSS ids they would match it). `li` is in none of
/// these categories. Expected values are the TS output on the same input.
#[test]
fn v6_no_restricted_element_006() {
    let html = r#"<li id="text"></li><li id="custom"></li>"#;
    for category in ["flow", "phrasing", "palpable"] {
        assert!(selected(html, &format!(":model({category})")).is_empty(), "{category}");
    }
}
