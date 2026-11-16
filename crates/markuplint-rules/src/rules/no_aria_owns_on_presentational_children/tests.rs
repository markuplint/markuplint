//! Tests for `no-aria-owns-on-presentational-children` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-aria-owns-on-presentational-children-valid-001    → no_aria_owns_on_presentational_children_valid_001
//!   no-aria-owns-on-presentational-children-invalid-001  → no_aria_owns_on_presentational_children_invalid_001
//!   no-aria-owns-on-presentational-children-invalid-002  → no_aria_owns_on_presentational_children_invalid_002
//!   no-aria-owns-on-presentational-children-invalid-003  → no_aria_owns_on_presentational_children_invalid_003
//!   no-aria-owns-on-presentational-children-invalid-004  → no_aria_owns_on_presentational_children_invalid_004
//!   no-aria-owns-on-presentational-children-invalid-005  → no_aria_owns_on_presentational_children_invalid_005

use crate::test_util::{brief, lint_brief};
use crate::violation::Severity;

const RULE: &str = "no-aria-owns-on-presentational-children";

fn run(html: &str) -> Vec<crate::test_util::Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: true } }))
}

fn message(role: &str) -> String {
    format!(
        "\"aria-owns\" must not be specified on an element with the \"{role}\" role, whose children are presentational"
    )
}

/// TS: `[no-aria-owns-on-presentational-children-valid-001]` aria-owns on a role whose children are
/// not presentational
#[test]
fn no_aria_owns_on_presentational_children_valid_001() {
    const _ID: &str = "no-aria-owns-on-presentational-children-valid-001";
    assert!(run(r#"<div role="listbox" aria-owns="o"></div><div id="o" role="option"></div>"#).is_empty());
}

/// TS: `[no-aria-owns-on-presentational-children-invalid-001]` an implicit role whose children are
/// presentational
#[test]
fn no_aria_owns_on_presentational_children_invalid_001() {
    const _ID: &str = "no-aria-owns-on-presentational-children-invalid-001";
    assert_eq!(
        run(r#"<button type="button" aria-owns="x">Save</button><span id="x"></span>"#),
        [brief(Severity::Error, 1, 23, &message("button"), r#"aria-owns="x""#)]
    );
}

/// TS: `[no-aria-owns-on-presentational-children-invalid-002]` an explicit role whose children are
/// presentational
#[test]
fn no_aria_owns_on_presentational_children_invalid_002() {
    const _ID: &str = "no-aria-owns-on-presentational-children-invalid-002";
    assert_eq!(
        run(r#"<div role="img" aria-label="Logo" aria-owns="x"></div><span id="x"></span>"#),
        [brief(Severity::Error, 1, 35, &message("img"), r#"aria-owns="x""#)]
    );
}

/// TS: `[no-aria-owns-on-presentational-children-invalid-003]` with locale ja
#[test]
fn no_aria_owns_on_presentational_children_invalid_003() {
    const _ID: &str = "no-aria-owns-on-presentational-children-invalid-003";
    let violations = lint_brief(
        RULE,
        r#"<button type="button" aria-owns="x">Save</button><span id="x"></span>"#,
        serde_json::json!({ "rules": { RULE: true }, "ruleCommonSettings": { "locale": "ja" } }),
    );
    assert_eq!(
        violations,
        [brief(
            Severity::Error,
            1,
            23,
            "子孫がプレゼンテーショナルになる「button」ロールの要素にaria-owns属性を指定してはいけません",
            r#"aria-owns="x""#
        )]
    );
}

/// TS: `[no-aria-owns-on-presentational-children-invalid-004]` reported under WAI-ARIA 1.2 as well
#[test]
fn no_aria_owns_on_presentational_children_invalid_004() {
    const _ID: &str = "no-aria-owns-on-presentational-children-invalid-004";
    let violations = lint_brief(
        RULE,
        r#"<button type="button" aria-owns="x">Save</button><span id="x"></span>"#,
        serde_json::json!({ "rules": { RULE: { "options": { "version": "1.2" } } } }),
    );
    assert_eq!(
        violations,
        [brief(Severity::Error, 1, 23, &message("button"), r#"aria-owns="x""#)]
    );
}

/// TS: `[no-aria-owns-on-presentational-children-invalid-005]` an empty aria-owns is still specified
#[test]
fn no_aria_owns_on_presentational_children_invalid_005() {
    const _ID: &str = "no-aria-owns-on-presentational-children-invalid-005";
    assert_eq!(
        run(r#"<button type="button" aria-owns="">Save</button>"#),
        [brief(Severity::Error, 1, 23, &message("button"), r#"aria-owns="""#)]
    );
}
