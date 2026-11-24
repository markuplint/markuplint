//! Tests for `require-ancestor` rule.
//!
//! Test ID mapping (TS → Rust):
//!   require-ancestor-001  → require_ancestor_001
//!   require-ancestor-002  → require_ancestor_002
//!   require-ancestor-003  → require_ancestor_003
//!   require-ancestor-004  → require_ancestor_004
//!   require-ancestor-005  → require_ancestor_005
//!   require-ancestor-036  → require_ancestor_036
//!   require-ancestor-038  → require_ancestor_038
//!   require-ancestor-042  → require_ancestor_042
//!   require-ancestor-044  → require_ancestor_044
//!   v6_require_ancestor_001  — Rust-only: an `area` at the top of a partial is not reported
//!   v6_require_ancestor_002  — Rust-only: a pretender is checked as the element it pretends to be
//!   v6_require_ancestor_003  — Rust-only: position and raw of the report; an `area` below an ordinary element of a partial is reported

use crate::test_util::{Brief, brief, lint_brief, lint_html};
use crate::violation::Severity;

const RULE: &str = "require-ancestor";
const MESSAGE: &str = "The \"area\" element must appear as a descendant of the \"map\" element";

fn run(html: &str) -> Vec<Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: true } }))
}

/// TS: `[require-ancestor-001]` area outside map is invalid
#[test]
fn require_ancestor_001() {
    const _ID: &str = "require-ancestor-001";
    let v = lint_html(
        r##"<div><area alt="x" href="#"></div>"##,
        serde_json::json!({ "rules": { RULE: true } }),
    );
    assert_eq!(v.len(), 1, "{v:?}");
    assert_eq!(v[0].severity, Severity::Error);
    assert_eq!(v[0].message, MESSAGE);
}

/// TS: `[require-ancestor-002]` area inside map is valid
#[test]
fn require_ancestor_002() {
    const _ID: &str = "require-ancestor-002";
    assert_eq!(run(r##"<map name="m"><area alt="x" href="#"></map>"##), []);
}

/// TS: `[require-ancestor-003]` area inside deeply nested map has no descendantOf violation
#[test]
fn require_ancestor_003() {
    const _ID: &str = "require-ancestor-003";
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
    assert_eq!(run("<map name=a><div><area alt=x href=#></div></map><area>"), []);
}

/// Expected values from the TS rule (`mlRuleTest`) on the same inputs. An `area` below an ordinary
/// element has a parent node, so it is reported with its position and raw.
#[test]
fn v6_require_ancestor_003() {
    assert_eq!(
        run("<map name=a><div><area alt=x href=#></div></map><p><area></p>"),
        [brief(Severity::Error, 1, 52, MESSAGE, "<area>")]
    );
}

/// TS: `[require-ancestor-004]` area at the top of a partial is not reported
#[test]
fn require_ancestor_004() {
    const _ID: &str = "require-ancestor-004";
    assert_eq!(run(r##"<area alt="x" href="#">"##), []);
}

/// TS: `[require-ancestor-005]` area at the top of a partial after another element is not reported
#[test]
fn require_ancestor_005() {
    const _ID: &str = "require-ancestor-005";
    assert_eq!(run(r##"<p>a</p><area alt="x" href="#">"##), []);
}

/// TS: `[require-ancestor-036]` an area element in the SVG namespace is not the HTML area element
#[test]
fn require_ancestor_036() {
    const _ID: &str = "require-ancestor-036";
    assert_eq!(run("<div><svg><area /></svg></div>"), []);
}

/// TS: `[require-ancestor-038]` area in the content of a template is not reported without a map outside
#[test]
fn require_ancestor_038() {
    const _ID: &str = "require-ancestor-038";
    assert_eq!(run(r##"<div><template><area alt="x" href="#"></template></div>"##), []);
}

/// TS: `[require-ancestor-042]` area in a declarative shadow root under a map outside is reported
#[test]
fn require_ancestor_042() {
    const _ID: &str = "require-ancestor-042";
    assert_eq!(
        run(r##"<map name="m"><div><template shadowrootmode="open"><area alt="x" href="#"></template></div></map>"##),
        [brief(Severity::Error, 1, 52, MESSAGE, r##"<area alt="x" href="#">"##)]
    );
}

/// TS: `[require-ancestor-044]` area in a template that fails to attach a shadow root is not reported
#[test]
fn require_ancestor_044() {
    const _ID: &str = "require-ancestor-044";
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
