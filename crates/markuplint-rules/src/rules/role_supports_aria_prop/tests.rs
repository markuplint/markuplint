//! Tests for `role-supports-aria-prop` rule.
//!
//! Test ID mapping (TS → Rust):
//!   role-supports-aria-prop-001    → role_supports_aria_prop_001
//!   role-supports-aria-prop-002  → role_supports_aria_prop_002
//!   v6_role_supports_aria_prop_001  — Rust-only: every unsupported attribute is reported, with its type
//!   v6_role_supports_aria_prop_002  — Rust-only: an attribute name written in upper case is the owned property it names
//!   v6_role_supports_aria_prop_003  — Rust-only: implicit roles, including `generic`, and an invalid `role`
//!   v6_role_supports_aria_prop_004  — Rust-only: no computed role, no check
//!   v6_role_supports_aria_prop_005  — Rust-only: severity and `rules: false`
//!   v6_role_supports_aria_prop_006  — Rust-only: an element whose role is not known until it is rendered is not judged

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

/// TS: `[role-supports-aria-prop-001]`
#[test]
fn role_supports_aria_prop_001() {
    const _ID: &str = "role-supports-aria-prop-001";
    let violations = run_rule(
        r#"<div role="button" aria-pressed="true"></div>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[role-supports-aria-prop-002]`
#[test]
fn role_supports_aria_prop_002() {
    const _ID: &str = "role-supports-aria-prop-002";
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
    // `ARIA-LEVEL` is `aria-level` as the DOM names it (#4309), which the role owns.
    let violations = run_rule(r#"<div role="heading" ARIA-LEVEL="2"></div>"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
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

/// The MLAST of a `div` with these attributes, linted by `role-supports-aria-prop`: `(name, value, what the TS engine worked out)`.
fn lint_div(attrs: &[(&str, &str, serde_json::Value)]) -> Vec<crate::test_util::Brief> {
    crate::test_util::lint_mlast_brief(
        "role-supports-aria-prop",
        &crate::test_util::mlast_element("div", attrs, &serde_json::json!({})),
        serde_json::json!({ "rules": { "role-supports-aria-prop": true } }),
    )
}

fn code() -> serde_json::Value {
    serde_json::json!({ "isDynamicValue": true })
}

fn spread() -> serde_json::Value {
    serde_json::json!({ "isDirective": true, "isSpread": true, "isDynamicValue": true })
}

fn plain() -> serde_json::Value {
    serde_json::json!({})
}

/// Rust-only: the role is not known where code gives it, where a spread attribute comes after it, or where there is a
/// spread and no `role` attribute (TS `isRoleUnknown`), so the element is not judged by the role it falls back to.
#[test]
fn v6_role_supports_aria_prop_006() {
    let pressed = || ("aria-pressed", "true", plain());
    assert_eq!(lint_div(&[("role", "props.role", code()), pressed()]), []);
    assert_eq!(lint_div(&[pressed(), ("v-bind", "props", spread())]), []);
    assert_eq!(
        lint_div(&[("role", "heading", plain()), ("v-bind", "props", spread()), pressed()]),
        []
    );
    // A role that the markup tells, with no spread after it, is judged
    for attrs in [
        vec![("role", "heading", plain()), pressed()],
        vec![("v-bind", "props", spread()), ("role", "heading", plain()), pressed()],
    ] {
        let violations = lint_div(&attrs);
        assert_eq!(violations.len(), 1, "{violations:?}");
        assert_eq!(
            violations[0].3,
            "The \"aria-pressed\" ARIA state is disallowed on the \"heading\" role"
        );
    }
}
