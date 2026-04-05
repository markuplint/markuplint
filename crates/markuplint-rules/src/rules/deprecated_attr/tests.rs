//! Tests for `deprecated-attr` rule.
//!
//! Test ID mapping (TS → Rust):
//!   deprecated-attr-invalid-001  → deprecated_attr_invalid_001
//!   deprecated-attr-invalid-002  → deprecated_attr_invalid_002
//!   deprecated-attr-invalid-003  → deprecated_attr_invalid_003
//!   v6_deprecated_attr_001       — Rust-only: normal attr no violation
//!   v6_deprecated_attr_002       — Rust-only: unknown attr no violation

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

/// TS: `[deprecated-attr-invalid-001]` — deprecated attribute
#[test]
fn deprecated_attr_invalid_001() {
    const _ID: &str = "deprecated-attr-invalid-001";
    let arena = html_arena(r#"<img align="top">"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "deprecated-attr": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 6);
    assert_eq!(result.violations[0].raw, "align");
    assert_eq!(result.violations[0].message, "The \"align\" attribute is deprecated");
}

/// TS: `[deprecated-attr-invalid-002]` — deprecated global attribute
#[test]
fn deprecated_attr_invalid_002() {
    const _ID: &str = "deprecated-attr-invalid-002";
    let arena = html_arena(r#"<img xml:lang="en-US">"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "deprecated-attr": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 6);
    assert_eq!(result.violations[0].raw, "xml:lang");
    assert_eq!(result.violations[0].message, "The \"xml:lang\" attribute is deprecated");
}

/// TS: `[deprecated-attr-invalid-003]` — svg xlink:href
#[test]
fn deprecated_attr_invalid_003() {
    const _ID: &str = "deprecated-attr-invalid-003";
    let arena = html_arena(
        "<svg viewBox=\"0 0 160 40\" xmlns=\"http://www.w3.org/2000/svg\">\n          <a xlink:href=\"https://developer.mozilla.org/\">\n          <text x=\"10\" y=\"25\">MDN Web Docs</text></a>\n        </svg>",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "deprecated-attr": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 2);
    assert_eq!(result.violations[0].col, 14);
    assert_eq!(
        result.violations[0].message,
        "The \"xlink:href\" attribute is deprecated"
    );
    assert_eq!(result.violations[0].raw, "xlink:href");
}

/// Rust-only: normal attr no violation
#[test]
fn v6_deprecated_attr_001() {
    let arena = html_arena(r#"<div class="foo"></div>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "deprecated-attr": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// Rust-only: unknown attr no violation
#[test]
fn v6_deprecated_attr_002() {
    let arena = html_arena(r#"<div data-x="y"></div>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "deprecated-attr": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}
