//! Tests for `attr-order` rule.
//!
//! Test ID mapping (TS → Rust):
//!   attr-order-valid-001        → attr_order_valid_001
//!   attr-order-invalid-001      → attr_order_invalid_001
//!   attr-order-valid-002        → attr_order_valid_002
//!   attr-order-valid-003        → attr_order_valid_003
//!   attr-order-valid-004        → attr_order_valid_004
//!   attr-order-invalid-002      → attr_order_invalid_002
//!   attr-order-valid-005        → attr_order_valid_005
//!   attr-order-invalid-003      → attr_order_invalid_003
//!   attr-order-invalid-004      → attr_order_invalid_004
//!   attr-order-invalid-005      → attr_order_invalid_005
//!   attr-order-invalid-006      → attr_order_invalid_006
//!   attr-order-invalid-007      → attr_order_invalid_007
//!   attr-order-valid-006        → attr_order_valid_006
//!   attr-order-invalid-008      → attr_order_invalid_008
//!   attr-order-invalid-009      → attr_order_invalid_009
//!   attr-order-invalid-021      → attr_order_invalid_021
//!   attr-order-valid-019        → attr_order_valid_019
//!   attr-order-valid-020        → attr_order_valid_020
//!   attr-order-valid-021        → attr_order_valid_021
//!   attr-order-issue-4033-001   → attr_order_issue_4033_001
//!   attr-order-invalid-010      → attr_order_invalid_010
//!   attr-order-valid-007        → attr_order_valid_007
//!   attr-order-valid-008        → attr_order_valid_008
//!   attr-order-invalid-011      → attr_order_invalid_011
//!   attr-order-valid-009        → attr_order_valid_009
//!   attr-order-valid-010        → attr_order_valid_010
//!   attr-order-invalid-012      → attr_order_invalid_012
//!   attr-order-valid-011        → attr_order_valid_011
//!   attr-order-invalid-013      → attr_order_invalid_013
//!   attr-order-valid-012        → attr_order_valid_012
//!   attr-order-invalid-014      → attr_order_invalid_014
//!   attr-order-valid-013        → attr_order_valid_013
//!   attr-order-valid-014        — SKIP: JSX parser (spread attribute) not available in Rust
//!   attr-order-invalid-015      — SKIP: JSX parser (spread attribute) not available in Rust; see v6_attr_order_005
//!   attr-order-valid-015        — SKIP: JSX parser (spread attribute) not available in Rust; see v6_attr_order_006
//!   attr-order-valid-016        → attr_order_valid_016
//!   attr-order-invalid-016      → attr_order_invalid_016
//!   attr-order-valid-017        → attr_order_valid_017
//!   attr-order-invalid-017      — SKIP: JSX parser not available in Rust; see v6_attr_order_002
//!   attr-order-invalid-018      → attr_order_invalid_018
//!   attr-order-valid-018        → attr_order_valid_018
//!   attr-order-invalid-019      → attr_order_invalid_019
//!   attr-order-invalid-020      → attr_order_invalid_020
//!   attr-order-fix-001 … fix-007, fix-010, fix-012, fix-013 → attr_order_fix_NNN
//!   attr-order-fix-008/fix-009/fix-011 — SKIP: Vue/JSX parsers not available in Rust; see v6_attr_order_016
//!   v6_attr_order_001  — Rust-only: whitespace before `=` is not part of the reported name
//!   v6_attr_order_002  — Rust-only: names keep the case they are written in
//!   v6_attr_order_003  — Rust-only: names compare by UTF-16 code unit, as JavaScript strings do
//!   v6_attr_order_004  — Rust-only: each element reports its own first misplaced attribute
//!   v6_attr_order_005  — Rust-only: a misplaced spread attribute is named `#spread`
//!   v6_attr_order_006  — Rust-only: a spread attribute has no position, so none is reported for it
//!   v6_attr_order_007  — Rust-only: every group kind, and `aria-` / `data-` alone match no group
//!   v6_attr_order_008  — Rust-only: an unknown group matches nothing; unmatched attributes stay alphabetical
//!   v6_attr_order_009  — Rust-only: an unknown `order` keeps the group as written
//!   v6_attr_order_010  — Rust-only: `source-order` group with `alphabetical: false`
//!   v6_attr_order_011  — Rust-only: unlisted names of a fixed order follow the listed ones
//!   v6_attr_order_012  — Rust-only: a pattern may use lookbehind, as JavaScript allows
//!   v6_attr_order_013  — Rust-only: a pretended element is checked by the attributes of what it pretends to be
//!   v6_attr_order_014  — Rust-only: `info` severity says "should"
//!   v6_attr_order_015  — Rust-only: each position keeps its whitespace; non-ASCII text before the fix
//!   v6_attr_order_016  — Rust-only: a spread attribute leaves the violation without a fix
//!   v6_attr_order_017  — Rust-only: CRLF line endings between attributes are kept
//!   v6_attr_order_018  — Rust-only: an HTML element's names are ordered by the name the DOM gives them
//!   v6_attr_order_019  — Rust-only: an SVG name is ordered by the case the HTML parser restores
//!   v6_attr_order_020  — Rust-only: an SVG name that code sets keeps its case, an HTML one does not

use markuplint_core::mlast::{MLASTAttr, MLASTSpreadAttr};

use crate::lint::{LintConfig, lint};
use crate::test_util::{Brief, brief, fixed_code, html_arena, lint_brief, spec};
use crate::violation::Severity;

fn run(html: &str) -> Vec<Brief> {
    lint_brief(
        "attr-order",
        html,
        serde_json::json!({ "rules": { "attr-order": true } }),
    )
}

fn run_with(html: &str, rule: serde_json::Value) -> Vec<Brief> {
    lint_brief(
        "attr-order",
        html,
        serde_json::json!({ "rules": { "attr-order": rule } }),
    )
}

fn warning(line: u32, col: u32, message: &str, raw: &str) -> Brief {
    brief(Severity::Warning, line, col, message, raw)
}

fn fixed(html: &str) -> String {
    fixed_code(html, &serde_json::json!({ "rules": { "attr-order": true } }))
}

fn fixed_with(html: &str, rule: serde_json::Value) -> String {
    fixed_code(html, &serde_json::json!({ "rules": { "attr-order": rule } }))
}

/// TS: `[attr-order-fix-001]` — alphabetical sort
#[test]
fn attr_order_fix_001() {
    const _ID: &str = "attr-order-fix-001";
    assert_eq!(
        fixed(r#"<div style="x" class="a"></div>"#),
        r#"<div class="a" style="x"></div>"#
    );
}

/// TS: `[attr-order-fix-002]` — three attributes alphabetical
#[test]
fn attr_order_fix_002() {
    const _ID: &str = "attr-order-fix-002";
    assert_eq!(
        fixed(r#"<div style="x" class="a" id="b"></div>"#),
        r#"<div class="a" id="b" style="x"></div>"#
    );
}

/// TS: `[attr-order-fix-003]` — priority list
#[test]
fn attr_order_fix_003() {
    const _ID: &str = "attr-order-fix-003";
    assert_eq!(
        fixed_with(
            r#"<div class="a" id="b"></div>"#,
            serde_json::json!({ "value": ["id", "class"] })
        ),
        r#"<div id="b" class="a"></div>"#
    );
}

/// TS: `[attr-order-fix-004]` — multiline attributes preserve spacing
#[test]
fn attr_order_fix_004() {
    const _ID: &str = "attr-order-fix-004";
    assert_eq!(
        fixed("<div\n  style=\"x\"\n  class=\"a\"\n></div>"),
        "<div\n  class=\"a\"\n  style=\"x\"\n></div>"
    );
}

/// TS: `[attr-order-fix-005]` — boolean attributes
#[test]
fn attr_order_fix_005() {
    const _ID: &str = "attr-order-fix-005";
    assert_eq!(fixed("<input readonly disabled />"), "<input disabled readonly />");
}

/// TS: `[attr-order-fix-006]` — group order
#[test]
fn attr_order_fix_006() {
    const _ID: &str = "attr-order-fix-006";
    assert_eq!(
        fixed_with(
            r#"<div data-x="1" class="a" id="b"></div>"#,
            serde_json::json!({ "value": [{ "group": "global" }, { "group": "data" }] })
        ),
        r#"<div class="a" id="b" data-x="1"></div>"#
    );
}

/// TS: `[attr-order-fix-007]` — options.alphabetical false: unmatched preserve source order
/// (`-008` and `-009` are Vue and JSX parser cases, which the Rust engine does not have.)
#[test]
fn attr_order_fix_007() {
    const _ID: &str = "attr-order-fix-007";
    assert_eq!(
        fixed_with(
            r#"<div data-z="z" id="b" data-a="a"></div>"#,
            serde_json::json!({ "value": ["id"], "options": { "alphabetical": false } })
        ),
        r#"<div id="b" data-z="z" data-a="a"></div>"#
    );
}

/// TS: `[attr-order-fix-010]` — `{ name }` form
#[test]
fn attr_order_fix_010() {
    const _ID: &str = "attr-order-fix-010";
    assert_eq!(
        fixed_with(
            r#"<div class="a" id="b"></div>"#,
            serde_json::json!({ "value": [{ "name": "id" }, { "name": "class" }] })
        ),
        r#"<div id="b" class="a"></div>"#
    );
}

/// TS: `[attr-order-fix-012]` — unlisted attributes within a group sorted alphabetically
/// (`-011` is a JSX spread case; see `v6_attr_order_016` for the Rust-engine counterpart.)
#[test]
fn attr_order_fix_012() {
    const _ID: &str = "attr-order-fix-012";
    assert_eq!(
        fixed_with(
            r#"<div aria-hidden="y" aria-describedby="x" aria-label="z"></div>"#,
            serde_json::json!({ "value": [{ "group": "aria", "order": ["aria-label"] }] })
        ),
        r#"<div aria-label="z" aria-describedby="x" aria-hidden="y"></div>"#
    );
}

/// TS: `[attr-order-fix-013]` — role group placed before aria group
#[test]
fn attr_order_fix_013() {
    const _ID: &str = "attr-order-fix-013";
    assert_eq!(
        fixed_with(
            r#"<ul aria-label="x" role="radiogroup"></ul>"#,
            serde_json::json!({ "value": [{ "group": "role" }, { "group": "aria" }] })
        ),
        r#"<ul role="radiogroup" aria-label="x"></ul>"#
    );
}

/// The whitespace of each position stays, and so do the spaces around `=` of what moves.
#[test]
fn v6_attr_order_015() {
    assert_eq!(
        fixed("<p>日本語😀</p><div  style = 'x'\n\tclass=\"a\" ></div>"),
        "<p>日本語😀</p><div  class=\"a\"\n\tstyle = 'x' ></div>"
    );
}

/// Windows line endings are whitespace like any other: they stay where they are.
#[test]
fn v6_attr_order_017() {
    assert_eq!(
        fixed("<div\r\n  style=\"x\"\r\n  class=\"a\"\r\n></div>"),
        "<div\r\n  class=\"a\"\r\n  style=\"x\"\r\n></div>"
    );
}

/// The Rust-engine counterpart of TS `[attr-order-fix-011]`: a spread attribute has no tokens
/// to measure the range from, so the violation is reported with no fix.
#[test]
fn v6_attr_order_016() {
    let mut arena = html_arena(r#"<div id="a" class="b"></div>"#);
    let (id, _) = arena.elements().next().unwrap();
    let el = arena.element_mut(id).unwrap();
    el.attributes.insert(
        0,
        MLASTAttr::Spread(MLASTSpreadAttr {
            uuid: "spread".to_owned(),
            raw: "{...props}".to_owned(),
            offset: 5,
            line: 1,
            col: 6,
            node_name: "#spread".to_owned(),
        }),
    );
    el.has_spread_attr = true;
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "attr-order": { "value": ["id", "class", { "group": "spread" }] } }
    }))
    .unwrap();
    let violations = lint(&arena, &spec(), &config).violations;
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].fix, None);
}

/// TS: `[attr-order-valid-001]` no violation - already sorted
#[test]
fn attr_order_valid_001() {
    const _ID: &str = "attr-order-valid-001";
    assert_eq!(run(r#"<div class="a" id="b" style="c"></div>"#).len(), 0);
}

/// TS: `[attr-order-invalid-001]` violation - not sorted
#[test]
fn attr_order_invalid_001() {
    const _ID: &str = "attr-order-invalid-001";
    assert_eq!(
        run(r#"<div style="x" class="a"></div>"#),
        [warning(1, 16, r#""class" should be before "style""#, "class")]
    );
}

/// TS: `[attr-order-valid-002]` no violation - single attribute
#[test]
fn attr_order_valid_002() {
    const _ID: &str = "attr-order-valid-002";
    assert_eq!(run(r#"<div class="a"></div>"#).len(), 0);
}

/// TS: `[attr-order-valid-003]` no violation - no attributes
#[test]
fn attr_order_valid_003() {
    const _ID: &str = "attr-order-valid-003";
    assert_eq!(run("<div></div>").len(), 0);
}

/// TS: `[attr-order-valid-004]` no violation - boolean attributes sorted
#[test]
fn attr_order_valid_004() {
    const _ID: &str = "attr-order-valid-004";
    assert_eq!(run("<input disabled readonly />").len(), 0);
}

/// TS: `[attr-order-invalid-002]` violation - boolean attributes not sorted
#[test]
fn attr_order_invalid_002() {
    const _ID: &str = "attr-order-invalid-002";
    assert_eq!(
        run("<input readonly disabled />"),
        [warning(1, 17, r#""disabled" should be before "readonly""#, "disabled")]
    );
}

/// TS: `[attr-order-valid-005]` no violation - matches priority order
#[test]
fn attr_order_valid_005() {
    const _ID: &str = "attr-order-valid-005";
    let rule = serde_json::json!({ "value": ["id", "class", "style"] });
    assert_eq!(run_with(r#"<div id="a" class="b" style="c"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-invalid-003]` violation - class before id
#[test]
fn attr_order_invalid_003() {
    const _ID: &str = "attr-order-invalid-003";
    let rule = serde_json::json!({ "value": ["id", "class"] });
    assert_eq!(
        run_with(r#"<div class="a" id="b"></div>"#, rule),
        [warning(1, 16, r#""id" should be before "class""#, "id")]
    );
}

/// TS: `[attr-order-invalid-004]` unmatched attributes go to the end alphabetically
#[test]
fn attr_order_invalid_004() {
    const _ID: &str = "attr-order-invalid-004";
    let rule = serde_json::json!({ "value": ["id", "class"] });
    assert_eq!(
        run_with(r#"<div id="a" data-z="z" class="b" data-a="a"></div>"#, rule).len(),
        1
    );
}

/// TS: `[attr-order-invalid-005]` unmatched attributes preserve source order when alphabetical: false
#[test]
fn attr_order_invalid_005() {
    const _ID: &str = "attr-order-invalid-005";
    let rule = serde_json::json!({ "value": ["id", "class"], "options": { "alphabetical": false } });
    assert_eq!(
        run_with(r#"<div id="a" data-z="z" class="b" data-a="a"></div>"#, rule).len(),
        1
    );
}

/// TS: `[attr-order-invalid-006]` global group - class and id should precede data-x
#[test]
fn attr_order_invalid_006() {
    const _ID: &str = "attr-order-invalid-006";
    let rule = serde_json::json!({ "value": [{ "group": "global" }] });
    assert_eq!(
        run_with(r#"<div data-x="1" class="a" id="b"></div>"#, rule),
        [warning(1, 17, r#""class" should be before "data-x""#, "class")]
    );
}

/// TS: `[attr-order-invalid-007]` global → aria order
#[test]
fn attr_order_invalid_007() {
    const _ID: &str = "attr-order-invalid-007";
    let rule = serde_json::json!({ "value": [{ "group": "global" }, { "group": "aria" }] });
    assert_eq!(run_with(r#"<div aria-label="x" class="a"></div>"#, rule).len(), 1);
}

/// TS: `[attr-order-valid-006]` no violation - global → aria → data correct order
#[test]
fn attr_order_valid_006() {
    const _ID: &str = "attr-order-valid-006";
    let rule = serde_json::json!({ "value": [{ "group": "global" }, { "group": "aria" }, { "group": "data" }] });
    assert_eq!(
        run_with(r#"<div class="a" id="b" aria-label="x" data-x="1"></div>"#, rule).len(),
        0
    );
}

/// TS: `[attr-order-invalid-008]` event group
#[test]
fn attr_order_invalid_008() {
    const _ID: &str = "attr-order-invalid-008";
    let rule = serde_json::json!({ "value": [{ "group": "global" }, { "group": "event" }] });
    assert_eq!(run_with(r#"<div onclick="x" class="a"></div>"#, rule).len(), 1);
}

/// TS: `[attr-order-invalid-009]` data group
#[test]
fn attr_order_invalid_009() {
    const _ID: &str = "attr-order-invalid-009";
    let rule = serde_json::json!({ "value": [{ "group": "global" }, { "group": "data" }] });
    assert_eq!(run_with(r#"<div data-a="1" class="a"></div>"#, rule).len(), 1);
}

/// TS: `[attr-order-invalid-021]` role group - role should be before aria group
#[test]
fn attr_order_invalid_021() {
    const _ID: &str = "attr-order-invalid-021";
    let rule = serde_json::json!({ "value": [{ "group": "global" }, { "group": "role" }, { "group": "aria" }] });
    assert_eq!(
        run_with(r#"<ul aria-label="x" role="radiogroup"></ul>"#, rule),
        [warning(1, 20, r#""role" should be before "aria-label""#, "role")]
    );
}

/// TS: `[attr-order-valid-019]` no violation - role before aria matches configured order
#[test]
fn attr_order_valid_019() {
    const _ID: &str = "attr-order-valid-019";
    let rule = serde_json::json!({ "value": [{ "group": "global" }, { "group": "role" }, { "group": "aria" }] });
    assert_eq!(run_with(r#"<ul role="radiogroup" aria-label="x"></ul>"#, rule).len(), 0);
}

/// TS: `[attr-order-valid-020]` no violation - aria before role matches configured order
#[test]
fn attr_order_valid_020() {
    const _ID: &str = "attr-order-valid-020";
    let rule = serde_json::json!({ "value": [{ "group": "aria" }, { "group": "role" }] });
    assert_eq!(run_with(r#"<ul aria-label="x" role="radiogroup"></ul>"#, rule).len(), 0);
}

/// TS: `[attr-order-valid-021]` role group does not match aria-* attributes with similar names
#[test]
fn attr_order_valid_021() {
    const _ID: &str = "attr-order-valid-021";
    let rule = serde_json::json!({ "value": [{ "group": "aria" }, { "group": "role" }] });
    assert_eq!(
        run_with(r#"<div aria-roledescription="x" role="y"></div>"#, rule).len(),
        0
    );
}

/// TS: `[attr-order-issue-4033-001]` role placed before aria-* via an explicit role group
#[test]
fn attr_order_issue_4033_001() {
    const _ID: &str = "attr-order-issue-4033-001";
    let rule = serde_json::json!({ "value": [
        { "group": "global", "order": "source-order" },
        { "group": "role", "order": "source-order" },
        { "group": "aria", "order": "source-order" },
    ] });
    assert_eq!(
        run_with(r#"<ul role="radiogroup" aria-label="XXX"></ul>"#, rule).len(),
        0
    );
}

/// TS: `[attr-order-invalid-010]` data- pattern first
#[test]
fn attr_order_invalid_010() {
    const _ID: &str = "attr-order-invalid-010";
    let rule = serde_json::json!({ "value": [{ "pattern": "^data-" }] });
    assert_eq!(run_with(r#"<div class="a" data-x="1"></div>"#, rule).len(), 1);
}

/// TS: `[attr-order-valid-007]` no violation - data- pattern first, already sorted
#[test]
fn attr_order_valid_007() {
    const _ID: &str = "attr-order-valid-007";
    let rule = serde_json::json!({ "value": [{ "pattern": "^data-" }] });
    assert_eq!(run_with(r#"<div data-x="1" class="a"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-valid-008]` explicit name vs global group - explicit wins
#[test]
fn attr_order_valid_008() {
    const _ID: &str = "attr-order-valid-008";
    let rule = serde_json::json!({ "value": ["id", { "group": "global" }] });
    assert_eq!(run_with(r#"<div id="b" class="a"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-invalid-011]` explicit name vs global group - id should come before class
#[test]
fn attr_order_invalid_011() {
    const _ID: &str = "attr-order-invalid-011";
    let rule = serde_json::json!({ "value": ["id", { "group": "global" }] });
    assert_eq!(run_with(r#"<div class="a" id="b"></div>"#, rule).len(), 1);
}

/// TS: `[attr-order-valid-009]` overlapping patterns - first pattern wins
#[test]
fn attr_order_valid_009() {
    const _ID: &str = "attr-order-valid-009";
    let rule = serde_json::json!({ "value": [{ "pattern": "^d" }, { "pattern": "^data-" }] });
    assert_eq!(
        run_with(r#"<div data-bar="2" data-foo="1" class="a"></div>"#, rule).len(),
        0
    );
}

/// TS: `[attr-order-valid-010]` aria pattern vs aria group - first match wins
#[test]
fn attr_order_valid_010() {
    const _ID: &str = "attr-order-valid-010";
    let rule = serde_json::json!({ "value": [{ "pattern": "^aria-label" }, { "group": "aria" }] });
    assert_eq!(run_with(r#"<div aria-label="x" aria-hidden="y"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-invalid-012]` alphabetical order within group (default)
#[test]
fn attr_order_invalid_012() {
    const _ID: &str = "attr-order-invalid-012";
    let rule = serde_json::json!({ "value": [{ "group": "global", "order": "alphabetical" }] });
    assert_eq!(run_with(r#"<div id="b" class="a"></div>"#, rule).len(), 1);
}

/// TS: `[attr-order-valid-011]` source-order within group
#[test]
fn attr_order_valid_011() {
    const _ID: &str = "attr-order-valid-011";
    let rule = serde_json::json!({ "value": [{ "group": "global", "order": "source-order" }] });
    assert_eq!(run_with(r#"<div id="b" class="a"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-invalid-013]` fixed order array within group
#[test]
fn attr_order_invalid_013() {
    const _ID: &str = "attr-order-invalid-013";
    let rule = serde_json::json!({ "value": [{ "group": "aria", "order": ["aria-label", "aria-describedby"] }] });
    assert_eq!(
        run_with(r#"<div aria-describedby="x" aria-label="y"></div>"#, rule).len(),
        1
    );
}

/// TS: `[attr-order-valid-012]` no violation - fixed order array correct
#[test]
fn attr_order_valid_012() {
    const _ID: &str = "attr-order-valid-012";
    let rule = serde_json::json!({ "value": [{ "group": "aria", "order": ["aria-label", "aria-describedby"] }] });
    assert_eq!(
        run_with(r#"<div aria-label="y" aria-describedby="x"></div>"#, rule).len(),
        0
    );
}

/// TS: `[attr-order-invalid-014]` object form { name: "id" } works like string "id"
#[test]
fn attr_order_invalid_014() {
    const _ID: &str = "attr-order-invalid-014";
    let rule = serde_json::json!({ "value": [{ "name": "id" }, { "name": "class" }] });
    assert_eq!(
        run_with(r#"<div class="a" id="b"></div>"#, rule),
        [warning(1, 16, r#""id" should be before "class""#, "id")]
    );
}

/// TS: `[attr-order-valid-013]` no violation - { name } form correct order
#[test]
fn attr_order_valid_013() {
    const _ID: &str = "attr-order-valid-013";
    let rule = serde_json::json!({ "value": [{ "name": "id" }, { "name": "class" }] });
    assert_eq!(run_with(r#"<div id="b" class="a"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-valid-016]` invalid pattern does not crash
#[test]
fn attr_order_valid_016() {
    const _ID: &str = "attr-order-valid-016";
    let rule = serde_json::json!({ "value": [{ "pattern": "[invalid" }] });
    assert_eq!(run_with(r#"<div class="a" id="b"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-invalid-016]` unlisted attributes within group fall back to alphabetical
#[test]
fn attr_order_invalid_016() {
    const _ID: &str = "attr-order-invalid-016";
    let rule = serde_json::json!({ "value": [{ "group": "aria", "order": ["aria-label"] }] });
    assert_eq!(
        run_with(
            r#"<div aria-hidden="y" aria-describedby="x" aria-label="z"></div>"#,
            rule
        )
        .len(),
        1
    );
}

/// TS: `[attr-order-valid-017]` value: true with single element
#[test]
fn attr_order_valid_017() {
    const _ID: &str = "attr-order-valid-017";
    assert_eq!(run(r#"<input type="text" />"#).len(), 0);
}

/// TS: `[attr-order-invalid-018]` empty value array treated as alphabetical
#[test]
fn attr_order_invalid_018() {
    const _ID: &str = "attr-order-invalid-018";
    let rule = serde_json::json!({ "value": [] });
    assert_eq!(run_with(r#"<div style="x" class="a"></div>"#, rule).len(), 1);
}

/// TS: `[attr-order-valid-018]` empty value with alphabetical: false is a no-op
#[test]
fn attr_order_valid_018() {
    const _ID: &str = "attr-order-valid-018";
    let rule = serde_json::json!({ "value": [], "options": { "alphabetical": false } });
    assert_eq!(run_with(r#"<div style="x" class="a"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-invalid-019]` multiple elements sorted independently
#[test]
fn attr_order_invalid_019() {
    const _ID: &str = "attr-order-invalid-019";
    assert_eq!(
        run(r#"<div class="a" id="b"></div><span style="x" class="y"></span>"#).len(),
        1
    );
}

/// TS: `[attr-order-invalid-020]` severity error uses "must" in message
#[test]
fn attr_order_invalid_020() {
    const _ID: &str = "attr-order-invalid-020";
    let rule = serde_json::json!({ "severity": "error" });
    assert_eq!(
        run_with(r#"<div style="x" class="a"></div>"#, rule),
        [brief(
            Severity::Error,
            1,
            16,
            r#""class" must be before "style""#,
            "class"
        )]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_attr_order_001() {
    assert_eq!(
        run(r#"<div style="x" class ="a"></div>"#),
        [warning(1, 16, r#""class" should be before "style""#, "class")]
    );
}

/// Expected values from the TS rule on the same input (the TS HTML parser keeps the
/// case, so TS `[attr-order-invalid-017]` does not need JSX to see it).
#[test]
fn v6_attr_order_002() {
    assert_eq!(
        run("<div style=\"x\"\n  CLASS = \"a\"></div>"),
        [warning(2, 3, r#""CLASS" should be before "style""#, "CLASS")]
    );
}

/// `ẞ` (U+1E9E) < `𝒜` (U+1D49C, the surrogate pair D835 DC9C) < `ｚ` (U+FF5A) as UTF-16;
/// by code point `ｚ` would come before `𝒜`. TS reports nothing.
#[test]
fn v6_attr_order_003() {
    assert_eq!(run(r#"<div ẞ="x" 𝒜="a" ｚ></div>"#), []);
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_attr_order_004() {
    assert_eq!(
        run(r#"<div b="x" a="a" c></div><p z y x></p>"#),
        [
            warning(1, 12, r#""a" should be before "b""#, "a"),
            warning(1, 33, r#""x" should be before "z""#, "x"),
        ]
    );
}

/// Lints `html` with a spread attribute (which only framework parsers produce) put in
/// front of the first element's attributes.
fn run_with_leading_spread(html: &str, rule: serde_json::Value) -> Vec<Brief> {
    let mut arena = html_arena(html);
    let (id, _) = arena.elements().next().unwrap();
    let el = arena.element_mut(id).unwrap();
    el.attributes.insert(
        0,
        MLASTAttr::Spread(MLASTSpreadAttr {
            uuid: "spread".to_owned(),
            raw: "{...props}".to_owned(),
            offset: 5,
            line: 1,
            col: 6,
            node_name: "#spread".to_owned(),
        }),
    );
    el.has_spread_attr = true;
    let config: LintConfig = serde_json::from_value(serde_json::json!({ "rules": { "attr-order": rule } })).unwrap();
    lint(&arena, &spec(), &config)
        .violations
        .into_iter()
        .map(|v| (v.severity, v.line, v.col, v.message, v.raw))
        .collect()
}

/// The JSX counterpart is TS `[attr-order-invalid-015]`
/// (`<div {...props} id="a" className="b"></div>`), for which TS reports
/// `"id" should be before "#spread"` at the `id` attribute.
#[test]
fn v6_attr_order_005() {
    let rule = serde_json::json!({ "value": ["id", "class", { "group": "spread" }] });
    assert_eq!(
        run_with_leading_spread(r#"<div id="a" class="b"></div>"#, rule),
        [warning(1, 6, r##""id" should be before "#spread""##, "id")]
    );
}

/// With no entries, the spread attribute sorts by its name `#spread`, ahead of letters,
/// so `{...props} id` is in order; `class` after `id` is not, and is reported. TS gives
/// the same messages for the JSX inputs `<div {...props} id="a" class="b"></div>` and
/// `<div {...props} id="a"></div>` (at the `class`/`id` columns of those inputs).
#[test]
fn v6_attr_order_006() {
    assert_eq!(
        run_with_leading_spread(r#"<div id="a" class="b"></div>"#, serde_json::json!(true)),
        [warning(1, 13, r#""class" should be before "id""#, "class")]
    );
    let rule = serde_json::json!({ "value": ["id", { "group": "spread" }] });
    assert_eq!(
        run_with_leading_spread(r#"<div id="a"></div>"#, rule),
        [warning(1, 6, r##""id" should be before "#spread""##, "id")]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_attr_order_007() {
    let rule = serde_json::json!({ "value": [
        { "group": "data" }, { "group": "aria" }, { "group": "event" }, { "group": "role" }, { "group": "global" },
    ] });
    assert_eq!(
        run_with(
            r#"<div onclick="x" aria-x="a" data-="1" aria-="2" class="c" role="r"></div>"#,
            rule
        ),
        [warning(1, 18, r#""aria-x" should be before "onclick""#, "aria-x")]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_attr_order_008() {
    let rule = serde_json::json!({ "value": [{ "group": "unknown" }] });
    assert_eq!(
        run_with("<div b a></div>", rule),
        [warning(1, 8, r#""a" should be before "b""#, "a")]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_attr_order_009() {
    let rule = serde_json::json!({ "value": [{ "pattern": "^[ab]$", "order": "weird" }] });
    assert_eq!(run_with("<div b a></div>", rule), []);
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_attr_order_010() {
    let rule = serde_json::json!({
        "value": [{ "pattern": "^[ab]$", "order": "source-order" }],
        "options": { "alphabetical": false },
    });
    assert_eq!(run_with("<div b a></div>", rule), []);
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_attr_order_011() {
    let rule = serde_json::json!({ "value": [{ "pattern": "^[ab]$", "order": ["b"] }] });
    assert_eq!(
        run_with("<div c a b></div>", rule),
        [warning(1, 10, r#""b" should be before "c""#, "b")]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_attr_order_012() {
    let rule = serde_json::json!({ "value": [{ "pattern": "(?<=t)itle" }] });
    assert_eq!(run_with(r#"<div title="x" id="a"></div>"#, rule), []);
}

/// A pretender built from a bare element name has no attributes of its own, so there
/// is nothing to order. Expected values from the TS rule on the same input.
#[test]
fn v6_attr_order_013() {
    assert_eq!(
        lint_brief(
            "attr-order",
            r#"<x-a href="x" class="b"></x-a>"#,
            serde_json::json!({
                "rules": { "attr-order": true },
                "pretenders": [{ "selector": "x-a", "as": "a" }],
            }),
        ),
        []
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_attr_order_014() {
    let rule = serde_json::json!({ "severity": "info" });
    assert_eq!(
        run_with("<div b a></div>", rule),
        [brief(Severity::Info, 1, 8, r#""a" should be before "b""#, "a")]
    );
}

/// Expected values from the TS rule on the same input: the HTML parser lower-cases the name, so
/// `ID` is `id` and comes after `class`, though `I` is before `c` in a byte order.
#[test]
fn v6_attr_order_018() {
    assert_eq!(run("<div class ID></div>"), []);
    assert_eq!(
        run("<div ID class></div>"),
        [warning(1, 9, r#""class" should be before "ID""#, "class")]
    );
}

/// Expected values from the TS rule on the same input: the HTML parser restores `viewBox` of an
/// SVG element, which is before `view_x` (`B` is before `_`), while `viewbox` would be after it.
#[test]
fn v6_attr_order_019() {
    assert_eq!(run("<svg viewbox view_x></svg>"), []);
    assert_eq!(
        run("<svg view_x viewbox></svg>"),
        [warning(1, 13, r#""viewbox" should be before "view_x""#, "viewbox")]
    );
}

/// Expected values from the TS rule on the same input (JSX): code sets the name of an SVG element
/// as written, so `ROLE` is not `role` and is before it; an HTML element folds the name.
#[test]
fn v6_attr_order_020() {
    use markuplint_core::mlast::{AttrNameRoute, DocumentSettings};
    let run_dom_api = |html: &str| {
        crate::test_util::lint_brief_with_settings(
            "attr-order",
            html,
            serde_json::json!({ "rules": { "attr-order": true } }),
            DocumentSettings {
                attr_name_route: AttrNameRoute::DomApi,
                ..DocumentSettings::default()
            },
        )
    };
    assert_eq!(
        run_dom_api("<svg role ROLE></svg>"),
        [warning(1, 11, r#""ROLE" should be before "role""#, "ROLE")]
    );
    assert_eq!(run_dom_api("<svg ROLE role></svg>"), []);
    assert_eq!(run_dom_api("<div role ROLE></div>"), []);
}
