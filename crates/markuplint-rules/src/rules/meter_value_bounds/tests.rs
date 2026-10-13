//! Tests for `meter-value-bounds` rule.
//!
//! Test ID mapping (TS → Rust):
//!   meter-value-bounds-valid-001    → meter_value_bounds_valid_001
//!   meter-value-bounds-valid-002    → meter_value_bounds_valid_002
//!   meter-value-bounds-valid-003    → meter_value_bounds_valid_003
//!   meter-value-bounds-valid-004    → meter_value_bounds_valid_004
//!   meter-value-bounds-invalid-001  → meter_value_bounds_invalid_001
//!   meter-value-bounds-invalid-002  → meter_value_bounds_invalid_002
//!   meter-value-bounds-invalid-003  → meter_value_bounds_invalid_003
//!   meter-value-bounds-invalid-004  → meter_value_bounds_invalid_004
//!   meter-value-bounds-invalid-005  → meter_value_bounds_invalid_005
//!   meter-value-bounds-invalid-006  → meter_value_bounds_invalid_006
//!   meter-value-bounds-invalid-007  → meter_value_bounds_invalid_007
//!   meter-value-bounds-invalid-008  → meter_value_bounds_invalid_008
//!   meter-value-bounds-valid-005    → meter_value_bounds_valid_005
//!   meter-value-bounds-valid-006    → meter_value_bounds_valid_006
//!   v6_meter_value_bounds_001       — Rust-only: values are read with JS `Number()` semantics
//!   v6_meter_value_bounds_002       — Rust-only: every inequality reported, at the lower attribute
//!   v6_meter_value_bounds_003       — Rust-only: an implied value is reported at the element
//!   v6_meter_value_bounds_004       — Rust-only: attribute names are matched as written
//!   v6_meter_value_bounds_005       — Rust-only: a pretender meter is skipped unless `as` pins it
//!
//! Expected values of the `v6_*` tests come from running the TS rule. TS lists violations in
//! the order the rule reports them; the Rust engine sorts them by position, so where a test
//! has several, they are listed here in position order.

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

fn run(html: &str) -> Vec<Brief> {
    lint_brief(
        "meter-value-bounds",
        html,
        serde_json::json!({ "rules": { "meter-value-bounds": true } }),
    )
}

fn messages(html: &str) -> Vec<String> {
    run(html).into_iter().map(|(_, _, _, message, _)| message).collect()
}

fn assert_has(messages: &[String], expected: &str) {
    assert!(messages.iter().any(|m| m == expected), "{expected} not in {messages:?}");
}

const VALUE_LE_MAX: &str =
    "The value of the \"value\" attribute must be less than or equal to the value of the \"max\" attribute";
const VALUE_LE_ONE: &str =
    "The value of the \"value\" attribute must be less than or equal to one when the \"max\" attribute is absent";

/// TS: `[meter-value-bounds-valid-001]` — meter without any attributes
#[test]
fn meter_value_bounds_valid_001() {
    const _ID: &str = "meter-value-bounds-valid-001";
    assert_eq!(run("<meter>5</meter>"), []);
}

/// TS: `[meter-value-bounds-valid-002]` — meter with value within default bounds
#[test]
fn meter_value_bounds_valid_002() {
    const _ID: &str = "meter-value-bounds-valid-002";
    assert_eq!(run(r#"<meter value="0.5">half</meter>"#), []);
}

/// TS: `[meter-value-bounds-valid-003]` — meter with all attributes consistent
#[test]
fn meter_value_bounds_valid_003() {
    const _ID: &str = "meter-value-bounds-valid-003";
    assert_eq!(
        run(r#"<meter value="5" min="0" max="10" low="3" high="7" optimum="6">5</meter>"#),
        []
    );
}

/// TS: `[meter-value-bounds-valid-004]` — meter with negative range
#[test]
fn meter_value_bounds_valid_004() {
    const _ID: &str = "meter-value-bounds-valid-004";
    assert_eq!(run(r#"<meter value="-5" min="-10" max="0">-5</meter>"#), []);
}

/// TS: `[meter-value-bounds-invalid-001]` — value exceeds max
#[test]
fn meter_value_bounds_invalid_001() {
    const _ID: &str = "meter-value-bounds-invalid-001";
    assert_eq!(
        run(r#"<meter value="10" max="5">10 out of 5</meter>"#),
        [brief(Severity::Error, 1, 15, VALUE_LE_MAX, "10")]
    );
}

/// TS: `[meter-value-bounds-invalid-002]` — value exceeds default max (1)
#[test]
fn meter_value_bounds_invalid_002() {
    const _ID: &str = "meter-value-bounds-invalid-002";
    assert_eq!(
        run(r#"<meter value="2">2</meter>"#),
        [brief(Severity::Error, 1, 15, VALUE_LE_ONE, "2")]
    );
}

/// TS: `[meter-value-bounds-invalid-003]` — value below min
#[test]
fn meter_value_bounds_invalid_003() {
    const _ID: &str = "meter-value-bounds-invalid-003";
    let messages = messages(r#"<meter value="0" min="5">0 out of 10</meter>"#);
    // TS: /min.+less than or equal to one when the "max"/ and
    // /min.+less than or equal to the value of the "value"/.
    assert_has(
        &messages,
        "The value of the \"min\" attribute must be less than or equal to one when the \"max\" attribute is absent",
    );
    assert_has(
        &messages,
        "The value of the \"min\" attribute must be less than or equal to the value of the \"value\" attribute",
    );
}

/// TS: `[meter-value-bounds-invalid-004]` — min exceeds max
#[test]
fn meter_value_bounds_invalid_004() {
    const _ID: &str = "meter-value-bounds-invalid-004";
    let messages = messages(r#"<meter value="5" min="10" max="5">5</meter>"#);
    // TS: /min.+less than or equal to the value of the "max"/ and
    // /min.+less than or equal to the value of the "value"/.
    assert_has(
        &messages,
        "The value of the \"min\" attribute must be less than or equal to the value of the \"max\" attribute",
    );
    assert_has(
        &messages,
        "The value of the \"min\" attribute must be less than or equal to the value of the \"value\" attribute",
    );
}

/// TS: `[meter-value-bounds-invalid-005]` — high exceeds max
#[test]
fn meter_value_bounds_invalid_005() {
    const _ID: &str = "meter-value-bounds-invalid-005";
    assert_eq!(
        run(r#"<meter value="5" max="10" high="15">5</meter>"#),
        [brief(
            Severity::Error,
            1,
            33,
            "The value of the \"high\" attribute must be less than or equal to the value of the \"max\" attribute",
            "15"
        )]
    );
}

/// TS: `[meter-value-bounds-invalid-006]` — low exceeds high (both specified, max default)
#[test]
fn meter_value_bounds_invalid_006() {
    const _ID: &str = "meter-value-bounds-invalid-006";
    let messages = messages(r#"<meter value="5" low="8" high="3">5</meter>"#);
    for expected in [
        VALUE_LE_ONE,
        "The value of the \"low\" attribute must be less than or equal to one when the \"max\" attribute is absent",
        "The value of the \"high\" attribute must be less than or equal to one when the \"max\" attribute is absent",
        "The value of the \"low\" attribute must be less than or equal to the value of the \"high\" attribute",
    ] {
        assert_has(&messages, expected);
    }
}

/// TS: `[meter-value-bounds-invalid-007]` — optimum exceeds max
#[test]
fn meter_value_bounds_invalid_007() {
    const _ID: &str = "meter-value-bounds-invalid-007";
    assert_eq!(
        run(r#"<meter value="5" max="10" optimum="15">5</meter>"#),
        [brief(
            Severity::Error,
            1,
            36,
            "The value of the \"optimum\" attribute must be less than or equal to the value of the \"max\" attribute",
            "15"
        )]
    );
}

/// TS: `[meter-value-bounds-invalid-008]` — optimum below min
#[test]
fn meter_value_bounds_invalid_008() {
    const _ID: &str = "meter-value-bounds-invalid-008";
    let messages = messages(r#"<meter value="5" min="3" optimum="1">5</meter>"#);
    assert_has(
        &messages,
        "The value of the \"min\" attribute must be less than or equal to one when the \"max\" attribute is absent",
    );
    assert_has(&messages, VALUE_LE_ONE);
}

/// TS: `[meter-value-bounds-valid-005]` — dynamic value attributes are skipped
///
/// With the HTML parser `{{ score }}` is not dynamic; it is skipped because it is not a number.
#[test]
fn meter_value_bounds_valid_005() {
    const _ID: &str = "meter-value-bounds-valid-005";
    assert_eq!(run(r#"<meter value="{{ score }}" max="10">{{ score }}</meter>"#), []);
}

/// TS: `[meter-value-bounds-valid-006]` — unparsable specified value is left to
/// no-invalid-attr-value
#[test]
fn meter_value_bounds_valid_006() {
    const _ID: &str = "meter-value-bounds-valid-006";
    assert_eq!(run(r#"<meter value="abc" max="10">abc</meter>"#), []);
}

/// Values are read as JS `Number()` reads them: hex/binary prefixes, exponents, a sign, a
/// trailing dot and surrounding whitespace (NBSP included) are accepted; `Infinity`, a signed
/// hex literal and character references are not numbers.
#[test]
fn v6_meter_value_bounds_001() {
    assert_eq!(
        run(r#"<meter value="0x2">2</meter>"#),
        [brief(Severity::Error, 1, 15, VALUE_LE_ONE, "0x2")]
    );
    assert_eq!(run(r#"<meter value=" 0.5 ">x</meter>"#), []);
    assert_eq!(
        run(r#"<meter value="1e1" max="5">x</meter>"#),
        [brief(Severity::Error, 1, 15, VALUE_LE_MAX, "1e1")]
    );
    assert_eq!(
        run(r#"<meter value="2." max="1.5">x</meter>"#),
        [brief(Severity::Error, 1, 15, VALUE_LE_MAX, "2.")]
    );
    assert_eq!(
        run(r#"<meter value="+3">x</meter>"#),
        [brief(Severity::Error, 1, 15, VALUE_LE_ONE, "+3")]
    );
    assert_eq!(
        run(r#"<meter value="0b11" max="2">x</meter>"#),
        [brief(Severity::Error, 1, 15, VALUE_LE_MAX, "0b11")]
    );
    assert_eq!(run(r#"<meter value="Infinity">x</meter>"#), []);
    assert_eq!(run(r#"<meter value="">x</meter>"#), []);
    assert_eq!(run(r#"<meter value="-0x2">x</meter>"#), []);
    assert_eq!(run(r#"<meter value="&#50;">x</meter>"#), []);
    assert_eq!(run("<meter value=\"1\u{a0}\">x</meter>"), []);
}

/// Each broken inequality is reported once, at the lower-bound attribute when it is written.
#[test]
fn v6_meter_value_bounds_002() {
    assert_eq!(
        run(r#"<meter value="0.5" min="0.2" max="0.8" low="0.9" high="0.1">x</meter>"#),
        [
            brief(
                Severity::Error,
                1,
                25,
                "The value of the \"min\" attribute must be less than or equal to the value of the \"high\" attribute",
                "0.2"
            ),
            brief(
                Severity::Error,
                1,
                45,
                "The value of the \"low\" attribute must be less than or equal to the value of the \"max\" attribute",
                "0.9"
            ),
            brief(
                Severity::Error,
                1,
                45,
                "The value of the \"low\" attribute must be less than or equal to the value of the \"high\" attribute",
                "0.9"
            ),
        ]
    );
    assert_eq!(
        run(r#"<meter value="5" min="3" optimum="1">5</meter>"#),
        [
            brief(Severity::Error, 1, 15, VALUE_LE_ONE, "5"),
            brief(
                Severity::Error,
                1,
                23,
                "The value of the \"min\" attribute must be less than or equal to one when the \"max\" attribute is absent",
                "3"
            ),
            brief(
                Severity::Error,
                1,
                23,
                "The value of the \"min\" attribute must be less than or equal to the value of the \"optimum\" attribute",
                "3"
            ),
        ]
    );
}

/// With `value` absent, the value is the minimum; when that exceeds the default maximum, neither
/// side of `value ≤ max` is written, so the element is reported.
#[test]
fn v6_meter_value_bounds_003() {
    assert_eq!(
        run(r#"<meter min="2">x</meter>"#),
        [
            brief(Severity::Error, 1, 1, VALUE_LE_ONE, r#"<meter min="2">"#),
            brief(
                Severity::Error,
                1,
                13,
                "The value of the \"min\" attribute must be less than or equal to one when the \"max\" attribute is absent",
                "2"
            ),
        ]
    );
}

/// TS `getAttributeNode()` matches the attribute name as written (an upper-case `VALUE` is not
/// found), while the element name is case-insensitive.
#[test]
fn v6_meter_value_bounds_004() {
    assert_eq!(run(r#"<meter VALUE="2">x</meter>"#), []);
    assert_eq!(
        run(r#"<METER value="2">x</METER>"#),
        [brief(Severity::Error, 1, 15, VALUE_LE_ONE, "2")]
    );
}

/// A meter a pretender makes has unknown attributes, unless the `as` attribute pins it.
#[test]
fn v6_meter_value_bounds_005() {
    let pretended = lint_brief(
        "meter-value-bounds",
        r#"<x-meter value="10" max="5">x</x-meter>"#,
        serde_json::json!({
            "rules": { "meter-value-bounds": true },
            "pretenders": [{ "selector": "x-meter", "as": { "element": "meter", "inheritAttrs": true } }],
        }),
    );
    assert_eq!(pretended, []);
    assert_eq!(
        run(r#"<x-meter as="meter" value="10" max="5">x</x-meter>"#),
        [brief(Severity::Error, 1, 28, VALUE_LE_MAX, "10")]
    );
}
