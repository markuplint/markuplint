//! Tests for `no-circular-aria-owns` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-circular-aria-owns-001  → no_circular_aria_owns_001
//!   no-circular-aria-owns-002  → no_circular_aria_owns_002
//!   no-circular-aria-owns-003  → no_circular_aria_owns_003
//!   no-circular-aria-owns-004  → no_circular_aria_owns_004
//!   no-circular-aria-owns-005  → no_circular_aria_owns_005
//!   no-circular-aria-owns-006  → no_circular_aria_owns_006
//!   no-circular-aria-owns-007  → no_circular_aria_owns_007
//!   no-circular-aria-owns-008  → no_circular_aria_owns_008
//!   no-circular-aria-owns-009  → no_circular_aria_owns_009

use crate::test_util::{brief, lint_brief};
use crate::violation::Severity;

const RULE: &str = "no-circular-aria-owns";

fn run(html: &str) -> Vec<crate::test_util::Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: true } }))
}

fn cycle(id: &str) -> String {
    format!("Referring to the \"{id}\" ID from \"aria-owns\" makes a cycle")
}

/// TS: `[no-circular-aria-owns-001]` a chain that is not a cycle
#[test]
fn no_circular_aria_owns_001() {
    const _ID: &str = "no-circular-aria-owns-001";
    assert!(run(r#"<div id="a" aria-owns="b"></div><div id="b" aria-owns="c"></div><div id="c"></div>"#).is_empty());
}

/// TS: `[no-circular-aria-owns-002]` an element that lists its own child
#[test]
fn no_circular_aria_owns_002() {
    const _ID: &str = "no-circular-aria-owns-002";
    assert!(run(r#"<div aria-owns="c"><span id="c"></span></div>"#).is_empty());
}

/// TS: `[no-circular-aria-owns-003]` an ID that no element has
#[test]
fn no_circular_aria_owns_003() {
    const _ID: &str = "no-circular-aria-owns-003";
    assert!(run(r#"<div aria-owns="missing"></div>"#).is_empty());
}

/// TS: `[no-circular-aria-owns-004]` an element that lists its own ID
#[test]
fn no_circular_aria_owns_004() {
    const _ID: &str = "no-circular-aria-owns-004";
    assert_eq!(
        run(r#"<div id="a" aria-owns="a"></div>"#),
        [brief(Severity::Error, 1, 24, &cycle("a"), "a")]
    );
}

/// TS: `[no-circular-aria-owns-005]` an element that lists its ancestor
#[test]
fn no_circular_aria_owns_005() {
    const _ID: &str = "no-circular-aria-owns-005";
    assert_eq!(
        run(r#"<div id="a"><span aria-owns="a"></span></div>"#),
        [brief(Severity::Error, 1, 30, &cycle("a"), "a")]
    );
}

/// TS: `[no-circular-aria-owns-006]` every reference of a cycle is reported
#[test]
fn no_circular_aria_owns_006() {
    const _ID: &str = "no-circular-aria-owns-006";
    assert_eq!(
        run(r#"<div id="a" aria-owns="b"></div><div id="b" aria-owns="a"></div>"#),
        [
            brief(Severity::Error, 1, 24, &cycle("b"), "b"),
            brief(Severity::Error, 1, 56, &cycle("a"), "a"),
        ]
    );
}

/// TS: `[no-circular-aria-owns-007]` with locale ja
#[test]
fn no_circular_aria_owns_007() {
    const _ID: &str = "no-circular-aria-owns-007";
    let violations = lint_brief(
        RULE,
        r#"<div id="a" aria-owns="a"></div>"#,
        serde_json::json!({ "rules": { RULE: true }, "ruleCommonSettings": { "locale": "ja" } }),
    );
    assert_eq!(
        violations,
        [brief(
            Severity::Error,
            1,
            24,
            "aria-owns属性でID「a」を参照すると、所有関係が循環します",
            "a"
        )]
    );
}

/// TS: `[no-circular-aria-owns-008]` reported under WAI-ARIA 1.2 as well
#[test]
fn no_circular_aria_owns_008() {
    const _ID: &str = "no-circular-aria-owns-008";
    let violations = lint_brief(
        RULE,
        r#"<div id="a" aria-owns="a"></div>"#,
        serde_json::json!({ "rules": { RULE: true }, "ruleCommonSettings": { "ariaVersion": "1.2" } }),
    );
    assert_eq!(violations, [brief(Severity::Error, 1, 24, &cycle("a"), "a")]);
}

/// TS: `[no-circular-aria-owns-009]` a reference that closes a cycle once another cycle is
/// broken
#[test]
fn no_circular_aria_owns_009() {
    const _ID: &str = "no-circular-aria-owns-009";
    assert_eq!(
        run(r#"<div id="x"><div id="o" aria-owns="x"><span id="z" aria-owns="o"></span></div></div>"#),
        [
            brief(Severity::Error, 1, 36, &cycle("x"), "x"),
            brief(Severity::Error, 1, 63, &cycle("o"), "o"),
        ]
    );
}
