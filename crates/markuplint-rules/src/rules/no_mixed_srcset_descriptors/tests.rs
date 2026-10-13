//! Tests for `no-mixed-srcset-descriptors` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-mixed-srcset-descriptors-valid-001    → no_mixed_srcset_descriptors_valid_001
//!   no-mixed-srcset-descriptors-valid-002    → no_mixed_srcset_descriptors_valid_002
//!   no-mixed-srcset-descriptors-valid-003    → no_mixed_srcset_descriptors_valid_003
//!   no-mixed-srcset-descriptors-valid-004    → no_mixed_srcset_descriptors_valid_004
//!   no-mixed-srcset-descriptors-invalid-001  → no_mixed_srcset_descriptors_invalid_001 (was `check2_w_plus_x_mixing`, mixing half)
//!   no-mixed-srcset-descriptors-invalid-002  → no_mixed_srcset_descriptors_invalid_002 (was `check2_w_plus_no_descriptor_mixing`, mixing half)
//!   no-mixed-srcset-descriptors-invalid-003  → no_mixed_srcset_descriptors_invalid_003
//!   no-mixed-srcset-descriptors-valid-005    → no_mixed_srcset_descriptors_valid_005 (was `check2_all_w_no_violation`)
//!   no-mixed-srcset-descriptors-valid-006    → no_mixed_srcset_descriptors_valid_006 (was `check2_all_x_no_violation`)
//!   no-mixed-srcset-descriptors-valid-007    → no_mixed_srcset_descriptors_valid_007 (was `check2_x_plus_no_descriptor_no_violation`)
//!   no-mixed-srcset-descriptors-valid-008    → no_mixed_srcset_descriptors_valid_008
//!   no-mixed-srcset-descriptors-invalid-004  → no_mixed_srcset_descriptors_invalid_004
//!   no-mixed-srcset-descriptors-valid-009    → no_mixed_srcset_descriptors_valid_009
//!   no-mixed-srcset-descriptors-valid-010    → no_mixed_srcset_descriptors_valid_010
//!   no-mixed-srcset-descriptors-invalid-005  → no_mixed_srcset_descriptors_invalid_005
//!   no-mixed-srcset-descriptors-parser-001   — SKIP: Vue parser not available in Rust
//!   no-mixed-srcset-descriptors-parser-002   — SKIP: JSX parser not available in Rust
//!   no-mixed-srcset-descriptors-parser-003   — SKIP: JSX parser not available in Rust
//!   v6_no_mixed_srcset_descriptors_001  — Rust-only: the report is at the `srcset` value, multi-line
//!   v6_no_mixed_srcset_descriptors_002  — Rust-only: a `<source>` in `<picture>` is checked too

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

const RULE: &str = "no-mixed-srcset-descriptors";
const MESSAGE: &str = "The \"srcset\" attribute must not mix width and pixel density descriptors";

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

/// TS: `[no-mixed-srcset-descriptors-valid-001]`
#[test]
fn no_mixed_srcset_descriptors_valid_001() {
    const _ID: &str = "no-mixed-srcset-descriptors-valid-001";
    assert_violations(&run(r#"<img src="image.png" alt="photo">"#), &[]);
}

/// TS: `[no-mixed-srcset-descriptors-valid-002]`
#[test]
fn no_mixed_srcset_descriptors_valid_002() {
    const _ID: &str = "no-mixed-srcset-descriptors-valid-002";
    assert_violations(&run(r#"<video><source src="video.mp4" type="video/mp4"></video>"#), &[]);
}

/// TS: `[no-mixed-srcset-descriptors-valid-003]`
#[test]
fn no_mixed_srcset_descriptors_valid_003() {
    const _ID: &str = "no-mixed-srcset-descriptors-valid-003";
    assert_violations(
        &run(r#"<img srcset="image-1x.png 1x, image-2x.png 2x" src="image-1x.png" alt="photo">"#),
        &[],
    );
}

/// TS: `[no-mixed-srcset-descriptors-valid-004]`
#[test]
fn no_mixed_srcset_descriptors_valid_004() {
    const _ID: &str = "no-mixed-srcset-descriptors-valid-004";
    assert_violations(&run(r#"<img srcset="image.png" src="image.png" alt="photo">"#), &[]);
}

/// TS: `[no-mixed-srcset-descriptors-invalid-001]`
#[test]
fn no_mixed_srcset_descriptors_invalid_001() {
    const _ID: &str = "no-mixed-srcset-descriptors-invalid-001";
    let violations = run(r#"<img srcset="small.png 480w, large.png 2x" src="small.png" alt="photo">"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
    assert_eq!(violations[0].raw, "small.png 480w, large.png 2x");
}

/// TS: `[no-mixed-srcset-descriptors-invalid-002]`
#[test]
fn no_mixed_srcset_descriptors_invalid_002() {
    const _ID: &str = "no-mixed-srcset-descriptors-invalid-002";
    let violations = run(r#"<img srcset="small.png 480w, large.png" src="small.png" alt="photo">"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
}

/// TS: `[no-mixed-srcset-descriptors-invalid-003]`
#[test]
fn no_mixed_srcset_descriptors_invalid_003() {
    const _ID: &str = "no-mixed-srcset-descriptors-invalid-003";
    let violations = run(r#"<img srcset="small.png 480w, large.png" sizes="100vw" src="large.png" alt="photo">"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
}

/// TS: `[no-mixed-srcset-descriptors-valid-005]`
#[test]
fn no_mixed_srcset_descriptors_valid_005() {
    const _ID: &str = "no-mixed-srcset-descriptors-valid-005";
    assert_violations(
        &run(r#"<img srcset="s.png 480w, l.png 1024w" sizes="100vw" src="s.png" alt="p">"#),
        &[],
    );
}

/// TS: `[no-mixed-srcset-descriptors-valid-006]`
#[test]
fn no_mixed_srcset_descriptors_valid_006() {
    const _ID: &str = "no-mixed-srcset-descriptors-valid-006";
    assert_violations(&run(r#"<img srcset="s.png 1x, l.png 2x" src="s.png" alt="p">"#), &[]);
}

/// TS: `[no-mixed-srcset-descriptors-valid-007]`
#[test]
fn no_mixed_srcset_descriptors_valid_007() {
    const _ID: &str = "no-mixed-srcset-descriptors-valid-007";
    assert_violations(
        &run(r#"<img srcset="small.png, large.png 2x" src="small.png" alt="p">"#),
        &[],
    );
}

/// TS: `[no-mixed-srcset-descriptors-valid-008]`
#[test]
fn no_mixed_srcset_descriptors_valid_008() {
    const _ID: &str = "no-mixed-srcset-descriptors-valid-008";
    assert_violations(&run(r#"<img srcset="image.png" src="image.png" alt="p">"#), &[]);
}

/// TS: `[no-mixed-srcset-descriptors-invalid-004]`
#[test]
fn no_mixed_srcset_descriptors_invalid_004() {
    const _ID: &str = "no-mixed-srcset-descriptors-invalid-004";
    let violations = run(r#"<img srcset="s.png 480w, l.png 2x" sizes="auto" src="l.png" alt="p">"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
}

/// TS: `[no-mixed-srcset-descriptors-valid-009]`
#[test]
fn no_mixed_srcset_descriptors_valid_009() {
    const _ID: &str = "no-mixed-srcset-descriptors-valid-009";
    assert_violations(&run(r#"<img srcset="" src="image.png" alt="p">"#), &[]);
}

/// TS: `[no-mixed-srcset-descriptors-valid-010]`
#[test]
fn no_mixed_srcset_descriptors_valid_010() {
    const _ID: &str = "no-mixed-srcset-descriptors-valid-010";
    assert_violations(&run(r#"<img srcset="   " src="image.png" alt="p">"#), &[]);
}

/// TS: `[no-mixed-srcset-descriptors-invalid-005]`
#[test]
fn no_mixed_srcset_descriptors_invalid_005() {
    const _ID: &str = "no-mixed-srcset-descriptors-invalid-005";
    assert_violations(
        &run_rule(
            r#"<img srcset="s.png 480w, l.png 2x" sizes="auto" src="l.png" alt="p">"#,
            serde_json::json!(false),
        ),
        &[],
    );
}

#[test]
fn v6_no_mixed_srcset_descriptors_001() {
    assert_violations(
        &run("<img\n  srcset=\"a.png 480w, b.png 2x\"\n  sizes=\"100vw\" alt=\"\">"),
        &[(Severity::Error, 2, 11, MESSAGE, "a.png 480w, b.png 2x")],
    );
}

#[test]
fn v6_no_mixed_srcset_descriptors_002() {
    assert_violations(
        &run(r#"<picture><source srcset="a.webp 480w, b.webp" sizes="100vw"><img src="b.jpg" alt=""></picture>"#),
        &[(Severity::Error, 1, 26, MESSAGE, "a.webp 480w, b.webp")],
    );
}
