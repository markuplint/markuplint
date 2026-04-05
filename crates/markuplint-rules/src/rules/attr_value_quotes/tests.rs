//! Tests for `attr-value-quotes` rule.
//!
//! Test ID mapping (TS → Rust):
//!   attr-value-quotes-invalid-001  → attr_value_quotes_invalid_001
//!   attr-value-quotes-invalid-002  → attr_value_quotes_invalid_002
//!   attr-value-quotes-invalid-003  → attr_value_quotes_invalid_003
//!   attr-value-quotes-valid-001    → attr_value_quotes_valid_001
//!   attr-value-quotes-fix-*        — SKIP: auto-fix not implemented in Rust
//!   v6_attr_value_quotes_001       — Rust-only: boolean attr skipped
//!   v6_attr_value_quotes_002       — Rust-only: no-quote attr reported

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

/// TS: `[attr-value-quotes-invalid-001]` — default (double)
#[test]
fn attr_value_quotes_invalid_001() {
    const _ID: &str = "attr-value-quotes-invalid-001";
    // Exact TS template literal bytes (tab indentation = \t\t)
    let arena = html_arena(
        "\n\t\t<div data-attr=\"value\" data-Attr='db' data-attR=tr>\n\t\t\tlorem\n\t\t\t<p>ipsam</p>\n\t\t</div>\n\t\t",
    );
    let spec = spec();
    // TS default severity for style rules is "warning"; Rust has no category system,
    // so we pass severity explicitly to match TS behavior.
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "attr-value-quotes": { "severity": "warning" }
        }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 2);
    assert_eq!(result.violations[0].severity, Severity::Warning);
    assert_eq!(
        result.violations[0].message,
        "Attribute value is must quote on double quotation mark"
    );
    assert_eq!(result.violations[0].line, 2);
    assert_eq!(result.violations[0].col, 26);
    assert_eq!(result.violations[0].raw, "data-Attr='db'");
    assert_eq!(result.violations[1].severity, Severity::Warning);
    assert_eq!(
        result.violations[1].message,
        "Attribute value is must quote on double quotation mark"
    );
    assert_eq!(result.violations[1].line, 2);
    assert_eq!(result.violations[1].col, 41);
    assert_eq!(result.violations[1].raw, "data-attR=tr");
}

/// TS: `[attr-value-quotes-invalid-002]` — double with error severity
#[test]
fn attr_value_quotes_invalid_002() {
    const _ID: &str = "attr-value-quotes-invalid-002";
    let arena = html_arena(
        "\n\t\t<div data-attr=\"value\" data-Attr='db' data-attR=tr>\n\t\t\tlorem\n\t\t\t<p>ipsam</p>\n\t\t</div>\n\t\t",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "attr-value-quotes": {
                "severity": "error",
                "value": "double"
            }
        }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 2);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(
        result.violations[0].message,
        "Attribute value is must quote on double quotation mark"
    );
    assert_eq!(result.violations[0].line, 2);
    assert_eq!(result.violations[0].col, 26);
    assert_eq!(result.violations[0].raw, "data-Attr='db'");
    assert_eq!(result.violations[1].severity, Severity::Error);
    assert_eq!(result.violations[1].line, 2);
    assert_eq!(result.violations[1].col, 41);
    assert_eq!(result.violations[1].raw, "data-attR=tr");
}

/// TS: `[attr-value-quotes-invalid-003]` — single
#[test]
fn attr_value_quotes_invalid_003() {
    const _ID: &str = "attr-value-quotes-invalid-003";
    let arena = html_arena(
        "\n\t\t<div data-attr=\"value\" data-Attr='db' data-attR=tr>\n\t\t\tlorem\n\t\t\t<p>ipsam</p>\n\t\t</div>\n\t\t",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "attr-value-quotes": {
                "severity": "error",
                "value": "single"
            }
        }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 2);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(
        result.violations[0].message,
        "Attribute value is must quote on single quotation mark"
    );
    assert_eq!(result.violations[0].line, 2);
    assert_eq!(result.violations[0].col, 8);
    assert_eq!(result.violations[0].raw, "data-attr=\"value\"");
    assert_eq!(result.violations[1].severity, Severity::Error);
    assert_eq!(result.violations[1].line, 2);
    assert_eq!(result.violations[1].col, 41);
    assert_eq!(result.violations[1].raw, "data-attR=tr");
}

/// TS: `[attr-value-quotes-valid-001]` — boolean attr (no value)
#[test]
fn attr_value_quotes_valid_001() {
    const _ID: &str = "attr-value-quotes-valid-001";
    let arena = html_arena("\n\t\t<div data-attr>\n\t\t\tlorem\n\t\t\t<p>ipsam</p>\n\t\t</div>\n\t\t");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "attr-value-quotes": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// Rust-only: boolean attr skipped
#[test]
fn v6_attr_value_quotes_001() {
    let arena = html_arena("<input disabled />");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "attr-value-quotes": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// Rust-only: unquoted attr reported
#[test]
fn v6_attr_value_quotes_002() {
    let arena = html_arena("<div class=foo></div>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "attr-value-quotes": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(
        result.violations[0].message,
        "Attribute value is must quote on double quotation mark"
    );
}
