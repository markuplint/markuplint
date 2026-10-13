//! Tests for `no-redundant-role` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-redundant-role-valid-001    → no_redundant_role_valid_001
//!   no-redundant-role-invalid-001  → no_redundant_role_invalid_001
//!   no-redundant-role-invalid-002  → no_redundant_role_invalid_002
//!   v6_no_redundant_role_001       — Rust-only: the implicit role depends on the element's conditions (`a` with / without `href`)
//!   v6_no_redundant_role_002       — Rust-only: only the first matching token is reported, at its own position
//!   v6_no_redundant_role_003       — Rust-only: the comparison is case-sensitive; an uppercase tag is quoted in lower case
//!   v6_no_redundant_role_004       — Rust-only: `generic` on `div`, and `rules: false`
//!   v6_no_redundant_role_005       — Rust-only: `heading` on `h1` and `button` on `button`

use crate::lint::{LintConfig, lint};
use crate::violation::Severity;
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

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

fn config(value: serde_json::Value) -> LintConfig {
    serde_json::from_value(serde_json::json!({ "rules": { "no-redundant-role": value } })).unwrap()
}

/// TS: `[no-redundant-role-valid-001]`
#[test]
fn no_redundant_role_valid_001() {
    const _ID: &str = "no-redundant-role-valid-001";
    let arena = html_arena(r#"<nav role="menu"></nav>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert!(result.violations.is_empty());
}

/// TS: `[no-redundant-role-invalid-001]`
#[test]
fn no_redundant_role_invalid_001() {
    const _ID: &str = "no-redundant-role-invalid-001";
    let arena = html_arena(r#"<nav role="navigation"></nav>"#);
    // `true` takes the rule's default severity, a warning.
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));

    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].rule_id, "no-redundant-role");
    assert_eq!(result.violations[0].severity, Severity::Warning);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 12);
    assert_eq!(
        result.violations[0].message,
        "The \"navigation\" role is the implicit role of the \"nav\" element"
    );
    assert_eq!(result.violations[0].raw, "navigation");
}

/// TS: `[no-redundant-role-invalid-002]`
#[test]
fn no_redundant_role_invalid_002() {
    const _ID: &str = "no-redundant-role-invalid-002";
    let arena = html_arena(r#"<html role="document"><head></head><body></body></html>"#);
    let result = lint(
        &arena,
        &spec(),
        &config(serde_json::json!({ "options": { "version": "1.1" } })),
    );

    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Warning);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 13);
    assert_eq!(
        result.violations[0].message,
        "The \"document\" role is the implicit role of the \"html\" element"
    );
    assert_eq!(result.violations[0].raw, "document");
}

#[test]
fn v6_no_redundant_role_001() {
    // `a` has the implicit role `link` only with an `href`.
    let arena = html_arena(r#"<a href="x" role="link"></a>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].col, 19);
    assert_eq!(
        result.violations[0].message,
        "The \"link\" role is the implicit role of the \"a\" element"
    );
    assert_eq!(result.violations[0].raw, "link");

    let arena = html_arena(r#"<a role="link"></a>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert!(result.violations.is_empty());
}

#[test]
fn v6_no_redundant_role_002() {
    let arena = html_arena(r#"<nav role="menu navigation"></nav>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));

    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 17);
    assert_eq!(result.violations[0].raw, "navigation");
}

#[test]
fn v6_no_redundant_role_003() {
    // `NAV` is the `nav` element; its local name is lower case.
    let arena = html_arena(r#"<NAV role="navigation"></NAV>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert_eq!(result.violations.len(), 1);
    assert_eq!(
        result.violations[0].message,
        "The \"navigation\" role is the implicit role of the \"nav\" element"
    );

    let arena = html_arena(r#"<nav role="Navigation"></nav>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert!(result.violations.is_empty());
}

#[test]
fn v6_no_redundant_role_004() {
    let arena = html_arena(r#"<div role="generic"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].col, 12);
    assert_eq!(
        result.violations[0].message,
        "The \"generic\" role is the implicit role of the \"div\" element"
    );

    let disabled = lint(&arena, &spec(), &config(serde_json::json!(false)));
    assert!(disabled.violations.is_empty());
}

#[test]
fn v6_no_redundant_role_005() {
    let arena = html_arena(r#"<h1 role="heading">x</h1>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Warning);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 11);
    assert_eq!(
        result.violations[0].message,
        "The \"heading\" role is the implicit role of the \"h1\" element"
    );
    assert_eq!(result.violations[0].raw, "heading");

    let arena = html_arena(r#"<button role="button">x</button>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Warning);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 15);
    assert_eq!(
        result.violations[0].message,
        "The \"button\" role is the implicit role of the \"button\" element"
    );
    assert_eq!(result.violations[0].raw, "button");
}
