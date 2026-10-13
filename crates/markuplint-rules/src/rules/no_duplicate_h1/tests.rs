//! Tests for `no-duplicate-h1` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-duplicate-h1-invalid-001  → no_duplicate_h1_invalid_001
//!   no-duplicate-h1-valid-001    → no_duplicate_h1_valid_001
//!   no-duplicate-h1-valid-002    → no_duplicate_h1_valid_002
//!   no-duplicate-h1-valid-003    → no_duplicate_h1_valid_003
//!   no-duplicate-h1-invalid-002  → no_duplicate_h1_invalid_002
//!   no-duplicate-h1-valid-004    → no_duplicate_h1_valid_004
//!   v6_no_duplicate_h1_001  — Rust-only: only the second `<h1>` is reported, however many follow
//!   v6_no_duplicate_h1_002  — Rust-only: tag case is ignored; a missing `<h1>` is not this rule's concern

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

fn run(html: &str, rule: serde_json::Value) -> Vec<Violation> {
    let arena = html_arena(html);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-duplicate-h1": rule }
    }))
    .unwrap();
    lint(&arena, &spec, &config).violations
}

fn assert_duplicated(violations: &[Violation], line: u32, col: u32) {
    assert_eq!(violations.len(), 1, "{violations:?}");
    assert_eq!(violations[0].rule_id, "no-duplicate-h1");
    assert_eq!(violations[0].severity, Severity::Warning);
    assert_eq!(violations[0].message, "The \"h1\" element is duplicated");
    assert_eq!(violations[0].line, line);
    assert_eq!(violations[0].col, col);
    assert_eq!(violations[0].raw, "<h1>");
}

/// TS: `[no-duplicate-h1-invalid-001]` h1
#[test]
fn no_duplicate_h1_invalid_001() {
    const _ID: &str = "no-duplicate-h1-invalid-001";
    let violations = run(
        "<html><body><h1>text</h1><h1>text</h1></body></html>",
        serde_json::json!(true),
    );
    assert_duplicated(&violations, 1, 26);
}

/// TS: `[no-duplicate-h1-valid-001]` h1
#[test]
fn no_duplicate_h1_valid_001() {
    const _ID: &str = "no-duplicate-h1-valid-001";
    let violations = run("<html><body><h1>text</h1></body></html>", serde_json::json!(true));
    assert_eq!(violations.len(), 0);
}

/// TS: `[no-duplicate-h1-valid-002]` rule disabled
#[test]
fn no_duplicate_h1_valid_002() {
    const _ID: &str = "no-duplicate-h1-valid-002";
    let violations = run(
        "<html><body><h1>text</h1><h1>text</h1></body></html>",
        serde_json::json!(false),
    );
    assert_eq!(violations.len(), 0);
}

/// TS: `[no-duplicate-h1-valid-003]` fragment without in-document-fragment option
#[test]
fn no_duplicate_h1_valid_003() {
    const _ID: &str = "no-duplicate-h1-valid-003";
    let violations = run("<div><h1>text</h1><h1>text</h1></div>", serde_json::json!(true));
    assert_eq!(violations.len(), 0);
}

/// TS: `[no-duplicate-h1-invalid-002]` enable option "in-document-fragment"
#[test]
fn no_duplicate_h1_invalid_002() {
    const _ID: &str = "no-duplicate-h1-invalid-002";
    let violations = run(
        "<div><h1>text</h1><h1>text</h1></div>",
        serde_json::json!({ "options": { "in-document-fragment": true } }),
    );
    assert_eq!(violations.len(), 1);
}

/// TS: `[no-duplicate-h1-valid-004]` Issue #57
#[test]
fn no_duplicate_h1_valid_004() {
    const _ID: &str = "no-duplicate-h1-valid-004";
    let violations = run("", serde_json::json!(true));
    assert_eq!(violations.len(), 0);
}

/// Rust-only: TS reports `h1Stack[1]` alone, so a third `<h1>` is not reported. Expected values
/// are the TS output.
#[test]
fn v6_no_duplicate_h1_001() {
    let violations = run(
        "<html><body><h1>a</h1><h1>b</h1>\n<h1>c</h1></body></html>",
        serde_json::json!(true),
    );
    assert_duplicated(&violations, 1, 23);
    let violations = run(
        "<div><h1>a</h1><h1>b</h1></div>",
        serde_json::json!({ "options": { "in-document-fragment": true } }),
    );
    assert_duplicated(&violations, 1, 16);
}

/// Rust-only: an `<H1>` counts as the first `<h1>`, and a document without any `<h1>` is left to
/// `require-h1`. Expected values are the TS output.
#[test]
fn v6_no_duplicate_h1_002() {
    let violations = run(
        "<html><body><H1>a</H1><h1>b</h1></body></html>",
        serde_json::json!(true),
    );
    assert_duplicated(&violations, 1, 23);
    assert_eq!(run("<html><body>text</body></html>", serde_json::json!(true)).len(), 0);
}

/// Rust-only: TS counts an `<h1>` inside `<template>` content, so it is the duplicate here.
/// Expected value (`1:48`, raw `<h1>`) is the TS output.
#[test]
fn v6_no_duplicate_h1_003() {
    let violations = run(
        "<!DOCTYPE html><html><body><h1>a</h1><template><h1>x</h1></template></body></html>",
        serde_json::json!(true),
    );
    assert_duplicated(&violations, 1, 48);
}
