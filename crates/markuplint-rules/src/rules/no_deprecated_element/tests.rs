//! Tests for `no-deprecated-element` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-deprecated-element-valid-001  → no_deprecated_element_valid_001
//!   no-deprecated-element-valid-002  → no_deprecated_element_valid_002
//!   v6_no_deprecated_element_001     — Rust-only: an element the spec marks deprecated is reported
//!   v6_no_deprecated_element_002     — Rust-only: deprecated MathML elements are outside the namespace guard

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

fn run_with_spec(html: &str, spec: &MLMLSpec) -> Vec<crate::violation::Violation> {
    let arena = html_arena(html);
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-deprecated-element": true }
    }))
    .unwrap();
    lint(&arena, spec, &config).violations
}

fn run(html: &str) -> Vec<crate::violation::Violation> {
    run_with_spec(html, &spec())
}

/// TS: `[no-deprecated-element-valid-001]`
#[test]
fn no_deprecated_element_valid_001() {
    const _ID: &str = "no-deprecated-element-valid-001";
    let violations = run("<div></div><p><span></span></p>");
    assert_eq!(violations.len(), 0);
}

/// TS: `[no-deprecated-element-valid-002]`
#[test]
fn no_deprecated_element_valid_002() {
    const _ID: &str = "no-deprecated-element-valid-002";
    let violations = run("<font></font><big><blink></blink></big>");
    assert_eq!(violations.len(), 0);
}

/// Rust-only: no HTML or SVG element in the spec data is deprecated, so the spec is
/// extended to mark `div` deprecated. Expected values from the TS rule run with the
/// same extension (`specs` config pointing at `{ specs: [{ name: 'div', deprecated: true }] }`).
#[test]
fn v6_no_deprecated_element_001() {
    let mut spec = spec();
    spec.specs
        .iter_mut()
        .find(|el| el.name == "div")
        .expect("div spec")
        .deprecated = Some(true);
    let violations = run_with_spec("<div></div><p><span></span></p>", &spec);
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].rule_id, "no-deprecated-element");
    assert_eq!(violations[0].severity, Severity::Warning);
    assert_eq!(violations[0].message, "The \"div\" element is deprecated");
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 1);
    assert_eq!(violations[0].raw, "<div>");
}

/// Rust-only: `mml:mfenced` and `mml:maction` are deprecated in the spec data, but MathML
/// elements are outside the rule's HTML/SVG namespace guard. Expected values from the TS rule.
#[test]
fn v6_no_deprecated_element_002() {
    let violations = run("<math><mfenced></mfenced><maction></maction></math>");
    assert_eq!(violations.len(), 0);
}
