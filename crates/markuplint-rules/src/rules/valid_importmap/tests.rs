//! Tests for `valid-importmap` rule.
//!
//! Test ID mapping (TS → Rust):
//!   valid-importmap-valid-001                    → valid_importmap_valid_001
//!   valid-importmap-valid-002                    → valid_importmap_valid_002
//!   valid-importmap-valid-003                    → valid_importmap_valid_003
//!   valid-importmap-valid-004                    → valid_importmap_valid_004
//!   valid-importmap-valid-005                    → valid_importmap_valid_005
//!   valid-importmap-valid-006                    → valid_importmap_valid_006
//!   valid-importmap-valid-007                    → valid_importmap_valid_007
//!   valid-importmap-invalid-001                  → valid_importmap_invalid_001
//!   valid-importmap-invalid-002                  → valid_importmap_invalid_002
//!   valid-importmap-invalid-003                  → valid_importmap_invalid_003
//!   valid-importmap-invalid-004                  → valid_importmap_invalid_004
//!   valid-importmap-invalid-005                  → valid_importmap_invalid_005
//!   valid-importmap-invalid-006                  → valid_importmap_invalid_006
//!   valid-importmap-invalid-007                  → valid_importmap_invalid_007
//!   valid-importmap-invalid-008                  → valid_importmap_invalid_008
//!   valid-importmap-invalid-009                  → valid_importmap_invalid_009
//!   valid-importmap-invalid-010                  → valid_importmap_invalid_010
//!   valid-importmap-invalid-011                  → valid_importmap_invalid_011
//!   valid-importmap-invalid-012                  → valid_importmap_invalid_012
//!   valid-importmap-invalid-013                  → valid_importmap_invalid_013
//!   valid-importmap-invalid-014                  → valid_importmap_invalid_014
//!   valid-importmap-invalid-015                  → valid_importmap_invalid_015
//!   valid-importmap-invalid-016                  → valid_importmap_invalid_016
//!   valid-importmap-invalid-017                  → valid_importmap_invalid_017
//!   valid-importmap-invalid-018                  → valid_importmap_invalid_018
//!   valid-importmap-invalid-019                  → valid_importmap_invalid_019
//!   valid-importmap-invalid-020                  → valid_importmap_invalid_020
//!   valid-importmap-invalid-021                  → valid_importmap_invalid_021
//!   valid-importmap-invalid-022                  → valid_importmap_invalid_022
//!   v6_valid_importmap_001  — Rust-only: keys are visited in JavaScript property order (array indices first)
//!   v6_valid_importmap_002  — Rust-only: a repeated key keeps the last value
//!   v6_valid_importmap_003  — Rust-only: absolute URLs as the WHATWG URL parser accepts them
//!   v6_valid_importmap_004  — Rust-only: the body is trimmed as `String.prototype.trim` does
//!   v6_valid_importmap_005  — Rust-only: a pretender is skipped unless an `as` attribute names what it is
//!   v6_valid_importmap_006  — Rust-only: a script without a close tag is skipped
//!   v6_valid_importmap_007  — Rust-only: tag, attribute and type are case-insensitive; the body is not entity-decoded
//!   v6_valid_importmap_008  — Rust-only: non-string, non-object values of each map
//!   v6_valid_importmap_009  — Rust-only: the `type` value is compared as written; an SVG `script` is checked too
//!
//! Known difference: a JSON string holding an unpaired surrogate escape (`"\ud800"`) is
//! quoted in the TS message as that lone surrogate; a Rust `String` cannot hold one, so
//! the message has U+FFFD there.

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

fn lint(html: &str, config: serde_json::Value) -> Vec<Brief> {
    lint_brief("valid-importmap", html, config)
}

fn rule_only() -> serde_json::Value {
    serde_json::json!({ "rules": { "valid-importmap": true } })
}

/// Lints `content` placed in the `<head>` of a document, as the TS spec's `wrap` does.
fn run(content: &str) -> Vec<Brief> {
    lint(
        &format!("<!doctype html><html><head><title>t</title>{content}</head><body></body></html>"),
        rule_only(),
    )
}

/// A violation at the `<script type="importmap">` that `run` puts at 1:44.
fn err(message: &str) -> Brief {
    brief(Severity::Error, 1, 44, message, r#"<script type="importmap">"#)
}

/// A violation at a `<script type="importmap">` at `line:col`.
fn err_at(line: u32, col: u32, message: &str) -> Brief {
    brief(Severity::Error, line, col, message, r#"<script type="importmap">"#)
}

fn not_url_like(value: &str, key: &str) -> Brief {
    err_at(
        1,
        1,
        &format!(
            "The address \"{value}\" of \"{key}\" in \"imports\" must be a URL-like specifier (starts with \"/\", \"./\", \"../\", or is an absolute URL)"
        ),
    )
}

/// TS: `[valid-importmap-valid-001]` script without type attribute is ignored
#[test]
fn valid_importmap_valid_001() {
    const _ID: &str = "valid-importmap-valid-001";
    assert_eq!(run(r#"<script>console.log("ok");</script>"#), []);
}

/// TS: `[valid-importmap-valid-002]` script type=module is ignored
#[test]
fn valid_importmap_valid_002() {
    const _ID: &str = "valid-importmap-valid-002";
    assert_eq!(run(r#"<script type="module">import "./a.js";</script>"#), []);
}

/// TS: `[valid-importmap-valid-003]` minimal valid importmap
#[test]
fn valid_importmap_valid_003() {
    const _ID: &str = "valid-importmap-valid-003";
    assert_eq!(
        run(r#"<script type="importmap">{"imports":{"app":"/path/to/app.js"}}</script>"#),
        []
    );
}

/// TS: `[valid-importmap-valid-004]` full valid importmap with scopes
#[test]
fn valid_importmap_valid_004() {
    const _ID: &str = "valid-importmap-valid-004";
    assert_eq!(
        run(
            r#"<script type="importmap">{"imports":{"app":"/a.js","dir/":"/d/"},"scopes":{"/path/":{"x":"./y.js"}}}</script>"#
        ),
        []
    );
}

/// TS: `[valid-importmap-valid-005]` integrity is an allowed top-level key
#[test]
fn valid_importmap_valid_005() {
    const _ID: &str = "valid-importmap-valid-005";
    assert_eq!(
        run(r#"<script type="importmap">{"integrity":{"/a.mjs":"sha384-abc"}}</script>"#),
        []
    );
}

/// TS: `[valid-importmap-valid-006]` importmap with absolute URL specifier address
#[test]
fn valid_importmap_valid_006() {
    const _ID: &str = "valid-importmap-valid-006";
    assert_eq!(
        run(r#"<script type="importmap">{"imports":{"lib":"https://cdn.example.com/lib.js"}}</script>"#),
        []
    );
}

/// TS: `[valid-importmap-valid-007]` type attribute matching is case-insensitive
#[test]
fn valid_importmap_valid_007() {
    const _ID: &str = "valid-importmap-valid-007";
    assert_eq!(
        run(r#"<script type="ImportMap">{"imports":{"a":"/a.js"}}</script>"#),
        []
    );
}

/// TS: `[valid-importmap-invalid-001]` empty content
#[test]
fn valid_importmap_invalid_001() {
    const _ID: &str = "valid-importmap-invalid-001";
    assert_eq!(
        run(r#"<script type="importmap"></script>"#),
        [err(r#"Import map must contain a JSON object"#),]
    );
}

/// TS: `[valid-importmap-invalid-002]` whitespace-only content
#[test]
fn valid_importmap_invalid_002() {
    const _ID: &str = "valid-importmap-invalid-002";
    assert_eq!(
        run("<script type=\"importmap\">   \n   </script>"),
        [err(r#"Import map must contain a JSON object"#),]
    );
}

/// TS: `[valid-importmap-invalid-003]` content is not JSON
#[test]
fn valid_importmap_invalid_003() {
    const _ID: &str = "valid-importmap-invalid-003";
    assert_eq!(
        run(r#"<script type="importmap">alert("not json")</script>"#),
        [err(r#"Import map must be valid JSON"#),]
    );
}

/// TS: `[valid-importmap-invalid-004]` top-level value is an array
#[test]
fn valid_importmap_invalid_004() {
    const _ID: &str = "valid-importmap-invalid-004";
    assert_eq!(
        run(r#"<script type="importmap">["imports"]</script>"#),
        [err(r#"Import map must be a JSON object"#),]
    );
}

/// TS: `[valid-importmap-invalid-005]` top-level value is a string
#[test]
fn valid_importmap_invalid_005() {
    const _ID: &str = "valid-importmap-invalid-005";
    assert_eq!(
        run(r#"<script type="importmap">"hello"</script>"#),
        [err(r#"Import map must be a JSON object"#),]
    );
}

/// TS: `[valid-importmap-invalid-006]` forbidden top-level property
#[test]
fn valid_importmap_invalid_006() {
    const _ID: &str = "valid-importmap-invalid-006";
    assert_eq!(
        run(r#"<script type="importmap">{"forbidden":{}}</script>"#),
        [err(
            r#"The import map top-level key "forbidden" is not allowed (use "imports", "scopes", or "integrity")"#
        ),]
    );
}

/// TS: `[valid-importmap-invalid-007]` imports value is not an object
#[test]
fn valid_importmap_invalid_007() {
    const _ID: &str = "valid-importmap-invalid-007";
    assert_eq!(
        run(r#"<script type="importmap">{"imports":"not an object"}</script>"#),
        [err(
            r#"The "imports" top-level key of an import map must be a JSON object"#
        ),]
    );
}

/// TS: `[valid-importmap-invalid-008]` imports has an empty specifier key
#[test]
fn valid_importmap_invalid_008() {
    const _ID: &str = "valid-importmap-invalid-008";
    assert_eq!(
        run(r#"<script type="importmap">{"imports":{"":"/path/app.js"}}</script>"#),
        [err(r#"The specifier key in "imports" must not be empty"#),]
    );
}

/// TS: `[valid-importmap-invalid-009]` imports value is not a string
#[test]
fn valid_importmap_invalid_009() {
    const _ID: &str = "valid-importmap-invalid-009";
    assert_eq!(
        run(r#"<script type="importmap">{"imports":{"app":123}}</script>"#),
        [err(r#"The value of "app" in "imports" must be a string"#),]
    );
}

/// TS: `[valid-importmap-invalid-010]` imports slash-mismatch
#[test]
fn valid_importmap_invalid_010() {
    const _ID: &str = "valid-importmap-invalid-010";
    assert_eq!(
        run(r#"<script type="importmap">{"imports":{"dir/":"/path/to/dir"}}</script>"#),
        [err(
            r#"The specifier key "dir/" in "imports" ends with "/" so the address "/path/to/dir" must end with "/" as well"#
        ),]
    );
}

/// TS: `[valid-importmap-invalid-011]` imports address is not a URL-like specifier
#[test]
fn valid_importmap_invalid_011() {
    const _ID: &str = "valid-importmap-invalid-011";
    assert_eq!(
        run(r#"<script type="importmap">{"imports":{"lib":"bare-specifier"}}</script>"#),
        [err(
            r#"The address "bare-specifier" of "lib" in "imports" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)"#
        ),]
    );
}

/// TS: `[valid-importmap-invalid-012]` scopes value is not an object
#[test]
fn valid_importmap_invalid_012() {
    const _ID: &str = "valid-importmap-invalid-012";
    assert_eq!(
        run(r#"<script type="importmap">{"scopes":"not an object"}</script>"#),
        [err(
            r#"The "scopes" top-level key of an import map must be a JSON object"#
        ),]
    );
}

/// TS: `[valid-importmap-invalid-013]` scopes inner value is not an object
#[test]
fn valid_importmap_invalid_013() {
    const _ID: &str = "valid-importmap-invalid-013";
    assert_eq!(
        run(r#"<script type="importmap">{"scopes":{"/path/":"not an object"}}</script>"#),
        [err(r#"The value of the scope "/path/" must be a JSON object"#),]
    );
}

/// TS: `[valid-importmap-invalid-014]` scopes inner specifier address is not URL-like
#[test]
fn valid_importmap_invalid_014() {
    const _ID: &str = "valid-importmap-invalid-014";
    assert_eq!(
        run(r#"<script type="importmap">{"scopes":{"/path/":{"x":"..."}}}</script>"#),
        [err(
            r#"The address "..." of "x" in "scopes["/path/"]" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)"#
        ),]
    );
}

/// TS: `[valid-importmap-invalid-015]` integrity is not an object
#[test]
fn valid_importmap_invalid_015() {
    const _ID: &str = "valid-importmap-invalid-015";
    assert_eq!(
        run(r#"<script type="importmap">{"integrity":"not object"}</script>"#),
        [err(
            r#"The "integrity" top-level key of an import map must be a JSON object"#
        ),]
    );
}

/// TS: `[valid-importmap-invalid-016]` integrity key is a bare specifier (not URL-like)
#[test]
fn valid_importmap_invalid_016() {
    const _ID: &str = "valid-importmap-invalid-016";
    assert_eq!(
        run(r#"<script type="importmap">{"integrity":{"bare":"sha384-abc"}}</script>"#),
        [err(
            r#"The integrity key "bare" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)"#
        ),]
    );
}

/// TS: `[valid-importmap-invalid-017]` integrity value is not a string
#[test]
fn valid_importmap_invalid_017() {
    const _ID: &str = "valid-importmap-invalid-017";
    assert_eq!(
        run(r#"<script type="importmap">{"integrity":{"/a.mjs":123}}</script>"#),
        [err(r#"The value of "/a.mjs" in "integrity" must be a string"#),]
    );
}

/// TS: `[valid-importmap-invalid-018]` integrity key is empty string
#[test]
fn valid_importmap_invalid_018() {
    const _ID: &str = "valid-importmap-invalid-018";
    assert_eq!(
        run(r#"<script type="importmap">{"integrity":{"":"sha384-abc"}}</script>"#),
        [err(
            r#"The integrity key "" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)"#
        ),]
    );
}

/// TS: `[valid-importmap-invalid-019]` scopes inner specifier with empty key
#[test]
fn valid_importmap_invalid_019() {
    const _ID: &str = "valid-importmap-invalid-019";
    assert_eq!(
        run(r#"<script type="importmap">{"scopes":{"/p/":{"":"/a.js"}}}</script>"#),
        [err(r#"The specifier key in "scopes["/p/"]" must not be empty"#),]
    );
}

/// TS: `[valid-importmap-invalid-020]` scopes inner specifier value not a string
#[test]
fn valid_importmap_invalid_020() {
    const _ID: &str = "valid-importmap-invalid-020";
    assert_eq!(
        run(r#"<script type="importmap">{"scopes":{"/p/":{"k":1}}}</script>"#),
        [err(r#"The value of "k" in "scopes["/p/"]" must be a string"#),]
    );
}

/// TS: `[valid-importmap-invalid-021]` scopes inner specifier slash mismatch
#[test]
fn valid_importmap_invalid_021() {
    const _ID: &str = "valid-importmap-invalid-021";
    assert_eq!(
        run(r#"<script type="importmap">{"scopes":{"/p/":{"dir/":"/x"}}}</script>"#),
        [err(
            r#"The specifier key "dir/" in "scopes["/p/"]" ends with "/" so the address "/x" must end with "/" as well"#
        ),]
    );
}

/// TS: `[valid-importmap-invalid-022]` multiple violations are all reported
#[test]
fn valid_importmap_invalid_022() {
    const _ID: &str = "valid-importmap-invalid-022";
    assert_eq!(
        run(r#"<script type="importmap">{"forbidden":1,"imports":{"":"/a.js","b":42}}</script>"#),
        [
            err(r#"The import map top-level key "forbidden" is not allowed (use "imports", "scopes", or "integrity")"#),
            err(r#"The specifier key in "imports" must not be empty"#),
            err(r#"The value of "b" in "imports" must be a string"#),
        ]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_importmap_001() {
    assert_eq!(
        lint(
            r#"<script type="importmap">{"imports":{"b":1,"1":2},"x":0,"0":0}</script>"#,
            rule_only()
        ),
        [
            err_at(
                1,
                1,
                r#"The import map top-level key "0" is not allowed (use "imports", "scopes", or "integrity")"#
            ),
            err_at(
                1,
                1,
                r#"The import map top-level key "x" is not allowed (use "imports", "scopes", or "integrity")"#
            ),
            err_at(1, 1, r#"The value of "1" in "imports" must be a string"#),
            err_at(1, 1, r#"The value of "b" in "imports" must be a string"#),
        ]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_importmap_002() {
    assert_eq!(
        lint(
            r#"<script type="importmap">{"imports":{"a":1,"a":"/x"}}</script>"#,
            rule_only()
        ),
        []
    );
}

/// Expected values from the TS rule (`new URL()` of Node.js) on the same input.
#[test]
fn v6_valid_importmap_003() {
    let html = r#"<script type="importmap">{"imports":{"a":"data:text/javascript,x","b":"foo:bar","c":"http://","d":"http://a b","e":"HTTPS://X","f":" https://x","g":"javascript:alert(1)","h":"http://[::1","i":"http://a:99999","j":"C:\\foo","k":"http://1.2.3.4.5","l":"//cdn.example.com/x","m":"foo://a b","n":"a:","o":"1a:x","p":"http://ex%41mple.com","q":"http://xn--a.com","r":"https://例え.テスト/","s":"file:///etc","t":".\\x"}}</script>"#;
    assert_eq!(
        lint(html, rule_only()),
        [
            not_url_like("http://", "c"),
            not_url_like("http://a b", "d"),
            not_url_like("http://[::1", "h"),
            not_url_like("http://a:99999", "i"),
            not_url_like("http://1.2.3.4.5", "k"),
            not_url_like("foo://a b", "m"),
            not_url_like("1a:x", "o"),
            not_url_like("http://xn--a.com", "q"),
            not_url_like(".\\x", "t"),
        ]
    );
}

/// U+FEFF is trimmed, U+0085 is not. Expected values from the TS rule on the same input.
#[test]
fn v6_valid_importmap_004() {
    assert_eq!(
        lint(
            "<script type=\"importmap\">\u{FEFF}{}\u{FEFF}</script><script type=\"importmap\">\u{85}{}</script>",
            rule_only()
        ),
        [err_at(1, 39, "Import map must be valid JSON")]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_importmap_005() {
    let pretended = |pretend_as: serde_json::Value| {
        lint(
            r#"<x-script type="importmap"></x-script>"#,
            serde_json::json!({
                "rules": { "valid-importmap": true },
                "pretenders": [{ "selector": "x-script", "as": pretend_as }],
            }),
        )
    };
    assert_eq!(pretended(serde_json::json!("script")), []);
    assert_eq!(
        pretended(serde_json::json!({ "element": "script", "inheritAttrs": true })),
        []
    );
    assert_eq!(
        lint(r#"<x-script as="script" type="importmap"></x-script>"#, rule_only()),
        [brief(
            Severity::Error,
            1,
            1,
            "Import map must contain a JSON object",
            r#"<x-script as="script" type="importmap">"#
        )]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_importmap_006() {
    assert_eq!(lint(r#"<div><script type="importmap">{"#, rule_only()), []);
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_importmap_007() {
    assert_eq!(
        lint(
            "<SCRIPT TYPE=\"IMPORTMAP\">[]</SCRIPT>\n  <script type=\"importmap\">{\"imports\":{\"a\":\"&amp;\"}}</script>",
            rule_only()
        ),
        [
            brief(
                Severity::Error,
                1,
                1,
                "Import map must be a JSON object",
                r#"<SCRIPT TYPE="IMPORTMAP">"#
            ),
            err_at(
                2,
                3,
                r#"The address "&amp;" of "a" in "imports" must be a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)"#
            ),
        ]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_importmap_008() {
    assert_eq!(
        lint(
            r#"<script type="importmap">{"imports":{"a":[[[]]],"b":null,"c":true,"d":{}},"scopes":{"/a/":[],"/b/":null},"integrity":[]}</script>"#,
            rule_only()
        ),
        [
            err_at(1, 1, r#"The value of "a" in "imports" must be a string"#),
            err_at(1, 1, r#"The value of "b" in "imports" must be a string"#),
            err_at(1, 1, r#"The value of "c" in "imports" must be a string"#),
            err_at(1, 1, r#"The value of "d" in "imports" must be a string"#),
            err_at(1, 1, r#"The value of the scope "/a/" must be a JSON object"#),
            err_at(1, 1, r#"The value of the scope "/b/" must be a JSON object"#),
            err_at(
                1,
                1,
                r#"The "integrity" top-level key of an import map must be a JSON object"#
            ),
        ]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_importmap_009() {
    assert_eq!(
        lint(
            r#"<script type="import&#109;ap">x</script><script type=" importmap">x</script><svg><script type="importmap">x</script></svg>"#,
            rule_only()
        ),
        [err_at(1, 82, "Import map must be valid JSON")]
    );
}
