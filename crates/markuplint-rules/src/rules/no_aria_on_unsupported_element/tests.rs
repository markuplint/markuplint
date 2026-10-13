//! Tests for `no-aria-on-unsupported-element` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-aria-on-unsupported-element-valid-001  → no_aria_on_unsupported_element_valid_001
//!   no-aria-on-unsupported-element-valid-002  → no_aria_on_unsupported_element_valid_002
//!   no-aria-on-unsupported-element-valid-003  → no_aria_on_unsupported_element_valid_003
//!   v6_no_aria_on_unsupported_element_001  — Rust-only: `role` and `aria-*` on an element flagged unsupported
//!   v6_no_aria_on_unsupported_element_002  — Rust-only: only the flagged element is reported
//!   v6_no_aria_on_unsupported_element_003  — Rust-only: an element without a spec is skipped
//!   v6_no_aria_on_unsupported_element_004  — Rust-only: severity and `rules: false`
//!
//! No element in the shipped html-spec has `#ARIAAttrs: false`, so the TS spec has no invalid
//! case. The Rust-only tests flip the flag on one element of an in-memory copy of the spec.

use crate::lint::{LintConfig, lint};
use crate::violation::Severity;
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

/// The shipped spec with `#ARIAAttrs: false` on `div`.
fn spec_with_aria_unsupported_div() -> MLMLSpec {
    let mut spec = spec();
    let div = spec.specs.iter_mut().find(|s| s.name == "div").unwrap();
    div.global_attrs
        .insert("#ARIAAttrs".to_string(), serde_json::Value::Bool(false));
    spec
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
    serde_json::from_value(serde_json::json!({ "rules": { "no-aria-on-unsupported-element": value } })).unwrap()
}

/// TS: `[no-aria-on-unsupported-element-valid-001]`
#[test]
fn no_aria_on_unsupported_element_valid_001() {
    const _ID: &str = "no-aria-on-unsupported-element-valid-001";
    let arena = html_arena(r#"<div role="button" aria-pressed="false"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert!(result.violations.is_empty());
}

/// TS: `[no-aria-on-unsupported-element-valid-002]`
#[test]
fn no_aria_on_unsupported_element_valid_002() {
    const _ID: &str = "no-aria-on-unsupported-element-valid-002";
    let arena = html_arena(r#"<svg role="img" aria-label="A chart"></svg>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert!(result.violations.is_empty());
}

/// TS: `[no-aria-on-unsupported-element-valid-003]`
#[test]
fn no_aria_on_unsupported_element_valid_003() {
    const _ID: &str = "no-aria-on-unsupported-element-valid-003";
    let arena = html_arena("<div></div>");
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert!(result.violations.is_empty());
}

#[test]
fn v6_no_aria_on_unsupported_element_001() {
    let arena = html_arena(r#"<div role="button" aria-pressed="false"></div>"#);
    let result = lint(
        &arena,
        &spec_with_aria_unsupported_div(),
        &config(serde_json::json!(true)),
    );

    assert_eq!(result.violations.len(), 2);

    assert_eq!(result.violations[0].rule_id, "no-aria-on-unsupported-element");
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 6);
    assert_eq!(result.violations[0].message, "The \"role\" attribute is disallowed");
    assert_eq!(result.violations[0].raw, "role=\"button\"");

    assert_eq!(result.violations[1].severity, Severity::Error);
    assert_eq!(result.violations[1].line, 1);
    assert_eq!(result.violations[1].col, 20);
    assert_eq!(
        result.violations[1].message,
        "The \"aria-pressed\" attribute is disallowed"
    );
    assert_eq!(result.violations[1].raw, "aria-pressed=\"false\"");
}

#[test]
fn v6_no_aria_on_unsupported_element_002() {
    // `span` is untouched; `div` is flagged. Only the `role`/`aria-*` attributes of `div` are
    // reported, not its `class`, and not anything on `span`.
    let arena = html_arena("<div class=\"a\" aria-label=\"x\"></div>\n<span role=\"note\" aria-label=\"y\"></span>");
    let result = lint(
        &arena,
        &spec_with_aria_unsupported_div(),
        &config(serde_json::json!(true)),
    );

    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 16);
    assert_eq!(
        result.violations[0].message,
        "The \"aria-label\" attribute is disallowed"
    );
    assert_eq!(result.violations[0].raw, "aria-label=\"x\"");
}

#[test]
fn v6_no_aria_on_unsupported_element_003() {
    // No spec entry for `my-element`, so there is nothing to say it does not support ARIA.
    let arena = html_arena(r#"<my-element role="button" aria-pressed="false"></my-element>"#);
    let result = lint(
        &arena,
        &spec_with_aria_unsupported_div(),
        &config(serde_json::json!(true)),
    );
    assert!(result.violations.is_empty());
}

#[test]
fn v6_no_aria_on_unsupported_element_004() {
    let arena = html_arena(r#"<div role="button"></div>"#);
    let spec = spec_with_aria_unsupported_div();

    let warned = lint(&arena, &spec, &config(serde_json::json!("warning")));
    assert_eq!(warned.violations.len(), 1);
    assert_eq!(warned.violations[0].severity, Severity::Warning);

    let disabled = lint(&arena, &spec, &config(serde_json::json!(false)));
    assert!(disabled.violations.is_empty());
}
