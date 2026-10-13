//! Tests for `head-element-order` rule.
//!
//! Test ID mapping (TS → Rust):
//!   head-element-order-valid-001    → head_element_order_valid_001
//!   head-element-order-invalid-001  → head_element_order_invalid_001
//!   head-element-order-valid-002    → head_element_order_valid_002
//!   head-element-order-valid-003    → head_element_order_valid_003
//!   head-element-order-valid-004    → head_element_order_valid_004
//!   head-element-order-valid-005    → head_element_order_valid_005
//!   head-element-order-invalid-002  → head_element_order_invalid_002
//!   head-element-order-valid-006    → head_element_order_valid_006
//!   head-element-order-valid-007    → head_element_order_valid_007
//!   head-element-order-invalid-003  → head_element_order_invalid_003
//!   head-element-order-valid-008    → head_element_order_valid_008
//!   head-element-order-invalid-004  → head_element_order_invalid_004
//!   head-element-order-valid-009    → head_element_order_valid_009
//!   head-element-order-invalid-005  → head_element_order_invalid_005
//!   head-element-order-valid-010    → head_element_order_valid_010
//!   head-element-order-invalid-006  → head_element_order_invalid_006
//!   head-element-order-invalid-007  → head_element_order_invalid_007
//!   head-element-order-valid-011    → head_element_order_valid_011
//!   head-element-order-valid-012    → head_element_order_valid_012
//!   head-element-order-invalid-008  → head_element_order_invalid_008
//!   head-element-order-valid-013    → head_element_order_valid_013
//!   head-element-order-valid-014    → head_element_order_valid_014
//!   head-element-order-valid-015    → head_element_order_valid_015
//!   head-element-order-invalid-009  → head_element_order_invalid_009
//!   head-element-order-invalid-010  — SKIP: i18n (ja locale) not supported in Rust
//!   head-element-order-fix-*        — SKIP: auto-fix not implemented in Rust
//!   v6_head_element_order_001  — Rust-only: every out-of-place child is reported where it stands
//!   v6_head_element_order_002  — Rust-only: alphabetical order reports each misplaced `meta`
//!   v6_head_element_order_003  — Rust-only: `true` uses the default order

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const RULE: &str = "head-element-order";

fn run(html: &str, rule: serde_json::Value) -> Vec<Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: rule } }))
}

fn run_value(html: &str, value: serde_json::Value) -> Vec<Brief> {
    run(html, serde_json::json!({ "value": value }))
}

fn warn(col: u32, message: &str, raw: &str) -> Brief {
    brief(Severity::Warning, 1, col, message, raw)
}

/// TS: `[head-element-order-valid-001]` correct order: no violations
#[test]
fn head_element_order_valid_001() {
    const _ID: &str = "head-element-order-valid-001";
    let v = run_value(
        r#"<html><head><meta charset="UTF-8"><title>Title</title><link rel="stylesheet" href="style.css"></head><body></body></html>"#,
        serde_json::json!(["meta[charset]", "title", "link"]),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-invalid-001]` wrong order: title before meta[charset]
#[test]
fn head_element_order_invalid_001() {
    const _ID: &str = "head-element-order-invalid-001";
    let v = run_value(
        r#"<html><head><title>Title</title><meta charset="UTF-8"></head><body></body></html>"#,
        serde_json::json!(["meta[charset]", "title", "link"]),
    );
    assert_eq!(v.len(), 2, "{v:?}");
}

/// TS: `[head-element-order-valid-002]` empty head: no violations
#[test]
fn head_element_order_valid_002() {
    const _ID: &str = "head-element-order-valid-002";
    let v = run_value(
        "<html><head></head><body></body></html>",
        serde_json::json!(["meta[charset]", "title"]),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-valid-003]` no head: no violations
#[test]
fn head_element_order_valid_003() {
    const _ID: &str = "head-element-order-valid-003";
    let v = run_value(
        "<html><body></body></html>",
        serde_json::json!(["meta[charset]", "title"]),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-valid-004]` single child: no violations
#[test]
fn head_element_order_valid_004() {
    const _ID: &str = "head-element-order-valid-004";
    let v = run_value(
        "<html><head><title>Title</title></head><body></body></html>",
        serde_json::json!(["meta[charset]", "title"]),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-valid-005]` unmatched elements go to the end
#[test]
fn head_element_order_valid_005() {
    const _ID: &str = "head-element-order-valid-005";
    let v = run_value(
        r#"<html><head><meta charset="UTF-8"><title>Title</title><base href="/"></head><body></body></html>"#,
        serde_json::json!(["meta[charset]", "title"]),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-invalid-002]` unmatched element before matched: violation
#[test]
fn head_element_order_invalid_002() {
    const _ID: &str = "head-element-order-invalid-002";
    let v = run_value(
        r#"<html><head><base href="/"><meta charset="UTF-8"><title>Title</title></head><body></body></html>"#,
        serde_json::json!(["meta[charset]", "title"]),
    );
    assert_eq!(v.len(), 3, "{v:?}");
}

/// TS: `[head-element-order-valid-006]` same group preserves source order
#[test]
fn head_element_order_valid_006() {
    const _ID: &str = "head-element-order-valid-006";
    let v = run_value(
        r#"<html><head><link rel="stylesheet" href="a.css"><link rel="stylesheet" href="b.css"></head><body></body></html>"#,
        serde_json::json!(["link"]),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-valid-007]` selector conflict: more specific selector wins by position
#[test]
fn head_element_order_valid_007() {
    const _ID: &str = "head-element-order-valid-007";
    let v = run_value(
        r#"<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head><body></body></html>"#,
        serde_json::json!(["meta[charset]", "meta"]),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-invalid-003]` selector conflict: meta[charset] matched before meta
#[test]
fn head_element_order_invalid_003() {
    const _ID: &str = "head-element-order-invalid-003";
    let v = run_value(
        r#"<html><head><meta name="viewport" content="width=device-width"><meta charset="UTF-8"></head><body></body></html>"#,
        serde_json::json!(["meta[charset]", "meta"]),
    );
    assert_eq!(v.len(), 2, "{v:?}");
}

/// TS: `[head-element-order-valid-008]` custom order setting
#[test]
fn head_element_order_valid_008() {
    const _ID: &str = "head-element-order-valid-008";
    let v = run_value(
        r#"<html><head><title>Title</title><meta charset="UTF-8"></head><body></body></html>"#,
        serde_json::json!(["title", "meta[charset]"]),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-invalid-004]` severity setting
#[test]
fn head_element_order_invalid_004() {
    const _ID: &str = "head-element-order-invalid-004";
    let v = run(
        r#"<html><head><title>Title</title><meta charset="UTF-8"></head><body></body></html>"#,
        serde_json::json!({ "severity": "error", "value": ["meta[charset]", "title"] }),
    );
    assert_eq!(v.len(), 2, "{v:?}");
    assert_eq!(v[0].0, Severity::Error);
    assert_eq!(v[0].3, "The \"meta\" element must be before the \"title\" element");
}

/// TS: `[head-element-order-valid-009]` correct order with default value
#[test]
fn head_element_order_valid_009() {
    const _ID: &str = "head-element-order-valid-009";
    let v = run(
        r#"<html><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width"><title>Title</title><meta name="description" content="Desc"><link rel="stylesheet" href="style.css"></head><body></body></html>"#,
        serde_json::json!(true),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-invalid-005]` wrong order with default value
#[test]
fn head_element_order_invalid_005() {
    const _ID: &str = "head-element-order-invalid-005";
    let v = run(
        r#"<html><head><title>Title</title><meta charset="UTF-8"></head><body></body></html>"#,
        serde_json::json!(true),
    );
    assert!(!v.is_empty(), "{v:?}");
}

/// TS: `[head-element-order-valid-010]` link[rel="stylesheet"] and link: specific selector wins
#[test]
fn head_element_order_valid_010() {
    const _ID: &str = "head-element-order-valid-010";
    let v = run_value(
        r#"<html><head><link rel="stylesheet" href="a.css"><link rel="icon" href="favicon.ico"></head><body></body></html>"#,
        serde_json::json!(["link[rel=\"stylesheet\"]", "link"]),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-invalid-006]` link[rel="stylesheet"] and link: wrong order
#[test]
fn head_element_order_invalid_006() {
    const _ID: &str = "head-element-order-invalid-006";
    let v = run_value(
        r#"<html><head><link rel="icon" href="favicon.ico"><link rel="stylesheet" href="a.css"></head><body></body></html>"#,
        serde_json::json!(["link[rel=\"stylesheet\"]", "link"]),
    );
    assert_eq!(v.len(), 2, "{v:?}");
}

/// TS: `[head-element-order-invalid-007]` object entry and string entry coexistence
#[test]
fn head_element_order_invalid_007() {
    const _ID: &str = "head-element-order-invalid-007";
    let v = run_value(
        r#"<html><head><meta name="author" content="Test"><meta name="description" content="Desc"><meta charset="UTF-8"></head><body></body></html>"#,
        serde_json::json!(["meta[charset]", { "selector": "meta", "order": "alphabetical", "attr": "name" }]),
    );
    assert_eq!(v.len(), 3, "{v:?}");
}

/// TS: `[head-element-order-valid-011]` elements matching no selector go to the end
#[test]
fn head_element_order_valid_011() {
    const _ID: &str = "head-element-order-valid-011";
    let v = run_value(
        r#"<html><head><meta charset="UTF-8"><title>Title</title><base href="/"><noscript>No JS</noscript></head><body></body></html>"#,
        serde_json::json!(["meta[charset]", "title"]),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-valid-012]` correct alphabetical order
#[test]
fn head_element_order_valid_012() {
    const _ID: &str = "head-element-order-valid-012";
    let v = run_value(
        r#"<html><head><meta name="author" content="Test"><meta name="description" content="Desc"><meta name="viewport" content="width=device-width"></head><body></body></html>"#,
        serde_json::json!([{ "selector": "meta", "order": "alphabetical", "attr": "name" }]),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-invalid-008]` wrong alphabetical order
#[test]
fn head_element_order_invalid_008() {
    const _ID: &str = "head-element-order-invalid-008";
    let v = run_value(
        r#"<html><head><meta name="viewport" content="width=device-width"><meta name="author" content="Test"><meta name="description" content="Desc"></head><body></body></html>"#,
        serde_json::json!([{ "selector": "meta", "order": "alphabetical", "attr": "name" }]),
    );
    assert_eq!(v.len(), 3, "{v:?}");
}

/// TS: `[head-element-order-valid-013]` elements without attr come first
#[test]
fn head_element_order_valid_013() {
    const _ID: &str = "head-element-order-valid-013";
    let v = run_value(
        r#"<html><head><meta charset="UTF-8"><meta name="author" content="Test"><meta name="description" content="Desc"></head><body></body></html>"#,
        serde_json::json!([{ "selector": "meta", "order": "alphabetical", "attr": "name" }]),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-valid-014]` stable sort: same attr value preserves source order
#[test]
fn head_element_order_valid_014() {
    const _ID: &str = "head-element-order-valid-014";
    let v = run_value(
        r#"<html><head><meta name="author" content="Alice"><meta name="author" content="Bob"></head><body></body></html>"#,
        serde_json::json!([{ "selector": "meta", "order": "alphabetical", "attr": "name" }]),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-valid-015]` alphabetical without attr: falls back to source order
#[test]
fn head_element_order_valid_015() {
    const _ID: &str = "head-element-order-valid-015";
    let v = run_value(
        r#"<html><head><meta name="b"><meta name="a"></head><body></body></html>"#,
        serde_json::json!([{ "selector": "meta", "order": "alphabetical" }]),
    );
    assert_eq!(v.len(), 0, "{v:?}");
}

/// TS: `[head-element-order-invalid-009]` English message
#[test]
fn head_element_order_invalid_009() {
    const _ID: &str = "head-element-order-invalid-009";
    let v = run_value(
        r#"<html><head><title>Title</title><meta charset="UTF-8"></head><body></body></html>"#,
        serde_json::json!(["meta[charset]", "title"]),
    );
    assert_eq!(v[0].3, "The \"meta\" element should be before the \"title\" element");
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input.
#[test]
fn v6_head_element_order_001() {
    assert_eq!(
        run_value(
            r#"<html><head><base href="/"><meta charset="UTF-8"><title>Title</title></head><body></body></html>"#,
            serde_json::json!(["meta[charset]", "title"]),
        ),
        [
            warn(
                13,
                "The \"meta\" element should be before the \"base\" element",
                r#"<base href="/">"#
            ),
            warn(
                28,
                "The \"title\" element should be before the \"meta\" element",
                r#"<meta charset="UTF-8">"#
            ),
            warn(
                50,
                "The \"base\" element should be before the \"title\" element",
                "<title>"
            ),
        ]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) on the same input. TS reports three
/// violations with the same message; they are distinct by position.
#[test]
fn v6_head_element_order_002() {
    let message = "The \"meta\" element should be before the \"meta\" element";
    assert_eq!(
        run_value(
            r#"<html><head><meta name="viewport" content="width=device-width"><meta name="author" content="Test"><meta name="description" content="Desc"></head><body></body></html>"#,
            serde_json::json!([{ "selector": "meta", "order": "alphabetical", "attr": "name" }]),
        ),
        [
            warn(13, message, r#"<meta name="viewport" content="width=device-width">"#),
            warn(64, message, r#"<meta name="author" content="Test">"#),
            warn(99, message, r#"<meta name="description" content="Desc">"#),
        ]
    );
}

/// Expected values from the TS rule (`mlRuleTest`) with no `value` (the default order).
#[test]
fn v6_head_element_order_003() {
    assert_eq!(
        run(
            r#"<html><head><script src="a.js"></script><link rel="stylesheet" href="a.css"><title>T</title><meta name="viewport" content="width=device-width"><meta charset="UTF-8"></head><body></body></html>"#,
            serde_json::json!(true),
        ),
        [
            warn(
                13,
                "The \"meta\" element should be before the \"script\" element",
                r#"<script src="a.js">"#
            ),
            warn(
                41,
                "The \"meta\" element should be before the \"link\" element",
                r#"<link rel="stylesheet" href="a.css">"#
            ),
            warn(
                93,
                "The \"link\" element should be before the \"meta\" element",
                r#"<meta name="viewport" content="width=device-width">"#
            ),
            warn(
                144,
                "The \"script\" element should be before the \"meta\" element",
                r#"<meta charset="UTF-8">"#
            ),
        ]
    );
}
