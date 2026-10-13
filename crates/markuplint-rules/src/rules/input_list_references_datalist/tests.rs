//! Tests for `input-list-references-datalist` rule.
//!
//! Test ID mapping (TS → Rust):
//!   input-list-references-datalist-valid-001    → input_list_references_datalist_valid_001
//!   input-list-references-datalist-valid-002    → input_list_references_datalist_valid_002
//!   input-list-references-datalist-valid-003    → input_list_references_datalist_valid_003
//!   input-list-references-datalist-valid-004    → input_list_references_datalist_valid_004
//!   input-list-references-datalist-valid-005    → input_list_references_datalist_valid_005
//!   input-list-references-datalist-invalid-001  → input_list_references_datalist_invalid_001
//!   input-list-references-datalist-invalid-002  → input_list_references_datalist_invalid_002
//!   input-list-references-datalist-invalid-003  → input_list_references_datalist_invalid_003
//!   input-list-references-datalist-invalid-004  → input_list_references_datalist_invalid_004
//!   input-list-references-datalist-invalid-005  → input_list_references_datalist_invalid_005
//!   input-list-references-datalist-parser-001   — SKIPPED: needs the Vue parser (`:list` binding)
//!   v6_input_list_references_datalist_001  — Rust-only: a duplicated ID resolves to the first element in tree order
//!   v6_input_list_references_datalist_002  — Rust-only: the attribute node is looked up by its source name (`LIST` is not `list`)
//!   v6_input_list_references_datalist_003  — Rust-only: only `input` is checked
//!   v6_input_list_references_datalist_004  — Rust-only: an element pretended by a pretender is skipped, one with the `as` attribute is checked
//!   v6_input_list_references_datalist_005  — Rust-only: the target's element type is the one it pretends to be

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const MESSAGE: &str = "The \"list\" attribute of the \"input\" element must reference a \"datalist\" element";

fn run(html: &str) -> Vec<Brief> {
    run_with(html, serde_json::json!([]))
}

fn run_with(html: &str, pretenders: serde_json::Value) -> Vec<Brief> {
    lint_brief(
        "input-list-references-datalist",
        html,
        serde_json::json!({ "rules": { "input-list-references-datalist": true }, "pretenders": pretenders }),
    )
}

/// TS: `[input-list-references-datalist-valid-001]` — list attribute references actual datalist element
#[test]
fn input_list_references_datalist_valid_001() {
    const _ID: &str = "input-list-references-datalist-valid-001";
    assert_eq!(
        run(r#"<input type="text" list="colors"><datalist id="colors"><option value="Red"></option></datalist>"#),
        []
    );
}

/// TS: `[input-list-references-datalist-valid-002]` — no list attribute on input
#[test]
fn input_list_references_datalist_valid_002() {
    const _ID: &str = "input-list-references-datalist-valid-002";
    assert_eq!(run(r#"<input type="text">"#), []);
}

/// TS: `[input-list-references-datalist-valid-003]` — list attribute on non-input element ignored
#[test]
fn input_list_references_datalist_valid_003() {
    const _ID: &str = "input-list-references-datalist-valid-003";
    assert_eq!(run(r#"<div list="anything">x</div>"#), []);
}

/// TS: `[input-list-references-datalist-valid-004]` — missing target id is left to no-refer-to-non-existent-id
#[test]
fn input_list_references_datalist_valid_004() {
    const _ID: &str = "input-list-references-datalist-valid-004";
    assert_eq!(run(r#"<input type="text" list="missing">"#), []);
}

/// TS: `[input-list-references-datalist-invalid-001]` — list attribute references non-datalist element (following div)
#[test]
fn input_list_references_datalist_invalid_001() {
    const _ID: &str = "input-list-references-datalist-invalid-001";
    assert_eq!(
        run(r#"<input type="text" list="notdatalist"><div id="notdatalist">Not a datalist</div>"#),
        [brief(Severity::Error, 1, 26, MESSAGE, "notdatalist")]
    );
}

/// TS: `[input-list-references-datalist-invalid-002]` — list attribute references non-datalist element (preceding div)
#[test]
fn input_list_references_datalist_invalid_002() {
    const _ID: &str = "input-list-references-datalist-invalid-002";
    assert_eq!(
        run(r#"<div id="target-1">Not a datalist</div><input type="text" list="target-1">"#),
        [brief(Severity::Error, 1, 65, MESSAGE, "target-1")]
    );
}

/// TS: `[input-list-references-datalist-invalid-003]` — list attribute references span element
#[test]
fn input_list_references_datalist_invalid_003() {
    const _ID: &str = "input-list-references-datalist-invalid-003";
    assert_eq!(
        run(r#"<input type="text" list="target"><span id="target">not datalist</span>"#),
        [brief(Severity::Error, 1, 26, MESSAGE, "target")]
    );
}

/// TS: `[input-list-references-datalist-invalid-004]` — fires independently for each input sharing a non-datalist target
#[test]
fn input_list_references_datalist_invalid_004() {
    const _ID: &str = "input-list-references-datalist-invalid-004";
    assert_eq!(
        run(
            r#"<div id="notdatalist"></div><input type="text" list="notdatalist"><input type="text" list="notdatalist">"#
        ),
        [
            brief(Severity::Error, 1, 54, MESSAGE, "notdatalist"),
            brief(Severity::Error, 1, 92, MESSAGE, "notdatalist"),
        ]
    );
}

/// TS: `[input-list-references-datalist-invalid-005]` — list on input[type=hidden] still requires a datalist target
#[test]
fn input_list_references_datalist_invalid_005() {
    const _ID: &str = "input-list-references-datalist-invalid-005";
    assert_eq!(
        run(r#"<input type="hidden" list="notdatalist"><div id="notdatalist"></div>"#),
        [brief(Severity::Error, 1, 28, MESSAGE, "notdatalist")]
    );
}

/// TS: `[input-list-references-datalist-valid-005]` — list on input[type=hidden] pointing at a datalist is accepted
#[test]
fn input_list_references_datalist_valid_005() {
    const _ID: &str = "input-list-references-datalist-valid-005";
    assert_eq!(
        run(r#"<input type="hidden" list="colors"><datalist id="colors"><option value="Red"></option></datalist>"#),
        []
    );
}

/// The first element with the ID in tree order is the target.
#[test]
fn v6_input_list_references_datalist_001() {
    assert_eq!(
        run(r#"<datalist id="x"></datalist><div id="x"></div><input list="x">"#),
        []
    );
    assert_eq!(
        run(r#"<div id="x"></div><datalist id="x"></datalist><input list="x">"#),
        [brief(Severity::Error, 1, 60, MESSAGE, "x")]
    );
}

/// TS `getAttributeNode('list')` compares the source name as is, so an upper-case
/// `LIST` is not found.
#[test]
fn v6_input_list_references_datalist_002() {
    assert_eq!(run(r#"<div id="x"></div><input LIST="x">"#), []);
}

/// Only `input` is checked.
#[test]
fn v6_input_list_references_datalist_003() {
    assert_eq!(
        run(r#"<div id="x"></div><select list="x"></select><textarea list="x"></textarea>"#),
        []
    );
}

/// A pretended element without the `as` attribute is skipped; with it, it is checked.
#[test]
fn v6_input_list_references_datalist_004() {
    assert_eq!(
        run_with(
            r#"<div id="d"></div><x-input list="d"></x-input>"#,
            serde_json::json!([{ "selector": "x-input", "as": { "element": "input", "inheritAttrs": true } }]),
        ),
        []
    );
    assert_eq!(
        run(r#"<div id="d"></div><x-input as="input" list="d"></x-input>"#),
        [brief(Severity::Error, 1, 45, MESSAGE, "d")]
    );
}

/// The target is classified by what it pretends to be.
#[test]
fn v6_input_list_references_datalist_005() {
    assert_eq!(
        run_with(
            r#"<x-dl id="d"></x-dl><input list="d">"#,
            serde_json::json!([{ "selector": "x-dl", "as": { "element": "datalist", "inheritAttrs": true } }]),
        ),
        []
    );
}
