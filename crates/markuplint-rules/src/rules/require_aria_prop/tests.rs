//! Tests for `require-aria-prop` rule.
//!
//! Test ID mapping (TS → Rust):
//!   require-aria-prop-valid-001        → require_aria_prop_valid_001
//!   require-aria-prop-valid-002        → require_aria_prop_valid_002
//!   require-aria-prop-invalid-001      → require_aria_prop_invalid_001
//!   require-aria-prop-issue-3682-001   → require_aria_prop_issue_3682_001
//!   require-aria-prop-issue-3682-002   → require_aria_prop_issue_3682_002
//!   require-aria-prop-issue-3682-003   → require_aria_prop_issue_3682_003
//!   require-aria-prop-issue-3682-004   → require_aria_prop_issue_3682_004
//!   require-aria-prop-issue-3682-005   → require_aria_prop_issue_3682_005
//!   require-aria-prop-issue-3682-006   → require_aria_prop_issue_3682_006
//!   require-aria-prop-issue-3682-007   → require_aria_prop_issue_3682_007
//!   require-aria-prop-issue-3682-008   → require_aria_prop_issue_3682_008
//!   require-aria-prop-issue-3682-009   → require_aria_prop_issue_3682_009
//!   v6_require_aria_prop_001  — Rust-only: the message names the property type (state / property)
//!   v6_require_aria_prop_002  — Rust-only: the attribute name is matched case-insensitively
//!   v6_require_aria_prop_003  — Rust-only: the computed role decides (first valid token, unknown role)
//!   v6_require_aria_prop_004  — Rust-only: an element without a spec, and an implicit role, are not checked
//!   v6_require_aria_prop_005  — Rust-only: a native attribute that carries the value satisfies the requirement
//!   v6_require_aria_prop_006  — Rust-only: severity and `rules: false`

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
        serde_json::from_value(serde_json::json!({ "rules": { "require-aria-prop": value } })).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// `(severity, line, col, message, raw)`, the fields the TS specs assert.
type Expected<'a> = (Severity, u32, u32, &'a str, &'a str);

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (severity, line, col, message, raw)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, "require-aria-prop");
        assert_eq!(violation.severity, *severity);
        assert_eq!(violation.line, *line);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, *message);
        assert_eq!(violation.raw, *raw);
    }
}

fn version(version: &str) -> serde_json::Value {
    serde_json::json!({ "options": { "version": version } })
}

/// TS: `[require-aria-prop-valid-001]`
#[test]
fn require_aria_prop_valid_001() {
    const _ID: &str = "require-aria-prop-valid-001";
    assert_violations(&run_rule("<div></div>", serde_json::json!(true)), &[]);
}

/// TS: `[require-aria-prop-valid-002]`
#[test]
fn require_aria_prop_valid_002() {
    const _ID: &str = "require-aria-prop-valid-002";
    let violations = run_rule(
        r#"<div role="slider" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[require-aria-prop-invalid-001]`
#[test]
fn require_aria_prop_invalid_001() {
    const _ID: &str = "require-aria-prop-invalid-001";
    let violations = run_rule(r#"<div role="slider"></div>"#, serde_json::json!(true));
    assert!(!violations.is_empty(), "violations: {violations:?}");
    assert_eq!(violations[0].severity, Severity::Error);
}

/// TS: `[require-aria-prop-issue-3682-001]`
#[test]
fn require_aria_prop_issue_3682_001() {
    const _ID: &str = "require-aria-prop-issue-3682-001";
    assert_violations(
        &run_rule(r#"<div role="separator"></div>"#, serde_json::json!(true)),
        &[],
    );
}

/// TS: `[require-aria-prop-issue-3682-002]`
#[test]
fn require_aria_prop_issue_3682_002() {
    const _ID: &str = "require-aria-prop-issue-3682-002";
    let violations = run_rule(r#"<div role="separator" tabindex="0"></div>"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            1,
            "Require the \"aria-valuenow\" ARIA property on the \"separator\" role",
            "<div role=\"separator\" tabindex=\"0\">",
        )],
    );
}

/// TS: `[require-aria-prop-issue-3682-003]`
#[test]
fn require_aria_prop_issue_3682_003() {
    const _ID: &str = "require-aria-prop-issue-3682-003";
    let violations = run_rule(
        r#"<div role="separator" tabindex="0" aria-valuenow="50"></div>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[require-aria-prop-issue-3682-004]`
#[test]
fn require_aria_prop_issue_3682_004() {
    const _ID: &str = "require-aria-prop-issue-3682-004";
    let violations = run_rule(r#"<button role="separator">Drag</button>"#, serde_json::json!(true));
    assert!(!violations.is_empty(), "violations: {violations:?}");
    assert!(violations[0].message.contains("aria-valuenow"));
}

/// TS: `[require-aria-prop-issue-3682-005]`
#[test]
fn require_aria_prop_issue_3682_005() {
    const _ID: &str = "require-aria-prop-issue-3682-005";
    let violations = run_rule(r#"<div role="separator" tabindex="-1"></div>"#, serde_json::json!(true));
    assert!(!violations.is_empty(), "violations: {violations:?}");
    assert!(violations[0].message.contains("aria-valuenow"));
}

/// TS: `[require-aria-prop-issue-3682-006]`
#[test]
fn require_aria_prop_issue_3682_006() {
    const _ID: &str = "require-aria-prop-issue-3682-006";
    assert_violations(&run_rule(r#"<hr role="separator">"#, serde_json::json!(true)), &[]);
}

/// TS: `[require-aria-prop-issue-3682-007]`
#[test]
fn require_aria_prop_issue_3682_007() {
    const _ID: &str = "require-aria-prop-issue-3682-007";
    assert_violations(&run_rule(r#"<div role="separator"></div>"#, version("1.2")), &[]);
}

/// TS: `[require-aria-prop-issue-3682-008]`
#[test]
fn require_aria_prop_issue_3682_008() {
    const _ID: &str = "require-aria-prop-issue-3682-008";
    let violations = run_rule(r#"<div role="separator" tabindex="0"></div>"#, version("1.2"));
    assert!(!violations.is_empty(), "violations: {violations:?}");
    assert!(violations.iter().any(|v| v.message.contains("aria-valuenow")));
}

/// TS: `[require-aria-prop-issue-3682-009]`
#[test]
fn require_aria_prop_issue_3682_009() {
    const _ID: &str = "require-aria-prop-issue-3682-009";
    let violations = run_rule(
        r#"<div role="separator" contenteditable>x</div>"#,
        serde_json::json!(true),
    );
    assert!(!violations.is_empty(), "violations: {violations:?}");
    assert!(violations[0].message.contains("aria-valuenow"));
}

#[test]
fn v6_require_aria_prop_001() {
    assert_violations(
        &run_rule(r#"<div role="checkbox"></div>"#, serde_json::json!(true)),
        &[(
            Severity::Error,
            1,
            1,
            "Require the \"aria-checked\" ARIA state on the \"checkbox\" role",
            "<div role=\"checkbox\">",
        )],
    );
    assert_violations(
        &run_rule(r#"<div role="heading"></div>"#, serde_json::json!(true)),
        &[(
            Severity::Error,
            1,
            1,
            "Require the \"aria-level\" ARIA property on the \"heading\" role",
            "<div role=\"heading\">",
        )],
    );
    // An element is reported once, for the first missing property, even when more are missing.
    assert_violations(
        &run_rule(r#"<div role="scrollbar"></div>"#, serde_json::json!(true)),
        &[(
            Severity::Error,
            1,
            1,
            "Require the \"aria-valuenow\" ARIA property on the \"scrollbar\" role",
            "<div role=\"scrollbar\">",
        )],
    );
    // The required properties come from the configured ARIA version.
    assert_violations(
        &run_rule(r#"<div role="slider"></div>"#, version("1.1")),
        &[(
            Severity::Error,
            1,
            1,
            "Require the \"aria-valuemax\" ARIA property on the \"slider\" role",
            "<div role=\"slider\">",
        )],
    );
}

#[test]
fn v6_require_aria_prop_002() {
    assert_violations(
        &run_rule(
            r#"<div role="slider" ARIA-VALUENOW="5"></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

#[test]
fn v6_require_aria_prop_003() {
    assert_violations(
        &run_rule(r#"<div role="foo slider"></div>"#, serde_json::json!(true)),
        &[(
            Severity::Error,
            1,
            1,
            "Require the \"aria-valuenow\" ARIA property on the \"slider\" role",
            "<div role=\"foo slider\">",
        )],
    );
    assert_violations(&run_rule(r#"<div role="foo"></div>"#, serde_json::json!(true)), &[]);
    // An explicit role equal to the implicit one is still explicit.
    assert_violations(
        &run_rule(r#"<h1 role="heading">x</h1>"#, serde_json::json!(true)),
        &[(
            Severity::Error,
            1,
            1,
            "Require the \"aria-level\" ARIA property on the \"heading\" role",
            "<h1 role=\"heading\">",
        )],
    );
}

#[test]
fn v6_require_aria_prop_004() {
    assert_violations(
        &run_rule(r#"<x-foo role="slider"></x-foo>"#, serde_json::json!(true)),
        &[],
    );
    // `<input type="checkbox">` has the implicit `checkbox` role and no `role` attribute.
    assert_violations(&run_rule(r#"<input type="checkbox">"#, serde_json::json!(true)), &[]);
}

#[test]
fn v6_require_aria_prop_005() {
    assert_violations(
        &run_rule(r#"<input type="range" role="slider">"#, serde_json::json!(true)),
        &[],
    );
    assert_violations(
        &run_rule(r#"<input type="checkbox" role="switch">"#, serde_json::json!(true)),
        &[(
            Severity::Error,
            1,
            1,
            "Require the \"aria-checked\" ARIA state on the \"switch\" role",
            "<input type=\"checkbox\" role=\"switch\">",
        )],
    );
}

#[test]
fn v6_require_aria_prop_006() {
    assert_violations(
        &run_rule(
            r#"<div role="slider"></div>"#,
            serde_json::json!({ "severity": "warning" }),
        ),
        &[(
            Severity::Warning,
            1,
            1,
            "Require the \"aria-valuenow\" ARIA property on the \"slider\" role",
            "<div role=\"slider\">",
        )],
    );
    assert_violations(&run_rule(r#"<div role="slider"></div>"#, serde_json::json!(false)), &[]);
}
