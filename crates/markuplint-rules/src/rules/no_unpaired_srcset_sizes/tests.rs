//! Tests for `no-unpaired-srcset-sizes` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-unpaired-srcset-sizes-001    → no_unpaired_srcset_sizes_001 (was `element_without_srcset_ignored`)
//!   no-unpaired-srcset-sizes-002    → no_unpaired_srcset_sizes_002 (was `source_outside_picture_ignored`)
//!   no-unpaired-srcset-sizes-003    → no_unpaired_srcset_sizes_003 (was `srcset_with_w_descriptors_and_sizes`)
//!   no-unpaired-srcset-sizes-004    → no_unpaired_srcset_sizes_004 (was `srcset_with_x_descriptors_only`)
//!   no-unpaired-srcset-sizes-005  → no_unpaired_srcset_sizes_005 (was `check1_sizes_with_x_descriptors`)
//!   no-unpaired-srcset-sizes-006  → no_unpaired_srcset_sizes_006 (was `check1_sizes_with_no_descriptors`)
//!   no-unpaired-srcset-sizes-007    → no_unpaired_srcset_sizes_007
//!   no-unpaired-srcset-sizes-008  → no_unpaired_srcset_sizes_008 (was `check1_source_sizes_with_x_descriptors`)
//!   no-unpaired-srcset-sizes-009  → no_unpaired_srcset_sizes_009 (was `check5_w_without_sizes`)
//!   no-unpaired-srcset-sizes-011  → no_unpaired_srcset_sizes_011 (was `check2_w_plus_x_mixing`, pairing half)
//!   no-unpaired-srcset-sizes-012  → no_unpaired_srcset_sizes_012 (was `check2_w_plus_no_descriptor_mixing`, pairing half)
//!   no-unpaired-srcset-sizes-013    → no_unpaired_srcset_sizes_013 (was `check5_w_with_sizes_ok`)
//!   no-unpaired-srcset-sizes-014    → no_unpaired_srcset_sizes_014 (was `check5_x_without_sizes_ok`)
//!   no-unpaired-srcset-sizes-015    → no_unpaired_srcset_sizes_015 (was `single_url_srcset_no_descriptor`)
//!   no-unpaired-srcset-sizes-016  → no_unpaired_srcset_sizes_016 (was `check5_source_w_without_sizes_ok`, which expected no violation)
//!   no-unpaired-srcset-sizes-017    → no_unpaired_srcset_sizes_017
//!   no-unpaired-srcset-sizes-018    → no_unpaired_srcset_sizes_018 (was `empty_srcset`)
//!   no-unpaired-srcset-sizes-019    → no_unpaired_srcset_sizes_019 (was `whitespace_only_srcset`)
//!   no-unpaired-srcset-sizes-020    → no_unpaired_srcset_sizes_020
//!   no-unpaired-srcset-sizes-021  → no_unpaired_srcset_sizes_021
//!   no-unpaired-srcset-sizes-022    → no_unpaired_srcset_sizes_022
//!   no-unpaired-srcset-sizes-023  → no_unpaired_srcset_sizes_023
//!   no-unpaired-srcset-sizes-024   — SKIP: Vue parser not available in Rust
//!   no-unpaired-srcset-sizes-025   — SKIP: Vue parser not available in Rust
//!   no-unpaired-srcset-sizes-026   — SKIP: JSX parser not available in Rust
//!   v6_no_unpaired_srcset_sizes_001  — Rust-only: the `<img>` a `<source>` depends on need not be its next sibling, and `loading="lazy"` alone does not exempt it
//!   v6_no_unpaired_srcset_sizes_002  — Rust-only: the `sizes`-without-width report is at the `srcset` value, multi-line
//!   v6_no_unpaired_srcset_sizes_003  — Rust-only: a `<source>` with no following `<img>` has no exemption
//!   v6_no_unpaired_srcset_sizes_004  — Rust-only: `loading="lazy"` does not exempt an `<img>` itself
//!   v6_no_unpaired_srcset_sizes_005  — Rust-only: `SRCSET` is the `srcset` attribute of an HTML element

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

const RULE: &str = "no-unpaired-srcset-sizes";
const SIZES_REQUIRED_UNLESS_AUTO: &str = "The \"sizes\" attribute is required when the \"srcset\" attribute uses width descriptors, unless the following sibling \"img\" element has loading=\"lazy\" and sizes=\"auto\"";
const SIZES_REQUIRED: &str = "The \"sizes\" attribute is required when the \"srcset\" attribute uses width descriptors";
const WIDTH_REQUIRED: &str =
    "The \"srcset\" attribute requires width descriptors when the \"sizes\" attribute is present";

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

/// TS: `[no-unpaired-srcset-sizes-001]`
#[test]
fn no_unpaired_srcset_sizes_001() {
    const _ID: &str = "no-unpaired-srcset-sizes-001";
    assert_violations(&run(r#"<img src="image.png" alt="photo">"#), &[]);
}

/// TS: `[no-unpaired-srcset-sizes-002]`
#[test]
fn no_unpaired_srcset_sizes_002() {
    const _ID: &str = "no-unpaired-srcset-sizes-002";
    assert_violations(&run(r#"<video><source src="video.mp4" type="video/mp4"></video>"#), &[]);
}

/// TS: `[no-unpaired-srcset-sizes-003]`
#[test]
fn no_unpaired_srcset_sizes_003() {
    const _ID: &str = "no-unpaired-srcset-sizes-003";
    assert_violations(
        &run(
            r#"<img srcset="small.png 480w, large.png 1024w" sizes="(max-width: 600px) 480px, 1024px" src="large.png" alt="photo">"#,
        ),
        &[],
    );
}

/// TS: `[no-unpaired-srcset-sizes-004]`
#[test]
fn no_unpaired_srcset_sizes_004() {
    const _ID: &str = "no-unpaired-srcset-sizes-004";
    assert_violations(
        &run(r#"<img srcset="image-1x.png 1x, image-2x.png 2x" src="image-1x.png" alt="photo">"#),
        &[],
    );
}

/// TS: `[no-unpaired-srcset-sizes-005]`
#[test]
fn no_unpaired_srcset_sizes_005() {
    const _ID: &str = "no-unpaired-srcset-sizes-005";
    let violations =
        run(r#"<img srcset="image-1x.png 1x, image-2x.png 2x" sizes="100vw" src="image-1x.png" alt="photo">"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
    assert_eq!(violations[0].raw, "image-1x.png 1x, image-2x.png 2x");
}

/// TS: `[no-unpaired-srcset-sizes-006]`
#[test]
fn no_unpaired_srcset_sizes_006() {
    const _ID: &str = "no-unpaired-srcset-sizes-006";
    let violations = run(r#"<img srcset="image.png" sizes="100vw" src="image.png" alt="photo">"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
}

/// TS: `[no-unpaired-srcset-sizes-007]`
#[test]
fn no_unpaired_srcset_sizes_007() {
    const _ID: &str = "no-unpaired-srcset-sizes-007";
    assert_violations(
        &run(r#"<img srcset="small.png 480w, large.png" sizes="100vw" src="large.png" alt="photo">"#),
        &[],
    );
}

/// TS: `[no-unpaired-srcset-sizes-008]`
#[test]
fn no_unpaired_srcset_sizes_008() {
    const _ID: &str = "no-unpaired-srcset-sizes-008";
    let violations =
        run(r#"<picture><source srcset="p.webp 1x, p2.webp 2x" sizes="100vw"><img src="p.jpg" alt="p"></picture>"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
}

/// TS: `[no-unpaired-srcset-sizes-009]`
#[test]
fn no_unpaired_srcset_sizes_009() {
    const _ID: &str = "no-unpaired-srcset-sizes-009";
    let violations = run(r#"<img srcset="small.png 480w, large.png 1024w" src="large.png" alt="photo">"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
    assert_eq!(
        violations[0].raw,
        r#"<img srcset="small.png 480w, large.png 1024w" src="large.png" alt="photo">"#
    );
}

/// TS: `[no-unpaired-srcset-sizes-011]`
#[test]
fn no_unpaired_srcset_sizes_011() {
    const _ID: &str = "no-unpaired-srcset-sizes-011";
    let violations = run(r#"<img srcset="small.png 480w, large.png 2x" src="small.png" alt="photo">"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
}

/// TS: `[no-unpaired-srcset-sizes-012]`
#[test]
fn no_unpaired_srcset_sizes_012() {
    const _ID: &str = "no-unpaired-srcset-sizes-012";
    let violations = run(r#"<img srcset="small.png 480w, large.png" src="small.png" alt="photo">"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
}

/// TS: `[no-unpaired-srcset-sizes-013]`
#[test]
fn no_unpaired_srcset_sizes_013() {
    const _ID: &str = "no-unpaired-srcset-sizes-013";
    assert_violations(
        &run(r#"<img srcset="s.png 480w, l.png 1024w" sizes="100vw" src="l.png" alt="p">"#),
        &[],
    );
}

/// TS: `[no-unpaired-srcset-sizes-014]`
#[test]
fn no_unpaired_srcset_sizes_014() {
    const _ID: &str = "no-unpaired-srcset-sizes-014";
    assert_violations(&run(r#"<img srcset="s.png 1x, l.png 2x" src="s.png" alt="p">"#), &[]);
}

/// TS: `[no-unpaired-srcset-sizes-015]`
#[test]
fn no_unpaired_srcset_sizes_015() {
    const _ID: &str = "no-unpaired-srcset-sizes-015";
    assert_violations(&run(r#"<img srcset="image.png" src="image.png" alt="p">"#), &[]);
}

/// TS: `[no-unpaired-srcset-sizes-016]`
#[test]
fn no_unpaired_srcset_sizes_016() {
    const _ID: &str = "no-unpaired-srcset-sizes-016";
    assert_violations(
        &run(r#"<picture><source srcset="s.webp 480w, l.webp 1024w"><img src="l.jpg" alt="p"></picture>"#),
        &[(
            Severity::Error,
            1,
            10,
            SIZES_REQUIRED,
            r#"<source srcset="s.webp 480w, l.webp 1024w">"#,
        )],
    );
}

/// TS: `[no-unpaired-srcset-sizes-017]`
#[test]
fn no_unpaired_srcset_sizes_017() {
    const _ID: &str = "no-unpaired-srcset-sizes-017";
    assert_violations(
        &run(
            r#"<picture><source srcset="s.webp 480w, l.webp 1024w"><img src="l.jpg" alt="p" loading="lazy"></picture>"#,
        ),
        &[(
            Severity::Error,
            1,
            10,
            SIZES_REQUIRED_UNLESS_AUTO,
            r#"<source srcset="s.webp 480w, l.webp 1024w">"#,
        )],
    );
}

/// TS: `[no-unpaired-srcset-sizes-018]`
#[test]
fn no_unpaired_srcset_sizes_018() {
    const _ID: &str = "no-unpaired-srcset-sizes-018";
    assert_violations(&run(r#"<img srcset="" src="image.png" alt="p">"#), &[]);
}

/// TS: `[no-unpaired-srcset-sizes-019]`
#[test]
fn no_unpaired_srcset_sizes_019() {
    const _ID: &str = "no-unpaired-srcset-sizes-019";
    assert_violations(&run(r#"<img srcset="   " src="image.png" alt="p">"#), &[]);
}

/// TS: `[no-unpaired-srcset-sizes-020]`
#[test]
fn no_unpaired_srcset_sizes_020() {
    const _ID: &str = "no-unpaired-srcset-sizes-020";
    assert_violations(
        &run(r#"<img srcset="  s.png   480w  ,  l.png   1024w  " sizes="100vw" src="l.png" alt="p">"#),
        &[],
    );
}

/// TS: `[no-unpaired-srcset-sizes-021]`
#[test]
fn no_unpaired_srcset_sizes_021() {
    const _ID: &str = "no-unpaired-srcset-sizes-021";
    let violations = run(r#"<picture>
  <source srcset="a.webp 480w, b.webp 1024w" sizes="100vw" media="(min-width: 600px)">
  <source srcset="a.jpg 1x, b.jpg 2x" sizes="100vw">
  <img src="a.jpg" alt="p">
</picture>"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
    assert_eq!(violations[0].line, 3);
}

/// TS: `[no-unpaired-srcset-sizes-022]`
#[test]
fn no_unpaired_srcset_sizes_022() {
    const _ID: &str = "no-unpaired-srcset-sizes-022";
    assert_violations(
        &run(r#"<img srcset="s.png 480w, l.png 2x" sizes="auto" src="l.png" alt="p">"#),
        &[],
    );
}

/// TS: `[no-unpaired-srcset-sizes-023]`
#[test]
fn no_unpaired_srcset_sizes_023() {
    const _ID: &str = "no-unpaired-srcset-sizes-023";
    assert_violations(
        &run_rule(
            r#"<img srcset="small.png 480w, large.png 1024w" src="large.png" alt="photo">"#,
            serde_json::json!(false),
        ),
        &[],
    );
}

#[test]
fn v6_no_unpaired_srcset_sizes_001() {
    assert_violations(
        &run(
            r#"<picture><source srcset="a.webp 480w"><source srcset="b.jpg 1x"><img src="b.jpg" loading="lazy" alt=""></picture>"#,
        ),
        &[(
            Severity::Error,
            1,
            10,
            SIZES_REQUIRED_UNLESS_AUTO,
            r#"<source srcset="a.webp 480w">"#,
        )],
    );
}

#[test]
fn v6_no_unpaired_srcset_sizes_002() {
    assert_violations(
        &run("<img\n  srcset=\"a.png 1x\"\n  sizes=\"100vw\" alt=\"\">"),
        &[(Severity::Error, 2, 11, WIDTH_REQUIRED, "a.png 1x")],
    );
}

#[test]
fn v6_no_unpaired_srcset_sizes_003() {
    assert_violations(
        &run(r#"<picture><source srcset="a.webp 480w"></picture>"#),
        &[(
            Severity::Error,
            1,
            10,
            SIZES_REQUIRED,
            r#"<source srcset="a.webp 480w">"#,
        )],
    );
}

/// Rust-only: TS `getAttrNode` matches the attribute name as written, so an upper-case
/// `SRCSET` is not found and nothing is reported. Expected value (`[]`) is the TS output.
#[test]
fn v6_no_unpaired_srcset_sizes_005() {
    // `SRCSET` is the `srcset` attribute of an HTML element, as the DOM names it
    assert_violations(
        &run(r#"<img SRCSET="a.png 480w" alt="">"#),
        &[(
            Severity::Error,
            1,
            1,
            SIZES_REQUIRED,
            r#"<img SRCSET="a.png 480w" alt="">"#,
        )],
    );
}

#[test]
fn v6_no_unpaired_srcset_sizes_004() {
    assert_violations(
        &run(r#"<img srcset="a.png 480w" loading="lazy" alt="">"#),
        &[(
            Severity::Error,
            1,
            1,
            SIZES_REQUIRED,
            r#"<img srcset="a.png 480w" loading="lazy" alt="">"#,
        )],
    );
}
