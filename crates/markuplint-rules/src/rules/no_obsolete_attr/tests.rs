//! Tests for `no-obsolete-attr` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-obsolete-attr-invalid-001  → no_obsolete_attr_invalid_001
//!   no-obsolete-attr-invalid-002  → no_obsolete_attr_invalid_002
//!   no-obsolete-attr-valid-001    → no_obsolete_attr_valid_001
//!   no-obsolete-attr-valid-002    → no_obsolete_attr_valid_002
//!   v6_no_obsolete_attr_001       — Rust-only: an obsolete attribute written in another case is not matched

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
        "rules": { "no-obsolete-attr": true }
    }))
    .unwrap();
    lint(&arena, &spec, &config).violations
}

/// TS: `[no-obsolete-attr-invalid-001]`
#[test]
fn no_obsolete_attr_invalid_001() {
    const _ID: &str = "no-obsolete-attr-invalid-001";
    let violations = run(r#"<link rel="alternate" href="/feed" charset="utf-8">"#);
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].rule_id, "no-obsolete-attr");
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 36);
    assert_eq!(violations[0].raw, "charset");
    assert_eq!(violations[0].message, "The \"charset\" attribute is obsolete");
}

/// TS: `[no-obsolete-attr-invalid-002]`
#[test]
fn no_obsolete_attr_invalid_002() {
    const _ID: &str = "no-obsolete-attr-invalid-002";
    let violations = run(r#"<link rel="made" href="/author" rev="made">"#);
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 33);
    assert_eq!(violations[0].raw, "rev");
    assert_eq!(violations[0].message, "The \"rev\" attribute is obsolete");
}

/// TS: `[no-obsolete-attr-valid-001]`
#[test]
fn no_obsolete_attr_valid_001() {
    const _ID: &str = "no-obsolete-attr-valid-001";
    let violations = run(r#"<link rel="alternate" href="/feed">"#);
    assert_eq!(violations.len(), 0);
}

/// TS: `[no-obsolete-attr-valid-002]`
#[test]
fn no_obsolete_attr_valid_002() {
    const _ID: &str = "no-obsolete-attr-valid-002";
    let violations = run(r#"<img align="top">"#);
    assert_eq!(violations.len(), 0);
}

/// Rust-only: the attribute name is matched exactly as written, as TS `attr.name` is.
/// Expected values from the TS rule.
#[test]
fn v6_no_obsolete_attr_001() {
    let violations = run(r#"<link rel="alternate" href="/feed" CHARSET="utf-8">"#);
    assert_eq!(violations.len(), 0);
}
