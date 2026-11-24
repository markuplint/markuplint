//! Tests for `valid-speculation-rules` rule.
//!
//! Test ID mapping (TS → Rust):
//!   valid-speculation-rules-001            → valid_speculation_rules_001
//!   valid-speculation-rules-002            → valid_speculation_rules_002
//!   valid-speculation-rules-003            → valid_speculation_rules_003
//!   valid-speculation-rules-004            → valid_speculation_rules_004
//!   valid-speculation-rules-005            → valid_speculation_rules_005
//!   valid-speculation-rules-006            → valid_speculation_rules_006
//!   valid-speculation-rules-007            → valid_speculation_rules_007
//!   valid-speculation-rules-008            → valid_speculation_rules_008
//!   valid-speculation-rules-009            → valid_speculation_rules_009
//!   valid-speculation-rules-010            → valid_speculation_rules_010
//!   valid-speculation-rules-011            → valid_speculation_rules_011
//!   valid-speculation-rules-012            → valid_speculation_rules_012
//!   valid-speculation-rules-013            → valid_speculation_rules_013
//!   valid-speculation-rules-014            → valid_speculation_rules_014
//!   valid-speculation-rules-015          → valid_speculation_rules_015
//!   valid-speculation-rules-016          → valid_speculation_rules_016
//!   valid-speculation-rules-017          → valid_speculation_rules_017
//!   valid-speculation-rules-018          → valid_speculation_rules_018
//!   valid-speculation-rules-019          → valid_speculation_rules_019
//!   valid-speculation-rules-020          → valid_speculation_rules_020
//!   valid-speculation-rules-021          → valid_speculation_rules_021
//!   valid-speculation-rules-022          → valid_speculation_rules_022
//!   valid-speculation-rules-023          → valid_speculation_rules_023
//!   valid-speculation-rules-024          → valid_speculation_rules_024
//!   valid-speculation-rules-025          → valid_speculation_rules_025
//!   valid-speculation-rules-026          → valid_speculation_rules_026
//!   valid-speculation-rules-027          → valid_speculation_rules_027
//!   valid-speculation-rules-028          → valid_speculation_rules_028
//!   valid-speculation-rules-029          → valid_speculation_rules_029
//!   valid-speculation-rules-030          → valid_speculation_rules_030
//!   valid-speculation-rules-031          → valid_speculation_rules_031
//!   valid-speculation-rules-032          → valid_speculation_rules_032
//!   valid-speculation-rules-033          → valid_speculation_rules_033
//!   valid-speculation-rules-034          → valid_speculation_rules_034
//!   valid-speculation-rules-035          → valid_speculation_rules_035
//!   valid-speculation-rules-036          → valid_speculation_rules_036
//!   valid-speculation-rules-037          → valid_speculation_rules_037
//!   valid-speculation-rules-038          → valid_speculation_rules_038
//!   valid-speculation-rules-039          → valid_speculation_rules_039
//!   valid-speculation-rules-040          → valid_speculation_rules_040
//!   valid-speculation-rules-041          → valid_speculation_rules_041
//!   valid-speculation-rules-042          → valid_speculation_rules_042
//!   valid-speculation-rules-043          → valid_speculation_rules_043
//!   valid-speculation-rules-044          → valid_speculation_rules_044
//!   valid-speculation-rules-045          → valid_speculation_rules_045
//!   valid-speculation-rules-046          → valid_speculation_rules_046
//!   valid-speculation-rules-047          → valid_speculation_rules_047
//!   valid-speculation-rules-048          → valid_speculation_rules_048
//!   valid-speculation-rules-049          → valid_speculation_rules_049
//!   valid-speculation-rules-050          → valid_speculation_rules_050
//!   valid-speculation-rules-051          → valid_speculation_rules_051
//!   valid-speculation-rules-052          → valid_speculation_rules_052
//!   valid-speculation-rules-053          → valid_speculation_rules_053
//!   valid-speculation-rules-054          → valid_speculation_rules_054
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

/// TS: `[valid-speculation-rules-001]` script without type attribute is ignored
#[test]
fn valid_speculation_rules_001() {
    const _ID: &str = "valid-speculation-rules-001";
    assert_eq!(run(r#"<script>console.log("ok");</script>"#), []);
}

/// TS: `[valid-speculation-rules-002]` script type=module is ignored
#[test]
fn valid_speculation_rules_002() {
    const _ID: &str = "valid-speculation-rules-002";
    assert_eq!(run(r#"<script type="module">import "./a.js";</script>"#), []);
}

/// TS: `[valid-speculation-rules-003]` minimal valid list rule
#[test]
fn valid_speculation_rules_003() {
    const _ID: &str = "valid-speculation-rules-003";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["https://example.com"]}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-004]` minimal valid document rule
#[test]
fn valid_speculation_rules_004() {
    const _ID: &str = "valid-speculation-rules-004";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":"/*"}}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-005]` both prefetch and prerender rule sets
#[test]
fn valid_speculation_rules_005() {
    const _ID: &str = "valid-speculation-rules-005";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"]}],"prerender":[{"source":"document","where":{"href_matches":"/*"}}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-006]` source inferred as list from urls
#[test]
fn valid_speculation_rules_006() {
    const _ID: &str = "valid-speculation-rules-006";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"urls":["/page1.html"]}]}</script>"#),
        []
    );
}

/// TS: `[valid-speculation-rules-007]` source inferred as document from where
#[test]
fn valid_speculation_rules_007() {
    const _ID: &str = "valid-speculation-rules-007";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"eagerness":"moderate","where":{"href_matches":"/*"}}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-008]` href_matches accepts an array of strings
#[test]
fn valid_speculation_rules_008() {
    const _ID: &str = "valid-speculation-rules-008";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":["/blog/*","/news/*"]}}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-009]` nested and / or / not predicates
#[test]
fn valid_speculation_rules_009() {
    const _ID: &str = "valid-speculation-rules-009";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":[{"or":[{"href_matches":"/articles/*"},{"href_matches":"/blog/*"}]},{"not":{"selector_matches":[".no-prefetch","a[rel~=nofollow]"]}}]},"eagerness":"conservative"}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-010]` type matching is case-insensitive
#[test]
fn valid_speculation_rules_010() {
    const _ID: &str = "valid-speculation-rules-010";
    assert_eq!(
        run(r#"<script type="SpeculationRules">{"prefetch":[{"source":"list","urls":["/a"]}]}</script>"#),
        []
    );
}

/// TS: `[valid-speculation-rules-011]` empty rule set array is allowed
#[test]
fn valid_speculation_rules_011() {
    const _ID: &str = "valid-speculation-rules-011";
    assert_eq!(run(r#"<script type="speculationrules">{"prefetch":[]}</script>"#), []);
}

/// TS: `[valid-speculation-rules-012]` eagerness "immediate" is allowed (HTML LS §7.6)
#[test]
fn valid_speculation_rules_012() {
    const _ID: &str = "valid-speculation-rules-012";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"eagerness":"immediate"}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-013]` additional spec rule keys are allowed (HTML LS §7.6.1.2)
#[test]
fn valid_speculation_rules_013() {
    const _ID: &str = "valid-speculation-rules-013";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"relative_to":"document","referrer_policy":"no-referrer","requires":["anonymous-client-ip-when-cross-origin"],"expects_no_vary_search":"params=(\"a\")","target_hint":"_blank","tag":"my-tag"}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-014]` top-level "tag" is allowed alongside a rule set
#[test]
fn valid_speculation_rules_014() {
    const _ID: &str = "valid-speculation-rules-014";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"tag":"my-tag","prefetch":[{"source":"list","urls":["/a"]}]}</script>"#
        ),
        []
    );
}

/// TS: `[valid-speculation-rules-015]` empty content
#[test]
fn valid_speculation_rules_015() {
    const _ID: &str = "valid-speculation-rules-015";
    assert_eq!(
        run(r#"<script type="speculationrules"></script>"#),
        [err(r#"Speculation rules must contain a JSON object"#),]
    );
}

/// TS: `[valid-speculation-rules-016]` content is not JSON
#[test]
fn valid_speculation_rules_016() {
    const _ID: &str = "valid-speculation-rules-016";
    assert_eq!(
        run(r#"<script type="speculationrules">{ invalid json</script>"#),
        [err(r#"Speculation rules must be valid JSON"#),]
    );
}

/// TS: `[valid-speculation-rules-017]` top-level value is an array
#[test]
fn valid_speculation_rules_017() {
    const _ID: &str = "valid-speculation-rules-017";
    assert_eq!(
        run(r#"<script type="speculationrules">["a","b"]</script>"#),
        [err(r#"Speculation rules must be a JSON object"#),]
    );
}

/// TS: `[valid-speculation-rules-018]` missing both prefetch and prerender
#[test]
fn valid_speculation_rules_018() {
    const _ID: &str = "valid-speculation-rules-018";
    assert_eq!(
        run(r#"<script type="speculationrules">{}</script>"#),
        [err(
            r#"Speculation rules must be an object with a "prefetch" or "prerender" property"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-019]` forbidden top-level key
#[test]
fn valid_speculation_rules_019() {
    const _ID: &str = "valid-speculation-rules-019";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[],"unknownProp":true}</script>"#),
        [err(
            r#"The speculation rules top-level key "unknownProp" is not allowed (use "tag", "prefetch", or "prerender")"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-020]` rule set is not an array
#[test]
fn valid_speculation_rules_020() {
    const _ID: &str = "valid-speculation-rules-020";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":"not-array"}</script>"#),
        [err(
            r#"The "prefetch" property of speculation rules must be a JSON array"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-021]` rule is not an object
#[test]
fn valid_speculation_rules_021() {
    const _ID: &str = "valid-speculation-rules-021";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":["not-an-object"]}</script>"#),
        [err(r#"The speculation rule prefetch[0] must be a JSON object"#),]
    );
}

/// TS: `[valid-speculation-rules-022]` forbidden rule key
#[test]
fn valid_speculation_rules_022() {
    const _ID: &str = "valid-speculation-rules-022";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"unknownProp":true}]}</script>"#
        ),
        [err(
            r#"The speculation rule key "unknownProp" is not allowed (use "source", "urls", "where", "relative_to", "eagerness", "referrer_policy", "tag", "requires", "expects_no_vary_search", or "target_hint")"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-023]` source is not a string
#[test]
fn valid_speculation_rules_023() {
    const _ID: &str = "valid-speculation-rules-023";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":123}]}</script>"#),
        [err(r#"The "source" of prefetch[0] must be a string"#),]
    );
}

/// TS: `[valid-speculation-rules-024]` source has an invalid value
#[test]
fn valid_speculation_rules_024() {
    const _ID: &str = "valid-speculation-rules-024";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"invalid"}]}</script>"#),
        [err(
            r#"The "source" value "invalid" is not allowed (use "list" or "document")"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-025]` list rule is missing urls
#[test]
fn valid_speculation_rules_025() {
    const _ID: &str = "valid-speculation-rules-025";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"list"}]}</script>"#),
        [err(r#"The list rule prefetch[0] must have a "urls" property"#),]
    );
}

/// TS: `[valid-speculation-rules-026]` list rule has a where
#[test]
fn valid_speculation_rules_026() {
    const _ID: &str = "valid-speculation-rules-026";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"where":{"href_matches":"*"}}]}</script>"#
        ),
        [err(r#"The list rule prefetch[0] must not have a "where" property"#),]
    );
}

/// TS: `[valid-speculation-rules-027]` document rule is missing where
#[test]
fn valid_speculation_rules_027() {
    const _ID: &str = "valid-speculation-rules-027";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"document"}]}</script>"#),
        [err(r#"The document rule prefetch[0] must have a "where" property"#),]
    );
}

/// TS: `[valid-speculation-rules-028]` document rule has urls
#[test]
fn valid_speculation_rules_028() {
    const _ID: &str = "valid-speculation-rules-028";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":"*"},"urls":["/a"]}]}</script>"#
        ),
        [err(r#"The document rule prefetch[0] must not have a "urls" property"#),]
    );
}

/// TS: `[valid-speculation-rules-029]` rule has neither source, urls, nor where
#[test]
fn valid_speculation_rules_029() {
    const _ID: &str = "valid-speculation-rules-029";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"eagerness":"moderate"}]}</script>"#),
        [err(
            r#"The speculation rule prefetch[0] must have a "source", or exactly one of "urls" or "where""#
        ),]
    );
}

/// TS: `[valid-speculation-rules-030]` rule has both urls and where without source
#[test]
fn valid_speculation_rules_030() {
    const _ID: &str = "valid-speculation-rules-030";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"urls":["/a"],"where":{"href_matches":"/*"}}]}</script>"#),
        [err(
            r#"The speculation rule prefetch[0] must have a "source", or exactly one of "urls" or "where""#
        ),]
    );
}

/// TS: `[valid-speculation-rules-031]` urls is not an array
#[test]
fn valid_speculation_rules_031() {
    const _ID: &str = "valid-speculation-rules-031";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":"not-array"}]}</script>"#),
        [err(r#"The "urls" of prefetch[0] must be a JSON array"#),]
    );
}

/// TS: `[valid-speculation-rules-032]` urls is empty
#[test]
fn valid_speculation_rules_032() {
    const _ID: &str = "valid-speculation-rules-032";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":[]}]}</script>"#),
        [err(r#"The "urls" of prefetch[0] must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-033]` a url item is not a string
#[test]
fn valid_speculation_rules_033() {
    const _ID: &str = "valid-speculation-rules-033";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":[123]}]}</script>"#),
        [err(r#"The URL at index 0 in "urls" must be a string"#),]
    );
}

/// TS: `[valid-speculation-rules-034]` a url item is an empty string
#[test]
fn valid_speculation_rules_034() {
    const _ID: &str = "valid-speculation-rules-034";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":[""]}]}</script>"#),
        [err(r#"The URL at index 0 in "urls" must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-035]` eagerness is not a string
#[test]
fn valid_speculation_rules_035() {
    const _ID: &str = "valid-speculation-rules-035";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"eagerness":123}]}</script>"#
        ),
        [err(r#"The "eagerness" of prefetch[0] must be a string"#),]
    );
}

/// TS: `[valid-speculation-rules-036]` eagerness has an invalid value
#[test]
fn valid_speculation_rules_036() {
    const _ID: &str = "valid-speculation-rules-036";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"list","urls":["/a"],"eagerness":"invalid"}]}</script>"#
        ),
        [err(
            r#"The "eagerness" value "invalid" is not allowed (use "immediate", "eager", "moderate", or "conservative")"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-037]` where is not an object
#[test]
fn valid_speculation_rules_037() {
    const _ID: &str = "valid-speculation-rules-037";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":"not-object"}]}</script>"#),
        [err(r#"The "where" condition of prefetch[0] must be a JSON object"#),]
    );
}

/// TS: `[valid-speculation-rules-038]` where has no predicate
#[test]
fn valid_speculation_rules_038() {
    const _ID: &str = "valid-speculation-rules-038";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{}}]}</script>"#),
        [err(
            r#"The "where" condition of prefetch[0] must have exactly one predicate ("and", "or", "not", "href_matches", or "selector_matches")"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-039]` where has multiple predicates
#[test]
fn valid_speculation_rules_039() {
    const _ID: &str = "valid-speculation-rules-039";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":"*","selector_matches":"a"}}]}</script>"#
        ),
        [err(
            r#"The "where" condition of prefetch[0] must have exactly one predicate, but has multiple"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-040]` and predicate is empty
#[test]
fn valid_speculation_rules_040() {
    const _ID: &str = "valid-speculation-rules-040";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":[]}}]}</script>"#),
        [err(r#"The "and" predicate must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-041]` and predicate is not an array
#[test]
fn valid_speculation_rules_041() {
    const _ID: &str = "valid-speculation-rules-041";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"and":"not-array"}}]}</script>"#
        ),
        [err(r#"The "and" predicate must be a JSON array"#),]
    );
}

/// TS: `[valid-speculation-rules-042]` href_matches is an empty string
#[test]
fn valid_speculation_rules_042() {
    const _ID: &str = "valid-speculation-rules-042";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":""}}]}</script>"#
        ),
        [err(r#"The "href_matches" pattern must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-043]` href_matches is an empty array
#[test]
fn valid_speculation_rules_043() {
    const _ID: &str = "valid-speculation-rules-043";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":[]}}]}</script>"#
        ),
        [err(r#"The "href_matches" pattern must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-044]` href_matches is not a string
#[test]
fn valid_speculation_rules_044() {
    const _ID: &str = "valid-speculation-rules-044";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":123}}]}</script>"#
        ),
        [err(
            r#"The "href_matches" pattern must be a string or an array of strings"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-045]` selector_matches is an empty string
#[test]
fn valid_speculation_rules_045() {
    const _ID: &str = "valid-speculation-rules-045";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"selector_matches":""}}]}</script>"#
        ),
        [err(r#"The "selector_matches" pattern must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-046]` selector_matches is not a string
#[test]
fn valid_speculation_rules_046() {
    const _ID: &str = "valid-speculation-rules-046";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"selector_matches":123}}]}</script>"#
        ),
        [err(
            r#"The "selector_matches" pattern must be a string or an array of strings"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-047]` unknown predicate key
#[test]
fn valid_speculation_rules_047() {
    const _ID: &str = "valid-speculation-rules-047";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"unknown":"x"}}]}</script>"#),
        [err(
            r#"The predicate key "unknown" is not allowed (use "and", "or", "not", "href_matches", or "selector_matches")"#
        ),]
    );
}

/// TS: `[valid-speculation-rules-048]` a pattern array item is not a string
#[test]
fn valid_speculation_rules_048() {
    const _ID: &str = "valid-speculation-rules-048";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"href_matches":["/ok/*",123]}}]}</script>"#
        ),
        [err(r#"Item [1] of the "href_matches" pattern must be a string"#),]
    );
}

/// TS: `[valid-speculation-rules-049]` a pattern array item is an empty string
#[test]
fn valid_speculation_rules_049() {
    const _ID: &str = "valid-speculation-rules-049";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"selector_matches":["a",""]}}]}</script>"#
        ),
        [err(r#"Item [1] of the "selector_matches" pattern must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-050]` a not predicate value is not an object
#[test]
fn valid_speculation_rules_050() {
    const _ID: &str = "valid-speculation-rules-050";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"not":"x"}}]}</script>"#),
        [err(r#"The "not" predicate must be a JSON object"#),]
    );
}

/// TS: `[valid-speculation-rules-051]` prerender rule set is validated like prefetch
#[test]
fn valid_speculation_rules_051() {
    const _ID: &str = "valid-speculation-rules-051";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prerender":[{"source":"list"}]}</script>"#),
        [err(r#"The list rule prerender[0] must have a "urls" property"#),]
    );
}

/// TS: `[valid-speculation-rules-052]` or predicate is not an array
#[test]
fn valid_speculation_rules_052() {
    const _ID: &str = "valid-speculation-rules-052";
    assert_eq!(
        run(
            r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"or":"not-array"}}]}</script>"#
        ),
        [err(r#"The "or" predicate must be a JSON array"#),]
    );
}

/// TS: `[valid-speculation-rules-053]` or predicate is empty
#[test]
fn valid_speculation_rules_053() {
    const _ID: &str = "valid-speculation-rules-053";
    assert_eq!(
        run(r#"<script type="speculationrules">{"prefetch":[{"source":"document","where":{"or":[]}}]}</script>"#),
        [err(r#"The "or" predicate must not be empty"#),]
    );
}

/// TS: `[valid-speculation-rules-054]` a nested predicate inside and is invalid
#[test]
fn valid_speculation_rules_054() {
    const _ID: &str = "valid-speculation-rules-054";
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
