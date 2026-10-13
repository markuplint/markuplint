//! Tests for `no-contradictory-aria-prop` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-contradictory-aria-prop-valid-001    → no_contradictory_aria_prop_valid_001
//!   no-contradictory-aria-prop-valid-002    → no_contradictory_aria_prop_valid_002
//!   no-contradictory-aria-prop-invalid-001  → no_contradictory_aria_prop_invalid_001
//!   v6_no_contradictory_aria_prop_001  — Rust-only: default severity is an error, config can lower or disable it
//!   v6_no_contradictory_aria_prop_002  — Rust-only: the native attribute is present with another value
//!   v6_no_contradictory_aria_prop_003  — Rust-only: the native attribute is absent, "implicit" contradiction
//!   v6_no_contradictory_aria_prop_004  — Rust-only: a Boolean native attribute only contradicts `"false"`
//!   v6_no_contradictory_aria_prop_005  — Rust-only: a native attribute that does not apply to the element is skipped
//!   v6_no_contradictory_aria_prop_006  — Rust-only: several contradictions on one element

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
        serde_json::from_value(serde_json::json!({ "rules": { "no-contradictory-aria-prop": value } })).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// `(severity, line, col, message, raw)`, the fields the TS specs assert.
type Expected<'a> = (Severity, u32, u32, &'a str, &'a str);

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (severity, line, col, message, raw)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, "no-contradictory-aria-prop");
        assert_eq!(violation.severity, *severity);
        assert_eq!(violation.line, *line);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, *message);
        assert_eq!(violation.raw, *raw);
    }
}

/// TS: `[no-contradictory-aria-prop-valid-001]`
#[test]
fn no_contradictory_aria_prop_valid_001() {
    const _ID: &str = "no-contradictory-aria-prop-valid-001";
    let violations = run_rule(
        r#"<div role="button" aria-pressed="true"></div>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[no-contradictory-aria-prop-valid-002]`
#[test]
fn no_contradictory_aria_prop_valid_002() {
    const _ID: &str = "no-contradictory-aria-prop-valid-002";
    let violations = run_rule(
        r#"<input type="checkbox" aria-checked="true" checked />"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[no-contradictory-aria-prop-invalid-001]`
#[test]
fn no_contradictory_aria_prop_invalid_001() {
    const _ID: &str = "no-contradictory-aria-prop-invalid-001";
    let violations = run_rule(
        r#"<input type="checkbox" checked aria-checked="false" />"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            32,
            "The \"aria-checked\" ARIA state contradicts the current \"checked\" attribute",
            "aria-checked=\"false\"",
        )],
    );
}

#[test]
fn v6_no_contradictory_aria_prop_001() {
    let html = r#"<input required aria-required="false">"#;
    let message = "The \"aria-required\" ARIA property contradicts the current \"required\" attribute";

    assert_violations(
        &run_rule(html, serde_json::json!(true)),
        &[(Severity::Error, 1, 17, message, "aria-required=\"false\"")],
    );
    assert_violations(
        &run_rule(html, serde_json::json!("warning")),
        &[(Severity::Warning, 1, 17, message, "aria-required=\"false\"")],
    );
    assert_violations(&run_rule(html, serde_json::json!(false)), &[]);
}

#[test]
fn v6_no_contradictory_aria_prop_002() {
    // A bare `<td>` is dropped by the fragment parser, so it sits in a table.
    let violations = run_rule(
        r#"<table><tr><td colspan="2" aria-colspan="3">x</td></tr></table>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            28,
            "The \"aria-colspan\" ARIA property contradicts the current \"colspan\" attribute",
            "aria-colspan=\"3\"",
        )],
    );

    let violations = run_rule(
        r#"<input type="range" min="1" aria-valuemin="2">"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            29,
            "The \"aria-valuemin\" ARIA property contradicts the current \"min\" attribute",
            "aria-valuemin=\"2\"",
        )],
    );

    let violations = run_rule(
        r#"<input placeholder="a" aria-placeholder="b">"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            24,
            "The \"aria-placeholder\" ARIA property contradicts the current \"placeholder\" attribute",
            "aria-placeholder=\"b\"",
        )],
    );

    let violations = run_rule(
        r#"<button disabled aria-disabled="false"></button>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            18,
            "The \"aria-disabled\" ARIA state contradicts the current \"disabled\" attribute",
            "aria-disabled=\"false\"",
        )],
    );
}

#[test]
fn v6_no_contradictory_aria_prop_003() {
    let violations = run_rule(r#"<input aria-required="true">"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            8,
            "The \"aria-required\" ARIA property contradicts the implicit \"required\" attribute",
            "aria-required=\"true\"",
        )],
    );

    let violations = run_rule(
        r#"<input type="checkbox" aria-checked="true">"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            24,
            "The \"aria-checked\" ARIA state contradicts the implicit \"checked\" attribute",
            "aria-checked=\"true\"",
        )],
    );

    // `false` agrees with an absent Boolean attribute.
    let violations = run_rule(r#"<input aria-required="false">"#, serde_json::json!(true));
    assert_violations(&violations, &[]);

    // A value-matched equivalent has no Boolean implicit value to contradict.
    let violations = run_rule(
        r#"<table><tr><td aria-colspan="3">x</td></tr></table>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
    let violations = run_rule(r#"<input type="range" aria-valuemin="2">"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
}

#[test]
fn v6_no_contradictory_aria_prop_004() {
    // `hidden` is not a strict equivalent of `aria-hidden`, so its absence implies nothing.
    let violations = run_rule(r#"<div aria-hidden="true"></div>"#, serde_json::json!(true));
    assert_violations(&violations, &[]);

    // A present Boolean attribute agrees with every ARIA value but `false`.
    let violations = run_rule(
        r#"<div hidden="until-found" aria-hidden="true"></div>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
    let violations = run_rule(r#"<div hidden aria-hidden="false"></div>"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            13,
            "The \"aria-hidden\" ARIA state contradicts the current \"hidden\" attribute",
            "aria-hidden=\"false\"",
        )],
    );

    let violations = run_rule(r#"<input disabled aria-disabled="false">"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            17,
            "The \"aria-disabled\" ARIA state contradicts the current \"disabled\" attribute",
            "aria-disabled=\"false\"",
        )],
    );
}

#[test]
fn v6_no_contradictory_aria_prop_005() {
    // `checked` has a condition (`type=checkbox` / `radio`), unmet for `type=text`.
    let violations = run_rule(r#"<input type="text" aria-checked="true">"#, serde_json::json!(true));
    assert_violations(&violations, &[]);

    // `required` is not an attribute of `div`.
    let violations = run_rule(r#"<div aria-required="true"></div>"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
}

#[test]
fn v6_no_contradictory_aria_prop_006() {
    let violations = run_rule(
        r#"<input readonly aria-readonly="false" aria-required="true">"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[
            (
                Severity::Error,
                1,
                17,
                "The \"aria-readonly\" ARIA property contradicts the current \"readonly\" attribute",
                "aria-readonly=\"false\"",
            ),
            (
                Severity::Error,
                1,
                39,
                "The \"aria-required\" ARIA property contradicts the implicit \"required\" attribute",
                "aria-required=\"true\"",
            ),
        ],
    );
}
