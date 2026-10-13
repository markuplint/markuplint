//! Tests for `no-deprecated-aria-prop` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-deprecated-aria-prop-valid-001  → no_deprecated_aria_prop_valid_001
//!   no-deprecated-aria-prop-valid-002  → no_deprecated_aria_prop_valid_002
//!   v6_no_deprecated_aria_prop_001  — Rust-only: a property deprecated on the explicit role; default severity is warning
//!   v6_no_deprecated_aria_prop_002  — Rust-only: a property deprecated on the implicit role (`article`)
//!   v6_no_deprecated_aria_prop_003  — Rust-only: the computed role of `div` is `generic`
//!   v6_no_deprecated_aria_prop_004  — Rust-only: `version` option (1.1 does not deprecate them)
//!   v6_no_deprecated_aria_prop_005  — Rust-only: property names are matched case-sensitively; positions over lines
//!   v6_no_deprecated_aria_prop_006  — Rust-only: `rules: false`, `severity` override

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
    serde_json::from_value(serde_json::json!({ "rules": { "no-deprecated-aria-prop": value } })).unwrap()
}

/// `(severity, line, col, message, raw)` of every violation.
fn run(html: &str, value: serde_json::Value) -> Vec<(Severity, u32, u32, String, String)> {
    let arena = html_arena(html);
    lint(&arena, &spec(), &config(value))
        .violations
        .into_iter()
        .map(|v| (v.severity, v.line, v.col, v.message, v.raw))
        .collect()
}

fn violation(
    severity: Severity,
    line: u32,
    col: u32,
    message: &str,
    raw: &str,
) -> (Severity, u32, u32, String, String) {
    (severity, line, col, message.to_string(), raw.to_string())
}

/// TS: `[no-deprecated-aria-prop-valid-001]`
#[test]
fn no_deprecated_aria_prop_valid_001() {
    const _ID: &str = "no-deprecated-aria-prop-valid-001";
    assert_eq!(
        run(
            r#"<div role="button" aria-pressed="true"></div>"#,
            serde_json::json!(true)
        ),
        vec![]
    );
}

/// TS: `[no-deprecated-aria-prop-valid-002]`
#[test]
fn no_deprecated_aria_prop_valid_002() {
    const _ID: &str = "no-deprecated-aria-prop-valid-002";
    assert_eq!(run("<div></div>", serde_json::json!(true)), vec![]);
}

#[test]
fn v6_no_deprecated_aria_prop_001() {
    assert_eq!(
        run(
            r#"<div role="alert" aria-invalid="true"></div>"#,
            serde_json::json!(true)
        ),
        vec![violation(
            Severity::Warning,
            1,
            19,
            "The \"aria-invalid\" ARIA state is deprecated on the \"alert\" role",
            "aria-invalid=\"true\""
        )]
    );
}

#[test]
fn v6_no_deprecated_aria_prop_002() {
    assert_eq!(
        run(r#"<article aria-disabled="true"></article>"#, serde_json::json!(true)),
        vec![violation(
            Severity::Warning,
            1,
            10,
            "The \"aria-disabled\" ARIA state is deprecated on the \"article\" role",
            "aria-disabled=\"true\""
        )]
    );
}

#[test]
fn v6_no_deprecated_aria_prop_003() {
    assert_eq!(
        run(r#"<div aria-disabled="true"></div>"#, serde_json::json!(true)),
        vec![violation(
            Severity::Warning,
            1,
            6,
            "The \"aria-disabled\" ARIA state is deprecated on the \"generic\" role",
            "aria-disabled=\"true\""
        )]
    );
}

#[test]
fn v6_no_deprecated_aria_prop_004() {
    assert_eq!(
        run(
            r#"<article aria-disabled="true"></article>"#,
            serde_json::json!({ "options": { "version": "1.1" } })
        ),
        vec![]
    );
}

#[test]
fn v6_no_deprecated_aria_prop_005() {
    let html = "<div role=\"alert\" aria-invalid=\"true\" ARIA-HASPOPUP=\"true\"></div>\n<article aria-disabled=\"true\" aria-label=\"x\"></article>";
    assert_eq!(
        run(html, serde_json::json!(true)),
        vec![
            violation(
                Severity::Warning,
                1,
                19,
                "The \"aria-invalid\" ARIA state is deprecated on the \"alert\" role",
                "aria-invalid=\"true\""
            ),
            violation(
                Severity::Warning,
                2,
                10,
                "The \"aria-disabled\" ARIA state is deprecated on the \"article\" role",
                "aria-disabled=\"true\""
            ),
        ]
    );
}

#[test]
fn v6_no_deprecated_aria_prop_006() {
    let html = r#"<article aria-disabled="true"></article>"#;
    assert_eq!(run(html, serde_json::json!(false)), vec![]);
    assert_eq!(
        run(html, serde_json::json!({ "severity": "error" })),
        vec![violation(
            Severity::Error,
            1,
            10,
            "The \"aria-disabled\" ARIA state is deprecated on the \"article\" role",
            "aria-disabled=\"true\""
        )]
    );
}
