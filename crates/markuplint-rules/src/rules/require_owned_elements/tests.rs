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
//! Not ported, waiting for the pretender port (they configure `pretenders` with the JSX parser):
//!   require-owned-elements-issue-4068-001 … require-owned-elements-issue-4068-014

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
