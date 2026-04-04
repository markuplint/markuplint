//! Tests for `id-duplication` rule.
//!
//! Test ID mapping (TS → Rust):
//!   id-duplication-invalid-001  → id_duplication_invalid_001
//!   id-duplication-valid-001    → id_duplication_valid_001
//!   id-duplication-invalid-002  → id_duplication_invalid_002
//!   id-duplication-valid-002    → id_duplication_valid_002
//!   id-duplication-parser-001   — SKIP: Vue parser not available in Rust

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

/// TS: `[id-duplication-invalid-001]`
#[test]
fn id_duplication_invalid_001() {
    const _ID: &str = "id-duplication-invalid-001";
    let arena = html_arena(r#"<div id="a"><p id="a"></p></div>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "id-duplication": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(
        result.violations[0].message,
        "The value of the \"id\" attribute is duplicated"
    );
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 16);
    assert_eq!(result.violations[0].raw, r#"id="a""#);
}

/// TS: `[id-duplication-valid-001]`
#[test]
fn id_duplication_valid_001() {
    const _ID: &str = "id-duplication-valid-001";
    let arena = html_arena(r#"<div id="a"></div>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "id-duplication": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[id-duplication-invalid-002]`
#[test]
fn id_duplication_invalid_002() {
    const _ID: &str = "id-duplication-invalid-002";
    let arena = html_arena(r#"<div id="a"></div><div id="a"></div><div id="a"></div>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "id-duplication": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 2);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(
        result.violations[0].message,
        "The value of the \"id\" attribute is duplicated"
    );
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 24);
    assert_eq!(result.violations[0].raw, r#"id="a""#);
    assert_eq!(result.violations[1].severity, Severity::Error);
    assert_eq!(
        result.violations[1].message,
        "The value of the \"id\" attribute is duplicated"
    );
    assert_eq!(result.violations[1].line, 1);
    assert_eq!(result.violations[1].col, 42);
    assert_eq!(result.violations[1].raw, r#"id="a""#);
}

/// TS: `[id-duplication-valid-002]`
#[test]
fn id_duplication_valid_002() {
    const _ID: &str = "id-duplication-valid-002";
    let arena = html_arena(r#"<div id="a"></div><div id="b"></div><div id="c"></div>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "id-duplication": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}
