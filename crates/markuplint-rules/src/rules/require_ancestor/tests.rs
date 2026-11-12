//! Tests for `require-ancestor` rule.
//!
//! Test ID mapping (TS → Rust):
//!   require-ancestor-issue-3670-001  → require_ancestor_issue_3670_001
//!   require-ancestor-issue-3670-002  → require_ancestor_issue_3670_002
//!   require-ancestor-issue-3670-003  → require_ancestor_issue_3670_003
//!   require-ancestor-issue-4528-001  → require_ancestor_issue_4528_001
//!   require-ancestor-issue-4528-002  → require_ancestor_issue_4528_002
//!   require-ancestor-issue-4528-033  → require_ancestor_issue_4528_033
//!   require-ancestor-issue-4506-002  → require_ancestor_issue_4506_002
//!   require-ancestor-issue-4506-006  → require_ancestor_issue_4506_006
//!   require-ancestor-issue-4506-008  → require_ancestor_issue_4506_008
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

/// Expected values from the TS rule (`mlRuleTest`) on the same inputs. An `area` at the top of a
/// partial has no parent node, so it is not reported (`descendantOfWithParentNode`, #4528).
#[test]
fn v6_require_ancestor_001() {
    assert_eq!(run("<area alt=x href=#>"), []);
    assert_eq!(
        run("<map name=a><div><area alt=x href=#></div></map><p><area></p>"),
        [brief(Severity::Error, 1, 52, MESSAGE, "<area>")]
    );
}

/// TS: `[require-ancestor-issue-4528-001]` area at the top of a partial is not reported
#[test]
fn require_ancestor_issue_4528_001() {
    const _ID: &str = "require-ancestor-issue-4528-001";
    assert_eq!(run(r##"<area alt="x" href="#">"##), []);
}

/// TS: `[require-ancestor-issue-4528-002]` area at the top of a partial after another element is not reported
#[test]
fn require_ancestor_issue_4528_002() {
    const _ID: &str = "require-ancestor-issue-4528-002";
    assert_eq!(run(r##"<p>a</p><area alt="x" href="#">"##), []);
}

/// TS: `[require-ancestor-issue-4528-033]` an area element in the SVG namespace is not the HTML area element
#[test]
fn require_ancestor_issue_4528_033() {
    const _ID: &str = "require-ancestor-issue-4528-033";
    assert_eq!(run("<div><svg><area /></svg></div>"), []);
}

/// TS: `[require-ancestor-issue-4506-002]` area in the content of a template is not reported without a map outside
#[test]
fn require_ancestor_issue_4506_002() {
    const _ID: &str = "require-ancestor-issue-4506-002";
    assert_eq!(run(r##"<div><template><area alt="x" href="#"></template></div>"##), []);
}

/// TS: `[require-ancestor-issue-4506-006]` area in a declarative shadow root under a map outside is reported
#[test]
fn require_ancestor_issue_4506_006() {
    const _ID: &str = "require-ancestor-issue-4506-006";
    assert_eq!(
        run(r##"<map name="m"><div><template shadowrootmode="open"><area alt="x" href="#"></template></div></map>"##),
        [brief(Severity::Error, 1, 52, MESSAGE, r##"<area alt="x" href="#">"##)]
    );
}

/// TS: `[require-ancestor-issue-4506-008]` area in a template that fails to attach a shadow root is not reported
#[test]
fn require_ancestor_issue_4506_008() {
    const _ID: &str = "require-ancestor-issue-4506-008";
    assert_eq!(
        run(r##"<ul><template shadowrootmode="open"><area alt="x" href="#"></template></ul>"##),
        []
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
