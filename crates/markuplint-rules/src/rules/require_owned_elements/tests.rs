//! Tests for `require-owned-elements` rule.
//!
//! Test ID mapping (TS → Rust):
//!   require-owned-elements-valid-001       → require_owned_elements_valid_001
//!   require-owned-elements-valid-002       → require_owned_elements_valid_002
//!   require-owned-elements-invalid-001     → require_owned_elements_invalid_001
//!   require-owned-elements-issue-3589-001  → require_owned_elements_issue_3589_001
//!   require-owned-elements-issue-3589-002  → require_owned_elements_issue_3589_002
//!   require-owned-elements-issue-3589-003  → require_owned_elements_issue_3589_003
//!   require-owned-elements-issue-3589-004  → require_owned_elements_issue_3589_004
//!   v6_require_owned_elements_001  — Rust-only: several allowed child roles are listed
//!   v6_require_owned_elements_002  — Rust-only: content that may be created later (text, comment, script, template)
//!   v6_require_owned_elements_003  — Rust-only: `aria-busy="true"` on the element or a child, any case
//!   v6_require_owned_elements_004  — Rust-only: a `<slot>` below the element may supply the children
//!   v6_require_owned_elements_005  — Rust-only: transparent children are looked through, by ARIA version
//!   v6_require_owned_elements_006  — Rust-only: `"rowgroup > row"` queries and nested requirements
//!   v6_require_owned_elements_007  — Rust-only: native containers with their native children
//!   v6_require_owned_elements_008  — Rust-only: severity, `rules: false`
//!
//!
//! The pretender tests use the JSX parser; each is ported with custom elements in HTML:
//!   require-owned-elements-issue-4068-001  — v6_require_owned_elements_009
//!   require-owned-elements-issue-4068-002  — v6_require_owned_elements_010
//!   require-owned-elements-issue-4068-003  — v6_require_owned_elements_011
//!   require-owned-elements-issue-4068-004  — v6_require_owned_elements_012
//!   require-owned-elements-issue-4068-005  — v6_require_owned_elements_013
//!   require-owned-elements-issue-4068-006  — v6_require_owned_elements_014
//!   require-owned-elements-issue-4068-007  — v6_require_owned_elements_015
//!   require-owned-elements-issue-4068-008  — v6_require_owned_elements_016
//!   require-owned-elements-issue-4068-009  — v6_require_owned_elements_017
//!   require-owned-elements-issue-4068-010  — v6_require_owned_elements_018
//!   require-owned-elements-issue-4068-011  — v6_require_owned_elements_019
//!   require-owned-elements-issue-4068-012  — v6_require_owned_elements_020
//!   require-owned-elements-issue-4068-013  — v6_require_owned_elements_021 (a `<slot>` for the JSX expression)
//!   require-owned-elements-issue-4068-014  — v6_require_owned_elements_022
//!   v6_require_owned_elements_023  — Rust-only: a child placed in a slot wrapper is resolved on its own

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
    let config: LintConfig =
        serde_json::from_value(serde_json::json!({ "rules": { "require-owned-elements": value } })).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// `(severity, line, col, message, raw)`, the fields the TS specs assert.
type Expected<'a> = (Severity, u32, u32, &'a str, &'a str);

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (severity, line, col, message, raw)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, "require-owned-elements");
        assert_eq!(violation.severity, *severity);
        assert_eq!(violation.line, *line);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, *message);
        assert_eq!(violation.raw, *raw);
    }
}

const REQUIRES_LISTITEM: &str = "The child element requires the \"listitem\" role. Or, require aria-busy=\"true\"";
const EXPECTS_LISTITEM: &str = "The \"list\" role expects the \"listitem\" role";

/// TS: `[require-owned-elements-valid-001]`
#[test]
fn require_owned_elements_valid_001() {
    const _ID: &str = "require-owned-elements-valid-001";
    let violations = run_rule(
        r#"<div role="list"><div role="listitem">item</div></div>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[require-owned-elements-valid-002]`
#[test]
fn require_owned_elements_valid_002() {
    const _ID: &str = "require-owned-elements-valid-002";
    assert_violations(&run_rule("<div></div>", serde_json::json!(true)), &[]);
}

/// TS: `[require-owned-elements-invalid-001]`
#[test]
fn require_owned_elements_invalid_001() {
    const _ID: &str = "require-owned-elements-invalid-001";
    let violations = run_rule(
        r#"<div role="list"><div>not a listitem</div></div>"#,
        serde_json::json!(true),
    );
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
    assert_eq!(violations[0].severity, Severity::Error);
}

/// TS: `[require-owned-elements-issue-3589-001]`
#[test]
fn require_owned_elements_issue_3589_001() {
    const _ID: &str = "require-owned-elements-issue-3589-001";
    assert_violations(
        &run_rule("<ul></ul>", serde_json::json!(true)),
        &[(Severity::Error, 1, 1, REQUIRES_LISTITEM, "<ul>")],
    );
}

/// TS: `[require-owned-elements-issue-3589-002]`
#[test]
fn require_owned_elements_issue_3589_002() {
    const _ID: &str = "require-owned-elements-issue-3589-002";
    assert_violations(
        &run_rule(r#"<div role="list"></div>"#, serde_json::json!(true)),
        &[(Severity::Error, 1, 1, REQUIRES_LISTITEM, "<div role=\"list\">")],
    );
}

/// TS: `[require-owned-elements-issue-3589-003]`
#[test]
fn require_owned_elements_issue_3589_003() {
    const _ID: &str = "require-owned-elements-issue-3589-003";
    assert_violations(
        &run_rule("<menu></menu>", serde_json::json!(true)),
        &[(Severity::Error, 1, 1, REQUIRES_LISTITEM, "<menu>")],
    );
}

/// TS: `[require-owned-elements-issue-3589-004]`
#[test]
fn require_owned_elements_issue_3589_004() {
    const _ID: &str = "require-owned-elements-issue-3589-004";
    assert_violations(&run_rule(r#"<ul aria-busy="true"></ul>"#, serde_json::json!(true)), &[]);
}

#[test]
fn v6_require_owned_elements_001() {
    assert_violations(
        &run_rule(r#"<div role="listbox"></div>"#, serde_json::json!(true)),
        &[(
            Severity::Error,
            1,
            1,
            "The child element requires the roles: \"group > option\", \"option\". Or, require aria-busy=\"true\"",
            "<div role=\"listbox\">",
        )],
    );
    assert_violations(
        &run_rule(r#"<div role="menu"><div></div></div>"#, serde_json::json!(true)),
        &[(
            Severity::Error,
            1,
            1,
            "The \"menu\" role expects the roles: \"group > menuitem\", \"group > menuitemradio\", \"group > menuitemcheckbox\", \"menuitem\", \"menuitemcheckbox\", \"menuitemradio\", \"separator\"",
            "<div role=\"menu\">",
        )],
    );
}

#[test]
fn v6_require_owned_elements_002() {
    for html in [
        r#"<div role="list">text</div>"#,
        r#"<div role="list"><!-- c --></div>"#,
        "<div role=\"list\"> \n </div>",
        r#"<div role="list"><script></script></div>"#,
        r#"<div role="list"><template></template><script></script></div>"#,
    ] {
        assert_violations(
            &run_rule(html, serde_json::json!(true)),
            &[(Severity::Error, 1, 1, REQUIRES_LISTITEM, "<div role=\"list\">")],
        );
    }
}

#[test]
fn v6_require_owned_elements_003() {
    assert_violations(
        &run_rule(r#"<div role="list" aria-busy="True"></div>"#, serde_json::json!(true)),
        &[],
    );
    assert_violations(
        &run_rule(
            r#"<div role="list"><div aria-busy="TRUE"></div></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

#[test]
fn v6_require_owned_elements_004() {
    assert_violations(
        &run_rule(
            r#"<div role="list"><div><slot></slot></div></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

#[test]
fn v6_require_owned_elements_005() {
    assert_violations(
        &run_rule(
            r#"<div role="list"><div role="none"><div role="listitem"></div></div></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
    // A `generic` child is transparent from ARIA 1.3 (the default) only.
    assert_violations(
        &run_rule(
            r#"<div role="list"><div><div role="listitem"></div></div></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
    assert_violations(
        &run_rule(
            r#"<div role="list"><div><div role="listitem"></div></div></div>"#,
            serde_json::json!({ "options": { "version": "1.2" } }),
        ),
        &[(Severity::Error, 1, 1, EXPECTS_LISTITEM, "<div role=\"list\">")],
    );
}

#[test]
fn v6_require_owned_elements_006() {
    // The table is satisfied by `rowgroup > row`; the empty row is reported on its own.
    assert_violations(
        &run_rule(
            r#"<div role="table"><div role="rowgroup"><div role="row"></div></div></div>"#,
            serde_json::json!(true),
        ),
        &[(
            Severity::Error,
            1,
            40,
            "The child element requires the roles: \"cell\", \"columnheader\", \"gridcell\", \"rowheader\". Or, require aria-busy=\"true\"",
            "<div role=\"row\">",
        )],
    );
    assert_violations(
        &run_rule(
            r#"<div role="grid"><div role="rowgroup"><div></div></div></div>"#,
            serde_json::json!(true),
        ),
        &[
            (
                Severity::Error,
                1,
                1,
                "The \"grid\" role expects the roles: \"caption\", \"row\", \"rowgroup > row\"",
                "<div role=\"grid\">",
            ),
            (
                Severity::Error,
                1,
                18,
                "The \"rowgroup\" role expects the \"row\" role",
                "<div role=\"rowgroup\">",
            ),
        ],
    );
}

#[test]
fn v6_require_owned_elements_007() {
    assert_violations(
        &run_rule("<table><tr><td>a</td></tr></table>", serde_json::json!(true)),
        &[],
    );
    assert_violations(&run_rule("<ul><li>a</li></ul>", serde_json::json!(true)), &[]);
    assert_violations(
        &run_rule("<select><option>a</option></select>", serde_json::json!(true)),
        &[],
    );
}

#[test]
fn v6_require_owned_elements_008() {
    assert_violations(
        &run_rule("<ul>\n  <p>a</p>\n</ul>", serde_json::json!({ "severity": "warning" })),
        &[(Severity::Warning, 1, 1, EXPECTS_LISTITEM, "<ul>")],
    );
    assert_violations(&run_rule("<ul></ul>", serde_json::json!(false)), &[]);
}

// ============================================================
// Pretenders (issue #4068). The TS tests use the JSX parser; these are the same
// scenarios with custom elements parsed as HTML (`<List />` → `<x-list>`), expected
// values from the TS engine run on the HTML input.
// ============================================================

fn run_pretended(html: &str, rule: serde_json::Value, pretenders: serde_json::Value) -> Vec<Violation> {
    crate::test_util::lint_html(
        html,
        serde_json::json!({ "rules": { "require-owned-elements": rule }, "pretenders": pretenders }),
    )
}

fn pretended(html: &str, pretenders: serde_json::Value) -> Vec<Violation> {
    run_pretended(html, serde_json::json!(true), pretenders)
}

/// TS `[require-owned-elements-issue-4068-001]`: the owned element the component
/// renders itself satisfies the role.
#[test]
fn v6_require_owned_elements_009() {
    assert_violations(
        &pretended(
            "<x-list></x-list>",
            serde_json::json!([{ "selector": "x-list", "as": { "element": "ul", "contents": [{ "element": "li" }] } }]),
        ),
        &[],
    );
}

/// TS `[require-owned-elements-issue-4068-002]`: rendered elements that are not owned
/// elements do not satisfy the role.
#[test]
fn v6_require_owned_elements_010() {
    assert_violations(
        &pretended(
            "<x-list></x-list>",
            serde_json::json!([{ "selector": "x-list", "as": { "element": "ul", "contents": [{ "element": "div" }] } }]),
        ),
        &[(Severity::Error, 1, 1, EXPECTS_LISTITEM, "<x-list>")],
    );
}

/// TS `[require-owned-elements-issue-4068-003]`: children given at the usage site still
/// count next to the rendered elements.
#[test]
fn v6_require_owned_elements_011() {
    let pretenders = serde_json::json!([{ "selector": "x-list", "as": {
        "element": "ul", "slots": true, "contents": [{ "element": "div" }, { "slot": true }]
    } }]);
    assert_violations(&pretended("<x-list><li>a</li></x-list>", pretenders.clone()), &[]);
    assert_violations(
        &pretended("<x-list></x-list>", pretenders),
        &[(Severity::Error, 1, 1, EXPECTS_LISTITEM, "<x-list>")],
    );
}

/// TS `[require-owned-elements-issue-4068-004]`: children written inside a component
/// that never renders them are not owned.
#[test]
fn v6_require_owned_elements_012() {
    assert_violations(
        &pretended(
            "<x-list><li>a</li></x-list>",
            serde_json::json!([{ "selector": "x-list", "as": { "element": "ul", "slots": null, "contents": [{ "element": "div" }] } }]),
        ),
        &[(Severity::Error, 1, 1, EXPECTS_LISTITEM, "<x-list>")],
    );
}

/// TS `[require-owned-elements-issue-4068-005]`: content of unknown shape (dynamic) may
/// be the owned element.
#[test]
fn v6_require_owned_elements_013() {
    assert_violations(
        &pretended(
            "<x-list></x-list>",
            serde_json::json!([{ "selector": "x-list", "as": { "element": "ul", "contents": [{ "dynamic": true }] } }]),
        ),
        &[],
    );
}

/// TS `[require-owned-elements-issue-4068-006]`: a generic slot wrapper is transparent
/// for ownership in ARIA 1.3.
#[test]
fn v6_require_owned_elements_014() {
    assert_violations(
        &run_pretended(
            "<x-list><li>a</li></x-list>",
            serde_json::json!({ "options": { "version": "1.3" } }),
            serde_json::json!([{ "selector": "x-list", "as": {
                "element": "div",
                "attrs": [{ "name": "role", "value": "list" }],
                "slots": [{ "element": "div", "contents": [{ "slot": true }] }]
            } }]),
        ),
        &[],
    );
}

/// TS `[require-owned-elements-issue-4068-007]`: a slot wrapper that has a role requiring
/// owned elements is checked and reported on the component.
#[test]
fn v6_require_owned_elements_015() {
    let pretenders =
        serde_json::json!([{ "selector": "x-card", "as": { "element": "div", "slots": [{ "element": "ul" }] } }]);
    assert_violations(&pretended("<x-card><li>a</li></x-card>", pretenders.clone()), &[]);
    assert_violations(
        &pretended("<x-card></x-card>", pretenders.clone()),
        &[(Severity::Error, 1, 1, REQUIRES_LISTITEM, "<x-card>")],
    );
    assert_violations(
        &pretended("<x-card><p>a</p></x-card>", pretenders),
        &[(Severity::Error, 1, 1, EXPECTS_LISTITEM, "<x-card>")],
    );
}

/// TS `[require-owned-elements-issue-4068-008]`: an explicit role on a slot wrapper owns
/// the children given at the usage site.
#[test]
fn v6_require_owned_elements_016() {
    assert_violations(
        &pretended(
            r#"<x-tabs><button role="tab">A</button></x-tabs>"#,
            serde_json::json!([{ "selector": "x-tabs", "as": {
                "element": "div", "slots": [{ "element": "div", "attrs": [{ "name": "role", "value": "tablist" }] }]
            } }]),
        ),
        &[],
    );
}

/// TS `[require-owned-elements-issue-4068-009]`: several slot wrappers leave the owner of
/// the children unknown.
#[test]
fn v6_require_owned_elements_017() {
    assert_violations(
        &pretended(
            "<x-list></x-list>",
            serde_json::json!([{ "selector": "x-list", "as": {
                "element": "div",
                "attrs": [{ "name": "role", "value": "list" }],
                "slots": [
                    { "element": "p", "contents": [{ "slot": true }] },
                    { "element": "ul", "contents": [{ "slot": true }] }
                ]
            } }]),
        ),
        &[],
    );
}

/// TS `[require-owned-elements-issue-4068-010]`: a fragment component supplies the owned
/// element in place.
#[test]
fn v6_require_owned_elements_018() {
    assert_violations(
        &pretended(
            "<x-list><x-items></x-items></x-list>",
            serde_json::json!([
                { "selector": "x-list", "as": "ul" },
                { "selector": "x-items", "as": { "element": "#fragment", "contents": [{ "element": "li" }] } }
            ]),
        ),
        &[],
    );
}

/// TS `[require-owned-elements-issue-4068-011]`: a transparent component whose content is
/// unknown may supply the owned element.
#[test]
fn v6_require_owned_elements_019() {
    assert_violations(
        &run_pretended(
            "<x-list><x-wrap></x-wrap></x-list>",
            serde_json::json!({ "options": { "version": "1.3" } }),
            serde_json::json!([
                { "selector": "x-list", "as": "ul" },
                { "selector": "x-wrap", "as": { "element": "div", "contents": [{ "dynamic": true }] } }
            ]),
        ),
        &[],
    );
}

/// TS `[require-owned-elements-issue-4068-012]`: a fragment component whose content is
/// unknown may supply the owned element.
#[test]
fn v6_require_owned_elements_020() {
    assert_violations(
        &pretended(
            "<x-list><x-items></x-items></x-list>",
            serde_json::json!([
                { "selector": "x-list", "as": "ul" },
                { "selector": "x-items", "as": { "element": "#fragment", "contents": [{ "dynamic": true }] } }
            ]),
        ),
        &[],
    );
}

/// TS `[require-owned-elements-issue-4068-013]`: an expression given to a slot wrapper may
/// be the owned element. HTML has no expression; a `<slot>` is its counterpart (mutable
/// children).
#[test]
fn v6_require_owned_elements_021() {
    assert_violations(
        &pretended(
            "<x-card><slot></slot></x-card>",
            serde_json::json!([{ "selector": "x-card", "as": { "element": "div", "slots": [{ "element": "ul" }] } }]),
        ),
        &[],
    );
}

/// TS `[require-owned-elements-issue-4068-014]`: a component that renders none of its
/// own still depends on the usage site.
#[test]
fn v6_require_owned_elements_022() {
    let pretenders = serde_json::json!([{ "selector": "x-list", "as": "ul" }]);
    assert_violations(&pretended("<x-list><li>a</li></x-list>", pretenders.clone()), &[]);
    assert_violations(
        &pretended("<x-list><p>a</p></x-list>", pretenders),
        &[(Severity::Error, 1, 1, EXPECTS_LISTITEM, "<x-list>")],
    );
}

/// TS: a child given to a component that renders it inside a slot wrapper is resolved
/// on its own (`assumeSingleNode`), not against its DOM parent.
#[test]
fn v6_require_owned_elements_023() {
    assert_violations(
        &pretended(
            "<x-card><li>a</li></x-card>",
            serde_json::json!([{ "selector": "x-card", "as": { "element": "div", "slots": [{ "element": "ul", "contents": [{ "slot": true }] }] } }]),
        ),
        &[],
    );
}
