//! Tests for `label-has-control` rule.
//!
//! Test ID mapping (TS → Rust):
//!   label-has-control-invalid-001  → label_has_control_invalid_001
//!   label-has-control-invalid-002  → label_has_control_invalid_002
//!   label-has-control-valid-004    → label_has_control_valid_004
//!   v6_label_has_control_001       — Rust-only: label-has-control-issue-2392 (JSX) with custom elements
//!   v6_label_has_control_002       — Rust-only: an empty label with the `as` attribute is reported

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

/// TS: `[label-has-control-invalid-001]` — No control
#[test]
fn label_has_control_invalid_001() {
    const _ID: &str = "label-has-control-invalid-001";
    let arena = html_arena("<label>foo</label>");
    let spec = spec();
    // a11y category → default severity warning
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "label-has-control": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Warning);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 1);
    assert_eq!(result.violations[0].raw, "<label>");
    assert_eq!(
        result.violations[0].message,
        "The \"label\" element should associate with a control"
    );
}

/// TS: `[label-has-control-invalid-002]` — Not single control
#[test]
fn label_has_control_invalid_002() {
    const _ID: &str = "label-has-control-invalid-002";
    let arena = html_arena("<label><input><select></select></label>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "label-has-control": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Warning);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 15);
    assert_eq!(result.violations[0].raw, "<select>");
    assert_eq!(
        result.violations[0].message,
        "The \"label\" element associates only first control"
    );
}

fn run_pretended(html: &str, pretenders: serde_json::Value) -> Vec<crate::test_util::Brief> {
    crate::test_util::lint_brief(
        "label-has-control",
        html,
        serde_json::json!({ "rules": { "label-has-control": true }, "pretenders": pretenders }),
    )
}

/// TS: `[label-has-control-valid-004]` — The `as` attribute makes descendants known, and a
/// single control is associated
#[test]
fn label_has_control_valid_004() {
    const _ID: &str = "label-has-control-valid-004";
    assert_eq!(
        run_pretended(r#"<x-label as="label"><input></x-label>"#, serde_json::json!([])),
        []
    );
}

/// TS `[label-has-control-issue-2392]`: a label pretended by a pretender (no `as`
/// attribute) has unknown descendants, so it is not checked.
#[test]
fn v6_label_has_control_001() {
    let label = serde_json::json!([{ "selector": "x-c", "as": { "element": "label", "inheritAttrs": true } }]);
    assert_eq!(run_pretended("<x-c></x-c>", label), []);
    let bare = serde_json::json!([{ "selector": "x-label", "as": "label" }]);
    assert_eq!(run_pretended("<x-label></x-label>", bare.clone()), []);
    assert_eq!(run_pretended("<x-label><input></x-label>", bare), []);
}

/// TS: with the `as` attribute the descendants are the ones written, so an empty label
/// is reported.
#[test]
fn v6_label_has_control_002() {
    assert_eq!(
        run_pretended(r#"<x-label as="label"></x-label>"#, serde_json::json!([])),
        [crate::test_util::brief(
            Severity::Warning,
            1,
            1,
            "The \"label\" element should associate with a control",
            r#"<x-label as="label">"#
        )]
    );
}
