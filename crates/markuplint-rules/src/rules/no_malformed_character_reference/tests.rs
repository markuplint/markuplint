//! Tests for `no-malformed-character-reference` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-malformed-character-reference-issue-1074    → no_malformed_character_reference_issue_1074
//!   no-malformed-character-reference-invalid-001   → no_malformed_character_reference_invalid_001
//!   no-malformed-character-reference-invalid-002   → no_malformed_character_reference_invalid_002
//!   no-malformed-character-reference-invalid-003   → no_malformed_character_reference_invalid_003
//!   no-malformed-character-reference-invalid-004   → no_malformed_character_reference_invalid_004
//!   no-malformed-character-reference-invalid-005   → no_malformed_character_reference_invalid_005
//!   no-malformed-character-reference-invalid-006   → no_malformed_character_reference_invalid_006
//!   no-malformed-character-reference-invalid-007   → no_malformed_character_reference_invalid_007
//!   no-malformed-character-reference-invalid-008   → no_malformed_character_reference_invalid_008
//!   v6_no_malformed_character_reference_001        — Rust-only: every field of each code's violation
//!   v6_no_malformed_character_reference_002        — Rust-only: an unknown name in an attribute value is not reported
//!   v6_no_malformed_character_reference_003        — Rust-only: two errors at one position, in parse5's order
//!   v6_no_malformed_character_reference_004        — Rust-only: RCDATA is checked, script data is not
//!   v6_no_malformed_character_reference_005        — Rust-only: positions across lines
//!   v6_no_malformed_character_reference_006        — Rust-only: well-formed references are not reported

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

fn run(html: &str) -> Vec<Violation> {
    let arena = html_arena(html);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-malformed-character-reference": true }
    }))
    .unwrap();
    lint(&arena, &spec, &config).violations
}

/// `(message, line, col, raw)` of each violation.
fn summary(violations: &[Violation]) -> Vec<(String, u32, u32, String)> {
    violations
        .iter()
        .map(|v| (v.message.clone(), v.line, v.col, v.raw.clone()))
        .collect()
}

fn has_message_containing(violations: &[Violation], code: &str) -> bool {
    violations.iter().any(|v| v.message.contains(code))
}

/// TS: `[no-malformed-character-reference-issue-1074]`
#[test]
fn no_malformed_character_reference_issue_1074() {
    const _ID: &str = "no-malformed-character-reference-issue-1074";
    let violations = run("<span>&#9660;</span><span>&#x25BC;</span><span>&x25BC;</span>");
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].rule_id, "no-malformed-character-reference");
    assert_eq!(violations[0].severity, Severity::Error);
    assert_eq!(violations[0].line, 1);
    assert_eq!(violations[0].col, 54);
    assert_eq!(violations[0].raw, "x25BC;");
    assert_eq!(
        violations[0].message,
        "The character reference is unknown-named-character-reference"
    );
}

/// TS: `[no-malformed-character-reference-invalid-001]`
#[test]
fn no_malformed_character_reference_invalid_001() {
    const _ID: &str = "no-malformed-character-reference-invalid-001";
    let violations = run("<p>&xyz;</p>");
    assert!(has_message_containing(&violations, "unknown-named-character-reference"));
}

/// TS: `[no-malformed-character-reference-invalid-002]`
#[test]
fn no_malformed_character_reference_invalid_002() {
    const _ID: &str = "no-malformed-character-reference-invalid-002";
    let violations = run("<p>&amp text</p>");
    assert!(has_message_containing(
        &violations,
        "missing-semicolon-after-character-reference"
    ));
}

/// TS: `[no-malformed-character-reference-invalid-003]`
#[test]
fn no_malformed_character_reference_invalid_003() {
    const _ID: &str = "no-malformed-character-reference-invalid-003";
    let violations = run("<p>&#;</p>");
    assert!(has_message_containing(
        &violations,
        "absence-of-digits-in-numeric-character-reference"
    ));
}

/// TS: `[no-malformed-character-reference-invalid-004]`
#[test]
fn no_malformed_character_reference_invalid_004() {
    const _ID: &str = "no-malformed-character-reference-invalid-004";
    let violations = run("<p>&#x0;</p>");
    assert!(has_message_containing(&violations, "null-character-reference"));
}

/// TS: `[no-malformed-character-reference-invalid-005]`
#[test]
fn no_malformed_character_reference_invalid_005() {
    const _ID: &str = "no-malformed-character-reference-invalid-005";
    let violations = run("<p>&#xD800;</p>");
    assert!(has_message_containing(&violations, "surrogate-character-reference"));
}

/// TS: `[no-malformed-character-reference-invalid-006]`
#[test]
fn no_malformed_character_reference_invalid_006() {
    const _ID: &str = "no-malformed-character-reference-invalid-006";
    let violations = run("<p>&#x1;</p>");
    assert!(has_message_containing(&violations, "control-character-reference"));
}

/// TS: `[no-malformed-character-reference-invalid-007]`
#[test]
fn no_malformed_character_reference_invalid_007() {
    const _ID: &str = "no-malformed-character-reference-invalid-007";
    let violations = run("<p>&#xFFFE;</p>");
    assert!(has_message_containing(&violations, "noncharacter-character-reference"));
}

/// TS: `[no-malformed-character-reference-invalid-008]`
#[test]
fn no_malformed_character_reference_invalid_008() {
    const _ID: &str = "no-malformed-character-reference-invalid-008";
    let violations = run("<p>&#x110000;</p>");
    assert!(has_message_containing(
        &violations,
        "character-reference-outside-unicode-range"
    ));
}

/// Rust-only: the full violation of each invalid-00N input, which the TS tests check
/// only by message. Expected values from the TS rule.
#[test]
fn v6_no_malformed_character_reference_001() {
    let cases: [(&str, &str, u32, &str); 8] = [
        ("<p>&xyz;</p>", "unknown-named-character-reference", 8, "xyz;"),
        (
            "<p>&amp text</p>",
            "missing-semicolon-after-character-reference",
            8,
            "amp",
        ),
        (
            "<p>&#;</p>",
            "absence-of-digits-in-numeric-character-reference",
            6,
            "#;",
        ),
        ("<p>&#x0;</p>", "null-character-reference", 9, "#x0;"),
        ("<p>&#xD800;</p>", "surrogate-character-reference", 12, "#xD800;"),
        ("<p>&#x1;</p>", "control-character-reference", 9, "#x1;"),
        ("<p>&#xFFFE;</p>", "noncharacter-character-reference", 12, "#xFFFE;"),
        (
            "<p>&#x110000;</p>",
            "character-reference-outside-unicode-range",
            14,
            "#x110000;",
        ),
    ];
    for (html, code, col, raw) in cases {
        let violations = run(html);
        assert_eq!(
            summary(&violations),
            vec![(format!("The character reference is {code}"), 1, col, raw.to_owned())],
            "{html}"
        );
        assert_eq!(violations[0].severity, Severity::Error, "{html}");
    }
}

/// Rust-only: parse5 does not enter the ambiguous-ampersand state in an attribute
/// value, so an unknown name there is not reported; a malformed numeric reference is.
/// Expected values from the TS rule.
#[test]
fn v6_no_malformed_character_reference_002() {
    assert_eq!(run(r#"<a href="?a=1&xyz;">x</a>"#).len(), 0);
    assert_eq!(run("<a href=&xyz;>x</a>").len(), 0);
    assert_eq!(run(r#"<a href="?a=1&amp=2">x</a>"#).len(), 0);
    assert_eq!(
        summary(&run(r#"<a href="?a=1&amp;b&lt">x</a>"#)),
        vec![(
            "The character reference is missing-semicolon-after-character-reference".to_owned(),
            1,
            23,
            "lt".to_owned()
        )]
    );
    assert_eq!(
        summary(&run("<a href='&#xD800;'>x</a>")),
        vec![(
            "The character reference is surrogate-character-reference".to_owned(),
            1,
            18,
            "#xD800;".to_owned()
        )]
    );
}

/// Rust-only: a numeric reference without `;` and out of range raises two errors at
/// one position, missing-semicolon first. Expected values from the TS rule.
#[test]
fn v6_no_malformed_character_reference_003() {
    assert_eq!(
        summary(&run("<p>&#x110000</p>")),
        vec![
            (
                "The character reference is missing-semicolon-after-character-reference".to_owned(),
                1,
                13,
                "#x110000".to_owned()
            ),
            (
                "The character reference is character-reference-outside-unicode-range".to_owned(),
                1,
                13,
                "#x110000".to_owned()
            ),
        ]
    );
}

/// Rust-only: references in RCDATA (`textarea`, `title`) are decoded and checked;
/// script data has no references. Expected values from the TS rule.
#[test]
fn v6_no_malformed_character_reference_004() {
    assert_eq!(
        summary(&run("<textarea>&xyz;</textarea>")),
        vec![(
            "The character reference is unknown-named-character-reference".to_owned(),
            1,
            15,
            "xyz;".to_owned()
        )]
    );
    assert_eq!(
        summary(&run("<title>&#0;</title>")),
        vec![(
            "The character reference is null-character-reference".to_owned(),
            1,
            12,
            "#0;".to_owned()
        )]
    );
    assert_eq!(run("<script>&#0;</script>").len(), 0);
}

/// Rust-only: line and column on later lines, and in a whole document.
/// Expected values from the TS rule.
#[test]
fn v6_no_malformed_character_reference_005() {
    assert_eq!(
        summary(&run("<p>\n  a &xyz; b\n  &#0;\n</p>")),
        vec![
            (
                "The character reference is unknown-named-character-reference".to_owned(),
                2,
                9,
                "xyz;".to_owned()
            ),
            (
                "The character reference is null-character-reference".to_owned(),
                3,
                7,
                "#0;".to_owned()
            ),
        ]
    );
    assert_eq!(
        summary(&run("<!doctype html><html><body>&xyz;</body></html>")),
        vec![(
            "The character reference is unknown-named-character-reference".to_owned(),
            1,
            32,
            "xyz;".to_owned()
        )]
    );
}

/// Rust-only: well-formed references, an unknown name without `;`, and a bare `&` are
/// not reported. Expected values from the TS rule.
#[test]
fn v6_no_malformed_character_reference_006() {
    for html in [
        "<p>&notin;</p>",
        "<p>&#x0000000041;</p>",
        "<p>&xyz</p>",
        "<p>&x</p>",
        "<p>&abc=</p>",
    ] {
        assert_eq!(run(html).len(), 0, "{html}");
    }
}
