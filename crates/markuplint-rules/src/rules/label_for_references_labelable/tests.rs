//! Tests for `label-for-references-labelable` rule.
//!
//! Test ID mapping (TS → Rust):
//!   label-for-references-labelable-001  → label_for_references_labelable_001
//!   label-for-references-labelable-002  → label_for_references_labelable_002
//!   label-for-references-labelable-003  → label_for_references_labelable_003
//!   label-for-references-labelable-004  → label_for_references_labelable_004
//!   label-for-references-labelable-005  → label_for_references_labelable_005
//!   label-for-references-labelable-006  → label_for_references_labelable_006
//!   label-for-references-labelable-007  → label_for_references_labelable_007
//!   label-for-references-labelable-008  → label_for_references_labelable_008
//!   label-for-references-labelable-009  → label_for_references_labelable_009
//!   label-for-references-labelable-010  → label_for_references_labelable_010
//!   label-for-references-labelable-011  → label_for_references_labelable_011
//!   label-for-references-labelable-012  → label_for_references_labelable_012
//!   label-for-references-labelable-013  → label_for_references_labelable_013
//!   label-for-references-labelable-014  → label_for_references_labelable_014
//!   label-for-references-labelable-015  → label_for_references_labelable_015
//!   label-for-references-labelable-016  → label_for_references_labelable_016
//!   label-for-references-labelable-017  → label_for_references_labelable_017
//!   label-for-references-labelable-018  → label_for_references_labelable_018
//!   label-for-references-labelable-019  — SKIPPED: needs the Vue parser (`:for` binding)
//!   label-for-references-labelable-020  — SKIPPED: needs the JSX parser (unresolved `<Label>` pretender);
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

/// TS: `[label-for-references-labelable-001]` — for attribute references input element
#[test]
fn label_for_references_labelable_001() {
    const _ID: &str = "label-for-references-labelable-001";
    assert_eq!(run(r#"<label for="u">Username</label><input type="text" id="u">"#), []);
}

/// TS: `[label-for-references-labelable-002]` — no for attribute on label
#[test]
fn label_for_references_labelable_002() {
    const _ID: &str = "label-for-references-labelable-002";
    assert_eq!(run(r#"<label>Text<input type="text"></label>"#), []);
}

/// TS: `[label-for-references-labelable-003]` — for attribute on non-label element ignored
#[test]
fn label_for_references_labelable_003() {
    const _ID: &str = "label-for-references-labelable-003";
    assert_eq!(run(r#"<output for="x">x</output><input id="x">"#), []);
}

/// TS: `[label-for-references-labelable-004]` — missing target id is left to no-refer-to-non-existent-id
#[test]
fn label_for_references_labelable_004() {
    const _ID: &str = "label-for-references-labelable-004";
    assert_eq!(run(r#"<label for="missing">Label</label>"#), []);
}

/// TS: `[label-for-references-labelable-005]` — labelable target: button
#[test]
fn label_for_references_labelable_005() {
    const _ID: &str = "label-for-references-labelable-005";
    assert_eq!(run(r#"<label for="a">a</label><button id="a"></button>"#), []);
}

/// TS: `[label-for-references-labelable-006]` — labelable target: input (default type)
#[test]
fn label_for_references_labelable_006() {
    const _ID: &str = "label-for-references-labelable-006";
    assert_eq!(run(r#"<label for="a">a</label><input id="a">"#), []);
}

/// TS: `[label-for-references-labelable-007]` — labelable target: meter
#[test]
fn label_for_references_labelable_007() {
    const _ID: &str = "label-for-references-labelable-007";
    assert_eq!(run(r#"<label for="a">a</label><meter id="a" value="0"></meter>"#), []);
}

/// TS: `[label-for-references-labelable-008]` — labelable target: output
#[test]
fn label_for_references_labelable_008() {
    const _ID: &str = "label-for-references-labelable-008";
    assert_eq!(run(r#"<label for="a">a</label><output id="a"></output>"#), []);
}

/// TS: `[label-for-references-labelable-009]` — labelable target: progress
#[test]
fn label_for_references_labelable_009() {
    const _ID: &str = "label-for-references-labelable-009";
    assert_eq!(run(r#"<label for="a">a</label><progress id="a"></progress>"#), []);
}

/// TS: `[label-for-references-labelable-010]` — labelable target: select
#[test]
fn label_for_references_labelable_010() {
    const _ID: &str = "label-for-references-labelable-010";
    assert_eq!(
        run(r#"<label for="a">a</label><select id="a"><option>x</option></select>"#),
        []
    );
}

/// TS: `[label-for-references-labelable-011]` — labelable target: textarea
#[test]
fn label_for_references_labelable_011() {
    const _ID: &str = "label-for-references-labelable-011";
    assert_eq!(run(r#"<label for="a">a</label><textarea id="a"></textarea>"#), []);
}

/// TS: `[label-for-references-labelable-012]` — duplicate id, first tree-order element is labelable
#[test]
fn label_for_references_labelable_012() {
    const _ID: &str = "label-for-references-labelable-012";
    assert_eq!(
        run(r#"<input id="x"><div id="x">not labelable</div><label for="x">Label</label>"#),
        []
    );
}

/// TS: `[label-for-references-labelable-013]` — for attribute references non-labelable element (preceding div)
#[test]
fn label_for_references_labelable_013() {
    const _ID: &str = "label-for-references-labelable-013";
    assert_eq!(
        run(
            r#"<div id="notaformcontrol">Just a div</div><label for="notaformcontrol">Label for non-form-control</label>"#
        ),
        [brief(Severity::Error, 1, 55, MESSAGE, "notaformcontrol")]
    );
}

/// TS: `[label-for-references-labelable-014]` — for attribute references non-labelable element (following div)
#[test]
fn label_for_references_labelable_014() {
    const _ID: &str = "label-for-references-labelable-014";
    assert_eq!(
        run(r#"<label for="target-1">Label</label><div id="target-1">Not a labelable element</div>"#),
        [brief(Severity::Error, 1, 13, MESSAGE, "target-1")]
    );
}

/// TS: `[label-for-references-labelable-015]` — for attribute references input[type=hidden]
#[test]
fn label_for_references_labelable_015() {
    const _ID: &str = "label-for-references-labelable-015";
    assert_eq!(
        run(r#"<label for="h">Label</label><input type="hidden" id="h">"#),
        [brief(Severity::Error, 1, 13, MESSAGE, "h")]
    );
}

/// TS: `[label-for-references-labelable-016]` — fires independently for each label sharing a non-labelable target
#[test]
fn label_for_references_labelable_016() {
    const _ID: &str = "label-for-references-labelable-016";
    assert_eq!(
        run(r#"<div id="t"></div><label for="t">1</label><label for="t">2</label>"#),
        [
            brief(Severity::Error, 1, 31, MESSAGE, "t"),
            brief(Severity::Error, 1, 55, MESSAGE, "t"),
        ]
    );
}

/// TS: `[label-for-references-labelable-017]` — duplicate id, first tree-order element is non-labelable
#[test]
fn label_for_references_labelable_017() {
    const _ID: &str = "label-for-references-labelable-017";
    assert_eq!(
        run(r#"<div id="x">not labelable</div><input id="x"><label for="x">Label</label>"#),
        [brief(Severity::Error, 1, 58, MESSAGE, "x")]
    );
}

/// TS: `[label-for-references-labelable-018]` — input[TYPE="Hidden"] treated as hidden (ASCII case-insensitive)
#[test]
fn label_for_references_labelable_018() {
    const _ID: &str = "label-for-references-labelable-018";
    assert_eq!(
        run(r#"<label for="h">Label</label><input TYPE="Hidden" id="h">"#),
        [brief(Severity::Error, 1, 13, MESSAGE, "h")]
    );
}

/// A label pretended by a pretender (no `as` attribute) is skipped, as TS
/// `[label-for-references-labelable-020]` pins for an unresolved JSX `<Label>`;
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

/// `FOR` is the `for` attribute of an HTML element, as the DOM names it (TS
/// `getAttrNode()` asks `MLAttr#isNamedBy`, #4309).
#[test]
fn v6_label_for_references_labelable_003() {
    assert_eq!(
        run(r#"<label FOR="t"></label><div id="t"></div>"#),
        [brief(Severity::Error, 1, 13, MESSAGE, "t")]
    );
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

/// An empty `for` resolves to no element: an empty `id` is no id of the tree. Expected value is
/// the TS output.
#[test]
fn v6_label_for_references_labelable_005() {
    assert_eq!(run(r#"<label for=""></label><div id=""></div>"#), []);
}
