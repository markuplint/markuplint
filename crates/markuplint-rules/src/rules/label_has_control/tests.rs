//! Tests for `label-has-control` rule.
//!
//! Test ID mapping (TS → Rust):
//!   label-has-control-invalid-001  → label_has_control_invalid_001
//!   label-has-control-invalid-002  → label_has_control_invalid_002
//!   label-has-control-valid-001    — SKIP: `as` attribute (pretenders) not available in Rust
//!   label-has-control-issue-2392   — SKIP: JSX parser + pretenders

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
