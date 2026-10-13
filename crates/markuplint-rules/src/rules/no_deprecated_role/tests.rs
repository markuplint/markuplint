//! Tests for `no-deprecated-role` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-deprecated-role-valid-001    → no_deprecated_role_valid_001
//!   no-deprecated-role-invalid-001  → no_deprecated_role_invalid_001
//!   v6_no_deprecated_role_001       — Rust-only: the default severity is a warning, and it can be raised
//!   v6_no_deprecated_role_002       — Rust-only: a deprecated role not computed (a valid one comes first) is not reported
//!   v6_no_deprecated_role_003       — Rust-only: the whole attribute value is quoted when the deprecated role is computed
//!   v6_no_deprecated_role_004       — Rust-only: `rules: false`

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
    serde_json::from_value(serde_json::json!({ "rules": { "no-deprecated-role": value } })).unwrap()
}

/// TS: `[no-deprecated-role-valid-001]`
#[test]
fn no_deprecated_role_valid_001() {
    const _ID: &str = "no-deprecated-role-valid-001";
    let arena = html_arena(r#"<div role="button"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert!(result.violations.is_empty());
}

/// TS: `[no-deprecated-role-invalid-001]`
#[test]
fn no_deprecated_role_invalid_001() {
    const _ID: &str = "no-deprecated-role-invalid-001";
    let arena = html_arena(r#"<div role="directory"></div>"#);
    // `true` takes the rule's default severity, a warning.
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));

    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].rule_id, "no-deprecated-role");
    assert_eq!(result.violations[0].severity, Severity::Warning);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 6);
    assert_eq!(result.violations[0].message, "The \"directory\" role is deprecated");
    assert_eq!(result.violations[0].raw, "role=\"directory\"");
}

#[test]
fn v6_no_deprecated_role_001() {
    let arena = html_arena(r#"<div role="directory"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!("error")));

    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
}

#[test]
fn v6_no_deprecated_role_002() {
    // The first token that survives the "Handling Author Errors" algorithm is computed: `button`.
    let arena = html_arena(r#"<div role="button directory"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert!(result.violations.is_empty());
}

#[test]
fn v6_no_deprecated_role_003() {
    let arena = html_arena(r#"<div role="directory button"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));

    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 6);
    assert_eq!(
        result.violations[0].message,
        "The \"directory button\" role is deprecated"
    );
    assert_eq!(result.violations[0].raw, "role=\"directory button\"");
}

#[test]
fn v6_no_deprecated_role_004() {
    let arena = html_arena(r#"<div role="directory"></div>"#);
    let disabled = lint(&arena, &spec(), &config(serde_json::json!(false)));
    assert!(disabled.violations.is_empty());
}
