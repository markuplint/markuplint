//! Tests for `no-abstract-role` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-abstract-role-valid-001    → no_abstract_role_valid_001
//!   no-abstract-role-invalid-001  → no_abstract_role_invalid_001
//!   v6_no_abstract_role_001       — Rust-only: the lookup is case-sensitive
//!   v6_no_abstract_role_002       — Rust-only: only the abstract token of several is reported, at its own position
//!   v6_no_abstract_role_003       — Rust-only: an unknown token is not this rule's business
//!   v6_no_abstract_role_004       — Rust-only: severity and `rules: false`
//!   v6_no_abstract_role_005       — Rust-only: `role="button"` is not abstract in ARIA 1.1 and 1.2, by option and by `ruleCommonSettings`

use crate::lint::{LintConfig, lint};
use crate::violation::Severity;
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
    serde_json::from_value(serde_json::json!({ "rules": { "no-abstract-role": value } })).unwrap()
}

/// TS: `[no-abstract-role-valid-001]`
#[test]
fn no_abstract_role_valid_001() {
    const _ID: &str = "no-abstract-role-valid-001";
    let arena = html_arena(r#"<div role="button"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert!(result.violations.is_empty());
}

/// TS: `[no-abstract-role-invalid-001]`
#[test]
fn no_abstract_role_invalid_001() {
    const _ID: &str = "no-abstract-role-invalid-001";
    let arena = html_arena(r#"<div role="roletype"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));

    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].rule_id, "no-abstract-role");
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 12);
    assert_eq!(
        result.violations[0].message,
        "The \"roletype\" role is the abstract role"
    );
    assert_eq!(result.violations[0].raw, "roletype");
}

#[test]
fn v6_no_abstract_role_001() {
    let arena = html_arena(r#"<div role="Roletype"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert!(result.violations.is_empty());
}

#[test]
fn v6_no_abstract_role_002() {
    let arena = html_arena(r#"<div role="button roletype widget"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));

    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 19);
    assert_eq!(
        result.violations[0].message,
        "The \"roletype\" role is the abstract role"
    );
    assert_eq!(result.violations[0].raw, "roletype");
}

#[test]
fn v6_no_abstract_role_003() {
    // `hoge` does not exist (`no-unknown-role`); `widget` is the abstract one.
    let arena = html_arena(r#"<div role="widget hoge"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));

    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].col, 12);
    assert_eq!(result.violations[0].message, "The \"widget\" role is the abstract role");
    assert_eq!(result.violations[0].raw, "widget");
}

#[test]
fn v6_no_abstract_role_004() {
    let arena = html_arena(r#"<div role="roletype"></div>"#);

    let warned = lint(&arena, &spec(), &config(serde_json::json!("warning")));
    assert_eq!(warned.violations.len(), 1);
    assert_eq!(warned.violations[0].severity, Severity::Warning);

    let disabled = lint(&arena, &spec(), &config(serde_json::json!(false)));
    assert!(disabled.violations.is_empty());
}

#[test]
fn v6_no_abstract_role_005() {
    let arena = html_arena(r#"<div role="button"></div>"#);
    for version in ["1.1", "1.2"] {
        let by_option = lint(
            &arena,
            &spec(),
            &config(serde_json::json!({ "options": { "version": version } })),
        );
        assert!(by_option.violations.is_empty(), "{version}");

        let common: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": { "no-abstract-role": true },
            "ruleCommonSettings": { "ariaVersion": version }
        }))
        .unwrap();
        assert!(lint(&arena, &spec(), &common).violations.is_empty(), "{version}");
    }
}
