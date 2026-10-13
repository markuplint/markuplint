//! Tests for `element-supports-aria-prop` rule.
//!
//! Test ID mapping (TS → Rust):
//!   element-supports-aria-prop-valid-001          → element_supports_aria_prop_valid_001
//!   element-supports-aria-prop-valid-002          → element_supports_aria_prop_valid_002
//!   element-supports-aria-prop-valid-003          → element_supports_aria_prop_valid_003
//!   element-supports-aria-prop-valid-004          → element_supports_aria_prop_valid_004
//!   element-supports-aria-prop-valid-005          → element_supports_aria_prop_valid_005
//!   element-supports-aria-prop-valid-006          → element_supports_aria_prop_valid_006
//!   element-supports-aria-prop-invalid-001        → element_supports_aria_prop_invalid_001
//!   element-supports-aria-prop-invalid-002        → element_supports_aria_prop_invalid_002
//!   element-supports-aria-prop-issue-3630-001     → element_supports_aria_prop_issue_3630_001
//!   element-supports-aria-prop-issue-3630-002     → element_supports_aria_prop_issue_3630_002
//!   element-supports-aria-prop-issue-3630-003     → element_supports_aria_prop_issue_3630_003
//!   element-supports-aria-prop-issue-3630-005     → element_supports_aria_prop_issue_3630_005
//!   element-supports-aria-prop-issue-3735-001     → element_supports_aria_prop_issue_3735_001
//!   element-supports-aria-prop-issue-3735-002     → element_supports_aria_prop_issue_3735_002
//!   element-supports-aria-prop-issue-3735-003     → element_supports_aria_prop_issue_3735_003
//!   element-supports-aria-prop-issue-3735-004     → element_supports_aria_prop_issue_3735_004
//!   element-supports-aria-prop-issue-3735-005     → element_supports_aria_prop_issue_3735_005
//!   element-supports-aria-prop-issue-3830-001     → element_supports_aria_prop_issue_3830_001
//!   element-supports-aria-prop-issue-3830-002     → element_supports_aria_prop_issue_3830_002
//!   v6_element_supports_aria_prop_001  — Rust-only: every restricted attribute on an element is reported
//!   v6_element_supports_aria_prop_002  — Rust-only: `without` messages (not-recommended, should-not, must-not)
//!   v6_element_supports_aria_prop_003  — Rust-only: native attribute present or absent changes the hint
//!   v6_element_supports_aria_prop_004  — Rust-only: `properties: false` stops at an explicit role
//!   v6_element_supports_aria_prop_005  — Rust-only: the element name is reported in lower case
//!   v6_element_supports_aria_prop_006  — Rust-only: an attribute name written in upper case is not in the whitelist
//!   v6_element_supports_aria_prop_007  — Rust-only: an element without a spec is skipped
//!   v6_element_supports_aria_prop_008  — Rust-only: severity and `rules: false`
//!
//! TS test numbers are as in the TS spec file: there is no `issue-3630-004`.

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
        serde_json::from_value(serde_json::json!({ "rules": { "element-supports-aria-prop": value } })).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// `(severity, line, col, message, raw)`, the fields the TS specs assert.
type Expected<'a> = (Severity, u32, u32, &'a str, &'a str);

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (severity, line, col, message, raw)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, "element-supports-aria-prop");
        assert_eq!(violation.severity, *severity);
        assert_eq!(violation.line, *line);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, *message);
        assert_eq!(violation.raw, *raw);
    }
}

/// TS: `[element-supports-aria-prop-valid-001]`
#[test]
fn element_supports_aria_prop_valid_001() {
    const _ID: &str = "element-supports-aria-prop-valid-001";
    let violations = run_rule(r#"<div aria-pressed="true">y</div>"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
}

/// TS: `[element-supports-aria-prop-issue-3630-005]`
#[test]
fn element_supports_aria_prop_issue_3630_005() {
    const _ID: &str = "element-supports-aria-prop-issue-3630-005";
    let violations = run_rule(r#"<img src="x.png" aria-relevant="all">"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            18,
            "The \"aria-relevant\" ARIA property is disallowed on the \"img\" element",
            "aria-relevant=\"all\"",
        )],
    );
}

/// TS: `[element-supports-aria-prop-issue-3630-001]`
#[test]
fn element_supports_aria_prop_issue_3630_001() {
    const _ID: &str = "element-supports-aria-prop-issue-3630-001";
    let violations = run_rule(r#"<br aria-atomic="true">"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            5,
            "The \"aria-atomic\" ARIA property is disallowed on the \"br\" element",
            "aria-atomic=\"true\"",
        )],
    );
}

/// TS: `[element-supports-aria-prop-issue-3630-002]`
#[test]
fn element_supports_aria_prop_issue_3630_002() {
    const _ID: &str = "element-supports-aria-prop-issue-3630-002";
    let violations = run_rule(r#"<br aria-hidden="true">"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
}

/// TS: `[element-supports-aria-prop-issue-3630-003]`
#[test]
fn element_supports_aria_prop_issue_3630_003() {
    const _ID: &str = "element-supports-aria-prop-issue-3630-003";
    let violations = run_rule(r#"<wbr aria-atomic="true">"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            6,
            "The \"aria-atomic\" ARIA property is disallowed on the \"wbr\" element",
            "aria-atomic=\"true\"",
        )],
    );
}

/// TS: `[element-supports-aria-prop-issue-3735-001]`
#[test]
fn element_supports_aria_prop_issue_3735_001() {
    const _ID: &str = "element-supports-aria-prop-issue-3735-001";
    let violations = run_rule(
        r#"<button popovertarget="p" aria-expanded="false">x</button>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            27,
            "The \"aria-expanded\" ARIA state must not use on the \"button\" element. As its state is already provided by the \"popovertarget\" attribute",
            "aria-expanded=\"false\"",
        )],
    );
}

/// TS: `[element-supports-aria-prop-issue-3735-002]`
#[test]
fn element_supports_aria_prop_issue_3735_002() {
    const _ID: &str = "element-supports-aria-prop-issue-3735-002";
    let violations = run_rule(r#"<button aria-expanded="false">x</button>"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
}

/// TS: `[element-supports-aria-prop-issue-3830-001]`
#[test]
fn element_supports_aria_prop_issue_3830_001() {
    const _ID: &str = "element-supports-aria-prop-issue-3830-001";
    let violations = run_rule(
        r#"<button command="toggle-popover" commandfor="p" aria-expanded="false">x</button>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            49,
            "The \"aria-expanded\" ARIA state must not use on the \"button\" element. As its state is already provided by the \"commandfor\" attribute",
            "aria-expanded=\"false\"",
        )],
    );
}

/// TS: `[element-supports-aria-prop-issue-3830-002]`
#[test]
fn element_supports_aria_prop_issue_3830_002() {
    const _ID: &str = "element-supports-aria-prop-issue-3830-002";
    let violations = run_rule(
        r#"<button command="toggle-popover" aria-expanded="false">x</button>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[element-supports-aria-prop-issue-3735-003]`
#[test]
fn element_supports_aria_prop_issue_3735_003() {
    const _ID: &str = "element-supports-aria-prop-issue-3735-003";
    let violations = run_rule(r#"<input type="hidden" aria-hidden="true">"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            22,
            "The \"aria-hidden\" ARIA state is disallowed on the \"input\" element",
            "aria-hidden=\"true\"",
        )],
    );
}

/// TS: `[element-supports-aria-prop-issue-3735-004]`
#[test]
fn element_supports_aria_prop_issue_3735_004() {
    const _ID: &str = "element-supports-aria-prop-issue-3735-004";
    let violations = run_rule(r#"<input type="hidden" aria-label="x">"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            22,
            "The \"aria-label\" ARIA property is disallowed on the \"input\" element",
            "aria-label=\"x\"",
        )],
    );
}

/// TS: `[element-supports-aria-prop-issue-3735-005]`
#[test]
fn element_supports_aria_prop_issue_3735_005() {
    const _ID: &str = "element-supports-aria-prop-issue-3735-005";
    let violations = run_rule(r#"<input type="text" aria-hidden="true">"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
}

/// TS: `[element-supports-aria-prop-invalid-001]`
#[test]
fn element_supports_aria_prop_invalid_001() {
    const _ID: &str = "element-supports-aria-prop-invalid-001";
    let violations = run_rule(
        r#"<details><summary aria-expanded="false">s</summary></details>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            19,
            "The \"aria-expanded\" ARIA state must not use on the \"summary\" element",
            "aria-expanded=\"false\"",
        )],
    );
}

/// TS: `[element-supports-aria-prop-invalid-002]`
#[test]
fn element_supports_aria_prop_invalid_002() {
    const _ID: &str = "element-supports-aria-prop-invalid-002";
    let violations = run_rule(
        r#"<details><summary aria-pressed="true">s</summary></details>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            19,
            "The \"aria-pressed\" ARIA state must not use on the \"summary\" element",
            "aria-pressed=\"true\"",
        )],
    );
}

/// TS: `[element-supports-aria-prop-valid-002]`
#[test]
fn element_supports_aria_prop_valid_002() {
    const _ID: &str = "element-supports-aria-prop-valid-002";
    let violations = run_rule(
        r#"<details><summary aria-disabled="true">s</summary></details>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[element-supports-aria-prop-valid-003]`
#[test]
fn element_supports_aria_prop_valid_003() {
    const _ID: &str = "element-supports-aria-prop-valid-003";
    let violations = run_rule(
        r#"<details><summary aria-haspopup="true">s</summary></details>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[element-supports-aria-prop-valid-004]`
#[test]
fn element_supports_aria_prop_valid_004() {
    const _ID: &str = "element-supports-aria-prop-valid-004";
    let violations = run_rule(r#"<summary aria-expanded="false">s</summary>"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
}

/// TS: `[element-supports-aria-prop-valid-005]`
#[test]
fn element_supports_aria_prop_valid_005() {
    const _ID: &str = "element-supports-aria-prop-valid-005";
    let violations = run_rule(r#"<summary aria-pressed="true">s</summary>"#, serde_json::json!(true));
    assert_violations(&violations, &[]);
}

/// TS: `[element-supports-aria-prop-valid-006]`
#[test]
fn element_supports_aria_prop_valid_006() {
    const _ID: &str = "element-supports-aria-prop-valid-006";
    let violations = run_rule(
        r#"<details><summary>first</summary><summary aria-expanded="false">s</summary></details>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

#[test]
fn v6_element_supports_aria_prop_001() {
    let violations = run_rule(
        r#"<input type="hidden" aria-hidden="true" aria-label="x">"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[
            (
                Severity::Error,
                1,
                22,
                "The \"aria-hidden\" ARIA state is disallowed on the \"input\" element",
                "aria-hidden=\"true\"",
            ),
            (
                Severity::Error,
                1,
                41,
                "The \"aria-label\" ARIA property is disallowed on the \"input\" element",
                "aria-label=\"x\"",
            ),
        ],
    );

    // `aria-hidden` is on the whitelist; the other two are not.
    let violations = run_rule(
        r#"<br aria-hidden="true" aria-atomic="true" aria-live="polite">"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[
            (
                Severity::Error,
                1,
                24,
                "The \"aria-atomic\" ARIA property is disallowed on the \"br\" element",
                "aria-atomic=\"true\"",
            ),
            (
                Severity::Error,
                1,
                43,
                "The \"aria-live\" ARIA property is disallowed on the \"br\" element",
                "aria-live=\"polite\"",
            ),
        ],
    );

    // A name the ARIA spec does not know is typed "property".
    let violations = run_rule(r#"<input type="hidden" aria-bogus="x">"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            22,
            "The \"aria-bogus\" ARIA property is disallowed on the \"input\" element",
            "aria-bogus=\"x\"",
        )],
    );
}

#[test]
fn v6_element_supports_aria_prop_002() {
    // not-recommended, with `remove-attr`.
    let violations = run_rule(r#"<a href="/" aria-disabled="true">x</a>"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            13,
            "The \"aria-disabled\" ARIA state is not recommended to use on the \"a\" element. Remove the \"href\" attribute if you use the ARIA state",
            "aria-disabled=\"true\"",
        )],
    );

    // must-not, with no alternative.
    let violations = run_rule(r#"<body aria-hidden="true"></body>"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            7,
            "The \"aria-hidden\" ARIA state must not use on the \"body\" element",
            "aria-hidden=\"true\"",
        )],
    );

    // should-not, with `set-attr`.
    let violations = run_rule(r#"<input type="number" aria-valuemax="3">"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            22,
            "The \"aria-valuemax\" ARIA property should not use on the \"input\" element. Add the \"max\" attribute if you use the ARIA property",
            "aria-valuemax=\"3\"",
        )],
    );
}

#[test]
fn v6_element_supports_aria_prop_003() {
    // The native attribute is already set: the message says so instead of asking to add it.
    let violations = run_rule(
        r#"<input type="number" max="3" aria-valuemax="3">"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            30,
            "The \"aria-valuemax\" ARIA property should not use on the \"input\" element. As its state is already provided by the \"max\" attribute",
            "aria-valuemax=\"3\"",
        )],
    );

    let violations = run_rule(
        r#"<select aria-multiselectable="true"></select>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            9,
            "The \"aria-multiselectable\" ARIA property should not use on the \"select\" element. Add the \"multiple\" attribute if you use the ARIA property",
            "aria-multiselectable=\"true\"",
        )],
    );

    let violations = run_rule(
        r#"<select multiple aria-multiselectable="true"></select>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            18,
            "The \"aria-multiselectable\" ARIA property should not use on the \"select\" element. As its state is already provided by the \"multiple\" attribute",
            "aria-multiselectable=\"true\"",
        )],
    );
}

#[test]
fn v6_element_supports_aria_prop_004() {
    // `properties: false` applies only while the computed role is null: with `role="button"` the
    // element has a role, so only `permitted-roles` has something to say.
    let violations = run_rule(
        r#"<input type="hidden" role="button" aria-label="x">"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            36,
            "The \"aria-label\" ARIA property is disallowed on the \"input\" element",
            "aria-label=\"x\"",
        )],
    );
}

#[test]
fn v6_element_supports_aria_prop_005() {
    let violations = run_rule(r#"<BR aria-atomic="true">"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            5,
            "The \"aria-atomic\" ARIA property is disallowed on the \"br\" element",
            "aria-atomic=\"true\"",
        )],
    );
}

#[test]
fn v6_element_supports_aria_prop_006() {
    // The whitelist is matched on the name as written, so even `ARIA-HIDDEN` is outside it.
    let violations = run_rule(r#"<br ARIA-ATOMIC="true">"#, serde_json::json!(true));
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            5,
            "The \"ARIA-ATOMIC\" ARIA property is disallowed on the \"br\" element",
            "ARIA-ATOMIC=\"true\"",
        )],
    );
}

#[test]
fn v6_element_supports_aria_prop_007() {
    let violations = run_rule(r#"<my-widget aria-atomic="true"></my-widget>"#, serde_json::json!(true));
    assert_violations(&violations, &[]);

    let violations = run_rule(
        r#"<div role="button" aria-pressed="true"></div>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

#[test]
fn v6_element_supports_aria_prop_008() {
    let violations = run_rule(r#"<br aria-atomic="true">"#, serde_json::json!("warning"));
    assert_violations(
        &violations,
        &[(
            Severity::Warning,
            1,
            5,
            "The \"aria-atomic\" ARIA property is disallowed on the \"br\" element",
            "aria-atomic=\"true\"",
        )],
    );

    let violations = run_rule(r#"<br aria-atomic="true">"#, serde_json::json!(false));
    assert_violations(&violations, &[]);
}
