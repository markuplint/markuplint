//! Tests for `no-extra-selected-options` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-extra-selected-options-valid-001    → no_extra_selected_options_valid_001
//!   no-extra-selected-options-valid-002    → no_extra_selected_options_valid_002
//!   no-extra-selected-options-valid-003    → no_extra_selected_options_valid_003
//!   no-extra-selected-options-valid-004    → no_extra_selected_options_valid_004
//!   no-extra-selected-options-invalid-001  → no_extra_selected_options_invalid_001
//!   no-extra-selected-options-invalid-002  → no_extra_selected_options_invalid_002
//!   no-extra-selected-options-invalid-003  → no_extra_selected_options_invalid_003
//!   v6_no_extra_selected_options_001       — Rust-only: attribute names are case-insensitive
//!   v6_no_extra_selected_options_002       — Rust-only: what the parser leaves directly in the select
//!   v6_no_extra_selected_options_003       — Rust-only: a pretender select is skipped unless `as` pins it
//!
//! Expected values of the `v6_*` tests come from running the TS rule.

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

fn run(html: &str) -> Vec<Brief> {
    lint_brief(
        "no-extra-selected-options",
        html,
        serde_json::json!({ "rules": { "no-extra-selected-options": true } }),
    )
}

const MESSAGE: &str = "The \"select\" element cannot have more than one selected \"option\" descendant unless the \"multiple\" attribute is specified";

/// TS: `[no-extra-selected-options-valid-001]` — zero selected options
#[test]
fn no_extra_selected_options_valid_001() {
    const _ID: &str = "no-extra-selected-options-valid-001";
    assert_eq!(run("<select><option>a</option><option>b</option></select>"), []);
}

/// TS: `[no-extra-selected-options-valid-002]` — exactly one selected option
#[test]
fn no_extra_selected_options_valid_002() {
    const _ID: &str = "no-extra-selected-options-valid-002";
    assert_eq!(
        run("<select><option selected>a</option><option>b</option></select>"),
        []
    );
}

/// TS: `[no-extra-selected-options-valid-003]` — multiple selected with multiple attribute
#[test]
fn no_extra_selected_options_valid_003() {
    const _ID: &str = "no-extra-selected-options-valid-003";
    assert_eq!(
        run("<select multiple><option selected>a</option><option selected>b</option></select>"),
        []
    );
}

/// TS: `[no-extra-selected-options-valid-004]` — selected options inside optgroup respected
#[test]
fn no_extra_selected_options_valid_004() {
    const _ID: &str = "no-extra-selected-options-valid-004";
    assert_eq!(
        run(r#"<select><optgroup label="g"><option selected>a</option><option>b</option></optgroup></select>"#),
        []
    );
}

/// TS: `[no-extra-selected-options-invalid-001]` — two selected options without multiple
#[test]
fn no_extra_selected_options_invalid_001() {
    const _ID: &str = "no-extra-selected-options-invalid-001";
    assert_eq!(
        run("<select><option selected>a</option><option selected>b</option></select>"),
        [brief(Severity::Error, 1, 36, MESSAGE, "<option selected>")]
    );
}

/// TS: `[no-extra-selected-options-invalid-002]` — selected spans select and optgroup descendants
#[test]
fn no_extra_selected_options_invalid_002() {
    const _ID: &str = "no-extra-selected-options-invalid-002";
    let violations = run(
        r#"<select><option selected>a</option><optgroup label="g"><option selected>b</option></optgroup></select>"#,
    );
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].1, 1);
    assert_eq!(violations[0].2, 56);
}

/// TS: `[no-extra-selected-options-invalid-003]` — three selected reports two excess
#[test]
fn no_extra_selected_options_invalid_003() {
    const _ID: &str = "no-extra-selected-options-invalid-003";
    let violations =
        run("<select><option selected>a</option><option selected>b</option><option selected>c</option></select>");
    assert_eq!(violations.len(), 2);
    assert_eq!(violations.iter().map(|v| v.2).collect::<Vec<_>>(), [36, 63]);
}

/// `multiple` and `selected` are found whatever their case or value.
#[test]
fn v6_no_extra_selected_options_001() {
    assert_eq!(
        run("<select MULTIPLE><option selected>a</option><option selected>b</option></select>"),
        []
    );
    assert_eq!(
        run(r#"<select multiple="false"><option selected>a</option><option selected>b</option></select>"#),
        []
    );
    assert_eq!(
        run("<select><option SELECTED>a</option><option selected>b</option></select>"),
        [brief(Severity::Error, 1, 36, MESSAGE, "<option selected>")]
    );
}

/// The options counted are the select's children and its optgroups' children, in document order,
/// as the parser leaves them: a nested `<optgroup>` closes the open one.
///
/// Not asserted here: `<select><div><option selected>a</option></div><option selected>b</option>
/// </select>`. TS reports the second option (col 47) because its parser drops the `<div>`; the
/// Rust parser keeps it (the customizable-select parsing of the current HTML LS), so the first
/// option is no child of the select and nothing is reported. The rule is the same on both sides.
#[test]
fn v6_no_extra_selected_options_002() {
    assert_eq!(
        run(
            r#"<select><optgroup label="g"><option selected>a</option></optgroup><option selected>b</option></select>"#
        ),
        [brief(Severity::Error, 1, 67, MESSAGE, "<option selected>")]
    );
    assert_eq!(
        run(
            r#"<select><optgroup label="g"><optgroup label="h"><option selected>a</option></optgroup></optgroup><option selected>b</option></select>"#
        ),
        [brief(Severity::Error, 1, 98, MESSAGE, "<option selected>")]
    );
    assert_eq!(
        run("<select>\n  <option selected>a</option>\n  <option selected>b</option>\n</select>"),
        [brief(Severity::Error, 3, 3, MESSAGE, "<option selected>")]
    );
}

/// A select a pretender makes has unknown descendants, unless the `as` attribute pins it.
#[test]
fn v6_no_extra_selected_options_003() {
    let pretended = lint_brief(
        "no-extra-selected-options",
        "<x-select><option selected>a</option><option selected>b</option></x-select>",
        serde_json::json!({
            "rules": { "no-extra-selected-options": true },
            "pretenders": [{ "selector": "x-select", "as": { "element": "select", "inheritAttrs": true } }],
        }),
    );
    assert_eq!(pretended, []);
    assert_eq!(
        run(r#"<x-select as="select"><option selected>a</option><option selected>b</option></x-select>"#),
        [brief(Severity::Error, 1, 50, MESSAGE, "<option selected>")]
    );
}
