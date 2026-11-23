//! Tests for `attr-order` rule.
//!
//! Test ID mapping (TS → Rust):
//!   attr-order-001   → attr_order_001
//!   attr-order-002   → attr_order_002
//!   attr-order-003   → attr_order_003
//!   attr-order-004   → attr_order_004
//!   attr-order-005   → attr_order_005
//!   attr-order-006   → attr_order_006
//!   attr-order-007   → attr_order_007
//!   attr-order-008   → attr_order_008
//!   attr-order-009   → attr_order_009
//!   attr-order-010   → attr_order_010
//!   attr-order-011   → attr_order_011
//!   attr-order-012   → attr_order_012
//!   attr-order-013   → attr_order_013
//!   attr-order-014   → attr_order_014
//!   attr-order-015   → attr_order_015
//!   attr-order-016   → attr_order_016
//!   attr-order-017   → attr_order_017
//!   attr-order-018   → attr_order_018
//!   attr-order-019   → attr_order_019
//!   attr-order-021   → attr_order_021
//!   attr-order-022   → attr_order_022
//!   attr-order-023   → attr_order_023
//!   attr-order-024   → attr_order_024
//!   attr-order-025   → attr_order_025
//!   attr-order-026   → attr_order_026
//!   attr-order-027   → attr_order_027
//!   attr-order-028   → attr_order_028
//!   attr-order-029   → attr_order_029
//!   attr-order-030   → attr_order_030
//!   attr-order-031   → attr_order_031
//!   attr-order-041   → attr_order_041
//!   attr-order-042   → attr_order_042
//!   attr-order-044   — SKIP: JSX parser (spread attribute) not available in Rust
//!   attr-order-045   — SKIP: JSX parser (spread attribute) not available in Rust; see v6_attr_order_005
//!   attr-order-047   — SKIP: JSX parser (spread attribute) not available in Rust; see v6_attr_order_006
//!   attr-order-048   → attr_order_048
//!   attr-order-049   → attr_order_049
//!   attr-order-051   → attr_order_051
//!   attr-order-052   — SKIP: JSX parser not available in Rust; see v6_attr_order_002
//!   attr-order-053   → attr_order_053
//!   attr-order-054   → attr_order_054
//!   attr-order-055   → attr_order_055
//!   attr-order-056   → attr_order_056
//!   attr-order-032 … fix-007, fix-010, fix-012, fix-013 → attr_order_fix_NNN
//!   attr-order-039/fix-009/fix-011 — SKIP: Vue/JSX parsers not available in Rust; see v6_attr_order_016
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
//!   attr-order-069   → attr_order_069 (the JSX parser is stood in for by a custom element)
//!   attr-order-070   → attr_order_070
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

/// TS: `[attr-order-032]` — alphabetical sort
#[test]
fn attr_order_032() {
    const _ID: &str = "attr-order-032";
    assert_eq!(
        fixed(r#"<div style="x" class="a"></div>"#),
        r#"<div class="a" style="x"></div>"#
    );
}

/// TS: `[attr-order-033]` — three attributes alphabetical
#[test]
fn attr_order_033() {
    const _ID: &str = "attr-order-033";
    assert_eq!(
        fixed(r#"<div style="x" class="a" id="b"></div>"#),
        r#"<div class="a" id="b" style="x"></div>"#
    );
}

/// TS: `[attr-order-034]` — priority list
#[test]
fn attr_order_034() {
    const _ID: &str = "attr-order-034";
    assert_eq!(
        fixed_with(
            r#"<div class="a" id="b"></div>"#,
            serde_json::json!({ "value": ["id", "class"] })
        ),
        r#"<div id="b" class="a"></div>"#
    );
}

/// TS: `[attr-order-035]` — multiline attributes preserve spacing
#[test]
fn attr_order_035() {
    const _ID: &str = "attr-order-035";
    assert_eq!(
        fixed("<div\n  style=\"x\"\n  class=\"a\"\n></div>"),
        "<div\n  class=\"a\"\n  style=\"x\"\n></div>"
    );
}

/// TS: `[attr-order-036]` — boolean attributes
#[test]
fn attr_order_036() {
    const _ID: &str = "attr-order-036";
    assert_eq!(fixed("<input readonly disabled />"), "<input disabled readonly />");
}

/// TS: `[attr-order-037]` — group order
#[test]
fn attr_order_037() {
    const _ID: &str = "attr-order-037";
    assert_eq!(
        fixed_with(
            r#"<div data-x="1" class="a" id="b"></div>"#,
            serde_json::json!({ "value": [{ "group": "global" }, { "group": "data" }] })
        ),
        r#"<div class="a" id="b" data-x="1"></div>"#
    );
}

/// TS: `[attr-order-038]` — options.alphabetical false: unmatched preserve source order
/// (`-008` and `-009` are Vue and JSX parser cases, which the Rust engine does not have.)
#[test]
fn attr_order_038() {
    const _ID: &str = "attr-order-038";
    assert_eq!(
        fixed_with(
            r#"<div data-z="z" id="b" data-a="a"></div>"#,
            serde_json::json!({ "value": ["id"], "options": { "alphabetical": false } })
        ),
        r#"<div id="b" data-z="z" data-a="a"></div>"#
    );
}

/// TS: `[attr-order-043]` — `{ name }` form
#[test]
fn attr_order_043() {
    const _ID: &str = "attr-order-043";
    assert_eq!(
        fixed_with(
            r#"<div class="a" id="b"></div>"#,
            serde_json::json!({ "value": [{ "name": "id" }, { "name": "class" }] })
        ),
        r#"<div id="b" class="a"></div>"#
    );
}

/// TS: `[attr-order-050]` — unlisted attributes within a group sorted alphabetically
/// (`-011` is a JSX spread case; see `v6_attr_order_016` for the Rust-engine counterpart.)
#[test]
fn attr_order_050() {
    const _ID: &str = "attr-order-050";
    assert_eq!(
        fixed_with(
            r#"<div aria-hidden="y" aria-describedby="x" aria-label="z"></div>"#,
            serde_json::json!({ "value": [{ "group": "aria", "order": ["aria-label"] }] })
        ),
        r#"<div aria-label="z" aria-describedby="x" aria-hidden="y"></div>"#
    );
}

/// TS: `[attr-order-020]` — role group placed before aria group
#[test]
fn attr_order_020() {
    const _ID: &str = "attr-order-020";
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

/// The Rust-engine counterpart of TS `[attr-order-046]`: a spread attribute has no tokens
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

/// TS: `[attr-order-001]` no violation - already sorted
#[test]
fn attr_order_001() {
    const _ID: &str = "attr-order-001";
    assert_eq!(run(r#"<div class="a" id="b" style="c"></div>"#).len(), 0);
}

/// TS: `[attr-order-002]` violation - not sorted
#[test]
fn attr_order_002() {
    const _ID: &str = "attr-order-002";
    assert_eq!(
        run(r#"<div style="x" class="a"></div>"#),
        [warning(1, 16, r#""class" should be before "style""#, "class")]
    );
}

/// TS: `[attr-order-003]` no violation - single attribute
#[test]
fn attr_order_003() {
    const _ID: &str = "attr-order-003";
    assert_eq!(run(r#"<div class="a"></div>"#).len(), 0);
}

/// TS: `[attr-order-004]` no violation - no attributes
#[test]
fn attr_order_004() {
    const _ID: &str = "attr-order-004";
    assert_eq!(run("<div></div>").len(), 0);
}

/// TS: `[attr-order-005]` no violation - boolean attributes sorted
#[test]
fn attr_order_005() {
    const _ID: &str = "attr-order-005";
    assert_eq!(run("<input disabled readonly />").len(), 0);
}

/// TS: `[attr-order-006]` violation - boolean attributes not sorted
#[test]
fn attr_order_006() {
    const _ID: &str = "attr-order-006";
    assert_eq!(
        run("<input readonly disabled />"),
        [warning(1, 17, r#""disabled" should be before "readonly""#, "disabled")]
    );
}

/// TS: `[attr-order-007]` no violation - matches priority order
#[test]
fn attr_order_007() {
    const _ID: &str = "attr-order-007";
    let rule = serde_json::json!({ "value": ["id", "class", "style"] });
    assert_eq!(run_with(r#"<div id="a" class="b" style="c"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-008]` violation - class before id
#[test]
fn attr_order_008() {
    const _ID: &str = "attr-order-008";
    let rule = serde_json::json!({ "value": ["id", "class"] });
    assert_eq!(
        run_with(r#"<div class="a" id="b"></div>"#, rule),
        [warning(1, 16, r#""id" should be before "class""#, "id")]
    );
}

/// TS: `[attr-order-009]` unmatched attributes go to the end alphabetically
#[test]
fn attr_order_009() {
    const _ID: &str = "attr-order-009";
    let rule = serde_json::json!({ "value": ["id", "class"] });
    assert_eq!(
        run_with(r#"<div id="a" data-z="z" class="b" data-a="a"></div>"#, rule).len(),
        1
    );
}

/// TS: `[attr-order-010]` unmatched attributes preserve source order when alphabetical: false
#[test]
fn attr_order_010() {
    const _ID: &str = "attr-order-010";
    let rule = serde_json::json!({ "value": ["id", "class"], "options": { "alphabetical": false } });
    assert_eq!(
        run_with(r#"<div id="a" data-z="z" class="b" data-a="a"></div>"#, rule).len(),
        1
    );
}

/// TS: `[attr-order-011]` global group - class and id should precede data-x
#[test]
fn attr_order_011() {
    const _ID: &str = "attr-order-011";
    let rule = serde_json::json!({ "value": [{ "group": "global" }] });
    assert_eq!(
        run_with(r#"<div data-x="1" class="a" id="b"></div>"#, rule),
        [warning(1, 17, r#""class" should be before "data-x""#, "class")]
    );
}

/// TS: `[attr-order-012]` global → aria order
#[test]
fn attr_order_012() {
    const _ID: &str = "attr-order-012";
    let rule = serde_json::json!({ "value": [{ "group": "global" }, { "group": "aria" }] });
    assert_eq!(run_with(r#"<div aria-label="x" class="a"></div>"#, rule).len(), 1);
}

/// TS: `[attr-order-013]` no violation - global → aria → data correct order
#[test]
fn attr_order_013() {
    const _ID: &str = "attr-order-013";
    let rule = serde_json::json!({ "value": [{ "group": "global" }, { "group": "aria" }, { "group": "data" }] });
    assert_eq!(
        run_with(r#"<div class="a" id="b" aria-label="x" data-x="1"></div>"#, rule).len(),
        0
    );
}

/// TS: `[attr-order-014]` event group
#[test]
fn attr_order_014() {
    const _ID: &str = "attr-order-014";
    let rule = serde_json::json!({ "value": [{ "group": "global" }, { "group": "event" }] });
    assert_eq!(run_with(r#"<div onclick="x" class="a"></div>"#, rule).len(), 1);
}

/// TS: `[attr-order-015]` data group
#[test]
fn attr_order_015() {
    const _ID: &str = "attr-order-015";
    let rule = serde_json::json!({ "value": [{ "group": "global" }, { "group": "data" }] });
    assert_eq!(run_with(r#"<div data-a="1" class="a"></div>"#, rule).len(), 1);
}

/// TS: `[attr-order-016]` role group - role should be before aria group
#[test]
fn attr_order_016() {
    const _ID: &str = "attr-order-016";
    let rule = serde_json::json!({ "value": [{ "group": "global" }, { "group": "role" }, { "group": "aria" }] });
    assert_eq!(
        run_with(r#"<ul aria-label="x" role="radiogroup"></ul>"#, rule),
        [warning(1, 20, r#""role" should be before "aria-label""#, "role")]
    );
}

/// TS: `[attr-order-017]` no violation - role before aria matches configured order
#[test]
fn attr_order_017() {
    const _ID: &str = "attr-order-017";
    let rule = serde_json::json!({ "value": [{ "group": "global" }, { "group": "role" }, { "group": "aria" }] });
    assert_eq!(run_with(r#"<ul role="radiogroup" aria-label="x"></ul>"#, rule).len(), 0);
}

/// TS: `[attr-order-018]` no violation - aria before role matches configured order
#[test]
fn attr_order_018() {
    const _ID: &str = "attr-order-018";
    let rule = serde_json::json!({ "value": [{ "group": "aria" }, { "group": "role" }] });
    assert_eq!(run_with(r#"<ul aria-label="x" role="radiogroup"></ul>"#, rule).len(), 0);
}

/// TS: `[attr-order-019]` role group does not match aria-* attributes with similar names
#[test]
fn attr_order_019() {
    const _ID: &str = "attr-order-019";
    let rule = serde_json::json!({ "value": [{ "group": "aria" }, { "group": "role" }] });
    assert_eq!(
        run_with(r#"<div aria-roledescription="x" role="y"></div>"#, rule).len(),
        0
    );
}

/// TS: `[attr-order-021]` role placed before aria-* via an explicit role group
#[test]
fn attr_order_021() {
    const _ID: &str = "attr-order-021";
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

/// TS: `[attr-order-022]` data- pattern first
#[test]
fn attr_order_022() {
    const _ID: &str = "attr-order-022";
    let rule = serde_json::json!({ "value": [{ "pattern": "^data-" }] });
    assert_eq!(run_with(r#"<div class="a" data-x="1"></div>"#, rule).len(), 1);
}

/// TS: `[attr-order-023]` no violation - data- pattern first, already sorted
#[test]
fn attr_order_023() {
    const _ID: &str = "attr-order-023";
    let rule = serde_json::json!({ "value": [{ "pattern": "^data-" }] });
    assert_eq!(run_with(r#"<div data-x="1" class="a"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-024]` explicit name vs global group - explicit wins
#[test]
fn attr_order_024() {
    const _ID: &str = "attr-order-024";
    let rule = serde_json::json!({ "value": ["id", { "group": "global" }] });
    assert_eq!(run_with(r#"<div id="b" class="a"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-025]` explicit name vs global group - id should come before class
#[test]
fn attr_order_025() {
    const _ID: &str = "attr-order-025";
    let rule = serde_json::json!({ "value": ["id", { "group": "global" }] });
    assert_eq!(run_with(r#"<div class="a" id="b"></div>"#, rule).len(), 1);
}

/// TS: `[attr-order-026]` overlapping patterns - first pattern wins
#[test]
fn attr_order_026() {
    const _ID: &str = "attr-order-026";
    let rule = serde_json::json!({ "value": [{ "pattern": "^d" }, { "pattern": "^data-" }] });
    assert_eq!(
        run_with(r#"<div data-bar="2" data-foo="1" class="a"></div>"#, rule).len(),
        0
    );
}

/// TS: `[attr-order-027]` aria pattern vs aria group - first match wins
#[test]
fn attr_order_027() {
    const _ID: &str = "attr-order-027";
    let rule = serde_json::json!({ "value": [{ "pattern": "^aria-label" }, { "group": "aria" }] });
    assert_eq!(run_with(r#"<div aria-label="x" aria-hidden="y"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-028]` alphabetical order within group (default)
#[test]
fn attr_order_028() {
    const _ID: &str = "attr-order-028";
    let rule = serde_json::json!({ "value": [{ "group": "global", "order": "alphabetical" }] });
    assert_eq!(run_with(r#"<div id="b" class="a"></div>"#, rule).len(), 1);
}

/// TS: `[attr-order-029]` source-order within group
#[test]
fn attr_order_029() {
    const _ID: &str = "attr-order-029";
    let rule = serde_json::json!({ "value": [{ "group": "global", "order": "source-order" }] });
    assert_eq!(run_with(r#"<div id="b" class="a"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-030]` fixed order array within group
#[test]
fn attr_order_030() {
    const _ID: &str = "attr-order-030";
    let rule = serde_json::json!({ "value": [{ "group": "aria", "order": ["aria-label", "aria-describedby"] }] });
    assert_eq!(
        run_with(r#"<div aria-describedby="x" aria-label="y"></div>"#, rule).len(),
        1
    );
}

/// TS: `[attr-order-031]` no violation - fixed order array correct
#[test]
fn attr_order_031() {
    const _ID: &str = "attr-order-031";
    let rule = serde_json::json!({ "value": [{ "group": "aria", "order": ["aria-label", "aria-describedby"] }] });
    assert_eq!(
        run_with(r#"<div aria-label="y" aria-describedby="x"></div>"#, rule).len(),
        0
    );
}

/// TS: `[attr-order-041]` object form { name: "id" } works like string "id"
#[test]
fn attr_order_041() {
    const _ID: &str = "attr-order-041";
    let rule = serde_json::json!({ "value": [{ "name": "id" }, { "name": "class" }] });
    assert_eq!(
        run_with(r#"<div class="a" id="b"></div>"#, rule),
        [warning(1, 16, r#""id" should be before "class""#, "id")]
    );
}

/// TS: `[attr-order-042]` no violation - { name } form correct order
#[test]
fn attr_order_042() {
    const _ID: &str = "attr-order-042";
    let rule = serde_json::json!({ "value": [{ "name": "id" }, { "name": "class" }] });
    assert_eq!(run_with(r#"<div id="b" class="a"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-048]` invalid pattern does not crash
#[test]
fn attr_order_048() {
    const _ID: &str = "attr-order-048";
    let rule = serde_json::json!({ "value": [{ "pattern": "[invalid" }] });
    assert_eq!(run_with(r#"<div class="a" id="b"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-049]` unlisted attributes within group fall back to alphabetical
#[test]
fn attr_order_049() {
    const _ID: &str = "attr-order-049";
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

/// TS: `[attr-order-051]` value: true with single element
#[test]
fn attr_order_051() {
    const _ID: &str = "attr-order-051";
    assert_eq!(run(r#"<input type="text" />"#).len(), 0);
}

/// TS: `[attr-order-053]` empty value array treated as alphabetical
#[test]
fn attr_order_053() {
    const _ID: &str = "attr-order-053";
    let rule = serde_json::json!({ "value": [] });
    assert_eq!(run_with(r#"<div style="x" class="a"></div>"#, rule).len(), 1);
}

/// TS: `[attr-order-054]` empty value with alphabetical: false is a no-op
#[test]
fn attr_order_054() {
    const _ID: &str = "attr-order-054";
    let rule = serde_json::json!({ "value": [], "options": { "alphabetical": false } });
    assert_eq!(run_with(r#"<div style="x" class="a"></div>"#, rule).len(), 0);
}

/// TS: `[attr-order-055]` multiple elements sorted independently
#[test]
fn attr_order_055() {
    const _ID: &str = "attr-order-055";
    assert_eq!(
        run(r#"<div class="a" id="b"></div><span style="x" class="y"></span>"#).len(),
        1
    );
}

/// TS: `[attr-order-056]` severity error uses "must" in message
#[test]
fn attr_order_056() {
    const _ID: &str = "attr-order-056";
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
/// case, so TS `[attr-order-052]` does not need JSX to see it).
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

/// The JSX counterpart is TS `[attr-order-045]`
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

/// TS: `[attr-order-069]` attributes that a pretender made are not in the source, so
/// their order is not checked
#[test]
fn attr_order_069() {
    const _ID: &str = "attr-order-069";
    assert_eq!(
        lint_brief(
            "attr-order",
            "<x-btn></x-btn>",
            serde_json::json!({
                "rules": { "attr-order": { "value": ["id", "class", "type"], "severity": "warning" } },
                "pretenders": [{
                    "selector": "x-btn",
                    "as": { "element": "button", "attrs": [
                        { "name": "type", "value": "button" },
                        { "name": "id", "value": "a" },
                    ] },
                }],
            }),
        ),
        []
    );
}

/// TS: `[attr-order-070]` attributes that a pretender takes over from the source are
/// still checked
#[test]
fn attr_order_070() {
    const _ID: &str = "attr-order-070";
    assert_eq!(
        lint_brief(
            "attr-order",
            r#"<x-btn type="button" id="b"></x-btn>"#,
            serde_json::json!({
                "rules": { "attr-order": { "value": ["id", "class", "type"], "severity": "warning" } },
                "pretenders": [{ "selector": "x-btn", "as": { "element": "button", "inheritAttrs": true } }],
            }),
        ),
        [warning(1, 22, r#""id" should be before "type""#, "id")]
    );
}
