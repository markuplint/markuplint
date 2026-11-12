//! Tests for `no-aria-on-presentational-children` rule.
//!
//! Test ID mapping (TS → Rust): every `no-aria-on-presentational-children-<category>-NNN` of
//! `index.spec.ts` that takes HTML → `no_aria_on_presentational_children_<category>_NNN`, with the
//! same input and the same violations. The ones that take the JSX parser or a pretender
//! (`issue-4309-003`, `-004`, `-006`, `-007`, `issue-4408-002`, `-014`, `-020`) are run against the Rust
//! engine by the parity run of the TS specs only, as the Rust tests parse HTML.
//!   v6_no_aria_on_presentational_children_001  — Rust-only: severity option and `rules: false`

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
type Expected<'a> = (u32, &'a str, &'a str);

fn ineffective(role: &str) -> String {
    format!(
        "It may be ineffective because it has the \"{role}\" role as an ancestor that doesn't expose its descendants to the accessibility tree"
    )
}

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
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

/// TS: `[no-aria-on-presentational-children-valid-001]` no presentational role ancestor
#[test]
fn no_aria_on_presentational_children_valid_001() {
    const _ID: &str = "no-aria-on-presentational-children-valid-001";
    assert_violations(
        &run_rule(
            r#"<div role="group"><span aria-label="text"></span></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-valid-003]` aria-label on a child of a role named from content is not reported
#[test]
fn no_aria_on_presentational_children_valid_003() {
    const _ID: &str = "no-aria-on-presentational-children-valid-003";
    assert_violations(
        &run_rule(
            r#"<div role="button"><span aria-label="text"></span></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-invalid-001]` aria attr on child of presentational children role
#[test]
fn no_aria_on_presentational_children_invalid_001() {
    const _ID: &str = "no-aria-on-presentational-children-invalid-001";
    assert_violations(
        &run_rule(
            r#"<div role="button"><span aria-describedby="d"></span></div><p id="d">d</p>"#,
            serde_json::json!(true),
        ),
        &[(26, r#"aria-describedby="d""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-valid-002]` no aria on children
#[test]
fn no_aria_on_presentational_children_valid_002() {
    const _ID: &str = "no-aria-on-presentational-children-valid-002";
    assert_violations(
        &run_rule(r#"<div role="img"><span>text</span></div>"#, serde_json::json!(true)),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4309-001]` an upper-case aria-label on a child of a button is not reported, like the lower-case one
#[test]
fn no_aria_on_presentational_children_issue_4309_001() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4309-001";
    assert_violations(
        &run_rule(
            r#"<div role="button"><span ARIA-LABEL="text"></span></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4309-002]` an upper-case role on a child is reported like the lower-case one
#[test]
fn no_aria_on_presentational_children_issue_4309_002() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4309-002";
    assert_violations(
        &run_rule(
            r#"<div role="button"><span ROLE="img"></span></div>"#,
            serde_json::json!(true),
        ),
        &[(26, r#"ROLE="img""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4309-005]` an upper-case aria-describedby on a child is reported like the lower-case one
#[test]
fn no_aria_on_presentational_children_issue_4309_005() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4309-005";
    assert_violations(
        &run_rule(
            r#"<div role="button"><span ARIA-DESCRIBEDBY="d"></span></div><p id="d">d</p>"#,
            serde_json::json!(true),
        ),
        &[(26, r#"ARIA-DESCRIBEDBY="d""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-001]` aria-hidden="true" on a decorative svg in a button is not reported
#[test]
fn no_aria_on_presentational_children_issue_4408_001() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-001";
    assert_violations(
        &run_rule(
            r#"<button type="button"><svg aria-hidden="true" focusable="false" viewBox="0 0 1 1"><path d="M0 0" /></svg>Click</button>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-003]` aria-label and aria-labelledby on a child of a button are not reported
#[test]
fn no_aria_on_presentational_children_issue_4408_003() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-003";
    assert_violations(
        &run_rule(
            r#"<button type="button"><span aria-label="Save">x</span><span aria-labelledby="file">y</span></button><span id="file">report.pdf</span>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-004]` aria-hidden="true" on a child of a role whose name comes from content only is not reported
#[test]
fn no_aria_on_presentational_children_issue_4408_004() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-004";
    assert_violations(
        &run_rule(
            r#"<div role="tab"><span aria-hidden="true">★</span>Settings</div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-005]` aria-hidden="true" on a child of a role that is not named from content is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_005() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-005";
    assert_violations(
        &run_rule(
            r#"<div role="img"><span aria-hidden="true">deco</span></div>"#,
            serde_json::json!(true),
        ),
        &[(23, r#"aria-hidden="true""#, "img")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-006]` aria-hidden="true" in a button named by aria-label is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_006() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-006";
    assert_violations(
        &run_rule(
            r#"<button type="button" aria-label="Save"><svg aria-hidden="true"></svg></button>"#,
            serde_json::json!(true),
        ),
        &[(46, r#"aria-hidden="true""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-007]` aria-hidden="true" under a child named by aria-label is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_007() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-007";
    assert_violations(
        &run_rule(
            r#"<button type="button"><span aria-label="Save"><svg aria-hidden="true"></svg></span></button>"#,
            serde_json::json!(true),
        ),
        &[(52, r#"aria-hidden="true""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-008]` aria-label under a hidden child is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_008() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-008";
    assert_violations(
        &run_rule(
            r#"<button type="button"><span aria-hidden="true"><span aria-label="Save">x</span></span>Click</button>"#,
            serde_json::json!(true),
        ),
        &[(54, r#"aria-label="Save""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-009]` aria-label on an element that is itself hidden is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_009() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-009";
    assert_violations(
        &run_rule(
            r#"<button type="button"><span aria-hidden="true" aria-label="Save">x</span>Click</button>"#,
            serde_json::json!(true),
        ),
        &[(48, r#"aria-label="Save""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-010]` attributes that do not reach the name of a button are still reported
#[test]
fn no_aria_on_presentational_children_issue_4408_010() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-010";
    assert_violations(
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

/// TS: `[no-aria-on-presentational-children-issue-4408-011]` role="none" that drops the title of an svg from the name of a button is not reported
#[test]
fn no_aria_on_presentational_children_issue_4408_011() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-011";
    assert_violations(
        &run_rule(
            r#"<button type="button"><svg role="none"><title>Save</title></svg><svg role="presentation"><title>Open</title></svg>Click</button>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-012]` role="none" that does not change the name of a button is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_012() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-012";
    assert_violations(
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

/// TS: `[no-aria-on-presentational-children-issue-4408-013]` role="none" that drops the alt of an image from the name of a button is not reported, though ARIA in HTML does not permit it
#[test]
fn no_aria_on_presentational_children_issue_4408_013() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-013";
    assert_violations(
        &run_rule(
            r#"<button type="button"><img src="s.svg" alt="Save" role="none"><img src="o.svg" alt="Open" role="presentation"></button>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-015]` aria-label under an element named by its own host language label is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_015() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-015";
    assert_violations(
        &run_rule(
            r#"<div role="button"><fieldset title="t"><span aria-label="x">y</span></fieldset></div>"#,
            serde_json::json!(true),
        ),
        &[(46, r#"aria-label="x""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-016]` aria-label in a hidden button is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_016() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-016";
    assert_violations(
        &run_rule(
            r#"<div role="button" aria-hidden="true"><span aria-label="x"></span></div>"#,
            serde_json::json!(true),
        ),
        &[(45, r#"aria-label="x""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-017]` aria-label on an embedded control is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_017() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-017";
    assert_violations(
        &run_rule(
            r#"<div role="checkbox" aria-checked="false"><input type="text" aria-label="x" value="v"></div>"#,
            serde_json::json!(true),
        ),
        &[(62, r#"aria-label="x""#, "checkbox")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-018]` aria-labelledby that refers to no element is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_018() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-018";
    assert_violations(
        &run_rule(
            r#"<div role="button"><span aria-labelledby="missing">Save</span></div>"#,
            serde_json::json!(true),
        ),
        &[(26, r#"aria-labelledby="missing""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4489-001]` aria-labelledby that refers to an element of the same template is not reported
#[test]
fn no_aria_on_presentational_children_issue_4489_001() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4489-001";
    assert_violations(
        &run_rule(
            r#"<template><div role="button"><span aria-labelledby="file">y</span></div><span id="file">report.pdf</span></template>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4489-002]` aria-labelledby that refers to an element of another tree is reported
#[test]
fn no_aria_on_presentational_children_issue_4489_002() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4489-002";
    assert_violations(
        &run_rule(
            r#"<template><div role="button"><span aria-labelledby="file">y</span></div></template><span id="file">report.pdf</span>"#,
            serde_json::json!(true),
        ),
        &[(36, r#"aria-labelledby="file""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-019]` aria-hidden="true" on an element hidden by the hidden attribute is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_019() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-019";
    assert_violations(
        &run_rule(
            r#"<div role="button"><span hidden aria-hidden="true">x</span>Save</div>"#,
            serde_json::json!(true),
        ),
        &[(33, r#"aria-hidden="true""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-021]` aria-hidden="true" in a role named from author that aria-labelledby refers to is not reported
#[test]
fn no_aria_on_presentational_children_issue_4408_021() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-021";
    assert_violations(
        &run_rule(
            r#"<div role="img" id="pic"><span aria-hidden="true">decor</span>Chart</div><figure aria-labelledby="pic"></figure>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-022]` aria-label under a hidden element of a node aria-labelledby refers to is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_022() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-022";
    assert_violations(
        &run_rule(
            r#"<div role="img" id="pic"><span aria-hidden="true"><span aria-label="x">y</span></span>Chart</div><figure aria-labelledby="pic"></figure>"#,
            serde_json::json!(true),
        ),
        &[(57, r#"aria-label="x""#, "img")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-023]` aria-labelledby on an embedded control is not reported
#[test]
fn no_aria_on_presentational_children_issue_4408_023() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-023";
    assert_violations(
        &run_rule(
            r#"<div role="checkbox" aria-checked="false">Flash <input type="text" value="5" aria-labelledby="n"> times</div><span id="n">five</span>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-024]` aria-hidden="true" that an outer button reads through an inner img is not reported
#[test]
fn no_aria_on_presentational_children_issue_4408_024() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-024";
    assert_violations(
        &run_rule(
            r#"<div role="button"><div role="img"><span aria-hidden="true">x</span>Y</div></div>"#,
            serde_json::json!(true),
        ),
        &[(25, r#"role="img""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-025]` aria-hidden="true" that the name of a labeled control reads is not reported
#[test]
fn no_aria_on_presentational_children_issue_4408_025() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-025";
    assert_violations(
        &run_rule(
            r#"<input id="i" type="text"><label for="i"><span role="img"><span aria-hidden="true">x</span>Y</span></label>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-026]` aria-label that an aria-labelledby of the same element overrides is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_026() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-026";
    assert_violations(
        &run_rule(
            r#"<div role="button"><span aria-labelledby="x" aria-label="y">z</span></div><p id="x">x</p>"#,
            serde_json::json!(true),
        ),
        &[(46, r#"aria-label="y""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-027]` aria-labelledby that refers only to elements without text is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_027() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-027";
    assert_violations(
        &run_rule(
            r#"<div role="button"><span aria-labelledby="e">Save</span></div><span id="e"></span>"#,
            serde_json::json!(true),
        ),
        &[(26, r#"aria-labelledby="e""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-028]` only the attribute that takes no effect is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_028() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-028";
    assert_violations(
        &run_rule(
            r#"<div role="button"><span aria-hidden="true" aria-describedby="d">x</span>Save</div><p id="d">d</p>"#,
            serde_json::json!(true),
        ),
        &[(45, r#"aria-describedby="d""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-029]` aria-hidden="true" in a hidden node that aria-labelledby refers to is reported
#[test]
fn no_aria_on_presentational_children_issue_4408_029() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-029";
    assert_violations(
        &run_rule(
            r#"<div role="img" id="pic" hidden><span aria-hidden="true">x</span>Chart</div><figure aria-labelledby="pic"></figure>"#,
            serde_json::json!(true),
        ),
        &[(39, r#"aria-hidden="true""#, "img")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-030]` aria-hidden="true" on an embedded control is not reported
#[test]
fn no_aria_on_presentational_children_issue_4408_030() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-030";
    assert_violations(
        &run_rule(
            r#"<div role="checkbox" aria-checked="false"><input type="text" aria-hidden="true" value="v">Flash</div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-031]` aria-hidden="true" in a role named from author that aria-describedby refers to is not reported
#[test]
fn no_aria_on_presentational_children_issue_4408_031() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-031";
    assert_violations(
        &run_rule(
            r#"<div role="img" id="pic"><span aria-hidden="true">decor</span>Chart</div><figure aria-describedby="pic"></figure>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-032]` aria-label that a link outside the img reads is not reported
#[test]
fn no_aria_on_presentational_children_issue_4408_032() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-032";
    assert_violations(
        &run_rule(
            r##"<a href="#"><span role="img"><span aria-label="Home"></span></span></a>"##,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-033]` a role that makes a child of a button a range control, and its value, are not reported
#[test]
fn no_aria_on_presentational_children_issue_4408_033() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-033";
    assert_violations(
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

/// TS: `[no-aria-on-presentational-children-issue-4408-034]` aria-label that an aria-labelledby referring to its own element reads is not reported
#[test]
fn no_aria_on_presentational_children_issue_4408_034() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-034";
    assert_violations(
        &run_rule(
            r#"<button><span id="s" aria-labelledby="s" aria-label="Close"></span></button>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4408-035]` aria-hidden="true" that a control nested in the label reads is not reported
#[test]
fn no_aria_on_presentational_children_issue_4408_035() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4408-035";
    assert_violations(
        &run_rule(
            r#"<label for="x"><input id="a" type="checkbox"><span role="img"><svg aria-hidden="true"></svg>Text</span></label><input id="x">"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4506-001]` a presentational ancestor outside of the content of a template is not an ancestor
#[test]
fn no_aria_on_presentational_children_issue_4506_001() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4506-001";
    assert_violations(
        &run_rule(
            r#"<div role="button"><template><span aria-describedby="d"></span></template></div><p id="d">d</p>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4506-002]` a presentational ancestor in the content of a template is an ancestor
#[test]
fn no_aria_on_presentational_children_issue_4506_002() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4506-002";
    assert_violations(
        &run_rule(
            r#"<template><div role="button"><span aria-describedby="d"></span></div><p id="d">d</p></template>"#,
            serde_json::json!(true),
        ),
        &[(36, r#"aria-describedby="d""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4506-003]` the host of a declarative shadow root is an ancestor
#[test]
fn no_aria_on_presentational_children_issue_4506_003() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4506-003";
    assert_violations(
        &run_rule(
            r#"<div role="button"><template shadowrootmode="open"><span aria-describedby="d"></span></template></div>"#,
            serde_json::json!(true),
        ),
        &[(58, r#"aria-describedby="d""#, "button")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4506-004]` a name reader outside of the content of a template does not read it
#[test]
fn no_aria_on_presentational_children_issue_4506_004() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4506-004";
    assert_violations(
        &run_rule(
            r##"<a href="#"><template><div role="img"><span aria-label="x">y</span></div></template></a>"##,
            serde_json::json!(true),
        ),
        &[(45, r#"aria-label="x""#, "img")],
    );
}

/// TS: `[no-aria-on-presentational-children-issue-4506-005]` a name reader in the content of a template reads it
#[test]
fn no_aria_on_presentational_children_issue_4506_005() {
    const _ID: &str = "no-aria-on-presentational-children-issue-4506-005";
    assert_violations(
        &run_rule(
            r##"<template><a href="#"><div role="img"><span aria-label="x">y</span></div></a></template>"##,
            serde_json::json!(true),
        ),
        &[],
    );
}

#[test]
fn v6_no_aria_on_presentational_children_001() {
    let html = r#"<div role="button"><span aria-describedby="d"></span></div><p id="d">d</p>"#;
    let violations = run_rule(html, serde_json::json!({ "severity": "error" }));
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(run_rule(html, serde_json::json!(false)).len(), 0);
}
