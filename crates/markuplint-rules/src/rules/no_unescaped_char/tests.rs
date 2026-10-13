//! Tests for `no-unescaped-char` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-unescaped-char-invalid-001  → no_unescaped_char_invalid_001
//!   no-unescaped-char-valid-001    → no_unescaped_char_valid_001
//!   no-unescaped-char-valid-002    → no_unescaped_char_valid_002
//!   no-unescaped-char-strict-001   → no_unescaped_char_strict_001
//!   no-unescaped-char-strict-002   → no_unescaped_char_strict_002
//!   no-unescaped-char-issue-1074   → no_unescaped_char_issue_1074
//!   no-unescaped-char-valid-003    → no_unescaped_char_valid_003
//!   no-unescaped-char-parser-001   — SKIP: Vue parser and spec (the Rust engine has neither)
//!   no-unescaped-char-parser-002   — SKIP: EJS parser (the Rust engine has none)
//!   no-unescaped-char-issue-1575   → no_unescaped_char_issue_1575
//!   v6_no_unescaped_char_001       — Rust-only: a non-error severity says "should"
//!   v6_no_unescaped_char_002       — Rust-only: `<` in an attribute value, RCDATA and on a later line; not in `style`
//!   v6_no_unescaped_char_003       — Rust-only: escaped `<` is not reported
//!   v6_no_unescaped_char_004       — Rust-only: strict mode masks entity-shaped sequences, known or not

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

fn run_with(html: &str, rule: serde_json::Value) -> Vec<Violation> {
    let arena = html_arena(html);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unescaped-char": rule }
    }))
    .unwrap();
    lint(&arena, &spec, &config).violations
}

fn run(html: &str) -> Vec<Violation> {
    run_with(html, serde_json::json!(true))
}

fn run_strict(html: &str) -> Vec<Violation> {
    run_with(html, serde_json::json!({ "options": { "strict": true } }))
}

const MESSAGE: &str = "Illegal characters must escape in character reference";

/// TS: `[no-unescaped-char-invalid-001]`
#[test]
fn no_unescaped_char_invalid_001() {
    const _ID: &str = "no-unescaped-char-invalid-001";
    let violations = run(r#"<div id="a"> > < & " ' &amp;</div>"#);
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].rule_id, "no-unescaped-char");
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(violations[0].message, MESSAGE);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 16);
    assert_eq!(violations[0].raw, "<");
}

/// TS: `[no-unescaped-char-valid-001]`
#[test]
fn no_unescaped_char_valid_001() {
    const _ID: &str = "no-unescaped-char-valid-001";
    let violations = run(r#"<div id="a"> > & " ' &amp;</div>"#);
    assert_eq!(violations.len(), 0);
}

/// TS: `[no-unescaped-char-valid-002]`
#[test]
fn no_unescaped_char_valid_002() {
    const _ID: &str = "no-unescaped-char-valid-002";
    let violations = run(r#"<img src="path/to?a=b&c=d">"#);
    assert_eq!(violations.len(), 0);
}

/// TS: `[no-unescaped-char-strict-001]`
#[test]
fn no_unescaped_char_strict_001() {
    const _ID: &str = "no-unescaped-char-strict-001";
    let violations = run_strict(r#"<div id="a"> > < & " ' &amp;</div>"#);
    assert_eq!(violations.len(), 4);
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(violations[0].message, MESSAGE);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 14);
    assert_eq!(violations[0].raw, ">");
    assert_eq!(violations[1].col, 16);
    assert_eq!(violations[1].raw, "<");
    assert_eq!(violations[2].col, 18);
    assert_eq!(violations[2].raw, "&");
    assert_eq!(violations[3].col, 20);
    assert_eq!(violations[3].raw, "\"");
}

/// TS: `[no-unescaped-char-strict-002]`
#[test]
fn no_unescaped_char_strict_002() {
    const _ID: &str = "no-unescaped-char-strict-002";
    let violations = run_strict(r#"<img src="path/to?a=b&c=d">"#);
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(violations[0].message, MESSAGE);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 22);
    assert_eq!(violations[0].raw, "&");
}

/// TS: `[no-unescaped-char-issue-1074]`
#[test]
fn no_unescaped_char_issue_1074() {
    const _ID: &str = "no-unescaped-char-issue-1074";
    let violations = run_strict("<span>&#9660;</span><span>&#x25BC;</span><span>&x25BC;</span>");
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(violations[0].message, MESSAGE);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 48);
    assert_eq!(violations[0].raw, "&");
}

/// TS: `[no-unescaped-char-valid-003]`
#[test]
fn no_unescaped_char_valid_003() {
    const _ID: &str = "no-unescaped-char-valid-003";
    let violations = run_strict(r#"<script>if (i < 0) console.log("<markuplint>");</script>"#);
    assert_eq!(violations.len(), 0);
}

/// TS: `[no-unescaped-char-issue-1575]`
#[test]
fn no_unescaped_char_issue_1575() {
    const _ID: &str = "no-unescaped-char-issue-1575";
    let violations = run("<div></p></div>");
    assert_eq!(violations.len(), 0);
}

/// Rust-only: with a severity other than `error` the message says "should".
/// Expected values from the TS rule.
#[test]
fn v6_no_unescaped_char_001() {
    let violations = run_with(
        r#"<div id="a"> > < & " ' &amp;</div>"#,
        serde_json::json!({ "severity": "warning" }),
    );
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].severity, Severity::Warning);
    assert_eq!(
        violations[0].message,
        "Illegal characters should escape in character reference"
    );
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 16);
    assert_eq!(violations[0].raw, "<");
}

/// Rust-only: `<` in an attribute value, in RCDATA and on a later line is reported;
/// `style` content is exempt. Expected values from the TS rule.
#[test]
fn v6_no_unescaped_char_002() {
    let positions =
        |html: &str| -> Vec<(u32, u32, String)> { run(html).iter().map(|v| (v.line, v.col, v.raw.clone())).collect() };
    assert_eq!(positions(r#"<a title="a<b">x</a>"#), vec![(1, 12, "<".to_owned())]);
    assert_eq!(positions("<textarea>a < b</textarea>"), vec![(1, 13, "<".to_owned())]);
    assert_eq!(positions("<p>\n  a < b\n</p>"), vec![(2, 5, "<".to_owned())]);
    assert_eq!(positions("<style>a < b {}</style>"), vec![]);
}

/// Rust-only: `&lt;` and `&#60;` are escapes, not a literal `<`, even though the parser
/// decodes them. Expected values from the TS rule.
#[test]
fn v6_no_unescaped_char_003() {
    assert_eq!(run("<p>a &lt; b &#60; c</p>").len(), 0);
    assert_eq!(
        run("<span>&#9660;</span><span>&#x25BC;</span><span>&x25BC;</span>").len(),
        0
    );
}

/// Rust-only: strict mode masks an entity-shaped sequence whether or not the name
/// exists (`&xyz;`); the literal `<` is still reported. Expected values from the TS rule.
#[test]
fn v6_no_unescaped_char_004() {
    let violations = run_strict("<p>&xyz; < </p>");
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 10);
    assert_eq!(violations[0].raw, "<");
}
