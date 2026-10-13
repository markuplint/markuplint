//! Tests for `permitted-roles` rule.
//!
//! Test ID mapping (TS → Rust):
//!   permitted-roles-valid-001          → permitted_roles_valid_001
//!   permitted-roles-invalid-001        → permitted_roles_invalid_001
//!   permitted-roles-issue-3641-001     → permitted_roles_issue_3641_001
//!   permitted-roles-issue-3641-002     → permitted_roles_issue_3641_002
//!   permitted-roles-issue-3641-003     → permitted_roles_issue_3641_003
//!   permitted-roles-issue-3641-004     → permitted_roles_issue_3641_004
//!   permitted-roles-issue-3641-005     → permitted_roles_issue_3641_005
//!   permitted-roles-issue-3641-006     → permitted_roles_issue_3641_006
//!   permitted-roles-valid-002          → permitted_roles_valid_002
//!   permitted-roles-valid-003          → permitted_roles_valid_003
//!   permitted-roles-valid-004          → permitted_roles_valid_004
//!   permitted-roles-issue-3735-001     → permitted_roles_issue_3735_001
//!   permitted-roles-issue-3735-002     → permitted_roles_issue_3735_002
//!   permitted-roles-issue-3740-001     — SKIP: Pretenders (the Rust engine has no `pretenders` config; the TS test only
//!                                        checks that an HTML→HTML pretender is ignored, and `v6_permitted_roles_001` covers
//!                                        the same input and violation without it)
//!   v6_permitted_roles_001             — Rust-only: `<h1 role="button">`, the input of issue-3740-001 without pretenders
//!   v6_permitted_roles_002             — Rust-only: only the first non-permitted token is reported, at its own position
//!   v6_permitted_roles_003             — Rust-only: an empty list reports the first token; no token reports the attribute
//!   v6_permitted_roles_004             — Rust-only: the lookup is case-sensitive; the implicit role is permitted
//!   v6_permitted_roles_005             — Rust-only: `permittedRoles: true` is every non-abstract role plus DPub roles, not graphics roles
//!   v6_permitted_roles_006             — Rust-only: `{ "graphics-aam": true }` permits the graphics roles on SVG elements
//!   v6_permitted_roles_007             — Rust-only: `<meta>` permits no role
//!   v6_permitted_roles_008             — Rust-only: the implicit role is permitted, conditions applied (`a[href]`)
//!   v6_permitted_roles_009             — Rust-only: severity and `rules: false`
//!   v6_permitted_roles_010             — Rust-only: `div` permits `button` in ARIA 1.1 and 1.2, by option and by `ruleCommonSettings`

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

fn config(value: serde_json::Value) -> LintConfig {
    serde_json::from_value(serde_json::json!({ "rules": { "permitted-roles": value } })).unwrap()
}

fn violations(html: &str) -> Vec<Violation> {
    lint(&html_arena(html), &spec(), &config(serde_json::json!(true))).violations
}

/// Asserts the one violation of an error-severity run, with hardcoded expectations.
fn assert_single(violations: &[Violation], line: u32, col: u32, message: &str, raw: &str) {
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].rule_id, "permitted-roles");
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(violations[0].line, line);
    assert_eq!(violations[0].col, col);
    assert_eq!(violations[0].message, message);
    assert_eq!(violations[0].raw, raw);
}

/// TS: `[permitted-roles-valid-001]`
#[test]
fn permitted_roles_valid_001() {
    const _ID: &str = "permitted-roles-valid-001";
    assert!(violations(r#"<a href="path/to" role="button">text</a>"#).is_empty());
}

/// TS: `[permitted-roles-invalid-001]`
#[test]
fn permitted_roles_invalid_001() {
    const _ID: &str = "permitted-roles-invalid-001";
    assert_single(
        &violations(r#"<select role="textbox"></select>"#),
        1,
        15,
        "Cannot overwrite the \"textbox\" role to the \"select\" element according to ARIA in HTML specification",
        "textbox",
    );
}

/// TS: `[permitted-roles-issue-3641-001]`
#[test]
fn permitted_roles_issue_3641_001() {
    const _ID: &str = "permitted-roles-issue-3641-001";
    assert_single(
        &violations(r#"<img src="x.png" alt="" role="presentation">"#),
        1,
        31,
        "Cannot overwrite the \"presentation\" role to the \"img\" element according to ARIA in HTML specification",
        "presentation",
    );
}

/// TS: `[permitted-roles-issue-3641-002]`
#[test]
fn permitted_roles_issue_3641_002() {
    const _ID: &str = "permitted-roles-issue-3641-002";
    assert_single(
        &violations(r#"<img src="x.png" alt="" role="none">"#),
        1,
        31,
        "Cannot overwrite the \"none\" role to the \"img\" element according to ARIA in HTML specification",
        "none",
    );
}

/// TS: `[permitted-roles-issue-3641-003]`
#[test]
fn permitted_roles_issue_3641_003() {
    const _ID: &str = "permitted-roles-issue-3641-003";
    assert_single(
        &violations(r#"<img src="x.png" alt="" role="img">"#),
        1,
        31,
        "Cannot overwrite the \"img\" role to the \"img\" element according to ARIA in HTML specification",
        "img",
    );
}

/// TS: `[permitted-roles-issue-3641-004]`
#[test]
fn permitted_roles_issue_3641_004() {
    const _ID: &str = "permitted-roles-issue-3641-004";
    assert_single(
        &violations(r#"<img src="x.png" alt="" role="button">"#),
        1,
        31,
        "Cannot overwrite the \"button\" role to the \"img\" element according to ARIA in HTML specification",
        "button",
    );
}

/// TS: `[permitted-roles-issue-3641-005]`
#[test]
fn permitted_roles_issue_3641_005() {
    const _ID: &str = "permitted-roles-issue-3641-005";
    assert_single(
        &violations(r#"<img src="x.png" alt="" role="link">"#),
        1,
        31,
        "Cannot overwrite the \"link\" role to the \"img\" element according to ARIA in HTML specification",
        "link",
    );
}

/// TS: `[permitted-roles-issue-3641-006]`
#[test]
fn permitted_roles_issue_3641_006() {
    const _ID: &str = "permitted-roles-issue-3641-006";
    assert_single(
        &violations(r#"<img src="x.png" role="presentation">"#),
        1,
        24,
        "Cannot overwrite the \"presentation\" role to the \"img\" element according to ARIA in HTML specification",
        "presentation",
    );
}

/// TS: `[permitted-roles-valid-002]`
#[test]
fn permitted_roles_valid_002() {
    const _ID: &str = "permitted-roles-valid-002";
    assert!(violations(r#"<img src="x.png" alt="">"#).is_empty());
}

/// TS: `[permitted-roles-valid-003]`
#[test]
fn permitted_roles_valid_003() {
    const _ID: &str = "permitted-roles-valid-003";
    assert!(violations(r#"<img src="x.png" alt="photo" role="button">"#).is_empty());
}

/// TS: `[permitted-roles-valid-004]`
#[test]
fn permitted_roles_valid_004() {
    const _ID: &str = "permitted-roles-valid-004";
    assert!(violations(r#"<img src="x.png" aria-label="foo" role="img">"#).is_empty());
}

/// TS: `[permitted-roles-issue-3735-001]`
#[test]
fn permitted_roles_issue_3735_001() {
    const _ID: &str = "permitted-roles-issue-3735-001";
    assert_single(
        &violations(r#"<details><summary role="button">x</summary><p>y</p></details>"#),
        1,
        25,
        "Cannot overwrite the \"button\" role to the \"summary\" element according to ARIA in HTML specification",
        "button",
    );
}

/// TS: `[permitted-roles-issue-3735-002]`
#[test]
fn permitted_roles_issue_3735_002() {
    const _ID: &str = "permitted-roles-issue-3735-002";
    assert_single(
        &violations(r#"<details><summary role="generic">x</summary><p>y</p></details>"#),
        1,
        25,
        "Cannot overwrite the \"generic\" role to the \"summary\" element according to ARIA in HTML specification",
        "generic",
    );
}

#[test]
fn v6_permitted_roles_001() {
    assert_single(
        &violations(r#"<h1 role="button">x</h1>"#),
        1,
        11,
        "Cannot overwrite the \"button\" role to the \"h1\" element according to ARIA in HTML specification",
        "button",
    );
}

#[test]
fn v6_permitted_roles_002() {
    assert_single(
        &violations(r#"<select role="textbox listbox"></select>"#),
        1,
        15,
        "Cannot overwrite the \"textbox\" role to the \"select\" element according to ARIA in HTML specification",
        "textbox",
    );
}

#[test]
fn v6_permitted_roles_003() {
    // `<img alt="">` permits nothing, so every token is offending and the first is named.
    assert_single(
        &violations(r#"<img alt="" role="button link">"#),
        1,
        19,
        "Cannot overwrite the \"button\" role to the \"img\" element according to ARIA in HTML specification",
        "button",
    );
    // With no token to name, the whole attribute is reported.
    assert_single(
        &violations(r#"<img alt="" role="">"#),
        1,
        13,
        "Cannot overwrite the role of the \"img\" element according to ARIA in HTML specification",
        "role=\"\"",
    );
    assert_single(
        &violations(r#"<img alt="" role="  ">"#),
        1,
        13,
        "Cannot overwrite the role of the \"img\" element according to ARIA in HTML specification",
        "role=\"  \"",
    );
    // A non-empty list with no token has nothing to report.
    assert!(violations(r#"<select role=""></select>"#).is_empty());
}

#[test]
fn v6_permitted_roles_004() {
    assert!(violations(r#"<h1 role="heading">x</h1>"#).is_empty());
    assert_single(
        &violations(r#"<h1 role="HEADING">x</h1>"#),
        1,
        11,
        "Cannot overwrite the \"HEADING\" role to the \"h1\" element according to ARIA in HTML specification",
        "HEADING",
    );
}

#[test]
fn v6_permitted_roles_005() {
    // `div` permits any role: non-abstract core roles and DPub roles, but not abstract roles
    // and not the Graphics Module roles.
    assert!(violations(r#"<div role="doc-abstract"></div>"#).is_empty());
    assert_single(
        &violations(r#"<div role="widget"></div>"#),
        1,
        12,
        "Cannot overwrite the \"widget\" role to the \"div\" element according to ARIA in HTML specification",
        "widget",
    );
    assert_single(
        &violations(r#"<div role="graphics-document"></div>"#),
        1,
        12,
        "Cannot overwrite the \"graphics-document\" role to the \"div\" element according to ARIA in HTML specification",
        "graphics-document",
    );
}

#[test]
fn v6_permitted_roles_006() {
    assert!(violations(r#"<svg role="graphics-document"></svg>"#).is_empty());
    assert!(violations(r#"<svg><g role="graphics-symbol"></g></svg>"#).is_empty());
}

#[test]
fn v6_permitted_roles_007() {
    assert_single(
        &violations(r#"<meta role="button">"#),
        1,
        13,
        "Cannot overwrite the \"button\" role to the \"meta\" element according to ARIA in HTML specification",
        "button",
    );
}

#[test]
fn v6_permitted_roles_008() {
    // The implicit role of `nav` is permitted, and `a[href]`'s too.
    assert!(violations(r#"<nav role="navigation"></nav>"#).is_empty());
    assert!(violations(r#"<a href="x" role="link"></a>"#).is_empty());
}

#[test]
fn v6_permitted_roles_009() {
    let arena = html_arena(r#"<select role="textbox"></select>"#);

    let warned = lint(&arena, &spec(), &config(serde_json::json!("warning")));
    assert_eq!(warned.violations.len(), 1);
    assert_eq!(warned.violations[0].severity, Severity::Warning);

    let disabled = lint(&arena, &spec(), &config(serde_json::json!(false)));
    assert!(disabled.violations.is_empty());
}

#[test]
fn v6_permitted_roles_010() {
    let arena = html_arena(r#"<div role="button"></div>"#);
    for version in ["1.1", "1.2"] {
        let by_option = lint(
            &arena,
            &spec(),
            &config(serde_json::json!({ "options": { "version": version } })),
        );
        assert!(by_option.violations.is_empty(), "{version}");

        let common: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": { "permitted-roles": true },
            "ruleCommonSettings": { "ariaVersion": version }
        }))
        .unwrap();
        assert!(lint(&arena, &spec(), &common).violations.is_empty(), "{version}");
    }
}
