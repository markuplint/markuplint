//! Tests for `require-doctype` rule.
//!
//! Test ID mapping (TS → Rust):
//!   require-doctype-001  → require_doctype_001
//!   require-doctype-002  → require_doctype_002
//!   require-doctype-003  → require_doctype_003
//!   require-doctype-004  → require_doctype_004

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

fn run(html: &str) -> Vec<crate::violation::Violation> {
    let arena = html_arena(html);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "require-doctype": true }
    }))
    .unwrap();
    lint(&arena, &spec, &config).violations
}

/// TS: `[require-doctype-001]`
#[test]
fn require_doctype_001() {
    const _ID: &str = "require-doctype-001";
    let violations = run("\n\t\t<!doctype html>\n\t\t<html></html>\n\t\t");
    assert_eq!(violations.len(), 0);
}

/// TS: `[require-doctype-002]`
#[test]
fn require_doctype_002() {
    const _ID: &str = "require-doctype-002";
    let violations = run("<html></html>");
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].rule_id, "require-doctype");
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(violations[0].message, "Require doctype");
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 1);
    assert_eq!(violations[0].raw, "");
}

/// TS: `[require-doctype-003]`
#[test]
fn require_doctype_003() {
    const _ID: &str = "require-doctype-003";
    let violations = run("<div></div>");
    assert_eq!(violations.len(), 0);
}

/// TS: `[require-doctype-004]`
#[test]
fn require_doctype_004() {
    const _ID: &str = "require-doctype-004";
    let violations = run(
        "\n\t\t<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01//EN\" \"http://www.w3.org/TR/html4/strict.dtd\">\n\t\t<div></div>\n\t\t",
    );
    assert_eq!(violations.len(), 0);
}
