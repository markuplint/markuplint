//! Tests for `no-broken-fragment-link` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-broken-fragment-link-invalid-001    → no_broken_fragment_link_invalid_001
//!                                             (its six JSX-parser assertions are SKIPPED:
//!                                             JSX parser not available in Rust)
//!   no-broken-fragment-link-issue-748      — SKIP: PHP parser (preprocessor block) not available in Rust
//!   no-broken-fragment-link-issue-776      — SKIP: PHP parser not available in Rust; the same
//!                                             markup through the HTML parser is v6_no_broken_fragment_link_002
//!   v6_no_broken_fragment_link_001  — Rust-only: the `href` is not entity-decoded, the ID is
//!   v6_no_broken_fragment_link_002  — Rust-only: percent-decoded fragments against entity-decoded IDs
//!   v6_no_broken_fragment_link_003  — Rust-only: a fragment that does not percent-decode is compared as written
//!   v6_no_broken_fragment_link_004  — Rust-only: `top` in any case, also percent-encoded, is the top of the document
//!   v6_no_broken_fragment_link_005  — Rust-only: only `a[href]` and `area[href]`; attribute names are case-sensitive
//!   v6_no_broken_fragment_link_006  — Rust-only: `fragmentRefersNameAttr` lets a `name` satisfy the link
//!   v6_no_broken_fragment_link_007  — Rust-only: a pretender is checked by the attributes of what it pretends to be
//!   v6_no_broken_fragment_link_008  — Rust-only: the fragment ends at a line terminator
//!   v6_no_broken_fragment_link_009  — Rust-only: numeric references in IDs; non-ASCII fragments
//!   v6_no_broken_fragment_link_010  — Rust-only: only an attribute named exactly `id` counts, the first of duplicates

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

fn run(html: &str) -> Vec<Brief> {
    lint_brief(
        "no-broken-fragment-link",
        html,
        serde_json::json!({ "rules": { "no-broken-fragment-link": true } }),
    )
}

fn run_with(html: &str, config: serde_json::Value) -> Vec<Brief> {
    lint_brief("no-broken-fragment-link", html, config)
}

fn missing(line: u32, col: u32, id: &str, raw: &str) -> Brief {
    brief(Severity::Warning, line, col, &format!("Missing \"{id}\" ID"), raw)
}

/// TS: `[no-broken-fragment-link-invalid-001]` fragment (its HTML-parser assertions)
#[test]
fn no_broken_fragment_link_invalid_001() {
    const _ID: &str = "no-broken-fragment-link-invalid-001";
    assert_eq!(run(r##"<a href="#foo"></a>"##), [missing(1, 10, "foo", "#foo")]);
    assert_eq!(run(r##"<a href="#"></a>"##), []);
    assert_eq!(run(r##"<a href="#top"></a>"##), []);
    assert_eq!(run(r##"<a href="#TOP"></a>"##), []);
    // `encodeURI('あいうえお')`
    assert_eq!(
        run(r##"<a href="#%E3%81%82%E3%81%84%E3%81%86%E3%81%88%E3%81%8A"></a><div id="あいうえお"></div>"##),
        []
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_no_broken_fragment_link_001() {
    assert_eq!(
        run(r##"<a href="#a&amp;b"></a><p id="a&amp;b"></p>"##),
        [missing(1, 10, "a&amp;b", "#a&amp;b")]
    );
}

/// The markup of TS `[no-broken-fragment-link-issue-776]`, which TS also passes with
/// its HTML parser.
#[test]
fn v6_no_broken_fragment_link_002() {
    let html = "
\t\t\t\t\t\t<a href=\"#apple%3Aorange\">apple:orange</a>
\t\t\t\t\t\t<p id=\"apple:orange\">apple:orange</p>

\t\t\t\t\t\t<a href=\"#apple%26orange\">apple&amp;orange</a>
\t\t\t\t\t\t<p id=\"apple&amp;orange\">apple&amp;orange</p>

\t\t\t\t\t\t<a href=\"#apple%26lemon\">apple&amp;lemon</a>
\t\t\t\t\t\t<p id=\"apple&lemon\">apple&amp;lemon</p>
\t\t\t\t\t";
    assert_eq!(run(html), []);
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_no_broken_fragment_link_003() {
    assert_eq!(
        run(r##"<a href="#foo%"></a><div id="foo%"></div><a href="#bar%"></a>"##),
        [missing(1, 51, "bar%", "#bar%")]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_no_broken_fragment_link_004() {
    assert_eq!(
        run(r##"<a href="#Top"></a><a href="#%74op"></a><a href="#%"></a>"##),
        [missing(1, 50, "%", "#%")]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_no_broken_fragment_link_005() {
    assert_eq!(
        run(r##"<map name="m"><area href="#x"></map><link href="#y"><a>z</a><A HREF="#w"></A>"##),
        [missing(1, 27, "x", "#x")]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_no_broken_fragment_link_006() {
    let html = r##"<a href="#foo"></a><input name="foo">"##;
    assert_eq!(run(html), [missing(1, 10, "foo", "#foo")]);
    assert_eq!(
        run_with(
            html,
            serde_json::json!({ "rules": { "no-broken-fragment-link": {
                "options": { "fragmentRefersNameAttr": true }
            } } })
        ),
        []
    );
}

/// A pretender built from a bare element name has no attributes of its own; one that
/// inherits them has the `href`. Expected values from the TS rule on the same input.
#[test]
fn v6_no_broken_fragment_link_007() {
    let html = r##"<x-link href="#foo"></x-link>"##;
    let config = |pretend_as: serde_json::Value| {
        serde_json::json!({
            "rules": { "no-broken-fragment-link": true },
            "pretenders": [{ "selector": "x-link", "as": pretend_as }],
        })
    };
    assert_eq!(run_with(html, config(serde_json::json!("a"))), []);
    assert_eq!(
        run_with(
            html,
            config(serde_json::json!({ "element": "a", "inheritAttrs": true }))
        ),
        [missing(1, 15, "foo", "#foo")]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_no_broken_fragment_link_008() {
    assert_eq!(
        run("<a href=\"#\nfoo\"></a><a href=\"#foo\nbar\"></a>"),
        [missing(2, 19, "foo", "#foo\nbar")]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_no_broken_fragment_link_009() {
    assert_eq!(
        run(r##"<a href="#&#x41;"></a><div id="A"></div><a href="#B"></a><div id="&#66;"></div>"##),
        [missing(1, 10, "&#x41;", "#&#x41;")]
    );
    assert_eq!(
        run(r##"<a href="#%E3%81%82"></a><div id="あ"></div><a href="#い"></a><div id="&#x3044;"></div>"##),
        []
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_no_broken_fragment_link_010() {
    assert_eq!(
        run(r##"<a href="#x"></a><div ID="x"></div><div id="y" id="z"></div><a href="#z"></a>"##),
        [missing(1, 10, "x", "#x"), missing(1, 70, "z", "#z")]
    );
}
