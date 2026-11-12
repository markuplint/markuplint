//! TS `Violation#specConformance`: a named rule group, and a named node rule, declare the conformance
//! level of what they report (`"specConformance": "non-normative"`), which a consumer prints after the
//! message (`[non-normative]`). The violation carries it, as the rule that made it declares it.
//!
//! Test ID mapping (Rust-only):
//!   v6_spec_conformance_001  — a named rule group with one rule
//!   v6_spec_conformance_002  — a named rule group with more than one rule
//!   v6_spec_conformance_003  — a named node rule
//!   v6_spec_conformance_004  — nothing is declared, or the rule is not named
//!   v6_spec_conformance_005  — the rules of a named node rule report in the order they are written

use serde_json::json;

use crate::lint::{LintConfig, lint};
use crate::test_util::{html_arena, spec};
use crate::violation::Violation;

fn linted(html: &str, config: serde_json::Value) -> Vec<Violation> {
    let config: LintConfig = serde_json::from_value(config).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

fn conformances(violations: &[Violation]) -> Vec<(Option<&str>, Option<&str>)> {
    violations
        .iter()
        .map(|v| (v.name.as_deref(), v.spec_conformance.as_deref()))
        .collect()
}

#[test]
fn v6_spec_conformance_001_group_with_one_rule() {
    let violations = linted(
        r#"<body accesskey="x"></body>"#,
        json!({
            "rules": {
                "a11y/no-accesskey": {
                    "specConformance": "non-normative",
                    "rules": { "no-restricted-attr": { "options": { "disallowAttrs": ["accesskey"] } } }
                }
            }
        }),
    );

    assert_eq!(
        conformances(&violations),
        [(Some("a11y/no-accesskey"), Some("non-normative"))]
    );
}

#[test]
fn v6_spec_conformance_002_group_with_more_than_one_rule() {
    let violations = linted(
        r#"<div class="INVALID" id="a" id="b"></div>"#,
        json!({
            "rules": {
                "custom/multi": {
                    "specConformance": "normative",
                    "rules": { "no-duplicate-attr": true, "class-naming": "/^[a-z]+$/" }
                }
            }
        }),
    );

    let mut found = conformances(&violations);
    found.sort_unstable();
    assert_eq!(
        found,
        [
            (Some("custom/multi/class-naming"), Some("normative")),
            (Some("custom/multi/no-duplicate-attr"), Some("normative")),
        ]
    );
}

#[test]
fn v6_spec_conformance_003_named_node_rule() {
    let violations = linted(
        r#"<div class="INVALID"></div>"#,
        json!({
            "nodeRules": [{
                "name": "custom/div-naming",
                "specConformance": "non-normative",
                "selector": "div",
                "rules": { "class-naming": "/^[a-z]+$/" }
            }]
        }),
    );

    assert_eq!(
        conformances(&violations),
        [(Some("custom/div-naming"), Some("non-normative"))]
    );
}

#[test]
fn v6_spec_conformance_004_nothing_declared_or_not_named() {
    let violations = linted(
        r#"<body accesskey="x" id="a"></body><p id="a"></p>"#,
        json!({
            "rules": {
                "no-duplicate-id": true,
                "a11y/no-accesskey": {
                    "rules": { "no-restricted-attr": { "options": { "disallowAttrs": ["accesskey"] } } }
                }
            }
        }),
    );

    assert!(violations.len() >= 2);
    assert!(violations.iter().all(|v| v.spec_conformance.is_none()));
}

#[test]
fn v6_spec_conformance_005_rules_of_a_named_node_rule_report_in_the_order_they_are_written() {
    // TS reads the rules of an entry in the order of the config; a map that has no order would give
    // another one from run to run.
    let violations = linted(
        r#"<div class="INVALID" id="a" id="b"></div>"#,
        json!({
            "nodeRules": [{
                "name": "custom/div",
                "specConformance": "normative",
                "selector": "div",
                "rules": { "no-duplicate-attr": true, "class-naming": "/^[a-z]+$/" }
            }]
        }),
    );

    let names: Vec<_> = violations.iter().map(|v| v.name.as_deref()).collect();
    assert_eq!(
        names,
        [Some("custom/div/no-duplicate-attr"), Some("custom/div/class-naming")]
    );
}
