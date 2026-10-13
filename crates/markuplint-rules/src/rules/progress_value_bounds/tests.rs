//! Tests for `progress-value-bounds` rule.
//!
//! Test ID mapping (TS → Rust):
//!   progress-value-bounds-valid-001    → progress_value_bounds_valid_001
//!   progress-value-bounds-valid-002    → progress_value_bounds_valid_002
//!   progress-value-bounds-valid-003    → progress_value_bounds_valid_003
//!   progress-value-bounds-valid-004    → progress_value_bounds_valid_004
//!   progress-value-bounds-valid-005    → progress_value_bounds_valid_005
//!   progress-value-bounds-invalid-001  → progress_value_bounds_invalid_001
//!   progress-value-bounds-invalid-002  → progress_value_bounds_invalid_002
//!   progress-value-bounds-valid-006    → progress_value_bounds_valid_006
//!   progress-value-bounds-valid-007    → progress_value_bounds_valid_007
//!   progress-value-bounds-valid-008    → progress_value_bounds_valid_008
//!   progress-value-bounds-valid-009    → progress_value_bounds_valid_009
//!   progress-value-bounds-parser-001   — SKIPPED: needs `@markuplint/jsx-parser` (`<MyProgress>`);
//!                                        the same pretender case runs on HTML in v6_..._003
//!   progress-value-bounds-parser-002   — SKIPPED: needs `@markuplint/jsx-parser` (`<MyProgress as>`);
//!                                        the same `as` case runs on HTML in v6_..._003
//!   v6_progress_value_bounds_001       — Rust-only: values are read with JS `Number()` semantics
//!   v6_progress_value_bounds_002       — Rust-only: attribute names are matched as written
//!   v6_progress_value_bounds_003       — Rust-only: a pretender progress is skipped unless `as` pins it
//!
//! Expected values of the `v6_*` tests come from running the TS rule.

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

fn run(html: &str) -> Vec<Brief> {
    lint_brief(
        "progress-value-bounds",
        html,
        serde_json::json!({ "rules": { "progress-value-bounds": true } }),
    )
}

const VALUE_LE_MAX: &str =
    "The value of the \"value\" attribute must be less than or equal to the value of the \"max\" attribute";
const VALUE_LE_ONE: &str =
    "The value of the \"value\" attribute must be less than or equal to one when the \"max\" attribute is absent";

/// TS: `[progress-value-bounds-valid-001]` — progress without any attributes
#[test]
fn progress_value_bounds_valid_001() {
    const _ID: &str = "progress-value-bounds-valid-001";
    assert_eq!(run("<progress>50%</progress>"), []);
}

/// TS: `[progress-value-bounds-valid-002]` — progress with value within default max (1)
#[test]
fn progress_value_bounds_valid_002() {
    const _ID: &str = "progress-value-bounds-valid-002";
    assert_eq!(run(r#"<progress value="0.5">half</progress>"#), []);
}

/// TS: `[progress-value-bounds-valid-003]` — progress with value equal to default max (1)
#[test]
fn progress_value_bounds_valid_003() {
    const _ID: &str = "progress-value-bounds-valid-003";
    assert_eq!(run(r#"<progress value="1">done</progress>"#), []);
}

/// TS: `[progress-value-bounds-valid-004]` — progress with value within explicit max
#[test]
fn progress_value_bounds_valid_004() {
    const _ID: &str = "progress-value-bounds-valid-004";
    assert_eq!(run(r#"<progress value="30" max="100">30%</progress>"#), []);
}

/// TS: `[progress-value-bounds-valid-005]` — progress with value equal to explicit max
#[test]
fn progress_value_bounds_valid_005() {
    const _ID: &str = "progress-value-bounds-valid-005";
    assert_eq!(run(r#"<progress value="100" max="100">done</progress>"#), []);
}

/// TS: `[progress-value-bounds-invalid-001]` — value exceeds explicit max
#[test]
fn progress_value_bounds_invalid_001() {
    const _ID: &str = "progress-value-bounds-invalid-001";
    assert_eq!(
        run(r#"<progress value="10" max="5">10 of 5</progress>"#),
        [brief(Severity::Error, 1, 18, VALUE_LE_MAX, "10")]
    );
}

/// TS: `[progress-value-bounds-invalid-002]` — value exceeds default max (1)
#[test]
fn progress_value_bounds_invalid_002() {
    const _ID: &str = "progress-value-bounds-invalid-002";
    assert_eq!(
        run(r#"<progress value="1.5">150%</progress>"#),
        [brief(Severity::Error, 1, 18, VALUE_LE_ONE, "1.5")]
    );
}

/// TS: `[progress-value-bounds-valid-006]` — non-numeric literal value is left to
/// no-invalid-attr-value
#[test]
fn progress_value_bounds_valid_006() {
    const _ID: &str = "progress-value-bounds-valid-006";
    assert_eq!(run(r#"<progress value="{{ v }}" max="10">{{ v }}</progress>"#), []);
}

/// TS: `[progress-value-bounds-valid-007]` — unparsable value is left to no-invalid-attr-value
#[test]
fn progress_value_bounds_valid_007() {
    const _ID: &str = "progress-value-bounds-valid-007";
    assert_eq!(run(r#"<progress value="abc" max="10">abc</progress>"#), []);
}

/// TS: `[progress-value-bounds-valid-008]` — unparsable max is left to no-invalid-attr-value
#[test]
fn progress_value_bounds_valid_008() {
    const _ID: &str = "progress-value-bounds-valid-008";
    assert_eq!(run(r#"<progress value="0.5" max="abc">50%</progress>"#), []);
}

/// TS: `[progress-value-bounds-valid-009]` — progress with only max attribute (no value)
#[test]
fn progress_value_bounds_valid_009() {
    const _ID: &str = "progress-value-bounds-valid-009";
    assert_eq!(run(r#"<progress max="50">unknown</progress>"#), []);
}

/// Values are read as JS `Number()` reads them. A blank `max` is not a number, so the element is
/// skipped rather than compared against the default; a non-positive `max` is still compared.
#[test]
fn v6_progress_value_bounds_001() {
    assert_eq!(
        run(r#"<progress value="0x10" max="0xF">x</progress>"#),
        [brief(Severity::Error, 1, 18, VALUE_LE_MAX, "0x10")]
    );
    assert_eq!(run(r#"<progress value="2" max="">x</progress>"#), []);
    assert_eq!(run(r#"<progress value="2" max=" ">x</progress>"#), []);
    assert_eq!(run(r#"<progress value="1e0">x</progress>"#), []);
    assert_eq!(run(r#"<progress value="Infinity">x</progress>"#), []);
    assert_eq!(
        run(r#"<progress value="5" max="-1">x</progress>"#),
        [brief(Severity::Error, 1, 18, VALUE_LE_MAX, "5")]
    );
}

/// TS `getAttributeNode()` matches the attribute name as written: an upper-case `VALUE` is not
/// found, and an upper-case `MAX` counts as absent.
#[test]
fn v6_progress_value_bounds_002() {
    assert_eq!(run(r#"<progress VALUE="5">x</progress>"#), []);
    assert_eq!(
        run(r#"<progress value="5" MAX="10">x</progress>"#),
        [brief(Severity::Error, 1, 18, VALUE_LE_ONE, "5")]
    );
}

/// TS `[progress-value-bounds-parser-001]` / `[progress-value-bounds-parser-002]` on HTML: a
/// progress a pretender makes has unknown attributes, unless the `as` attribute pins it.
#[test]
fn v6_progress_value_bounds_003() {
    let pretended = lint_brief(
        "progress-value-bounds",
        r#"<x-progress value="10" max="5">x</x-progress>"#,
        serde_json::json!({
            "rules": { "progress-value-bounds": true },
            "pretenders": [{ "selector": "x-progress", "as": { "element": "progress", "inheritAttrs": true } }],
        }),
    );
    assert_eq!(pretended, []);
    assert_eq!(
        run(r#"<x-progress as="progress" value="10" max="5">x</x-progress>"#),
        [brief(Severity::Error, 1, 34, VALUE_LE_MAX, "10")]
    );
}
