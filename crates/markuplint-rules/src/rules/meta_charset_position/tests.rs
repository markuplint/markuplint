//! Tests for `meta-charset-position` rule.
//!
//! Test ID mapping (TS → Rust):
//!   meta-charset-position-invalid-001  → meta_charset_position_invalid_001
//!   meta-charset-position-invalid-002  → meta_charset_position_invalid_002
//!   meta-charset-position-valid-001    → meta_charset_position_valid_001
//!   meta-charset-position-valid-002    → meta_charset_position_valid_002
//!   v6_meta_charset_position_001  — Rust-only: the limit counts UTF-8 bytes, not characters
//!   v6_meta_charset_position_002  — Rust-only: a declaration that starts within the limit is not reported
//!   v6_meta_charset_position_003  — Rust-only: `http-equiv` matches `content-type` case-insensitively only

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const RULE: &str = "meta-charset-position";
const MESSAGE: &str = "The character encoding declaration must be within the first 1024 bytes of the document";

fn run(html: &str) -> Vec<Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: true } }))
}

/// TS: `[meta-charset-position-invalid-001]` meta charset serialized after the first 1024 bytes
#[test]
fn meta_charset_position_invalid_001() {
    const _ID: &str = "meta-charset-position-invalid-001";
    let padding = "#".repeat(1002);
    let code = format!("<!doctype html><!--{padding}--><meta charset=utf-8>");
    let meta_offset = u32::try_from(code.find("<meta").unwrap()).unwrap();
    assert_eq!(
        run(&code),
        [brief(
            Severity::Error,
            1,
            meta_offset + 1,
            MESSAGE,
            "<meta charset=utf-8>"
        )]
    );
}

/// TS: `[meta-charset-position-invalid-002]` meta http-equiv content-type serialized after the first 1024 bytes
#[test]
fn meta_charset_position_invalid_002() {
    const _ID: &str = "meta-charset-position-invalid-002";
    let padding = "#".repeat(1002);
    let code = format!(
        r#"<!doctype html><!--{padding}--><meta http-equiv="Content-Type" content="text/html; charset=utf-8">"#
    );
    assert_eq!(
        run(&code),
        [brief(
            Severity::Error,
            1,
            1025,
            MESSAGE,
            r#"<meta http-equiv="Content-Type" content="text/html; charset=utf-8">"#
        )]
    );
}

/// TS: `[meta-charset-position-valid-001]` meta charset within the first 1024 bytes
#[test]
fn meta_charset_position_valid_001() {
    const _ID: &str = "meta-charset-position-valid-001";
    let padding = "#".repeat(1001);
    let code = format!("<!doctype html><!--{padding}--><meta charset=utf-8>");
    assert_eq!(run(&code), []);
}

/// TS: `[meta-charset-position-valid-002]` no character encoding declaration present
#[test]
fn meta_charset_position_valid_002() {
    const _ID: &str = "meta-charset-position-valid-002";
    assert_eq!(run("<!doctype html><title>no charset</title>"), []);
}

/// 335 three-byte characters put the declaration at byte 1027 but at character 357.
/// Expected values from the TS rule (`mlRuleTest`) on the same input.
#[test]
fn v6_meta_charset_position_001() {
    let padding = "あ".repeat(335);
    let code = format!("<!doctype html><!--{padding}--><meta charset=utf-8>");
    assert_eq!(
        run(&code),
        [brief(Severity::Error, 1, 358, MESSAGE, "<meta charset=utf-8>")]
    );
}

/// The first declaration starts at byte 1023 and is not reported although it ends past the
/// limit; the second starts past it. Expected values from the TS rule (`mlRuleTest`).
#[test]
fn v6_meta_charset_position_002() {
    let padding = "#".repeat(1001);
    let code = format!("<!doctype html><!--{padding}--><meta charset=utf-8><meta charset=utf-8>");
    assert_eq!(
        run(&code),
        [brief(Severity::Error, 1, 1044, MESSAGE, "<meta charset=utf-8>")]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input.
#[test]
fn v6_meta_charset_position_003() {
    let padding = "#".repeat(1001);
    let code = format!(
        "<!doctype html><!--{padding}--><meta http-equiv=refresh content=0><meta http-equiv=CONTENT-TYPE content=x>"
    );
    assert_eq!(
        run(&code),
        [brief(
            Severity::Error,
            1,
            1059,
            MESSAGE,
            "<meta http-equiv=CONTENT-TYPE content=x>"
        )]
    );
}
