//! Tests for `require-end-tag` rule.
//!
//! Test ID mapping (TS → Rust):
//!   require-end-tag-valid-001    → require_end_tag_valid_001
//!   require-end-tag-invalid-001  → require_end_tag_invalid_001
//!   require-end-tag-valid-002    → require_end_tag_valid_002
//!   require-end-tag-invalid-002  → require_end_tag_invalid_002
//!   require-end-tag-parser-*     — SKIP: framework parsers (Pug/JSX/Vue/Svelte/Astro)
//!   require-end-tag-issue-1349   — SKIP: Nunjucks parser
//!   v6_require_end_tag_001       — Rust-only: a pretender is foreign by the namespace of the element written

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

/// TS: `[require-end-tag-valid-001]` — basic (two sub-tests)
#[test]
fn require_end_tag_valid_001() {
    const _ID: &str = "require-end-tag-valid-001";
    // Sub-test 1: complete tags → no violations
    let arena = html_arena("<html><body></body></html>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "require-end-tag": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);

    // Sub-test 2: missing </html> → 1 violation
    let arena2 = html_arena("<html><body></body>");
    let result2 = lint(&arena2, &spec, &config);
    assert_eq!(result2.violations.len(), 1);
    assert_eq!(result2.violations[0].severity, Severity::Warning);
    assert_eq!(result2.violations[0].line, 1);
    assert_eq!(result2.violations[0].col, 1);
    assert_eq!(result2.violations[0].message, "Missing the end tag");
    assert_eq!(result2.violations[0].raw, "<html>");
}

/// TS: `[require-end-tag-invalid-001]` — missing end tags on span
#[test]
fn require_end_tag_invalid_001() {
    const _ID: &str = "require-end-tag-invalid-001";
    let arena = html_arena("<div><span><span /></div>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "require-end-tag": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 2);
    assert_eq!(result.violations[0].severity, Severity::Warning);
    assert_eq!(result.violations[0].line, 1);
    assert_eq!(result.violations[0].col, 6);
    assert_eq!(result.violations[0].message, "Missing the end tag");
    assert_eq!(result.violations[0].raw, "<span>");
    assert_eq!(result.violations[1].severity, Severity::Warning);
    assert_eq!(result.violations[1].line, 1);
    assert_eq!(result.violations[1].col, 12);
    assert_eq!(result.violations[1].message, "Missing the end tag");
    assert_eq!(result.violations[1].raw, "<span />");
}

/// TS: `[require-end-tag-valid-002]` — void elements (img)
#[test]
fn require_end_tag_valid_002() {
    const _ID: &str = "require-end-tag-valid-002";
    let arena = html_arena("<div><img><img /></div>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "require-end-tag": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// TS: `[require-end-tag-invalid-002]` — SVG self-closing is OK
#[test]
fn require_end_tag_invalid_002() {
    const _ID: &str = "require-end-tag-invalid-002";
    // SVG with self-closing <circle /> and <circle></circle> — both OK
    let arena = html_arena(
        "<svg>\n\t<defs>\n\t\t<clipPath>\n\t\t\t<circle />\n\t\t\t<circle></circle>\n\t\t</clipPath>\n\t</defs>\n</svg>",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "require-end-tag": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// Rust-only: TS lets a foreign element self-close by the namespace of the element as
/// written, so a component pretending to be an SVG `rect` still needs its end tag; the void
/// check reads the pretender name. Expected values from the TS rule.
#[test]
fn v6_require_end_tag_001() {
    let run = |html: &str, pretenders: serde_json::Value| {
        crate::test_util::lint_brief(
            "require-end-tag",
            html,
            serde_json::json!({ "rules": { "require-end-tag": true }, "pretenders": pretenders }),
        )
    };
    assert_eq!(
        run(
            "<div><x-rect/></div>",
            serde_json::json!([{ "selector": "x-rect", "as": { "element": "rect", "namespace": "svg" } }])
        ),
        [crate::test_util::brief(
            crate::violation::Severity::Warning,
            1,
            6,
            "Missing the end tag",
            "<x-rect/>"
        )]
    );
    assert_eq!(
        run("<x-img>", serde_json::json!([{ "selector": "x-img", "as": "img" }])),
        []
    );
}
