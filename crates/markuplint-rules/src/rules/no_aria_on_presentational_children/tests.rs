//! Tests for `no-aria-on-presentational-children` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-aria-on-presentational-children-001  → no_aria_on_presentational_children_001
//!   no-aria-on-presentational-children-003  → no_aria_on_presentational_children_003
//!   no-aria-on-presentational-children-004  → no_aria_on_presentational_children_004
//!   the other `no-aria-on-presentational-children-<category>-NNN` of `index.spec.ts` that take HTML
//!     → `no_aria_on_presentational_children_<category>_NNN`, with the same input and the same
//!     violations. The ones that take the JSX parser or a pretender (`issue-4309-003`, `-004`, `-006`,
//!     `-007`, `issue-4408-002`, `-014`, `-020`) are run against the Rust engine by the parity run of
//!     the TS specs only, as the Rust tests parse HTML.
//!   `invalid-001` keeps the input of the earlier TS spec (an `aria-label` on a child of a button),
//!     which the TS rule no longer reports; the TS spec's own input is in `v6_..._007`.
//!   v6_no_aria_on_presentational_children_001  — Rust-only: message, position and scope (the attribute) of the report
//!   v6_no_aria_on_presentational_children_002  — Rust-only: an implicit role counts; `aria-hidden` is not reported
//!   v6_no_aria_on_presentational_children_003  — Rust-only: the closest such ancestor is named
//!   v6_no_aria_on_presentational_children_004  — Rust-only: which attributes and elements count
//!   v6_no_aria_on_presentational_children_005  — Rust-only: other roles, role tokens and ARIA version
//!   v6_no_aria_on_presentational_children_006  — Rust-only: severity, multi-line position and `rules: false`, for an `aria-label` that takes no effect
//!   v6_no_aria_on_presentational_children_007  — Rust-only: severity option and `rules: false`
//!   v6_no_aria_on_presentational_children_008  — Rust-only: an ancestor whose role is not known until it is rendered is passed over

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

fn html_arena(html: &str) -> markuplint_dom::arena::DomArena {
    let as_doc = markuplint_html_parser::should_parse_as_document(html);
    let is_fragment = !as_doc;
    let parser_arena = if is_fragment {
        markuplint_html_parser::parse_fragment(html)
    } else {
        markuplint_html_parser::parse_document(html)
    };
    html_builder::build_from_html_arena(html, &parser_arena, is_fragment)
}

fn run_rule(html: &str, value: serde_json::Value) -> Vec<Violation> {
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-aria-on-presentational-children": value }
    }))
    .unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// `(line 1, col, raw, role)` of each violation, which the TS specs assert with the message of
/// `ineffective(role)` and the severity `warning`.
type AttrExpected<'a> = (u32, &'a str, &'a str);

fn ineffective(role: &str) -> String {
    format!(
        "It may be ineffective because it has the \"{role}\" role as an ancestor that doesn't expose its descendants to the accessibility tree"
    )
}

fn assert_attr_violations(actual: &[Violation], expected: &[AttrExpected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (col, raw, role)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, "no-aria-on-presentational-children");
        assert_eq!(violation.severity, Severity::Warning);
        assert_eq!(violation.line, 1);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, ineffective(role));
        assert_eq!(violation.raw, *raw);
    }
}

/// `(severity, line, col, message, raw)`, the fields the TS specs assert.
type Expected<'a> = (Severity, u32, u32, &'a str, &'a str);

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (severity, line, col, message, raw)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, "no-aria-on-presentational-children");
        assert_eq!(violation.severity, *severity);
        assert_eq!(violation.line, *line);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, *message);
        assert_eq!(violation.raw, *raw);
    }
}

const BUTTON_MESSAGE: &str = "It may be ineffective because it has the \"button\" role as an ancestor that doesn't expose its descendants to the accessibility tree";
const IMG_MESSAGE: &str = "It may be ineffective because it has the \"img\" role as an ancestor that doesn't expose its descendants to the accessibility tree";

fn message_for(role: &str) -> String {
    format!(
        "It may be ineffective because it has the \"{role}\" role as an ancestor that doesn't expose its descendants to the accessibility tree"
    )
}

/// TS: `[no-aria-on-presentational-children-001]`
#[test]
fn no_aria_on_presentational_children_001() {
    const _ID: &str = "no-aria-on-presentational-children-001";
    assert_violations(
        &run_rule(
            r#"<div role="group"><span aria-label="text"></span></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-002]` aria-label on a child of a role named from content is not reported
#[test]
fn no_aria_on_presentational_children_002() {
    const _ID: &str = "no-aria-on-presentational-children-002";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button"><span aria-label="text"></span></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-003]`
#[test]
fn no_aria_on_presentational_children_003() {
    const _ID: &str = "no-aria-on-presentational-children-003";
    let violations = run_rule(
        r#"<div role="button"><span aria-label="text"></span></div>"#,
        serde_json::json!(true),
    );
    assert_eq!(violations.len(), 0, "violations: {violations:?}");
}

/// TS: `[no-aria-on-presentational-children-004]`
#[test]
fn no_aria_on_presentational_children_004() {
    const _ID: &str = "no-aria-on-presentational-children-004";
    assert_violations(
        &run_rule(r#"<div role="img"><span>text</span></div>"#, serde_json::json!(true)),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-005]` an upper-case aria-label on a child of a button is not reported, like the lower-case one
#[test]
fn no_aria_on_presentational_children_005() {
    const _ID: &str = "no-aria-on-presentational-children-005";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button"><span ARIA-LABEL="text"></span></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-006]` an upper-case role on a child is reported like the lower-case one
#[test]
fn no_aria_on_presentational_children_006() {
    const _ID: &str = "no-aria-on-presentational-children-006";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button"><span ROLE="img"></span></div>"#,
            serde_json::json!(true),
        ),
        &[(26, r#"ROLE="img""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-009]` an upper-case aria-describedby on a child is reported like the lower-case one
#[test]
fn no_aria_on_presentational_children_009() {
    const _ID: &str = "no-aria-on-presentational-children-009";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button"><span ARIA-DESCRIBEDBY="d"></span></div><p id="d">d</p>"#,
            serde_json::json!(true),
        ),
        &[(26, r#"ARIA-DESCRIBEDBY="d""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-012]` aria-hidden="true" on a decorative svg in a button is not reported
#[test]
fn no_aria_on_presentational_children_012() {
    const _ID: &str = "no-aria-on-presentational-children-012";
    assert_attr_violations(
        &run_rule(
            r#"<button type="button"><svg aria-hidden="true" focusable="false" viewBox="0 0 1 1"><path d="M0 0" /></svg>Click</button>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-014]` aria-label and aria-labelledby on a child of a button are not reported
#[test]
fn no_aria_on_presentational_children_014() {
    const _ID: &str = "no-aria-on-presentational-children-014";
    assert_attr_violations(
        &run_rule(
            r#"<button type="button"><span aria-label="Save">x</span><span aria-labelledby="file">y</span></button><span id="file">report.pdf</span>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-015]` aria-hidden="true" on a child of a role whose name comes from content only is not reported
#[test]
fn no_aria_on_presentational_children_015() {
    const _ID: &str = "no-aria-on-presentational-children-015";
    assert_attr_violations(
        &run_rule(
            r#"<div role="tab"><span aria-hidden="true">★</span>Settings</div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-016]` aria-hidden="true" on a child of a role that is not named from content is reported
#[test]
fn no_aria_on_presentational_children_016() {
    const _ID: &str = "no-aria-on-presentational-children-016";
    assert_attr_violations(
        &run_rule(
            r#"<div role="img"><span aria-hidden="true">deco</span></div>"#,
            serde_json::json!(true),
        ),
        &[(23, r#"aria-hidden="true""#, "img")],
    );
}

/// TS: `[no-aria-on-presentational-children-017]` aria-hidden="true" in a button named by aria-label is reported
#[test]
fn no_aria_on_presentational_children_017() {
    const _ID: &str = "no-aria-on-presentational-children-017";
    assert_attr_violations(
        &run_rule(
            r#"<button type="button" aria-label="Save"><svg aria-hidden="true"></svg></button>"#,
            serde_json::json!(true),
        ),
        &[(46, r#"aria-hidden="true""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-018]` aria-hidden="true" under a child named by aria-label is reported
#[test]
fn no_aria_on_presentational_children_018() {
    const _ID: &str = "no-aria-on-presentational-children-018";
    assert_attr_violations(
        &run_rule(
            r#"<button type="button"><span aria-label="Save"><svg aria-hidden="true"></svg></span></button>"#,
            serde_json::json!(true),
        ),
        &[(52, r#"aria-hidden="true""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-019]` aria-label under a hidden child is reported
#[test]
fn no_aria_on_presentational_children_019() {
    const _ID: &str = "no-aria-on-presentational-children-019";
    assert_attr_violations(
        &run_rule(
            r#"<button type="button"><span aria-hidden="true"><span aria-label="Save">x</span></span>Click</button>"#,
            serde_json::json!(true),
        ),
        &[(54, r#"aria-label="Save""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-020]` aria-label on an element that is itself hidden is reported
#[test]
fn no_aria_on_presentational_children_020() {
    const _ID: &str = "no-aria-on-presentational-children-020";
    assert_attr_violations(
        &run_rule(
            r#"<button type="button"><span aria-hidden="true" aria-label="Save">x</span>Click</button>"#,
            serde_json::json!(true),
        ),
        &[(48, r#"aria-label="Save""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-021]` attributes that do not reach the name of a button are still reported
#[test]
fn no_aria_on_presentational_children_021() {
    const _ID: &str = "no-aria-on-presentational-children-021";
    assert_attr_violations(
        &run_rule(
            r#"<button type="button"><span aria-hidden="false">a</span><span aria-label="">b</span><span aria-describedby="d">c</span><span role="img">d</span></button><span id="d">desc</span>"#,
            serde_json::json!(true),
        ),
        &[
            (29, r#"aria-hidden="false""#, "button"),
            (63, r#"aria-label="""#, "button"),
            (91, r#"aria-describedby="d""#, "button"),
            (126, r#"role="img""#, "button"),
        ],
    );
}

/// TS: `[no-aria-on-presentational-children-022]` role="none" that drops the title of an svg from the name of a button is not reported
#[test]
fn no_aria_on_presentational_children_022() {
    const _ID: &str = "no-aria-on-presentational-children-022";
    assert_attr_violations(
        &run_rule(
            r#"<button type="button"><svg role="none"><title>Save</title></svg><svg role="presentation"><title>Open</title></svg>Click</button>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-023]` role="none" that does not change the name of a button is reported
#[test]
fn no_aria_on_presentational_children_023() {
    const _ID: &str = "no-aria-on-presentational-children-023";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button"><img src="s.svg" alt="" role="none"><span role="none">Save</span><img src="o.svg" alt="Open" role="none" tabindex="0"></div>"#,
            serde_json::json!(true),
        ),
        &[
            (44, r#"role="none""#, "button"),
            (62, r#"role="none""#, "button"),
            (113, r#"role="none""#, "button"),
        ],
    );
}

/// TS: `[no-aria-on-presentational-children-024]` role="none" that drops the alt of an image from the name of a button is not reported, though ARIA in HTML does not permit it
#[test]
fn no_aria_on_presentational_children_024() {
    const _ID: &str = "no-aria-on-presentational-children-024";
    assert_attr_violations(
        &run_rule(
            r#"<button type="button"><img src="s.svg" alt="Save" role="none"><img src="o.svg" alt="Open" role="presentation"></button>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-026]` aria-label under an element named by its own host language label is reported
#[test]
fn no_aria_on_presentational_children_026() {
    const _ID: &str = "no-aria-on-presentational-children-026";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button"><fieldset title="t"><span aria-label="x">y</span></fieldset></div>"#,
            serde_json::json!(true),
        ),
        &[(46, r#"aria-label="x""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-027]` aria-label in a hidden button is reported
#[test]
fn no_aria_on_presentational_children_027() {
    const _ID: &str = "no-aria-on-presentational-children-027";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button" aria-hidden="true"><span aria-label="x"></span></div>"#,
            serde_json::json!(true),
        ),
        &[(45, r#"aria-label="x""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-028]` aria-label on an embedded control is reported
#[test]
fn no_aria_on_presentational_children_028() {
    const _ID: &str = "no-aria-on-presentational-children-028";
    assert_attr_violations(
        &run_rule(
            r#"<div role="checkbox" aria-checked="false"><input type="text" aria-label="x" value="v"></div>"#,
            serde_json::json!(true),
        ),
        &[(62, r#"aria-label="x""#, "checkbox")],
    );
}

/// TS: `[no-aria-on-presentational-children-029]` aria-labelledby that refers to no element is reported
#[test]
fn no_aria_on_presentational_children_029() {
    const _ID: &str = "no-aria-on-presentational-children-029";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button"><span aria-labelledby="missing">Save</span></div>"#,
            serde_json::json!(true),
        ),
        &[(26, r#"aria-labelledby="missing""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-030]` aria-labelledby that refers to an element of the same template is not reported
#[test]
fn no_aria_on_presentational_children_030() {
    const _ID: &str = "no-aria-on-presentational-children-030";
    assert_attr_violations(
        &run_rule(
            r#"<template><div role="button"><span aria-labelledby="file">y</span></div><span id="file">report.pdf</span></template>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-031]` aria-labelledby that refers to an element of another tree is reported
#[test]
fn no_aria_on_presentational_children_031() {
    const _ID: &str = "no-aria-on-presentational-children-031";
    assert_attr_violations(
        &run_rule(
            r#"<template><div role="button"><span aria-labelledby="file">y</span></div></template><span id="file">report.pdf</span>"#,
            serde_json::json!(true),
        ),
        &[(36, r#"aria-labelledby="file""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-032]` aria-hidden="true" on an element hidden by the hidden attribute is reported
#[test]
fn no_aria_on_presentational_children_032() {
    const _ID: &str = "no-aria-on-presentational-children-032";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button"><span hidden aria-hidden="true">x</span>Save</div>"#,
            serde_json::json!(true),
        ),
        &[(33, r#"aria-hidden="true""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-034]` aria-hidden="true" in a role named from author that aria-labelledby refers to is not reported
#[test]
fn no_aria_on_presentational_children_034() {
    const _ID: &str = "no-aria-on-presentational-children-034";
    assert_attr_violations(
        &run_rule(
            r#"<div role="img" id="pic"><span aria-hidden="true">decor</span>Chart</div><figure aria-labelledby="pic"></figure>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-035]` aria-label under a hidden element of a node aria-labelledby refers to is reported
#[test]
fn no_aria_on_presentational_children_035() {
    const _ID: &str = "no-aria-on-presentational-children-035";
    assert_attr_violations(
        &run_rule(
            r#"<div role="img" id="pic"><span aria-hidden="true"><span aria-label="x">y</span></span>Chart</div><figure aria-labelledby="pic"></figure>"#,
            serde_json::json!(true),
        ),
        &[(57, r#"aria-label="x""#, "img")],
    );
}

/// TS: `[no-aria-on-presentational-children-036]` aria-labelledby on an embedded control is not reported
#[test]
fn no_aria_on_presentational_children_036() {
    const _ID: &str = "no-aria-on-presentational-children-036";
    assert_attr_violations(
        &run_rule(
            r#"<div role="checkbox" aria-checked="false">Flash <input type="text" value="5" aria-labelledby="n"> times</div><span id="n">five</span>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-037]` aria-hidden="true" that an outer button reads through an inner img is not reported
#[test]
fn no_aria_on_presentational_children_037() {
    const _ID: &str = "no-aria-on-presentational-children-037";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button"><div role="img"><span aria-hidden="true">x</span>Y</div></div>"#,
            serde_json::json!(true),
        ),
        &[(25, r#"role="img""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-038]` aria-hidden="true" that the name of a labeled control reads is not reported
#[test]
fn no_aria_on_presentational_children_038() {
    const _ID: &str = "no-aria-on-presentational-children-038";
    assert_attr_violations(
        &run_rule(
            r#"<input id="i" type="text"><label for="i"><span role="img"><span aria-hidden="true">x</span>Y</span></label>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-039]` aria-label that an aria-labelledby of the same element overrides is reported
#[test]
fn no_aria_on_presentational_children_039() {
    const _ID: &str = "no-aria-on-presentational-children-039";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button"><span aria-labelledby="x" aria-label="y">z</span></div><p id="x">x</p>"#,
            serde_json::json!(true),
        ),
        &[(46, r#"aria-label="y""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-040]` aria-labelledby that refers only to elements without text is reported
#[test]
fn no_aria_on_presentational_children_040() {
    const _ID: &str = "no-aria-on-presentational-children-040";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button"><span aria-labelledby="e">Save</span></div><span id="e"></span>"#,
            serde_json::json!(true),
        ),
        &[(26, r#"aria-labelledby="e""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-041]` only the attribute that takes no effect is reported
#[test]
fn no_aria_on_presentational_children_041() {
    const _ID: &str = "no-aria-on-presentational-children-041";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button"><span aria-hidden="true" aria-describedby="d">x</span>Save</div><p id="d">d</p>"#,
            serde_json::json!(true),
        ),
        &[(45, r#"aria-describedby="d""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-042]` aria-hidden="true" in a hidden node that aria-labelledby refers to is reported
#[test]
fn no_aria_on_presentational_children_042() {
    const _ID: &str = "no-aria-on-presentational-children-042";
    assert_attr_violations(
        &run_rule(
            r#"<div role="img" id="pic" hidden><span aria-hidden="true">x</span>Chart</div><figure aria-labelledby="pic"></figure>"#,
            serde_json::json!(true),
        ),
        &[(39, r#"aria-hidden="true""#, "img")],
    );
}

/// TS: `[no-aria-on-presentational-children-043]` aria-hidden="true" on an embedded control is not reported
#[test]
fn no_aria_on_presentational_children_043() {
    const _ID: &str = "no-aria-on-presentational-children-043";
    assert_attr_violations(
        &run_rule(
            r#"<div role="checkbox" aria-checked="false"><input type="text" aria-hidden="true" value="v">Flash</div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-044]` aria-hidden="true" in a role named from author that aria-describedby refers to is not reported
#[test]
fn no_aria_on_presentational_children_044() {
    const _ID: &str = "no-aria-on-presentational-children-044";
    assert_attr_violations(
        &run_rule(
            r#"<div role="img" id="pic"><span aria-hidden="true">decor</span>Chart</div><figure aria-describedby="pic"></figure>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-045]` aria-label that a link outside the img reads is not reported
#[test]
fn no_aria_on_presentational_children_045() {
    const _ID: &str = "no-aria-on-presentational-children-045";
    assert_attr_violations(
        &run_rule(
            r##"<a href="#"><span role="img"><span aria-label="Home"></span></span></a>"##,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-046]` a role that makes a child of a button a range control, and its value, are not reported
#[test]
fn no_aria_on_presentational_children_046() {
    const _ID: &str = "no-aria-on-presentational-children-046";
    assert_attr_violations(
        &run_rule(
            r#"<button><span role="slider" aria-valuenow="5" aria-valuemin="0" aria-valuemax="10">volume</span></button>"#,
            serde_json::json!(true),
        ),
        &[
            (47, r#"aria-valuemin="0""#, "button"),
            (65, r#"aria-valuemax="10""#, "button"),
        ],
    );
}

/// TS: `[no-aria-on-presentational-children-047]` aria-label that an aria-labelledby referring to its own element reads is not reported
#[test]
fn no_aria_on_presentational_children_047() {
    const _ID: &str = "no-aria-on-presentational-children-047";
    assert_attr_violations(
        &run_rule(
            r#"<button><span id="s" aria-labelledby="s" aria-label="Close"></span></button>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-048]` aria-hidden="true" that a control nested in the label reads is not reported
#[test]
fn no_aria_on_presentational_children_048() {
    const _ID: &str = "no-aria-on-presentational-children-048";
    assert_attr_violations(
        &run_rule(
            r#"<label for="x"><input id="a" type="checkbox"><span role="img"><svg aria-hidden="true"></svg>Text</span></label><input id="x">"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-049]` a presentational ancestor outside of the content of a template is not an ancestor
#[test]
fn no_aria_on_presentational_children_049() {
    const _ID: &str = "no-aria-on-presentational-children-049";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button"><template><span aria-describedby="d"></span></template></div><p id="d">d</p>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-050]` a presentational ancestor in the content of a template is an ancestor
#[test]
fn no_aria_on_presentational_children_050() {
    const _ID: &str = "no-aria-on-presentational-children-050";
    assert_attr_violations(
        &run_rule(
            r#"<template><div role="button"><span aria-describedby="d"></span></div><p id="d">d</p></template>"#,
            serde_json::json!(true),
        ),
        &[(36, r#"aria-describedby="d""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-051]` the host of a declarative shadow root is an ancestor
#[test]
fn no_aria_on_presentational_children_051() {
    const _ID: &str = "no-aria-on-presentational-children-051";
    assert_attr_violations(
        &run_rule(
            r#"<div role="button"><template shadowrootmode="open"><span aria-describedby="d"></span></template></div>"#,
            serde_json::json!(true),
        ),
        &[(58, r#"aria-describedby="d""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-052]` a name reader outside of the content of a template does not read it
#[test]
fn no_aria_on_presentational_children_052() {
    const _ID: &str = "no-aria-on-presentational-children-052";
    assert_attr_violations(
        &run_rule(
            r##"<a href="#"><template><div role="img"><span aria-label="x">y</span></div></template></a>"##,
            serde_json::json!(true),
        ),
        &[(45, r#"aria-label="x""#, "img")],
    );
}

/// TS: `[no-aria-on-presentational-children-053]` a name reader in the content of a template reads it
#[test]
fn no_aria_on_presentational_children_053() {
    const _ID: &str = "no-aria-on-presentational-children-053";
    assert_attr_violations(
        &run_rule(
            r##"<template><a href="#"><div role="img"><span aria-label="x">y</span></div></a></template>"##,
            serde_json::json!(true),
        ),
        &[],
    );
}

#[test]
fn v6_no_aria_on_presentational_children_001() {
    assert_violations(
        &run_rule(
            r#"<div role="button"><span aria-label="text"></span></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
    assert_violations(
        &run_rule(
            r#"<div role="button"><span role="img"></span></div>"#,
            serde_json::json!(true),
        ),
        &[(Severity::Warning, 1, 26, BUTTON_MESSAGE, r#"role="img""#)],
    );
    // Every descendant with such an attribute is reported.
    assert_violations(
        &run_rule(
            r#"<div role="button"><span role="img"></span><span aria-label="x" role="none"></span></div>"#,
            serde_json::json!(true),
        ),
        &[
            (Severity::Warning, 1, 26, BUTTON_MESSAGE, r#"role="img""#),
            (Severity::Warning, 1, 65, BUTTON_MESSAGE, r#"role="none""#),
        ],
    );
}

#[test]
fn v6_no_aria_on_presentational_children_002() {
    assert_violations(
        &run_rule(
            r#"<button><span aria-hidden="true"></span></button>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

#[test]
fn v6_no_aria_on_presentational_children_003() {
    // Not only the parent: any ancestor.
    assert_violations(
        &run_rule(
            r#"<div role="button"><div><span aria-label="x"></span></div></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
    // The closest one is named, and a descendant that is itself such an element is reported too.
    assert_violations(
        &run_rule(
            r#"<div role="img"><div role="button"><span role="none"></span></div></div>"#,
            serde_json::json!(true),
        ),
        &[
            (Severity::Warning, 1, 22, IMG_MESSAGE, r#"role="button""#),
            (Severity::Warning, 1, 42, BUTTON_MESSAGE, r#"role="none""#),
        ],
    );
}

#[test]
fn v6_no_aria_on_presentational_children_004() {
    // The attribute name is matched case-insensitively.
    assert_violations(
        &run_rule(
            r#"<div role="button"><span ARIA-LABEL="x"></span></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
    // Other attributes do not count.
    assert_violations(
        &run_rule(
            r#"<div role="button"><span data-x="1" class="a"></span></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
    // The element with the role is not its own descendant.
    assert_violations(
        &run_rule(r#"<div role="button" aria-label="x"></div>"#, serde_json::json!(true)),
        &[],
    );
    // An element without a spec is not looked at.
    assert_violations(
        &run_rule(
            r#"<div role="button"><x-foo aria-label="x"></x-foo></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

#[test]
fn v6_no_aria_on_presentational_children_005() {
    for (html, role, reported) in [
        (
            r#"<div role="checkbox"><span aria-describedby="d"></span></div>"#,
            "checkbox",
            Some((28, r#"aria-describedby="d""#)),
        ),
        (
            r#"<div role="separator"><span aria-label="x"></span></div>"#,
            "separator",
            Some((29, r#"aria-label="x""#)),
        ),
        (r#"<div role="tab"><span aria-label="x"></span></div>"#, "tab", None),
        // The computed role: case-folded, and the first known token.
        (
            r#"<div role="BUTTON"><span aria-label="x"></span></div>"#,
            "button",
            None,
        ),
        (
            r#"<div role="hoge button"><span aria-label="x"></span></div>"#,
            "button",
            None,
        ),
    ] {
        let message = message_for(role);
        let expected: Vec<Expected<'_>> = reported
            .map(|(col, raw)| (Severity::Warning, 1, col, message.as_str(), raw))
            .into_iter()
            .collect();
        assert_violations(&run_rule(html, serde_json::json!(true)), &expected);
    }
    assert_violations(
        &run_rule(
            r#"<div role="separator"><span aria-label="x"></span></div>"#,
            serde_json::json!({ "options": { "version": "1.1" } }),
        ),
        &[(Severity::Warning, 1, 29, &message_for("separator"), r#"aria-label="x""#)],
    );
}

#[test]
fn v6_no_aria_on_presentational_children_006() {
    assert_violations(
        &run_rule(
            r#"<div role="button"><span aria-label="text"></span></div>"#,
            serde_json::json!({ "severity": "error" }),
        ),
        &[],
    );
    assert_violations(
        &run_rule(
            "<div role=\"button\">\n  <span\n    aria-label=\"x\"></span>\n</div>",
            serde_json::json!(true),
        ),
        &[],
    );
    assert_violations(
        &run_rule(
            r#"<div role="button"><span aria-label="text"></span></div>"#,
            serde_json::json!(false),
        ),
        &[],
    );
}

#[test]
fn v6_no_aria_on_presentational_children_007() {
    let html = r#"<div role="button"><span aria-describedby="d"></span></div><p id="d">d</p>"#;
    let violations = run_rule(html, serde_json::json!({ "severity": "error" }));
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(run_rule(html, serde_json::json!(false)).len(), 0);
}

/// Rust-only: an ancestor whose role is not known until it is rendered (a spread attribute after its `role`) is not
/// taken to have presentational children; the search goes on above it.
#[test]
fn v6_no_aria_on_presentational_children_008() {
    let lint = |arena: &markuplint_dom::arena::DomArena| {
        crate::test_util::lint_arena_brief(
            "no-aria-on-presentational-children",
            arena,
            serde_json::json!({ "rules": { "no-aria-on-presentational-children": true } }),
        )
    };
    let html = r#"<div id="p" role="button"><span id="c" role="presentation"></span></div>"#;
    assert_eq!(lint(&crate::test_util::html_arena(html)).len(), 1);

    let mut arena = crate::test_util::html_arena(html);
    let parent = crate::test_util::element_with_attr(&arena, "id", "p");
    crate::test_util::insert_spread_attr(&mut arena, parent, 2);
    assert_eq!(lint(&arena), []);

    // A spread attribute before the `role` does not override it
    let mut arena = crate::test_util::html_arena(html);
    let parent = crate::test_util::element_with_attr(&arena, "id", "p");
    crate::test_util::insert_spread_attr(&mut arena, parent, 0);
    assert_eq!(lint(&arena).len(), 1);

    // The search goes on above the unknown ancestor, where a known role with presentational children excludes the
    // descendants
    let html = r#"<div role="button"><div id="p" role="group"><span id="c" role="presentation"></span></div></div>"#;
    let mut arena = crate::test_util::html_arena(html);
    let parent = crate::test_util::element_with_attr(&arena, "id", "p");
    crate::test_util::insert_spread_attr(&mut arena, parent, 2);
    // The `group` that may be anything is itself below the `button`, and so is the `presentation`
    assert_eq!(lint(&arena).len(), 2);
}
