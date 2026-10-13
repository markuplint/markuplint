//! Tests for `sizes-auto-requires-lazy-loading` rule.
//!
//! Test ID mapping (TS → Rust):
//!   sizes-auto-requires-lazy-loading-valid-001    → sizes_auto_requires_lazy_loading_valid_001
//!   sizes-auto-requires-lazy-loading-valid-002    → sizes_auto_requires_lazy_loading_valid_002
//!   sizes-auto-requires-lazy-loading-valid-003    → sizes_auto_requires_lazy_loading_valid_003 (was `sizes_auto_with_loading_lazy`)
//!   sizes-auto-requires-lazy-loading-valid-004    → sizes_auto_requires_lazy_loading_valid_004 (was `sizes_auto_comma_with_loading_lazy`)
//!   sizes-auto-requires-lazy-loading-valid-005    → sizes_auto_requires_lazy_loading_valid_005 (was `source_sizes_auto_with_sibling_img_lazy`)
//!   sizes-auto-requires-lazy-loading-valid-006    → sizes_auto_requires_lazy_loading_valid_006
//!   sizes-auto-requires-lazy-loading-invalid-001  → sizes_auto_requires_lazy_loading_invalid_001 (was `check3_sizes_auto_without_loading`)
//!   sizes-auto-requires-lazy-loading-invalid-002  → sizes_auto_requires_lazy_loading_invalid_002 (was `check3_sizes_auto_with_loading_eager`)
//!   sizes-auto-requires-lazy-loading-valid-007    → sizes_auto_requires_lazy_loading_valid_007
//!   sizes-auto-requires-lazy-loading-invalid-003  → sizes_auto_requires_lazy_loading_invalid_003 (was `check3_sizes_auto_comma_without_loading`)
//!   sizes-auto-requires-lazy-loading-valid-008    → sizes_auto_requires_lazy_loading_valid_008
//!   sizes-auto-requires-lazy-loading-invalid-004  → sizes_auto_requires_lazy_loading_invalid_004 (was `check3_sizes_uppercase_auto_without_loading`)
//!   sizes-auto-requires-lazy-loading-valid-009    → sizes_auto_requires_lazy_loading_valid_009 (was `check3_sizes_auto_whitespace_with_lazy`)
//!   sizes-auto-requires-lazy-loading-invalid-005  → sizes_auto_requires_lazy_loading_invalid_005 (was `check4_source_sizes_auto_img_no_loading`)
//!   sizes-auto-requires-lazy-loading-invalid-006  → sizes_auto_requires_lazy_loading_invalid_006 (was `check4_source_sizes_auto_img_eager`)
//!   sizes-auto-requires-lazy-loading-valid-010    → sizes_auto_requires_lazy_loading_valid_010 (was `check4_source_sizes_auto_img_lazy`)
//!   sizes-auto-requires-lazy-loading-invalid-007  → sizes_auto_requires_lazy_loading_invalid_007 (was `check4_source_sizes_auto_no_following_img`)
//!   sizes-auto-requires-lazy-loading-valid-011    → sizes_auto_requires_lazy_loading_valid_011
//!   sizes-auto-requires-lazy-loading-invalid-008  → sizes_auto_requires_lazy_loading_invalid_008
//!   sizes-auto-requires-lazy-loading-invalid-009  → sizes_auto_requires_lazy_loading_invalid_009
//!   v6_sizes_auto_requires_lazy_loading_001  — Rust-only: `auto` followed by a tab still starts the list
//!   v6_sizes_auto_requires_lazy_loading_002  — Rust-only: without `srcset` there is nothing to check
//!   v6_sizes_auto_requires_lazy_loading_003  — Rust-only: `autox` is not `auto`
//!   v6_sizes_auto_requires_lazy_loading_004  — Rust-only: `loading` is compared case-sensitively; multi-line position

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

const RULE: &str = "sizes-auto-requires-lazy-loading";
const IMG_MESSAGE: &str = "The \"sizes\" attribute with \"auto\" requires the \"loading\" attribute to be \"lazy\"";

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

/// TS: `[sizes-auto-requires-lazy-loading-valid-001]`
#[test]
fn sizes_auto_requires_lazy_loading_valid_001() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-valid-001";
    assert_violations(&run(r#"<img src="image.png" alt="photo">"#), &[]);
}

/// TS: `[sizes-auto-requires-lazy-loading-valid-002]`
#[test]
fn sizes_auto_requires_lazy_loading_valid_002() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-valid-002";
    assert_violations(&run(r#"<video><source src="video.mp4" type="video/mp4"></video>"#), &[]);
}

/// TS: `[sizes-auto-requires-lazy-loading-valid-003]`
#[test]
fn sizes_auto_requires_lazy_loading_valid_003() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-valid-003";
    assert_violations(
        &run(
            r#"<img srcset="small.png 480w, large.png 1024w" sizes="auto" loading="lazy" src="large.png" alt="photo">"#,
        ),
        &[],
    );
}

/// TS: `[sizes-auto-requires-lazy-loading-valid-004]`
#[test]
fn sizes_auto_requires_lazy_loading_valid_004() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-valid-004";
    assert_violations(
        &run(
            r#"<img srcset="small.png 480w, large.png 1024w" sizes="auto, 100vw" loading="lazy" src="large.png" alt="photo">"#,
        ),
        &[],
    );
}

/// TS: `[sizes-auto-requires-lazy-loading-valid-005]`
#[test]
fn sizes_auto_requires_lazy_loading_valid_005() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-valid-005";
    assert_violations(
        &run(
            r#"<picture><source srcset="s.webp 480w, l.webp 1024w" sizes="auto"><img src="l.jpg" loading="lazy" alt="photo"></picture>"#,
        ),
        &[],
    );
}

/// TS: `[sizes-auto-requires-lazy-loading-valid-006]`
#[test]
fn sizes_auto_requires_lazy_loading_valid_006() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-valid-006";
    assert_violations(
        &run(
            r#"<picture><source srcset="a.webp 480w" sizes="auto" type="image/webp"><source srcset="a.jpg 480w" sizes="100vw"><img src="a.jpg" loading="lazy" alt="p"></picture>"#,
        ),
        &[],
    );
}

/// TS: `[sizes-auto-requires-lazy-loading-invalid-001]`
#[test]
fn sizes_auto_requires_lazy_loading_invalid_001() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-invalid-001";
    let violations = run(r#"<img srcset="s.png 480w, l.png 1024w" sizes="auto" src="l.png" alt="p">"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
    assert_eq!(violations[0].raw, "auto");
}

/// TS: `[sizes-auto-requires-lazy-loading-invalid-002]`
#[test]
fn sizes_auto_requires_lazy_loading_invalid_002() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-invalid-002";
    let violations = run(r#"<img srcset="s.png 480w, l.png 1024w" sizes="auto" loading="eager" src="l.png" alt="p">"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
}

/// TS: `[sizes-auto-requires-lazy-loading-valid-007]`
#[test]
fn sizes_auto_requires_lazy_loading_valid_007() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-valid-007";
    assert_violations(
        &run(r#"<img srcset="s.png 480w, l.png 1024w" sizes="auto" loading="lazy" src="l.png" alt="p">"#),
        &[],
    );
}

/// TS: `[sizes-auto-requires-lazy-loading-invalid-003]`
#[test]
fn sizes_auto_requires_lazy_loading_invalid_003() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-invalid-003";
    let violations = run(r#"<img srcset="s.png 480w" sizes="auto, 100vw" src="s.png" alt="p">"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
}

/// TS: `[sizes-auto-requires-lazy-loading-valid-008]`
#[test]
fn sizes_auto_requires_lazy_loading_valid_008() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-valid-008";
    assert_violations(
        &run(r#"<img srcset="s.png 480w" sizes="100vw, auto" loading="lazy" src="s.png" alt="p">"#),
        &[],
    );
}

/// TS: `[sizes-auto-requires-lazy-loading-invalid-004]`
#[test]
fn sizes_auto_requires_lazy_loading_invalid_004() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-invalid-004";
    let violations = run(r#"<img srcset="s.png 480w" sizes="AUTO" src="s.png" alt="p">"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
}

/// TS: `[sizes-auto-requires-lazy-loading-valid-009]`
#[test]
fn sizes_auto_requires_lazy_loading_valid_009() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-valid-009";
    assert_violations(
        &run(r#"<img srcset="s.png 480w" sizes=" auto " loading="lazy" src="s.png" alt="p">"#),
        &[],
    );
}

/// TS: `[sizes-auto-requires-lazy-loading-invalid-005]`
#[test]
fn sizes_auto_requires_lazy_loading_invalid_005() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-invalid-005";
    let violations = run(r#"<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" alt="p"></picture>"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
    assert_eq!(violations[0].raw, "auto");
}

/// TS: `[sizes-auto-requires-lazy-loading-invalid-006]`
#[test]
fn sizes_auto_requires_lazy_loading_invalid_006() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-invalid-006";
    let violations = run(
        r#"<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" loading="eager" alt="p"></picture>"#,
    );
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
}

/// TS: `[sizes-auto-requires-lazy-loading-valid-010]`
#[test]
fn sizes_auto_requires_lazy_loading_valid_010() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-valid-010";
    assert_violations(
        &run(
            r#"<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" loading="lazy" alt="p"></picture>"#,
        ),
        &[],
    );
}

/// TS: `[sizes-auto-requires-lazy-loading-invalid-007]`
#[test]
fn sizes_auto_requires_lazy_loading_invalid_007() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-invalid-007";
    let violations = run(r#"<picture><source srcset="s.webp 480w" sizes="auto"></picture>"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
}

/// TS: `[sizes-auto-requires-lazy-loading-valid-011]`
#[test]
fn sizes_auto_requires_lazy_loading_valid_011() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-valid-011";
    assert_violations(
        &run(
            r#"<picture><source srcset="a.webp 480w" sizes="auto" media="(min-width: 600px)"><source srcset="b.jpg 480w"><img src="b.jpg" loading="lazy" alt="p"></picture>"#,
        ),
        &[],
    );
}

/// TS: `[sizes-auto-requires-lazy-loading-invalid-008]`
#[test]
fn sizes_auto_requires_lazy_loading_invalid_008() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-invalid-008";
    let violations = run(r#"<img srcset="s.png 480w, l.png 2x" sizes="auto" src="l.png" alt="p">"#);
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
}

/// TS: `[sizes-auto-requires-lazy-loading-invalid-009]`
#[test]
fn sizes_auto_requires_lazy_loading_invalid_009() {
    const _ID: &str = "sizes-auto-requires-lazy-loading-invalid-009";
    assert_violations(
        &run_rule(
            r#"<img srcset="s.png 480w" sizes="auto" src="l.png" alt="p">"#,
            serde_json::json!(false),
        ),
        &[],
    );
}

#[test]
fn v6_sizes_auto_requires_lazy_loading_001() {
    assert_violations(
        &run("<img srcset=\"s.png 480w\" sizes=\"auto\t100vw\" src=\"s.png\" alt=\"p\">"),
        &[(Severity::Error, 1, 33, IMG_MESSAGE, "auto\t100vw")],
    );
}

#[test]
fn v6_sizes_auto_requires_lazy_loading_002() {
    assert_violations(&run(r#"<img sizes="auto" src="s.png" alt="p">"#), &[]);
}

#[test]
fn v6_sizes_auto_requires_lazy_loading_003() {
    assert_violations(
        &run(r#"<img srcset="s.png 480w" sizes="autox" src="s.png" alt="p">"#),
        &[],
    );
}

#[test]
fn v6_sizes_auto_requires_lazy_loading_004() {
    assert_violations(
        &run("<img\n  srcset=\"s.png 480w\"\n  sizes=\"auto\" loading=\"LAZY\" alt=\"p\">"),
        &[(Severity::Error, 3, 10, IMG_MESSAGE, "auto")],
    );
}
