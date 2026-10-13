//! Tests for `no-disallowed-ancestor` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-disallowed-ancestor-invalid-001     → no_disallowed_ancestor_invalid_001
//!   no-disallowed-ancestor-issue-3632-001  → no_disallowed_ancestor_issue_3632_001
//!   no-disallowed-ancestor-issue-3632-002  → no_disallowed_ancestor_issue_3632_002
//!   no-disallowed-ancestor-issue-3632-003  → no_disallowed_ancestor_issue_3632_003
//!   no-disallowed-ancestor-issue-3632-004  → no_disallowed_ancestor_issue_3632_004
//!   v6_no_disallowed_ancestor_001  — Rust-only: each element names its nearest forbidden ancestor
//!   v6_no_disallowed_ancestor_002  — Rust-only: HTML inside `foreignObject` is checked too
//!   v6_no_disallowed_ancestor_003  — Rust-only: a pretender is checked as the element it pretends to be

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const RULE: &str = "no-disallowed-ancestor";

fn run(html: &str) -> Vec<Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: true } }))
}

fn message(el: &str, ancestor: &str) -> String {
    format!("The \"{el}\" element must not appear as a descendant of the \"{ancestor}\" element")
}

fn contains_message(violations: &[Brief], expected: &str) -> bool {
    violations.iter().any(|v| v.3 == expected)
}

/// TS: `[no-disallowed-ancestor-invalid-001]` address inside address
#[test]
fn no_disallowed_ancestor_invalid_001() {
    const _ID: &str = "no-disallowed-ancestor-invalid-001";
    assert_eq!(
        run("<address><address></address></address>"),
        [brief(
            Severity::Error,
            1,
            10,
            &message("address", "address"),
            "<address>"
        )]
    );
    assert_eq!(
        run("<address><div><div><div><address></address></div></div></div></address>"),
        [brief(
            Severity::Error,
            1,
            25,
            &message("address", "address"),
            "<address>"
        )]
    );
}

/// TS: `[no-disallowed-ancestor-issue-3632-001]` main must not be descendant of article
#[test]
fn no_disallowed_ancestor_issue_3632_001() {
    const _ID: &str = "no-disallowed-ancestor-issue-3632-001";
    let v = run("<article><main>x</main></article>");
    assert!(contains_message(&v, &message("main", "article")), "{v:?}");
}

/// TS: `[no-disallowed-ancestor-issue-3632-002]` main standalone is valid
#[test]
fn no_disallowed_ancestor_issue_3632_002() {
    const _ID: &str = "no-disallowed-ancestor-issue-3632-002";
    assert_eq!(run("<main>x</main>"), []);
}

/// TS: `[no-disallowed-ancestor-issue-3632-003]` main in deeply nested nav
#[test]
fn no_disallowed_ancestor_issue_3632_003() {
    const _ID: &str = "no-disallowed-ancestor-issue-3632-003";
    let v = run("<nav><div><div><main>x</main></div></div></nav>");
    assert!(contains_message(&v, &message("main", "nav")), "{v:?}");
}

/// TS: `[no-disallowed-ancestor-issue-3632-004]` footer in header
#[test]
fn no_disallowed_ancestor_issue_3632_004() {
    const _ID: &str = "no-disallowed-ancestor-issue-3632-004";
    let v = run("<header><footer>x</footer></header>");
    assert!(contains_message(&v, &message("footer", "header")), "{v:?}");
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input.
#[test]
fn v6_no_disallowed_ancestor_001() {
    assert_eq!(
        run("<header><div><footer><main>x</main></footer></div></header>"),
        [
            brief(Severity::Error, 1, 14, &message("footer", "header"), "<footer>"),
            brief(Severity::Error, 1, 22, &message("main", "footer"), "<main>"),
        ]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input.
#[test]
fn v6_no_disallowed_ancestor_002() {
    assert_eq!(
        run("<svg><foreignObject><address><address></address></address></foreignObject></svg>"),
        [brief(
            Severity::Error,
            1,
            30,
            &message("address", "address"),
            "<address>"
        )]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) with the same pretenders.
#[test]
fn v6_no_disallowed_ancestor_003() {
    assert_eq!(
        lint_brief(
            RULE,
            "<x-nav><x-main>x</x-main></x-nav>",
            serde_json::json!({
                "rules": { RULE: true },
                "pretenders": [{ "selector": "x-main", "as": "main" }, { "selector": "x-nav", "as": "nav" }]
            }),
        ),
        [brief(Severity::Error, 1, 8, &message("main", "nav"), "<x-main>")]
    );
}
