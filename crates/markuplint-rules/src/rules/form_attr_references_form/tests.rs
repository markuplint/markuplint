//! Tests for `form-attr-references-form` rule.
//!
//! Test ID mapping (TS → Rust):
//!   form-attr-references-form-valid-001    → form_attr_references_form_valid_001
//!   form-attr-references-form-valid-002    → form_attr_references_form_valid_002
//!   form-attr-references-form-valid-003    → form_attr_references_form_valid_003
//!   form-attr-references-form-valid-004    → form_attr_references_form_valid_004
//!   form-attr-references-form-invalid-001  → form_attr_references_form_invalid_001
//!   form-attr-references-form-invalid-002  → form_attr_references_form_invalid_002
//!   v6_form_attr_references_form_001  — Rust-only: `label` and `object` are form-associated too
//!   v6_form_attr_references_form_002  — Rust-only: a duplicated ID resolves to the first element in tree order
//!   v6_form_attr_references_form_003  — Rust-only: an empty `form` matches an empty `id`
//!   v6_form_attr_references_form_004  — Rust-only: the attribute node is looked up by its source name (`FORM` is not `form`)
//!   v6_form_attr_references_form_005  — Rust-only: an element pretended by a pretender is skipped, one with the `as` attribute is checked
//!   v6_form_attr_references_form_006  — Rust-only: the target's element type is the one it pretends to be

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const MESSAGE: &str = "The \"form\" attribute on a form-associated element must reference a \"form\" element";

fn run(html: &str) -> Vec<Brief> {
    run_with(html, serde_json::json!([]))
}

fn run_with(html: &str, pretenders: serde_json::Value) -> Vec<Brief> {
    lint_brief(
        "form-attr-references-form",
        html,
        serde_json::json!({ "rules": { "form-attr-references-form": true }, "pretenders": pretenders }),
    )
}

/// TS: `[form-attr-references-form-valid-001]` — form attribute references actual form element
#[test]
fn form_attr_references_form_valid_001() {
    const _ID: &str = "form-attr-references-form-valid-001";
    assert_eq!(run(r#"<form id="form1"></form><input type="text" form="form1">"#), []);
}

/// TS: `[form-attr-references-form-valid-002]` — no form attribute on form-associated element
#[test]
fn form_attr_references_form_valid_002() {
    const _ID: &str = "form-attr-references-form-valid-002";
    assert_eq!(run(r#"<input type="text">"#), []);
}

/// TS: `[form-attr-references-form-valid-003]` — form attribute on non form-associated element ignored
#[test]
fn form_attr_references_form_valid_003() {
    const _ID: &str = "form-attr-references-form-valid-003";
    assert_eq!(run(r#"<div form="anything">x</div>"#), []);
}

/// TS: `[form-attr-references-form-valid-004]` — missing target id is left to no-refer-to-non-existent-id
#[test]
fn form_attr_references_form_valid_004() {
    const _ID: &str = "form-attr-references-form-valid-004";
    assert_eq!(run(r#"<input type="text" form="missing">"#), []);
}

/// TS: `[form-attr-references-form-invalid-001]` — form attribute references non-form element
#[test]
fn form_attr_references_form_invalid_001() {
    const _ID: &str = "form-attr-references-form-invalid-001";
    assert_eq!(
        run(r#"<div id="notaform">Not a form</div><input type="text" form="notaform">"#),
        [brief(Severity::Error, 1, 61, MESSAGE, "notaform")]
    );
}

/// TS: `[form-attr-references-form-invalid-002]` — applies to all form-associated elements
#[test]
fn form_attr_references_form_invalid_002() {
    const _ID: &str = "form-attr-references-form-invalid-002";
    let cases = [
        ("button", r#"<div id="x">x</div><button form="x">b</button>"#),
        ("fieldset", r#"<div id="x">x</div><fieldset form="x"></fieldset>"#),
        (
            "select",
            r#"<div id="x">x</div><select form="x"><option>a</option></select>"#,
        ),
        ("textarea", r#"<div id="x">x</div><textarea form="x"></textarea>"#),
        ("output", r#"<div id="x">x</div><output form="x"></output>"#),
        ("meter", r#"<div id="x">x</div><meter form="x" value="0.5"></meter>"#),
        (
            "progress",
            r#"<div id="x">x</div><progress form="x" value="0.5"></progress>"#,
        ),
    ];
    for (name, src) in cases {
        assert!(!run(src).is_empty(), "{name}: should fire");
    }
}

/// `label` and `object` complete the list of form-associated elements.
#[test]
fn v6_form_attr_references_form_001() {
    assert_eq!(
        run(r#"<div id="x"></div><label form="x"></label><object form="x"></object>"#),
        [
            brief(Severity::Error, 1, 32, MESSAGE, "x"),
            brief(Severity::Error, 1, 57, MESSAGE, "x"),
        ]
    );
}

/// The first element with the ID in tree order is the target.
#[test]
fn v6_form_attr_references_form_002() {
    assert_eq!(run(r#"<form id="x"></form><div id="x"></div><input form="x">"#), []);
    assert_eq!(
        run(r#"<div id="x"></div><form id="x"></form><input form="x">"#),
        [brief(Severity::Error, 1, 52, MESSAGE, "x")]
    );
}

/// An empty `form` resolves to an element with an empty `id`.
#[test]
fn v6_form_attr_references_form_003() {
    assert_eq!(
        run(r#"<div id=""></div><input form="">"#),
        [brief(Severity::Error, 1, 31, MESSAGE, "")]
    );
}

/// TS `getAttributeNode('form')` compares the source name as is, so an upper-case
/// `FORM` is not found.
#[test]
fn v6_form_attr_references_form_004() {
    assert_eq!(run(r#"<div id="x"></div><input FORM="x">"#), []);
}

/// A pretended element without the `as` attribute is skipped; with it, it is checked.
#[test]
fn v6_form_attr_references_form_005() {
    assert_eq!(
        run_with(
            r#"<div id="d"></div><x-input form="d"></x-input>"#,
            serde_json::json!([{ "selector": "x-input", "as": { "element": "input", "inheritAttrs": true } }]),
        ),
        []
    );
    assert_eq!(
        run(r#"<div id="d"></div><x-input as="input" form="d"></x-input>"#),
        [brief(Severity::Error, 1, 45, MESSAGE, "d")]
    );
}

/// The target is classified by what it pretends to be. A bare-name pretender has no
/// attributes, so its `id` does not resolve.
#[test]
fn v6_form_attr_references_form_006() {
    assert_eq!(
        run_with(
            r#"<x-form id="f"></x-form><input form="f">"#,
            serde_json::json!([{ "selector": "x-form", "as": { "element": "form", "inheritAttrs": true } }]),
        ),
        []
    );
    assert_eq!(
        run_with(
            r#"<x-form id="f"></x-form><input form="f">"#,
            serde_json::json!([{ "selector": "x-form", "as": "form" }]),
        ),
        []
    );
    assert_eq!(
        run_with(
            r#"<x-div id="f"></x-div><input form="f">"#,
            serde_json::json!([{ "selector": "x-div", "as": { "element": "div", "inheritAttrs": true } }]),
        ),
        [brief(Severity::Error, 1, 36, MESSAGE, "f")]
    );
}
