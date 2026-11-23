//! Tests for `no-mismatched-aspect-ratio`.
//!
//! Test ID mapping (TS → Rust):
//!   no-mismatched-aspect-ratio-001 → no_mismatched_aspect_ratio_001
//!   no-mismatched-aspect-ratio-002 → no_mismatched_aspect_ratio_002
//!   no-mismatched-aspect-ratio-003 → no_mismatched_aspect_ratio_003
//!   no-mismatched-aspect-ratio-004 → no_mismatched_aspect_ratio_004
//!   no-mismatched-aspect-ratio-005 → no_mismatched_aspect_ratio_005
//!   no-mismatched-aspect-ratio-006 → no_mismatched_aspect_ratio_006
//!   no-mismatched-aspect-ratio-007 → no_mismatched_aspect_ratio_007
//!   no-mismatched-aspect-ratio-008 → no_mismatched_aspect_ratio_008
//!   no-mismatched-aspect-ratio-009 → no_mismatched_aspect_ratio_009
//!   no-mismatched-aspect-ratio-010 → no_mismatched_aspect_ratio_010
//!   no-mismatched-aspect-ratio-011 → no_mismatched_aspect_ratio_011
//!   no-mismatched-aspect-ratio-012 → no_mismatched_aspect_ratio_012
//!   no-mismatched-aspect-ratio-013 → no_mismatched_aspect_ratio_013
//!   no-mismatched-aspect-ratio-014 → no_mismatched_aspect_ratio_014
//!   no-mismatched-aspect-ratio-015 → no_mismatched_aspect_ratio_015
//!   no-mismatched-aspect-ratio-016 → no_mismatched_aspect_ratio_016
//!   no-mismatched-aspect-ratio-017 → no_mismatched_aspect_ratio_017
//!   no-mismatched-aspect-ratio-020 → no_mismatched_aspect_ratio_020
//!   no-mismatched-aspect-ratio-021 → no_mismatched_aspect_ratio_021
//!   no-mismatched-aspect-ratio-022 → no_mismatched_aspect_ratio_022
//!   no-mismatched-aspect-ratio-023 → no_mismatched_aspect_ratio_023
//!   no-mismatched-aspect-ratio-024 → no_mismatched_aspect_ratio_024
//!   no-mismatched-aspect-ratio-025 → no_mismatched_aspect_ratio_025
//!   no-mismatched-aspect-ratio-026 → no_mismatched_aspect_ratio_026
//!   no-mismatched-aspect-ratio-027 → no_mismatched_aspect_ratio_027
//!   no-mismatched-aspect-ratio-028 → no_mismatched_aspect_ratio_028
//!   no-mismatched-aspect-ratio-029 → no_mismatched_aspect_ratio_029
//!   no-mismatched-aspect-ratio-030 → no_mismatched_aspect_ratio_030
//!   no-mismatched-aspect-ratio-031 → no_mismatched_aspect_ratio_031
//!   no-mismatched-aspect-ratio-032 → no_mismatched_aspect_ratio_032
//!   no-mismatched-aspect-ratio-033 → no_mismatched_aspect_ratio_033
//!   no-mismatched-aspect-ratio-034 → no_mismatched_aspect_ratio_034
//!   no-mismatched-aspect-ratio-018 — SKIP: Vue parser not available in Rust (covered by the parity run)
//!   no-mismatched-aspect-ratio-019 — SKIP: JSX parser not available in Rust (covered by the parity run)
//!   v6_no_mismatched_aspect_ratio_001 — Rust-only: a relative `src` resolves against the document's directory
//!   v6_no_mismatched_aspect_ratio_002 — Rust-only: a `src` that is no regular file is not checked
//!   v6_no_mismatched_aspect_ratio_003 — Rust-only: an unsupported image format is not checked
//!   v6_no_mismatched_aspect_ratio_004 — Rust-only: the format is told by magic bytes, not by the extension
//!   v6_no_mismatched_aspect_ratio_005 — Rust-only: a relative `src` with no file name resolves against `documentRoot`
//!   v6_no_mismatched_aspect_ratio_006 — Rust-only: protocol and case of remote URLs, srcset without a URL
//!   v6_no_mismatched_aspect_ratio_007 — Rust-only: a leading plus and a unit suffix of width/height are parsed like `parseInt`

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;
use std::path::PathBuf;

const RULE: &str = "no-mismatched-aspect-ratio";

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

/// The fixtures of the TS spec, the same two images the shared test IDs use.
fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../packages/@markuplint/rules/src/no-mismatched-aspect-ratio/fixtures")
}

fn lint_with(html: &str, rule: serde_json::Value, filename: Option<&str>) -> Vec<Violation> {
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { RULE: rule },
        "rule_common_settings": { "filename": filename },
    }))
    .unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// `documentRoot` set to the fixtures, as every TS test does.
fn run(html: &str) -> Vec<Violation> {
    let root = fixtures_dir();
    lint_with(
        html,
        serde_json::json!({ "value": true, "options": { "documentRoot": root.to_str().unwrap() } }),
        None,
    )
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

/// TS: `[no-mismatched-aspect-ratio-001]` same dimensions
#[test]
fn no_mismatched_aspect_ratio_001() {
    const _ID: &str = "no-mismatched-aspect-ratio-001";
    assert_violations(&run("<img src=\"/100x50.png\" width=\"100\" height=\"50\">"), &[]);
}

/// TS: `[no-mismatched-aspect-ratio-002]` scaled proportionally
#[test]
fn no_mismatched_aspect_ratio_002() {
    const _ID: &str = "no-mismatched-aspect-ratio-002";
    assert_violations(&run("<img src=\"/100x50.png\" width=\"200\" height=\"100\">"), &[]);
}

/// TS: `[no-mismatched-aspect-ratio-003]` square image with matching dimensions
#[test]
fn no_mismatched_aspect_ratio_003() {
    const _ID: &str = "no-mismatched-aspect-ratio-003";
    assert_violations(&run("<img src=\"/50x50.png\" width=\"100\" height=\"100\">"), &[]);
}

/// TS: `[no-mismatched-aspect-ratio-004]` square image with mismatched dimensions
#[test]
fn no_mismatched_aspect_ratio_004() {
    const _ID: &str = "no-mismatched-aspect-ratio-004";
    assert_violations(
        &run("<img src=\"/50x50.png\" width=\"100\" height=\"50\">"),
        &[(
            Severity::Error,
            1,
            1,
            "The aspect ratio of the image (50:50) does not match the width/height attributes (100:50)",
            "<img src=\"/50x50.png\" width=\"100\" height=\"50\">",
        )],
    );
}

/// TS: `[no-mismatched-aspect-ratio-005]` no src attribute
#[test]
fn no_mismatched_aspect_ratio_005() {
    const _ID: &str = "no-mismatched-aspect-ratio-005";
    assert_violations(&run("<img width=\"100\" height=\"50\">"), &[]);
}

/// TS: `[no-mismatched-aspect-ratio-006]` no width attribute
#[test]
fn no_mismatched_aspect_ratio_006() {
    const _ID: &str = "no-mismatched-aspect-ratio-006";
    assert_violations(&run("<img src=\"/100x50.png\" height=\"50\">"), &[]);
}

/// TS: `[no-mismatched-aspect-ratio-007]` no height attribute
#[test]
fn no_mismatched_aspect_ratio_007() {
    const _ID: &str = "no-mismatched-aspect-ratio-007";
    assert_violations(&run("<img src=\"/100x50.png\" width=\"100\">"), &[]);
}

/// TS: `[no-mismatched-aspect-ratio-008]` remote URL (https)
#[test]
fn no_mismatched_aspect_ratio_008() {
    const _ID: &str = "no-mismatched-aspect-ratio-008";
    assert_violations(
        &run("<img src=\"https://example.com/image.png\" width=\"100\" height=\"100\">"),
        &[],
    );
}

/// TS: `[no-mismatched-aspect-ratio-009]` remote URL (http)
#[test]
fn no_mismatched_aspect_ratio_009() {
    const _ID: &str = "no-mismatched-aspect-ratio-009";
    assert_violations(
        &run("<img src=\"http://example.com/image.png\" width=\"100\" height=\"100\">"),
        &[],
    );
}

/// TS: `[no-mismatched-aspect-ratio-010]` data URI
#[test]
fn no_mismatched_aspect_ratio_010() {
    const _ID: &str = "no-mismatched-aspect-ratio-010";
    assert_violations(
        &run("<img src=\"data:image/png;base64,abc\" width=\"100\" height=\"100\">"),
        &[],
    );
}

/// TS: `[no-mismatched-aspect-ratio-011]` non-img element is ignored
#[test]
fn no_mismatched_aspect_ratio_011() {
    const _ID: &str = "no-mismatched-aspect-ratio-011";
    assert_violations(
        &run("<video src=\"/100x50.png\" width=\"100\" height=\"100\"></video>"),
        &[],
    );
}

/// TS: `[no-mismatched-aspect-ratio-012]` nonexistent image file
#[test]
fn no_mismatched_aspect_ratio_012() {
    const _ID: &str = "no-mismatched-aspect-ratio-012";
    assert_violations(&run("<img src=\"/nonexistent.png\" width=\"100\" height=\"50\">"), &[]);
}

/// TS: `[no-mismatched-aspect-ratio-013]` resolves absolute path with documentRoot
#[test]
fn no_mismatched_aspect_ratio_013() {
    const _ID: &str = "no-mismatched-aspect-ratio-013";
    assert_violations(
        &run("<img src=\"/100x50.png\" width=\"100\" height=\"100\">"),
        &[(
            Severity::Error,
            1,
            1,
            "The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)",
            "<img src=\"/100x50.png\" width=\"100\" height=\"100\">",
        )],
    );
}

/// TS: `[no-mismatched-aspect-ratio-014]` without documentRoot, uses cwd (likely no fixture found)
#[test]
fn no_mismatched_aspect_ratio_014() {
    const _ID: &str = "no-mismatched-aspect-ratio-014";
    assert_violations(
        &lint_with(
            "<img src=\"/100x50.png\" width=\"100\" height=\"100\">",
            serde_json::json!(true),
            None,
        ),
        &[],
    );
}

/// TS: `[no-mismatched-aspect-ratio-015]` width=auto is skipped
#[test]
fn no_mismatched_aspect_ratio_015() {
    const _ID: &str = "no-mismatched-aspect-ratio-015";
    assert_violations(&run("<img src=\"/100x50.png\" width=\"auto\" height=\"50\">"), &[]);
}

/// TS: `[no-mismatched-aspect-ratio-016]` empty width is skipped
#[test]
fn no_mismatched_aspect_ratio_016() {
    const _ID: &str = "no-mismatched-aspect-ratio-016";
    assert_violations(&run("<img src=\"/100x50.png\" width=\"\" height=\"50\">"), &[]);
}

/// TS: `[no-mismatched-aspect-ratio-017]` zero width is skipped
#[test]
fn no_mismatched_aspect_ratio_017() {
    const _ID: &str = "no-mismatched-aspect-ratio-017";
    assert_violations(&run("<img src=\"/100x50.png\" width=\"0\" height=\"50\">"), &[]);
}

/// TS: `[no-mismatched-aspect-ratio-020]` multiple img elements, only one mismatch
#[test]
fn no_mismatched_aspect_ratio_020() {
    const _ID: &str = "no-mismatched-aspect-ratio-020";
    assert_violations(
        &run(
            "<img src=\"/100x50.png\" width=\"100\" height=\"50\"><img src=\"/100x50.png\" width=\"100\" height=\"100\">",
        ),
        &[(
            Severity::Error,
            1,
            48,
            "The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)",
            "<img src=\"/100x50.png\" width=\"100\" height=\"100\">",
        )],
    );
}

/// TS: `[no-mismatched-aspect-ratio-021]` same image referenced twice, both checked
#[test]
fn no_mismatched_aspect_ratio_021() {
    const _ID: &str = "no-mismatched-aspect-ratio-021";
    assert_violations(
        &run(
            "<img src=\"/100x50.png\" width=\"100\" height=\"100\"><img src=\"/100x50.png\" width=\"200\" height=\"100\">",
        ),
        &[(
            Severity::Error,
            1,
            1,
            "The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)",
            "<img src=\"/100x50.png\" width=\"100\" height=\"100\">",
        )],
    );
}

/// TS: `[no-mismatched-aspect-ratio-022]` src with query string
#[test]
fn no_mismatched_aspect_ratio_022() {
    const _ID: &str = "no-mismatched-aspect-ratio-022";
    assert_violations(
        &run("<img src=\"/100x50.png?v=123\" width=\"100\" height=\"100\">"),
        &[(
            Severity::Error,
            1,
            1,
            "The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)",
            "<img src=\"/100x50.png?v=123\" width=\"100\" height=\"100\">",
        )],
    );
}

/// TS: `[no-mismatched-aspect-ratio-023]` src with fragment
#[test]
fn no_mismatched_aspect_ratio_023() {
    const _ID: &str = "no-mismatched-aspect-ratio-023";
    assert_violations(
        &run("<img src=\"/50x50.png#section\" width=\"100\" height=\"50\">"),
        &[(
            Severity::Error,
            1,
            1,
            "The aspect ratio of the image (50:50) does not match the width/height attributes (100:50)",
            "<img src=\"/50x50.png#section\" width=\"100\" height=\"50\">",
        )],
    );
}

/// TS: `[no-mismatched-aspect-ratio-024]` same file with different query strings are both checked
#[test]
fn no_mismatched_aspect_ratio_024() {
    const _ID: &str = "no-mismatched-aspect-ratio-024";
    assert_violations(
        &run(
            "<img src=\"/100x50.png?v=1\" width=\"100\" height=\"100\"><img src=\"/100x50.png?v=2\" width=\"200\" height=\"100\">",
        ),
        &[(
            Severity::Error,
            1,
            1,
            "The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)",
            "<img src=\"/100x50.png?v=1\" width=\"100\" height=\"100\">",
        )],
    );
}

/// TS: `[no-mismatched-aspect-ratio-025]` negative width is skipped
#[test]
fn no_mismatched_aspect_ratio_025() {
    const _ID: &str = "no-mismatched-aspect-ratio-025";
    assert_violations(&run("<img src=\"/100x50.png\" width=\"-10\" height=\"50\">"), &[]);
}

/// TS: `[no-mismatched-aspect-ratio-026]` source with srcset mismatch
#[test]
fn no_mismatched_aspect_ratio_026() {
    const _ID: &str = "no-mismatched-aspect-ratio-026";
    assert_violations(
        &run("<picture><source srcset=\"/100x50.png\" width=\"100\" height=\"100\"></picture>"),
        &[(
            Severity::Error,
            1,
            10,
            "The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)",
            "<source srcset=\"/100x50.png\" width=\"100\" height=\"100\">",
        )],
    );
}

/// TS: `[no-mismatched-aspect-ratio-027]` source with srcset match
#[test]
fn no_mismatched_aspect_ratio_027() {
    const _ID: &str = "no-mismatched-aspect-ratio-027";
    assert_violations(
        &run("<picture><source srcset=\"/100x50.png\" width=\"200\" height=\"100\"></picture>"),
        &[],
    );
}

/// TS: `[no-mismatched-aspect-ratio-028]` source inside video is skipped
#[test]
fn no_mismatched_aspect_ratio_028() {
    const _ID: &str = "no-mismatched-aspect-ratio-028";
    assert_violations(
        &run("<video><source srcset=\"/100x50.png\" width=\"100\" height=\"100\"></video>"),
        &[],
    );
}

/// TS: `[no-mismatched-aspect-ratio-029]` source with multiple srcset entries
#[test]
fn no_mismatched_aspect_ratio_029() {
    const _ID: &str = "no-mismatched-aspect-ratio-029";
    assert_violations(
        &run("<picture><source srcset=\"/100x50.png 1x, /50x50.png 2x\" width=\"100\" height=\"100\"></picture>"),
        &[(
            Severity::Error,
            1,
            10,
            "The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)",
            "<source srcset=\"/100x50.png 1x, /50x50.png 2x\" width=\"100\" height=\"100\">",
        )],
    );
}

/// TS: `[no-mismatched-aspect-ratio-030]` source without width/height
#[test]
fn no_mismatched_aspect_ratio_030() {
    const _ID: &str = "no-mismatched-aspect-ratio-030";
    assert_violations(&run("<picture><source srcset=\"/100x50.png\"></picture>"), &[]);
}

/// TS: `[no-mismatched-aspect-ratio-031]` picture with img fallback (both checked)
#[test]
fn no_mismatched_aspect_ratio_031() {
    const _ID: &str = "no-mismatched-aspect-ratio-031";
    assert_violations(
        &run(
            "<picture><source srcset=\"/100x50.png\" width=\"100\" height=\"100\"><img src=\"/50x50.png\" width=\"100\" height=\"50\"></picture>",
        ),
        &[
            (
                Severity::Error,
                1,
                10,
                "The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)",
                "<source srcset=\"/100x50.png\" width=\"100\" height=\"100\">",
            ),
            (
                Severity::Error,
                1,
                64,
                "The aspect ratio of the image (50:50) does not match the width/height attributes (100:50)",
                "<img src=\"/50x50.png\" width=\"100\" height=\"50\">",
            ),
        ],
    );
}

/// TS: `[no-mismatched-aspect-ratio-032]` mismatch of exactly 0.5px is within tolerance
#[test]
fn no_mismatched_aspect_ratio_032() {
    const _ID: &str = "no-mismatched-aspect-ratio-032";
    assert_violations(&run("<img src=\"/100x50.png\" width=\"301\" height=\"150\">"), &[]);
}

/// TS: `[no-mismatched-aspect-ratio-033]` mismatch of more than 0.5px is still reported
#[test]
fn no_mismatched_aspect_ratio_033() {
    const _ID: &str = "no-mismatched-aspect-ratio-033";
    assert_violations(
        &run("<img src=\"/100x50.png\" width=\"301\" height=\"149\">"),
        &[(
            Severity::Error,
            1,
            1,
            "The aspect ratio of the image (100:50) does not match the width/height attributes (301:149)",
            "<img src=\"/100x50.png\" width=\"301\" height=\"149\">",
        )],
    );
}

/// TS: `[no-mismatched-aspect-ratio-034]` no violations when rule is disabled
#[test]
fn no_mismatched_aspect_ratio_034() {
    const _ID: &str = "no-mismatched-aspect-ratio-034";
    assert_violations(
        &lint_with(
            "<img src=\"/100x50.png\" width=\"100\" height=\"100\">",
            serde_json::json!(false),
            None,
        ),
        &[],
    );
}

fn scratch_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("markuplint-aspect-ratio-{}-{name}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn run_in(root: &std::path::Path, html: &str) -> Vec<Violation> {
    lint_with(
        html,
        serde_json::json!({ "value": true, "options": { "documentRoot": root.to_str().unwrap() } }),
        None,
    )
}

#[test]
fn v6_no_mismatched_aspect_ratio_001() {
    let page = fixtures_dir().join("page.html");
    let violations = lint_with(
        "<img src=\"100x50.png\" width=\"100\" height=\"100\">",
        serde_json::json!(true),
        page.to_str(),
    );
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
    assert_eq!(
        violations[0].message,
        "The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)"
    );
    // A `/` path is still under `documentRoot` (here the current directory, which has no such file).
    let violations = lint_with(
        "<img src=\"/100x50.png\" width=\"100\" height=\"100\">",
        serde_json::json!(true),
        page.to_str(),
    );
    assert_eq!(violations.len(), 0);
}

#[test]
fn v6_no_mismatched_aspect_ratio_002() {
    let dir = scratch_dir("002");
    std::fs::create_dir(dir.join("folder.png")).unwrap();
    assert_violations(
        &run_in(&dir, "<img src=\"/folder.png\" width=\"100\" height=\"100\">"),
        &[],
    );
    assert_violations(&run_in(&dir, "<img src=\"/\" width=\"100\" height=\"100\">"), &[]);
    assert_violations(&run_in(&dir, "<img src=\"\" width=\"100\" height=\"100\">"), &[]);
    #[cfg(unix)]
    {
        // Opening a FIFO for reading would block until a writer appears.
        let fifo = dir.join("pipe.png");
        let made = std::process::Command::new("mkfifo").arg(&fifo).status().unwrap();
        assert!(made.success());
        assert_violations(
            &run_in(&dir, "<img src=\"/pipe.png\" width=\"100\" height=\"100\">"),
            &[],
        );
    }
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn v6_no_mismatched_aspect_ratio_003() {
    let dir = scratch_dir("003");
    std::fs::write(dir.join("text.png"), "not an image at all").unwrap();
    std::fs::write(dir.join("tiff.png"), b"II*\0\x08\0\0\0\0\0\0\0\0\0\0\0").unwrap();
    assert_violations(
        &run_in(&dir, "<img src=\"/text.png\" width=\"100\" height=\"100\">"),
        &[],
    );
    assert_violations(
        &run_in(&dir, "<img src=\"/tiff.png\" width=\"100\" height=\"100\">"),
        &[],
    );
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn v6_no_mismatched_aspect_ratio_004() {
    let dir = scratch_dir("004");
    std::fs::copy(fixtures_dir().join("100x50.png"), dir.join("photo.jpg")).unwrap();
    let violations = run_in(&dir, "<img src=\"/photo.jpg\" width=\"100\" height=\"100\">");
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
    assert!(violations[0].message.contains("(100:50)"));
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn v6_no_mismatched_aspect_ratio_005() {
    let violations = run("<img src=\"100x50.png\" width=\"100\" height=\"100\">");
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
}

#[test]
fn v6_no_mismatched_aspect_ratio_006() {
    assert_violations(
        &run("<img src=\"HTTPS://example.com/100x50.png\" width=\"100\" height=\"100\">"),
        &[],
    );
    assert_violations(
        &run("<img src=\"DATA:image/png;base64,abc\" width=\"100\" height=\"100\">"),
        &[],
    );
    assert_violations(
        &run("<picture><source srcset=\" \" width=\"100\" height=\"100\"></picture>"),
        &[],
    );
    assert_violations(
        &run("<picture><source srcset=\"\" width=\"100\" height=\"100\"></picture>"),
        &[],
    );
}

#[test]
fn v6_no_mismatched_aspect_ratio_007() {
    // `parseInt("+200px")` is 200: the ratio matches, so nothing is reported.
    assert_violations(&run("<img src=\"/100x50.png\" width=\"+200px\" height=\"100\">"), &[]);
    let violations = run("<img src=\"/100x50.png\" width=\"+100px\" height=\"100\">");
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            1,
            "The aspect ratio of the image (100:50) does not match the width/height attributes (+100px:100)",
            "<img src=\"/100x50.png\" width=\"+100px\" height=\"100\">",
        )],
    );
}
