//! Tests for `require-landmark-label` rule.
//!
//! Test ID mapping (TS → Rust):
//!   require-landmark-label-valid-001    → require_landmark_label_valid_001
//!   require-landmark-label-invalid-001  → require_landmark_label_invalid_001
//!   v6_require_landmark_label_001  — Rust-only: an element counted twice for one role is reported once
//!   v6_require_landmark_label_002  — Rust-only: what counts as a label
//!   v6_require_landmark_label_003  — Rust-only: which elements are landmarks of each role
//!   v6_require_landmark_label_004  — Rust-only: per-node `rules: false`; `ignoreRoles` is not this rule's option
//!   v6_require_landmark_label_005  — Rust-only: the `role` value is case-sensitive, the tag name is not
//!   v6_require_landmark_label_006  — Rust-only: fragments, single landmarks and `rules: false`
//!
//! Violations are asserted in the engine's line/column order; TS `mlRuleTest` reports them in
//! role-then-match order, which can differ for the Rust-only inputs.

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
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

fn run_config(html: &str, config: serde_json::Value) -> Vec<Violation> {
    let arena = html_arena(html);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(config).unwrap();
    lint(&arena, &spec, &config).violations
}

fn run(html: &str) -> Vec<Violation> {
    run_config(html, serde_json::json!({ "rules": { "require-landmark-label": true } }))
}

/// Asserts each violation's `(line, col, raw)` in order.
fn assert_unlabelled(violations: &[Violation], expected: &[(u32, u32, &str)]) {
    assert_eq!(violations.len(), expected.len(), "{violations:?}");
    for (v, &(line, col, raw)) in violations.iter().zip(expected) {
        assert_eq!(v.rule_id, "require-landmark-label");
        assert_eq!(v.severity, Severity::Warning);
        assert_eq!(v.message, "Require unique accessible name");
        assert_eq!(v.line, line);
        assert_eq!(v.col, col);
        assert_eq!(v.raw, raw);
    }
}

/// TS: `[require-landmark-label-valid-001]` Duplicated area: has-label
#[test]
fn require_landmark_label_valid_001() {
    const _ID: &str = "require-landmark-label-valid-001";
    let violations = run(
        "\n<html>\n<body>\n\t<header></header>\n\t<nav aria-label=\"main\"></nav>\n\t<main>\n\t\t<header></header>\n\t\t<nav aria-label=\"sub\"></nav>\n\t\t<footer></footer>\n\t</main>\n\t<footer></footer>\n</body>\n</html>\n",
    );
    assert!(violations.is_empty(), "{violations:?}");
}

/// TS: `[require-landmark-label-invalid-001]` Duplicated area: no-label
#[test]
fn require_landmark_label_invalid_001() {
    const _ID: &str = "require-landmark-label-invalid-001";
    let violations = run(
        "\n<html>\n<body>\n\t<header></header>\n\t<nav></nav>\n\t<main>\n\t\t<header></header>\n\t\t<nav></nav>\n\t\t<footer></footer>\n\t</main>\n\t<footer></footer>\n</body>\n</html>\n",
    );
    assert_unlabelled(&violations, &[(5, 2, "<nav>"), (8, 3, "<nav>")]);
}

/// Rust-only: `<header role="banner">` matches `[role="banner"]` and is also added as a top-level
/// `<header>`, so the banner list holds it twice and counts as duplicated; the two identical
/// reports collapse into one. Expected values are the TS output.
#[test]
fn v6_require_landmark_label_001() {
    let violations = run("<html><body><header role=\"banner\"></header></body></html>");
    assert_unlabelled(&violations, &[(1, 13, "<header role=\"banner\">")]);
}

/// Rust-only: `aria-labelledby` counts only when the landmark contains a heading, while
/// `aria-label` counts whenever present, even empty or upper-cased. Expected values are the TS
/// output.
#[test]
fn v6_require_landmark_label_002() {
    let violations = run(
        "<html><body><nav aria-labelledby=\"x\"></nav><nav aria-labelledby=\"y\"><h2 id=\"y\">a</h2></nav></body></html>",
    );
    assert_unlabelled(&violations, &[(1, 13, "<nav aria-labelledby=\"x\">")]);
    assert!(run("<html><body><nav aria-label=\"\"></nav><nav aria-label=\"\"></nav></body></html>").is_empty());
    assert!(run("<html><body><nav ARIA-LABEL=\"a\"></nav><nav aria-label=\"b\"></nav></body></html>").is_empty());
    assert!(
        run("<html><body><nav aria-labelledby=\"\"><h2>x</h2></nav><nav aria-labelledby=\"q\"><svg><h2>y</h2></svg></nav></body></html>")
            .is_empty()
    );
}

/// Rust-only: a top-level `<header>` and `[role="banner"]` are both banners, a `<header>`/`<footer>`
/// in `<article>` is not, `section[title]` is a region, and an unlabelled `<form>` is not a
/// landmark. Expected values are the TS output.
#[test]
fn v6_require_landmark_label_003() {
    let violations = run(
        "<html><body><div role=\"banner\"></div><header></header><article><header></header><footer></footer></article><section aria-label=\"a\"></section><section title=\"b\"></section><form title=\"c\"></form><form></form></body></html>",
    );
    assert_unlabelled(
        &violations,
        &[
            (1, 13, "<div role=\"banner\">"),
            (1, 38, "<header>"),
            (1, 142, "<section title=\"b\">"),
        ],
    );
    let violations = run(
        "<html><body><form aria-label=\"x\"><main></main></form><section><main></main></section><aside><main></main></aside></body></html>",
    );
    assert_unlabelled(&violations, &[(1, 34, "<main>"), (1, 63, "<main>"), (1, 93, "<main>")]);
}

/// Rust-only: a node rule can disable the check for one element without changing the count, and
/// `ignoreRoles` (an option of `no-nested-top-level-landmark`) has no effect here. Expected values
/// are the TS output.
#[test]
fn v6_require_landmark_label_004() {
    let violations = run_config(
        "<html><body><main><main data-x></main></main><main><main></main></main></body></html>",
        serde_json::json!({
            "rules": { "require-landmark-label": true },
            "nodeRules": [{ "selector": "[data-x]", "rules": { "require-landmark-label": false } }]
        }),
    );
    assert_unlabelled(&violations, &[(1, 13, "<main>"), (1, 46, "<main>"), (1, 52, "<main>")]);
    let violations = run_config(
        "<html><body><main><main></main></main></body></html>",
        serde_json::json!({
            "rules": { "require-landmark-label": { "options": { "ignoreRoles": ["main"] } } }
        }),
    );
    assert_unlabelled(&violations, &[(1, 13, "<main>"), (1, 19, "<main>")]);
}

/// Rust-only: `role="MAIN"` is not a main landmark, while `<Main>` is. Expected values are the TS
/// output.
#[test]
fn v6_require_landmark_label_005() {
    let violations = run("<html><body><div role=\"MAIN\"><main></main></div><NAV><Main></Main></NAV></body></html>");
    assert_unlabelled(&violations, &[(1, 30, "<main>"), (1, 54, "<Main>")]);
}

/// Rust-only: a fragment is skipped, a single landmark per role needs no label, and the former
/// `labelEachArea: false` is now `rules: false`. Expected values are the TS output.
#[test]
fn v6_require_landmark_label_006() {
    assert!(run("<nav></nav><nav></nav>").is_empty());
    assert!(run("<html><body><nav></nav><main></main></body></html>").is_empty());
    let violations = run_config(
        "<html><body><nav></nav><nav></nav></body></html>",
        serde_json::json!({ "rules": { "require-landmark-label": false } }),
    );
    assert!(violations.is_empty(), "{violations:?}");
}
