//! Tests for `no-always-matching-source` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-always-matching-source-valid-001    → no_always_matching_source_valid_001
//!   no-always-matching-source-valid-002    → no_always_matching_source_valid_002
//!   no-always-matching-source-invalid-001  → no_always_matching_source_invalid_001
//!   no-always-matching-source-invalid-002  → no_always_matching_source_invalid_002
//!   no-always-matching-source-invalid-003  → no_always_matching_source_invalid_003
//!   no-always-matching-source-invalid-004  → no_always_matching_source_invalid_004
//!   no-always-matching-source-invalid-005  → no_always_matching_source_invalid_005
//!   no-always-matching-source-invalid-006  → no_always_matching_source_invalid_006
//!   no-always-matching-source-invalid-007  → no_always_matching_source_invalid_007
//!   no-always-matching-source-invalid-008  → no_always_matching_source_invalid_008
//!   no-always-matching-source-invalid-009  → no_always_matching_source_invalid_009
//!   no-always-matching-source-valid-003    → no_always_matching_source_valid_003
//!   no-always-matching-source-valid-004    → no_always_matching_source_valid_004
//!   no-always-matching-source-valid-005    → no_always_matching_source_valid_005
//!   no-always-matching-source-valid-006    → no_always_matching_source_valid_006
//!   no-always-matching-source-invalid-010  → no_always_matching_source_invalid_010
//!   no-always-matching-source-invalid-011  → no_always_matching_source_invalid_011
//!   no-always-matching-source-valid-007    → no_always_matching_source_valid_007
//!   no-always-matching-source-valid-008    → no_always_matching_source_valid_008
//!   no-always-matching-source-valid-009    → no_always_matching_source_valid_009
//!   no-always-matching-source-invalid-012  → no_always_matching_source_invalid_012
//!   no-always-matching-source-invalid-013  → no_always_matching_source_invalid_013
//!   no-always-matching-source-parser-001   — SKIP: Vue parser not available in Rust
//!   no-always-matching-source-parser-002   — SKIP: Vue parser not available in Rust
//!   v6_no_always_matching_source_001  — Rust-only: text and comment nodes between the siblings are skipped
//!   v6_no_always_matching_source_002  — Rust-only: an empty `type` still distinguishes the source
//!   v6_no_always_matching_source_003  — Rust-only: a `<source>` outside `<picture>` is not checked
//!
//! The former `srcset-sizes-constraint` had no counterpart of this check in Rust.

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

const RULE: &str = "no-always-matching-source";
const MESSAGE: &str = "The \"source\" element must have a \"media\" or \"type\" attribute when it has a following sibling \"source\" or \"img\" element with a \"srcset\" attribute";

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

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

fn run_rule(html: &str, value: serde_json::Value) -> Vec<Violation> {
    let config: LintConfig = serde_json::from_value(serde_json::json!({ "rules": { RULE: value } })).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

fn run(html: &str) -> Vec<Violation> {
    run_rule(html, serde_json::json!(true))
}

/// `(severity, line, col, message, raw)`, the fields the TS specs assert.
type Expected<'a> = (Severity, u32, u32, &'a str, &'a str);

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (severity, line, col, message, raw)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, RULE);
        assert_eq!(violation.severity, *severity);
        assert_eq!(violation.line, *line);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, *message);
        assert_eq!(violation.raw, *raw);
    }
}

/// TS: `[no-always-matching-source-valid-001]`
#[test]
fn no_always_matching_source_valid_001() {
    const _ID: &str = "no-always-matching-source-valid-001";
    assert_violations(&run(r#"<video><source src="video.mp4" type="video/mp4"></video>"#), &[]);
}

/// TS: `[no-always-matching-source-valid-002]`
#[test]
fn no_always_matching_source_valid_002() {
    const _ID: &str = "no-always-matching-source-valid-002";
    assert_violations(
        &run(r#"<img srcset="image-1x.png 1x, image-2x.png 2x" src="image-1x.png" alt="photo">"#),
        &[],
    );
}

/// TS: `[no-always-matching-source-invalid-001]`
#[test]
fn no_always_matching_source_invalid_001() {
    const _ID: &str = "no-always-matching-source-invalid-001";
    assert_violations(
        &run(r#"<picture><source srcset="x"><source srcset="y"><img src="z" alt=""></picture>"#),
        &[(Severity::Error, 1, 10, MESSAGE, r#"<source srcset="x">"#)],
    );
}

/// TS: `[no-always-matching-source-invalid-002]`
#[test]
fn no_always_matching_source_invalid_002() {
    const _ID: &str = "no-always-matching-source-invalid-002";
    assert_violations(
        &run(r#"<picture><source srcset="x"><source srcset="y" media="screen"><img src="z" alt=""></picture>"#),
        &[(Severity::Error, 1, 10, MESSAGE, r#"<source srcset="x">"#)],
    );
}

/// TS: `[no-always-matching-source-invalid-003]`
#[test]
fn no_always_matching_source_invalid_003() {
    const _ID: &str = "no-always-matching-source-invalid-003";
    assert_violations(
        &run(r#"<picture><source srcset="x"><source srcset="y" type="image/gif"><img src="z" alt=""></picture>"#),
        &[(Severity::Error, 1, 10, MESSAGE, r#"<source srcset="x">"#)],
    );
}

/// TS: `[no-always-matching-source-invalid-004]`
#[test]
fn no_always_matching_source_invalid_004() {
    const _ID: &str = "no-always-matching-source-invalid-004";
    assert_violations(
        &run(r#"<picture><source srcset="x"><img src="z" srcset="y" alt=""></picture>"#),
        &[(Severity::Error, 1, 10, MESSAGE, r#"<source srcset="x">"#)],
    );
}

/// TS: `[no-always-matching-source-invalid-005]`
#[test]
fn no_always_matching_source_invalid_005() {
    const _ID: &str = "no-always-matching-source-invalid-005";
    assert_violations(
        &run(r#"<picture><source srcset="x 100w" sizes="50vw"><source srcset="y"><img src="z" alt=""></picture>"#),
        &[(
            Severity::Error,
            1,
            10,
            MESSAGE,
            r#"<source srcset="x 100w" sizes="50vw">"#,
        )],
    );
}

/// TS: `[no-always-matching-source-invalid-006]`
#[test]
fn no_always_matching_source_invalid_006() {
    const _ID: &str = "no-always-matching-source-invalid-006";
    assert_violations(
        &run(r#"<picture><source srcset="x" media="all"><source srcset="y"><img src="z" alt=""></picture>"#),
        &[(Severity::Error, 1, 10, MESSAGE, r#"<source srcset="x" media="all">"#)],
    );
}

/// TS: `[no-always-matching-source-invalid-007]`
#[test]
fn no_always_matching_source_invalid_007() {
    const _ID: &str = "no-always-matching-source-invalid-007";
    assert_violations(
        &run(r#"<picture><source srcset="x" media="ALL"><source srcset="y"><img src="z" alt=""></picture>"#),
        &[(Severity::Error, 1, 10, MESSAGE, r#"<source srcset="x" media="ALL">"#)],
    );
}

/// TS: `[no-always-matching-source-invalid-008]`
#[test]
fn no_always_matching_source_invalid_008() {
    const _ID: &str = "no-always-matching-source-invalid-008";
    assert_violations(
        &run(r#"<picture><source srcset="x" media=" all "><source srcset="y"><img src="z" alt=""></picture>"#),
        &[(Severity::Error, 1, 10, MESSAGE, r#"<source srcset="x" media=" all ">"#)],
    );
}

/// TS: `[no-always-matching-source-invalid-009]`
#[test]
fn no_always_matching_source_invalid_009() {
    const _ID: &str = "no-always-matching-source-invalid-009";
    assert_violations(
        &run(r#"<picture><source srcset="x" media=""><source srcset="y"><img src="z" alt=""></picture>"#),
        &[(Severity::Error, 1, 10, MESSAGE, r#"<source srcset="x" media="">"#)],
    );
}

/// TS: `[no-always-matching-source-valid-003]`
#[test]
fn no_always_matching_source_valid_003() {
    const _ID: &str = "no-always-matching-source-valid-003";
    assert_violations(
        &run(
            r#"<picture><source srcset="x" media="(min-width: 600px)"><source srcset="y"><img src="z" alt=""></picture>"#,
        ),
        &[],
    );
}

/// TS: `[no-always-matching-source-valid-004]`
#[test]
fn no_always_matching_source_valid_004() {
    const _ID: &str = "no-always-matching-source-valid-004";
    assert_violations(
        &run(r#"<picture><source srcset="x" type="image/webp"><img src="z" srcset="y" alt=""></picture>"#),
        &[],
    );
}

/// TS: `[no-always-matching-source-valid-005]`
#[test]
fn no_always_matching_source_valid_005() {
    const _ID: &str = "no-always-matching-source-valid-005";
    assert_violations(
        &run(r#"<picture><source srcset="x"><img src="z" alt=""></picture>"#),
        &[],
    );
}

/// TS: `[no-always-matching-source-valid-006]`
#[test]
fn no_always_matching_source_valid_006() {
    const _ID: &str = "no-always-matching-source-valid-006";
    assert_violations(
        &run(
            r#"<picture><source srcset="x" media="(min-width: 600px)"><source srcset="y" media="(min-width: 400px)"><img src="z" alt=""></picture>"#,
        ),
        &[],
    );
}

/// TS: `[no-always-matching-source-invalid-010]`
#[test]
fn no_always_matching_source_invalid_010() {
    const _ID: &str = "no-always-matching-source-invalid-010";
    assert_violations(
        &run("<picture><source srcset=\"x\" media=\"\tall\t\"><source srcset=\"y\"><img src=\"z\" alt=\"\"></picture>"),
        &[(
            Severity::Error,
            1,
            10,
            MESSAGE,
            "<source srcset=\"x\" media=\"\tall\t\">",
        )],
    );
}

/// TS: `[no-always-matching-source-invalid-011]`
#[test]
fn no_always_matching_source_invalid_011() {
    const _ID: &str = "no-always-matching-source-invalid-011";
    let violations = run(r#"<picture><source srcset="x"><source srcset="y"><img src="z" srcset="w" alt=""></picture>"#);
    assert_eq!(violations.len(), 2, "violations: {violations:?}");
    let raws: Vec<&str> = violations.iter().map(|v| v.raw.as_str()).collect();
    assert_eq!(raws, [r#"<source srcset="x">"#, r#"<source srcset="y">"#]);
}

/// TS: `[no-always-matching-source-valid-007]`
#[test]
fn no_always_matching_source_valid_007() {
    const _ID: &str = "no-always-matching-source-valid-007";
    assert_violations(
        &run(
            r#"<picture><source srcset="x" media="all" type="image/webp"><source srcset="y"><img src="z" alt=""></picture>"#,
        ),
        &[],
    );
}

/// TS: `[no-always-matching-source-valid-008]`
#[test]
fn no_always_matching_source_valid_008() {
    const _ID: &str = "no-always-matching-source-valid-008";
    assert_violations(
        &run(r#"<picture><source srcset="x"><source media="screen"><img src="z" alt=""></picture>"#),
        &[],
    );
}

/// TS: `[no-always-matching-source-valid-009]`
#[test]
fn no_always_matching_source_valid_009() {
    const _ID: &str = "no-always-matching-source-valid-009";
    // The padding is U+00A0 NO-BREAK SPACE, as in the TS spec.
    assert_violations(
        &run(
            "<picture><source srcset=\"x\" media=\"\u{a0}all\u{a0}\"><source srcset=\"y\"><img src=\"z\" alt=\"\"></picture>",
        ),
        &[],
    );
}

/// TS: `[no-always-matching-source-invalid-012]`
#[test]
fn no_always_matching_source_invalid_012() {
    const _ID: &str = "no-always-matching-source-invalid-012";
    assert_violations(
        &run(r#"<picture><source><source srcset="y"><img src="z" alt=""></picture>"#),
        &[(Severity::Error, 1, 10, MESSAGE, "<source>")],
    );
}

/// TS: `[no-always-matching-source-invalid-013]`
#[test]
fn no_always_matching_source_invalid_013() {
    const _ID: &str = "no-always-matching-source-invalid-013";
    assert_violations(
        &run_rule(
            r#"<picture><source srcset="x"><source srcset="y"><img src="z" alt=""></picture>"#,
            serde_json::json!(false),
        ),
        &[],
    );
}

#[test]
fn v6_no_always_matching_source_001() {
    assert_violations(
        &run(
            "<picture>\n  <source srcset=\"a.webp\">\n  <!-- c -->\n  <source srcset=\"b.jpg\" media=\"(min-width: 600px)\">\n  <img src=\"b.jpg\" alt=\"\">\n</picture>",
        ),
        &[(Severity::Error, 2, 3, MESSAGE, r#"<source srcset="a.webp">"#)],
    );
}

#[test]
fn v6_no_always_matching_source_002() {
    assert_violations(
        &run(r#"<picture><source srcset="x" type=""><source srcset="y"><img src="z" alt=""></picture>"#),
        &[],
    );
}

#[test]
fn v6_no_always_matching_source_003() {
    assert_violations(
        &run(r#"<div><source srcset="x"><img src="z" srcset="y" alt=""></div>"#),
        &[],
    );
}
