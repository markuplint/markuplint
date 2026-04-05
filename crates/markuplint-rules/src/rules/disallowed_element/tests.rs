//! Tests for `disallowed-element` rule.
//!
//! Test ID mapping (TS → Rust):
//!   disallowed-element-invalid-001  → disallowed_element_invalid_001
//!   disallowed-element-invalid-002  → disallowed_element_invalid_002
//!   disallowed-element-invalid-003  → disallowed_element_invalid_003

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

/// TS: `[disallowed-element-invalid-001]` — global rule
#[test]
fn disallowed_element_invalid_001() {
    const _ID: &str = "disallowed-element-invalid-001";
    let arena = html_arena("<div><hgroup><h1>Heading</h1></hgroup></div>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "disallowed-element": ["hgroup"]
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

/// TS: `[disallowed-element-invalid-002]` — node rule (check children)
#[test]
fn disallowed_element_invalid_002() {
    const _ID: &str = "disallowed-element-invalid-002";
    let arena = html_arena("<h1><span>Title</span><small>Sub-title</small></h1>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "disallowed-element": true
        },
        "nodeRules": [
            {
                "selector": "h1, h2, h3, h4, h5, h6",
                "rules": {
                    "disallowed-element": ["small"]
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

/// TS: `[disallowed-element-invalid-003]` — Recommend (label + :model(interactive))
#[test]
fn disallowed_element_invalid_003() {
    const _ID: &str = "disallowed-element-invalid-003";

    // Sub-test 1: nodeRule with ['label'] selector
    let arena = html_arena(r#"<details><summary><label id="foo">foo</label></summary><input id="foo"/></details>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "disallowed-element": true },
        "nodeRules": [
            { "selector": "summary", "rules": { "disallowed-element": ["label"] } }
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
        "rules": { "disallowed-element": true },
        "nodeRules": [
            { "selector": "summary", "rules": { "disallowed-element": [":model(interactive)"] } }
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
