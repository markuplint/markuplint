//! Tests for `no-prohibited-naming` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-prohibited-naming-valid-001          → no_prohibited_naming_valid_001
//!   no-prohibited-naming-issue-3630-001     → no_prohibited_naming_issue_3630_001
//!   no-prohibited-naming-issue-3630-002     → no_prohibited_naming_issue_3630_002
//!   no-prohibited-naming-issue-3630-003     → no_prohibited_naming_issue_3630_003
//!   no-prohibited-naming-issue-3630-004     → no_prohibited_naming_issue_3630_004
//!   no-prohibited-naming-issue-3630-005     → no_prohibited_naming_issue_3630_005
//!   no-prohibited-naming-issue-3630-006     → no_prohibited_naming_issue_3630_006
//!   no-prohibited-naming-issue-3630-007     → no_prohibited_naming_issue_3630_007
//!   no-prohibited-naming-issue-3630-008     → no_prohibited_naming_issue_3630_008
//!   no-prohibited-naming-issue-3630-009     → no_prohibited_naming_issue_3630_009
//!   no-prohibited-naming-issue-3630-010     → no_prohibited_naming_issue_3630_010
//!   no-prohibited-naming-issue-3630-011     → no_prohibited_naming_issue_3630_011
//!   no-prohibited-naming-issue-3630-012     → no_prohibited_naming_issue_3630_012
//!   no-prohibited-naming-issue-3630-013     → no_prohibited_naming_issue_3630_013
//!   no-prohibited-naming-issue-3630-014     → no_prohibited_naming_issue_3630_014
//!   no-prohibited-naming-issue-3630-015     → no_prohibited_naming_issue_3630_015
//!   v6_no_prohibited_naming_001  — Rust-only: every naming attribute on one element is reported
//!   v6_no_prohibited_naming_002  — Rust-only: the element name is reported in lower case
//!   v6_no_prohibited_naming_003  — Rust-only: a naming attribute written in upper case is not checked
//!   v6_no_prohibited_naming_004  — Rust-only: a blank `role` does not lift the prohibition
//!   v6_no_prohibited_naming_005  — Rust-only: a computed role lifts it, and elements without a naming prohibition
//!   v6_no_prohibited_naming_006  — Rust-only: severity and `rules: false`
//!
//! `no-prohibited-naming-issue-3630-015` names `aria-prop-requires-role` in its config too; that
//! rule is ported separately, so here the config enables it and it is simply not registered yet.
//! The assertion (no violation at all) is the TS one.

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

fn run(html: &str, config: serde_json::Value) -> Vec<Violation> {
    let config: LintConfig = serde_json::from_value(serde_json::json!({ "rules": config })).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

fn run_rule(html: &str, value: serde_json::Value) -> Vec<Violation> {
    run(html, serde_json::json!({ "no-prohibited-naming": value }))
}

/// `(severity, line, col, message, raw)`, the fields the TS specs assert.
type Expected<'a> = (Severity, u32, u32, &'a str, &'a str);

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (severity, line, col, message, raw)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, "no-prohibited-naming");
        assert_eq!(violation.severity, *severity);
        assert_eq!(violation.line, *line);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, *message);
        assert_eq!(violation.raw, *raw);
    }
}

/// TS: `[no-prohibited-naming-valid-001]`
#[test]
fn no_prohibited_naming_valid_001() {
    const _ID: &str = "no-prohibited-naming-valid-001";
    let violations = run_rule(r#"<div aria-label="x">y</div>"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
}

/// TS: `[no-prohibited-naming-issue-3630-001]`
#[test]
fn no_prohibited_naming_issue_3630_001() {
    const _ID: &str = "no-prohibited-naming-issue-3630-001";
    let violations = run_rule(r#"<cite aria-label="x">y</cite>"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            7,
            "The \"aria-label\" ARIA property is prohibited on the \"cite\" element",
            "aria-label=\"x\"",
        )],
    );
}

/// TS: `[no-prohibited-naming-issue-3630-002]`
#[test]
fn no_prohibited_naming_issue_3630_002() {
    const _ID: &str = "no-prohibited-naming-issue-3630-002";
    let violations = run_rule(r#"<abbr aria-labelledby="x">y</abbr>"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            7,
            "The \"aria-labelledby\" ARIA property is prohibited on the \"abbr\" element",
            "aria-labelledby=\"x\"",
        )],
    );
}

/// TS: `[no-prohibited-naming-issue-3630-003]`
#[test]
fn no_prohibited_naming_issue_3630_003() {
    const _ID: &str = "no-prohibited-naming-issue-3630-003";
    let violations = run_rule(
        r#"<figcaption aria-braillelabel="x">y</figcaption>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            13,
            "The \"aria-braillelabel\" ARIA property is prohibited on the \"figcaption\" element",
            "aria-braillelabel=\"x\"",
        )],
    );
}

/// TS: `[no-prohibited-naming-issue-3630-004]`
#[test]
fn no_prohibited_naming_issue_3630_004() {
    const _ID: &str = "no-prohibited-naming-issue-3630-004";
    let violations = run_rule(
        r#"<cite role="button" aria-label="x">y</cite>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[no-prohibited-naming-issue-3630-005]`
#[test]
fn no_prohibited_naming_issue_3630_005() {
    const _ID: &str = "no-prohibited-naming-issue-3630-005";
    let violations = run_rule(r#"<cite aria-hidden="true">y</cite>"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
}

/// TS: `[no-prohibited-naming-issue-3630-006]`
#[test]
fn no_prohibited_naming_issue_3630_006() {
    const _ID: &str = "no-prohibited-naming-issue-3630-006";
    // The TS test loops over the nine elements; each `col` is `name.length + 3`.
    let cases: [(&str, u32); 9] = [
        ("abbr", 7),
        ("cite", 7),
        ("figcaption", 13),
        ("kbd", 6),
        ("label", 8),
        ("legend", 9),
        ("mark", 7),
        ("rt", 5),
        ("var", 6),
    ];
    for (el, col) in cases {
        let violations = run_rule(&format!(r#"<{el} aria-label="x">y</{el}>"#), serde_json::json!(true));
        let message = format!("The \"aria-label\" ARIA property is prohibited on the \"{el}\" element");
        assert_violations(
            &violations,
            &[(Severity::Error, 1, col, message.as_str(), "aria-label=\"x\"")],
        );
    }
}

/// TS: `[no-prohibited-naming-issue-3630-007]`
#[test]
fn no_prohibited_naming_issue_3630_007() {
    const _ID: &str = "no-prohibited-naming-issue-3630-007";
    let violations = run_rule(r#"<label aria-label="x">text</label>"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            8,
            "The \"aria-label\" ARIA property is prohibited on the \"label\" element",
            "aria-label=\"x\"",
        )],
    );
}

/// TS: `[no-prohibited-naming-issue-3630-008]`
#[test]
fn no_prohibited_naming_issue_3630_008() {
    const _ID: &str = "no-prohibited-naming-issue-3630-008";
    let violations = run_rule(
        r#"<cite role="invalid-role" aria-label="x">y</cite>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            27,
            "The \"aria-label\" ARIA property is prohibited on the \"cite\" element",
            "aria-label=\"x\"",
        )],
    );
}

/// TS: `[no-prohibited-naming-issue-3630-009]`
#[test]
fn no_prohibited_naming_issue_3630_009() {
    const _ID: &str = "no-prohibited-naming-issue-3630-009";
    let violations = run_rule(r#"<cite role="" aria-label="x">y</cite>"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            15,
            "The \"aria-label\" ARIA property is prohibited on the \"cite\" element",
            "aria-label=\"x\"",
        )],
    );
}

/// TS: `[no-prohibited-naming-issue-3630-010]`
#[test]
fn no_prohibited_naming_issue_3630_010() {
    const _ID: &str = "no-prohibited-naming-issue-3630-010";
    let violations = run_rule(r#"<my-widget aria-label="x">y</my-widget>"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            12,
            "The \"aria-label\" ARIA property is prohibited on the \"my-widget\" element",
            "aria-label=\"x\"",
        )],
    );
}

/// TS: `[no-prohibited-naming-issue-3630-011]`
#[test]
fn no_prohibited_naming_issue_3630_011() {
    const _ID: &str = "no-prohibited-naming-issue-3630-011";
    let violations = run_rule(
        r#"<my-widget role="button" aria-label="x">y</my-widget>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[no-prohibited-naming-issue-3630-012]`
#[test]
fn no_prohibited_naming_issue_3630_012() {
    const _ID: &str = "no-prohibited-naming-issue-3630-012";
    let violations = run_rule(
        r#"<my-widget aria-hidden="true">y</my-widget>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[no-prohibited-naming-issue-3630-013]`
#[test]
fn no_prohibited_naming_issue_3630_013() {
    const _ID: &str = "no-prohibited-naming-issue-3630-013";
    let violations = run_rule(
        r#"<my-widget role="presentation" aria-label="x">y</my-widget>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[no-prohibited-naming-issue-3630-014]`
#[test]
fn no_prohibited_naming_issue_3630_014() {
    const _ID: &str = "no-prohibited-naming-issue-3630-014";
    let violations = run_rule(r#"<button is="x-y" aria-label="x">y</button>"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
}

/// TS: `[no-prohibited-naming-issue-3630-015]`
#[test]
fn no_prohibited_naming_issue_3630_015() {
    const _ID: &str = "no-prohibited-naming-issue-3630-015";
    let violations = run(
        r#"<my-widget aria-controls="x">y</my-widget>"#,
        serde_json::json!({
            "no-prohibited-naming": true,
            "aria-prop-requires-role": true,
        }),
    );
    assert_violations(&violations, &[]);
}

#[test]
fn v6_no_prohibited_naming_001() {
    let violations = run_rule(
        r#"<cite aria-label="a" aria-labelledby="b">y</cite>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[
            (
                Severity::Error,
                1,
                7,
                "The \"aria-label\" ARIA property is prohibited on the \"cite\" element",
                "aria-label=\"a\"",
            ),
            (
                Severity::Error,
                1,
                22,
                "The \"aria-labelledby\" ARIA property is prohibited on the \"cite\" element",
                "aria-labelledby=\"b\"",
            ),
        ],
    );

    let violations = run_rule(
        r#"<my-widget aria-labelledby="x" aria-braillelabel="y">z</my-widget>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[
            (
                Severity::Error,
                1,
                12,
                "The \"aria-labelledby\" ARIA property is prohibited on the \"my-widget\" element",
                "aria-labelledby=\"x\"",
            ),
            (
                Severity::Error,
                1,
                32,
                "The \"aria-braillelabel\" ARIA property is prohibited on the \"my-widget\" element",
                "aria-braillelabel=\"y\"",
            ),
        ],
    );
}

#[test]
fn v6_no_prohibited_naming_002() {
    let violations = run_rule(r#"<CITE aria-label="x">y</CITE>"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            7,
            "The \"aria-label\" ARIA property is prohibited on the \"cite\" element",
            "aria-label=\"x\"",
        )],
    );
}

#[test]
fn v6_no_prohibited_naming_003() {
    // `NAMING_ATTRS` is matched on the name as written, so `ARIA-LABEL` is not a naming attribute.
    let violations = run_rule(r#"<cite ARIA-LABEL="x">y</cite>"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
}

#[test]
fn v6_no_prohibited_naming_004() {
    // Only an autonomous custom element reads the raw `role` attribute; a blank value is no role.
    let violations = run_rule(
        r#"<my-widget role="  " aria-label="x">y</my-widget>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            22,
            "The \"aria-label\" ARIA property is prohibited on the \"my-widget\" element",
            "aria-label=\"x\"",
        )],
    );

    // A customised built-in element is judged by its host element's spec, not as a custom element.
    let violations = run_rule(
        r#"<button is="x-y" role="" aria-label="x">y</button>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

#[test]
fn v6_no_prohibited_naming_005() {
    // A valid explicit role is the computed role, which lifts the prohibition.
    let violations = run_rule(
        r#"<cite role="heading" aria-label="x">y</cite>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);

    // Elements whose spec does not prohibit naming are not reported.
    let violations = run_rule(r#"<span aria-label="x"></span>"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
    let violations = run_rule(r#"<kbd aria-label="x"></kbd>"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            6,
            "The \"aria-label\" ARIA property is prohibited on the \"kbd\" element",
            "aria-label=\"x\"",
        )],
    );
}

#[test]
fn v6_no_prohibited_naming_006() {
    let violations = run_rule(r#"<abbr aria-label="x">y</abbr>"#, serde_json::json!("warning"));
    assert_violations(
        &violations,
        &[(
            Severity::Warning,
            1,
            7,
            "The \"aria-label\" ARIA property is prohibited on the \"abbr\" element",
            "aria-label=\"x\"",
        )],
    );

    let violations = run_rule(r#"<abbr aria-label="x">y</abbr>"#, serde_json::json!(false));
    assert_violations(&violations, &[]);
}
