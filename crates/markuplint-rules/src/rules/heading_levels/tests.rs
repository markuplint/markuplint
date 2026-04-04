//! Tests for `heading-levels` rule.
//!
//! Test ID mapping (TS → Rust):
//!   heading-levels-valid-001    → heading_levels_valid_001
//!   heading-levels-invalid-001  → heading_levels_invalid_001
//!   heading-levels-parser-*     — SKIP: Markdown/MDX parsers not available in Rust

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

/// TS: `[heading-levels-valid-001]` — no skipped levels
#[test]
fn heading_levels_valid_001() {
    const _ID: &str = "heading-levels-valid-001";
    let arena = html_arena(
        "\n<h1>...</h1>\n<p>...</p>\n<h2>...</h2>\n<p>...</p>\n<h3>...</h3>\n<p>...</p>\n<h2>...</h2>\n<p>...</p>\n<h3>...</h3>\n<p>...</p>\n<h4>...</h4>\n<p>...</p>\n<h2>...</h2>\n<p>...</p>\n",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "heading-levels": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[heading-levels-invalid-001]` — skipped levels
#[test]
fn heading_levels_invalid_001() {
    const _ID: &str = "heading-levels-invalid-001";
    let arena = html_arena(
        "\n<h1>...</h1>\n<p>...</p>\n<h2>...</h2>\n<p>...</p>\n<h4>...</h4>\n<p>...</p>\n<h2>...</h2>\n<p>...</p>\n<h5>...</h5>\n<p>...</p>\n",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "heading-levels": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 2);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 6);
    assert_eq!(result.violations[0].col, 1);
    assert_eq!(result.violations[0].message, "Heading levels must not be skipped");
    assert_eq!(result.violations[0].raw, "<h4>");
    assert_eq!(result.violations[1].severity, Severity::Error);
    assert_eq!(result.violations[1].line, 10);
    assert_eq!(result.violations[1].col, 1);
    assert_eq!(result.violations[1].message, "Heading levels must not be skipped");
    assert_eq!(result.violations[1].raw, "<h5>");
}
