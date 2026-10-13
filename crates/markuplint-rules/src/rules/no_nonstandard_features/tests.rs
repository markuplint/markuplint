//! Tests for `no-nonstandard-features` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-nonstandard-features-invalid-001  → no_nonstandard_features_invalid_001
//!   no-nonstandard-features-valid-001    → no_nonstandard_features_valid_001
//!   no-nonstandard-features-invalid-002  → no_nonstandard_features_invalid_002
//!   v6_no_nonstandard_features_001  — Rust-only: message, position and `raw` of attribute reports
//!   v6_no_nonstandard_features_002  — Rust-only: `<html xmlns>`; non-standard MathML elements are not checked
//!   v6_no_nonstandard_features_003  — Rust-only: attributes that are also experimental
//!   v6_no_nonstandard_features_004  — Rust-only: experimental-only attributes and `rules: false`

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

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

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

fn run_rule(html: &str, rule: serde_json::Value) -> Vec<Violation> {
    let arena = html_arena(html);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-nonstandard-features": rule }
    }))
    .unwrap();
    lint(&arena, &spec, &config).violations
}

fn run(html: &str) -> Vec<Violation> {
    run_rule(html, serde_json::json!(true))
}

/// Asserts each violation's `(line, col, attribute name)` in order; `raw` is the name.
fn assert_nonstandard(violations: &[Violation], expected: &[(u32, u32, &str)]) {
    assert_eq!(violations.len(), expected.len(), "{violations:?}");
    for (v, &(line, col, name)) in violations.iter().zip(expected) {
        assert_eq!(v.rule_id, "no-nonstandard-features");
        assert_eq!(v.severity, Severity::Warning);
        assert_eq!(v.message, format!("The \"{name}\" attribute is non-standard"));
        assert_eq!(v.line, line);
        assert_eq!(v.col, col);
        assert_eq!(v.raw, name);
    }
}

/// TS: `[no-nonstandard-features-invalid-001]` warns about non-standard attributes
#[test]
fn no_nonstandard_features_invalid_001() {
    const _ID: &str = "no-nonstandard-features-invalid-001";
    let violations = run("<canvas moz-opaque></canvas>");
    assert_eq!(violations.len(), 1);
    assert!(violations[0].message.contains("\"moz-opaque\""));
    assert!(violations[0].message.contains("non-standard"));
}

/// TS: `[no-nonstandard-features-valid-001]` ignore attribute by pattern
#[test]
fn no_nonstandard_features_valid_001() {
    const _ID: &str = "no-nonstandard-features-valid-001";
    let violations = run_rule(
        "<canvas moz-opaque></canvas>",
        serde_json::json!({ "options": { "ignoreFeatures": ["canvas[moz-opaque]"] } }),
    );
    assert!(violations.is_empty(), "{violations:?}");
}

/// TS: `[no-nonstandard-features-invalid-002]` severity is warning by default
#[test]
fn no_nonstandard_features_invalid_002() {
    const _ID: &str = "no-nonstandard-features-invalid-002";
    let violations = run("<canvas moz-opaque></canvas>");
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].severity, Severity::Warning);
}

/// Rust-only: the report points at the attribute name. Expected values are the TS output.
#[test]
fn v6_no_nonstandard_features_001() {
    assert_nonstandard(&run("<canvas moz-opaque></canvas>"), &[(1, 9, "moz-opaque")]);
    assert_nonstandard(
        &run("<hr align=\"center\"><input type=\"search\" incremental><font color=\"red\"></font>"),
        &[(1, 5, "align"), (1, 41, "incremental"), (1, 59, "color")],
    );
}

/// Rust-only: `xmlns` on `<html>` is non-standard; `<menclose>`/`<mfenced>` are non-standard
/// elements but in the MathML namespace, which is not checked. Expected values are the TS output.
#[test]
fn v6_no_nonstandard_features_002() {
    let violations = run(
        "<!doctype html><html xmlns=\"http://www.w3.org/1999/xhtml\"><head><title>x</title></head><body><math><menclose></menclose><mfenced></mfenced></math></body></html>",
    );
    assert_nonstandard(&violations, &[(1, 22, "xmlns")]);
}

/// Rust-only: attributes flagged both experimental and non-standard are reported here too.
/// Expected values are the TS output.
#[test]
fn v6_no_nonstandard_features_003() {
    assert_nonstandard(&run("<input type=\"checkbox\" switch>"), &[(1, 24, "switch")]);
    assert_nonstandard(
        &run("<button interestfor=\"x\"></button><template shadowrootreferencetarget=\"x\"></template>"),
        &[(1, 9, "interestfor"), (1, 44, "shadowrootreferencetarget")],
    );
    assert_nonstandard(&run("<a attributionsrc></a>"), &[(1, 4, "attributionsrc")]);
}

/// Rust-only: experimental-only attributes are not reported, nor is anything when the rule is
/// off. Expected values are the TS output.
#[test]
fn v6_no_nonstandard_features_004() {
    assert!(run("<iframe credentialless></iframe><div focusgroup></div>").is_empty());
    assert!(run_rule("<canvas moz-opaque></canvas>", serde_json::json!(false)).is_empty());
}
