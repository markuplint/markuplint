//! Tests for `case-sensitive-tag-name` rule.
//!
//! Test ID mapping (TS → Rust):
//!   case-sensitive-tag-name-valid-001    → case_sensitive_tag_name_valid_001
//!   case-sensitive-tag-name-invalid-001  → case_sensitive_tag_name_invalid_001
//!   case-sensitive-tag-name-invalid-002  → case_sensitive_tag_name_invalid_002
//!   case-sensitive-tag-name-valid-002    → case_sensitive_tag_name_valid_002
//!   case-sensitive-tag-name-invalid-003  → case_sensitive_tag_name_invalid_003
//!   case-sensitive-tag-name-invalid-004  → case_sensitive_tag_name_invalid_004
//!   case-sensitive-tag-name-valid-003    → case_sensitive_tag_name_valid_003
//!   case-sensitive-tag-name-valid-004    → case_sensitive_tag_name_valid_004
//!   case-sensitive-tag-name-invalid-005  → case_sensitive_tag_name_invalid_005
//!   case-sensitive-tag-name-valid-005    → v6_case_sensitive_tag_name_004 (the Astro parser stays in TS; its `tagNameCaseSensitive` is set on the document)
//!   case-sensitive-tag-name-fix-001      → case_sensitive_tag_name_fix_001
//!   v6_case_sensitive_tag_name_001       — Rust-only: a pretender is gated by the namespace of the element written
//!   v6_case_sensitive_tag_name_002       — Rust-only: `value: upper` fixes both tags
//!   v6_case_sensitive_tag_name_003       — Rust-only: non-ASCII text before the fixed names
//!   v6_case_sensitive_tag_name_005       — Rust-only: only an element the parser takes for an HTML element has a case to enforce

use crate::lint::{LintConfig, lint};
use crate::violation::Severity;
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

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

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

/// TS: `[case-sensitive-tag-name-valid-001]` — lower case
#[test]
fn case_sensitive_tag_name_valid_001() {
    const _ID: &str = "case-sensitive-tag-name-valid-001";
    let arena = html_arena("<div data-lowercase></div>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "case-sensitive-tag-name": { "severity": "warning" } }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[case-sensitive-tag-name-invalid-001]` — upper case tag
#[test]
fn case_sensitive_tag_name_invalid_001() {
    const _ID: &str = "case-sensitive-tag-name-invalid-001";
    let arena = html_arena("<DIV data-lowercase></DIV>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "case-sensitive-tag-name": { "severity": "warning" } }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations[0].severity, Severity::Warning);
    assert_eq!(
        result.violations[0].message,
        "Tag names of HTML elements should be lowercase"
    );
    assert_eq!(result.violations[0].raw, "DIV");
}

/// TS: `[case-sensitive-tag-name-invalid-002]` — lower tag with value=upper
#[test]
fn case_sensitive_tag_name_invalid_002() {
    const _ID: &str = "case-sensitive-tag-name-invalid-002";
    let arena = html_arena(r#"<div data-UPPERCASE="value"></div>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "case-sensitive-tag-name": { "severity": "error", "value": "upper" }
        }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(
        result.violations[0].message,
        "Tag names of HTML elements must be uppercase"
    );
}

/// TS: `[case-sensitive-tag-name-valid-002]` — upper tag with value=upper
#[test]
fn case_sensitive_tag_name_valid_002() {
    const _ID: &str = "case-sensitive-tag-name-valid-002";
    let arena = html_arena(r#"<DIV data-uppercase="value"></DIV>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "case-sensitive-tag-name": { "severity": "error", "value": "upper" }
        }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[case-sensitive-tag-name-invalid-003]` — upper open, lower close, value=upper
#[test]
fn case_sensitive_tag_name_invalid_003() {
    const _ID: &str = "case-sensitive-tag-name-invalid-003";
    let arena = html_arena(r#"<DIV DATA-UPPERCASE="value"></div>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "case-sensitive-tag-name": { "severity": "error", "value": "upper" }
        }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(
        result.violations[0].message,
        "Tag names of HTML elements must be uppercase"
    );
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 29);
    assert_eq!(result.violations[0].raw, "</div>");
}

/// TS: `[case-sensitive-tag-name-invalid-004]` — lower open, upper close, value=upper
#[test]
fn case_sensitive_tag_name_invalid_004() {
    const _ID: &str = "case-sensitive-tag-name-invalid-004";
    let arena = html_arena(r#"<div DATA-UPPERCASE="value"></DIV>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "case-sensitive-tag-name": { "severity": "error", "value": "upper" }
        }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(
        result.violations[0].message,
        "Tag names of HTML elements must be uppercase"
    );
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 2);
    assert_eq!(result.violations[0].raw, "div");
}

/// TS: `[case-sensitive-tag-name-valid-003]` — svg (non-XHTML namespace skipped)
#[test]
fn case_sensitive_tag_name_valid_003() {
    const _ID: &str = "case-sensitive-tag-name-valid-003";
    let arena = html_arena(r#"<svg viewBox="0 0 100 100"><textPath></textPath></svg>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "case-sensitive-tag-name": { "severity": "warning" } }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[case-sensitive-tag-name-valid-004]` — custom elements
#[test]
fn case_sensitive_tag_name_valid_004() {
    const _ID: &str = "case-sensitive-tag-name-valid-004";
    let arena = html_arena("<xxx-hoge>lorem</xxx-hoge>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "case-sensitive-tag-name": { "severity": "warning" } }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[case-sensitive-tag-name-invalid-005]` — non-custom element (uppercase start)
#[test]
fn case_sensitive_tag_name_invalid_005() {
    const _ID: &str = "case-sensitive-tag-name-invalid-005";
    let arena = html_arena("<XXX-hoge>lorem</XXX-hoge>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "case-sensitive-tag-name": { "severity": "warning" } }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    // TS: 2 violations (open + close tag)
    // raw tag name from source preserves "XXX-hoge" (not a valid custom element)
    assert_eq!(result.violations.len(), 2);
    assert_eq!(result.violations[0].severity, Severity::Warning);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 2);
    assert_eq!(
        result.violations[0].message,
        "Tag names of HTML elements should be lowercase"
    );
    assert_eq!(result.violations[0].raw, "XXX-hoge");
    assert_eq!(result.violations[1].severity, Severity::Warning);
    assert_eq!(result.violations[1].line, 1);
    assert_eq!(result.violations[1].col, 16);
    assert_eq!(result.violations[1].raw, "</XXX-hoge>");
}

/// Rust-only: TS skips a foreign element by the namespace of the element as written, not
/// the one it pretends to be: a pretender in the SVG namespace is still checked, an element
/// written inside `<math>` is not. Expected values from the TS rule.
#[test]
fn v6_case_sensitive_tag_name_001() {
    let run = |html: &str, pretenders: serde_json::Value| {
        crate::test_util::lint_brief(
            "case-sensitive-tag-name",
            html,
            // The Rust rule has no default severity of `warning` yet, so it is given here.
            serde_json::json!({ "rules": { "case-sensitive-tag-name": { "severity": "warning" } }, "pretenders": pretenders }),
        )
    };
    let message = "Tag names of HTML elements should be lowercase";
    assert_eq!(
        run(
            "<X-Rect></X-Rect>",
            serde_json::json!([{ "selector": "x-rect", "as": { "element": "rect", "namespace": "svg" } }])
        ),
        [
            crate::test_util::brief(crate::violation::Severity::Warning, 1, 2, message, "X-Rect"),
            crate::test_util::brief(crate::violation::Severity::Warning, 1, 9, message, "</X-Rect>"),
        ]
    );
    assert_eq!(
        run(
            "<math><X-Btn></X-Btn></math>",
            serde_json::json!([{ "selector": "x-btn", "as": "button" }])
        ),
        []
    );
}

/// TS: `[case-sensitive-tag-name-fix-001]` — upper case
#[test]
fn case_sensitive_tag_name_fix_001() {
    const _ID: &str = "case-sensitive-tag-name-fix-001";
    let config = serde_json::json!({ "rules": { "case-sensitive-tag-name": true } });
    assert_eq!(
        crate::test_util::fixed_code("<DIV data-lowercase></DIV>", &config),
        "<div data-lowercase></div>"
    );
}

#[test]
fn v6_case_sensitive_tag_name_002() {
    let config = serde_json::json!({ "rules": { "case-sensitive-tag-name": { "value": "upper" } } });
    assert_eq!(
        crate::test_util::fixed_code("<div><span>a</span></div>", &config),
        "<DIV><SPAN>a</SPAN></DIV>"
    );
}

/// A parser whose tag names are case-sensitive (JSX, Svelte, Astro) has no case to enforce,
/// as `<Div>` is not the `div` element there.
#[test]
fn v6_case_sensitive_tag_name_004() {
    use markuplint_core::mlast::DocumentSettings;
    let run_with = |tag_name_case_sensitive| {
        crate::test_util::lint_brief_with_settings(
            "case-sensitive-tag-name",
            "<DIV></DIV>",
            serde_json::json!({ "rules": { "case-sensitive-tag-name": true } }),
            DocumentSettings {
                tag_name_case_sensitive,
                ..DocumentSettings::default()
            },
        )
    };
    assert_eq!(run_with(true), []);
    assert_eq!(run_with(false).len(), 2);
}

/// Only an element the parser takes for an HTML element has a case to enforce: `<MyComponent>`
/// (Vue, Astro, Svelte) is an authored component, whatever the parser says about case.
/// TS: `[case-sensitive-tag-name-valid-005]` (the Astro parser) and the Vue parser's.
#[test]
fn v6_case_sensitive_tag_name_005() {
    let run_mlast = |element_type: &str| {
        crate::test_util::lint_mlast_brief(
            "case-sensitive-tag-name",
            &crate::test_util::mlast_element_of_type("MyComponent", element_type, &[], &serde_json::json!({})),
            serde_json::json!({ "rules": { "case-sensitive-tag-name": true } }),
        )
    };
    assert_eq!(run_mlast("authored"), []);
    assert_eq!(run_mlast("web-component"), []);
    assert_eq!(run_mlast("html").len(), 1);
}

#[test]
fn v6_case_sensitive_tag_name_003() {
    let config = serde_json::json!({ "rules": { "case-sensitive-tag-name": true } });
    assert_eq!(
        crate::test_util::fixed_code("<p>日本語😀</p><DIV></DIV>", &config),
        "<p>日本語😀</p><div></div>"
    );
}
