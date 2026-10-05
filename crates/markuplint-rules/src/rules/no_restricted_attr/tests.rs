//! Tests for `no-restricted-attr` rule.
//!
//! Split out of the tests of the pre-split `invalid-attr` rule; each test keeps the
//! TypeScript test it mirrors under that test's new id (old id in parentheses).
//!
//!   no-restricted-attr-valid-001  → no_restricted_attr_valid_001  (was invalid-attr-valid-004)
//!   no-restricted-attr-invalid-001  → no_restricted_attr_invalid_001  (was invalid-attr-invalid-006)
//!   no-restricted-attr-invalid-002  → no_restricted_attr_invalid_002  (was invalid-attr-invalid-007)
//!   no-restricted-attr-invalid-003  → no_restricted_attr_invalid_003  (was invalid-attr-invalid-008)
//!   no-restricted-attr-invalid-004  → no_restricted_attr_invalid_004  (was invalid-attr-invalid-009)
//!   no-restricted-attr-invalid-005  → no_restricted_attr_invalid_005  (was invalid-attr-invalid-018)
//!   no-restricted-attr-issue-716-001  → no_restricted_attr_issue_716_001  (was invalid-attr-issue-716-001)
//!   no-restricted-attr-issue-716-004  → no_restricted_attr_issue_716_004  (was invalid-attr-issue-716-004)
//!   no-restricted-attr-issue-716-005  → no_restricted_attr_issue_716_005  (was invalid-attr-issue-716-005)
//!   no-restricted-attr-issue-716-008  → no_restricted_attr_issue_716_008  (was invalid-attr-issue-716-008)
//!   no-restricted-attr-issue-716-002  → no_restricted_attr_issue_716_002  (was invalid-attr-issue-716-002)
//!   no-restricted-attr-issue-716-003  → no_restricted_attr_issue_716_003  (was invalid-attr-issue-716-003)
//!   no-restricted-attr-issue-716-006  → no_restricted_attr_issue_716_006  (was invalid-attr-issue-716-006)
//!   no-restricted-attr-issue-716-007  → no_restricted_attr_issue_716_007  (was invalid-attr-issue-716-007)

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
fn disallow_attrs_config() {
    let arena = make_element_with_attrs("div", &[("class", "foo")]);
    let s = spec();
    let rule = NoRestrictedAttr;
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
    let rule = NoRestrictedAttr;
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
fn disallow_attrs_with_pattern() {
    let arena = make_element_with_attrs("meta", &[("content", "user-scalable=no")]);
    let s = spec();
    let rule = NoRestrictedAttr;
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
    let rule = NoRestrictedAttr;
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
fn disallow_attrs_with_enum_matched() {
    let arena = make_element_with_attrs("div", &[("role", "button")]);
    let s = spec();
    let rule = NoRestrictedAttr;
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
fn disallow_attrs_with_enum_not_matched() {
    let arena = make_element_with_attrs("div", &[("role", "main")]);
    let s = spec();
    let rule = NoRestrictedAttr;
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

/// TS: `[no-restricted-attr-valid-001]` — disallow attr on custom element
#[test]
fn no_restricted_attr_valid_001() {
    const _ID: &str = "no-restricted-attr-valid-001";
    let spec = spec();
    // No config: custom element allows any attr
    let config1: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-attr": true }
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
        "rules": { "no-restricted-attr": { "options": { "disallowAttrs": ["x-attr"] } } }
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

/// TS: `[no-restricted-attr-invalid-001]` — disallow attr with enum constraint
#[test]
fn no_restricted_attr_invalid_001() {
    const _ID: &str = "no-restricted-attr-invalid-001";
    let spec = spec();
    // Value "a" not in disallowed enum ["b"] — no violation
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-attr": { "options": { "disallowAttrs": [{ "name": "x-attr", "value": { "enum": ["b"] } }] } } }
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
        "rules": { "no-restricted-attr": { "options": { "disallowAttrs": [{ "name": "x-attr", "value": { "enum": ["a","b","c"] } }] } } }
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

/// TS: `[no-restricted-attr-invalid-002]` — disallow attr with pattern constraint
#[test]
fn no_restricted_attr_invalid_002() {
    const _ID: &str = "no-restricted-attr-invalid-002";
    let spec = spec();
    // Value "a" doesn't match pattern /^a{2,}$/ — no violation
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-attr": { "options": { "disallowAttrs": [{ "name": "x-attr", "value": { "pattern": "/^a{2,}$/" } }] } } }
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

/// TS: `[no-restricted-attr-invalid-003]` — disallow attr with pattern (object form)
#[test]
fn no_restricted_attr_invalid_003() {
    const _ID: &str = "no-restricted-attr-invalid-003";
    let spec = spec();
    // Object form: { "x-attr": { "pattern": ... } }
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-attr": { "options": { "disallowAttrs": { "x-attr": { "pattern": "/^a{2,}$/" } } } } }
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

/// TS: `[no-restricted-attr-invalid-004]` — disallow attr with type constraint
#[test]
fn no_restricted_attr_invalid_004() {
    const _ID: &str = "no-restricted-attr-invalid-004";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-attr": { "options": { "disallowAttrs": [{ "name": "x-attr", "value": "Int" }] } } }
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

/// TS: `[no-restricted-attr-invalid-005]` — custom rule: disallowed
#[test]
fn no_restricted_attr_invalid_005() {
    const _ID: &str = "no-restricted-attr-invalid-005";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-attr": { "options": { "disallowAttrs": ["onclick"] } } }
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

/// TS: `[no-restricted-attr-issue-716-001]` — viewport user-scalable=no violation
#[test]
fn no_restricted_attr_issue_716_001() {
    const _ID: &str = "no-restricted-attr-issue-716-001";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "no-restricted-attr": { "options": {
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

/// TS: `[no-restricted-attr-issue-716-004]` — violation: spaces around = sign
#[test]
fn no_restricted_attr_issue_716_004() {
    const _ID: &str = "no-restricted-attr-issue-716-004";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "no-restricted-attr": { "options": {
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

/// TS: `[no-restricted-attr-issue-716-005]` — no violation: normal viewport
#[test]
fn no_restricted_attr_issue_716_005() {
    const _ID: &str = "no-restricted-attr-issue-716-005";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "no-restricted-attr": { "options": {
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

/// TS: `[no-restricted-attr-issue-716-008]` — non-viewport meta is not affected
#[test]
fn no_restricted_attr_issue_716_008() {
    const _ID: &str = "no-restricted-attr-issue-716-008";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "no-restricted-attr": { "options": {
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

/// TS: `[no-restricted-attr-issue-716-002]` — viewport user-scalable=0 violation
#[test]
fn no_restricted_attr_issue_716_002() {
    const _ID: &str = "no-restricted-attr-issue-716-002";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "no-restricted-attr": { "options": {
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

/// TS: `[no-restricted-attr-issue-716-003]` — viewport user-scalable=NO (case insensitive)
#[test]
fn no_restricted_attr_issue_716_003() {
    const _ID: &str = "no-restricted-attr-issue-716-003";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "no-restricted-attr": { "options": {
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

/// TS: `[no-restricted-attr-issue-716-006]` — no violation: user-scalable=yes
#[test]
fn no_restricted_attr_issue_716_006() {
    const _ID: &str = "no-restricted-attr-issue-716-006";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "no-restricted-attr": { "options": {
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

/// TS: `[no-restricted-attr-issue-716-007]` — no violation: user-scalable=1
#[test]
fn no_restricted_attr_issue_716_007() {
    const _ID: &str = "no-restricted-attr-issue-716-007";
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-restricted-attr": true },
        "nodeRules": [{
            "selector": "meta[name='viewport' i]",
            "rules": { "no-restricted-attr": { "options": {
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
