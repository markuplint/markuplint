//! Tests for `map-id-name-match` rule.
//!
//! Test ID mapping (TS → Rust):
//!   map-id-name-match-valid-001    → map_id_name_match_valid_001
//!   map-id-name-match-valid-002    → map_id_name_match_valid_002
//!   map-id-name-match-valid-003    → map_id_name_match_valid_003
//!   map-id-name-match-invalid-001  → map_id_name_match_invalid_001
//!   map-id-name-match-invalid-002  → map_id_name_match_invalid_002
//!   v6_map_id_name_match_001  — Rust-only: a map pretended by a pretender is skipped, one with the `as` attribute is checked
//!   v6_map_id_name_match_002  — Rust-only: the attribute nodes are looked up by their source names (`ID`/`NAME` are not found)
//!   v6_map_id_name_match_003  — Rust-only: an empty `id` is compared too; other elements are not checked

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const MESSAGE: &str = "The \"id\" attribute on a \"map\" element must have the same value as the \"name\" attribute";

fn run(html: &str) -> Vec<Brief> {
    run_with(html, serde_json::json!([]))
}

fn run_with(html: &str, pretenders: serde_json::Value) -> Vec<Brief> {
    lint_brief(
        "map-id-name-match",
        html,
        serde_json::json!({ "rules": { "map-id-name-match": true }, "pretenders": pretenders }),
    )
}

/// TS: `[map-id-name-match-valid-001]` — map without id
#[test]
fn map_id_name_match_valid_001() {
    const _ID: &str = "map-id-name-match-valid-001";
    assert_eq!(run(r#"<map name="foo"><area href="a.html" alt="A"></map>"#).len(), 0);
}

/// TS: `[map-id-name-match-valid-002]` — map without name
#[test]
fn map_id_name_match_valid_002() {
    const _ID: &str = "map-id-name-match-valid-002";
    assert_eq!(run(r#"<map id="foo"><area href="a.html" alt="A"></map>"#).len(), 0);
}

/// TS: `[map-id-name-match-valid-003]` — id and name match
#[test]
fn map_id_name_match_valid_003() {
    const _ID: &str = "map-id-name-match-valid-003";
    assert_eq!(
        run(r#"<map id="foo" name="foo"><area href="a.html" alt="A"></map>"#).len(),
        0
    );
}

/// TS: `[map-id-name-match-invalid-001]` — id and name mismatch
#[test]
fn map_id_name_match_invalid_001() {
    const _ID: &str = "map-id-name-match-invalid-001";
    assert_eq!(
        run(r#"<map id="foo" name="bar"><area href="a.html" alt="A"></map>"#),
        [brief(Severity::Error, 1, 10, MESSAGE, "foo")]
    );
}

/// TS: `[map-id-name-match-invalid-002]` — case-sensitive comparison
#[test]
fn map_id_name_match_invalid_002() {
    const _ID: &str = "map-id-name-match-invalid-002";
    let violations = run(r#"<map id="Foo" name="foo"><area href="a.html" alt="A"></map>"#);
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].4, "Foo");
}

/// A map pretended by a pretender (no `as` attribute) is skipped; with it, it is checked.
#[test]
fn v6_map_id_name_match_001() {
    assert_eq!(
        run_with(
            r#"<x-map id="a" name="b"></x-map>"#,
            serde_json::json!([{ "selector": "x-map", "as": { "element": "map", "inheritAttrs": true } }]),
        ),
        []
    );
    assert_eq!(
        run(r#"<x-map as="map" id="a" name="b"></x-map>"#),
        [brief(Severity::Error, 1, 21, MESSAGE, "a")]
    );
}

/// TS `getAttributeNode()` compares the source name as is, so upper-case `ID` or `NAME`
/// is not found and the map is not checked.
#[test]
fn v6_map_id_name_match_002() {
    assert_eq!(run(r#"<map ID="a" name="b"></map>"#), []);
    assert_eq!(run(r#"<map id="a" NAME="b"></map>"#), []);
}

/// An empty `id` is compared like any value; only `map` is checked.
#[test]
fn v6_map_id_name_match_003() {
    assert_eq!(
        run(r#"<map id="" name="b"></map>"#),
        [brief(Severity::Error, 1, 10, MESSAGE, "")]
    );
    assert_eq!(run(r#"<div id="a" name="b"></div>"#), []);
}
