//! Tests for `require-h1` rule.
//!
//! Test ID mapping (TS → Rust):
//!   require-h1-invalid-001  → require_h1_invalid_001
//!   require-h1-valid-001    → require_h1_valid_001
//!   require-h1-valid-002    → require_h1_valid_002
//!   require-h1-invalid-002  → require_h1_invalid_002
//!   require-h1-invalid-003  → require_h1_invalid_003
//!   require-h1-valid-003    → require_h1_valid_003
//!   v6_require_h1_001  — Rust-only: `raw` is the first character of the first node, whatever it is
//!   v6_require_h1_002  — Rust-only: an `<H1>` and an `<h1>` inside `<svg>` both count
//!   v6_require_h1_003  — Rust-only: a leading comment makes the input a fragment, so nothing is reported

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
        "rules": { "require-h1": rule }
    }))
    .unwrap();
    lint(&arena, &spec, &config).violations
}

fn assert_missing(violations: &[Violation], raw: &str) {
    assert_eq!(violations.len(), 1, "{violations:?}");
    assert_eq!(violations[0].rule_id, "require-h1");
    assert_eq!(violations[0].severity, Severity::Warning);
    assert_eq!(violations[0].message, "Require the \"h1\" element");
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 1);
    assert_eq!(violations[0].raw, raw);
}

/// TS: `[require-h1-invalid-001]` h1
#[test]
fn require_h1_invalid_001() {
    const _ID: &str = "require-h1-invalid-001";
    let violations = run("<html><body>text</body></html>", serde_json::json!(true));
    assert_missing(&violations, "<");
}

/// TS: `[require-h1-valid-001]` h1
#[test]
fn require_h1_valid_001() {
    const _ID: &str = "require-h1-valid-001";
    let violations = run("<html><body><h1>text</h1></body></html>", serde_json::json!(true));
    assert_eq!(violations.len(), 0);
}

/// TS: `[require-h1-valid-002]` h1
#[test]
fn require_h1_valid_002() {
    const _ID: &str = "require-h1-valid-002";
    let violations = run("<div><h2>text</h2></div>", serde_json::json!(true));
    assert_eq!(violations.len(), 0);
}

/// TS: `[require-h1-invalid-002]` enable option "in-document-fragment"
#[test]
fn require_h1_invalid_002() {
    const _ID: &str = "require-h1-invalid-002";
    let violations = run(
        "<div><h2>text</h2></div>",
        serde_json::json!({ "options": { "in-document-fragment": true } }),
    );
    assert_eq!(violations.len(), 1);
}

/// TS: `[require-h1-valid-003]` Issue #57
#[test]
fn require_h1_valid_003() {
    const _ID: &str = "require-h1-valid-003";
    let violations = run("", serde_json::json!(true));
    assert_eq!(violations.len(), 0);
}

/// Rust-only: TS reports `nodeList[0].raw.slice(0, 1)`, so a leading newline or a text-only
/// fragment yields that character rather than `<`. Expected values are the TS output.
#[test]
fn v6_require_h1_001() {
    assert_missing(&run("\n<html><body>text</body></html>", serde_json::json!(true)), "\n");
    assert_missing(
        &run("<!doctype html><title>x</title><p>a</p>", serde_json::json!(true)),
        "<",
    );
    let in_fragment = serde_json::json!({ "options": { "in-document-fragment": true } });
    assert_missing(&run("<div><h2>text</h2></div>", in_fragment.clone()), "<");
    assert_missing(&run("   ", in_fragment.clone()), " ");
    assert_missing(&run("text only", in_fragment), "t");
}

/// Rust-only: TS compares `nodeName.toLowerCase()` with `h1`, so the tag case and the namespace
/// do not matter. Expected values are the TS output.
#[test]
fn v6_require_h1_002() {
    assert_eq!(
        run("<html><body><H1>a</H1></body></html>", serde_json::json!(true)).len(),
        0
    );
    assert_eq!(
        run(
            "<html><body><svg><h1>x</h1></svg></body></html>",
            serde_json::json!(true)
        )
        .len(),
        0
    );
}

/// Rust-only: input that begins with a comment or with `<title>` is parsed as a fragment, so
/// without `in-document-fragment` nothing is reported. Expected values are the TS output.
#[test]
fn v6_require_h1_003() {
    assert_eq!(
        run("<!-- c --><html><body>text</body></html>", serde_json::json!(true)).len(),
        0
    );
    assert_eq!(run("<title>x</title><p>a</p>", serde_json::json!(true)).len(), 0);
}

/// Rust-only: TS counts an `<h1>` inside `<template>` content. Expected value is the TS output.
#[test]
fn v6_require_h1_004() {
    assert_eq!(
        run(
            "<!DOCTYPE html><html><body><template><h1>x</h1></template></body></html>",
            serde_json::json!(true)
        )
        .len(),
        0
    );
}

/// TS: `[require-h1-invalid-003]` — The `as` attribute
#[test]
fn require_h1_invalid_003() {
    const _ID: &str = "require-h1-invalid-003";
    let run = |html: &str| {
        crate::test_util::lint_brief(
            "require-h1",
            html,
            serde_json::json!({ "rules": { "require-h1": true } }),
        )
    };
    assert_eq!(run(r#"<html><body><x-h1 as="h1">text</x-h1></body></html>"#), []);
    assert_eq!(
        run(r#"<html><body><x-h2 as="h2">text</x-h2></body></html>"#),
        [crate::test_util::brief(
            crate::violation::Severity::Warning,
            1,
            1,
            "Require the \"h1\" element",
            "<"
        )]
    );
}
