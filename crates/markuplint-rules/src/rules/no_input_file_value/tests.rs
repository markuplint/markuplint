//! Tests for `no-input-file-value` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-input-file-value-valid-001    → no_input_file_value_valid_001
//!   no-input-file-value-valid-002    → no_input_file_value_valid_002
//!   no-input-file-value-valid-003    → no_input_file_value_valid_003
//!   no-input-file-value-invalid-001  → no_input_file_value_invalid_001
//!   no-input-file-value-invalid-002  → no_input_file_value_invalid_002
//!   v6_no_input_file_value_001       — Rust-only: only an exact empty string passes; position follows the value
//!   v6_no_input_file_value_002       — Rust-only: attribute names are matched as written, the type value is not trimmed
//!   v6_no_input_file_value_003       — Rust-only: a pretender input is skipped unless `as` pins it
//!
//! Expected values of the `v6_*` tests come from running the TS rule.

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

fn run(html: &str) -> Vec<Brief> {
    lint_brief(
        "no-input-file-value",
        html,
        serde_json::json!({ "rules": { "no-input-file-value": true } }),
    )
}

const MESSAGE: &str = "The \"value\" attribute on a \"input\" element with \"type=file\" must be the empty string";

/// TS: `[no-input-file-value-valid-001]` — no value attribute
#[test]
fn no_input_file_value_valid_001() {
    const _ID: &str = "no-input-file-value-valid-001";
    assert_eq!(run(r#"<input type="file">"#), []);
}

/// TS: `[no-input-file-value-valid-002]` — empty value attribute
#[test]
fn no_input_file_value_valid_002() {
    const _ID: &str = "no-input-file-value-valid-002";
    assert_eq!(run(r#"<input type="file" value="">"#), []);
}

/// TS: `[no-input-file-value-valid-003]` — non-file type with value
#[test]
fn no_input_file_value_valid_003() {
    const _ID: &str = "no-input-file-value-valid-003";
    assert_eq!(run(r#"<input type="text" value="anything">"#), []);
}

/// TS: `[no-input-file-value-invalid-001]` — non-empty value on type=file
#[test]
fn no_input_file_value_invalid_001() {
    const _ID: &str = "no-input-file-value-invalid-001";
    assert_eq!(
        run(r#"<input type="file" value="document.pdf">"#),
        [brief(Severity::Error, 1, 27, MESSAGE, "document.pdf")]
    );
}

/// TS: `[no-input-file-value-invalid-002]` — case-insensitive type matching
#[test]
fn no_input_file_value_invalid_002() {
    const _ID: &str = "no-input-file-value-invalid-002";
    let violations = run(r#"<input type="FILE" value="x">"#);
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].4, "x");
}

/// A whitespace value is not the empty string; a valueless attribute is. The report sits at the
/// value wherever the attributes are, and the element name is case-insensitive.
#[test]
fn v6_no_input_file_value_001() {
    assert_eq!(
        run(r#"<input type="file" value=" ">"#),
        [brief(Severity::Error, 1, 27, MESSAGE, " ")]
    );
    assert_eq!(run(r#"<input type="file" value>"#), []);
    assert_eq!(
        run("<input type=file value=a.pdf>"),
        [brief(Severity::Error, 1, 24, MESSAGE, "a.pdf")]
    );
    assert_eq!(
        run(r#"<input value="x" type="file">"#),
        [brief(Severity::Error, 1, 15, MESSAGE, "x")]
    );
    assert_eq!(
        run(r#"<INPUT type="file" value="x">"#),
        [brief(Severity::Error, 1, 27, MESSAGE, "x")]
    );
}

/// TS `getAttributeNode()` matches the attribute name as written (`TYPE` and `VALUE` are not
/// found), and the `type` value is compared without trimming.
#[test]
fn v6_no_input_file_value_002() {
    assert_eq!(run(r#"<input TYPE="file" value="x">"#), []);
    assert_eq!(run(r#"<input type="file" VALUE="x">"#), []);
    assert_eq!(run(r#"<input type=" file" value="x">"#), []);
}

/// An input a pretender makes has unknown attributes, unless the `as` attribute pins it.
#[test]
fn v6_no_input_file_value_003() {
    let pretended = lint_brief(
        "no-input-file-value",
        r#"<x-input type="file" value="x">"#,
        serde_json::json!({
            "rules": { "no-input-file-value": true },
            "pretenders": [{ "selector": "x-input", "as": { "element": "input", "inheritAttrs": true } }],
        }),
    );
    assert_eq!(pretended, []);
    assert_eq!(
        run(r#"<x-input as="input" type="file" value="x">"#),
        [brief(Severity::Error, 1, 40, MESSAGE, "x")]
    );
}
