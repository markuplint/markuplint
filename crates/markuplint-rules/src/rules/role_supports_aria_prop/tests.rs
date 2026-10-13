//! Tests for `role-supports-aria-prop` rule.
//!
//! Test ID mapping (TS → Rust):
//!   role-supports-aria-prop-valid-001    → role_supports_aria_prop_valid_001
//!   role-supports-aria-prop-invalid-001  → role_supports_aria_prop_invalid_001
//!   v6_role_supports_aria_prop_001  — Rust-only: every unsupported attribute is reported, with its type
//!   v6_role_supports_aria_prop_002  — Rust-only: an attribute name written in upper case is not an owned property
//!   v6_role_supports_aria_prop_003  — Rust-only: implicit roles, including `generic`, and an invalid `role`
//!   v6_role_supports_aria_prop_004  — Rust-only: no computed role, no check
//!   v6_role_supports_aria_prop_005  — Rust-only: severity and `rules: false`

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
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

fn run_rule(html: &str, value: serde_json::Value) -> Vec<Violation> {
    let config: LintConfig =
        serde_json::from_value(serde_json::json!({ "rules": { "role-supports-aria-prop": value } })).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// `(severity, line, col, message, raw)`, the fields the TS specs assert.
type Expected<'a> = (Severity, u32, u32, &'a str, &'a str);

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (severity, line, col, message, raw)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, "role-supports-aria-prop");
        assert_eq!(violation.severity, *severity);
        assert_eq!(violation.line, *line);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, *message);
        assert_eq!(violation.raw, *raw);
    }
}

/// TS: `[role-supports-aria-prop-valid-001]`
#[test]
fn role_supports_aria_prop_valid_001() {
    const _ID: &str = "role-supports-aria-prop-valid-001";
    let violations = run_rule(
        r#"<div role="button" aria-pressed="true"></div>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[role-supports-aria-prop-invalid-001]`
#[test]
fn role_supports_aria_prop_invalid_001() {
    const _ID: &str = "role-supports-aria-prop-invalid-001";
    let violations = run_rule(
        r#"<div role="heading" aria-pressed="true"></div>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            21,
            "The \"aria-pressed\" ARIA state is disallowed on the \"heading\" role",
            "aria-pressed=\"true\"",
        )],
    );
}

#[test]
fn v6_role_supports_aria_prop_001() {
    // `aria-level` is owned by `heading`; the state and the unknown name are not.
    let violations = run_rule(
        r#"<div role="heading" aria-pressed="true" aria-level="2" aria-bogus="x"></div>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[
            (
                Severity::Error,
                1,
                21,
                "The \"aria-pressed\" ARIA state is disallowed on the \"heading\" role",
                "aria-pressed=\"true\"",
            ),
            (
                Severity::Error,
                1,
                56,
                "The \"aria-bogus\" ARIA property is disallowed on the \"heading\" role",
                "aria-bogus=\"x\"",
            ),
        ],
    );
}

#[test]
fn v6_role_supports_aria_prop_002() {
    // Matched on the name as written, as TS does: `ARIA-LEVEL` is not found among the owned
    // properties, and being unknown by that spelling it is typed "property".
    let violations = run_rule(r#"<div role="heading" ARIA-LEVEL="2"></div>"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            21,
            "The \"ARIA-LEVEL\" ARIA property is disallowed on the \"heading\" role",
            "ARIA-LEVEL=\"2\"",
        )],
    );
}

#[test]
fn v6_role_supports_aria_prop_003() {
    // Implicit role of `button`.
    let violations = run_rule(
        r#"<button aria-pressed="true" aria-checked="true">x</button>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            29,
            "The \"aria-checked\" ARIA state is disallowed on the \"button\" role",
            "aria-checked=\"true\"",
        )],
    );

    // Implicit role of `h1`.
    let violations = run_rule(
        r#"<h1 aria-level="2" aria-pressed="true">x</h1>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            20,
            "The \"aria-pressed\" ARIA state is disallowed on the \"heading\" role",
            "aria-pressed=\"true\"",
        )],
    );

    // `div` is `generic` in the recommended ARIA version, which owns no `aria-label`.
    let violations = run_rule(r#"<div aria-label="x"></div>"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            6,
            "The \"aria-label\" ARIA property is disallowed on the \"generic\" role",
            "aria-label=\"x\"",
        )],
    );

    // An invalid `role` falls back to the implicit role.
    let violations = run_rule(
        r#"<div role="unknown" aria-pressed="true"></div>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            21,
            "The \"aria-pressed\" ARIA state is disallowed on the \"generic\" role",
            "aria-pressed=\"true\"",
        )],
    );
}

#[test]
fn v6_role_supports_aria_prop_004() {
    // No computed role: `element-supports-aria-prop` is responsible for these.
    let violations = run_rule(r#"<input type="hidden" aria-label="x">"#, serde_json::json!(true));
    assert_violations(&violations, &[]);

    // A custom element admitted by the gate has no computed role even with a `role`.
    let violations = run_rule(
        r#"<my-widget role="button" aria-pressed="true"></my-widget>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);

    let violations = run_rule(
        r#"<input type="checkbox" aria-checked="true">"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

#[test]
fn v6_role_supports_aria_prop_005() {
    let violations = run_rule(
        r#"<div role="heading" aria-pressed="true"></div>"#,
        serde_json::json!("warning"),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Warning,
            1,
            21,
            "The \"aria-pressed\" ARIA state is disallowed on the \"heading\" role",
            "aria-pressed=\"true\"",
        )],
    );

    let violations = run_rule(
        r#"<div role="heading" aria-pressed="true"></div>"#,
        serde_json::json!(false),
    );
    assert_violations(&violations, &[]);
}
