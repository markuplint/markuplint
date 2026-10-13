//! Tests for `no-redundant-aria-prop` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-redundant-aria-prop-valid-001    → no_redundant_aria_prop_valid_001
//!   no-redundant-aria-prop-invalid-001  → no_redundant_aria_prop_invalid_001
//!   v6_no_redundant_aria_prop_001  — Rust-only: default severity is a warning, config can raise or disable it
//!   v6_no_redundant_aria_prop_002  — Rust-only: each equivalent attribute (`required`, `colspan`, `hidden`, ...)
//!   v6_no_redundant_aria_prop_003  — Rust-only: values are compared trimmed and lower-cased on the ARIA side
//!   v6_no_redundant_aria_prop_004  — Rust-only: different values and a missing native attribute are not redundant
//!   v6_no_redundant_aria_prop_005  — Rust-only: a native attribute that does not apply to the element is skipped
//!   v6_no_redundant_aria_prop_006  — Rust-only: several redundant attributes on one element

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
        serde_json::from_value(serde_json::json!({ "rules": { "no-redundant-aria-prop": value } })).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// `(severity, line, col, message, raw)`, the fields the TS specs assert.
type Expected<'a> = (Severity, u32, u32, &'a str, &'a str);

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (severity, line, col, message, raw)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, "no-redundant-aria-prop");
        assert_eq!(violation.severity, *severity);
        assert_eq!(violation.line, *line);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, *message);
        assert_eq!(violation.raw, *raw);
    }
}

/// TS: `[no-redundant-aria-prop-valid-001]`
#[test]
fn no_redundant_aria_prop_valid_001() {
    const _ID: &str = "no-redundant-aria-prop-valid-001";
    let violations = run_rule(
        r#"<div role="button" aria-pressed="true"></div>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[no-redundant-aria-prop-invalid-001]`
#[test]
fn no_redundant_aria_prop_invalid_001() {
    const _ID: &str = "no-redundant-aria-prop-invalid-001";
    let violations = run_rule(
        r#"<input type="checkbox" aria-checked="true" checked />"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Warning,
            1,
            24,
            "The \"aria-checked\" ARIA state has the same semantics as the current \"checked\" attribute or the implicit \"checked\" attribute",
            "aria-checked=\"true\"",
        )],
    );
}

#[test]
fn v6_no_redundant_aria_prop_001() {
    let html = r#"<input required aria-required="true">"#;
    let message = "The \"aria-required\" ARIA property has the same semantics as the current \"required\" attribute or the implicit \"required\" attribute";

    // The severity is the rule's default (warning) unless the config names one.
    assert_violations(
        &run_rule(html, serde_json::json!(true)),
        &[(Severity::Warning, 1, 17, message, "aria-required=\"true\"")],
    );
    assert_violations(
        &run_rule(html, serde_json::json!("error")),
        &[(Severity::Error, 1, 17, message, "aria-required=\"true\"")],
    );
    assert_violations(
        &run_rule(html, serde_json::json!({ "severity": "error" })),
        &[(Severity::Error, 1, 17, message, "aria-required=\"true\"")],
    );
    assert_violations(&run_rule(html, serde_json::json!(false)), &[]);
}

#[test]
fn v6_no_redundant_aria_prop_002() {
    // A bare `<td>` is dropped by the fragment parser, so it sits in a table.
    let violations = run_rule(
        r#"<table><tr><td colspan="2" aria-colspan="2">x</td></tr></table>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Warning,
            1,
            28,
            "The \"aria-colspan\" ARIA property has the same semantics as the current \"colspan\" attribute or the implicit \"colspan\" attribute",
            "aria-colspan=\"2\"",
        )],
    );

    let violations = run_rule(r#"<div hidden aria-hidden="true"></div>"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Warning,
            1,
            13,
            "The \"aria-hidden\" ARIA state has the same semantics as the current \"hidden\" attribute or the implicit \"hidden\" attribute",
            "aria-hidden=\"true\"",
        )],
    );

    let violations = run_rule(
        r#"<input type="range" min="1" aria-valuemin="1">"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Warning,
            1,
            29,
            "The \"aria-valuemin\" ARIA property has the same semantics as the current \"min\" attribute or the implicit \"min\" attribute",
            "aria-valuemin=\"1\"",
        )],
    );

    let violations = run_rule(r#"<input readonly aria-readonly="true">"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Warning,
            1,
            17,
            "The \"aria-readonly\" ARIA property has the same semantics as the current \"readonly\" attribute or the implicit \"readonly\" attribute",
            "aria-readonly=\"true\"",
        )],
    );

    let violations = run_rule(
        r#"<input placeholder="a" aria-placeholder="a">"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Warning,
            1,
            24,
            "The \"aria-placeholder\" ARIA property has the same semantics as the current \"placeholder\" attribute or the implicit \"placeholder\" attribute",
            "aria-placeholder=\"a\"",
        )],
    );
}

#[test]
fn v6_no_redundant_aria_prop_003() {
    let message = "The \"aria-disabled\" ARIA state has the same semantics as the current \"disabled\" attribute or the implicit \"disabled\" attribute";

    let violations = run_rule(r#"<input disabled aria-disabled="TRUE">"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(Severity::Warning, 1, 17, message, "aria-disabled=\"TRUE\"")],
    );

    let violations = run_rule(r#"<input disabled aria-disabled=" true ">"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(Severity::Warning, 1, 17, message, "aria-disabled=\" true \"")],
    );
}

#[test]
fn v6_no_redundant_aria_prop_004() {
    // `required` is present with a different ARIA value.
    let violations = run_rule(r#"<input required aria-required="false">"#, serde_json::json!(true));
    assert_violations(&violations, &[]);

    // No native attribute at all: that is for `no-contradictory-aria-prop`.
    let violations = run_rule(r#"<input aria-required="true">"#, serde_json::json!(true));
    assert_violations(&violations, &[]);

    // A value-matched equivalent (`colspan`, `placeholder`) compares the two values.
    let violations = run_rule(
        r#"<table><tr><td colspan="2" aria-colspan="3">x</td></tr></table>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
    let violations = run_rule(
        r#"<input placeholder="a" aria-placeholder="b">"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

#[test]
fn v6_no_redundant_aria_prop_005() {
    // `checked` has a condition (`type=checkbox` / `radio`), unmet for `type=text`.
    let violations = run_rule(
        r#"<input type="text" checked aria-checked="true">"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);

    // `required` is not an attribute of `div`.
    let violations = run_rule(r#"<div aria-required="true" required></div>"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
}

#[test]
fn v6_no_redundant_aria_prop_006() {
    let violations = run_rule(
        r#"<input type="checkbox" checked aria-checked="true" aria-disabled="true" disabled>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[
            (
                Severity::Warning,
                1,
                32,
                "The \"aria-checked\" ARIA state has the same semantics as the current \"checked\" attribute or the implicit \"checked\" attribute",
                "aria-checked=\"true\"",
            ),
            (
                Severity::Warning,
                1,
                52,
                "The \"aria-disabled\" ARIA state has the same semantics as the current \"disabled\" attribute or the implicit \"disabled\" attribute",
                "aria-disabled=\"true\"",
            ),
        ],
    );
}
