//! Tests for `no-aria-hidden-on-hidden-until-found` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-aria-hidden-on-hidden-until-found-valid-001    → no_aria_hidden_on_hidden_until_found_valid_001
//!   no-aria-hidden-on-hidden-until-found-valid-002    → no_aria_hidden_on_hidden_until_found_valid_002
//!   no-aria-hidden-on-hidden-until-found-valid-003    → no_aria_hidden_on_hidden_until_found_valid_003
//!   no-aria-hidden-on-hidden-until-found-invalid-001  → no_aria_hidden_on_hidden_until_found_invalid_001
//!   no-aria-hidden-on-hidden-until-found-invalid-002  → no_aria_hidden_on_hidden_until_found_invalid_002
//!   no-aria-hidden-on-hidden-until-found-parser-001   — SKIP: Vue parser (dynamic `:aria-hidden`) not available in Rust
//!   v6_no_aria_hidden_on_hidden_until_found_001  — Rust-only: the report is on the attribute, across lines, with tab/newline padding
//!   v6_no_aria_hidden_on_hidden_until_found_002  — Rust-only: `aria-hidden` is looked up by the name as written, `hidden` case-insensitively
//!   v6_no_aria_hidden_on_hidden_until_found_003  — Rust-only: the first of duplicate `aria-hidden` attributes counts

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const RULE: &str = "no-aria-hidden-on-hidden-until-found";
const MESSAGE: &str = "\"aria-hidden\" must not be \"true\" on an element with \"hidden\" value \"until-found\"";

fn run(html: &str) -> Vec<Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: true } }))
}

/// TS: `[no-aria-hidden-on-hidden-until-found-valid-001]` hidden=until-found without aria-hidden
#[test]
fn no_aria_hidden_on_hidden_until_found_valid_001() {
    const _ID: &str = "no-aria-hidden-on-hidden-until-found-valid-001";
    assert_eq!(run(r#"<div hidden="until-found">Hidden content</div>"#), []);
}

/// TS: `[no-aria-hidden-on-hidden-until-found-valid-002]` aria-hidden=true with a plain hidden attribute
#[test]
fn no_aria_hidden_on_hidden_until_found_valid_002() {
    const _ID: &str = "no-aria-hidden-on-hidden-until-found-valid-002";
    assert_eq!(run(r#"<div hidden aria-hidden="true">Hidden content</div>"#), []);
}

/// TS: `[no-aria-hidden-on-hidden-until-found-valid-003]` aria-hidden=false with hidden=until-found
#[test]
fn no_aria_hidden_on_hidden_until_found_valid_003() {
    const _ID: &str = "no-aria-hidden-on-hidden-until-found-valid-003";
    assert_eq!(
        run(r#"<div hidden="until-found" aria-hidden="false">Hidden content</div>"#),
        []
    );
}

/// TS: `[no-aria-hidden-on-hidden-until-found-invalid-001]` aria-hidden=true with hidden=until-found
#[test]
fn no_aria_hidden_on_hidden_until_found_invalid_001() {
    const _ID: &str = "no-aria-hidden-on-hidden-until-found-invalid-001";
    assert_eq!(
        run(r#"<div hidden="until-found" aria-hidden="true">Hidden content</div>"#),
        [brief(Severity::Error, 1, 27, MESSAGE, r#"aria-hidden="true""#)]
    );
}

/// TS: `[no-aria-hidden-on-hidden-until-found-invalid-002]` case-insensitive and whitespace-padded values still match
#[test]
fn no_aria_hidden_on_hidden_until_found_invalid_002() {
    const _ID: &str = "no-aria-hidden-on-hidden-until-found-invalid-002";
    assert_eq!(
        run(r#"<div hidden=" UNTIL-FOUND " aria-hidden=" TRUE ">Hidden content</div>"#),
        [brief(Severity::Error, 1, 29, MESSAGE, r#"aria-hidden=" TRUE ""#)]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input.
#[test]
fn v6_no_aria_hidden_on_hidden_until_found_001() {
    assert_eq!(
        run("<div\n  aria-hidden=\"\ttrue\n\"\n  hidden=until-found>x</div>"),
        [brief(Severity::Error, 2, 3, MESSAGE, "aria-hidden=\"\ttrue\n\"")]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) on the same inputs. TS
/// `getAttributeNode('aria-hidden')` compares the lower-cased query with the name as written,
/// so `ARIA-HIDDEN` is not found, while `getAttribute('hidden')` lower-cases both sides.
#[test]
fn v6_no_aria_hidden_on_hidden_until_found_002() {
    assert_eq!(run(r#"<div ARIA-HIDDEN="true" hidden="until-found">x</div>"#), []);
    assert_eq!(
        run(r#"<div aria-hidden="true" HIDDEN="until-found">x</div>"#),
        [brief(Severity::Error, 1, 6, MESSAGE, r#"aria-hidden="true""#)]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input.
#[test]
fn v6_no_aria_hidden_on_hidden_until_found_003() {
    assert_eq!(
        run(r#"<p hidden="until-found" aria-hidden="true" aria-hidden="false">x</p>"#),
        [brief(Severity::Error, 1, 25, MESSAGE, r#"aria-hidden="true""#)]
    );
}
