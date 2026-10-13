//! Tests for `no-deprecated-attr` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-deprecated-attr-invalid-001  → no_deprecated_attr_invalid_001
//!   no-deprecated-attr-invalid-002  → no_deprecated_attr_invalid_002
//!   no-deprecated-attr-invalid-003  → no_deprecated_attr_invalid_003
//!   no-deprecated-attr-valid-001    → no_deprecated_attr_valid_001
//!   v6_no_deprecated_attr_001       — Rust-only: an ordinary attribute is not reported
//!   v6_no_deprecated_attr_002       — Rust-only: a `data-*` attribute is not reported
//!   v6_no_deprecated_attr_003       — Rust-only: a camelCase SVG attribute is matched in its own case
//!   v6_no_deprecated_attr_004       — Rust-only: an attribute both deprecated and obsolete is reported here too
//!   v6_no_deprecated_attr_005       — Rust-only: a deprecated MathML global attribute

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

fn run(html: &str) -> Vec<crate::violation::Violation> {
    let arena = html_arena(html);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-deprecated-attr": true }
    }))
    .unwrap();
    lint(&arena, &spec, &config).violations
}

/// TS: `[no-deprecated-attr-invalid-001]`
#[test]
fn no_deprecated_attr_invalid_001() {
    const _ID: &str = "no-deprecated-attr-invalid-001";
    let violations = run(r#"<img align="top">"#);
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].rule_id, "no-deprecated-attr");
    assert_eq!(violations[0].severity, Severity::Warning);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 6);
    assert_eq!(violations[0].raw, "align");
    assert_eq!(violations[0].message, "The \"align\" attribute is deprecated");
}

/// TS: `[no-deprecated-attr-invalid-002]`
#[test]
fn no_deprecated_attr_invalid_002() {
    const _ID: &str = "no-deprecated-attr-invalid-002";
    let violations = run(r#"<img xml:lang="en-US">"#);
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].severity, Severity::Warning);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 6);
    assert_eq!(violations[0].raw, "xml:lang");
    assert_eq!(violations[0].message, "The \"xml:lang\" attribute is deprecated");
}

/// TS: `[no-deprecated-attr-invalid-003]`
#[test]
fn no_deprecated_attr_invalid_003() {
    const _ID: &str = "no-deprecated-attr-invalid-003";
    let violations = run(
        "<svg viewBox=\"0 0 160 40\" xmlns=\"http://www.w3.org/2000/svg\">\n          <a xlink:href=\"https://developer.mozilla.org/\">\n          <text x=\"10\" y=\"25\">MDN Web Docs</text></a>\n        </svg>",
    );
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].severity, Severity::Warning);
    assert_eq!(violations[0].line, 2);
    assert_eq!(violations[0].col, 14);
    assert_eq!(violations[0].message, "The \"xlink:href\" attribute is deprecated");
    assert_eq!(violations[0].raw, "xlink:href");
}

/// TS: `[no-deprecated-attr-valid-001]`
#[test]
fn no_deprecated_attr_valid_001() {
    const _ID: &str = "no-deprecated-attr-valid-001";
    let violations = run(r#"<img src="path/to" alt="any picture">"#);
    assert_eq!(violations.len(), 0);
}

/// Rust-only: an ordinary attribute is not reported.
/// Expected values from the TS rule.
#[test]
fn v6_no_deprecated_attr_001() {
    let violations = run(r#"<div class="foo"></div>"#);
    assert_eq!(violations.len(), 0);
}

/// Rust-only: a `data-*` attribute, which the spec does not list, is not reported.
/// Expected values from the TS rule.
#[test]
fn v6_no_deprecated_attr_002() {
    let violations = run(r#"<div data-x="y"></div>"#);
    assert_eq!(violations.len(), 0);
}

/// Rust-only: a camelCase SVG attribute is looked up in the case it is written in.
/// Expected values from the TS rule.
#[test]
fn v6_no_deprecated_attr_003() {
    let violations = run(r#"<svg baseProfile="full"></svg>"#);
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].severity, Severity::Warning);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 6);
    assert_eq!(violations[0].raw, "baseProfile");
    assert_eq!(violations[0].message, "The \"baseProfile\" attribute is deprecated");
}

/// Rust-only: `link[charset]` is both deprecated and obsolete; each split rule reports it.
/// Expected values from the TS rule.
#[test]
fn v6_no_deprecated_attr_004() {
    let violations = run(r#"<link rel="alternate" href="/feed" charset="utf-8">"#);
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].severity, Severity::Warning);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 36);
    assert_eq!(violations[0].raw, "charset");
    assert_eq!(violations[0].message, "The \"charset\" attribute is deprecated");
}

/// Rust-only: a deprecated MathML global attribute.
/// Expected values from the TS rule.
#[test]
fn v6_no_deprecated_attr_005() {
    let violations = run(r#"<math mathcolor="red"></math>"#);
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].severity, Severity::Warning);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 7);
    assert_eq!(violations[0].raw, "mathcolor");
    assert_eq!(violations[0].message, "The \"mathcolor\" attribute is deprecated");
}
