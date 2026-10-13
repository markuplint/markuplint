//! Tests for `require-parent-role` rule.
//!
//! Test ID mapping (TS → Rust):
//!   require-parent-role-valid-001  → require_parent_role_valid_001
//!   require-parent-role-valid-002  → require_parent_role_valid_002
//!   v6_require_parent_role_001  — Rust-only: a missing context is reported at the role token, one or several roles
//!   v6_require_parent_role_002  — Rust-only: the first token naming a role with parent roles is reported
//!   v6_require_parent_role_003  — Rust-only: transparent ancestors, by ARIA version
//!   v6_require_parent_role_004  — Rust-only: a fragment root and implicit roles are not reported
//!   v6_require_parent_role_005  — Rust-only: tokens are matched case-sensitively against the core roles only
//!   v6_require_parent_role_006  — Rust-only: severity, multi-line position and `rules: false`
//!   v6_require_parent_role_007  — Rust-only: `listitem` outside a list, explicit on `div` and on `li`; not at a fragment root

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
        serde_json::from_value(serde_json::json!({ "rules": { "require-parent-role": value } })).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// `(severity, line, col, message, raw)`, the fields the TS specs assert.
type Expected<'a> = (Severity, u32, u32, &'a str, &'a str);

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (severity, line, col, message, raw)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, "require-parent-role");
        assert_eq!(violation.severity, *severity);
        assert_eq!(violation.line, *line);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, *message);
        assert_eq!(violation.raw, *raw);
    }
}

const OPTION_MESSAGE: &str =
    "The \"option\" role requires an accessibility parent with one of the roles: \"listbox\", \"listbox > group\"";

/// TS: `[require-parent-role-valid-001]`
#[test]
fn require_parent_role_valid_001() {
    const _ID: &str = "require-parent-role-valid-001";
    let violations = run_rule(
        r#"<div role="listbox"><div role="option"></div></div>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[require-parent-role-valid-002]`
#[test]
fn require_parent_role_valid_002() {
    const _ID: &str = "require-parent-role-valid-002";
    assert_violations(&run_rule("<div></div>", serde_json::json!(true)), &[]);
}

#[test]
fn v6_require_parent_role_001() {
    assert_violations(
        &run_rule(r#"<div><div role="option"></div></div>"#, serde_json::json!(true)),
        &[(Severity::Error, 1, 17, OPTION_MESSAGE, "option")],
    );
    assert_violations(
        &run_rule(r#"<div><div role="tab"></div></div>"#, serde_json::json!(true)),
        &[(
            Severity::Error,
            1,
            17,
            "The \"tab\" role requires an accessibility parent with the \"tablist\" role",
            "tab",
        )],
    );
    assert_violations(
        &run_rule(r#"<div><div role="row"></div></div>"#, serde_json::json!(true)),
        &[(
            Severity::Error,
            1,
            17,
            "The \"row\" role requires an accessibility parent with one of the roles: \"grid\", \"table\", \"treegrid\", \"rowgroup\"",
            "row",
        )],
    );
    assert_violations(
        &run_rule(
            r#"<html><body><div role="option"></div></body></html>"#,
            serde_json::json!(true),
        ),
        &[(Severity::Error, 1, 24, OPTION_MESSAGE, "option")],
    );
}

#[test]
fn v6_require_parent_role_002() {
    assert_violations(
        &run_rule(r#"<div><div role="foo option"></div></div>"#, serde_json::json!(true)),
        &[(Severity::Error, 1, 21, OPTION_MESSAGE, "option")],
    );
    // `button` is the computed role, so no context is required.
    assert_violations(
        &run_rule(
            r#"<div><div role="button option"></div></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

#[test]
fn v6_require_parent_role_003() {
    // Nothing above the presentational parent provides the context.
    assert_violations(
        &run_rule(
            r#"<div role="none"><div role="option"></div></div>"#,
            serde_json::json!(true),
        ),
        &[(Severity::Error, 1, 29, OPTION_MESSAGE, "option")],
    );
    assert_violations(
        &run_rule(
            r#"<div role="listbox"><div role="none"><div role="option"></div></div></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
    assert_violations(
        &run_rule(
            r#"<div role="listbox"><div><div role="option"></div></div></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
    // A `generic` ancestor is transparent from ARIA 1.3 (the default) only.
    assert_violations(
        &run_rule(
            r#"<div role="listbox"><div><div role="option"></div></div></div>"#,
            serde_json::json!({ "options": { "version": "1.2" } }),
        ),
        &[(
            Severity::Error,
            1,
            37,
            "The \"option\" role requires an accessibility parent with one of the roles: \"group\", \"listbox\"",
            "option",
        )],
    );
}

#[test]
fn v6_require_parent_role_004() {
    assert_violations(&run_rule(r#"<div role="option"></div>"#, serde_json::json!(true)), &[]);
    assert_violations(&run_rule("<ul><li>x</li></ul>", serde_json::json!(true)), &[]);
    assert_violations(&run_rule("<div><li>x</li></div>", serde_json::json!(true)), &[]);
}

#[test]
fn v6_require_parent_role_005() {
    assert_violations(
        &run_rule(r#"<div><div role="OPTION"></div></div>"#, serde_json::json!(true)),
        &[],
    );
    assert_violations(
        &run_rule(
            r#"<div><div role="doc-biblioentry"></div></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

#[test]
fn v6_require_parent_role_006() {
    assert_violations(
        &run_rule(
            "<div>\n  <div role=\"option\"></div>\n</div>",
            serde_json::json!({ "severity": "warning" }),
        ),
        &[(Severity::Warning, 2, 14, OPTION_MESSAGE, "option")],
    );
    assert_violations(
        &run_rule(r#"<div><div role="option"></div></div>"#, serde_json::json!(false)),
        &[],
    );
}

const LISTITEM_MESSAGE: &str =
    "The \"listitem\" role requires an accessibility parent with one of the roles: \"directory\", \"list\"";

#[test]
fn v6_require_parent_role_007() {
    assert_violations(
        &run_rule(r#"<div><div role="listitem"></div></div>"#, serde_json::json!(true)),
        &[(Severity::Error, 1, 17, LISTITEM_MESSAGE, "listitem")],
    );
    assert_violations(
        &run_rule(r#"<div><li role="listitem">x</li></div>"#, serde_json::json!(true)),
        &[(Severity::Error, 1, 16, LISTITEM_MESSAGE, "listitem")],
    );
    assert_violations(
        &run_rule(r#"<div role="listitem"></div>"#, serde_json::json!(true)),
        &[],
    );
    assert_violations(&run_rule(r#"<li role="listitem">x</li>"#, serde_json::json!(true)), &[]);
}
