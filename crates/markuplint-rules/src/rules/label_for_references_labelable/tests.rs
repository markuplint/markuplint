//! Tests for `label-for-references-labelable` rule.
//!
//! Test ID mapping (TS → Rust):
//!   label-for-references-labelable-valid-001    → label_for_references_labelable_valid_001
//!   label-for-references-labelable-valid-002    → label_for_references_labelable_valid_002
//!   label-for-references-labelable-valid-003    → label_for_references_labelable_valid_003
//!   label-for-references-labelable-valid-004    → label_for_references_labelable_valid_004
//!   label-for-references-labelable-valid-005    → label_for_references_labelable_valid_005
//!   label-for-references-labelable-valid-006    → label_for_references_labelable_valid_006
//!   label-for-references-labelable-valid-007    → label_for_references_labelable_valid_007
//!   label-for-references-labelable-valid-008    → label_for_references_labelable_valid_008
//!   label-for-references-labelable-valid-009    → label_for_references_labelable_valid_009
//!   label-for-references-labelable-valid-010    → label_for_references_labelable_valid_010
//!   label-for-references-labelable-valid-011    → label_for_references_labelable_valid_011
//!   label-for-references-labelable-valid-012    → label_for_references_labelable_valid_012
//!   label-for-references-labelable-invalid-001  → label_for_references_labelable_invalid_001
//!   label-for-references-labelable-invalid-002  → label_for_references_labelable_invalid_002
//!   label-for-references-labelable-invalid-003  → label_for_references_labelable_invalid_003
//!   label-for-references-labelable-invalid-004  → label_for_references_labelable_invalid_004
//!   label-for-references-labelable-invalid-005  → label_for_references_labelable_invalid_005
//!   label-for-references-labelable-invalid-006  → label_for_references_labelable_invalid_006
//!   label-for-references-labelable-parser-001   — SKIPPED: needs the Vue parser (`:for` binding)
//!   label-for-references-labelable-parser-002   — SKIPPED: needs the JSX parser (unresolved `<Label>` pretender);
//!                                                 the HTML equivalent is v6_label_for_references_labelable_001
//!   v6_label_for_references_labelable_001  — Rust-only: a label pretended by a pretender is skipped, one with the `as` attribute is checked
//!   v6_label_for_references_labelable_002  — Rust-only: the target is classified by what it pretends to be
//!   v6_label_for_references_labelable_003  — Rust-only: the attribute node is looked up by its source name (`FOR` is not `for`)
//!   v6_label_for_references_labelable_004  — Rust-only: form-associated but not labelable (`fieldset`, `object`), and a custom element
//!   v6_label_for_references_labelable_005  — Rust-only: an empty `for` matches an empty `id`

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const MESSAGE: &str = "The \"for\" attribute of the \"label\" element must reference a labelable element";

fn run(html: &str) -> Vec<Brief> {
    run_with(html, serde_json::json!([]))
}

fn run_with(html: &str, pretenders: serde_json::Value) -> Vec<Brief> {
    lint_brief(
        "label-for-references-labelable",
        html,
        serde_json::json!({ "rules": { "label-for-references-labelable": true }, "pretenders": pretenders }),
    )
}

/// TS: `[label-for-references-labelable-valid-001]` — for attribute references input element
#[test]
fn label_for_references_labelable_valid_001() {
    const _ID: &str = "label-for-references-labelable-valid-001";
    assert_eq!(run(r#"<label for="u">Username</label><input type="text" id="u">"#), []);
}

/// TS: `[label-for-references-labelable-valid-002]` — no for attribute on label
#[test]
fn label_for_references_labelable_valid_002() {
    const _ID: &str = "label-for-references-labelable-valid-002";
    assert_eq!(run(r#"<label>Text<input type="text"></label>"#), []);
}

/// TS: `[label-for-references-labelable-valid-003]` — for attribute on non-label element ignored
#[test]
fn label_for_references_labelable_valid_003() {
    const _ID: &str = "label-for-references-labelable-valid-003";
    assert_eq!(run(r#"<output for="x">x</output><input id="x">"#), []);
}

/// TS: `[label-for-references-labelable-valid-004]` — missing target id is left to no-refer-to-non-existent-id
#[test]
fn label_for_references_labelable_valid_004() {
    const _ID: &str = "label-for-references-labelable-valid-004";
    assert_eq!(run(r#"<label for="missing">Label</label>"#), []);
}

/// TS: `[label-for-references-labelable-valid-005]` — labelable target: button
#[test]
fn label_for_references_labelable_valid_005() {
    const _ID: &str = "label-for-references-labelable-valid-005";
    assert_eq!(run(r#"<label for="a">a</label><button id="a"></button>"#), []);
}

/// TS: `[label-for-references-labelable-valid-006]` — labelable target: input (default type)
#[test]
fn label_for_references_labelable_valid_006() {
    const _ID: &str = "label-for-references-labelable-valid-006";
    assert_eq!(run(r#"<label for="a">a</label><input id="a">"#), []);
}

/// TS: `[label-for-references-labelable-valid-007]` — labelable target: meter
#[test]
fn label_for_references_labelable_valid_007() {
    const _ID: &str = "label-for-references-labelable-valid-007";
    assert_eq!(run(r#"<label for="a">a</label><meter id="a" value="0"></meter>"#), []);
}

/// TS: `[label-for-references-labelable-valid-008]` — labelable target: output
#[test]
fn label_for_references_labelable_valid_008() {
    const _ID: &str = "label-for-references-labelable-valid-008";
    assert_eq!(run(r#"<label for="a">a</label><output id="a"></output>"#), []);
}

/// TS: `[label-for-references-labelable-valid-009]` — labelable target: progress
#[test]
fn label_for_references_labelable_valid_009() {
    const _ID: &str = "label-for-references-labelable-valid-009";
    assert_eq!(run(r#"<label for="a">a</label><progress id="a"></progress>"#), []);
}

/// TS: `[label-for-references-labelable-valid-010]` — labelable target: select
#[test]
fn label_for_references_labelable_valid_010() {
    const _ID: &str = "label-for-references-labelable-valid-010";
    assert_eq!(
        run(r#"<label for="a">a</label><select id="a"><option>x</option></select>"#),
        []
    );
}

/// TS: `[label-for-references-labelable-valid-011]` — labelable target: textarea
#[test]
fn label_for_references_labelable_valid_011() {
    const _ID: &str = "label-for-references-labelable-valid-011";
    assert_eq!(run(r#"<label for="a">a</label><textarea id="a"></textarea>"#), []);
}

/// TS: `[label-for-references-labelable-valid-012]` — duplicate id, first tree-order element is labelable
#[test]
fn label_for_references_labelable_valid_012() {
    const _ID: &str = "label-for-references-labelable-valid-012";
    assert_eq!(
        run(r#"<input id="x"><div id="x">not labelable</div><label for="x">Label</label>"#),
        []
    );
}

/// TS: `[label-for-references-labelable-invalid-001]` — for attribute references non-labelable element (preceding div)
#[test]
fn label_for_references_labelable_invalid_001() {
    const _ID: &str = "label-for-references-labelable-invalid-001";
    assert_eq!(
        run(
            r#"<div id="notaformcontrol">Just a div</div><label for="notaformcontrol">Label for non-form-control</label>"#
        ),
        [brief(Severity::Error, 1, 55, MESSAGE, "notaformcontrol")]
    );
}

/// TS: `[label-for-references-labelable-invalid-002]` — for attribute references non-labelable element (following div)
#[test]
fn label_for_references_labelable_invalid_002() {
    const _ID: &str = "label-for-references-labelable-invalid-002";
    assert_eq!(
        run(r#"<label for="target-1">Label</label><div id="target-1">Not a labelable element</div>"#),
        [brief(Severity::Error, 1, 13, MESSAGE, "target-1")]
    );
}

/// TS: `[label-for-references-labelable-invalid-003]` — for attribute references input[type=hidden]
#[test]
fn label_for_references_labelable_invalid_003() {
    const _ID: &str = "label-for-references-labelable-invalid-003";
    assert_eq!(
        run(r#"<label for="h">Label</label><input type="hidden" id="h">"#),
        [brief(Severity::Error, 1, 13, MESSAGE, "h")]
    );
}

/// TS: `[label-for-references-labelable-invalid-004]` — fires independently for each label sharing a non-labelable target
#[test]
fn label_for_references_labelable_invalid_004() {
    const _ID: &str = "label-for-references-labelable-invalid-004";
    assert_eq!(
        run(r#"<div id="t"></div><label for="t">1</label><label for="t">2</label>"#),
        [
            brief(Severity::Error, 1, 31, MESSAGE, "t"),
            brief(Severity::Error, 1, 55, MESSAGE, "t"),
        ]
    );
}

/// TS: `[label-for-references-labelable-invalid-005]` — duplicate id, first tree-order element is non-labelable
#[test]
fn label_for_references_labelable_invalid_005() {
    const _ID: &str = "label-for-references-labelable-invalid-005";
    assert_eq!(
        run(r#"<div id="x">not labelable</div><input id="x"><label for="x">Label</label>"#),
        [brief(Severity::Error, 1, 58, MESSAGE, "x")]
    );
}

/// TS: `[label-for-references-labelable-invalid-006]` — input[TYPE="Hidden"] treated as hidden (ASCII case-insensitive)
#[test]
fn label_for_references_labelable_invalid_006() {
    const _ID: &str = "label-for-references-labelable-invalid-006";
    assert_eq!(
        run(r#"<label for="h">Label</label><input TYPE="Hidden" id="h">"#),
        [brief(Severity::Error, 1, 13, MESSAGE, "h")]
    );
}

/// A label pretended by a pretender (no `as` attribute) is skipped, as TS
/// `[label-for-references-labelable-parser-002]` pins for an unresolved JSX `<Label>`;
/// with the `as` attribute it is checked.
#[test]
fn v6_label_for_references_labelable_001() {
    assert_eq!(
        run_with(
            r#"<x-label for="t"></x-label><div id="t"></div>"#,
            serde_json::json!([{ "selector": "x-label", "as": { "element": "label", "inheritAttrs": true } }]),
        ),
        []
    );
    assert_eq!(
        run(r#"<x-label as="label" for="t"></x-label><div id="t"></div>"#),
        [brief(Severity::Error, 1, 26, MESSAGE, "t")]
    );
}

/// The target is classified by what it pretends to be, its attributes included.
#[test]
fn v6_label_for_references_labelable_002() {
    let input = serde_json::json!([{ "selector": "x-in", "as": { "element": "input", "inheritAttrs": true } }]);
    assert_eq!(
        run_with(r#"<label for="t"></label><x-in id="t"></x-in>"#, input.clone()),
        []
    );
    assert_eq!(
        run_with(r#"<label for="t"></label><x-in id="t" type="hidden"></x-in>"#, input),
        [brief(Severity::Error, 1, 13, MESSAGE, "t")]
    );
}

/// TS `getAttributeNode('for')` compares the source name as is, so an upper-case `FOR`
/// is not found.
#[test]
fn v6_label_for_references_labelable_003() {
    assert_eq!(run(r#"<label FOR="t"></label><div id="t"></div>"#), []);
}

/// `fieldset` and `object` are form-associated but not labelable; a custom element is
/// not labelable either (form-associated custom elements are not detectable statically).
#[test]
fn v6_label_for_references_labelable_004() {
    assert_eq!(
        run(r#"<label for="t"></label><fieldset id="t"></fieldset><label for="u"></label><object id="u"></object>"#),
        [
            brief(Severity::Error, 1, 13, MESSAGE, "t"),
            brief(Severity::Error, 1, 64, MESSAGE, "u"),
        ]
    );
    assert_eq!(
        run(r#"<label for="t"></label><x-c id="t"></x-c>"#),
        [brief(Severity::Error, 1, 13, MESSAGE, "t")]
    );
}

/// An empty `for` resolves to an element with an empty `id`.
#[test]
fn v6_label_for_references_labelable_005() {
    assert_eq!(
        run(r#"<label for=""></label><div id=""></div>"#),
        [brief(Severity::Error, 1, 13, MESSAGE, "")]
    );
}
