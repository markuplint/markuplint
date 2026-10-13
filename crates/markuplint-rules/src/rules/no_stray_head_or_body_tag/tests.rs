//! Tests for `no-stray-head-or-body-tag` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-stray-head-or-body-tag-invalid-001  → no_stray_head_or_body_tag_invalid_001
//!   no-stray-head-or-body-tag-valid-001    → no_stray_head_or_body_tag_valid_001
//!   no-stray-head-or-body-tag-valid-002    → no_stray_head_or_body_tag_valid_002
//!   v6_no_stray_head_or_body_tag_001  — Rust-only: an orphaned `</head>` between text is its own (bogus) text node
//!   v6_no_stray_head_or_body_tag_002  — Rust-only: a duplicate `<body>` between whitespace stays in that text
//!   v6_no_stray_head_or_body_tag_003  — Rust-only: tag names match case-insensitively, before whitespace, `/` or `>`
//!
//! Known differences, both from facts the Rust parser does not produce:
//! - A duplicate `<body>` start tag with no character data around it
//!   (`<p>x</p><body class=a></body>`) is not reported. The tree builder ignores the token
//!   without recording it, so no text node covers it; TS turns the uncovered source into a
//!   text node and reports it.
//! - `</head>` inside `<xmp>` is not reported: the Rust parser reads `<xmp>` content as raw
//!   text, as the HTML standard does. TS re-tokenizes it into an orphaned end tag and reports it.

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const RULE: &str = "no-stray-head-or-body-tag";
const STRAY_HEAD: &str = "A stray \"head\" end tag detected";
const DUPLICATE_BODY: &str = "A duplicate \"body\" start tag detected";

fn run(html: &str) -> Vec<Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: true } }))
}

const MATH_IN_HEAD: &str = "<!doctype html>
<head>
<meta charset=utf-8>
<title>math in head</title>
<math><mi>x</mi></math>
</head>
<body></body>
";

/// TS: `[no-stray-head-or-body-tag-invalid-001]` disallowed head content leaves a stray end tag and a duplicate body start tag
#[test]
fn no_stray_head_or_body_tag_invalid_001() {
    const _ID: &str = "no-stray-head-or-body-tag-invalid-001";
    assert_eq!(
        run(MATH_IN_HEAD),
        [
            brief(Severity::Error, 5, 24, STRAY_HEAD, "\n</head>\n<body></body>\n"),
            brief(Severity::Error, 5, 24, DUPLICATE_BODY, "\n</head>\n<body></body>\n"),
        ]
    );
}

/// TS: `[no-stray-head-or-body-tag-valid-001]` a normal document has no stray tags
#[test]
fn no_stray_head_or_body_tag_valid_001() {
    const _ID: &str = "no-stray-head-or-body-tag-valid-001";
    assert_eq!(
        run("<!doctype html><head><title>ok</title></head><body><p>hi</p></body>"),
        []
    );
}

/// TS: `[no-stray-head-or-body-tag-valid-002]` tag-shaped text inside script/style/title is not flagged
#[test]
fn no_stray_head_or_body_tag_valid_002() {
    const _ID: &str = "no-stray-head-or-body-tag-valid-002";
    assert_eq!(
        run("<!doctype html><head><title><body></title><script>const s = '<body>';</script></head><body></body>"),
        []
    );
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input.
#[test]
fn v6_no_stray_head_or_body_tag_001() {
    assert_eq!(
        run("<!doctype html><body>a</head>b</body>"),
        [brief(Severity::Error, 1, 23, STRAY_HEAD, "</head>")]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input.
#[test]
fn v6_no_stray_head_or_body_tag_002() {
    assert_eq!(
        run("<!doctype html><body><p>x</p> <body class=a> </body>"),
        [brief(Severity::Error, 1, 30, DUPLICATE_BODY, " <body class=a> ")]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input.
#[test]
fn v6_no_stray_head_or_body_tag_003() {
    assert_eq!(
        run("<!doctype html><head></head><body>x <BODY\ta> y</head > z</body>"),
        [
            brief(Severity::Error, 1, 35, STRAY_HEAD, "x <BODY\ta> y</head > z"),
            brief(Severity::Error, 1, 35, DUPLICATE_BODY, "x <BODY\ta> y</head > z"),
        ]
    );
}
