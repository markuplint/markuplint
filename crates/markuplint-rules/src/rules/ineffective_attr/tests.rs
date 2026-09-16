//! Tests for `ineffective-attr` rule.
//!
//! Test ID mapping (TS → Rust):
//!   ineffective-attr-invalid-001  → ineffective_attr_invalid_001
//!   ineffective-attr-invalid-002  — removed on both sides (see the note below)
//!   ineffective-attr-fix-*        — SKIP: auto-fix not implemented in Rust

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

/// TS: `[ineffective-attr-invalid-001]` — script[defer] without src
#[test]
fn ineffective_attr_invalid_001() {
    const _ID: &str = "ineffective-attr-invalid-001";
    let arena = html_arena(r#"<script defer>const foo = "foo";</script>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "ineffective-attr": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Warning);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 9);
    assert_eq!(
        result.violations[0].message,
        "The \"defer\" attribute is ineffective. It doesn't need the attribute"
    );
    assert_eq!(result.violations[0].raw, "defer");
}

// `ineffective-attr-invalid-002` (defer on type=module) was removed here for the same
// reason as on the TS side: HTML LS §4.12.1 ("Module scripts ... must not specify the
// defer attribute") landed in `spec.script.jsonc`, so module+defer is disallowed rather
// than ineffective, and `invalid_attr_issue_3631_006` covers it. The numbering gap is
// intentional; do not renumber later tests.
