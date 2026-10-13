//! Tests for `label-no-multiple-controls` rule.
//!
//! Test ID mapping (TS → Rust):
//!   label-no-multiple-controls-valid-001    → label_no_multiple_controls_valid_001
//!   label-no-multiple-controls-valid-002    → label_no_multiple_controls_valid_002
//!   label-no-multiple-controls-valid-003    → label_no_multiple_controls_valid_003
//!   label-no-multiple-controls-valid-004    → label_no_multiple_controls_valid_004
//!   label-no-multiple-controls-valid-005    → label_no_multiple_controls_valid_005
//!   label-no-multiple-controls-valid-006    → label_no_multiple_controls_valid_006
//!   label-no-multiple-controls-valid-007    → label_no_multiple_controls_valid_007
//!   label-no-multiple-controls-invalid-001  → label_no_multiple_controls_invalid_001
//!   label-no-multiple-controls-invalid-002  → label_no_multiple_controls_invalid_002
//!   label-no-multiple-controls-invalid-003  → label_no_multiple_controls_invalid_003
//!   label-no-multiple-controls-invalid-004  → label_no_multiple_controls_invalid_004
//!   label-no-multiple-controls-invalid-005  → label_no_multiple_controls_invalid_005
//!   label-no-multiple-controls-parser-001   — SKIPPED: needs the Vue parser (`:for` binding)
//!   label-no-multiple-controls-parser-002   — SKIPPED: needs the JSX parser (unresolved `<Label>` pretender);
//!                                             the HTML equivalent is v6_label_no_multiple_controls_001
//!   v6_label_no_multiple_controls_001  — Rust-only: a label pretended by a pretender is skipped, one with the `as` attribute is checked
//!   v6_label_no_multiple_controls_002  — Rust-only: a pretended descendant counts as the control it pretends to be
//!   v6_label_no_multiple_controls_003  — Rust-only: every descendant counts, not only children; every control type counts
//!   v6_label_no_multiple_controls_004  — Rust-only: a `for` naming the label itself is not an external control
//!   v6_label_no_multiple_controls_005  — Rust-only: an `<input type=hidden>` target is not labelable, but a hidden descendant still counts
//!   v6_label_no_multiple_controls_006  — Rust-only: the attribute node is looked up by its source name (`FOR` is not `for`)

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const AT_MOST_ONE: &str = "The \"label\" element may contain at most one form-control descendant (button, input, meter, output, progress, select, or textarea)";
const EXTERNAL: &str = "The \"label\" element must not contain a form-control descendant when the \"for\" attribute references an external labelable element";

fn run(html: &str) -> Vec<Brief> {
    run_with(html, serde_json::json!([]))
}

fn run_with(html: &str, pretenders: serde_json::Value) -> Vec<Brief> {
    lint_brief(
        "label-no-multiple-controls",
        html,
        serde_json::json!({ "rules": { "label-no-multiple-controls": true }, "pretenders": pretenders }),
    )
}

/// TS: `[label-no-multiple-controls-valid-001]` — empty label
#[test]
fn label_no_multiple_controls_valid_001() {
    const _ID: &str = "label-no-multiple-controls-valid-001";
    assert_eq!(run("<label>Name</label>").len(), 0);
}

/// TS: `[label-no-multiple-controls-valid-002]` — one input
#[test]
fn label_no_multiple_controls_valid_002() {
    const _ID: &str = "label-no-multiple-controls-valid-002";
    assert_eq!(run(r#"<label>Name <input type="text"></label>"#).len(), 0);
}

/// TS: `[label-no-multiple-controls-valid-003]` — meter alone
#[test]
fn label_no_multiple_controls_valid_003() {
    const _ID: &str = "label-no-multiple-controls-valid-003";
    assert_eq!(
        run(r#"<label>Score <meter value="3" max="10">3</meter></label>"#).len(),
        0
    );
}

/// TS: `[label-no-multiple-controls-invalid-001]` — two inputs
#[test]
fn label_no_multiple_controls_invalid_001() {
    const _ID: &str = "label-no-multiple-controls-invalid-001";
    assert_eq!(
        run(r#"<label>Name: <input type="text" name="first"> <input type="text" name="last"></label>"#),
        [brief(
            Severity::Error,
            1,
            47,
            AT_MOST_ONE,
            r#"<input type="text" name="last">"#
        )]
    );
}

/// TS: `[label-no-multiple-controls-invalid-002]` — mixed control types
#[test]
fn label_no_multiple_controls_invalid_002() {
    const _ID: &str = "label-no-multiple-controls-invalid-002";
    let violations = run(r#"<label>Score <progress value="50" max="100">50</progress> <input type="number"></label>"#);
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].1, 1);
    assert_eq!(violations[0].2, 59);
}

/// TS: `[label-no-multiple-controls-invalid-003]` — three controls reports two excess
#[test]
fn label_no_multiple_controls_invalid_003() {
    const _ID: &str = "label-no-multiple-controls-invalid-003";
    let violations = run("<label><input> <select><option>x</option></select> <textarea></textarea></label>");
    assert_eq!(violations.len(), 2);
    assert_eq!(violations.iter().map(|v| v.2).collect::<Vec<_>>(), [16, 52]);
}

/// TS: `[label-no-multiple-controls-valid-004]` — for references external labelable, no descendant control
#[test]
fn label_no_multiple_controls_valid_004() {
    const _ID: &str = "label-no-multiple-controls-valid-004";
    assert_eq!(run(r#"<input id="x"><label for="x">Name</label>"#).len(), 0);
}

/// TS: `[label-no-multiple-controls-invalid-004]` — for external labelable with descendant control
#[test]
fn label_no_multiple_controls_invalid_004() {
    const _ID: &str = "label-no-multiple-controls-invalid-004";
    assert_eq!(
        run(r#"<input id="x"><label for="x"><input></label>"#),
        [brief(Severity::Error, 1, 30, EXTERNAL, "<input>")]
    );
}

/// TS: `[label-no-multiple-controls-invalid-005]` — for external labelable with multiple descendant controls reports all
#[test]
fn label_no_multiple_controls_invalid_005() {
    const _ID: &str = "label-no-multiple-controls-invalid-005";
    let violations = run(r#"<input id="x"><label for="x"><input><textarea></textarea></label>"#);
    assert_eq!(violations.len(), 2);
    assert_eq!(
        violations.iter().map(|v| v.4.as_str()).collect::<Vec<_>>(),
        ["<input>", "<textarea>"]
    );
}

/// TS: `[label-no-multiple-controls-valid-005]` — for target is non-labelable falls back to internal rule
#[test]
fn label_no_multiple_controls_valid_005() {
    const _ID: &str = "label-no-multiple-controls-valid-005";
    assert_eq!(run(r#"<div id="x"></div><label for="x"><input></label>"#).len(), 0);
}

/// TS: `[label-no-multiple-controls-valid-006]` — for target is missing falls back to internal rule
#[test]
fn label_no_multiple_controls_valid_006() {
    const _ID: &str = "label-no-multiple-controls-valid-006";
    assert_eq!(run(r#"<label for="missing"><input></label>"#).len(), 0);
}

/// TS: `[label-no-multiple-controls-valid-007]` — for target is a descendant with matching id
#[test]
fn label_no_multiple_controls_valid_007() {
    const _ID: &str = "label-no-multiple-controls-valid-007";
    assert_eq!(run(r#"<label for="x"><input id="x"></label>"#).len(), 0);
}

/// A label pretended by a pretender (no `as` attribute) has unknown descendants and is
/// skipped, as TS `[label-no-multiple-controls-parser-002]` pins for an unresolved JSX
/// `<Label>`; with the `as` attribute the descendants are the ones written.
#[test]
fn v6_label_no_multiple_controls_001() {
    assert_eq!(
        run_with(
            "<x-label><input><input></x-label>",
            serde_json::json!([{ "selector": "x-label", "as": { "element": "label", "inheritAttrs": true } }]),
        ),
        []
    );
    assert_eq!(
        run(r#"<x-label as="label"><input><input></x-label>"#),
        [brief(Severity::Error, 1, 28, AT_MOST_ONE, "<input>")]
    );
}

/// A descendant that pretends to be a control counts as one.
#[test]
fn v6_label_no_multiple_controls_002() {
    assert_eq!(
        run_with(
            "<label><input><x-in></x-in></label>",
            serde_json::json!([{ "selector": "x-in", "as": "input" }]),
        ),
        [brief(Severity::Error, 1, 15, AT_MOST_ONE, "<x-in>")]
    );
}

/// Controls nested at any depth count, and so does every control type.
#[test]
fn v6_label_no_multiple_controls_003() {
    assert_eq!(
        run("<label><span><input></span><select></select></label>"),
        [brief(Severity::Error, 1, 28, AT_MOST_ONE, "<select>")]
    );
    assert_eq!(
        run("<label><button></button><meter></meter><output></output><progress></progress></label>"),
        [
            brief(Severity::Error, 1, 25, AT_MOST_ONE, "<meter>"),
            brief(Severity::Error, 1, 40, AT_MOST_ONE, "<output>"),
            brief(Severity::Error, 1, 57, AT_MOST_ONE, "<progress>"),
        ]
    );
}

/// A `for` resolving to the label itself is not an external control (the label contains
/// itself, as DOM `contains()` does).
#[test]
fn v6_label_no_multiple_controls_004() {
    assert_eq!(run(r#"<label id="x" for="x"><input></label>"#), []);
}

/// An `<input type=hidden>` target is not labelable, so the label falls back to its
/// descendants; while a hidden input inside a label bound elsewhere still counts as a
/// form control.
#[test]
fn v6_label_no_multiple_controls_005() {
    assert_eq!(run(r#"<input type="hidden" id="x"><label for="x"><input></label>"#), []);
    assert_eq!(
        run(r#"<input id="x"><label for="x"><span><input type="hidden"></span></label>"#),
        [brief(Severity::Error, 1, 36, EXTERNAL, r#"<input type="hidden">"#)]
    );
}

/// TS `getAttributeNode('for')` compares the source name as is, so an upper-case `FOR`
/// is not found and the label falls back to its descendants.
#[test]
fn v6_label_no_multiple_controls_006() {
    assert_eq!(run(r#"<input id="x"><label FOR="x"><input></label>"#), []);
}
