//! Tests for `valid-speculation-rules` rule.
//!
//! Test ID mapping (TS → Rust):
//!   valid-speculation-rules-valid-001            → valid_speculation_rules_valid_001
//!   valid-speculation-rules-valid-002            → valid_speculation_rules_valid_002
//!   valid-speculation-rules-valid-003            → valid_speculation_rules_valid_003
//!   valid-speculation-rules-valid-004            → valid_speculation_rules_valid_004
//!   valid-speculation-rules-valid-005            → valid_speculation_rules_valid_005
//!   valid-speculation-rules-valid-006            → valid_speculation_rules_valid_006
//!   valid-speculation-rules-valid-007            → valid_speculation_rules_valid_007
//!   valid-speculation-rules-valid-008            → valid_speculation_rules_valid_008
//!   valid-speculation-rules-valid-009            → valid_speculation_rules_valid_009
//!   valid-speculation-rules-valid-010            → valid_speculation_rules_valid_010
//!   valid-speculation-rules-valid-011            → valid_speculation_rules_valid_011
//!   valid-speculation-rules-valid-012            → valid_speculation_rules_valid_012
//!   valid-speculation-rules-valid-013            → valid_speculation_rules_valid_013
//!   valid-speculation-rules-valid-014            → valid_speculation_rules_valid_014
//!   valid-speculation-rules-invalid-001          → valid_speculation_rules_invalid_001
//!   valid-speculation-rules-invalid-002          → valid_speculation_rules_invalid_002
//!   valid-speculation-rules-invalid-003          → valid_speculation_rules_invalid_003
//!   valid-speculation-rules-invalid-004          → valid_speculation_rules_invalid_004
//!   valid-speculation-rules-invalid-005          → valid_speculation_rules_invalid_005
//!   valid-speculation-rules-invalid-006          → valid_speculation_rules_invalid_006
//!   valid-speculation-rules-invalid-007          → valid_speculation_rules_invalid_007
//!   valid-speculation-rules-invalid-008          → valid_speculation_rules_invalid_008
//!   valid-speculation-rules-invalid-009          → valid_speculation_rules_invalid_009
//!   valid-speculation-rules-invalid-010          → valid_speculation_rules_invalid_010
//!   valid-speculation-rules-invalid-011          → valid_speculation_rules_invalid_011
//!   valid-speculation-rules-invalid-012          → valid_speculation_rules_invalid_012
//!   valid-speculation-rules-invalid-013          → valid_speculation_rules_invalid_013
//!   valid-speculation-rules-invalid-014          → valid_speculation_rules_invalid_014
//!   valid-speculation-rules-invalid-015          → valid_speculation_rules_invalid_015
//!   valid-speculation-rules-invalid-016          → valid_speculation_rules_invalid_016
//!   valid-speculation-rules-invalid-017          → valid_speculation_rules_invalid_017
//!   valid-speculation-rules-invalid-018          → valid_speculation_rules_invalid_018
//!   valid-speculation-rules-invalid-019          → valid_speculation_rules_invalid_019
//!   valid-speculation-rules-invalid-020          → valid_speculation_rules_invalid_020
//!   valid-speculation-rules-invalid-021          → valid_speculation_rules_invalid_021
//!   valid-speculation-rules-invalid-022          → valid_speculation_rules_invalid_022
//!   valid-speculation-rules-invalid-023          → valid_speculation_rules_invalid_023
//!   valid-speculation-rules-invalid-024          → valid_speculation_rules_invalid_024
//!   valid-speculation-rules-invalid-025          → valid_speculation_rules_invalid_025
//!   valid-speculation-rules-invalid-026          → valid_speculation_rules_invalid_026
//!   valid-speculation-rules-invalid-027          → valid_speculation_rules_invalid_027
//!   valid-speculation-rules-invalid-028          → valid_speculation_rules_invalid_028
//!   valid-speculation-rules-invalid-029          → valid_speculation_rules_invalid_029
//!   valid-speculation-rules-invalid-030          → valid_speculation_rules_invalid_030
//!   valid-speculation-rules-invalid-031          → valid_speculation_rules_invalid_031
//!   valid-speculation-rules-invalid-032          → valid_speculation_rules_invalid_032
//!   valid-speculation-rules-invalid-033          → valid_speculation_rules_invalid_033
//!   valid-speculation-rules-invalid-034          → valid_speculation_rules_invalid_034
//!   valid-speculation-rules-invalid-035          → valid_speculation_rules_invalid_035
//!   valid-speculation-rules-invalid-036          → valid_speculation_rules_invalid_036
//!   valid-speculation-rules-invalid-037          → valid_speculation_rules_invalid_037
//!   valid-speculation-rules-invalid-038          → valid_speculation_rules_invalid_038
//!   valid-speculation-rules-invalid-039          → valid_speculation_rules_invalid_039
//!   valid-speculation-rules-invalid-040          → valid_speculation_rules_invalid_040
//!   v6_valid_speculation_rules_001  — Rust-only: a `urls` index is locale-formatted, as the TS translator does
//!   v6_valid_speculation_rules_002  — Rust-only: a rule label index is not (it is a template literal in TS)
//!   v6_valid_speculation_rules_003  — Rust-only: a message repeated within one script is reported once
//!   v6_valid_speculation_rules_004  — Rust-only: `null` source/eagerness; an invalid source leaves the rule unchecked otherwise
//!   v6_valid_speculation_rules_005  — Rust-only: labels of nested predicates and pattern items
//!   v6_valid_speculation_rules_006  — Rust-only: unknown and multiple predicate keys, each predicate still validated
//!   v6_valid_speculation_rules_007  — Rust-only: keys are visited in JavaScript property order (array indices first)
//!   v6_valid_speculation_rules_008  — Rust-only: `tag` alone is no rule set; a repeated key keeps the last value
//!   v6_valid_speculation_rules_009  — Rust-only: a pretender is skipped unless an `as` attribute names what it is
//!   v6_valid_speculation_rules_010  — Rust-only: an empty predicate list nested in `and`

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

fn lint(html: &str, config: serde_json::Value) -> Vec<Brief> {
    lint_brief("valid-speculation-rules", html, config)
}

fn rule_only() -> serde_json::Value {
    serde_json::json!({ "rules": { "valid-speculation-rules": true } })
}

/// Lints `content` placed in the `<head>` of a document, as the TS spec's `wrap` does.
fn run(content: &str) -> Vec<Brief> {
    lint(
        &format!("<!doctype html><html><head><title>t</title>{content}</head><body></body></html>"),
        rule_only(),
    )
}

/// Lints `body` as the content of a `<script type="speculationrules">` at 1:1.
fn run_body(body: &str) -> Vec<Brief> {
    lint(
        &format!("<script type=\"speculationrules\">{body}</script>"),
        rule_only(),
    )
}

/// A violation at the `<script type="speculationrules">` that `run` puts at 1:44.
fn err(message: &str) -> Brief {
    brief(Severity::Error, 1, 44, message, r#"<script type="speculationrules">"#)
}

/// A violation at the `<script type="speculationrules">` that `run_body` puts at 1:1.
fn err1(message: &str) -> Brief {
    brief(Severity::Error, 1, 1, message, r#"<script type="speculationrules">"#)
}

/// TS: `[valid-speculation-rules-valid-001]` script without type attribute is ignored
#[test]
fn valid_speculation_rules_valid_001() {
    const _ID: &str = "valid-speculation-rules-valid-001";
    assert_eq!(run(r#"<script>console.log("ok");</script>"#), []);
}

/// TS: `[valid-speculation-rules-valid-002]` script type=module is ignored
#[test]
fn valid_speculation_rules_valid_002() {
    const _ID: &str = "valid-speculation-rules-valid-002";
    assert_eq!(run(r#"<script type="module">import "./a.js";</script>"#), []);
}

/// TS: `[valid-speculation-rules-valid-003]` minimal valid list rule
#[test]
fn valid_speculation_rules_valid_003() {
    const _ID: &str = "valid-speculation-rules-valid-003";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["https://example.com"]}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-valid-004]` minimal valid document rule
#[test]
fn valid_speculation_rules_valid_004() {
    const _ID: &str = "valid-speculation-rules-valid-004";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":"/*"}}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-valid-005]` both prefetch and prerender rule sets
#[test]
fn valid_speculation_rules_valid_005() {
    const _ID: &str = "valid-speculation-rules-valid-005";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"]}],"prerender":[{"source":"document","where":{"href_matches":"/*"}}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-valid-006]` source inferred as list from urls
#[test]
fn valid_speculation_rules_valid_006() {
    const _ID: &str = "valid-speculation-rules-valid-006";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"urls":["/page1.html"]}]}</script>"#),
        []
    );
}

/// TS: `[valid-speculation-rules-valid-007]` source inferred as document from where
#[test]
fn valid_speculation_rules_valid_007() {
    const _ID: &str = "valid-speculation-rules-valid-007";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"eagerness":"moderate","where":{"href_matches":"/*"}}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-valid-008]` href_matches accepts an array of strings
#[test]
fn valid_speculation_rules_valid_008() {
    const _ID: &str = "valid-speculation-rules-valid-008";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":["/blog/*","/news/*"]}}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-valid-009]` nested and / or / not predicates
#[test]
fn valid_speculation_rules_valid_009() {
    const _ID: &str = "valid-speculation-rules-valid-009";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":[{"or":[{"href_matches":"/articles/*"},{"href_matches":"/blog/*"}]},{"not":{"selector_matches":[".no-prefetch","a[rel~=nofollow]"]}}]},"eagerness":"conservative"}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-valid-010]` type matching is case-insensitive
#[test]
fn valid_speculation_rules_valid_010() {
    const _ID: &str = "valid-speculation-rules-valid-010";
    assert_eq!(
        run(r#"<script type="SpeculationRules">{"prefetch":[{"source":"list","urls":["/a"]}]}</script>"#),
        []
    );
}

/// TS: `[valid-speculation-rules-valid-011]` empty rule set array is allowed
#[test]
fn valid_speculation_rules_valid_011() {
    const _ID: &str = "valid-speculation-rules-valid-011";
    assert_eq!(run(r#"<script type="speculationrules">{"prefetch":[]}</script>"#), []);
}

/// TS: `[valid-speculation-rules-valid-012]` eagerness "immediate" is allowed (HTML LS §7.6)
#[test]
fn valid_speculation_rules_valid_012() {
    const _ID: &str = "valid-speculation-rules-valid-012";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"eagerness":"immediate"}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-valid-013]` additional spec rule keys are allowed (HTML LS §7.6.1.2)
#[test]
fn valid_speculation_rules_valid_013() {
    const _ID: &str = "valid-speculation-rules-valid-013";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"relative_to":"document","referrer_policy":"no-referrer","requires":["anonymous-client-ip-when-cross-origin"],"expects_no_vary_search":"params=(\"a\")","target_hint":"_blank","tag":"my-tag"}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-valid-014]` top-level "tag" is allowed alongside a rule set
#[test]
fn valid_speculation_rules_valid_014() {
    const _ID: &str = "valid-speculation-rules-valid-014";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"tag":"my-tag","prefetch":[{"source":"list","urls":["/a"]}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-invalid-001]` empty content
#[test]
fn valid_speculation_rules_invalid_001() {
    const _ID: &str = "valid-speculation-rules-invalid-001";
    assert_eq!(
        run(r#"<script type="speculationrules"></script>"#),
        [err(r#"Speculation rules must contain a JSON object"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-002]` content is not JSON
#[test]
fn valid_speculation_rules_invalid_002() {
    const _ID: &str = "valid-speculation-rules-invalid-002";
    assert_eq!(
        run(r#"<script type="speculationrules">{ invalid json</script>"#),
        [err(r#"Speculation rules must be valid JSON"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-003]` top-level value is an array
#[test]
fn valid_speculation_rules_invalid_003() {
    const _ID: &str = "valid-speculation-rules-invalid-003";
    assert_eq!(
        run(r#"<script type="speculationrules">["a","b"]</script>"#),
        [err(r#"Speculation rules must be a JSON object"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-004]` missing both prefetch and prerender
#[test]
fn valid_speculation_rules_invalid_004() {
    const _ID: &str = "valid-speculation-rules-invalid-004";
    assert_eq!(
        run(r#"<script type="speculationrules">{}</script>"#),
        [err(
            r#"Speculation rules must be an object with a "prefetch" or "prerender" property"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-invalid-005]` forbidden top-level key
#[test]
fn valid_speculation_rules_invalid_005() {
    const _ID: &str = "valid-speculation-rules-invalid-005";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[],"unknownProp":true}</script>"#),
        [err(
            r#"The speculation rules top-level key "unknownProp" is not allowed (use "tag", "prefetch", or "prerender")"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-invalid-006]` rule set is not an array
#[test]
fn valid_speculation_rules_invalid_006() {
    const _ID: &str = "valid-speculation-rules-invalid-006";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":"not-array"}</script>"#),
        [err(
            r#"The "prefetch" property of speculation rules must be a JSON array"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-invalid-007]` rule is not an object
#[test]
fn valid_speculation_rules_invalid_007() {
    const _ID: &str = "valid-speculation-rules-invalid-007";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":["not-an-object"]}</script>"#),
        [err(r#"The speculation rule prefetch[0] must be a JSON object"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-008]` forbidden rule key
#[test]
fn valid_speculation_rules_invalid_008() {
    const _ID: &str = "valid-speculation-rules-invalid-008";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"unknownProp":true}]}</script>"#
        ),
        [err(
            r#"The speculation rule key "unknownProp" is not allowed (use "source", "urls", "where", "relative_to", "eagerness", "referrer_policy", "tag", "requires", "expects_no_vary_search", or "target_hint")"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-invalid-009]` source is not a string
#[test]
fn valid_speculation_rules_invalid_009() {
    const _ID: &str = "valid-speculation-rules-invalid-009";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":123}]}</script>"#),
        [err(r#"The "source" of prefetch[0] must be a string"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-010]` source has an invalid value
#[test]
fn valid_speculation_rules_invalid_010() {
    const _ID: &str = "valid-speculation-rules-invalid-010";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"invalid"}]}</script>"#),
        [err(
            r#"The "source" value "invalid" is not allowed (use "list" or "document")"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-invalid-011]` list rule is missing urls
#[test]
fn valid_speculation_rules_invalid_011() {
    const _ID: &str = "valid-speculation-rules-invalid-011";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"list"}]}</script>"#),
        [err(r#"The list rule prefetch[0] must have a "urls" property"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-012]` list rule has a where
#[test]
fn valid_speculation_rules_invalid_012() {
    const _ID: &str = "valid-speculation-rules-invalid-012";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"where":{"href_matches":"*"}}]}</script>"#
        ),
        [err(r#"The list rule prefetch[0] must not have a "where" property"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-013]` document rule is missing where
#[test]
fn valid_speculation_rules_invalid_013() {
    const _ID: &str = "valid-speculation-rules-invalid-013";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"document"}]}</script>"#),
        [err(r#"The document rule prefetch[0] must have a "where" property"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-014]` document rule has urls
#[test]
fn valid_speculation_rules_invalid_014() {
    const _ID: &str = "valid-speculation-rules-invalid-014";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":"*"},"urls":["/a"]}]}</script>"#
        ),
        [err(r#"The document rule prefetch[0] must not have a "urls" property"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-015]` rule has neither source, urls, nor where
#[test]
fn valid_speculation_rules_invalid_015() {
    const _ID: &str = "valid-speculation-rules-invalid-015";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"eagerness":"moderate"}]}</script>"#),
        [err(
            r#"The speculation rule prefetch[0] must have a "source", or exactly one of "urls" or "where""#
        ),]
    );
}

/// TS: `[valid-speculation-rules-invalid-016]` rule has both urls and where without source
#[test]
fn valid_speculation_rules_invalid_016() {
    const _ID: &str = "valid-speculation-rules-invalid-016";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"urls":["/a"],"where":{"href_matches":"/*"}}]}</script>"#),
        [err(
            r#"The speculation rule prefetch[0] must have a "source", or exactly one of "urls" or "where""#
        ),]
    );
}

/// TS: `[valid-speculation-rules-invalid-017]` urls is not an array
#[test]
fn valid_speculation_rules_invalid_017() {
    const _ID: &str = "valid-speculation-rules-invalid-017";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":"not-array"}]}</script>"#),
        [err(r#"The "urls" of prefetch[0] must be a JSON array"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-018]` urls is empty
#[test]
fn valid_speculation_rules_invalid_018() {
    const _ID: &str = "valid-speculation-rules-invalid-018";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":[]}]}</script>"#),
        [err(r#"The "urls" of prefetch[0] must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-019]` a url item is not a string
#[test]
fn valid_speculation_rules_invalid_019() {
    const _ID: &str = "valid-speculation-rules-invalid-019";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":[123]}]}</script>"#),
        [err(r#"The URL at index 0 in "urls" must be a string"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-020]` a url item is an empty string
#[test]
fn valid_speculation_rules_invalid_020() {
    const _ID: &str = "valid-speculation-rules-invalid-020";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":[""]}]}</script>"#),
        [err(r#"The URL at index 0 in "urls" must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-021]` eagerness is not a string
#[test]
fn valid_speculation_rules_invalid_021() {
    const _ID: &str = "valid-speculation-rules-invalid-021";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"eagerness":123}]}</script>"#
        ),
        [err(r#"The "eagerness" of prefetch[0] must be a string"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-022]` eagerness has an invalid value
#[test]
fn valid_speculation_rules_invalid_022() {
    const _ID: &str = "valid-speculation-rules-invalid-022";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"eagerness":"invalid"}]}</script>"#
        ),
        [err(
            r#"The "eagerness" value "invalid" is not allowed (use "immediate", "eager", "moderate", or "conservative")"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-invalid-023]` where is not an object
#[test]
fn valid_speculation_rules_invalid_023() {
    const _ID: &str = "valid-speculation-rules-invalid-023";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":"not-object"}]}</script>"#),
        [err(r#"The "where" condition of prefetch[0] must be a JSON object"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-024]` where has no predicate
#[test]
fn valid_speculation_rules_invalid_024() {
    const _ID: &str = "valid-speculation-rules-invalid-024";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{}}]}</script>"#),
        [err(
            r#"The "where" condition of prefetch[0] must have exactly one predicate ("and", "or", "not", "href_matches", or "selector_matches")"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-invalid-025]` where has multiple predicates
#[test]
fn valid_speculation_rules_invalid_025() {
    const _ID: &str = "valid-speculation-rules-invalid-025";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":"*","selector_matches":"a"}}]}</script>"#
        ),
        [err(
            r#"The "where" condition of prefetch[0] must have exactly one predicate, but has multiple"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-invalid-026]` and predicate is empty
#[test]
fn valid_speculation_rules_invalid_026() {
    const _ID: &str = "valid-speculation-rules-invalid-026";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":[]}}]}</script>"#),
        [err(r#"The "and" predicate must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-027]` and predicate is not an array
#[test]
fn valid_speculation_rules_invalid_027() {
    const _ID: &str = "valid-speculation-rules-invalid-027";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":"not-array"}}]}</script>"#
        ),
        [err(r#"The "and" predicate must be a JSON array"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-028]` href_matches is an empty string
#[test]
fn valid_speculation_rules_invalid_028() {
    const _ID: &str = "valid-speculation-rules-invalid-028";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":""}}]}</script>"#
        ),
        [err(r#"The "href_matches" pattern must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-029]` href_matches is an empty array
#[test]
fn valid_speculation_rules_invalid_029() {
    const _ID: &str = "valid-speculation-rules-invalid-029";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":[]}}]}</script>"#
        ),
        [err(r#"The "href_matches" pattern must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-030]` href_matches is not a string
#[test]
fn valid_speculation_rules_invalid_030() {
    const _ID: &str = "valid-speculation-rules-invalid-030";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":123}}]}</script>"#
        ),
        [err(
            r#"The "href_matches" pattern must be a string or an array of strings"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-invalid-031]` selector_matches is an empty string
#[test]
fn valid_speculation_rules_invalid_031() {
    const _ID: &str = "valid-speculation-rules-invalid-031";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"selector_matches":""}}]}</script>"#
        ),
        [err(r#"The "selector_matches" pattern must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-032]` selector_matches is not a string
#[test]
fn valid_speculation_rules_invalid_032() {
    const _ID: &str = "valid-speculation-rules-invalid-032";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"selector_matches":123}}]}</script>"#
        ),
        [err(
            r#"The "selector_matches" pattern must be a string or an array of strings"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-invalid-033]` unknown predicate key
#[test]
fn valid_speculation_rules_invalid_033() {
    const _ID: &str = "valid-speculation-rules-invalid-033";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"unknown":"x"}}]}</script>"#),
        [err(
            r#"The predicate key "unknown" is not allowed (use "and", "or", "not", "href_matches", or "selector_matches")"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-invalid-034]` a pattern array item is not a string
#[test]
fn valid_speculation_rules_invalid_034() {
    const _ID: &str = "valid-speculation-rules-invalid-034";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":["/ok/*",123]}}]}</script>"#
        ),
        [err(r#"Item [1] of the "href_matches" pattern must be a string"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-035]` a pattern array item is an empty string
#[test]
fn valid_speculation_rules_invalid_035() {
    const _ID: &str = "valid-speculation-rules-invalid-035";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"selector_matches":["a",""]}}]}</script>"#
        ),
        [err(r#"Item [1] of the "selector_matches" pattern must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-036]` a not predicate value is not an object
#[test]
fn valid_speculation_rules_invalid_036() {
    const _ID: &str = "valid-speculation-rules-invalid-036";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"not":"x"}}]}</script>"#),
        [err(r#"The "not" predicate must be a JSON object"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-037]` prerender rule set is validated like prefetch
#[test]
fn valid_speculation_rules_invalid_037() {
    const _ID: &str = "valid-speculation-rules-invalid-037";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prerender":[{"source":"list"}]}</script>"#),
        [err(r#"The list rule prerender[0] must have a "urls" property"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-038]` or predicate is not an array
#[test]
fn valid_speculation_rules_invalid_038() {
    const _ID: &str = "valid-speculation-rules-invalid-038";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"or":"not-array"}}]}</script>"#
        ),
        [err(r#"The "or" predicate must be a JSON array"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-039]` or predicate is empty
#[test]
fn valid_speculation_rules_invalid_039() {
    const _ID: &str = "valid-speculation-rules-invalid-039";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"or":[]}}]}</script>"#),
        [err(r#"The "or" predicate must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-invalid-040]` a nested predicate inside and is invalid
#[test]
fn valid_speculation_rules_invalid_040() {
    const _ID: &str = "valid-speculation-rules-invalid-040";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":[{"href_matches":"/ok/*"},{"unknown":"x"}]}}]}</script>"#
        ),
        [err(
            r#"The predicate key "unknown" is not allowed (use "and", "or", "not", "href_matches", or "selector_matches")"#
        ),]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_speculation_rules_001() {
    let urls = format!("[{}5]", "\"/a\",".repeat(1000));
    assert_eq!(
        run_body(&format!(r#"{{"prefetch":[{{"urls":{urls}}}]}}"#)),
        [err1(r#"The URL at index 1,000 in "urls" must be a string"#)]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_speculation_rules_002() {
    let rules = format!("[{}\"x\"]", r#"{"urls":["/a"]},"#.repeat(1000));
    assert_eq!(
        run_body(&format!(r#"{{"prerender":{rules}}}"#)),
        [err1("The speculation rule prerender[1000] must be a JSON object")]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_speculation_rules_003() {
    assert_eq!(
        run_body(r#"{"prefetch":[{"urls":[1]},{"source":"x","urls":[1]}]}"#),
        [
            err1(r#"The URL at index 0 in "urls" must be a string"#),
            err1(r#"The "source" value "x" is not allowed (use "list" or "document")"#),
        ]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_speculation_rules_004() {
    assert_eq!(
        run_body(r#"{"prefetch":[{"source":null},{"source":"x"},{"source":"list","eagerness":null,"urls":["/a"]}]}"#),
        [
            err1(r#"The "source" of prefetch[0] must be a string"#),
            err1(r#"The "source" value "x" is not allowed (use "list" or "document")"#),
            err1(r#"The "eagerness" of prefetch[2] must be a string"#),
        ]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_speculation_rules_005() {
    assert_eq!(
        run_body(
            r#"{"prefetch":[{"where":{"and":[{}]}},{"where":{"not":{"x":1}}},{"where":{"or":[{"not":[]},{"href_matches":[1,""]}]}}]}"#
        ),
        [
            err1(
                r#"The "and" predicate item [0] must have exactly one predicate ("and", "or", "not", "href_matches", or "selector_matches")"#
            ),
            err1(
                r#"The predicate key "x" is not allowed (use "and", "or", "not", "href_matches", or "selector_matches")"#
            ),
            err1(r#"The "not" predicate must be a JSON object"#),
            err1(r#"Item [0] of the "href_matches" pattern must be a string"#),
            err1(r#"Item [1] of the "href_matches" pattern must not be empty"#),
        ]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_speculation_rules_006() {
    assert_eq!(
        run_body(r#"{"prefetch":[{"where":{"href_matches":"","selector_matches":[],"zz":1}}]}"#),
        [
            err1(
                r#"The predicate key "zz" is not allowed (use "and", "or", "not", "href_matches", or "selector_matches")"#
            ),
            err1(r#"The "where" condition of prefetch[0] must have exactly one predicate, but has multiple"#),
            err1(r#"The "href_matches" pattern must not be empty"#),
            err1(r#"The "selector_matches" pattern must not be empty"#),
        ]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_speculation_rules_007() {
    let unknown = |key: &str| {
        err1(&format!(
            r#"The speculation rule key "{key}" is not allowed (use "source", "urls", "where", "relative_to", "eagerness", "referrer_policy", "tag", "requires", "expects_no_vary_search", or "target_hint")"#
        ))
    };
    assert_eq!(
        run_body(r#"{"prefetch":[{"source":"list","urls":["/a"],"2":1,"b":1,"1":1,"__proto__":1}]}"#),
        [unknown("1"), unknown("2"), unknown("b"), unknown("__proto__")]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_speculation_rules_008() {
    assert_eq!(
        run_body(r#"{"tag":"x"}"#),
        [err1(
            r#"Speculation rules must be an object with a "prefetch" or "prerender" property"#
        )]
    );
    assert_eq!(
        run_body(r#"{"tag":"x","prefetch":{}}"#),
        [err1(
            r#"The "prefetch" property of speculation rules must be a JSON array"#
        )]
    );
    assert_eq!(
        run_body(r#"{"prefetch":[{"source":"list","urls":["/a"]}],"prefetch":"x"}"#),
        [err1(
            r#"The "prefetch" property of speculation rules must be a JSON array"#
        )]
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_speculation_rules_009() {
    assert_eq!(
        lint(
            r#"<x-s as="script" type="speculationrules">{"prefetch":[]}</x-s><x-s as="script" type="speculationrules">{}</x-s>"#,
            rule_only()
        ),
        [brief(
            Severity::Error,
            1,
            63,
            r#"Speculation rules must be an object with a "prefetch" or "prerender" property"#,
            r#"<x-s as="script" type="speculationrules">"#
        )]
    );
    assert_eq!(
        lint(
            r#"<x-s type="speculationrules">{}</x-s>"#,
            serde_json::json!({
                "rules": { "valid-speculation-rules": true },
                "pretenders": [{ "selector": "x-s", "as": { "element": "script", "inheritAttrs": true } }],
            })
        ),
        []
    );
}

/// Expected values from the TS rule on the same input.
#[test]
fn v6_valid_speculation_rules_010() {
    assert_eq!(
        run_body(r#"{"prefetch":[{"source":"document","where":{"and":[{"and":[{"and":[]}]}]}}]}"#),
        [err1(r#"The "and" predicate must not be empty"#)]
    );
}
