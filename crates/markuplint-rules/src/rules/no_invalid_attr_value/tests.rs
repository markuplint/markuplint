//! Tests for `no-invalid-attr-value` rule.
//!
//! Split out of the tests of the pre-split `invalid-attr` rule; each test keeps the
//! TypeScript test it mirrors under that test's new id (old id in parentheses).
//!
//!   no-invalid-attr-value-invalid-001  → no_invalid_attr_value_invalid_001  (was invalid-attr-invalid-002)
//!   no-invalid-attr-value-valid-001  → no_invalid_attr_value_valid_001  (was invalid-attr-valid-001)
//!   no-invalid-attr-value-invalid-002  → no_invalid_attr_value_invalid_002  (was invalid-attr-invalid-003)
//!   no-invalid-attr-value-valid-002  → no_invalid_attr_value_valid_002  (was invalid-attr-valid-003)
//!   no-invalid-attr-value-invalid-004  → no_invalid_attr_value_invalid_004  (was invalid-attr-invalid-010)
//!   no-invalid-attr-value-invalid-005  → no_invalid_attr_value_invalid_005  (was invalid-attr-invalid-011)
//!   no-invalid-attr-value-invalid-006  → no_invalid_attr_value_invalid_006  (was invalid-attr-invalid-012)
//!   no-invalid-attr-value-valid-003  → no_invalid_attr_value_valid_003  (was invalid-attr-valid-007)
//!   no-invalid-attr-value-valid-004  → no_invalid_attr_value_valid_004  (was invalid-attr-valid-010)
//!   no-invalid-attr-value-invalid-017  → no_invalid_attr_value_invalid_017  (was invalid-attr-invalid-026)
//!   no-invalid-attr-value-valid-006  → no_invalid_attr_value_valid_006  (was invalid-attr-valid-014)
//!   no-invalid-attr-value-issue-1078  → no_invalid_attr_value_issue_1078  (was invalid-attr-issue-1078)
//!   no-invalid-attr-value-issue-1357  → no_invalid_attr_value_issue_1357  (was invalid-attr-issue-1357)
//!   no-invalid-attr-value-valid-013  → no_invalid_attr_value_valid_013  (was invalid-attr-valid-021)
//!   no-invalid-attr-value-invalid-020  → no_invalid_attr_value_invalid_020  (was invalid-attr-invalid-029)
//!   no-invalid-attr-value-invalid-003  → no_invalid_attr_value_invalid_003  (was invalid-attr-invalid-004)
//!   no-invalid-attr-value-valid-005  → no_invalid_attr_value_valid_005  (was invalid-attr-valid-012)
//!   no-invalid-attr-value-valid-007  → no_invalid_attr_value_valid_007  (was invalid-attr-valid-015)
//!   no-invalid-attr-value-valid-008  → no_invalid_attr_value_valid_008  (was invalid-attr-valid-016)
//!   no-invalid-attr-value-invalid-018  → no_invalid_attr_value_invalid_018  (was invalid-attr-invalid-027)
//!   no-invalid-attr-value-valid-009  → no_invalid_attr_value_valid_009  (was invalid-attr-valid-017)
//!   no-invalid-attr-value-valid-010  → no_invalid_attr_value_valid_010  (was invalid-attr-valid-018)
//!   no-invalid-attr-value-valid-011  → no_invalid_attr_value_valid_011  (was invalid-attr-valid-019)
//!   no-invalid-attr-value-invalid-019  → no_invalid_attr_value_invalid_019  (was invalid-attr-invalid-028)
//!   no-invalid-attr-value-valid-012  → no_invalid_attr_value_valid_012  (was invalid-attr-valid-020)
//!   no-invalid-attr-value-issue-3384-001  → no_invalid_attr_value_issue_3384_001  (was invalid-attr-issue-3384-001)
//!   no-invalid-attr-value-issue-3384-002  → no_invalid_attr_value_issue_3384_002  (was invalid-attr-issue-3384-002)
//!   no-invalid-attr-value-issue-3384-003  → no_invalid_attr_value_issue_3384_003  (was invalid-attr-issue-3384-003)
//!   no-invalid-attr-value-issue-3384-004  → no_invalid_attr_value_issue_3384_004  (was invalid-attr-issue-3384-004)
//!   no-invalid-attr-value-issue-3384-006  → no_invalid_attr_value_issue_3384_006  (was invalid-attr-issue-3384-006)
//!   no-invalid-attr-value-issue-3384-009  → no_invalid_attr_value_issue_3384_009  (was invalid-attr-issue-3384-009)
//!   no-invalid-attr-value-issue-3384-010  → no_invalid_attr_value_issue_3384_010  (was invalid-attr-issue-3384-010)
//!   no-invalid-attr-value-issue-3384-011  → no_invalid_attr_value_issue_3384_011  (was invalid-attr-issue-3384-011)
//!   no-invalid-attr-value-issue-3599-001  → no_invalid_attr_value_issue_3599_001  (was invalid-attr-issue-3599-001)
//!   no-invalid-attr-value-issue-3599-002  → no_invalid_attr_value_issue_3599_002  (was invalid-attr-issue-3599-002)
//!   no-invalid-attr-value-issue-3599-003  → no_invalid_attr_value_issue_3599_003  (was invalid-attr-issue-3599-003)
//!   no-invalid-attr-value-issue-3626-002  → no_invalid_attr_value_issue_3626_002  (was invalid-attr-issue-3626-002)
//!   no-invalid-attr-value-invalid-007  → no_invalid_attr_value_invalid_007  (was invalid-attr-invalid-013)
//!   no-invalid-attr-value-invalid-008  → no_invalid_attr_value_invalid_008  (was invalid-attr-invalid-014)
//!   no-invalid-attr-value-issue-1987  → no_invalid_attr_value_issue_1987  (was invalid-attr-issue-1987)
//!   no-invalid-attr-value-issue-3384-005  → no_invalid_attr_value_issue_3384_005  (was invalid-attr-issue-3384-005)
//!   no-invalid-attr-value-issue-3384-007  → no_invalid_attr_value_issue_3384_007  (was invalid-attr-issue-3384-007)
//!   no-invalid-attr-value-issue-3384-008  → no_invalid_attr_value_issue_3384_008  (was invalid-attr-issue-3384-008)
//!   no-invalid-attr-value-invalid-013  → no_invalid_attr_value_invalid_013  (was invalid-attr-invalid-021)
//!   no-invalid-attr-value-invalid-014  → no_invalid_attr_value_invalid_014  (was invalid-attr-invalid-022)
//!   no-invalid-attr-value-invalid-011  → no_invalid_attr_value_invalid_011  (was invalid-attr-invalid-016)
//!   no-invalid-attr-value-invalid-012  → no_invalid_attr_value_invalid_012  (was invalid-attr-invalid-017)
//!   no-invalid-attr-value-invalid-015  → no_invalid_attr_value_invalid_015  (was invalid-attr-invalid-024)
//!   no-invalid-attr-value-invalid-016  → no_invalid_attr_value_invalid_016  (was invalid-attr-invalid-025)
//!   no-invalid-attr-value-issue-3626-001  — SKIP: Spec sync (#3675). SRIHash checker ready, awaiting dev merge (Rust test commented out at ~line 2064) (was invalid-attr-issue-3626-001)
//!   no-invalid-attr-value-parser-001  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-014)
//!   no-invalid-attr-value-parser-002  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-015)
//!   no-invalid-attr-value-parser-003  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-016)
//!   no-invalid-attr-value-parser-004  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-017)

use super::*;
use crate::lint::{LintConfig, lint};
use crate::rule::RuleConfig;
use crate::rules::no_duplicate_attr::tests::make_element_with_attrs;
use crate::violation::Severity;
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;

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

#[test]
fn allow_attrs_with_enum_constraint_valid() {
    let arena = make_element_with_attrs("div", &[("tabindex", "-1")]);
    let s = spec();
    let rule = NoInvalidAttrValue;
    let config = RuleConfig {
        options: serde_json::json!({
            "allowAttrs": [{ "name": "tabindex", "value": { "enum": ["-1", "0"] } }],
        }),
        ..RuleConfig::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert!(
        violations.is_empty(),
        "tabindex=-1 should be allowed with enum constraint, got: {violations:?}"
    );
}

#[test]
fn allow_attrs_with_enum_constraint_invalid() {
    let arena = make_element_with_attrs("div", &[("tabindex", "3")]);
    let s = spec();
    let rule = NoInvalidAttrValue;
    let config = RuleConfig {
        options: serde_json::json!({
            "allowAttrs": [{ "name": "tabindex", "value": { "enum": ["-1", "0"] } }],
        }),
        ..RuleConfig::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert_eq!(violations.len(), 1, "tabindex=3 should violate enum constraint");
    assert!(violations[0].message.contains("expects"));
}

#[test]
fn allow_attrs_with_no_empty_any_type() {
    let arena = make_element_with_attrs("meta", &[("property", "og:title")]);
    let s = spec();
    let rule = NoInvalidAttrValue;
    let config = RuleConfig {
        options: serde_json::json!({
            "allowAttrs": [{ "name": "property", "value": "NoEmptyAny" }],
        }),
        ..RuleConfig::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert!(violations.is_empty(), "property with non-empty value should be allowed");
}

#[test]
fn allow_attrs_with_no_empty_any_type_empty_value() {
    let arena = make_element_with_attrs("meta", &[("property", "")]);
    let s = spec();
    let rule = NoInvalidAttrValue;
    let config = RuleConfig {
        options: serde_json::json!({
            "allowAttrs": [{ "name": "property", "value": "NoEmptyAny" }],
        }),
        ..RuleConfig::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert_eq!(
        violations.len(),
        1,
        "property with empty value should violate NoEmptyAny"
    );
}

/// TS: `[no-invalid-attr-value-invalid-001]` — Type check (empty name attr on form)
#[test]
fn no_invalid_attr_value_invalid_001() {
    const _ID: &str = "no-invalid-attr-value-invalid-001";
    let arena = html_arena(r#"<form name=""></form>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 13);
    assert_eq!(result.violations[0].message, "The \"name\" attribute must not be empty");
    assert_eq!(result.violations[0].raw, "");
}

/// TS: `[no-invalid-attr-value-valid-001]` — disable (same HTML as invalid-001 but rule=false)
#[test]
fn no_invalid_attr_value_valid_001() {
    const _ID: &str = "no-invalid-attr-value-valid-001";
    let arena = html_arena(r#"<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": false }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[no-invalid-attr-value-invalid-002]` — hidden attribute enum
#[test]
fn no_invalid_attr_value_invalid_002() {
    const _ID: &str = "no-invalid-attr-value-invalid-002";
    let spec = spec();
    let mk_config = || -> LintConfig {
        serde_json::from_value(serde_json::json!({
            "rules": { "no-invalid-attr-value": true }
        }))
        .unwrap()
    };
    // Valid hidden values
    assert_eq!(
        lint(&html_arena("<div hidden></div>"), &spec, &mk_config())
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<div hidden=""></div>"#), &spec, &mk_config())
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<div hidden="hidden"></div>"#), &spec, &mk_config())
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<div hidden="until-found"></div>"#), &spec, &mk_config())
            .violations
            .len(),
        0
    );
    // Invalid hidden value
    assert_eq!(
        lint(&html_arena(r#"<div hidden="invalid"></div>"#), &spec, &mk_config())
            .violations
            .len(),
        1
    );
}

/// TS: `[no-invalid-attr-value-valid-002]` — input type case-insensitive
#[test]
fn no_invalid_attr_value_valid_002() {
    const _ID: &str = "no-invalid-attr-value-valid-002";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<input type="checkbox" checked>"#), &spec, &config)
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<input type="checkBox" checked>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-invalid-004]` — custom rule: allow with pattern
#[test]
fn no_invalid_attr_value_invalid_004() {
    const _ID: &str = "no-invalid-attr-value-invalid-004";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": { "options": { "allowAttrs": { "x-attr": { "pattern": "/[a-z]+/" } } } } }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 15);
    assert_eq!(
        result.violations[0].message,
        "The \"x-attr\" attribute expects regular expression (/[a-z]+/)"
    );
    assert_eq!(result.violations[0].raw, "123");
}

/// TS: `[no-invalid-attr-value-invalid-005]` — custom rule: allow with pattern (array form)
#[test]
fn no_invalid_attr_value_invalid_005() {
    const _ID: &str = "no-invalid-attr-value-invalid-005";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": { "options": { "allowAttrs": [{ "name": "x-attr", "value": { "pattern": "/[a-z]+/" } }] } } }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 15);
    assert_eq!(
        result.violations[0].message,
        "The \"x-attr\" attribute expects regular expression (/[a-z]+/)"
    );
    assert_eq!(result.violations[0].raw, "123");
}

/// TS: `[no-invalid-attr-value-invalid-006]` — custom rule: type constraint
#[test]
fn no_invalid_attr_value_invalid_006() {
    const _ID: &str = "no-invalid-attr-value-invalid-006";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": { "options": { "allowAttrs": { "x-attr": "Int" } } } }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 41);
    assert_eq!(
        result.violations[0].message,
        "It includes unexpected characters. the \"x-attr\" attribute expects integer"
    );
    assert_eq!(result.violations[0].raw, "abc");
}

/// TS: `[no-invalid-attr-value-valid-003]` — URL attribute
#[test]
fn no_invalid_attr_value_valid_003() {
    const _ID: &str = "no-invalid-attr-value-valid-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<img src="https://sample.com/path/to">"#), &spec, &config)
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<img src="//sample.com/path/to">"#), &spec, &config)
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(
            &html_arena(r#"<img src="//user:pass@sample.com/path/to">"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<img src="/path/to">"#), &spec, &config)
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<img src="/path/to?param=value">"#), &spec, &config)
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<img src="/?param=value">"#), &spec, &config)
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<img src="?param=value">"#), &spec, &config)
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<img src="path/to">"#), &spec, &config)
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<img src="./path/to">"#), &spec, &config)
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<img src="../path/to">"#), &spec, &config)
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<img src="/path/to#hash">"#), &spec, &config)
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r##"<img src="#hash">"##), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-valid-004]` — Booleanish (contenteditable)
#[test]
fn no_invalid_attr_value_valid_004() {
    const _ID: &str = "no-invalid-attr-value-valid-004";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena("<div contenteditable></div>"), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-invalid-017]` — contenteditable="inherit" is invalid
#[test]
fn no_invalid_attr_value_invalid_017() {
    const _ID: &str = "no-invalid-attr-value-invalid-017";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    let result = lint(&html_arena(r#"<div contenteditable="inherit"></div>"#), &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].raw, "inherit");
    assert!(result.violations[0].message.contains("contenteditable"));
}

/// TS: `[no-invalid-attr-value-valid-006]` — CSS Functions in style
#[test]
fn no_invalid_attr_value_valid_006() {
    const _ID: &str = "no-invalid-attr-value-valid-006";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<div style="prop: var(--x)"></div>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-issue-1078]` — referrerpolicy on script and img
#[test]
fn no_invalid_attr_value_issue_1078() {
    const _ID: &str = "no-invalid-attr-value-issue-1078";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<script src="foo.js" referrerpolicy="no-referrer"></script>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    assert_eq!(
        lint(
            &html_arena(r#"<img src="foo.png" referrerpolicy="no-referrer"></img>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-issue-1357]` — SVG rect transform
#[test]
fn no_invalid_attr_value_issue_1357() {
    const _ID: &str = "no-invalid-attr-value-issue-1357";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<svg><rect transform="translate(300 300) rotate(180)" /></svg>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-valid-013]` — empty lang attribute is valid
#[test]
fn no_invalid_attr_value_valid_013() {
    const _ID: &str = "no-invalid-attr-value-valid-013";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<html lang=""></html>"#), &spec, &config)
            .violations
            .len(),
        0,
        "empty lang on html"
    );
    assert_eq!(
        lint(&html_arena("<html lang></html>"), &spec, &config).violations.len(),
        0,
        "boolean lang on html"
    );
    assert_eq!(
        lint(&html_arena(r#"<div lang=""></div>"#), &spec, &config)
            .violations
            .len(),
        0,
        "empty lang on div"
    );
}

/// TS: `[no-invalid-attr-value-invalid-020]` — script type="speculationrules" is valid
#[test]
fn no_invalid_attr_value_invalid_020() {
    const _ID: &str = "no-invalid-attr-value-invalid-020";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<script type="speculationrules">{"prerender":[{"urls":["/page"]}]}</script>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-invalid-003]` — complex type (autocomplete)
#[test]
fn no_invalid_attr_value_invalid_003() {
    const _ID: &str = "no-invalid-attr-value-invalid-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<input autocomplete="section-a section-b"/>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 32);
    assert_eq!(result.violations[0].raw, "section-b");
}

/// TS: `[no-invalid-attr-value-valid-005]` — Multiple Type (command attribute)
#[test]
fn no_invalid_attr_value_valid_005() {
    const _ID: &str = "no-invalid-attr-value-valid-005";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<button command="toggle-popover"></button>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<button command="--custom"></button>"#), &spec, &config)
            .violations
            .len(),
        0
    );
    let result = lint(&html_arena(r#"<button command="invalid"></button>"#), &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].col, 18);
    assert_eq!(result.violations[0].raw, "invalid");
    assert_eq!(
        result.violations[0].message,
        "The \"command\" attribute expects either \"toggle-popover\", \"show-popover\", \"hide-popover\", \"close\", \"request-close\", \"show-modal\". Or, the \"command\" attribute expects the custom command format. Did you mean \"--invalid\"? (https://html.spec.whatwg.org/multipage/form-elements.html#valid-custom-command)"
    );
}

/// TS: `[no-invalid-attr-value-valid-007]` — command="request-close" is valid
#[test]
fn no_invalid_attr_value_valid_007() {
    const _ID: &str = "no-invalid-attr-value-valid-007";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<dialog id="d"><button command="request-close" commandfor="d">Close</button></dialog>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-valid-008]` — command="close" is valid
#[test]
fn no_invalid_attr_value_valid_008() {
    const _ID: &str = "no-invalid-attr-value-valid-008";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<dialog id="d"><button command="close" commandfor="d">Close</button></dialog>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-invalid-018]` — command="invalid-value" is invalid
#[test]
fn no_invalid_attr_value_invalid_018() {
    const _ID: &str = "no-invalid-attr-value-invalid-018";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<dialog id="d"><button command="invalid-value" commandfor="d">Close</button></dialog>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 33);
    assert_eq!(result.violations[0].raw, "invalid-value");
    assert_eq!(
        result.violations[0].message,
        "The \"command\" attribute expects either \"toggle-popover\", \"show-popover\", \"hide-popover\", \"close\", \"request-close\", \"show-modal\". Or, the \"command\" attribute expects the custom command format. Did you mean \"--invalid-value\"? (https://html.spec.whatwg.org/multipage/form-elements.html#valid-custom-command)"
    );
}

/// TS: `[no-invalid-attr-value-valid-009]` — headingoffset with valid value
#[test]
fn no_invalid_attr_value_valid_009() {
    const _ID: &str = "no-invalid-attr-value-valid-009";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<section headingoffset="1"><h2>Title</h2></section>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-valid-010]` — headingoffset="0" is valid
#[test]
fn no_invalid_attr_value_valid_010() {
    const _ID: &str = "no-invalid-attr-value-valid-010";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<div headingoffset="0"><h1>Title</h1></div>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-valid-011]` — headingoffset="8" is valid (max)
#[test]
fn no_invalid_attr_value_valid_011() {
    const _ID: &str = "no-invalid-attr-value-valid-011";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<div headingoffset="8"><h1>Title</h1></div>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-invalid-019]` — headingoffset with non-integer value
#[test]
fn no_invalid_attr_value_invalid_019() {
    const _ID: &str = "no-invalid-attr-value-invalid-019";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<div headingoffset="abc"><h1>Title</h1></div>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 21);
    assert_eq!(result.violations[0].raw, "abc");
    assert_eq!(
        result.violations[0].message,
        "It includes unexpected characters. the \"headingoffset\" attribute expects integer greater than or equal to 0 less than or equal to 8"
    );
}

/// TS: `[no-invalid-attr-value-valid-012]` — headingreset is valid
#[test]
fn no_invalid_attr_value_valid_012() {
    const _ID: &str = "no-invalid-attr-value-valid-012";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena("<div headingreset><h1>Title</h1></div>"), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-issue-3384-001]` — focusgroup with valid behavior keyword
#[test]
fn no_invalid_attr_value_issue_3384_001() {
    const _ID: &str = "no-invalid-attr-value-issue-3384-001";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<div focusgroup="toolbar"></div>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-issue-3384-002]` — focusgroup with multiple valid tokens
#[test]
fn no_invalid_attr_value_issue_3384_002() {
    const _ID: &str = "no-invalid-attr-value-issue-3384-002";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<div focusgroup="tablist inline wrap"></div>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-issue-3384-003]` — focusgroup with all valid tokens
#[test]
fn no_invalid_attr_value_issue_3384_003() {
    const _ID: &str = "no-invalid-attr-value-issue-3384-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<ul focusgroup="menu block nowrap nomemory"></ul>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-issue-3384-004]` — focusgroup with invalid token
#[test]
fn no_invalid_attr_value_issue_3384_004() {
    const _ID: &str = "no-invalid-attr-value-issue-3384-004";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    let result = lint(&html_arena(r#"<div focusgroup="invalid"></div>"#), &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 18);
    assert!(result.violations[0].message.contains("focusgroup"));
    assert_eq!(result.violations[0].raw, "invalid");
}

/// TS: `[no-invalid-attr-value-issue-3384-006]` — focusgroup="none" is valid
#[test]
fn no_invalid_attr_value_issue_3384_006() {
    const _ID: &str = "no-invalid-attr-value-issue-3384-006";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<li focusgroup="none"></li>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-issue-3384-009]` — focusgroup with empty value is valid
#[test]
fn no_invalid_attr_value_issue_3384_009() {
    const _ID: &str = "no-invalid-attr-value-issue-3384-009";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<div focusgroup=""></div>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-issue-3384-010]` — focusgroupstart boolean attribute is valid
#[test]
fn no_invalid_attr_value_issue_3384_010() {
    const _ID: &str = "no-invalid-attr-value-issue-3384-010";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena("<button focusgroupstart></button>"), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-issue-3384-011]` — focusgroup on any element (global attribute)
#[test]
fn no_invalid_attr_value_issue_3384_011() {
    const _ID: &str = "no-invalid-attr-value-issue-3384-011";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<nav focusgroup="menubar"></nav>"#), &spec, &config)
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena("<span focusgroupstart></span>"), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-issue-3599-001]` — srcset rejects zero width descriptor
#[test]
fn no_invalid_attr_value_issue_3599_001() {
    const _ID: &str = "no-invalid-attr-value-issue-3599-001";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<img srcset="x 0w" sizes="100vw" src=x alt=x>"#),
        &spec,
        &config,
    );
    assert!(result.violations.len() > 0, "srcset zero width should be invalid");
}

/// TS: `[no-invalid-attr-value-issue-3599-002]` — srcset rejects zero density descriptor
#[test]
fn no_invalid_attr_value_issue_3599_002() {
    const _ID: &str = "no-invalid-attr-value-issue-3599-002";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    let result = lint(&html_arena(r#"<img srcset="x 0x" src=x alt=x>"#), &spec, &config);
    assert!(
        result.violations.len() > 0,
        "srcset zero density should be invalid: {:#?}",
        result.violations
    );
}

/// TS: `[no-invalid-attr-value-issue-3599-003]` — srcset accepts valid width descriptor
#[test]
fn no_invalid_attr_value_issue_3599_003() {
    const _ID: &str = "no-invalid-attr-value-issue-3599-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<img srcset="x 100w" sizes="100vw" src=x alt=x>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-issue-3626-002]` — integrity accepts sha256 hash
#[test]
fn no_invalid_attr_value_issue_3626_002() {
    const _ID: &str = "no-invalid-attr-value-issue-3626-002";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<script src="x" integrity="sha256-abc123"></script>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-invalid-007]` — custom element and custom rule (nodeRule)
#[test]
fn no_invalid_attr_value_invalid_007() {
    const _ID: &str = "no-invalid-attr-value-invalid-007";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true },
        "nodeRules": [{
            "selector": "custom-element",
            "rules": { "no-invalid-attr-value": { "options": { "allowAttrs": { "any-attr": "Int" } } } }
        }]
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<custom-element any-attr="any-string"></custom-element>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
}

/// TS: `[no-invalid-attr-value-invalid-008]` — custom element and custom rule (nodeRule, array form)
#[test]
fn no_invalid_attr_value_invalid_008() {
    const _ID: &str = "no-invalid-attr-value-invalid-008";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true },
        "nodeRules": [{
            "selector": "custom-element",
            "rules": { "no-invalid-attr-value": { "options": { "allowAttrs": [{ "name": "any-attr", "value": "Int" }] } } }
        }]
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<custom-element any-attr="any-string"></custom-element>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
}

/// TS: `[no-invalid-attr-value-issue-1987]` — preload as destinations
#[test]
fn no_invalid_attr_value_issue_1987() {
    const _ID: &str = "no-invalid-attr-value-issue-1987";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    // Valid preload destinations
    assert_eq!(
        lint(
            &html_arena(r#"<link rel="preload" as="fetch" href="/api" />"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    assert_eq!(
        lint(
            &html_arena(r#"<link rel="preload" as="font" href="/font.woff2" />"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    assert_eq!(
        lint(
            &html_arena(r#"<link rel="preload" as="script" href="/app.js" />"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    assert_eq!(
        lint(
            &html_arena(r#"<link rel="preload" as="style" href="/app.css" />"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    assert_eq!(
        lint(
            &html_arena(r#"<link rel="preload" as="track" href="/sub.vtt" />"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    // Valid modulepreload destinations
    assert_eq!(
        lint(
            &html_arena(r#"<link rel="modulepreload" as="script" href="/mod.js" />"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    assert_eq!(
        lint(
            &html_arena(r#"<link rel="modulepreload" as="worker" href="/worker.js" />"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    assert_eq!(
        lint(
            &html_arena(r#"<link rel="modulepreload" as="json" href="/data.json" />"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    assert_eq!(
        lint(
            &html_arena(r#"<link rel="modulepreload" as="style" href="/mod.css" />"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    assert_eq!(
        lint(
            &html_arena(r#"<link rel="modulepreload" as="audioworklet" href="/audio.js" />"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    // Invalid: values removed from spec
    // `rel="preload"` and `rel="modulepreload"` take different value sets (#3189), so the
    // message lists the six preload values only — not the union of both conditions.
    let expected_msg =
        "The \"as\" attribute expects either \"fetch\", \"font\", \"image\", \"script\", \"style\", \"track\"";
    let r1 = lint(
        &html_arena(r#"<link rel="preload" as="audio" href="/audio.mp3" />"#),
        &spec,
        &config,
    );
    assert_eq!(r1.violations.len(), 1, "as=audio: {:#?}", r1.violations);
    assert_eq!(r1.violations[0].col, 25);
    assert_eq!(r1.violations[0].message, expected_msg);
    assert_eq!(r1.violations[0].raw, "audio");
    let r2 = lint(
        &html_arena(r#"<link rel="preload" as="video" href="/video.mp4" />"#),
        &spec,
        &config,
    );
    assert_eq!(r2.violations.len(), 1, "as=video: {:#?}", r2.violations);
    assert_eq!(r2.violations[0].message, expected_msg);
    assert_eq!(r2.violations[0].raw, "video");
    let r3 = lint(
        &html_arena(r#"<link rel="preload" as="document" href="/page" />"#),
        &spec,
        &config,
    );
    assert_eq!(r3.violations.len(), 1, "as=document: {:#?}", r3.violations);
    assert_eq!(r3.violations[0].message, expected_msg);
    assert_eq!(r3.violations[0].raw, "document");
}

/// TS: `[no-invalid-attr-value-issue-3384-005]` — focusgroup with valid and invalid tokens mixed
#[test]
fn no_invalid_attr_value_issue_3384_005() {
    const _ID: &str = "no-invalid-attr-value-issue-3384-005";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<div focusgroup="toolbar invalidmod"></div>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].raw, "invalidmod");
}

/// TS: `[no-invalid-attr-value-issue-3384-007]` — focusgroup is case-insensitive
#[test]
fn no_invalid_attr_value_issue_3384_007() {
    const _ID: &str = "no-invalid-attr-value-issue-3384-007";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<div focusgroup="TOOLBAR"></div>"#), &spec, &config)
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(
            &html_arena(r#"<div focusgroup="Menu Inline Wrap"></div>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-issue-3384-008]` — focusgroup rejects duplicate tokens
#[test]
fn no_invalid_attr_value_issue_3384_008() {
    const _ID: &str = "no-invalid-attr-value-issue-3384-008";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<div focusgroup="toolbar toolbar"></div>"#),
        &spec,
        &config,
    );
    assert!(
        result.violations.len() >= 1,
        "duplicate tokens should be rejected: {:#?}",
        result.violations
    );
}

/// TS: `[no-invalid-attr-value-invalid-013]` — SVG rect mask invalid CSS
#[test]
fn no_invalid_attr_value_invalid_013() {
    const _ID: &str = "no-invalid-attr-value-invalid-013";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    let html = "<svg>\n\t\t\t\t\t<rect mask=\"20px\n\t\t\t\t\thogehoge\" />\n\t\t\t\t</svg>\n\t\t\t\t";
    let result = lint(&html_arena(html), &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 3);
    assert_eq!(result.violations[0].col, 6);
    assert_eq!(
        result.violations[0].message,
        "The value part of the \"mask\" attribute expects the CSS Syntax \"<'mask'>\" (https://csstree.github.io/docs/syntax/#Property:mask)"
    );
    assert_eq!(result.violations[0].raw, "hogehoge");
}

/// TS: `[no-invalid-attr-value-invalid-014]` — SVG rect transform valid
#[test]
fn no_invalid_attr_value_invalid_014() {
    const _ID: &str = "no-invalid-attr-value-invalid-014";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    // TS: empty violations (transform value is valid)
    assert_eq!(
        lint(
            &html_arena(
                "<svg>\n\t\t\t\t\t\t<rect transform=\"translate(300px, 300px)\" />\n\t\t\t\t\t</svg>\n\t\t\t\t\t"
            ),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-invalid-attr-value-invalid-011]` — Overwrite type (object form allowAttrs)
#[test]
fn no_invalid_attr_value_invalid_011() {
    const _ID: &str = "no-invalid-attr-value-invalid-011";
    let spec = spec();
    // With allowAttrs overwriting datetime to enum ["overwrite-type"]
    let config1: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": { "options": { "allowAttrs": { "datetime": { "enum": ["overwrite-type"] } } } } }
    }))
    .unwrap();
    let result1 = lint(
        &html_arena(r#"<time datetime="overwrite-type"></time><time datetime="2000-01-01"></time>"#),
        &spec,
        &config1,
    );
    assert_eq!(
        result1.violations.len(),
        1,
        "overwrite config: {:#?}",
        result1.violations
    );
    assert_eq!(result1.violations[0].severity, Severity::Error);
    assert_eq!(result1.violations[0].line, 1);
    assert_eq!(result1.violations[0].col, 56);
    assert_eq!(
        result1.violations[0].message,
        "The \"datetime\" attribute expects overwrite-type"
    );
    assert_eq!(result1.violations[0].raw, "2000-01-01");
    // Without overwrite: "overwrite-type" is invalid datetime
    let config2: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    let result2 = lint(
        &html_arena(r#"<time datetime="overwrite-type"></time><time datetime="2000-01-01"></time>"#),
        &spec,
        &config2,
    );
    assert_eq!(result2.violations.len(), 1, "default config: {:#?}", result2.violations);
    assert_eq!(result2.violations[0].line, 1);
    assert_eq!(result2.violations[0].col, 17);
    assert_eq!(result2.violations[0].raw, "overwrite-type");
}

/// TS: `[no-invalid-attr-value-invalid-012]` — Overwrite type (array form allowAttrs)
#[test]
fn no_invalid_attr_value_invalid_012() {
    const _ID: &str = "no-invalid-attr-value-invalid-012";
    let spec = spec();
    let config1: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": { "options": { "allowAttrs": [{ "name": "datetime", "value": { "enum": ["overwrite-type"] } }] } } }
    }))
    .unwrap();
    let result1 = lint(
        &html_arena(r#"<time datetime="overwrite-type"></time><time datetime="2000-01-01"></time>"#),
        &spec,
        &config1,
    );
    assert_eq!(
        result1.violations.len(),
        1,
        "overwrite config: {:#?}",
        result1.violations
    );
    assert_eq!(result1.violations[0].col, 56);
    assert_eq!(
        result1.violations[0].message,
        "The \"datetime\" attribute expects overwrite-type"
    );
    assert_eq!(result1.violations[0].raw, "2000-01-01");
    let config2: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true }
    }))
    .unwrap();
    let result2 = lint(
        &html_arena(r#"<time datetime="overwrite-type"></time><time datetime="2000-01-01"></time>"#),
        &spec,
        &config2,
    );
    assert_eq!(result2.violations.len(), 1, "default config: {:#?}", result2.violations);
    assert_eq!(result2.violations[0].col, 17);
    assert_eq!(result2.violations[0].raw, "overwrite-type");
}

/// TS: `[no-invalid-attr-value-invalid-015]` — regexSelector
#[test]
fn no_invalid_attr_value_invalid_015() {
    const _ID: &str = "no-invalid-attr-value-invalid-015";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true },
        "nodeRules": [{
            "regexSelector": {
                "nodeName": "img",
                "attrName": "src",
                "attrValue": "/^(?<FileName>.+)\\.(?<Exp>png|jpg|webp|gif)$/",
                "combination": { "combinator": ":has(~)", "nodeName": "source" }
            },
            "rules": { "no-invalid-attr-value": { "options": {
                "allowAttrs": { "srcset": { "enum": ["{{FileName}}@2x.{{Exp}} 2x", "{{FileName}}@3x.{{Exp}} 3x"] } }
            }}}
        }]
    }))
    .unwrap();
    let html = "<picture>\n\t<source srcset=\"logo-3x.png 3x\">\n\t<source srcset=\"logo@3x.png 3x\">\n\t<source srcset=\"logo-2x.png 2x\">\n\t<source srcset=\"logo@2x.png 2x\">\n\t<img src=\"logo.png\" alt=\"logo\">\n</picture>\n";
    let result = lint(&html_arena(html), &spec, &config);
    assert_eq!(result.violations.len(), 2, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 2);
    assert_eq!(result.violations[0].col, 18);
    assert_eq!(
        result.violations[0].message,
        "The \"srcset\" attribute expects either \"logo@2x.png 2x\", \"logo@3x.png 3x\""
    );
    assert_eq!(result.violations[0].raw, "logo-3x.png 3x");
    assert_eq!(result.violations[1].severity, Severity::Error);
    assert_eq!(result.violations[1].line, 4);
    assert_eq!(result.violations[1].col, 18);
    assert_eq!(
        result.violations[1].message,
        "The \"srcset\" attribute expects either \"logo@2x.png 2x\", \"logo@3x.png 3x\""
    );
    assert_eq!(result.violations[1].raw, "logo-2x.png 2x");
}

/// TS: `[no-invalid-attr-value-invalid-016]` — regexSelector (array form)
#[test]
fn no_invalid_attr_value_invalid_016() {
    const _ID: &str = "no-invalid-attr-value-invalid-016";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-invalid-attr-value": true },
        "nodeRules": [{
            "regexSelector": {
                "nodeName": "img",
                "attrName": "src",
                "attrValue": "/^(?<FileName>.+)\\.(?<Exp>png|jpg|webp|gif)$/",
                "combination": { "combinator": ":has(~)", "nodeName": "source" }
            },
            "rules": { "no-invalid-attr-value": { "options": {
                "allowAttrs": [{ "name": "srcset", "value": { "enum": ["{{FileName}}@2x.{{Exp}} 2x", "{{FileName}}@3x.{{Exp}} 3x"] } }]
            }}}
        }]
    }))
    .unwrap();
    let html = "<picture>\n\t<source srcset=\"logo-3x.png 3x\">\n\t<source srcset=\"logo@3x.png 3x\">\n\t<source srcset=\"logo-2x.png 2x\">\n\t<source srcset=\"logo@2x.png 2x\">\n\t<img src=\"logo.png\" alt=\"logo\">\n</picture>\n";
    let result = lint(&html_arena(html), &spec, &config);
    assert_eq!(result.violations.len(), 2, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].line, 2);
    assert_eq!(result.violations[0].col, 18);
    assert_eq!(
        result.violations[0].message,
        "The \"srcset\" attribute expects either \"logo@2x.png 2x\", \"logo@3x.png 3x\""
    );
    assert_eq!(result.violations[0].raw, "logo-3x.png 3x");
    assert_eq!(result.violations[1].line, 4);
    assert_eq!(result.violations[1].col, 18);
    assert_eq!(
        result.violations[1].message,
        "The \"srcset\" attribute expects either \"logo@2x.png 2x\", \"logo@3x.png 3x\""
    );
    assert_eq!(result.violations[1].raw, "logo-2x.png 2x");
}

// no-invalid-attr-value-issue-3626-001 — SKIP: Blocked by spec sync (#3675).
// Worktree spec has integrity type="Any" (stale). Dev has type="SRIHash".
// SRIHash checker is implemented (custom.rs + keyword_type.rs).
// After merging dev, remove this comment and enable the test below.
//
// #[test]
// fn no_invalid_attr_value_issue_3626_001() {
//     const _ID: &str = "no-invalid-attr-value-issue-3626-001";
//     let spec = spec();
//     let config: LintConfig = serde_json::from_value(serde_json::json!({
//         "rules": { "no-invalid-attr-value": true }
//     })).unwrap();
//     let result = lint(&html_arena(r#"<script src="x" integrity="md5-abc123"></script>"#), &spec, &config);
//     assert!(result.violations.len() > 0, "md5 integrity should be invalid");
// }
