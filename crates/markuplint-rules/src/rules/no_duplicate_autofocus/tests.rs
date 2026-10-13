//! Tests for `no-duplicate-autofocus` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-duplicate-autofocus-valid-001    → no_duplicate_autofocus_valid_001
//!   no-duplicate-autofocus-valid-002    → no_duplicate_autofocus_valid_002
//!   no-duplicate-autofocus-invalid-001  → no_duplicate_autofocus_invalid_001
//!   no-duplicate-autofocus-invalid-002  → no_duplicate_autofocus_invalid_002
//!   no-duplicate-autofocus-valid-003    → no_duplicate_autofocus_valid_003
//!   no-duplicate-autofocus-valid-004    → no_duplicate_autofocus_valid_004
//!   no-duplicate-autofocus-valid-005    → no_duplicate_autofocus_valid_005
//!   no-duplicate-autofocus-invalid-003  → no_duplicate_autofocus_invalid_003
//!   no-duplicate-autofocus-invalid-004  → no_duplicate_autofocus_invalid_004
//!   v6_no_duplicate_autofocus_001       — Rust-only: attribute names are case-insensitive
//!   v6_no_duplicate_autofocus_002       — Rust-only: the nearest dialog or popover is the scoping root
//!   v6_no_duplicate_autofocus_003       — Rust-only: pretended elements count as what they pretend to be
//!   v6_no_duplicate_autofocus_004       — Rust-only: a whole document is one scope
//!   v6_no_duplicate_autofocus_005       — Rust-only: an element the rule is disabled on is not counted
//!
//! Expected values of the `v6_*` tests come from running the TS rule.

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

fn run(html: &str) -> Vec<Brief> {
    run_with(html, serde_json::json!([]))
}

fn run_with(html: &str, pretenders: serde_json::Value) -> Vec<Brief> {
    lint_brief(
        "no-duplicate-autofocus",
        html,
        serde_json::json!({ "rules": { "no-duplicate-autofocus": true }, "pretenders": pretenders }),
    )
}

const MESSAGE: &str = "The \"autofocus\" attribute must be unique in the document";

/// TS: `[no-duplicate-autofocus-valid-001]` — single autofocus
#[test]
fn no_duplicate_autofocus_valid_001() {
    const _ID: &str = "no-duplicate-autofocus-valid-001";
    assert_eq!(run("<div><input autofocus><input></div>"), []);
}

/// TS: `[no-duplicate-autofocus-valid-002]` — no autofocus
#[test]
fn no_duplicate_autofocus_valid_002() {
    const _ID: &str = "no-duplicate-autofocus-valid-002";
    assert_eq!(run("<div><input><input></div>"), []);
}

/// TS: `[no-duplicate-autofocus-invalid-001]` — two autofocus
#[test]
fn no_duplicate_autofocus_invalid_001() {
    const _ID: &str = "no-duplicate-autofocus-invalid-001";
    assert_eq!(
        run("<div><input autofocus><input autofocus></div>"),
        [brief(Severity::Error, 1, 23, MESSAGE, "<input autofocus>")]
    );
}

/// TS: `[no-duplicate-autofocus-invalid-002]` — three autofocus
#[test]
fn no_duplicate_autofocus_invalid_002() {
    const _ID: &str = "no-duplicate-autofocus-invalid-002";
    assert_eq!(
        run("<div><input autofocus><button autofocus>x</button><textarea autofocus></textarea></div>"),
        [
            brief(Severity::Error, 1, 23, MESSAGE, "<button autofocus>"),
            brief(Severity::Error, 1, 51, MESSAGE, "<textarea autofocus>"),
        ]
    );
}

/// TS: `[no-duplicate-autofocus-valid-003]` — each dialog has its own autofocus scoping root
#[test]
fn no_duplicate_autofocus_valid_003() {
    const _ID: &str = "no-duplicate-autofocus-valid-003";
    assert_eq!(
        run("<dialog><input autofocus></dialog><dialog><button autofocus>x</button></dialog>"),
        []
    );
}

/// TS: `[no-duplicate-autofocus-valid-004]` — each popover has its own autofocus scoping root
#[test]
fn no_duplicate_autofocus_valid_004() {
    const _ID: &str = "no-duplicate-autofocus-valid-004";
    assert_eq!(
        run("<div popover><input autofocus></div><div popover><button autofocus>x</button></div>"),
        []
    );
}

/// TS: `[no-duplicate-autofocus-valid-005]` — a dialog-scoped autofocus does not conflict with a
/// document-level autofocus
#[test]
fn no_duplicate_autofocus_valid_005() {
    const _ID: &str = "no-duplicate-autofocus-valid-005";
    assert_eq!(
        run("<input autofocus><dialog><button autofocus>x</button></dialog>"),
        []
    );
}

/// TS: `[no-duplicate-autofocus-invalid-003]` — two autofocus elements sharing the same dialog
/// scoping root
#[test]
fn no_duplicate_autofocus_invalid_003() {
    const _ID: &str = "no-duplicate-autofocus-invalid-003";
    assert_eq!(
        run("<dialog><input autofocus><button autofocus>x</button></dialog>"),
        [brief(Severity::Error, 1, 26, MESSAGE, "<button autofocus>")]
    );
}

/// TS: `[no-duplicate-autofocus-invalid-004]` — a dialog with autofocus and an inner autofocus
/// target share the dialog as their scoping root
#[test]
fn no_duplicate_autofocus_invalid_004() {
    const _ID: &str = "no-duplicate-autofocus-invalid-004";
    assert_eq!(
        run("<dialog autofocus><input autofocus></dialog>"),
        [brief(Severity::Error, 1, 19, MESSAGE, "<input autofocus>")]
    );
}

/// `autofocus` and `popover` are found whatever their case.
#[test]
fn v6_no_duplicate_autofocus_001() {
    assert_eq!(
        run("<input AUTOFOCUS><input autofocus>"),
        [brief(Severity::Error, 1, 18, MESSAGE, "<input autofocus>")]
    );
    assert_eq!(run("<div POPOVER><input autofocus></div><input autofocus>"), []);
}

/// The scoping root is the nearest dialog or popover, the element itself included.
#[test]
fn v6_no_duplicate_autofocus_002() {
    assert_eq!(
        run("<div popover><dialog><input autofocus></dialog><input autofocus></div>"),
        []
    );
    assert_eq!(
        run("<div popover autofocus><input autofocus></div>"),
        [brief(Severity::Error, 1, 24, MESSAGE, "<input autofocus>")]
    );
    assert_eq!(
        run("<dialog><div popover><input autofocus></div><input autofocus></dialog><input autofocus><input autofocus>"),
        [brief(Severity::Error, 1, 88, MESSAGE, "<input autofocus>")]
    );
}

/// A pretended element is a dialog when it pretends to be one, and has `autofocus` only when the
/// pretender gives it the attributes written.
#[test]
fn v6_no_duplicate_autofocus_003() {
    let dialog = serde_json::json!([{ "selector": "x-dialog", "as": "dialog" }]);
    assert_eq!(
        run_with("<x-dialog><input autofocus></x-dialog><input autofocus>", dialog),
        []
    );
    assert_eq!(
        run("<x-dialog><input autofocus></x-dialog><input autofocus>"),
        [brief(Severity::Error, 1, 39, MESSAGE, "<input autofocus>")]
    );
    let bare = serde_json::json!([{ "selector": "x-input", "as": "input" }]);
    assert_eq!(run_with("<x-input autofocus></x-input><input autofocus>", bare), []);
    let inherit = serde_json::json!([{ "selector": "x-input", "as": { "element": "input", "inheritAttrs": true } }]);
    assert_eq!(
        run_with("<x-input autofocus></x-input><input autofocus>", inherit),
        [brief(Severity::Error, 1, 30, MESSAGE, "<input autofocus>")]
    );
}

/// In a whole document, every autofocus outside dialogs and popovers shares the document scope.
#[test]
fn v6_no_duplicate_autofocus_004() {
    assert_eq!(
        run(
            "<!doctype html><html><head><title>t</title></head><body><input autofocus>\n<input autofocus></body></html>"
        ),
        [brief(Severity::Error, 2, 1, MESSAGE, "<input autofocus>")]
    );
}

/// An element the rule is disabled on (`nodeRules`) is not counted, so the next one is the first.
#[test]
fn v6_no_duplicate_autofocus_005() {
    assert_eq!(
        lint_brief(
            "no-duplicate-autofocus",
            r#"<input id="a" autofocus><input autofocus><input autofocus>"#,
            serde_json::json!({
                "rules": { "no-duplicate-autofocus": true },
                "nodeRules": [{ "selector": "#a", "rules": { "no-duplicate-autofocus": false } }],
            }),
        ),
        [brief(Severity::Error, 1, 42, MESSAGE, "<input autofocus>")]
    );
}
