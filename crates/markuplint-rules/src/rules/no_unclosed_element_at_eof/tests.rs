//! Tests for `no-unclosed-element-at-eof` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-unclosed-element-at-eof-invalid-001    → no_unclosed_element_at_eof_invalid_001
//!   no-unclosed-element-at-eof-invalid-002    → no_unclosed_element_at_eof_invalid_002
//!   no-unclosed-element-at-eof-valid-001      → no_unclosed_element_at_eof_valid_001
//!   no-unclosed-element-at-eof-valid-002      → no_unclosed_element_at_eof_valid_002
//!   no-unclosed-element-at-eof-valid-003      → no_unclosed_element_at_eof_valid_003
//!   no-unclosed-element-at-eof-valid-004      → no_unclosed_element_at_eof_valid_004
//!   no-unclosed-element-at-eof-issue-4022-001 — SKIP: Pug parser not available in Rust
//!   v6_no_unclosed_element_at_eof_001  — Rust-only: `iframe` and `param` are not void elements for this rule
//!   v6_no_unclosed_element_at_eof_002  — Rust-only: the content end follows the last child, a comment included
//!   v6_no_unclosed_element_at_eof_003  — Rust-only: a self-closing foreign element has no end tag either
//!   v6_no_unclosed_element_at_eof_004  — Rust-only: an end tag left in the source after the content is not the EOF case

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const RULE: &str = "no-unclosed-element-at-eof";

fn run(html: &str) -> Vec<Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: true } }))
}

fn unclosed(col: u32, name: &str, raw: &str) -> Brief {
    brief(
        Severity::Error,
        1,
        col,
        &format!("The \"{name}\" element is not closed at the end of the file"),
        raw,
    )
}

/// TS: `[no-unclosed-element-at-eof-invalid-001]` picture left open at the end of the file
#[test]
fn no_unclosed_element_at_eof_invalid_001() {
    const _ID: &str = "no-unclosed-element-at-eof-invalid-001";
    assert_eq!(
        run(r#"<picture><img src="x" alt="">"#),
        [unclosed(1, "picture", "<picture>")]
    );
}

/// TS: `[no-unclosed-element-at-eof-invalid-002]` nested elements both left open at the end of the file
#[test]
fn no_unclosed_element_at_eof_invalid_002() {
    const _ID: &str = "no-unclosed-element-at-eof-invalid-002";
    assert_eq!(
        run("<section><div>text"),
        [unclosed(1, "section", "<section>"), unclosed(10, "div", "<div>")]
    );
}

/// TS: `[no-unclosed-element-at-eof-valid-001]` properly closed picture
#[test]
fn no_unclosed_element_at_eof_valid_001() {
    const _ID: &str = "no-unclosed-element-at-eof-valid-001";
    assert_eq!(run(r#"<picture><img src="x" alt=""></picture>"#), []);
}

/// TS: `[no-unclosed-element-at-eof-valid-002]` optional-tag-omission elements left open at EOF are exempt
#[test]
fn no_unclosed_element_at_eof_valid_002() {
    const _ID: &str = "no-unclosed-element-at-eof-valid-002";
    assert_eq!(run("<ul><li>one<li>two</ul>"), []);
    assert_eq!(run("<li>orphan list item"), []);
    assert_eq!(run("<p>last paragraph"), []);
}

/// TS: `[no-unclosed-element-at-eof-valid-003]` void elements are never flagged
#[test]
fn no_unclosed_element_at_eof_valid_003() {
    const _ID: &str = "no-unclosed-element-at-eof-valid-003";
    assert_eq!(run(r#"<img src="x" alt="">"#), []);
}

/// TS: `[no-unclosed-element-at-eof-valid-004]` an element autoclosed mid-document by a sibling is not an EOF case
#[test]
fn no_unclosed_element_at_eof_valid_004() {
    const _ID: &str = "no-unclosed-element-at-eof-valid-004";
    assert_eq!(run("<p>one<div>two</div>"), []);
}

/// Expected values from the TS rule (`mlRuleTest`) on the same inputs.
#[test]
fn v6_no_unclosed_element_at_eof_001() {
    assert_eq!(run("<iframe>"), [unclosed(1, "iframe", "<iframe>")]);
    assert_eq!(run("<param>"), [unclosed(1, "param", "<param>")]);
}

/// Expected values from the TS rule (`mlRuleTest`) on the same inputs.
#[test]
fn v6_no_unclosed_element_at_eof_002() {
    assert_eq!(run("<div><!-- c -->\n"), [unclosed(1, "div", "<div>")]);
    assert_eq!(
        run("<!doctype html><html><body><main><p>x</p>\n"),
        [unclosed(28, "main", "<main>")]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input.
#[test]
fn v6_no_unclosed_element_at_eof_003() {
    assert_eq!(
        run("<svg><g><circle/>"),
        [
            unclosed(1, "svg", "<svg>"),
            unclosed(6, "g", "<g>"),
            unclosed(9, "circle", "<circle/>"),
        ]
    );
}

/// The orphaned `</span>` is left out of the text, so the source after the content is not
/// blank. TS (`mlRuleTest`) reports nothing either.
#[test]
fn v6_no_unclosed_element_at_eof_004() {
    assert_eq!(run("<div>text</span>"), []);
}
