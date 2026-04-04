//! Tests for `deprecated-element` rule.
//!
//! Test ID mapping (TS → Rust):
//!   deprecated-element-valid-001    → deprecated_element_valid_001
//!   deprecated-element-valid-002    → deprecated_element_valid_002
//!   deprecated-element-invalid-001  → deprecated_element_invalid_001

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

/// TS: `[deprecated-element-valid-001]` — normal elements
#[test]
fn deprecated_element_valid_001() {
    const _ID: &str = "deprecated-element-valid-001";
    let arena = html_arena("<div></div><p><span></span></p>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "deprecated-element": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[deprecated-element-valid-002]` — non-deprecated standard element
#[test]
fn deprecated_element_valid_002() {
    const _ID: &str = "deprecated-element-valid-002";
    let arena = html_arena("<hgroup></hgroup>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "deprecated-element": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[deprecated-element-invalid-001]` — obsolete elements
#[test]
fn deprecated_element_invalid_001() {
    const _ID: &str = "deprecated-element-invalid-001";
    let arena = html_arena("<font></font><big><blink></blink></big>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "deprecated-element": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 3);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].message, "The \"font\" element is obsolete");
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 1);
    assert_eq!(result.violations[0].raw, "<font>");
    assert_eq!(result.violations[1].severity, Severity::Error);
    assert_eq!(result.violations[1].message, "The \"big\" element is obsolete");
    assert_eq!(result.violations[1].line, 1);
    assert_eq!(result.violations[1].col, 14);
    assert_eq!(result.violations[1].raw, "<big>");
    assert_eq!(result.violations[2].severity, Severity::Error);
    assert_eq!(result.violations[2].message, "The \"blink\" element is obsolete");
    assert_eq!(result.violations[2].line, 1);
    assert_eq!(result.violations[2].col, 19);
    assert_eq!(result.violations[2].raw, "<blink>");
}
