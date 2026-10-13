//! Tests for `itemprop-requires-itemscope` rule.
//!
//! Test ID mapping (TS → Rust):
//!   itemprop-requires-itemscope-valid-001    → itemprop_requires_itemscope_valid_001
//!   itemprop-requires-itemscope-valid-002    → itemprop_requires_itemscope_valid_002
//!   itemprop-requires-itemscope-valid-003    → itemprop_requires_itemscope_valid_003
//!   itemprop-requires-itemscope-valid-004    → itemprop_requires_itemscope_valid_004
//!   itemprop-requires-itemscope-invalid-001  → itemprop_requires_itemscope_invalid_001
//!   itemprop-requires-itemscope-invalid-002  → itemprop_requires_itemscope_invalid_002
//!   itemprop-requires-itemscope-invalid-003  → itemprop_requires_itemscope_invalid_003
//!   itemprop-requires-itemscope-invalid-004  → itemprop_requires_itemscope_invalid_004
//!   v6_itemprop_requires_itemscope_001  — Rust-only: `itemref` tokens are split on JS `\s` (tab, newline, NBSP; not U+0085)
//!   v6_itemprop_requires_itemscope_002  — Rust-only: `itemref` counts only on an `itemscope` element; any ancestor depth counts
//!   v6_itemprop_requires_itemscope_003  — Rust-only: attribute names match case-insensitively, an empty `itemprop` counts
//!   v6_itemprop_requires_itemscope_004  — Rust-only: pretended elements match `[itemprop]`/`[itemscope]` with either identity
//!   v6_itemprop_requires_itemscope_005  — Rust-only: `itemref` is read from the pretended attributes

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const MESSAGE: &str = "The element must belong to an item via an ancestor `itemscope` or be referenced by an `itemref`";

fn run(html: &str) -> Vec<Brief> {
    run_with(html, serde_json::json!([]))
}

fn run_with(html: &str, pretenders: serde_json::Value) -> Vec<Brief> {
    lint_brief(
        "itemprop-requires-itemscope",
        html,
        serde_json::json!({ "rules": { "itemprop-requires-itemscope": true }, "pretenders": pretenders }),
    )
}

/// TS: `[itemprop-requires-itemscope-valid-001]` — itemprop inside an itemscope ancestor
#[test]
fn itemprop_requires_itemscope_valid_001() {
    const _ID: &str = "itemprop-requires-itemscope-valid-001";
    assert_eq!(run(r#"<div itemscope><span itemprop="name">x</span></div>"#), []);
}

/// TS: `[itemprop-requires-itemscope-valid-002]` — itemprop reachable via itemref
#[test]
fn itemprop_requires_itemscope_valid_002() {
    const _ID: &str = "itemprop-requires-itemscope-valid-002";
    assert_eq!(
        run(r#"<div itemscope itemref="ref-name"></div><span id="ref-name" itemprop="name">y</span>"#),
        []
    );
}

/// TS: `[itemprop-requires-itemscope-valid-003]` — element with both itemscope and itemprop is valid (self-as-scope)
#[test]
fn itemprop_requires_itemscope_valid_003() {
    const _ID: &str = "itemprop-requires-itemscope-valid-003";
    assert_eq!(
        run(r#"<div itemscope><div itemscope itemprop="address">x</div></div>"#),
        []
    );
}

/// TS: `[itemprop-requires-itemscope-valid-004]` — whitespace-only itemref contributes no entries; would-be target stays orphan
#[test]
fn itemprop_requires_itemscope_valid_004() {
    const _ID: &str = "itemprop-requires-itemscope-valid-004";
    assert_eq!(
        run(r#"<div itemscope itemref="  "></div><span id="ref-name" itemprop="name">y</span>"#),
        [brief(
            Severity::Error,
            1,
            35,
            MESSAGE,
            r#"<span id="ref-name" itemprop="name">"#
        )]
    );
}

/// TS: `[itemprop-requires-itemscope-invalid-001]` — orphan itemprop with no ancestor itemscope and no itemref
#[test]
fn itemprop_requires_itemscope_invalid_001() {
    const _ID: &str = "itemprop-requires-itemscope-invalid-001";
    assert_eq!(
        run(r#"<span itemprop="name">orphan</span>"#),
        [brief(Severity::Error, 1, 1, MESSAGE, r#"<span itemprop="name">"#)]
    );
}

/// TS: `[itemprop-requires-itemscope-invalid-002]` — itemref token does not match the orphan element id
#[test]
fn itemprop_requires_itemscope_invalid_002() {
    const _ID: &str = "itemprop-requires-itemscope-invalid-002";
    assert_eq!(
        run(r#"<div itemscope itemref="ref-other"></div><span id="ref-name" itemprop="name">orphan</span>"#),
        [brief(
            Severity::Error,
            1,
            42,
            MESSAGE,
            r#"<span id="ref-name" itemprop="name">"#
        )]
    );
}

/// TS: `[itemprop-requires-itemscope-invalid-003]` — each orphan in a sequence fires independently
#[test]
fn itemprop_requires_itemscope_invalid_003() {
    const _ID: &str = "itemprop-requires-itemscope-invalid-003";
    assert_eq!(
        run(r#"<span itemprop="name">a</span><span itemprop="email">b</span>"#),
        [
            brief(Severity::Error, 1, 1, MESSAGE, r#"<span itemprop="name">"#),
            brief(Severity::Error, 1, 31, MESSAGE, r#"<span itemprop="email">"#),
        ]
    );
}

/// TS: `[itemprop-requires-itemscope-invalid-004]` — explicit empty id falls into the orphan branch
#[test]
fn itemprop_requires_itemscope_invalid_004() {
    const _ID: &str = "itemprop-requires-itemscope-invalid-004";
    assert_eq!(
        run(r#"<span id="" itemprop="name">orphan</span>"#),
        [brief(Severity::Error, 1, 1, MESSAGE, r#"<span id="" itemprop="name">"#)]
    );
}

/// TS splits `itemref` on `/\s+/`: tab, newline and NBSP separate tokens, U+0085 does not.
#[test]
fn v6_itemprop_requires_itemscope_001() {
    assert_eq!(
        run(
            "<div itemscope itemref=\"a\tb\n c\"></div><span id=\"b\" itemprop=\"x\"></span><span id=\"c\" itemprop=\"y\"></span>"
        ),
        []
    );
    assert_eq!(
        run("<div itemscope itemref=\"a\u{a0}r\"></div><span id=\"r\" itemprop=\"a\"></span>"),
        []
    );
    assert_eq!(
        run("<div itemscope itemref=\"a\u{85}r\"></div><span id=\"r\" itemprop=\"a\"></span>"),
        [brief(Severity::Error, 1, 36, MESSAGE, r#"<span id="r" itemprop="a">"#)]
    );
}

/// An `itemref` without `itemscope` claims nothing; an `itemscope` ancestor at any depth
/// does.
#[test]
fn v6_itemprop_requires_itemscope_002() {
    assert_eq!(
        run(r#"<div itemref="r"></div><span id="r" itemprop="a"></span>"#),
        [brief(Severity::Error, 1, 24, MESSAGE, r#"<span id="r" itemprop="a">"#)]
    );
    assert_eq!(
        run(r#"<div itemscope><div><p><span itemprop="a"></span></p></div></div>"#),
        []
    );
}

/// `[itemprop]` matches an upper-case `ITEMPROP`, and an empty `itemprop` too.
#[test]
fn v6_itemprop_requires_itemscope_003() {
    assert_eq!(
        run(r#"<span ITEMPROP="a"></span><span itemprop></span>"#),
        [
            brief(Severity::Error, 1, 1, MESSAGE, r#"<span ITEMPROP="a">"#),
            brief(Severity::Error, 1, 27, MESSAGE, "<span itemprop>"),
        ]
    );
}

/// The rule has no pretender guard: a pretended element is matched with its pretended
/// identity, and failing that with its original one (TS `matches()`), so a bare-name
/// pretender that drops the attributes still matches `[itemprop]` and `[itemscope]`.
#[test]
fn v6_itemprop_requires_itemscope_004() {
    assert_eq!(
        run_with(
            r#"<x-span itemprop="name"></x-span>"#,
            serde_json::json!([{ "selector": "x-span", "as": { "element": "span", "inheritAttrs": true } }]),
        ),
        [brief(Severity::Error, 1, 1, MESSAGE, r#"<x-span itemprop="name">"#)]
    );
    assert_eq!(
        run_with(
            r#"<x-span itemprop="name"></x-span>"#,
            serde_json::json!([{ "selector": "x-span", "as": "span" }]),
        ),
        [brief(Severity::Error, 1, 1, MESSAGE, r#"<x-span itemprop="name">"#)]
    );
    assert_eq!(
        run_with(
            r#"<x-scope itemscope><span itemprop="a"></span></x-scope>"#,
            serde_json::json!([{ "selector": "x-scope", "as": "div" }]),
        ),
        []
    );
}

/// `itemref` is read through `getAttribute()`, from the pretended attributes: a bare-name
/// pretender has none, a pretender may add `itemscope`.
#[test]
fn v6_itemprop_requires_itemscope_005() {
    assert_eq!(
        run_with(
            r#"<x-scope itemscope itemref="r"></x-scope><span id="r" itemprop="a"></span>"#,
            serde_json::json!([{ "selector": "x-scope", "as": "div" }]),
        ),
        [brief(Severity::Error, 1, 42, MESSAGE, r#"<span id="r" itemprop="a">"#)]
    );
    assert_eq!(
        run_with(
            r#"<x-ref itemref="r"></x-ref><span id="r" itemprop="a"></span>"#,
            serde_json::json!([{
                "selector": "x-ref",
                "as": { "element": "div", "attrs": [{ "name": "itemscope" }], "inheritAttrs": true }
            }]),
        ),
        []
    );
}
