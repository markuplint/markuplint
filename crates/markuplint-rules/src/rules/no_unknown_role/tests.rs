//! Tests for `no-unknown-role` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-unknown-role-valid-001    → no_unknown_role_valid_001
//!   no-unknown-role-valid-002    → no_unknown_role_valid_002
//!   no-unknown-role-invalid-001  → no_unknown_role_invalid_001
//!   v6_no_unknown_role_001       — Rust-only: the lookup is case-sensitive
//!   v6_no_unknown_role_002       — Rust-only: graphics roles exist on SVG elements only
//!   v6_no_unknown_role_003       — Rust-only: DPub roles exist on every element
//!   v6_no_unknown_role_004       — Rust-only: only the first unknown token is reported, at its own position
//!   v6_no_unknown_role_005       — Rust-only: independent of `no-abstract-role` for `role="widget hoge"`
//!   v6_no_unknown_role_006       — Rust-only: severity and `rules: false`
//!   v6_no_unknown_role_007       — Rust-only: an unknown first token before known ones is reported once
//!   v6_no_unknown_role_008       — Rust-only: `role="button"` is known in ARIA 1.1 and 1.2, by option and by `ruleCommonSettings`

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
    serde_json::from_value(serde_json::json!({ "rules": { "no-unknown-role": value } })).unwrap()
}

/// TS: `[no-unknown-role-valid-001]`
#[test]
fn no_unknown_role_valid_001() {
    const _ID: &str = "no-unknown-role-valid-001";
    let arena = html_arena(r#"<div role="button"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert!(result.violations.is_empty());
}

/// TS: `[no-unknown-role-valid-002]`
#[test]
fn no_unknown_role_valid_002() {
    const _ID: &str = "no-unknown-role-valid-002";
    let arena = html_arena("<div></div>");
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert!(result.violations.is_empty());
}

/// TS: `[no-unknown-role-invalid-001]`
#[test]
fn no_unknown_role_invalid_001() {
    const _ID: &str = "no-unknown-role-invalid-001";
    let arena = html_arena(r#"<div role="hoge"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));

    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].rule_id, "no-unknown-role");
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 12);
    assert_eq!(
        result.violations[0].message,
        "The \"hoge\" role does not exist according to the WAI-ARIA specification."
    );
    assert_eq!(result.violations[0].raw, "hoge");
}

#[test]
fn v6_no_unknown_role_001() {
    let arena = html_arena(r#"<div role="BUTTON"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));

    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 12);
    assert_eq!(
        result.violations[0].message,
        "The \"BUTTON\" role does not exist according to the WAI-ARIA specification."
    );
    assert_eq!(result.violations[0].raw, "BUTTON");
}

#[test]
fn v6_no_unknown_role_002() {
    // The Graphics Module roles are known on an SVG-namespace element only.
    let arena = html_arena(r#"<svg role="graphics-document"></svg>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert!(result.violations.is_empty());

    let arena = html_arena(r#"<div role="graphics-document"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].col, 12);
    assert_eq!(
        result.violations[0].message,
        "The \"graphics-document\" role does not exist according to the WAI-ARIA specification."
    );
    assert_eq!(result.violations[0].raw, "graphics-document");
}

#[test]
fn v6_no_unknown_role_003() {
    let arena = html_arena(r#"<div role="doc-abstract"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));
    assert!(result.violations.is_empty());
}

#[test]
fn v6_no_unknown_role_004() {
    let arena = html_arena(r#"<div role="button  foo bar"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));

    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 20);
    assert_eq!(
        result.violations[0].message,
        "The \"foo\" role does not exist according to the WAI-ARIA specification."
    );
    assert_eq!(result.violations[0].raw, "foo");
}

#[test]
fn v6_no_unknown_role_005() {
    // `widget` is abstract (`no-abstract-role`) but it does exist; only `hoge` is unknown.
    let arena = html_arena(r#"<div role="widget hoge"></div>"#);
    let result = lint(&arena, &spec(), &config(serde_json::json!(true)));

    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].col, 19);
    assert_eq!(
        result.violations[0].message,
        "The \"hoge\" role does not exist according to the WAI-ARIA specification."
    );
    assert_eq!(result.violations[0].raw, "hoge");
}

#[test]
fn v6_no_unknown_role_006() {
    let arena = html_arena(r#"<div role="hoge"></div>"#);

    let warned = lint(&arena, &spec(), &config(serde_json::json!("warning")));
    assert_eq!(warned.violations.len(), 1);
    assert_eq!(warned.violations[0].severity, Severity::Warning);

    let disabled = lint(&arena, &spec(), &config(serde_json::json!(false)));
    assert!(disabled.violations.is_empty());
}

#[test]
fn v6_no_unknown_role_007() {
    for html in [
        r#"<div role="hoge button"></div>"#,
        r#"<div role="hoge button link"></div>"#,
    ] {
        let result = lint(&html_arena(html), &spec(), &config(serde_json::json!(true)));
        assert_eq!(result.violations.len(), 1, "{html}");
        assert_eq!(result.violations[0].severity, Severity::Error);
        assert_eq!(result.violations[0].line, 1);
        assert_eq!(result.violations[0].col, 12);
        assert_eq!(
            result.violations[0].message,
            "The \"hoge\" role does not exist according to the WAI-ARIA specification."
        );
        assert_eq!(result.violations[0].raw, "hoge");
    }
}

#[test]
fn v6_no_unknown_role_008() {
    let arena = html_arena(r#"<div role="button"></div>"#);
    for version in ["1.1", "1.2"] {
        let by_option = lint(
            &arena,
            &spec(),
            &config(serde_json::json!({ "options": { "version": version } })),
        );
        assert!(by_option.violations.is_empty(), "{version}");

        let common: LintConfig = serde_json::from_value(serde_json::json!({
            "rules": { "no-unknown-role": true },
            "ruleCommonSettings": { "ariaVersion": version }
        }))
        .unwrap();
        assert!(lint(&arena, &spec(), &common).violations.is_empty(), "{version}");
    }
}
