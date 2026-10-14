//! Tests for `no-unknown-attr` rule.
//!
//! Split out of the tests of the pre-split `invalid-attr` rule; each test keeps the
//! TypeScript test it mirrors under that test's new id (old id in parentheses).
//!
//!   no-unknown-attr-valid-001  → no_unknown_attr_valid_001  (was invalid-attr-valid-002)
//!   no-unknown-attr-valid-002  → no_unknown_attr_valid_002  (was invalid-attr-valid-005)
//!   no-unknown-attr-invalid-001  → no_unknown_attr_invalid_001  (was invalid-attr-invalid-005)
//!   no-unknown-attr-invalid-002  → no_unknown_attr_invalid_002  (was invalid-attr-invalid-015)
//!   no-unknown-attr-valid-003  → no_unknown_attr_valid_003  (was invalid-attr-valid-006)
//!   no-unknown-attr-valid-004  → no_unknown_attr_valid_004  (was invalid-attr-valid-008)
//!   no-unknown-attr-valid-005  → no_unknown_attr_valid_005  (was invalid-attr-valid-011)
//!   no-unknown-attr-issue-553  → no_unknown_attr_issue_553  (was invalid-attr-issue-553)
//!   no-unknown-attr-issue-564  → no_unknown_attr_issue_564  (was invalid-attr-issue-564)
//!   no-unknown-attr-issue-1487-001  → no_unknown_attr_issue_1487_001  (was invalid-attr-issue-1487-001)
//!   no-unknown-attr-issue-1487-002  → no_unknown_attr_issue_1487_002  (was invalid-attr-issue-1487-002)
//!   no-unknown-attr-issue-1487-003  → no_unknown_attr_issue_1487_003  (was invalid-attr-issue-1487-003)
//!   no-unknown-attr-invalid-003  → no_unknown_attr_invalid_003  (was invalid-attr-invalid-020)
//!   no-unknown-attr-invalid-004  — JSX parser; ported as v6_no_unknown_attr_002 (was invalid-attr-invalid-023)
//!   no-unknown-attr-valid-006  → no_unknown_attr_valid_006  (was invalid-attr-valid-013)
//!   v6_no_unknown_attr_002  — Rust-only: no-unknown-attr-invalid-004 with a custom element
//!   no-unknown-attr-issue-525-001  — SKIP: Svelte parser + spec (was invalid-attr-issue-525-001)
//!   no-unknown-attr-issue-525-002  — SKIP: Svelte parser + spec (was invalid-attr-issue-525-002)
//!   no-unknown-attr-issue-525-003  — SKIP: Svelte parser + spec (listed by the `issue-525-*` wildcard; old test is `describe` contentEditable "inherit") (was invalid-attr-issue-525-003)
//!   no-unknown-attr-issue-678  — SKIP: Vue parser + spec (was invalid-attr-issue-678)
//!   no-unknown-attr-issue-783  — SKIP: Vue parser + spec (was invalid-attr-issue-783)
//!   no-unknown-attr-issue-800  — SKIP: Pug parser (was invalid-attr-issue-800)
//!   no-unknown-attr-parser-001  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-001)
//!   no-unknown-attr-parser-002  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-002)
//!   no-unknown-attr-parser-003  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-005)
//!   no-unknown-attr-parser-004  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-006)
//!   no-unknown-attr-parser-005  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-007)
//!   no-unknown-attr-parser-006  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-008)
//!   no-unknown-attr-parser-007  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-009)
//!   no-unknown-attr-parser-008  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-010)
//!   no-unknown-attr-parser-010, no-disallowed-attr-parser-005  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-011)
//!   no-unknown-attr-parser-011, no-disallowed-attr-parser-006  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-012)
//!   no-unknown-attr-parser-009  — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX) (was invalid-attr-parser-013)
//!   (the framework parsers stay in TS: `v6_no_unknown_attr_003` checks the attribute names they resolve, and
//!    `ml-engine.rust-framework.spec.ts` compares whole files of each parser)

use super::*;
use crate::attr_check::find_closest_match;
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
fn valid_attr_no_violation() {
    let arena = make_element_with_attrs("div", &[("class", "foo")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty(), "class is a valid attr for div");
}

#[test]
fn data_attr_allowed() {
    let arena = make_element_with_attrs("div", &[("data-custom", "value")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty(), "data-* attributes should be allowed");
}

#[test]
fn aria_attr_skipped() {
    let arena = make_element_with_attrs("div", &[("aria-label", "test")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(
        violations.is_empty(),
        "aria-* attributes should be skipped (handled by the ARIA rules)"
    );
}

#[test]
fn adapt_attr_bypassed() {
    let arena = make_element_with_attrs("div", &[("adapt-purpose", "simplification")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty(), "adapt-* attributes should be bypassed");
}

#[test]
fn unknown_attr_violation() {
    let arena = make_element_with_attrs("div", &[("foo", "bar")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert_eq!(violations.len(), 1);
    assert!(violations[0].message.contains("foo"));
    assert!(violations[0].message.contains("disallowed"));
}

#[test]
fn ignore_prefix_config() {
    let arena = make_element_with_attrs("div", &[("v-bind", "foo")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let config = RuleConfig {
        options: serde_json::json!({
            "ignoreAttrNamePrefix": "v-",
        }),
        ..RuleConfig::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert!(violations.is_empty(), "v- prefixed attrs should be ignored");
}

#[test]
fn allow_attrs_config() {
    let arena = make_element_with_attrs("div", &[("custom-attr", "val")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let config = RuleConfig {
        options: serde_json::json!({
            "allowAttrs": ["custom-attr"],
        }),
        ..RuleConfig::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert!(violations.is_empty(), "allowed attrs should not produce violations");
}

#[test]
fn typo_suggestion() {
    let arena = make_element_with_attrs("div", &[("classs", "foo")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert_eq!(violations.len(), 1);
    assert!(
        violations[0].message.contains("Did you mean"),
        "should suggest a correction for typo"
    );
}

#[test]
fn event_handler_skipped() {
    let arena = make_element_with_attrs("div", &[("onclick", "foo()")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty(), "event handler attrs should be skipped");
}

#[test]
fn valid_element_specific_attr() {
    let arena = make_element_with_attrs("input", &[("type", "text")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty(), "type is valid on input");
}

#[test]
fn custom_element_allows_any_attrs() {
    let arena = make_element_with_attrs("custom-element", &[("any-attr", "value")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(
        !violations.is_empty(),
        "Custom elements currently do not get special treatment in Rust impl; \
         unknown attrs are flagged. Got: {violations:?}"
    );
}

#[test]
fn ignore_attr_name_prefix_array() {
    let arena = make_element_with_attrs("div", &[("v-bind:title", "title")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let config = RuleConfig {
        options: serde_json::json!({
            "ignoreAttrNamePrefix": ["v-", ":"],
        }),
        ..RuleConfig::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert!(
        violations.is_empty(),
        "v-bind:title should be ignored with ignoreAttrNamePrefix containing 'v-', got: {violations:?}"
    );
}

#[test]
fn allow_to_add_properties_for_pretender_option_parsed() {
    let arena = make_element_with_attrs("div", &[("unknown-attr", "val")]);
    let s = spec();
    let rule = NoUnknownAttr;

    // Default (true)
    let violations_default = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert_eq!(violations_default.len(), 1);

    // Explicit false
    let config_false = RuleConfig {
        options: serde_json::json!({ "allowToAddPropertiesForPretender": false }),
        ..Default::default()
    };
    let violations_false = rule.verify(&arena, &s, &RuleConfigSet::global_only(config_false));
    assert_eq!(violations_false.len(), 1);

    // Verify the option value is actually read (would panic on wrong type)
    let config_explicit_true = RuleConfig {
        options: serde_json::json!({ "allowToAddPropertiesForPretender": true }),
        ..Default::default()
    };
    let violations_true = rule.verify(&arena, &s, &RuleConfigSet::global_only(config_explicit_true));
    assert_eq!(violations_true.len(), 1);
}

#[test]
fn find_closest_match_works() {
    let candidates = &["class", "id", "style", "title"];
    assert_eq!(find_closest_match("classs", candidates), Some("class"));
    assert_eq!(find_closest_match("styl", candidates), Some("style"));
    assert_eq!(find_closest_match("completely_wrong", candidates), None);
}

#[test]
fn uppercase_data_attr_is_bypassed() {
    // Uppercase "DATA-FOO" should be bypassed as data-* (case-insensitive)
    let arena = make_element_with_attrs("div", &[("DATA-FOO", "bar")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(
        violations.is_empty(),
        "Uppercase DATA-FOO should be bypassed as data-*, got: {violations:?}"
    );
}

#[test]
fn uppercase_aria_label_is_bypassed() {
    // Uppercase "ARIA-LABEL" should be bypassed as aria-* (case-insensitive)
    let arena = make_element_with_attrs("div", &[("ARIA-LABEL", "test")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(
        violations.is_empty(),
        "Uppercase ARIA-LABEL should be bypassed as aria-*, got: {violations:?}"
    );
}

#[test]
fn uppercase_role_is_bypassed() {
    // Uppercase "ROLE" should be bypassed (case-insensitive)
    let arena = make_element_with_attrs("div", &[("ROLE", "button")]);
    let s = spec();
    let rule = NoUnknownAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(
        violations.is_empty(),
        "Uppercase ROLE should be bypassed, got: {violations:?}"
    );
}

/// TS: `[no-unknown-attr-valid-001]` — global attribute (title on a and abbr)
#[test]
fn no_unknown_attr_valid_001() {
    const _ID: &str = "no-unknown-attr-valid-001";
    let arena = html_arena(r#"<a title="the a element"><abbr title="the abbr element">text</abbr></a>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[no-unknown-attr-valid-002]` — custom element allows any attrs
#[test]
fn no_unknown_attr_valid_002() {
    const _ID: &str = "no-unknown-attr-valid-002";
    let arena = html_arena("<custom-element any-attr></custom-element>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[no-unknown-attr-invalid-001]` — unknown attr, allow via options
#[test]
fn no_unknown_attr_invalid_001() {
    const _ID: &str = "no-unknown-attr-invalid-001";
    let spec = spec();
    // Without allowAttrs: violation
    let config1: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": true }
    }))
    .unwrap();
    let result1 = lint(&html_arena("<div x-attr></div>"), &spec, &config1);
    assert_eq!(result1.violations.len(), 1);
    assert_eq!(result1.violations[0].severity, Severity::Error);
    assert_eq!(result1.violations[0].line, 1);
    assert_eq!(result1.violations[0].col, 6);
    assert_eq!(result1.violations[0].message, "The \"x-attr\" attribute is disallowed");
    assert_eq!(result1.violations[0].raw, "x-attr");
    // With allowAttrs: no violation
    let config2: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": { "options": { "allowAttrs": ["x-attr"] } } }
    }))
    .unwrap();
    let result2 = lint(&html_arena("<div x-attr></div>"), &spec, &config2);
    assert_eq!(result2.violations.len(), 0);
}

/// TS: `[no-unknown-attr-invalid-002]` — prefix attribute (v-bind:, :, @)
/// Note: TS reports "Did you mean" for `:class`→`class` and `@click`→`onclick`
/// via parser candidate, which is framework-parser functionality not available
/// in the Rust HTML parser. Rust only checks disallowed.
#[test]
fn no_unknown_attr_invalid_002() {
    const _ID: &str = "no-unknown-attr-invalid-002";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": true }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<div v-bind:title="title" :class="classes" @click="click"></div>"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 3, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].col, 6);
    assert_eq!(
        result.violations[0].message,
        "The \"v-bind:title\" attribute is disallowed"
    );
    assert_eq!(result.violations[0].raw, "v-bind:title");
    assert_eq!(result.violations[1].col, 27);
    // Levenshtein: `:class` → `class` (distance 1) — suggestion via typo detection
    assert_eq!(
        result.violations[1].message,
        "The \":class\" attribute is disallowed. Did you mean \"class\"?"
    );
    assert_eq!(result.violations[1].raw, ":class");
    assert_eq!(result.violations[2].col, 44);
    // TS suggests "onclick" via parser candidate, but Levenshtein distance too large
    assert_eq!(result.violations[2].message, "The \"@click\" attribute is disallowed");
    assert_eq!(result.violations[2].raw, "@click");
}

/// TS: `[no-unknown-attr-valid-003]` — ignore prefix attribute
#[test]
fn no_unknown_attr_valid_003() {
    const _ID: &str = "no-unknown-attr-valid-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": { "options": { "ignoreAttrNamePrefix": ["v-bind:", ":", "@"] } } }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<div v-bind:title="title" :class="classes" @click="click"></div>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-unknown-attr-valid-004]` — Foreign element (SVG)
#[test]
fn no_unknown_attr_valid_004() {
    const _ID: &str = "no-unknown-attr-valid-004";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<div><svg width="10px" height="10px" viewBox="0 0 10 10"></svg></div>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-unknown-attr-valid-005]` — WAI-Adapt attributes
#[test]
fn no_unknown_attr_valid_005() {
    const _ID: &str = "no-unknown-attr-valid-005";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<p adapt-simplification="critical"></p>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    assert_eq!(
        lint(
            &html_arena(r#"<span adapt-easylang="90% of the time this happens"></span>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
    assert_eq!(lint(&html_arena(
        "<label for=\"address\" adapt-symbol=\"14885\">Your Principal Residence</label>\n<input type=\"text\" id=\"address\" adapt-purpose=\"street-address\">"
    ), &spec, &config).violations.len(), 0);
}

/// TS: `[no-unknown-attr-issue-553]` — link preload
#[test]
fn no_unknown_attr_issue_553() {
    const _ID: &str = "no-unknown-attr-issue-553";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<link rel="preload" imagesrcset="path/to" as="image" imagesizes="100vw" />"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[no-unknown-attr-issue-564]` — class with colon (Tailwind)
#[test]
fn no_unknown_attr_issue_564() {
    const _ID: &str = "no-unknown-attr-issue-564";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<div class="md:flex"></div>"#), &spec, &config)
            .violations
            .len(),
        0
    );
    assert_eq!(
        lint(&html_arena(r#"<svg><rect class="md:flex"/></svg>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[no-unknown-attr-issue-1487-001]` — typo suggestion (nama → name)
#[test]
fn no_unknown_attr_issue_1487_001() {
    const _ID: &str = "no-unknown-attr-issue-1487-001";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": true }
    }))
    .unwrap();
    let result = lint(&html_arena(r#"<input nama="test">"#), &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 8);
    assert_eq!(
        result.violations[0].message,
        "The \"nama\" attribute is disallowed. Did you mean \"name\"?"
    );
    assert_eq!(result.violations[0].raw, "nama");
}

/// TS: `[no-unknown-attr-issue-1487-002]` — typo suggestion (clss → class)
#[test]
fn no_unknown_attr_issue_1487_002() {
    const _ID: &str = "no-unknown-attr-issue-1487-002";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": true }
    }))
    .unwrap();
    let result = lint(&html_arena(r#"<div clss="test"></div>"#), &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 6);
    assert_eq!(
        result.violations[0].message,
        "The \"clss\" attribute is disallowed. Did you mean \"class\"?"
    );
    assert_eq!(result.violations[0].raw, "clss");
}

/// TS: `[no-unknown-attr-issue-1487-003]` — no suggestion for unrelated attr
#[test]
fn no_unknown_attr_issue_1487_003() {
    const _ID: &str = "no-unknown-attr-issue-1487-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": true }
    }))
    .unwrap();
    let result = lint(&html_arena(r#"<div xyz="test"></div>"#), &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 6);
    assert_eq!(result.violations[0].message, "The \"xyz\" attribute is disallowed");
    assert_eq!(result.violations[0].raw, "xyz");
}

/// TS: `[no-unknown-attr-invalid-003]` — SVG unknown attr (cz on circle)
#[test]
fn no_unknown_attr_invalid_003() {
    const _ID: &str = "no-unknown-attr-invalid-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": true }
    }))
    .unwrap();
    let html = "<svg viewBox=\"0 0 300 100\" xmlns=\"http://www.w3.org/2000/svg\" stroke=\"red\" fill=\"grey\">\n\t\t\t\t\t<circle cx=\"50\" cy=\"50\" cz=\"50\" r=\"40\" />\n\t\t\t\t\t<circle cx=\"150\" cy=\"50\" r=\"4\" />\n\t\t\t\t\t<svg viewBox=\"0 0 10 10\" x=\"200\" width=\"100\">\n\t\t\t\t\t\t<circle cx=\"5\" cy=\"5\" r=\"4\" />\n\t\t\t\t\t</svg>\n\t\t\t\t</svg>\n\t\t\t\t";
    let result = lint(&html_arena(html), &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 2);
    assert_eq!(result.violations[0].col, 30);
    assert_eq!(
        result.violations[0].message,
        "The \"cz\" attribute is disallowed. Did you mean \"cx\"?"
    );
    assert_eq!(result.violations[0].raw, "cz");
}

/// TS: `[no-unknown-attr-invalid-005]` — unknown attr next to a referrerpolicy whose condition is unmet
///
/// The first half of the pre-split `[invalid-attr-invalid-001]`; the `referrerpolicy` half is
/// `[no-disallowed-attr-invalid-004]`.
#[test]
fn no_unknown_attr_invalid_005() {
    const _ID: &str = "no-unknown-attr-invalid-005";
    let arena = html_arena(r#"<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 4);
    assert_eq!(
        result.violations[0].message,
        "The \"invalid-attr\" attribute is disallowed"
    );
    assert_eq!(result.violations[0].raw, "invalid-attr");
}

/// The spec name of an attribute is the key of the element's `attributes`; the entry has no
/// `name` of its own, so the case-sensitive name check has to read the key.
#[test]
fn v6_no_unknown_attr_001() {
    let arena = html_arena(r#"<svg viewbox="0 0 1 1"></svg>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unknown-attr": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 6);
    assert_eq!(
        result.violations[0].message,
        "The \"viewbox\" attribute is disallowed. Did you mean \"viewBox\"?"
    );
    assert_eq!(result.violations[0].raw, "viewbox");
}

fn run_pretended(html: &str, rule: serde_json::Value, pretenders: serde_json::Value) -> Vec<crate::test_util::Brief> {
    crate::test_util::lint_brief(
        "no-unknown-attr",
        html,
        serde_json::json!({ "rules": { "no-unknown-attr": rule }, "pretenders": pretenders }),
    )
}

/// TS: `[no-unknown-attr-valid-006]` — The `as` attribute (was invalid-attr-valid-013)
#[test]
fn no_unknown_attr_valid_006() {
    const _ID: &str = "no-unknown-attr-valid-006";
    assert_eq!(
        run_pretended(r#"<a as="span"></a>"#, serde_json::json!(true), serde_json::json!([])),
        [crate::test_util::brief(
            crate::violation::Severity::Error,
            1,
            4,
            "The \"as\" attribute is disallowed. Did you mean \"is\"?",
            "as"
        )]
    );
    assert_eq!(
        run_pretended(
            r#"<x-link as="a" foo></x-link>"#,
            serde_json::json!(true),
            serde_json::json!([])
        ),
        []
    );
}

/// TS `[no-unknown-attr-invalid-004]` (JSX): a pretended component may take attributes the
/// element it pretends to be does not define, unless `allowToAddPropertiesForPretender` is
/// `false`.
#[test]
fn v6_no_unknown_attr_002() {
    let html = "<x-image objectFit alt></x-image>";
    let img = serde_json::json!([{ "selector": "x-image", "as": { "element": "img", "inheritAttrs": true } }]);
    assert_eq!(run_pretended(html, serde_json::json!(true), serde_json::json!([])), []);
    assert_eq!(run_pretended(html, serde_json::json!(true), img.clone()), []);
    assert_eq!(
        run_pretended(
            html,
            serde_json::json!({ "options": { "allowToAddPropertiesForPretender": false } }),
            img
        ),
        [crate::test_util::brief(
            crate::violation::Severity::Error,
            1,
            10,
            "The \"objectFit\" attribute is disallowed",
            "objectFit"
        )]
    );
}

/// Rust-only: the name checked is the one the parser resolved (`potentialName`), as TS
/// `attr.name` is: Vue's `:href` is `href` and is known on `a`, `:foo` is `foo` and is not,
/// and a directive (`v-if`) is not checked at all. The report points at the name as written.
/// TS: `[no-unknown-attr-parser-*]` run the Vue parser.
#[test]
fn v6_no_unknown_attr_003() {
    let run = |attrs: &[(&str, &str, serde_json::Value)]| {
        crate::test_util::lint_mlast_brief(
            "no-unknown-attr",
            &crate::test_util::mlast_element("a", attrs, &serde_json::json!({ "endTag": "xml" })),
            serde_json::json!({ "rules": { "no-unknown-attr": true } }),
        )
    };
    let bound = |name: &str| serde_json::json!({ "potentialName": name, "isDynamicValue": true });
    assert_eq!(run(&[(":href", "url", bound("href"))]), []);
    assert_eq!(
        run(&[(":foo", "x", bound("foo"))]),
        [crate::test_util::brief(
            crate::violation::Severity::Error,
            1,
            4,
            "The \"foo\" attribute is disallowed",
            ":foo"
        )]
    );
    let directive = serde_json::json!({ "potentialName": "v-if", "isDirective": true, "isDynamicValue": true });
    assert_eq!(run(&[("v-if", "show", directive)]), []);
}
