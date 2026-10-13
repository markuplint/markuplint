//! Tests for `no-aria-on-presentational-children` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-aria-on-presentational-children-valid-001    → no_aria_on_presentational_children_valid_001
//!   no-aria-on-presentational-children-invalid-001  → no_aria_on_presentational_children_invalid_001
//!   no-aria-on-presentational-children-valid-002    → no_aria_on_presentational_children_valid_002
//!   v6_no_aria_on_presentational_children_001  — Rust-only: message, position and scope of the report
//!   v6_no_aria_on_presentational_children_002  — Rust-only: an implicit role counts
//!   v6_no_aria_on_presentational_children_003  — Rust-only: the closest such ancestor is named
//!   v6_no_aria_on_presentational_children_004  — Rust-only: which attributes and elements count
//!   v6_no_aria_on_presentational_children_005  — Rust-only: other roles, role tokens and ARIA version
//!   v6_no_aria_on_presentational_children_006  — Rust-only: severity, multi-line position and `rules: false`

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
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-aria-on-presentational-children": value }
    }))
    .unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// `(severity, line, col, message, raw)`, the fields the TS specs assert.
type Expected<'a> = (Severity, u32, u32, &'a str, &'a str);

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (severity, line, col, message, raw)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, "no-aria-on-presentational-children");
        assert_eq!(violation.severity, *severity);
        assert_eq!(violation.line, *line);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, *message);
        assert_eq!(violation.raw, *raw);
    }
}

const BUTTON_MESSAGE: &str = "It may be ineffective because it has the \"button\" role as an ancestor that doesn't expose its descendants to the accessibility tree";
const IMG_MESSAGE: &str = "It may be ineffective because it has the \"img\" role as an ancestor that doesn't expose its descendants to the accessibility tree";

fn message_for(role: &str) -> String {
    format!(
        "It may be ineffective because it has the \"{role}\" role as an ancestor that doesn't expose its descendants to the accessibility tree"
    )
}

/// TS: `[no-aria-on-presentational-children-valid-001]`
#[test]
fn no_aria_on_presentational_children_valid_001() {
    const _ID: &str = "no-aria-on-presentational-children-valid-001";
    assert_violations(
        &run_rule(
            r#"<div role="group"><span aria-label="text"></span></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-invalid-001]`
#[test]
fn no_aria_on_presentational_children_invalid_001() {
    const _ID: &str = "no-aria-on-presentational-children-invalid-001";
    let violations = run_rule(
        r#"<div role="button"><span aria-label="text"></span></div>"#,
        serde_json::json!(true),
    );
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
    assert_eq!(violations[0].severity, Severity::Warning);
}

/// TS: `[no-aria-on-presentational-children-valid-002]`
#[test]
fn no_aria_on_presentational_children_valid_002() {
    const _ID: &str = "no-aria-on-presentational-children-valid-002";
    assert_violations(
        &run_rule(r#"<div role="img"><span>text</span></div>"#, serde_json::json!(true)),
        &[],
    );
}

#[test]
fn v6_no_aria_on_presentational_children_001() {
    assert_violations(
        &run_rule(
            r#"<div role="button"><span aria-label="text"></span></div>"#,
            serde_json::json!(true),
        ),
        &[(Severity::Warning, 1, 20, BUTTON_MESSAGE, r#"<span aria-label="text">"#)],
    );
    assert_violations(
        &run_rule(
            r#"<div role="button"><span role="img"></span></div>"#,
            serde_json::json!(true),
        ),
        &[(Severity::Warning, 1, 20, BUTTON_MESSAGE, r#"<span role="img">"#)],
    );
    // Every descendant with such an attribute is reported.
    assert_violations(
        &run_rule(
            r#"<div role="button"><span role="img"></span><span aria-label="x" role="none"></span></div>"#,
            serde_json::json!(true),
        ),
        &[
            (Severity::Warning, 1, 20, BUTTON_MESSAGE, r#"<span role="img">"#),
            (
                Severity::Warning,
                1,
                44,
                BUTTON_MESSAGE,
                r#"<span aria-label="x" role="none">"#,
            ),
        ],
    );
}

#[test]
fn v6_no_aria_on_presentational_children_002() {
    assert_violations(
        &run_rule(
            r#"<button><span aria-hidden="true"></span></button>"#,
            serde_json::json!(true),
        ),
        &[(Severity::Warning, 1, 9, BUTTON_MESSAGE, r#"<span aria-hidden="true">"#)],
    );
}

#[test]
fn v6_no_aria_on_presentational_children_003() {
    // Not only the parent: any ancestor.
    assert_violations(
        &run_rule(
            r#"<div role="button"><div><span aria-label="x"></span></div></div>"#,
            serde_json::json!(true),
        ),
        &[(Severity::Warning, 1, 25, BUTTON_MESSAGE, r#"<span aria-label="x">"#)],
    );
    // The closest one is named, and a descendant that is itself such an element is reported too.
    assert_violations(
        &run_rule(
            r#"<div role="img"><div role="button"><span role="none"></span></div></div>"#,
            serde_json::json!(true),
        ),
        &[
            (Severity::Warning, 1, 17, IMG_MESSAGE, r#"<div role="button">"#),
            (Severity::Warning, 1, 36, BUTTON_MESSAGE, r#"<span role="none">"#),
        ],
    );
}

#[test]
fn v6_no_aria_on_presentational_children_004() {
    // The attribute name is matched case-insensitively.
    assert_violations(
        &run_rule(
            r#"<div role="button"><span ARIA-LABEL="x"></span></div>"#,
            serde_json::json!(true),
        ),
        &[(Severity::Warning, 1, 20, BUTTON_MESSAGE, r#"<span ARIA-LABEL="x">"#)],
    );
    // Other attributes do not count.
    assert_violations(
        &run_rule(
            r#"<div role="button"><span data-x="1" class="a"></span></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
    // The element with the role is not its own descendant.
    assert_violations(
        &run_rule(r#"<div role="button" aria-label="x"></div>"#, serde_json::json!(true)),
        &[],
    );
    // An element without a spec is not looked at.
    assert_violations(
        &run_rule(
            r#"<div role="button"><x-foo aria-label="x"></x-foo></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

#[test]
fn v6_no_aria_on_presentational_children_005() {
    for (html, role, col, raw) in [
        (
            r#"<div role="checkbox"><span aria-describedby="d"></span></div>"#,
            "checkbox",
            22,
            r#"<span aria-describedby="d">"#,
        ),
        (
            r#"<div role="separator"><span aria-label="x"></span></div>"#,
            "separator",
            23,
            r#"<span aria-label="x">"#,
        ),
        (
            r#"<div role="tab"><span aria-label="x"></span></div>"#,
            "tab",
            17,
            r#"<span aria-label="x">"#,
        ),
        // The computed role: case-folded, and the first known token.
        (
            r#"<div role="BUTTON"><span aria-label="x"></span></div>"#,
            "button",
            20,
            r#"<span aria-label="x">"#,
        ),
        (
            r#"<div role="hoge button"><span aria-label="x"></span></div>"#,
            "button",
            25,
            r#"<span aria-label="x">"#,
        ),
    ] {
        assert_violations(
            &run_rule(html, serde_json::json!(true)),
            &[(Severity::Warning, 1, col, &message_for(role), raw)],
        );
    }
    assert_violations(
        &run_rule(
            r#"<div role="separator"><span aria-label="x"></span></div>"#,
            serde_json::json!({ "options": { "version": "1.1" } }),
        ),
        &[(
            Severity::Warning,
            1,
            23,
            &message_for("separator"),
            r#"<span aria-label="x">"#,
        )],
    );
}

#[test]
fn v6_no_aria_on_presentational_children_006() {
    assert_violations(
        &run_rule(
            r#"<div role="button"><span aria-label="text"></span></div>"#,
            serde_json::json!({ "severity": "error" }),
        ),
        &[(Severity::Error, 1, 20, BUTTON_MESSAGE, r#"<span aria-label="text">"#)],
    );
    assert_violations(
        &run_rule(
            "<div role=\"button\">\n  <span\n    aria-label=\"x\"></span>\n</div>",
            serde_json::json!(true),
        ),
        &[(Severity::Warning, 2, 3, BUTTON_MESSAGE, "<span\n    aria-label=\"x\">")],
    );
    assert_violations(
        &run_rule(
            r#"<div role="button"><span aria-label="text"></span></div>"#,
            serde_json::json!(false),
        ),
        &[],
    );
}
