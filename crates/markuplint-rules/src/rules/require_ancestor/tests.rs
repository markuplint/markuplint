//! Tests for `require-ancestor` rule.
//!
//! Test ID mapping (TS → Rust):
//!   require-ancestor-issue-3670-001  → require_ancestor_issue_3670_001
//!   require-ancestor-issue-3670-002  → require_ancestor_issue_3670_002
//!   require-ancestor-issue-3670-003  → require_ancestor_issue_3670_003
//!   v6_require_ancestor_001  — Rust-only: position and raw of the report; only the `area` outside `map` is reported
//!   v6_require_ancestor_002  — Rust-only: a pretender is checked as the element it pretends to be

use crate::test_util::{Brief, brief, lint_brief, lint_html};
use crate::violation::Severity;

const RULE: &str = "require-ancestor";
const MESSAGE: &str = "The \"area\" element must appear as a descendant of the \"map\" element";

fn run(html: &str) -> Vec<Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: true } }))
}

/// TS: `[require-ancestor-issue-3670-001]` area outside map is invalid
#[test]
fn require_ancestor_issue_3670_001() {
    const _ID: &str = "require-ancestor-issue-3670-001";
    let v = lint_html(
        r##"<div><area alt="x" href="#"></div>"##,
        serde_json::json!({ "rules": { RULE: true } }),
    );
    assert_eq!(v.len(), 1, "{v:?}");
    assert_eq!(v[0].severity, Severity::Error);
    assert_eq!(v[0].message, MESSAGE);
}

/// TS: `[require-ancestor-issue-3670-002]` area inside map is valid
#[test]
fn require_ancestor_issue_3670_002() {
    const _ID: &str = "require-ancestor-issue-3670-002";
    assert_eq!(run(r##"<map name="m"><area alt="x" href="#"></map>"##), []);
}

/// TS: `[require-ancestor-issue-3670-003]` area inside deeply nested map has no descendantOf violation
#[test]
fn require_ancestor_issue_3670_003() {
    const _ID: &str = "require-ancestor-issue-3670-003";
    assert_eq!(
        run(r##"<map name="m"><div><p><area alt="x" href="#"></p></div></map>"##),
        []
    );
}

/// Expected values from the TS rule (`mlRuleTest`) on the same inputs.
#[test]
fn v6_require_ancestor_001() {
    assert_eq!(
        run("<area alt=x href=#>"),
        [brief(Severity::Error, 1, 1, MESSAGE, "<area alt=x href=#>")]
    );
    assert_eq!(
        run("<map name=a><div><area alt=x href=#></div></map><area>"),
        [brief(Severity::Error, 1, 49, MESSAGE, "<area>")]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) with the same pretenders.
#[test]
fn v6_require_ancestor_002() {
    assert_eq!(
        lint_brief(
            RULE,
            "<x-map><x-area></x-area></x-map><div><x-area></x-area></div>",
            serde_json::json!({
                "rules": { RULE: true },
                "pretenders": [{ "selector": "x-map", "as": "map" }, { "selector": "x-area", "as": "area" }]
            }),
        ),
        [brief(Severity::Error, 1, 38, MESSAGE, "<x-area>")]
    );
}
