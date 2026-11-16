//! Tests for `no-duplicate-aria-owns` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-duplicate-aria-owns-valid-001    → no_duplicate_aria_owns_valid_001
//!   no-duplicate-aria-owns-valid-002    → no_duplicate_aria_owns_valid_002
//!   no-duplicate-aria-owns-valid-003    → no_duplicate_aria_owns_valid_003
//!   no-duplicate-aria-owns-valid-004    → no_duplicate_aria_owns_valid_004
//!   no-duplicate-aria-owns-valid-005    — TS only: it needs the JSX parser (an `aria-owns` whose value is code)
//!   no-duplicate-aria-owns-valid-006    → no_duplicate_aria_owns_valid_006
//!   no-duplicate-aria-owns-invalid-001  → no_duplicate_aria_owns_invalid_001
//!   no-duplicate-aria-owns-invalid-002  → no_duplicate_aria_owns_invalid_002

use crate::test_util::{brief, lint_brief};
use crate::violation::Severity;

const RULE: &str = "no-duplicate-aria-owns";

fn run(html: &str) -> Vec<crate::test_util::Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: true } }))
}

/// TS: `[no-duplicate-aria-owns-valid-001]` each element has one owner
#[test]
fn no_duplicate_aria_owns_valid_001() {
    const _ID: &str = "no-duplicate-aria-owns-valid-001";
    assert!(run(r#"<div aria-owns="a"></div><div aria-owns="b"></div><p id="a"></p><p id="b"></p>"#).is_empty());
}

/// TS: `[no-duplicate-aria-owns-valid-002]` an ID listed twice in one aria-owns is one owner
#[test]
fn no_duplicate_aria_owns_valid_002() {
    const _ID: &str = "no-duplicate-aria-owns-valid-002";
    assert!(run(r#"<div aria-owns="a a"></div><p id="a"></p>"#).is_empty());
}

/// TS: `[no-duplicate-aria-owns-valid-003]` an ID that no element has is left to
/// no-refer-to-non-existent-id
#[test]
fn no_duplicate_aria_owns_valid_003() {
    const _ID: &str = "no-duplicate-aria-owns-valid-003";
    assert!(run(r#"<div aria-owns="a"></div><div aria-owns="a"></div>"#).is_empty());
}

/// TS: `[no-duplicate-aria-owns-valid-004]` an ID is resolved in the tree of the aria-owns
#[test]
fn no_duplicate_aria_owns_valid_004() {
    const _ID: &str = "no-duplicate-aria-owns-valid-004";
    assert!(
        run(r#"<div aria-owns="a"></div><p id="a"></p><template><div aria-owns="a"></div><p id="a"></p></template>"#)
            .is_empty()
    );
}

/// TS: `[no-duplicate-aria-owns-valid-006]` an element that lists its own ID is not an owner of it
#[test]
fn no_duplicate_aria_owns_valid_006() {
    const _ID: &str = "no-duplicate-aria-owns-valid-006";
    assert!(run(r#"<div id="a" aria-owns="a"></div><div aria-owns="a"></div>"#).is_empty());
}

/// TS: `[no-duplicate-aria-owns-invalid-001]` a later aria-owns that lists an ID an earlier one lists
#[test]
fn no_duplicate_aria_owns_invalid_001() {
    const _ID: &str = "no-duplicate-aria-owns-invalid-001";
    assert_eq!(
        run(r#"<div aria-owns="a"></div><div aria-owns="b a"></div><p id="a"></p><p id="b"></p>"#),
        [brief(
            Severity::Error,
            1,
            44,
            "The \"a\" ID is already referred to by the \"aria-owns\" of another element",
            "a"
        )]
    );
}

/// TS: `[no-duplicate-aria-owns-invalid-002]` with locale ja
#[test]
fn no_duplicate_aria_owns_invalid_002() {
    const _ID: &str = "no-duplicate-aria-owns-invalid-002";
    let violations = lint_brief(
        RULE,
        r#"<div aria-owns="a"></div><div aria-owns="a"></div><p id="a"></p>"#,
        serde_json::json!({ "rules": { RULE: true }, "ruleCommonSettings": { "locale": "ja" } }),
    );
    assert_eq!(
        violations,
        [brief(
            Severity::Error,
            1,
            42,
            "ID「a」はすでに別の要素のaria-owns属性で参照されています",
            "a"
        )]
    );
}
