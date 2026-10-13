//! Tests for `no-unsupported-browser-features` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-unsupported-browser-features-valid-003  → no_unsupported_browser_features_valid_003
//!   no-unsupported-browser-features-valid-004  → no_unsupported_browser_features_valid_004
//!   no-unsupported-browser-features-invalid-001..006  — SKIP: need browserslist resolution and BCD, unavailable in Rust
//!   no-unsupported-browser-features-valid-001, -002, -005, -006  — SKIP: set `browserslist`; without BCD they would pass only because the rule never reports
//!   no-unsupported-browser-features-issue-3740-001..003  — SKIP: `pretenders`/JSX parser, and browserslist + BCD

use crate::lint::{LintConfig, lint};
use crate::violation::Violation;
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

fn run_rule(html: &str, rule: serde_json::Value) -> Vec<Violation> {
    let arena = html_arena(html);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-unsupported-browser-features": rule }
    }))
    .unwrap();
    lint(&arena, &spec, &config).violations
}

/// TS: `[no-unsupported-browser-features-valid-003]` no error without browserslist config
#[test]
fn no_unsupported_browser_features_valid_003() {
    const _ID: &str = "no-unsupported-browser-features-valid-003";
    let violations = run_rule("<dialog></dialog>", serde_json::json!(true));
    assert!(violations.is_empty(), "{violations:?}");
}

/// TS: `[no-unsupported-browser-features-valid-004]` no error with empty options
#[test]
fn no_unsupported_browser_features_valid_004() {
    const _ID: &str = "no-unsupported-browser-features-valid-004";
    let violations = run_rule("<dialog></dialog>", serde_json::json!({ "options": {} }));
    assert!(violations.is_empty(), "{violations:?}");
}
