//! Tests for `no-default-aria-value` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-default-aria-value-valid-001  → no_default_aria_value_valid_001
//!   no-default-aria-value-valid-002  → no_default_aria_value_valid_002
//!   v6_no_default_aria_value_001  — Rust-only: a default value; default severity is warning
//!   v6_no_default_aria_value_002  — Rust-only: the value is trimmed and lower-cased; positions over lines
//!   v6_no_default_aria_value_003  — Rust-only: property names are matched case-sensitively
//!   v6_no_default_aria_value_004  — Rust-only: a dynamic value is skipped (the HTML parser has none, so the check function is called directly)
//!   v6_no_default_aria_value_005  — Rust-only: `version` option, `severity` override, `rules: false`
//!   v6_no_default_aria_value_006  — Rust-only: `aria-checked="undefined"` on `checkbox` is the default

use super::*;
use crate::aria_check::html_attrs;
use crate::lint::{LintConfig, lint};
use markuplint_dom::html_builder;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::load_spec;

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
    serde_json::from_value(serde_json::json!({ "rules": { "no-default-aria-value": value } })).unwrap()
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

fn violation(severity: Severity, line: u32, col: u32, raw: &str) -> (Severity, u32, u32, String, String) {
    (severity, line, col, "It is default value".to_string(), raw.to_string())
}

/// TS: `[no-default-aria-value-valid-001]`
#[test]
fn no_default_aria_value_valid_001() {
    const _ID: &str = "no-default-aria-value-valid-001";
    assert_eq!(run("<div></div>", serde_json::json!(true)), vec![]);
}

/// TS: `[no-default-aria-value-valid-002]`
#[test]
fn no_default_aria_value_valid_002() {
    const _ID: &str = "no-default-aria-value-valid-002";
    assert_eq!(
        run(
            r#"<div role="button" aria-pressed="true"></div>"#,
            serde_json::json!(true)
        ),
        vec![]
    );
}

#[test]
fn v6_no_default_aria_value_001() {
    assert_eq!(
        run(r#"<div aria-live="off"></div>"#, serde_json::json!(true)),
        vec![violation(Severity::Warning, 1, 6, "aria-live=\"off\"")]
    );
}

#[test]
fn v6_no_default_aria_value_002() {
    assert_eq!(
        run(
            "<div aria-live=\"polite\" aria-modal=\"false\"></div>\n<p aria-busy=\" FALSE \"></p>",
            serde_json::json!(true)
        ),
        vec![
            violation(Severity::Warning, 1, 25, "aria-modal=\"false\""),
            violation(Severity::Warning, 2, 4, "aria-busy=\" FALSE \""),
        ]
    );
}

#[test]
fn v6_no_default_aria_value_003() {
    assert_eq!(run(r#"<div ARIA-LIVE="off"></div>"#, serde_json::json!(true)), vec![]);
}

#[test]
fn v6_no_default_aria_value_004() {
    let arena = html_arena(r#"<div aria-live="off"></div>"#);
    let spec = spec();
    let props = &markuplint_types::spec::aria::get_aria_spec(&spec, ARIAVersion::V1_3).props;
    let (_, el) = arena.elements().next().unwrap();
    let mut attr = html_attrs(el).next().unwrap().clone();

    assert!(is_default_value(&attr, props));
    attr.is_dynamic_value = Some(true);
    assert!(!is_default_value(&attr, props));
}

#[test]
fn v6_no_default_aria_value_005() {
    let html = r#"<div aria-live="off"></div>"#;
    assert_eq!(
        run(html, serde_json::json!({ "options": { "version": "1.1" } })),
        vec![violation(Severity::Warning, 1, 6, "aria-live=\"off\"")]
    );
    assert_eq!(
        run(html, serde_json::json!({ "severity": "error" })),
        vec![violation(Severity::Error, 1, 6, "aria-live=\"off\"")]
    );
    assert_eq!(run(html, serde_json::json!(false)), vec![]);
}

#[test]
fn v6_no_default_aria_value_006() {
    assert_eq!(
        run(
            r#"<div role="checkbox" aria-checked="undefined"></div>"#,
            serde_json::json!(true)
        ),
        vec![violation(Severity::Warning, 1, 22, "aria-checked=\"undefined\"")]
    );
}
