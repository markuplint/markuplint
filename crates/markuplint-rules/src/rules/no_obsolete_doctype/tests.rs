//! Tests for `no-obsolete-doctype` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-obsolete-doctype-valid-001    → no_obsolete_doctype_valid_001
//!   no-obsolete-doctype-valid-002    → no_obsolete_doctype_valid_002
//!   no-obsolete-doctype-valid-003    → no_obsolete_doctype_valid_003
//!   no-obsolete-doctype-invalid-001  → no_obsolete_doctype_invalid_001
//!   no-obsolete-doctype-valid-004    → no_obsolete_doctype_valid_004
//!   v6_no_obsolete_doctype_001       — Rust-only: a system identifier alone is obsolete
//!   v6_no_obsolete_doctype_002       — Rust-only: a public identifier on a non-`html` name is not reported
//!   v6_no_obsolete_doctype_003       — Rust-only: `about:legacy-compat` with a public identifier is still obsolete
//!   v6_no_obsolete_doctype_004       — Rust-only: only the first doctype is examined

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
        "rules": { "no-obsolete-doctype": true }
    }))
    .unwrap();
    lint(&arena, &spec, &config).violations
}

/// TS: `[no-obsolete-doctype-valid-001]`
#[test]
fn no_obsolete_doctype_valid_001() {
    const _ID: &str = "no-obsolete-doctype-valid-001";
    let violations = run("\n\t\t<!doctype html>\n\t\t<html></html>\n\t\t");
    assert_eq!(violations.len(), 0);
}

/// TS: `[no-obsolete-doctype-valid-002]`
#[test]
fn no_obsolete_doctype_valid_002() {
    const _ID: &str = "no-obsolete-doctype-valid-002";
    let violations = run("<div></div>");
    assert_eq!(violations.len(), 0);
}

/// TS: `[no-obsolete-doctype-valid-003]`
#[test]
fn no_obsolete_doctype_valid_003() {
    const _ID: &str = "no-obsolete-doctype-valid-003";
    let violations = run("<html></html>");
    assert_eq!(violations.len(), 0);
}

/// TS: `[no-obsolete-doctype-invalid-001]`
#[test]
fn no_obsolete_doctype_invalid_001() {
    const _ID: &str = "no-obsolete-doctype-invalid-001";
    let violations = run(
        "\n\t\t<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01//EN\" \"http://www.w3.org/TR/html4/strict.dtd\">\n\t\t<div></div>\n\t\t",
    );
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].rule_id, "no-obsolete-doctype");
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(
        violations[0].raw,
        r#"<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">"#
    );
    assert_eq!(violations[0].line, 2);
    assert_eq!(violations[0].col, 3);
    assert_eq!(violations[0].message, "Never declare obsolete doctype");
}

/// TS: `[no-obsolete-doctype-valid-004]`
#[test]
fn no_obsolete_doctype_valid_004() {
    const _ID: &str = "no-obsolete-doctype-valid-004";
    let violations = run("\n\t\t<!DOCTYPE html SYSTEM \"about:legacy-compat\">\n\t\t<div></div>\n\t\t");
    assert_eq!(violations.len(), 0);
}

/// Rust-only: a system identifier alone (no public identifier) is obsolete.
/// Expected values from the TS rule.
#[test]
fn v6_no_obsolete_doctype_001() {
    let violations = run("<!DOCTYPE html SYSTEM \"http://example.com/x.dtd\">\n<div></div>");
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(violations[0].message, "Never declare obsolete doctype");
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 1);
    assert_eq!(
        violations[0].raw,
        r#"<!DOCTYPE html SYSTEM "http://example.com/x.dtd">"#
    );
}

/// Rust-only: a public identifier is reported only when the doctype name is `html`.
/// Expected values from the TS rule.
#[test]
fn v6_no_obsolete_doctype_002() {
    let violations = run("<!DOCTYPE foo PUBLIC \"-//W3C//DTD HTML 4.01//EN\">\n<div></div>");
    assert_eq!(violations.len(), 0);
}

/// Rust-only: the legacy-compat exception requires the public identifier to be absent.
/// Expected values from the TS rule.
#[test]
fn v6_no_obsolete_doctype_003() {
    let violations = run("<!DOCTYPE html PUBLIC \"-//W3C//DTD HTML 4.01//EN\" \"about:legacy-compat\">\n<div></div>");
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].message, "Never declare obsolete doctype");
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 1);
    assert_eq!(
        violations[0].raw,
        r#"<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "about:legacy-compat">"#
    );
}

/// Rust-only: only the document's first doctype is examined (TS `document.doctype`).
/// Expected values from the TS rule.
#[test]
fn v6_no_obsolete_doctype_004() {
    let violations = run("<!DOCTYPE html>\n<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01//EN\">\n<div></div>");
    assert_eq!(violations.len(), 0);
}
