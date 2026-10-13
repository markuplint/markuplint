//! Tests for `no-duplicate-sibling-attr` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-duplicate-sibling-attr-issue-3640-001  → no_duplicate_sibling_attr_issue_3640_001
//!   no-duplicate-sibling-attr-issue-3640-002  → no_duplicate_sibling_attr_issue_3640_002
//!   no-duplicate-sibling-attr-issue-3640-003  → no_duplicate_sibling_attr_issue_3640_003
//!   v6_no_duplicate_sibling_attr_001          — Rust-only: positions, case, and every later sibling reported
//!   v6_no_duplicate_sibling_attr_002          — Rust-only: only siblings under a parent element are compared
//!   v6_no_duplicate_sibling_attr_003          — Rust-only: a pretended sibling counts as what it pretends to be
//!   v6_no_duplicate_sibling_attr_004          — Rust-only: a sibling the rule is disabled on still counts
//!
//! Expected values of the `v6_*` tests come from running the TS rule.

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

fn run(html: &str) -> Vec<Brief> {
    run_with(
        html,
        serde_json::json!({ "rules": { "no-duplicate-sibling-attr": true } }),
    )
}

fn run_with(html: &str, config: serde_json::Value) -> Vec<Brief> {
    lint_brief("no-duplicate-sibling-attr", html, config)
}

const MESSAGE: &str =
    "The \"default\" attribute must not appear on more than one \"track\" element within the same parent";

/// TS: `[no-duplicate-sibling-attr-issue-3640-001]` — multiple track default is invalid
///
/// TS asserts `expect.objectContaining({ severity, raw, message })`; line and col are asserted
/// too, with the values TS reports.
#[test]
fn no_duplicate_sibling_attr_issue_3640_001() {
    const _ID: &str = "no-duplicate-sibling-attr-issue-3640-001";
    assert_eq!(
        run(
            r#"<video><track kind="subtitles" src="a.vtt" default><track kind="captions" src="b.vtt" default></video>"#
        ),
        [brief(
            Severity::Error,
            1,
            52,
            MESSAGE,
            r#"<track kind="captions" src="b.vtt" default>"#
        )]
    );
}

/// TS: `[no-duplicate-sibling-attr-issue-3640-002]` — single track default is valid
#[test]
fn no_duplicate_sibling_attr_issue_3640_002() {
    const _ID: &str = "no-duplicate-sibling-attr-issue-3640-002";
    assert_eq!(
        run(r#"<video><track kind="subtitles" src="a.vtt" default><track kind="captions" src="b.vtt"></video>"#),
        []
    );
}

/// TS: `[no-duplicate-sibling-attr-issue-3640-003]` — multiple track default in audio is invalid
///
/// Line and col asserted as in `issue_3640_001`.
#[test]
fn no_duplicate_sibling_attr_issue_3640_003() {
    const _ID: &str = "no-duplicate-sibling-attr-issue-3640-003";
    assert_eq!(
        run(
            r#"<audio><track kind="subtitles" src="a.vtt" default><track kind="captions" src="b.vtt" default></audio>"#
        ),
        [brief(
            Severity::Error,
            1,
            52,
            MESSAGE,
            r#"<track kind="captions" src="b.vtt" default>"#
        )]
    );
}

/// The attribute is found whatever its case; siblings need not be adjacent, and every one after
/// the first is reported.
#[test]
fn v6_no_duplicate_sibling_attr_001() {
    assert_eq!(
        run(r#"<video><track src="a.vtt" DEFAULT><track src="b.vtt" default></video>"#),
        [brief(Severity::Error, 1, 35, MESSAGE, r#"<track src="b.vtt" default>"#)]
    );
    assert_eq!(
        run(
            r#"<video><track src="a.vtt" default><source src="v.mp4"><track src="b.vtt" default><track src="c.vtt" default></video>"#
        ),
        [
            brief(Severity::Error, 1, 55, MESSAGE, r#"<track src="b.vtt" default>"#),
            brief(Severity::Error, 1, 82, MESSAGE, r#"<track src="c.vtt" default>"#),
        ]
    );
    assert_eq!(
        run("<video>\n<track src=\"a.vtt\" default>\n<track src=\"b.vtt\" default>\n</video>"),
        [brief(Severity::Error, 3, 1, MESSAGE, r#"<track src="b.vtt" default>"#)]
    );
}

/// Elements at the top of a fragment have no parent element (TS `parentElement` is `null`), and
/// tracks under different parents are not siblings.
#[test]
fn v6_no_duplicate_sibling_attr_002() {
    assert_eq!(
        run(r#"<track kind="subtitles" src="a.vtt" default><track kind="captions" src="b.vtt" default>"#),
        []
    );
    assert_eq!(
        run(r#"<video><track src="a.vtt" default></video><video><track src="b.vtt" default></video>"#),
        []
    );
}

/// A sibling pretending to be a `track` with the attributes written counts as a track.
#[test]
fn v6_no_duplicate_sibling_attr_003() {
    assert_eq!(
        run_with(
            r#"<video><x-track src="a.vtt" default></x-track><track src="b.vtt" default></video>"#,
            serde_json::json!({
                "rules": { "no-duplicate-sibling-attr": true },
                "pretenders": [{ "selector": "x-track", "as": { "element": "track", "inheritAttrs": true } }],
            }),
        ),
        [brief(Severity::Error, 1, 47, MESSAGE, r#"<track src="b.vtt" default>"#)]
    );
}

/// The rule disabled on the first track (`nodeRules`) does not report it, but the later tracks
/// still see it as a preceding sibling.
#[test]
fn v6_no_duplicate_sibling_attr_004() {
    assert_eq!(
        run_with(
            r#"<video><track id="a" src="a.vtt" default><track src="b.vtt" default><track src="c.vtt" default></video>"#,
            serde_json::json!({
                "rules": { "no-duplicate-sibling-attr": true },
                "nodeRules": [{ "selector": "#a", "rules": { "no-duplicate-sibling-attr": false } }],
            }),
        ),
        [
            brief(Severity::Error, 1, 42, MESSAGE, r#"<track src="b.vtt" default>"#),
            brief(Severity::Error, 1, 69, MESSAGE, r#"<track src="c.vtt" default>"#),
        ]
    );
}
