//! #4222: every place that reads a selector from the spec or the config reports one the
//! parser rejects. Each test breaks one input and fails if that site goes back to dropping
//! it silently.
//!
//! Test ID mapping (Rust-only):
//!   v6_lint_diagnostics_010  — `require-ancestor`: spec `descendantOf`
//!   v6_lint_diagnostics_011  — `no-disallowed-ancestor`: spec `forbiddenAncestors`
//!   v6_lint_diagnostics_012  — `no-ineffective-attr`: spec `ineffective`
//!   v6_lint_diagnostics_013  — ARIA resolution: spec `aria.conditions`
//!   v6_lint_diagnostics_014  — `require-element`: config selector
//!   v6_lint_diagnostics_015  — `no-restricted-element`: config selector
//!   v6_lint_diagnostics_016  — `head-element-order`: config selector
//!   v6_lint_diagnostics_017  — pretenders: config selector

use serde_json::Value;

use crate::lint::{LintConfig, lint};
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

const SPEC_JSON: &str = include_str!("../../../packages/@markuplint/html-spec/index.json");

fn spec_with(edit: impl FnOnce(&mut Value)) -> MLMLSpec {
    let mut json: Value = serde_json::from_str(SPEC_JSON).unwrap();
    edit(&mut json);
    load_spec(&json.to_string()).unwrap()
}

fn element_spec<'a>(json: &'a mut Value, name: &str) -> &'a mut Value {
    json["specs"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|s| s["name"] == name)
        .unwrap()
}

type Reported = (Option<String>, String, String);

/// `(rule id, origin, selector)` of what `lint` reported.
fn reported(html: &str, spec: &MLMLSpec, config: Value) -> Vec<Reported> {
    let arena = crate::test_util::html_arena(html);
    let config: LintConfig = serde_json::from_value(config).unwrap();
    lint(&arena, spec, &config)
        .diagnostics
        .into_iter()
        .map(|d| (d.rule_id, d.origin, d.selector))
        .collect()
}

fn entry(rule: Option<&str>, origin: &str, selector: &str) -> Reported {
    (rule.map(str::to_string), origin.to_string(), selector.to_string())
}

#[test]
fn v6_lint_diagnostics_010() {
    let spec = spec_with(|j| element_spec(j, "area")["contentModel"]["descendantOf"] = "map:bad(".into());
    let got = reported(
        "<area>",
        &spec,
        serde_json::json!({ "rules": { "require-ancestor": true } }),
    );
    assert_eq!(
        got,
        vec![entry(
            Some("require-ancestor"),
            "spec content model descendantOf",
            "map:bad("
        )]
    );
}

#[test]
fn v6_lint_diagnostics_011() {
    let spec = spec_with(|j| {
        element_spec(j, "address")["contentModel"]["forbiddenAncestors"] = serde_json::json!(["address:bad("]);
    });
    let got = reported(
        "<address></address>",
        &spec,
        serde_json::json!({ "rules": { "no-disallowed-ancestor": true } }),
    );
    assert_eq!(
        got,
        vec![entry(
            Some("no-disallowed-ancestor"),
            "spec content model forbiddenAncestors",
            "address:bad("
        )]
    );
}

#[test]
fn v6_lint_diagnostics_012() {
    let spec = spec_with(|j| {
        element_spec(j, "iframe")["attributes"]["src"]["ineffective"] = serde_json::json!(["iframe:bad("]);
    });
    let got = reported(
        r#"<iframe src="a"></iframe>"#,
        &spec,
        serde_json::json!({ "rules": { "no-ineffective-attr": true } }),
    );
    assert_eq!(
        got,
        vec![entry(
            Some("no-ineffective-attr"),
            "spec attribute ineffective condition",
            "iframe:bad("
        )]
    );
}

#[test]
fn v6_lint_diagnostics_013() {
    let spec = spec_with(|j| {
        element_spec(j, "a")["aria"]["conditions"][":bad("] = serde_json::json!({});
    });
    let got = reported(
        r#"<a href="/" role="link">x</a>"#,
        &spec,
        serde_json::json!({ "rules": { "no-redundant-role": true } }),
    );
    assert!(
        got.iter()
            .any(|(_, origin, selector)| origin == "spec ARIA condition" && selector == ":bad("),
        "{got:?}"
    );
}

#[test]
fn v6_lint_diagnostics_014() {
    let got = reported(
        "<div></div>",
        &spec_with(|_| {}),
        serde_json::json!({ "rules": { "require-element": ["main:bad("] } }),
    );
    assert_eq!(
        got,
        vec![entry(
            Some("require-element"),
            "config require-element selector",
            "main:bad("
        )]
    );
}

#[test]
fn v6_lint_diagnostics_015() {
    let got = reported(
        "<div></div>",
        &spec_with(|_| {}),
        serde_json::json!({ "rules": { "no-restricted-element": ["div:bad("] } }),
    );
    assert_eq!(
        got,
        vec![entry(
            Some("no-restricted-element"),
            "config no-restricted-element selector",
            "div:bad("
        )]
    );
}

#[test]
fn v6_lint_diagnostics_016() {
    let got = reported(
        "<!doctype html><html><head><title>a</title><meta charset=\"utf-8\"></head><body></body></html>",
        &spec_with(|_| {}),
        serde_json::json!({ "rules": { "head-element-order": ["meta:bad(", "title"] } }),
    );
    assert_eq!(
        got,
        vec![entry(
            Some("head-element-order"),
            "config head-element-order selector",
            "meta:bad("
        )]
    );
}

#[test]
fn v6_lint_diagnostics_017() {
    let got = reported(
        "<x-foo></x-foo>",
        &spec_with(|_| {}),
        serde_json::json!({ "pretenders": [{ "selector": "x-foo:bad(", "as": "div" }] }),
    );
    assert_eq!(got, vec![entry(None, "config pretenders selector", "x-foo:bad(")]);
}
