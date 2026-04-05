//! Tests for `character-reference` rule.
//!
//! Test ID mapping (TS → Rust):
//!   character-reference-invalid-001  → character_reference_invalid_001
//!   character-reference-invalid-002  → character_reference_invalid_002
//!   character-reference-valid-001    → character_reference_valid_001
//!   character-reference-parser-*     — SKIP: framework parsers not available in Rust
//!   character-reference-issue-1575   → character_reference_issue_1575
//!   character-reference-issue-1074   → character_reference_issue_1074

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

/// TS: `[character-reference-invalid-001]`
/// Input: `<div id="a"> > < & " ' &amp;</div>`
/// Expect: 4 violations (>, <, &, ")
#[test]
fn character_reference_invalid_001() {
    const _ID: &str = "character-reference-invalid-001";
    let arena = html_arena(r#"<div id="a"> > < & " ' &amp;</div>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "character-reference": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 4);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(
        result.violations[0].message,
        "Illegal characters must escape in character reference"
    );
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 14);
    assert_eq!(result.violations[0].raw, ">");
    assert_eq!(result.violations[1].col, 16);
    assert_eq!(result.violations[1].raw, "<");
    assert_eq!(result.violations[2].col, 18);
    assert_eq!(result.violations[2].raw, "&");
    assert_eq!(result.violations[3].col, 20);
    assert_eq!(result.violations[3].raw, "\"");
}

/// TS: `[character-reference-invalid-002]`
/// Input: `<img src="path/to?a=b&c=d">`
/// Expect: 1 violation (& at col 22)
#[test]
fn character_reference_invalid_002() {
    const _ID: &str = "character-reference-invalid-002";
    let arena = html_arena(r#"<img src="path/to?a=b&c=d">"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "character-reference": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(
        result.violations[0].message,
        "Illegal characters must escape in character reference"
    );
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 22);
    assert_eq!(result.violations[0].raw, "&");
}

/// TS: `[character-reference-valid-001]`
/// Input: `<script>if (i < 0) console.log("<markuplint>");</script>`
/// Expect: 0 violations (script content is exempt)
#[test]
fn character_reference_valid_001() {
    const _ID: &str = "character-reference-valid-001";
    let arena = html_arena(r#"<script>if (i < 0) console.log("<markuplint>");</script>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "character-reference": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[character-reference-issue-1575]` — no false positive on orphaned end tag
#[test]
fn character_reference_issue_1575() {
    const _ID: &str = "character-reference-issue-1575";
    let arena = html_arena("<div></p></div>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "character-reference": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[character-reference-issue-1074]` — numeric/hex refs valid, invalid & reported
#[test]
fn character_reference_issue_1074() {
    const _ID: &str = "character-reference-issue-1074";
    let arena = html_arena("<span>&#9660;</span><span>&#x25BC;</span><span>&x25BC;</span>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "character-reference": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 48);
    assert_eq!(result.violations[0].raw, "&");
}
