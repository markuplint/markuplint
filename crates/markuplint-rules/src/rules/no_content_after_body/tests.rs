//! Tests for `no-content-after-body` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-content-after-body-invalid-001  → no_content_after_body_invalid_001
//!   no-content-after-body-invalid-002  → no_content_after_body_invalid_002
//!   no-content-after-body-valid-001    → no_content_after_body_valid_001
//!   no-content-after-body-valid-002    → no_content_after_body_valid_002
//!   no-content-after-body-valid-003    → no_content_after_body_valid_003
//!   v6_no_content_after_body_001  — Rust-only: elements after `</body>` and after `</html>` are reported, a comment is not
//!   v6_no_content_after_body_002  — Rust-only: a text node that starts before `</body>` is not reported
//!   v6_no_content_after_body_003  — Rust-only: the whitespace around `</html>` after `</body>` is not content
//!
//! Known difference: text after `</html>` that follows `</body>` (`</body>\n</html>y`) is
//! reported here. TS splits the parser's text node at `</html>` and moves the text after it
//! out of `<body>`, so it reports nothing.

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const RULE: &str = "no-content-after-body";
const MESSAGE: &str = "Content after the end tag of the \"body\" element is not allowed";

fn run(html: &str) -> Vec<Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: true } }))
}

/// TS: `[no-content-after-body-invalid-001]` a start tag after the body end tag
#[test]
fn no_content_after_body_invalid_001() {
    const _ID: &str = "no-content-after-body-invalid-001";
    assert_eq!(
        run("<!doctype html>\n<body>\n</body>\n<p>stray paragraph</p>\n"),
        [brief(Severity::Error, 4, 1, MESSAGE, "<p>")]
    );
}

/// TS: `[no-content-after-body-invalid-002]` non-whitespace text after the body end tag
#[test]
fn no_content_after_body_invalid_002() {
    const _ID: &str = "no-content-after-body-invalid-002";
    assert_eq!(
        run("<!doctype html>\n<body></body>text\n"),
        [brief(Severity::Error, 2, 14, MESSAGE, "text\n")]
    );
}

/// TS: `[no-content-after-body-valid-001]` trailing whitespace after the body end tag is allowed
#[test]
fn no_content_after_body_valid_001() {
    const _ID: &str = "no-content-after-body-valid-001";
    assert_eq!(run("<!doctype html>\n<body></body>\n\n"), []);
}

/// TS: `[no-content-after-body-valid-002]` no explicit body end tag
#[test]
fn no_content_after_body_valid_002() {
    const _ID: &str = "no-content-after-body-valid-002";
    assert_eq!(run("<!doctype html>\n<body><p>only paragraph</p>"), []);
}

/// TS: `[no-content-after-body-valid-003]` content nested inside the body element
#[test]
fn no_content_after_body_valid_003() {
    const _ID: &str = "no-content-after-body-valid-003";
    assert_eq!(run("<!doctype html>\n<body><p>inside body</p></body>"), []);
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input. The text `\n</body>\nb`
/// starts before `</body>` and is not reported.
#[test]
fn v6_no_content_after_body_001() {
    assert_eq!(
        run("<!doctype html>\n<body>\n</body>\nb<div>x</div>\n<!-- c -->\n</html>\n<span>y</span>"),
        [
            brief(Severity::Error, 4, 2, MESSAGE, "<div>"),
            brief(Severity::Error, 7, 1, MESSAGE, "<span>"),
        ]
    );
}

/// The parser folds `a</body>b` into one text node that starts inside `<body>`; TS
/// (`mlRuleTest`) reports nothing either.
#[test]
fn v6_no_content_after_body_002() {
    assert_eq!(run("<!doctype html>\n<body>a</body>b"), []);
}

/// A document whose `<body>` ends with an element: the whitespace text after `</body>` spans
/// `</html>`, which the parser consumed. TS (`mlRuleTest`) reports nothing either.
#[test]
fn v6_no_content_after_body_003() {
    assert_eq!(run("<!doctype html>\n<html>\n<body>\n<p>x</p></body>\n</html>\n"), []);
}
