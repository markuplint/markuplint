//! Tests for `no-nested-top-level-landmark` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-nested-top-level-landmark-valid-001    → no_nested_top_level_landmark_valid_001
//!   no-nested-top-level-landmark-valid-002    → no_nested_top_level_landmark_valid_002
//!   no-nested-top-level-landmark-valid-003    → no_nested_top_level_landmark_valid_003
//!   no-nested-top-level-landmark-valid-004    → no_nested_top_level_landmark_valid_004
//!   no-nested-top-level-landmark-invalid-001  → no_nested_top_level_landmark_invalid_001
//!   no-nested-top-level-landmark-valid-005    → no_nested_top_level_landmark_valid_005
//!     (the Rust DOM has no `as` resolution, but `complementary` is not a checked role, so the
//!     expectation holds whether or not `<x-aside as="aside">` resolves to `<aside>`)
//!   v6_no_nested_top_level_landmark_001  — Rust-only: a nested `[role="banner"]` is reported, a top-level `[role="contentinfo"]` is not
//!   v6_no_nested_top_level_landmark_002  — Rust-only: which ancestors count as landmarks
//!   v6_no_nested_top_level_landmark_003  — Rust-only: `<header>`/`<footer>` in sectioning content are not banner/contentinfo
//!   v6_no_nested_top_level_landmark_004  — Rust-only: per-node `rules: false` and per-node `ignoreRoles`
//!   v6_no_nested_top_level_landmark_005  — Rust-only: the `role` value is case-sensitive, the tag name is not
//!   v6_no_nested_top_level_landmark_006  — Rust-only: fragments, and roles that are not checked
//!   v6_no_nested_top_level_landmark_007  — Rust-only: global `ignoreRoles`

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
    run_config(
        html,
        serde_json::json!({ "rules": { "no-nested-top-level-landmark": true } }),
    )
}

/// Asserts each violation's `(line, col, role, raw)` in order.
fn assert_nested(violations: &[Violation], expected: &[(u32, u32, &str, &str)]) {
    assert_eq!(violations.len(), expected.len(), "{violations:?}");
    for (v, &(line, col, role, raw)) in violations.iter().zip(expected) {
        assert_eq!(v.rule_id, "no-nested-top-level-landmark");
        assert_eq!(v.severity, Severity::Warning);
        assert_eq!(v.message, format!("The \"{role}\" role should be top level"));
        assert_eq!(v.line, line);
        assert_eq!(v.col, col);
        assert_eq!(v.raw, raw);
    }
}

const NESTED_ASIDE: &str = "\n<html>\n<body>\n\t<header></header>\n\t<nav></nav>\n\t<main>\n\t\t<header></header>\n\t\t<footer></footer>\n\t\t<aside></aside>\n\t</main>\n\t<footer></footer>\n</body>\n</html>\n";

/// TS: `[no-nested-top-level-landmark-valid-001]` No warning
#[test]
fn no_nested_top_level_landmark_valid_001() {
    const _ID: &str = "no-nested-top-level-landmark-valid-001";
    let violations = run(
        "\n<html>\n<body>\n\t<header></header>\n\t<nav></nav>\n\t<main>\n\t\t<header></header>\n\t\t<footer></footer>\n\t</main>\n\t<aside></aside>\n\t<footer></footer>\n</body>\n</html>\n",
    );
    assert!(violations.is_empty(), "{violations:?}");
}

/// TS: `[no-nested-top-level-landmark-valid-002]` Top level landmarks
#[test]
fn no_nested_top_level_landmark_valid_002() {
    const _ID: &str = "no-nested-top-level-landmark-valid-002";
    // `complementary` is deliberately not one of this rule's checked top-level roles, so a
    // nested `<aside>` here is not reported.
    let violations = run(NESTED_ASIDE);
    assert!(violations.is_empty(), "{violations:?}");
}

/// TS: `[no-nested-top-level-landmark-valid-003]` Top level landmarks: disabled
#[test]
fn no_nested_top_level_landmark_valid_003() {
    const _ID: &str = "no-nested-top-level-landmark-valid-003";
    let violations = run_config(
        NESTED_ASIDE,
        serde_json::json!({
            "rules": { "no-nested-top-level-landmark": true },
            "nodeRules": [{ "selector": "aside", "rules": { "no-nested-top-level-landmark": false } }]
        }),
    );
    assert!(violations.is_empty(), "{violations:?}");
}

/// TS: `[no-nested-top-level-landmark-valid-004]` Top level landmarks: ignoreRoles option
#[test]
fn no_nested_top_level_landmark_valid_004() {
    const _ID: &str = "no-nested-top-level-landmark-valid-004";
    let violations = run_config(
        NESTED_ASIDE,
        serde_json::json!({
            "rules": { "no-nested-top-level-landmark": { "options": { "ignoreRoles": ["complementary"] } } }
        }),
    );
    assert!(violations.is_empty(), "{violations:?}");
}

/// TS: `[no-nested-top-level-landmark-invalid-001]` nested main is flagged
#[test]
fn no_nested_top_level_landmark_invalid_001() {
    const _ID: &str = "no-nested-top-level-landmark-invalid-001";
    let violations = run(
        "\n<html>\n<body>\n\t<header></header>\n\t<nav></nav>\n\t<main>\n\t\t<header></header>\n\t\t<footer></footer>\n\t\t<main></main>\n\t</main>\n</body>\n</html>\n",
    );
    assert_nested(&violations, &[(9, 3, "main", "<main>")]);
}

/// TS: `[no-nested-top-level-landmark-valid-005]` The `as` attribute
#[test]
fn no_nested_top_level_landmark_valid_005() {
    const _ID: &str = "no-nested-top-level-landmark-valid-005";
    let violations =
        run("\n<html>\n<body>\n\t<main>\n\t\t<x-aside as=\"aside\"></x-aside>\n\t</main>\n</body>\n</html>\n");
    assert!(violations.is_empty(), "{violations:?}");
}

/// Rust-only: `<header role="banner">` inside `<main>` is a banner by its `role`, and nested.
/// Expected values are the TS output.
#[test]
fn v6_no_nested_top_level_landmark_001() {
    let violations = run(
        "<html><body><footer role=\"contentinfo\"></footer><main><header role=\"banner\"></header></main></body></html>",
    );
    assert_nested(&violations, &[(1, 55, "banner", "<header role=\"banner\">")]);
}

/// Rust-only: a labelled `<form>` and an `<aside>` are landmarks, an unlabelled `<section>` is not,
/// and `<nav>` is a landmark ancestor too. Expected values are the TS output.
#[test]
fn v6_no_nested_top_level_landmark_002() {
    let violations = run(
        "<html><body><form aria-label=\"x\"><main></main></form><section><main></main></section><aside><main></main></aside></body></html>",
    );
    assert_nested(&violations, &[(1, 34, "main", "<main>"), (1, 93, "main", "<main>")]);
    let violations = run(
        "<html><body><nav><header role=\"banner\"></header></nav><main><div role=\"main\"></div></main></body></html>",
    );
    assert_nested(
        &violations,
        &[
            (1, 18, "banner", "<header role=\"banner\">"),
            (1, 61, "main", "<div role=\"main\">"),
        ],
    );
}

/// Rust-only: a `<footer>` inside `<nav>` or a labelled `<section>` is not a contentinfo landmark,
/// but `[role="contentinfo"]` there is. Expected values are the TS output.
#[test]
fn v6_no_nested_top_level_landmark_003() {
    let violations = run(
        "<html><body><main><main></main><nav><footer></footer></nav></main><section aria-label=\"s\"><footer></footer><div role=\"contentinfo\"></div></section></body></html>",
    );
    assert_nested(
        &violations,
        &[
            (1, 19, "main", "<main>"),
            (1, 108, "contentinfo", "<div role=\"contentinfo\">"),
        ],
    );
}

/// Rust-only: `el.rule` is the per-node config, so a node rule can disable the check or set
/// `ignoreRoles` for one element. Expected values are the TS output.
#[test]
fn v6_no_nested_top_level_landmark_004() {
    let violations = run_config(
        "<html><body><main><main data-x></main></main><main><main></main></main></body></html>",
        serde_json::json!({
            "rules": { "no-nested-top-level-landmark": true },
            "nodeRules": [{ "selector": "[data-x]", "rules": { "no-nested-top-level-landmark": false } }]
        }),
    );
    assert_nested(&violations, &[(1, 52, "main", "<main>")]);
    let violations = run_config(
        "<html><body><main><main data-x></main><div role=\"banner\"></div></main></body></html>",
        serde_json::json!({
            "rules": { "no-nested-top-level-landmark": true },
            "nodeRules": [{
                "selector": "[data-x]",
                "rules": { "no-nested-top-level-landmark": { "options": { "ignoreRoles": ["main"] } } }
            }]
        }),
    );
    assert_nested(&violations, &[(1, 39, "banner", "<div role=\"banner\">")]);
}

/// Rust-only: `[role="main"]` does not match `role="MAIN"`, while `main` and `nav` match any tag
/// case. Expected values are the TS output.
#[test]
fn v6_no_nested_top_level_landmark_005() {
    let violations = run("<html><body><div role=\"MAIN\"><main></main></div><NAV><Main></Main></NAV></body></html>");
    assert_nested(&violations, &[(1, 54, "main", "<Main>")]);
}

/// Rust-only: a fragment is skipped, and `navigation` is not a checked role. Expected values are
/// the TS output.
#[test]
fn v6_no_nested_top_level_landmark_006() {
    assert!(run("<main><main></main></main>").is_empty());
    assert!(run("<html><body><header><nav></nav></header><nav><h2>x</h2></nav></body></html>").is_empty());
}

/// Rust-only: a global `ignoreRoles` skips that role everywhere. Expected values are the TS output.
#[test]
fn v6_no_nested_top_level_landmark_007() {
    let violations = run_config(
        "<html><body><main><main></main></main></body></html>",
        serde_json::json!({
            "rules": { "no-nested-top-level-landmark": { "options": { "ignoreRoles": ["main"] } } }
        }),
    );
    assert!(violations.is_empty(), "{violations:?}");
}
