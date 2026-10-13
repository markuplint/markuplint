//! Tests for `aria-prop-requires-role` rule.
//!
//! Test ID mapping (TS → Rust):
//!   aria-prop-requires-role-valid-001  → aria_prop_requires_role_valid_001
//!   aria-prop-requires-role-valid-002  → aria_prop_requires_role_valid_002
//!   v6_aria_prop_requires_role_001  — Rust-only: a non-global state on an element without a role
//!   v6_aria_prop_requires_role_002  — Rust-only: only non-global properties are reported
//!   v6_aria_prop_requires_role_003  — Rust-only: an element with an implicit role is skipped
//!   v6_aria_prop_requires_role_004  — Rust-only: `form` without an accessible name has no role
//!   v6_aria_prop_requires_role_005  — Rust-only: `version` option
//!   v6_aria_prop_requires_role_006  — Rust-only: names are matched case-sensitively; unknown properties are skipped
//!
//! The TS spec has no invalid case. `<div>` has the implicit role `generic`, so the elements the
//! Rust-only tests use are ones the spec gives no role: `section` and `form` without an accessible
//! name (`region` / `form` need one).
//!
//! Known gap: the roles of `section`, `form`, ... that depend on `:aria(has name)` conditions are
//! resolved by `get_computed_role` without an ARIA resolver, so a named `<section aria-label>` has
//! no computed role in Rust (TS: `region`) and `aria-checked` on it is reported here but not by TS.
//! There is deliberately no test for that case; it is `aria::computed_role`'s to fix.

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
    serde_json::from_value(serde_json::json!({ "rules": { "aria-prop-requires-role": value } })).unwrap()
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

fn violation(line: u32, col: u32, message: &str, raw: &str) -> (Severity, u32, u32, String, String) {
    (Severity::Error, line, col, message.to_string(), raw.to_string())
}

/// TS: `[aria-prop-requires-role-valid-001]`
#[test]
fn aria_prop_requires_role_valid_001() {
    const _ID: &str = "aria-prop-requires-role-valid-001";
    assert_eq!(run(r#"<div aria-label="text"></div>"#, serde_json::json!(true)), vec![]);
}

/// TS: `[aria-prop-requires-role-valid-002]`
#[test]
fn aria_prop_requires_role_valid_002() {
    const _ID: &str = "aria-prop-requires-role-valid-002";
    assert_eq!(
        run(
            r#"<div role="button" aria-pressed="true"></div>"#,
            serde_json::json!(true)
        ),
        vec![]
    );
}

#[test]
fn v6_aria_prop_requires_role_001() {
    assert_eq!(
        run(r#"<section aria-checked="true"></section>"#, serde_json::json!(true)),
        vec![violation(
            1,
            10,
            "The \"aria-checked\" ARIA state is not global state",
            "aria-checked=\"true\""
        )]
    );
}

#[test]
fn v6_aria_prop_requires_role_002() {
    assert_eq!(
        run(
            r#"<section aria-checked="true" aria-live="polite" aria-expanded="true"></section>"#,
            serde_json::json!(true)
        ),
        vec![
            violation(
                1,
                10,
                "The \"aria-checked\" ARIA state is not global state",
                "aria-checked=\"true\""
            ),
            violation(
                1,
                49,
                "The \"aria-expanded\" ARIA state is not global state",
                "aria-expanded=\"true\""
            ),
        ]
    );
}

#[test]
fn v6_aria_prop_requires_role_003() {
    // `div` is `generic`, `role` is explicit.
    assert_eq!(
        run(r#"<div aria-checked="true"></div>"#, serde_json::json!(true)),
        vec![]
    );
    assert_eq!(
        run(
            r#"<div role="button" aria-checked="true"></div>"#,
            serde_json::json!(true)
        ),
        vec![]
    );
}

#[test]
fn v6_aria_prop_requires_role_004() {
    assert_eq!(
        run(r#"<form aria-checked="true"></form>"#, serde_json::json!(true)),
        vec![violation(
            1,
            7,
            "The \"aria-checked\" ARIA state is not global state",
            "aria-checked=\"true\""
        )]
    );
}

#[test]
fn v6_aria_prop_requires_role_005() {
    assert_eq!(
        run(
            r#"<section aria-checked="true"></section>"#,
            serde_json::json!({ "options": { "version": "1.1" } })
        ),
        vec![violation(
            1,
            10,
            "The \"aria-checked\" ARIA state is not global state",
            "aria-checked=\"true\""
        )]
    );
}

#[test]
fn v6_aria_prop_requires_role_006() {
    assert_eq!(
        run(
            r#"<section aria-checked="true" aria-nothing="true" ARIA-EXPANDED="true"></section>"#,
            serde_json::json!(true)
        ),
        vec![violation(
            1,
            10,
            "The \"aria-checked\" ARIA state is not global state",
            "aria-checked=\"true\""
        )]
    );
    assert_eq!(
        run(r#"<section aria-checked="true"></section>"#, serde_json::json!(false)),
        vec![]
    );
}
