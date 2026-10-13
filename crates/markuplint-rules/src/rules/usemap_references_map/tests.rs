//! Tests for `usemap-references-map` rule.
//!
//! Test ID mapping (TS → Rust):
//!   usemap-references-map-valid-001    → usemap_references_map_valid_001
//!   usemap-references-map-valid-002    → usemap_references_map_valid_002
//!   usemap-references-map-valid-003    — SKIPPED: needs the Mustache parser (`{{mapRef}}` dynamic value)
//!   usemap-references-map-invalid-001  → usemap_references_map_invalid_001
//!   usemap-references-map-invalid-002  → usemap_references_map_invalid_002
//!   usemap-references-map-invalid-003  → usemap_references_map_invalid_003
//!   v6_usemap_references_map_001  — Rust-only: a value that is not a hash-name reference is not checked
//!   v6_usemap_references_map_002  — Rust-only: an img pretended by a pretender is skipped, one with the `as` attribute is checked
//!   v6_usemap_references_map_003  — Rust-only: a pretended map is found by the `name` it carries
//!   v6_usemap_references_map_004  — Rust-only: `usemap` is looked up by its source name, `name` case-insensitively
//!   v6_usemap_references_map_005  — Rust-only: the name comparison is case-sensitive, and any map with the name resolves

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const MESSAGE: &str =
    "The \"usemap\" attribute of the \"img\" element must be a valid hash-name reference to a \"map\" element";

fn run(html: &str) -> Vec<Brief> {
    run_with(html, serde_json::json!([]))
}

fn run_with(html: &str, pretenders: serde_json::Value) -> Vec<Brief> {
    lint_brief(
        "usemap-references-map",
        html,
        serde_json::json!({ "rules": { "usemap-references-map": true }, "pretenders": pretenders }),
    )
}

/// TS: `[usemap-references-map-valid-001]` — resolves to a map element
#[test]
fn usemap_references_map_valid_001() {
    const _ID: &str = "usemap-references-map-valid-001";
    assert_eq!(
        run(r##"<img src="shapes.png" alt="" usemap="#shapes"><map name="shapes"></map>"##),
        []
    );
}

/// TS: `[usemap-references-map-valid-002]` — no usemap attribute
#[test]
fn usemap_references_map_valid_002() {
    const _ID: &str = "usemap-references-map-valid-002";
    assert_eq!(run(r#"<img src="shapes.png" alt="">"#), []);
}

/// TS: `[usemap-references-map-invalid-001]` — no map element in the document
#[test]
fn usemap_references_map_invalid_001() {
    const _ID: &str = "usemap-references-map-invalid-001";
    assert_eq!(
        run(r##"<img src="shapes.png" alt="" usemap="#nonexistent">"##),
        [brief(Severity::Error, 1, 38, MESSAGE, "#nonexistent")]
    );
}

/// TS: `[usemap-references-map-invalid-002]` — map element exists but with a different name
#[test]
fn usemap_references_map_invalid_002() {
    const _ID: &str = "usemap-references-map-invalid-002";
    assert_eq!(
        run(r##"<img src="shapes.png" alt="" usemap="#shapes"><map name="other-shapes"></map>"##).len(),
        1
    );
}

/// TS: `[usemap-references-map-invalid-003]` — the reference resolves only via id, not name
#[test]
fn usemap_references_map_invalid_003() {
    const _ID: &str = "usemap-references-map-invalid-003";
    assert_eq!(
        run(r##"<img src="shapes.png" alt="" usemap="#shapes"><map id="shapes"></map>"##).len(),
        1
    );
}

/// A value without `#`, or `#` alone, is not a hash-name reference and is left alone.
#[test]
fn v6_usemap_references_map_001() {
    assert_eq!(run(r#"<img src="a.png" alt="" usemap="shapes">"#), []);
    assert_eq!(run(r##"<img src="a.png" alt="" usemap="#">"##), []);
}

/// An img pretended by a pretender (no `as` attribute) is skipped; with it, it is checked.
#[test]
fn v6_usemap_references_map_002() {
    assert_eq!(
        run_with(
            r##"<x-img usemap="#a"></x-img>"##,
            serde_json::json!([{ "selector": "x-img", "as": { "element": "img", "inheritAttrs": true } }]),
        ),
        []
    );
    assert_eq!(
        run(r##"<x-img as="img" usemap="#a"></x-img>"##),
        [brief(Severity::Error, 1, 25, MESSAGE, "#a")]
    );
}

/// A pretended map resolves through the `name` it carries; a bare-name pretender has no
/// attributes, so it carries none.
#[test]
fn v6_usemap_references_map_003() {
    assert_eq!(
        run_with(
            r##"<img usemap="#a"><x-map name="a"></x-map>"##,
            serde_json::json!([{ "selector": "x-map", "as": { "element": "map", "inheritAttrs": true } }]),
        ),
        []
    );
    assert_eq!(
        run_with(
            r##"<img usemap="#a"><x-map name="a"></x-map>"##,
            serde_json::json!([{ "selector": "x-map", "as": "map" }]),
        ),
        [brief(Severity::Error, 1, 14, MESSAGE, "#a")]
    );
}

/// TS `getAttributeNode('usemap')` compares the source name as is, so `USEMAP` is not
/// found; `getAttribute('name')` matches case-insensitively, so `NAME` is.
#[test]
fn v6_usemap_references_map_004() {
    assert_eq!(run(r##"<img USEMAP="#a">"##), []);
    assert_eq!(run(r##"<img usemap="#a"><map NAME="a"></map>"##), []);
}

/// The name is compared case-sensitively, against every map in the document.
#[test]
fn v6_usemap_references_map_005() {
    assert_eq!(
        run(r##"<img usemap="#Shapes"><map name="shapes"></map>"##),
        [brief(Severity::Error, 1, 14, MESSAGE, "#Shapes")]
    );
    assert_eq!(
        run(r##"<img usemap="#a"><map name="b"></map><map name="a"></map>"##),
        []
    );
}
