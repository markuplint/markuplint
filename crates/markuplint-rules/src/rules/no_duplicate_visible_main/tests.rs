//! Tests for `no-duplicate-visible-main` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-duplicate-visible-main-valid-001    → no_duplicate_visible_main_valid_001
//!   no-duplicate-visible-main-valid-002    → no_duplicate_visible_main_valid_002
//!   no-duplicate-visible-main-valid-003    → no_duplicate_visible_main_valid_003
//!   no-duplicate-visible-main-invalid-001  → no_duplicate_visible_main_invalid_001
//!   no-duplicate-visible-main-invalid-002  → no_duplicate_visible_main_invalid_002
//!   v6_no_duplicate_visible_main_001  — Rust-only: every visible `main` after the first is reported, by local name
//!   v6_no_duplicate_visible_main_002  — Rust-only: a pretender reads `hidden` from the `as` element, which lacks it

use crate::test_util::{Brief, brief, lint_brief, lint_html};
use crate::violation::Severity;

const RULE: &str = "no-duplicate-visible-main";
const MESSAGE: &str = "There must not be more than one visible \"main\" element in a document";

fn run(html: &str) -> Vec<Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: true } }))
}

/// TS: `[no-duplicate-visible-main-valid-001]` single main
#[test]
fn no_duplicate_visible_main_valid_001() {
    const _ID: &str = "no-duplicate-visible-main-valid-001";
    assert_eq!(run("<body><main>content</main></body>"), []);
}

/// TS: `[no-duplicate-visible-main-valid-002]` main with hidden main
#[test]
fn no_duplicate_visible_main_valid_002() {
    const _ID: &str = "no-duplicate-visible-main-valid-002";
    assert_eq!(
        run("<body><main>content</main><main hidden>hidden content</main></body>"),
        []
    );
}

/// TS: `[no-duplicate-visible-main-valid-003]` no main
#[test]
fn no_duplicate_visible_main_valid_003() {
    const _ID: &str = "no-duplicate-visible-main-valid-003";
    assert_eq!(run("<body><div>content</div></body>"), []);
}

/// TS: `[no-duplicate-visible-main-invalid-001]` two visible mains
#[test]
fn no_duplicate_visible_main_invalid_001() {
    const _ID: &str = "no-duplicate-visible-main-invalid-001";
    let v = lint_html(
        "<body><main>first</main><main>second</main></body>",
        serde_json::json!({ "rules": { RULE: true } }),
    );
    assert_eq!(v.len(), 1, "{v:?}");
    assert_eq!(v[0].severity, Severity::Error);
    assert_eq!(v[0].raw, "<main>");
    assert_eq!(v[0].message, MESSAGE);
}

/// TS: `[no-duplicate-visible-main-invalid-002]` three mains one hidden
#[test]
fn no_duplicate_visible_main_invalid_002() {
    const _ID: &str = "no-duplicate-visible-main-invalid-002";
    let v = lint_html(
        "<body><main>first</main><main hidden>hidden</main><main>third</main></body>",
        serde_json::json!({ "rules": { RULE: true } }),
    );
    assert_eq!(v.len(), 1, "{v:?}");
    assert_eq!(v[0].severity, Severity::Error);
    assert_eq!(v[0].raw, "<main>");
    assert_eq!(v[0].col, 51);
    assert_eq!(v[0].message, MESSAGE);
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input. The `main` inside
/// `<svg>` has the local name `main` too.
#[test]
fn v6_no_duplicate_visible_main_001() {
    assert_eq!(
        run("<body><main>a</main><MAIN>b</MAIN><svg><main></main></svg></body>"),
        [
            brief(Severity::Error, 1, 21, MESSAGE, "<MAIN>"),
            brief(Severity::Error, 1, 40, MESSAGE, "<main>"),
        ]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) with the same pretenders: `hidden` is
/// not inherited by the `as` element, so `<x-main hidden>` counts as visible.
#[test]
fn v6_no_duplicate_visible_main_002() {
    assert_eq!(
        lint_brief(
            RULE,
            "<body><x-main>a</x-main><x-main hidden>b</x-main><x-main>c</x-main></body>",
            serde_json::json!({
                "rules": { RULE: true },
                "pretenders": [{ "selector": "x-main", "as": "main" }]
            }),
        ),
        [
            brief(Severity::Error, 1, 25, MESSAGE, "<x-main hidden>"),
            brief(Severity::Error, 1, 50, MESSAGE, "<x-main>"),
        ]
    );
}
