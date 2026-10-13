//! Tests for `no-obsolete-element` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-obsolete-element-valid-001        → no_obsolete_element_valid_001
//!   no-obsolete-element-valid-002        → no_obsolete_element_valid_002
//!   no-obsolete-element-invalid-001      → no_obsolete_element_invalid_001
//!   no-obsolete-element-issue-3740-001   — SKIP: JSX parser + `pretenders` (the Rust engine has neither)
//!   no-obsolete-element-issue-3740-002   — SKIP: JSX parser + `pretenders` (the Rust engine has neither)
//!   no-obsolete-element-issue-3740-003   — SKIP: `pretenders` (the Rust engine has no `pretenders` config; the TS
//!                                          test only checks that an HTML→HTML pretender is ignored, and
//!                                          `v6_no_obsolete_element_001` covers the same input and violation without it)
//!   no-obsolete-element-issue-3740-004   — SKIP: `pretenders` (the Rust engine has no `pretenders` config)
//!   no-obsolete-element-issue-3740-005   — SKIP: Vue parser + `pretenders` (the Rust engine has neither)
//!   v6_no_obsolete_element_001           — Rust-only: `<marquee>x</marquee>`, the input of issue-3740-003 without pretenders
//!   v6_no_obsolete_element_002           — Rust-only: an upper-case tag reports the lower-case local name
//!   v6_no_obsolete_element_003           — Rust-only: an SVG element is looked up in the SVG spec, not the HTML one
//!   v6_no_obsolete_element_004           — Rust-only: a custom element with no pretender is not looked up

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
        "rules": { "no-obsolete-element": true }
    }))
    .unwrap();
    lint(&arena, &spec, &config).violations
}

/// TS: `[no-obsolete-element-valid-001]`
#[test]
fn no_obsolete_element_valid_001() {
    const _ID: &str = "no-obsolete-element-valid-001";
    let violations = run("<div></div><p><span></span></p>");
    assert_eq!(violations.len(), 0);
}

/// TS: `[no-obsolete-element-valid-002]`
#[test]
fn no_obsolete_element_valid_002() {
    const _ID: &str = "no-obsolete-element-valid-002";
    let violations = run("<hgroup></hgroup>");
    assert_eq!(violations.len(), 0);
}

/// TS: `[no-obsolete-element-invalid-001]`
#[test]
fn no_obsolete_element_invalid_001() {
    const _ID: &str = "no-obsolete-element-invalid-001";
    let violations = run("<font></font><big><blink></blink></big>");
    assert_eq!(violations.len(), 3);
    assert_eq!(violations[0].rule_id, "no-obsolete-element");
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(violations[0].message, "The \"font\" element is obsolete");
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 1);
    assert_eq!(violations[0].raw, "<font>");
    assert_eq!(violations[1].severity, Severity::Error);
    assert_eq!(violations[1].message, "The \"big\" element is obsolete");
    assert_eq!(violations[1].line, 1);
    assert_eq!(violations[1].col, 14);
    assert_eq!(violations[1].raw, "<big>");
    assert_eq!(violations[2].severity, Severity::Error);
    assert_eq!(violations[2].message, "The \"blink\" element is obsolete");
    assert_eq!(violations[2].line, 1);
    assert_eq!(violations[2].col, 19);
    assert_eq!(violations[2].raw, "<blink>");
}

/// Rust-only: the input of `[no-obsolete-element-issue-3740-003]` without its HTML→HTML
/// pretender (which TS ignores). Expected values from the TS rule.
#[test]
fn v6_no_obsolete_element_001() {
    let violations = run("<marquee>x</marquee>");
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(violations[0].message, "The \"marquee\" element is obsolete");
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 1);
    assert_eq!(violations[0].raw, "<marquee>");
}

/// Rust-only: the message names the lower-case local name; `raw` keeps the source.
/// Expected values from the TS rule.
#[test]
fn v6_no_obsolete_element_002() {
    let violations = run("<FONT></FONT>");
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].message, "The \"font\" element is obsolete");
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 1);
    assert_eq!(violations[0].raw, "<FONT>");
}

/// Rust-only: `font` inside `svg` is an SVG element, which the spec does not mark
/// obsolete. Expected values from the TS rule.
#[test]
fn v6_no_obsolete_element_003() {
    let violations = run("<svg><font></font></svg>");
    assert_eq!(violations.len(), 0);
}

/// Rust-only: a custom element is not an HTML element and, without a pretender, is not
/// checked. Expected values from the TS rule.
#[test]
fn v6_no_obsolete_element_004() {
    let violations = run("<x-marquee>x</x-marquee>");
    assert_eq!(violations.len(), 0);
}
