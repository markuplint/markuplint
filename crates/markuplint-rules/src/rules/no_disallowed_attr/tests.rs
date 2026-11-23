//! Tests for `no-disallowed-attr` rule.
//!
//! Split out of the tests of the pre-split `invalid-attr` rule; each test keeps the
//! TypeScript test it mirrors under that test's new id (old id in parentheses).
//!
//!   no-disallowed-attr-001  → no_disallowed_attr_001  (was invalid-attr-invalid-019)
//!   no-disallowed-attr-002  → no_disallowed_attr_002  (was invalid-attr-valid-009)
//!   no-disallowed-attr-004  → no_disallowed_attr_004  (was invalid-attr-issue-3631-001)
//!   no-disallowed-attr-005  → no_disallowed_attr_005  (was invalid-attr-issue-3631-002)
//!   no-disallowed-attr-006  → no_disallowed_attr_006  (was invalid-attr-issue-3631-003)
//!   no-disallowed-attr-007  → no_disallowed_attr_007  (was invalid-attr-issue-3631-004)
//!   no-disallowed-attr-008  → no_disallowed_attr_008  (was invalid-attr-issue-3631-005)
//!   no-disallowed-attr-009  → no_disallowed_attr_009  (was invalid-attr-issue-3631-006)
//!   no-disallowed-attr-010  → no_disallowed_attr_010  (was invalid-attr-issue-3631-007)
//!   no-disallowed-attr-011  → no_disallowed_attr_011  (was invalid-attr-issue-3631-008)
//!   no-disallowed-attr-012  → no_disallowed_attr_012  (was invalid-attr-issue-3631-009)
//!   no-disallowed-attr-013  → no_disallowed_attr_013  (was invalid-attr-issue-3631-010)
//!   no-disallowed-attr-003  → no_disallowed_attr_003  (was invalid-attr-issue-2455)
//!   no-disallowed-attr-059  → no_disallowed_attr_059  (was invalid-attr-invalid-001)
//!   no-disallowed-attr-060  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-004)
//!   no-unknown-attr-032, no-disallowed-attr-061  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-011)
//!   no-unknown-attr-033, no-disallowed-attr-062  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-012)
//!   no-disallowed-attr-040  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-018)
//!   no-disallowed-attr-041  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-019)
//!   no-disallowed-attr-042  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-020)

use super::*;
use crate::lint::{LintConfig, lint};
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

/// TS: `[no-disallowed-attr-001]` — noUse flag (dialog tabindex)
#[test]
fn no_disallowed_attr_001() {
    const _ID: &str = "no-disallowed-attr-001";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-disallowed-attr": true }
    }))
    .unwrap();
    let result = lint(&html_arena(r#"<dialog tabindex="-1"></dialog>"#), &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 9);
    assert_eq!(result.violations[0].message, "The \"tabindex\" attribute is disallowed");
    assert_eq!(result.violations[0].raw, "tabindex=\"-1\"");
}

/// TS: `[no-disallowed-attr-002]` — noUse flag with allowAttrs override
#[test]
fn no_disallowed_attr_002() {
    const _ID: &str = "no-disallowed-attr-002";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-disallowed-attr": { "options": { "allowAttrs": [{ "name": "tabindex", "value": { "enum": ["-1", "0"] } }] } } }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<dialog tabindex="0"></dialog>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-disallowed-attr-004]` — importmap must not have src
#[test]
fn no_disallowed_attr_004() {
    const _ID: &str = "no-disallowed-attr-004";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-disallowed-attr": true }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<script type="importmap" src="map.json"></script>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 26);
    assert_eq!(result.violations[0].message, "The \"src\" attribute is disallowed");
}

/// TS: `[no-disallowed-attr-005]` — speculationrules must not have src
#[test]
fn no_disallowed_attr_005() {
    const _ID: &str = "no-disallowed-attr-005";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-disallowed-attr": true }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<script type="speculationrules" src="rules.json"></script>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].col, 33);
    assert_eq!(result.violations[0].message, "The \"src\" attribute is disallowed");
}

/// TS: `[no-disallowed-attr-006]` — importmap must not have async
#[test]
fn no_disallowed_attr_006() {
    const _ID: &str = "no-disallowed-attr-006";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-disallowed-attr": true }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<script type="importmap" async></script>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].col, 26);
    assert_eq!(result.violations[0].message, "The \"async\" attribute is disallowed");
}

/// TS: `[no-disallowed-attr-007]` — importmap must not have defer
#[test]
fn no_disallowed_attr_007() {
    const _ID: &str = "no-disallowed-attr-007";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-disallowed-attr": true }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<script type="importmap" defer></script>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].col, 26);
    assert_eq!(result.violations[0].message, "The \"defer\" attribute is disallowed");
}

/// TS: `[no-disallowed-attr-008]` — importmap must not have nomodule
#[test]
fn no_disallowed_attr_008() {
    const _ID: &str = "no-disallowed-attr-008";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-disallowed-attr": true }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<script type="importmap" nomodule></script>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].col, 26);
    assert_eq!(result.violations[0].message, "The \"nomodule\" attribute is disallowed");
}

/// TS: `[no-disallowed-attr-009]` — module with defer is disallowed
///
/// HTML LS §4.12.1: "Module scripts may specify the async attribute, but must not
/// specify the defer attribute." Applies whether or not `src` is present. Matches
/// `[no-disallowed-attr-009]` on the TS side.
#[test]
fn no_disallowed_attr_009() {
    const _ID: &str = "no-disallowed-attr-009";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-disallowed-attr": true }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<script type="module" src="m.js" defer></script>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].col, 34);
    assert_eq!(result.violations[0].message, "The \"defer\" attribute is disallowed");
    assert_eq!(result.violations[0].raw, "defer");
}

/// TS: `[no-disallowed-attr-010]` — charset requires src
#[test]
fn no_disallowed_attr_010() {
    const _ID: &str = "no-disallowed-attr-010";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-disallowed-attr": true }
    }))
    .unwrap();
    let result = lint(&html_arena(r#"<script charset="utf-8">x</script>"#), &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].col, 9);
    assert_eq!(result.violations[0].message, "The \"charset\" attribute is disallowed");
}

/// TS: `[no-disallowed-attr-011]` — valid: module with async
#[test]
fn no_disallowed_attr_011() {
    const _ID: &str = "no-disallowed-attr-011";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-disallowed-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<script type="module" async>x</script>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-disallowed-attr-012]` — valid: classic with src and defer
#[test]
fn no_disallowed_attr_012() {
    const _ID: &str = "no-disallowed-attr-012";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-disallowed-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<script src="app.js" defer></script>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-disallowed-attr-013]` — valid: classic with src and async
#[test]
fn no_disallowed_attr_013() {
    const _ID: &str = "no-disallowed-attr-013";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-disallowed-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<script src="app.js" async></script>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-disallowed-attr-003]` — source element conditional attrs
#[test]
fn no_disallowed_attr_003() {
    const _ID: &str = "no-disallowed-attr-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-disallowed-attr": true }
    }))
    .unwrap();
    let html = r#"<picture>
  <source src="path/to" media="(query: value)">
  <source srcset="path/to" media="(query: value)">
  <source media="(query: value)">
  <img src="fallback" alt="text">
</picture>
<video>
  <source src="path/to">
  <source srcset="path/to">
  <source>
</video>
<audio>
  <source src="path/to">
  <source srcset="path/to">
  <source>
</audio>"#;
    let result = lint(&html_arena(html), &spec, &config);
    assert_eq!(result.violations.len(), 3, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 2);
    assert_eq!(result.violations[0].col, 11);
    assert_eq!(result.violations[0].message, "The \"src\" attribute is disallowed");
    assert_eq!(result.violations[0].raw, "src");
    assert_eq!(result.violations[1].severity, Severity::Error);
    assert_eq!(result.violations[1].line, 9);
    assert_eq!(result.violations[1].col, 11);
    assert_eq!(result.violations[1].message, "The \"srcset\" attribute is disallowed");
    assert_eq!(result.violations[1].raw, "srcset");
    assert_eq!(result.violations[2].severity, Severity::Error);
    assert_eq!(result.violations[2].line, 14);
    assert_eq!(result.violations[2].col, 11);
    assert_eq!(result.violations[2].message, "The \"srcset\" attribute is disallowed");
    assert_eq!(result.violations[2].raw, "srcset");
}

/// TS: `[no-disallowed-attr-059]` — referrerpolicy without href is disallowed
///
/// The `invalid-attr` rule, which this rule and `no-unknown-attr` were split out of, reported two
/// problems for this HTML; this is the `referrerpolicy` half, `[no-unknown-attr-031]` the other.
/// `invalid-attr` reported the value error of `referrerpolicy="invalid-value"` here;
/// `no-disallowed-attr` reports the unmet condition independently of the value.
#[test]
fn no_disallowed_attr_059() {
    const _ID: &str = "no-disallowed-attr-059";
    let arena = html_arena(r#"<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-disallowed-attr": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 17);
    assert_eq!(
        result.violations[0].message,
        "The \"referrerpolicy\" attribute is disallowed"
    );
    assert_eq!(result.violations[0].raw, "referrerpolicy");
}
