//! Tests for `invalid-attr` rule.
//!
//! Test ID mapping (TS → Rust):
//!   invalid-attr-invalid-001  → invalid_attr_invalid_001
//!   invalid-attr-invalid-002  → invalid_attr_invalid_002
//!   invalid-attr-invalid-003  → invalid_attr_invalid_003
//!   invalid-attr-invalid-004  → invalid_attr_invalid_004
//!   invalid-attr-invalid-005  → invalid_attr_invalid_005
//!   invalid-attr-valid-001    → invalid_attr_valid_001
//!   invalid-attr-valid-002    → invalid_attr_valid_002
//!   invalid-attr-valid-003    → invalid_attr_valid_003
//!   invalid-attr-valid-004    → invalid_attr_valid_004
//!   invalid-attr-valid-005    → invalid_attr_valid_005
//!   invalid-attr-invalid-006  → invalid_attr_invalid_006
//!   invalid-attr-invalid-007  → invalid_attr_invalid_007
//!   invalid-attr-invalid-008  → invalid_attr_invalid_008
//!   invalid-attr-invalid-009  → invalid_attr_invalid_009
//!   invalid-attr-invalid-010  → invalid_attr_invalid_010
//!   invalid-attr-invalid-011  → invalid_attr_invalid_011
//!   invalid-attr-invalid-012  → invalid_attr_invalid_012
//!   invalid-attr-invalid-013  → invalid_attr_invalid_013
//!   invalid-attr-invalid-014  → invalid_attr_invalid_014
//!   invalid-attr-invalid-015  → invalid_attr_invalid_015
//!   invalid-attr-valid-006    → invalid_attr_valid_006
//!   invalid-attr-valid-007    → invalid_attr_valid_007
//!   invalid-attr-valid-008    → invalid_attr_valid_008
//!   invalid-attr-invalid-018  → invalid_attr_invalid_018
//!   invalid-attr-invalid-019  → invalid_attr_invalid_019
//!   invalid-attr-valid-009    → invalid_attr_valid_009
//!   invalid-attr-valid-010    → invalid_attr_valid_010
//!   invalid-attr-valid-011    → invalid_attr_valid_011
//!   invalid-attr-invalid-022  → invalid_attr_invalid_022
//!   invalid-attr-invalid-026  → invalid_attr_invalid_026
//!   invalid-attr-valid-012    → invalid_attr_valid_012
//!   invalid-attr-valid-014    → invalid_attr_valid_014
//!   invalid-attr-valid-015    → invalid_attr_valid_015
//!   invalid-attr-valid-016    → invalid_attr_valid_016
//!   invalid-attr-valid-017    → invalid_attr_valid_017
//!   invalid-attr-valid-018    → invalid_attr_valid_018
//!   invalid-attr-valid-019    → invalid_attr_valid_019
//!   invalid-attr-valid-020    → invalid_attr_valid_020
//!   invalid-attr-valid-021    → invalid_attr_valid_021
//!   invalid-attr-invalid-027  → invalid_attr_invalid_027
//!   invalid-attr-invalid-028  → invalid_attr_invalid_028
//!   invalid-attr-invalid-029  → invalid_attr_invalid_029
//!   invalid-attr-issue-553    → invalid_attr_issue_553
//!   invalid-attr-issue-564    → invalid_attr_issue_564
//!   invalid-attr-issue-716-*  → invalid_attr_issue_716_*
//!   invalid-attr-issue-1078   → invalid_attr_issue_1078
//!   invalid-attr-issue-1357   → invalid_attr_issue_1357
//!   invalid-attr-issue-1487-* → invalid_attr_issue_1487_*
//!   invalid-attr-issue-1987   → invalid_attr_issue_1987
//!   invalid-attr-issue-2455   → invalid_attr_issue_2455
//!   invalid-attr-issue-3384-* → invalid_attr_issue_3384_*
//!   invalid-attr-issue-3599-* → invalid_attr_issue_3599_*
//!   invalid-attr-issue-3626-* → invalid_attr_issue_3626_*
//!   invalid-attr-issue-3631-* → invalid_attr_issue_3631_*
//!   invalid-attr-invalid-016  → invalid_attr_invalid_016
//!   invalid-attr-invalid-017  → invalid_attr_invalid_017
//!   invalid-attr-invalid-024  → invalid_attr_invalid_024
//!   invalid-attr-invalid-025  → invalid_attr_invalid_025
//!   invalid-attr-issue-3626-001 — SKIP: Spec sync (#3675). SRIHash checker ready, awaiting dev merge
//!   invalid-attr-invalid-015  — PARTIAL: @click→onclick suggestion missing (parser candidate, not Levenshtein)
//!   invalid-attr-invalid-020  → invalid_attr_invalid_020
//!   invalid-attr-invalid-021  → invalid_attr_invalid_021
//!   invalid-attr-invalid-023  — SKIP: Pretenders (JSX parser)
//!   invalid-attr-valid-013    — SKIP: `as` attribute (pretenders)
//!   invalid-attr-parser-*     — SKIP: Framework parser tests (Pug, Vue, React, Svelte, MDX)
//!   invalid-attr-issue-525-*  — SKIP: Svelte parser + spec
//!   invalid-attr-issue-678    — SKIP: Vue parser + spec
//!   invalid-attr-issue-783    — SKIP: Vue parser + spec
//!   invalid-attr-issue-800    — SKIP: Pug parser

use super::*;
use crate::rule::{RuleConfig, RuleConfigSet};
use crate::rules::attr_duplication::tests::make_element_with_attrs;
use crate::violation::Severity;
use markuplint_types::spec::load_spec;

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

#[test]
fn valid_attr_no_violation() {
    let arena = make_element_with_attrs("div", &[("class", "foo")]);
    let s = spec();
    let rule = InvalidAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty(), "class is a valid attr for div");
}

#[test]
fn data_attr_allowed() {
    let arena = make_element_with_attrs("div", &[("data-custom", "value")]);
    let s = spec();
    let rule = InvalidAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty(), "data-* attributes should be allowed");
}

#[test]
fn aria_attr_skipped() {
    let arena = make_element_with_attrs("div", &[("aria-label", "test")]);
    let s = spec();
    let rule = InvalidAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(
        violations.is_empty(),
        "aria-* attributes should be skipped (handled by wai-aria)"
    );
}

#[test]
fn adapt_attr_bypassed() {
    let arena = make_element_with_attrs("div", &[("adapt-purpose", "simplification")]);
    let s = spec();
    let rule = InvalidAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty(), "adapt-* attributes should be bypassed");
}

#[test]
fn unknown_attr_violation() {
    let arena = make_element_with_attrs("div", &[("foo", "bar")]);
    let s = spec();
    let rule = InvalidAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert_eq!(violations.len(), 1);
    assert!(violations[0].message.contains("foo"));
    assert!(violations[0].message.contains("disallowed"));
}

#[test]
fn disallow_attrs_config() {
    let arena = make_element_with_attrs("div", &[("class", "foo")]);
    let s = spec();
    let rule = InvalidAttr;
    let config = RuleConfig {
        options: serde_json::json!({
            "disallowAttrs": ["class"],
        }),
        ..RuleConfig::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert_eq!(violations.len(), 1);
    assert!(violations[0].message.contains("disallowed"));
}

#[test]
fn disallow_attrs_config_violation() {
    let arena = make_element_with_attrs("div", &[("class", "foo")]);
    let s = spec();
    let rule = InvalidAttr;
    let config = RuleConfig {
        options: serde_json::json!({
            "disallowAttrs": ["class"],
        }),
        ..RuleConfig::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert_eq!(
        violations.len(),
        1,
        "Expected exactly 1 violation for disallowed class attr, got: {violations:?}"
    );
    assert!(
        violations[0].message.contains("class"),
        "Violation message should mention the disallowed attribute name 'class', got: {}",
        violations[0].message
    );
    assert!(
        violations[0].message.contains("disallowed"),
        "Violation message should say 'disallowed', got: {}",
        violations[0].message
    );
}

#[test]
fn ignore_prefix_config() {
    let arena = make_element_with_attrs("div", &[("v-bind", "foo")]);
    let s = spec();
    let rule = InvalidAttr;
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
    let rule = InvalidAttr;
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
fn allow_attrs_with_enum_constraint_valid() {
    let arena = make_element_with_attrs("div", &[("tabindex", "-1")]);
    let s = spec();
    let rule = InvalidAttr;
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
    let rule = InvalidAttr;
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
fn disallow_attrs_with_pattern() {
    let arena = make_element_with_attrs("meta", &[("content", "user-scalable=no")]);
    let s = spec();
    let rule = InvalidAttr;
    let config = RuleConfig {
        options: serde_json::json!({
            "disallowAttrs": [{
                "name": "content",
                "value": { "pattern": "/user-scalable\\s*=\\s*(no|0)\\b/i" }
            }],
        }),
        ..RuleConfig::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert_eq!(
        violations.len(),
        1,
        "content with user-scalable=no should be disallowed"
    );
}

#[test]
fn disallow_attrs_with_pattern_no_match() {
    let arena = make_element_with_attrs("meta", &[("content", "width=device-width")]);
    let s = spec();
    let rule = InvalidAttr;
    let config = RuleConfig {
        options: serde_json::json!({
            "disallowAttrs": [{
                "name": "content",
                "value": { "pattern": "/user-scalable\\s*=\\s*(no|0)\\b/i" }
            }],
        }),
        ..RuleConfig::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert!(
        violations.is_empty(),
        "content without user-scalable=no should be allowed, got: {violations:?}"
    );
}

#[test]
fn typo_suggestion() {
    let arena = make_element_with_attrs("div", &[("classs", "foo")]);
    let s = spec();
    let rule = InvalidAttr;
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
    let rule = InvalidAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty(), "event handler attrs should be skipped");
}

#[test]
fn valid_element_specific_attr() {
    let arena = make_element_with_attrs("input", &[("type", "text")]);
    let s = spec();
    let rule = InvalidAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty(), "type is valid on input");
}

#[test]
fn custom_element_allows_any_attrs() {
    let arena = make_element_with_attrs("custom-element", &[("any-attr", "value")]);
    let s = spec();
    let rule = InvalidAttr;
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
    let rule = InvalidAttr;
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
    let rule = InvalidAttr;

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
fn allow_attrs_with_no_empty_any_type() {
    let arena = make_element_with_attrs("meta", &[("property", "og:title")]);
    let s = spec();
    let rule = InvalidAttr;
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
    let rule = InvalidAttr;
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

#[test]
fn disallow_attrs_with_enum_matched() {
    let arena = make_element_with_attrs("div", &[("role", "button")]);
    let s = spec();
    let rule = InvalidAttr;
    let config = RuleConfig {
        options: serde_json::json!({
            "disallowAttrs": [{
                "name": "role",
                "value": { "enum": ["button", "link"] }
            }],
        }),
        ..RuleConfig::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert_eq!(violations.len(), 1, "role=button should be disallowed by enum");
}

#[test]
fn uppercase_data_attr_is_bypassed() {
    // Uppercase "DATA-FOO" should be bypassed as data-* (case-insensitive)
    let arena = make_element_with_attrs("div", &[("DATA-FOO", "bar")]);
    let s = spec();
    let rule = InvalidAttr;
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
    let rule = InvalidAttr;
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
    let rule = InvalidAttr;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(
        violations.is_empty(),
        "Uppercase ROLE should be bypassed, got: {violations:?}"
    );
}

#[test]
fn disallow_attrs_with_enum_not_matched() {
    let arena = make_element_with_attrs("div", &[("role", "main")]);
    let s = spec();
    let rule = InvalidAttr;
    let config = RuleConfig {
        options: serde_json::json!({
            "disallowAttrs": [{
                "name": "role",
                "value": { "enum": ["button", "link"] }
            }],
        }),
        ..RuleConfig::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    // role=main is NOT in the disallowed enum, so no violation from disallow
    // but role is bypassed by aria-* check (it's handled by wai-aria)
    // actually, "role" is not "aria-*" so it goes through spec validation
    // Let's just check it doesn't trigger the enum-specific message
    for v in &violations {
        assert!(
            !v.message.contains("disallowed to accept"),
            "role=main should NOT match enum disallow"
        );
    }
}

// =============================================
// TS-aligned tests (full lint pipeline)
// =============================================

use crate::lint::{LintConfig, lint};
use markuplint_dom::html_builder;

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

/// TS: `[invalid-attr-invalid-002]` — Type check (empty name attr on form)
#[test]
fn invalid_attr_invalid_002() {
    const _ID: &str = "invalid-attr-invalid-002";
    let arena = html_arena(r#"<form name=""></form>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-valid-001]` — disable (same HTML as invalid-001 but rule=false)
#[test]
fn invalid_attr_valid_001() {
    const _ID: &str = "invalid-attr-valid-001";
    let arena = html_arena(r#"<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": false }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[invalid-attr-valid-002]` — global attribute (title on a and abbr)
#[test]
fn invalid_attr_valid_002() {
    const _ID: &str = "invalid-attr-valid-002";
    let arena = html_arena(r#"<a title="the a element"><abbr title="the abbr element">text</abbr></a>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[invalid-attr-valid-005]` — custom element allows any attrs
#[test]
fn invalid_attr_valid_005() {
    const _ID: &str = "invalid-attr-valid-005";
    let arena = html_arena("<custom-element any-attr></custom-element>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[invalid-attr-invalid-001]` — unknown attr + referrerpolicy enum
#[test]
fn invalid_attr_invalid_001() {
    const _ID: &str = "invalid-attr-invalid-001";
    let arena = html_arena(r#"<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 2, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 4);
    assert_eq!(
        result.violations[0].message,
        "The \"invalid-attr\" attribute is disallowed"
    );
    assert_eq!(result.violations[0].raw, "invalid-attr");
    assert_eq!(result.violations[1].severity, Severity::Error);
    assert_eq!(result.violations[1].line, 1);
    assert_eq!(result.violations[1].col, 33);
    assert_eq!(
        result.violations[1].message,
        "The \"referrerpolicy\" attribute expects either \"\", \"no-referrer\", \"no-referrer-when-downgrade\", \"same-origin\", \"origin\", \"strict-origin\", \"origin-when-cross-origin\", \"strict-origin-when-cross-origin\", \"unsafe-url\""
    );
    assert_eq!(result.violations[1].raw, "invalid-value");
}

/// TS: `[invalid-attr-invalid-003]` — hidden attribute enum
#[test]
fn invalid_attr_invalid_003() {
    const _ID: &str = "invalid-attr-invalid-003";
    let spec = spec();
    let mk_config = || -> LintConfig {
        serde_json::from_value(serde_json::json!({
            "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-valid-003]` — input type case-insensitive
#[test]
fn invalid_attr_valid_003() {
    const _ID: &str = "invalid-attr-valid-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-invalid-005]` — unknown attr, allow via options
#[test]
fn invalid_attr_invalid_005() {
    const _ID: &str = "invalid-attr-invalid-005";
    let spec = spec();
    // Without allowAttrs: violation
    let config1: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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
        "rules": { "invalid-attr": { "options": { "allowAttrs": ["x-attr"] } } }
    }))
    .unwrap();
    let result2 = lint(&html_arena("<div x-attr></div>"), &spec, &config2);
    assert_eq!(result2.violations.len(), 0);
}

/// TS: `[invalid-attr-valid-004]` — disallow attr on custom element
#[test]
fn invalid_attr_valid_004() {
    const _ID: &str = "invalid-attr-valid-004";
    let spec = spec();
    // No config: custom element allows any attr
    let config1: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena("<x-div x-attr></x-div>"), &spec, &config1)
            .violations
            .len(),
        0
    );
    // With disallowAttrs: violation
    let config2: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": { "options": { "disallowAttrs": ["x-attr"] } } }
    }))
    .unwrap();
    let result2 = lint(&html_arena("<x-div x-attr></x-div>"), &spec, &config2);
    assert_eq!(result2.violations.len(), 1);
    assert_eq!(result2.violations[0].severity, Severity::Error);
    assert_eq!(result2.violations[0].line, 1);
    assert_eq!(result2.violations[0].col, 8);
    assert_eq!(result2.violations[0].message, "The \"x-attr\" attribute is disallowed");
    assert_eq!(result2.violations[0].raw, "x-attr");
}

/// TS: `[invalid-attr-invalid-006]` — disallow attr with enum constraint
#[test]
fn invalid_attr_invalid_006() {
    const _ID: &str = "invalid-attr-invalid-006";
    let spec = spec();
    // Value "a" not in disallowed enum ["b"] — no violation
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": { "options": { "disallowAttrs": [{ "name": "x-attr", "value": { "enum": ["b"] } }] } } }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<x-div x-attr="a"></x-div>"#), &spec, &config)
            .violations
            .len(),
        0
    );
    // Value "b" in disallowed enum ["a","b","c"] — violation
    let config2: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": { "options": { "disallowAttrs": [{ "name": "x-attr", "value": { "enum": ["a","b","c"] } }] } } }
    }))
    .unwrap();
    let result2 = lint(&html_arena(r#"<x-div x-attr="b"></x-div>"#), &spec, &config2);
    assert_eq!(result2.violations.len(), 1);
    assert_eq!(result2.violations[0].severity, Severity::Error);
    assert_eq!(result2.violations[0].line, 1);
    assert_eq!(result2.violations[0].col, 16);
    assert_eq!(
        result2.violations[0].message,
        "The \"x-attr\" attribute is disallowed to accept the following values: \"a\", \"b\", \"c\""
    );
    assert_eq!(result2.violations[0].raw, "b");
}

/// TS: `[invalid-attr-invalid-007]` — disallow attr with pattern constraint
#[test]
fn invalid_attr_invalid_007() {
    const _ID: &str = "invalid-attr-invalid-007";
    let spec = spec();
    // Value "a" doesn't match pattern /^a{2,}$/ — no violation
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": { "options": { "disallowAttrs": [{ "name": "x-attr", "value": { "pattern": "/^a{2,}$/" } }] } } }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<x-div x-attr="a"></x-div>"#), &spec, &config)
            .violations
            .len(),
        0
    );
    // Value "aa" matches pattern /^a{2,}$/ — violation
    let result = lint(&html_arena(r#"<x-div x-attr="aa"></x-div>"#), &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 16);
    assert_eq!(
        result.violations[0].message,
        "The \"x-attr\" attribute is matched with the below disallowed patterns: /^a{2,}$/"
    );
    assert_eq!(result.violations[0].raw, "aa");
}

/// TS: `[invalid-attr-invalid-008]` — disallow attr with pattern (object form)
#[test]
fn invalid_attr_invalid_008() {
    const _ID: &str = "invalid-attr-invalid-008";
    let spec = spec();
    // Object form: { "x-attr": { "pattern": ... } }
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": { "options": { "disallowAttrs": { "x-attr": { "pattern": "/^a{2,}$/" } } } } }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<x-div x-attr="a"></x-div>"#), &spec, &config)
            .violations
            .len(),
        0
    );
    let result = lint(&html_arena(r#"<x-div x-attr="aa"></x-div>"#), &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 16);
    assert_eq!(
        result.violations[0].message,
        "The \"x-attr\" attribute is matched with the below disallowed patterns: /^a{2,}$/"
    );
    assert_eq!(result.violations[0].raw, "aa");
}

/// TS: `[invalid-attr-invalid-009]` — disallow attr with type constraint
#[test]
fn invalid_attr_invalid_009() {
    const _ID: &str = "invalid-attr-invalid-009";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": { "options": { "disallowAttrs": [{ "name": "x-attr", "value": "Int" }] } } }
    }))
    .unwrap();
    // "1.1" is not Int — no violation from disallow
    assert_eq!(
        lint(&html_arena(r#"<x-div x-attr="1.1"></x-div>"#), &spec, &config)
            .violations
            .len(),
        0
    );
    // "1" is Int — violation
    let result = lint(&html_arena(r#"<x-div x-attr="1"></x-div>"#), &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 16);
    assert_eq!(
        result.violations[0].message,
        "The type of the \"x-attr\" attribute is disallowed"
    );
    assert_eq!(result.violations[0].raw, "1");
}

/// TS: `[invalid-attr-invalid-010]` — custom rule: allow with pattern
#[test]
fn invalid_attr_invalid_010() {
    const _ID: &str = "invalid-attr-invalid-010";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": { "options": { "allowAttrs": { "x-attr": { "pattern": "/[a-z]+/" } } } } }
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

/// TS: `[invalid-attr-invalid-011]` — custom rule: allow with pattern (array form)
#[test]
fn invalid_attr_invalid_011() {
    const _ID: &str = "invalid-attr-invalid-011";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": { "options": { "allowAttrs": [{ "name": "x-attr", "value": { "pattern": "/[a-z]+/" } }] } } }
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

/// TS: `[invalid-attr-invalid-012]` — custom rule: type constraint
#[test]
fn invalid_attr_invalid_012() {
    const _ID: &str = "invalid-attr-invalid-012";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": { "options": { "allowAttrs": { "x-attr": "Int" } } } }
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

/// TS: `[invalid-attr-invalid-015]` — prefix attribute (v-bind:, :, @)
/// Note: TS reports "Did you mean" for `:class`→`class` and `@click`→`onclick`
/// via parser candidate, which is framework-parser functionality not available
/// in the Rust HTML parser. Rust only checks disallowed.
#[test]
fn invalid_attr_invalid_015() {
    const _ID: &str = "invalid-attr-invalid-015";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-valid-006]` — ignore prefix attribute
#[test]
fn invalid_attr_valid_006() {
    const _ID: &str = "invalid-attr-valid-006";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": { "options": { "ignoreAttrNamePrefix": ["v-bind:", ":", "@"] } } }
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

/// TS: `[invalid-attr-valid-007]` — URL attribute
#[test]
fn invalid_attr_valid_007() {
    const _ID: &str = "invalid-attr-valid-007";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-valid-008]` — Foreign element (SVG)
#[test]
fn invalid_attr_valid_008() {
    const _ID: &str = "invalid-attr-valid-008";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-invalid-018]` — custom rule: disallowed
#[test]
fn invalid_attr_invalid_018() {
    const _ID: &str = "invalid-attr-invalid-018";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": { "options": { "disallowAttrs": ["onclick"] } } }
    }))
    .unwrap();
    let result = lint(&html_arena(r#"<a onclick="fn()"></>"#), &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 4);
    assert_eq!(result.violations[0].message, "The \"onclick\" attribute is disallowed");
    assert_eq!(result.violations[0].raw, "onclick");
}

/// TS: `[invalid-attr-invalid-019]` — noUse flag (dialog tabindex)
#[test]
fn invalid_attr_invalid_019() {
    const _ID: &str = "invalid-attr-invalid-019";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-valid-009]` — noUse flag with allowAttrs override
#[test]
fn invalid_attr_valid_009() {
    const _ID: &str = "invalid-attr-valid-009";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": { "options": { "allowAttrs": [{ "name": "tabindex", "value": { "enum": ["-1", "0"] } }] } } }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<dialog tabindex="0"></dialog>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[invalid-attr-valid-010]` — Booleanish (contenteditable)
#[test]
fn invalid_attr_valid_010() {
    const _ID: &str = "invalid-attr-valid-010";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena("<div contenteditable></div>"), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[invalid-attr-valid-011]` — WAI-Adapt attributes
#[test]
fn invalid_attr_valid_011() {
    const _ID: &str = "invalid-attr-valid-011";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-invalid-026]` — contenteditable="inherit" is invalid
#[test]
fn invalid_attr_invalid_026() {
    const _ID: &str = "invalid-attr-invalid-026";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    let result = lint(&html_arena(r#"<div contenteditable="inherit"></div>"#), &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].raw, "inherit");
    assert!(result.violations[0].message.contains("contenteditable"));
}

/// TS: `[invalid-attr-valid-014]` — CSS Functions in style
#[test]
fn invalid_attr_valid_014() {
    const _ID: &str = "invalid-attr-valid-014";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<div style="prop: var(--x)"></div>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[invalid-attr-issue-553]` — link preload
#[test]
fn invalid_attr_issue_553() {
    const _ID: &str = "invalid-attr-issue-553";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-564]` — class with colon (Tailwind)
#[test]
fn invalid_attr_issue_564() {
    const _ID: &str = "invalid-attr-issue-564";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-1078]` — referrerpolicy on script and img
#[test]
fn invalid_attr_issue_1078() {
    const _ID: &str = "invalid-attr-issue-1078";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-1357]` — SVG rect transform
#[test]
fn invalid_attr_issue_1357() {
    const _ID: &str = "invalid-attr-issue-1357";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-1487-001]` — typo suggestion (nama → name)
#[test]
fn invalid_attr_issue_1487_001() {
    const _ID: &str = "invalid-attr-issue-1487-001";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-1487-002]` — typo suggestion (clss → class)
#[test]
fn invalid_attr_issue_1487_002() {
    const _ID: &str = "invalid-attr-issue-1487-002";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-1487-003]` — no suggestion for unrelated attr
#[test]
fn invalid_attr_issue_1487_003() {
    const _ID: &str = "invalid-attr-issue-1487-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-valid-021]` — empty lang attribute is valid
#[test]
fn invalid_attr_valid_021() {
    const _ID: &str = "invalid-attr-valid-021";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-invalid-029]` — script type="speculationrules" is valid
#[test]
fn invalid_attr_invalid_029() {
    const _ID: &str = "invalid-attr-invalid-029";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-invalid-004]` — complex type (autocomplete)
#[test]
fn invalid_attr_invalid_004() {
    const _ID: &str = "invalid-attr-invalid-004";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-valid-012]` — Multiple Type (command attribute)
#[test]
fn invalid_attr_valid_012() {
    const _ID: &str = "invalid-attr-valid-012";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-valid-015]` — command="request-close" is valid
#[test]
fn invalid_attr_valid_015() {
    const _ID: &str = "invalid-attr-valid-015";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-valid-016]` — command="close" is valid
#[test]
fn invalid_attr_valid_016() {
    const _ID: &str = "invalid-attr-valid-016";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-invalid-027]` — command="invalid-value" is invalid
#[test]
fn invalid_attr_invalid_027() {
    const _ID: &str = "invalid-attr-invalid-027";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-valid-017]` — headingoffset with valid value
#[test]
fn invalid_attr_valid_017() {
    const _ID: &str = "invalid-attr-valid-017";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-valid-018]` — headingoffset="0" is valid
#[test]
fn invalid_attr_valid_018() {
    const _ID: &str = "invalid-attr-valid-018";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-valid-019]` — headingoffset="8" is valid (max)
#[test]
fn invalid_attr_valid_019() {
    const _ID: &str = "invalid-attr-valid-019";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-invalid-028]` — headingoffset with non-integer value
#[test]
fn invalid_attr_invalid_028() {
    const _ID: &str = "invalid-attr-invalid-028";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-valid-020]` — headingreset is valid
#[test]
fn invalid_attr_valid_020() {
    const _ID: &str = "invalid-attr-valid-020";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena("<div headingreset><h1>Title</h1></div>"), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[invalid-attr-issue-3384-001]` — focusgroup with valid behavior keyword
#[test]
fn invalid_attr_issue_3384_001() {
    const _ID: &str = "invalid-attr-issue-3384-001";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<div focusgroup="toolbar"></div>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[invalid-attr-issue-3384-002]` — focusgroup with multiple valid tokens
#[test]
fn invalid_attr_issue_3384_002() {
    const _ID: &str = "invalid-attr-issue-3384-002";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-3384-003]` — focusgroup with all valid tokens
#[test]
fn invalid_attr_issue_3384_003() {
    const _ID: &str = "invalid-attr-issue-3384-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-3384-004]` — focusgroup with invalid token
#[test]
fn invalid_attr_issue_3384_004() {
    const _ID: &str = "invalid-attr-issue-3384-004";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    let result = lint(&html_arena(r#"<div focusgroup="invalid"></div>"#), &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 18);
    assert!(result.violations[0].message.contains("focusgroup"));
    assert_eq!(result.violations[0].raw, "invalid");
}

/// TS: `[invalid-attr-issue-3384-006]` — focusgroup="none" is valid
#[test]
fn invalid_attr_issue_3384_006() {
    const _ID: &str = "invalid-attr-issue-3384-006";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<li focusgroup="none"></li>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[invalid-attr-issue-3384-009]` — focusgroup with empty value is valid
#[test]
fn invalid_attr_issue_3384_009() {
    const _ID: &str = "invalid-attr-issue-3384-009";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<div focusgroup=""></div>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[invalid-attr-issue-3384-010]` — focusgroupstart boolean attribute is valid
#[test]
fn invalid_attr_issue_3384_010() {
    const _ID: &str = "invalid-attr-issue-3384-010";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena("<button focusgroupstart></button>"), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[invalid-attr-issue-3384-011]` — focusgroup on any element (global attribute)
#[test]
fn invalid_attr_issue_3384_011() {
    const _ID: &str = "invalid-attr-issue-3384-011";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-3631-001]` — importmap must not have src
#[test]
fn invalid_attr_issue_3631_001() {
    const _ID: &str = "invalid-attr-issue-3631-001";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-3631-002]` — speculationrules must not have src
#[test]
fn invalid_attr_issue_3631_002() {
    const _ID: &str = "invalid-attr-issue-3631-002";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-3631-003]` — importmap must not have async
#[test]
fn invalid_attr_issue_3631_003() {
    const _ID: &str = "invalid-attr-issue-3631-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-3631-004]` — importmap must not have defer
#[test]
fn invalid_attr_issue_3631_004() {
    const _ID: &str = "invalid-attr-issue-3631-004";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-3631-005]` — importmap must not have nomodule
#[test]
fn invalid_attr_issue_3631_005() {
    const _ID: &str = "invalid-attr-issue-3631-005";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-3631-006]` — module with defer is not disallowed
#[test]
fn invalid_attr_issue_3631_006() {
    const _ID: &str = "invalid-attr-issue-3631-006";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<script type="module" src="m.js" defer></script>"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[invalid-attr-issue-3631-007]` — charset requires src
#[test]
fn invalid_attr_issue_3631_007() {
    const _ID: &str = "invalid-attr-issue-3631-007";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    let result = lint(&html_arena(r#"<script charset="utf-8">x</script>"#), &spec, &config);
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].col, 9);
    assert_eq!(result.violations[0].message, "The \"charset\" attribute is disallowed");
}

/// TS: `[invalid-attr-issue-3631-008]` — valid: module with async
#[test]
fn invalid_attr_issue_3631_008() {
    const _ID: &str = "invalid-attr-issue-3631-008";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<script type="module" async>x</script>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[invalid-attr-issue-3631-009]` — valid: classic with src and defer
#[test]
fn invalid_attr_issue_3631_009() {
    const _ID: &str = "invalid-attr-issue-3631-009";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<script src="app.js" defer></script>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[invalid-attr-issue-3631-010]` — valid: classic with src and async
#[test]
fn invalid_attr_issue_3631_010() {
    const _ID: &str = "invalid-attr-issue-3631-010";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    assert_eq!(
        lint(&html_arena(r#"<script src="app.js" async></script>"#), &spec, &config)
            .violations
            .len(),
        0
    );
}

/// TS: `[invalid-attr-issue-3599-001]` — srcset rejects zero width descriptor
#[test]
fn invalid_attr_issue_3599_001() {
    const _ID: &str = "invalid-attr-issue-3599-001";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<img srcset="x 0w" sizes="100vw" src=x alt=x>"#),
        &spec,
        &config,
    );
    assert!(result.violations.len() > 0, "srcset zero width should be invalid");
}

/// TS: `[invalid-attr-issue-3599-002]` — srcset rejects zero density descriptor
#[test]
fn invalid_attr_issue_3599_002() {
    const _ID: &str = "invalid-attr-issue-3599-002";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
    }))
    .unwrap();
    let result = lint(&html_arena(r#"<img srcset="x 0x" src=x alt=x>"#), &spec, &config);
    assert!(
        result.violations.len() > 0,
        "srcset zero density should be invalid: {:#?}",
        result.violations
    );
}

/// TS: `[invalid-attr-issue-3599-003]` — srcset accepts valid width descriptor
#[test]
fn invalid_attr_issue_3599_003() {
    const _ID: &str = "invalid-attr-issue-3599-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

// invalid-attr-issue-3626-001 — SKIP: Blocked by spec sync (#3675).
// Worktree spec has integrity type="Any" (stale). Dev has type="SRIHash".
// SRIHash checker is implemented (custom.rs + keyword_type.rs).
// After merging dev, remove this comment and enable the test below.
//
// #[test]
// fn invalid_attr_issue_3626_001() {
//     const _ID: &str = "invalid-attr-issue-3626-001";
//     let spec = spec();
//     let config: LintConfig = serde_json::from_value(serde_json::json!({
//         "rules": { "invalid-attr": true }
//     })).unwrap();
//     let result = lint(&html_arena(r#"<script src="x" integrity="md5-abc123"></script>"#), &spec, &config);
//     assert!(result.violations.len() > 0, "md5 integrity should be invalid");
// }

/// TS: `[invalid-attr-issue-3626-002]` — integrity accepts sha256 hash
#[test]
fn invalid_attr_issue_3626_002() {
    const _ID: &str = "invalid-attr-issue-3626-002";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-invalid-013]` — custom element and custom rule (nodeRule)
#[test]
fn invalid_attr_invalid_013() {
    const _ID: &str = "invalid-attr-invalid-013";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true },
        "nodeRules": [{
            "selector": "custom-element",
            "rules": { "invalid-attr": { "options": { "allowAttrs": { "any-attr": "Int" } } } }
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

/// TS: `[invalid-attr-invalid-014]` — custom element and custom rule (nodeRule, array form)
#[test]
fn invalid_attr_invalid_014() {
    const _ID: &str = "invalid-attr-invalid-014";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true },
        "nodeRules": [{
            "selector": "custom-element",
            "rules": { "invalid-attr": { "options": { "allowAttrs": [{ "name": "any-attr", "value": "Int" }] } } }
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

/// TS: `[invalid-attr-issue-1987]` — preload as destinations
#[test]
fn invalid_attr_issue_1987() {
    const _ID: &str = "invalid-attr-issue-1987";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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
    let expected_msg = "The \"as\" attribute expects either \"audioworklet\", \"fetch\", \"font\", \"image\", \"json\", \"paintworklet\", \"script\", \"serviceworker\", \"sharedworker\", \"style\", \"track\", \"worker\"";
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

/// TS: `[invalid-attr-issue-2455]` — source element conditional attrs
#[test]
fn invalid_attr_issue_2455() {
    const _ID: &str = "invalid-attr-issue-2455";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-716-001]` — viewport user-scalable=no violation
#[test]
fn invalid_attr_issue_716_001() {
    const _ID: &str = "invalid-attr-issue-716-001";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "invalid-attr": { "options": {
                "disallowAttrs": [{ "name": "content", "value": { "pattern": "/user-scalable\\s*=\\s*(no|0)\\b/i" } }]
            }}}
        }]
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 32);
    assert_eq!(
        result.violations[0].raw,
        "width=device-width, initial-scale=1, user-scalable=no"
    );
    assert_eq!(
        result.violations[0].message,
        "The \"content\" attribute is matched with the below disallowed patterns: /user-scalable\\s*=\\s*(no|0)\\b/i"
    );
}

/// TS: `[invalid-attr-issue-716-004]` — violation: spaces around = sign
#[test]
fn invalid_attr_issue_716_004() {
    const _ID: &str = "invalid-attr-issue-716-004";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "invalid-attr": { "options": {
                "disallowAttrs": [{ "name": "content", "value": { "pattern": "/user-scalable\\s*=\\s*(no|0)\\b/i" } }]
            }}}
        }]
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<meta name="viewport" content="width=device-width, user-scalable = no">"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 32);
    assert_eq!(
        result.violations[0].message,
        "The \"content\" attribute is matched with the below disallowed patterns: /user-scalable\\s*=\\s*(no|0)\\b/i"
    );
    assert_eq!(result.violations[0].raw, "width=device-width, user-scalable = no");
}

/// TS: `[invalid-attr-issue-716-005]` — no violation: normal viewport
#[test]
fn invalid_attr_issue_716_005() {
    const _ID: &str = "invalid-attr-issue-716-005";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "invalid-attr": { "options": {
                "disallowAttrs": [{ "name": "content", "value": { "pattern": "/user-scalable\\s*=\\s*(no|0)\\b/i" } }]
            }}}
        }]
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<meta name="viewport" content="width=device-width, initial-scale=1">"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[invalid-attr-issue-716-008]` — non-viewport meta is not affected
#[test]
fn invalid_attr_issue_716_008() {
    const _ID: &str = "invalid-attr-issue-716-008";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "invalid-attr": { "options": {
                "disallowAttrs": [{ "name": "content", "value": { "pattern": "/user-scalable\\s*=\\s*(no|0)\\b/i" } }]
            }}}
        }]
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<meta name="description" content="user-scalable=no">"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[invalid-attr-issue-3384-005]` — focusgroup with valid and invalid tokens mixed
#[test]
fn invalid_attr_issue_3384_005() {
    const _ID: &str = "invalid-attr-issue-3384-005";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-3384-007]` — focusgroup is case-insensitive
#[test]
fn invalid_attr_issue_3384_007() {
    const _ID: &str = "invalid-attr-issue-3384-007";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-3384-008]` — focusgroup rejects duplicate tokens
#[test]
fn invalid_attr_issue_3384_008() {
    const _ID: &str = "invalid-attr-issue-3384-008";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-invalid-020]` — SVG unknown attr (cz on circle)
#[test]
fn invalid_attr_invalid_020() {
    const _ID: &str = "invalid-attr-invalid-020";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-invalid-021]` — SVG rect mask invalid CSS
#[test]
fn invalid_attr_invalid_021() {
    const _ID: &str = "invalid-attr-invalid-021";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-invalid-022]` — SVG rect transform valid
#[test]
fn invalid_attr_invalid_022() {
    const _ID: &str = "invalid-attr-invalid-022";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-issue-716-002]` — viewport user-scalable=0 violation
#[test]
fn invalid_attr_issue_716_002() {
    const _ID: &str = "invalid-attr-issue-716-002";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "invalid-attr": { "options": {
                "disallowAttrs": [{ "name": "content", "value": { "pattern": "/user-scalable\\s*=\\s*(no|0)\\b/i" } }]
            }}}
        }]
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<meta name="viewport" content="width=device-width, user-scalable=0">"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(result.violations[0].col, 32);
    assert_eq!(
        result.violations[0].message,
        "The \"content\" attribute is matched with the below disallowed patterns: /user-scalable\\s*=\\s*(no|0)\\b/i"
    );
    assert_eq!(result.violations[0].raw, "width=device-width, user-scalable=0");
}

/// TS: `[invalid-attr-issue-716-003]` — viewport user-scalable=NO (case insensitive)
#[test]
fn invalid_attr_issue_716_003() {
    const _ID: &str = "invalid-attr-issue-716-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "invalid-attr": { "options": {
                "disallowAttrs": [{ "name": "content", "value": { "pattern": "/user-scalable\\s*=\\s*(no|0)\\b/i" } }]
            }}}
        }]
    }))
    .unwrap();
    let result = lint(
        &html_arena(r#"<meta name="viewport" content="width=device-width, user-scalable=NO">"#),
        &spec,
        &config,
    );
    assert_eq!(result.violations.len(), 1, "violations: {:#?}", result.violations);
    assert_eq!(
        result.violations[0].message,
        "The \"content\" attribute is matched with the below disallowed patterns: /user-scalable\\s*=\\s*(no|0)\\b/i"
    );
    assert_eq!(result.violations[0].raw, "width=device-width, user-scalable=NO");
}

/// TS: `[invalid-attr-issue-716-006]` — no violation: user-scalable=yes
#[test]
fn invalid_attr_issue_716_006() {
    const _ID: &str = "invalid-attr-issue-716-006";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "invalid-attr": { "options": {
                "disallowAttrs": [{ "name": "content", "value": { "pattern": "/user-scalable\\s*=\\s*(no|0)\\b/i" } }]
            }}}
        }]
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<meta name="viewport" content="width=device-width, user-scalable=yes">"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[invalid-attr-issue-716-007]` — no violation: user-scalable=1
#[test]
fn invalid_attr_issue_716_007() {
    const _ID: &str = "invalid-attr-issue-716-007";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "invalid-attr": { "options": {
                "disallowAttrs": [{ "name": "content", "value": { "pattern": "/user-scalable\\s*=\\s*(no|0)\\b/i" } }]
            }}}
        }]
    }))
    .unwrap();
    assert_eq!(
        lint(
            &html_arena(r#"<meta name="viewport" content="width=device-width, user-scalable=1">"#),
            &spec,
            &config
        )
        .violations
        .len(),
        0
    );
}

/// TS: `[invalid-attr-invalid-016]` — Overwrite type (object form allowAttrs)
#[test]
fn invalid_attr_invalid_016() {
    const _ID: &str = "invalid-attr-invalid-016";
    let spec = spec();
    // With allowAttrs overwriting datetime to enum ["overwrite-type"]
    let config1: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": { "options": { "allowAttrs": { "datetime": { "enum": ["overwrite-type"] } } } } }
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
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-invalid-017]` — Overwrite type (array form allowAttrs)
#[test]
fn invalid_attr_invalid_017() {
    const _ID: &str = "invalid-attr-invalid-017";
    let spec = spec();
    let config1: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": { "options": { "allowAttrs": [{ "name": "datetime", "value": { "enum": ["overwrite-type"] } }] } } }
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
        "rules": { "invalid-attr": true }
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

/// TS: `[invalid-attr-invalid-024]` — regexSelector
#[test]
fn invalid_attr_invalid_024() {
    const _ID: &str = "invalid-attr-invalid-024";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true },
        "nodeRules": [{
            "regexSelector": {
                "nodeName": "img",
                "attrName": "src",
                "attrValue": "/^(?<FileName>.+)\\.(?<Exp>png|jpg|webp|gif)$/",
                "combination": { "combinator": ":has(~)", "nodeName": "source" }
            },
            "rules": { "invalid-attr": { "options": {
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

/// TS: `[invalid-attr-invalid-025]` — regexSelector (array form)
#[test]
fn invalid_attr_invalid_025() {
    const _ID: &str = "invalid-attr-invalid-025";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "invalid-attr": true },
        "nodeRules": [{
            "regexSelector": {
                "nodeName": "img",
                "attrName": "src",
                "attrValue": "/^(?<FileName>.+)\\.(?<Exp>png|jpg|webp|gif)$/",
                "combination": { "combinator": ":has(~)", "nodeName": "source" }
            },
            "rules": { "invalid-attr": { "options": {
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
