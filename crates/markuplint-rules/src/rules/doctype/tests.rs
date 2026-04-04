//! Tests for `doctype` rule.
//!
//! Test ID mapping (TS → Rust):
//!   doctype-valid-001    → doctype_valid_001
//!   doctype-invalid-001  → doctype_invalid_001
//!   doctype-valid-002    → doctype_valid_002
//!   doctype-invalid-002  → doctype_invalid_002
//!   v6_doctype_001       — Rust-only: obsolete denied by default
//!   v6_doctype_002       — Rust-only: obsolete allowed when denyObsoleteType=false
//!   v6_doctype_003       — Rust-only: config value="never" skips check

use crate::lint::{LintConfig, lint};
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

/// TS: `[doctype-valid-001]`
#[test]
fn doctype_valid_001() {
    const _ID: &str = "doctype-valid-001";
    let arena = html_arena("<!doctype html>\n<html></html>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "doctype": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[doctype-invalid-001]`
#[test]
fn doctype_invalid_001() {
    const _ID: &str = "doctype-invalid-001";
    let arena = html_arena("<html></html>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "doctype": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, crate::violation::Severity::Error);
    assert_eq!(result.violations[0].message, "Require doctype");
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 1);
    assert_eq!(result.violations[0].raw, "");
}

/// TS: `[doctype-valid-002]`
#[test]
fn doctype_valid_002() {
    const _ID: &str = "doctype-valid-002";
    let arena = html_arena("<div></div>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "doctype": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[doctype-invalid-002]`
#[test]
fn doctype_invalid_002() {
    const _ID: &str = "doctype-invalid-002";
    let arena = html_arena(
        r#"<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<div></div>"#,
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "doctype": "always" }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, crate::violation::Severity::Error);
    assert_eq!(result.violations[0].message, "Never declare obsolete doctype");
    assert_eq!(
        result.violations[0].raw,
        r#"<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">"#
    );
}

/// Rust-only: obsolete doctype denied by default (denyObsoleteType defaults to true)
#[test]
fn v6_doctype_001() {
    let arena = html_arena(
        r#"<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<div></div>"#,
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "doctype": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].message, "Never declare obsolete doctype");
}

/// Rust-only: denyObsoleteType=false allows obsolete doctype
#[test]
fn v6_doctype_002() {
    let arena = html_arena(
        r#"<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<div></div>"#,
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "doctype": {
                "value": "always",
                "options": { "denyObsoleteType": false }
            }
        }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(
        result.violations.len(),
        0,
        "denyObsoleteType=false should allow obsolete doctype"
    );
}

/// Rust-only: config value="never" skips the check entirely
#[test]
fn v6_doctype_003() {
    let arena = html_arena("<html></html>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "doctype": { "value": "never" }
        }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}
