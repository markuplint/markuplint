//! Tests for `require-accessible-name` rule.
//!
//! Test ID mapping (TS → Rust), for the tests ported so far:
//!   require-accessible-name-valid-009  → require_accessible_name_valid_009
//!
//! The pretender tests use the JSX parser; each is ported with custom elements in HTML:
//!   require-accessible-name-invalid-013        — v6_require_accessible_name_001
//!   require-accessible-name-issue-2394         — v6_require_accessible_name_002
//!   require-accessible-name-issue-4069-001..015 — v6_require_accessible_name_003..017

use super::*;
use crate::aria::may_be_focusable::tests::make_arena;
use crate::rule::{RuleConfig, RuleConfigSet};
use markuplint_types::spec::load_spec;

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

#[test]
fn input_without_label_violation() {
    // <input type="text"> has implicit role "textbox" which requires accessible name
    let s = spec();
    let (arena, _id) = make_arena("input", &[("type", "text")]);
    let rule = RequireAccessibleName;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].message, "Require accessible name");
}

#[test]
fn input_with_aria_label_no_violation() {
    let s = spec();
    let (arena, _id) = make_arena("input", &[("type", "text"), ("aria-label", "Username")]);
    let rule = RequireAccessibleName;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty());
}

#[test]
fn img_without_alt_violation() {
    // <img> has implicit role "img" which requires accessible name
    let s = spec();
    let (arena, _id) = make_arena("img", &[("src", "photo.jpg")]);
    let rule = RequireAccessibleName;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].message, "Require accessible name");
}

#[test]
fn img_with_alt_no_violation() {
    let s = spec();
    let (arena, _id) = make_arena("img", &[("src", "photo.jpg"), ("alt", "A photo")]);
    let rule = RequireAccessibleName;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty());
}

#[test]
fn aria_version_option() {
    // With ariaVersion: "1.1", the rule should still work
    let s = spec();
    let (arena, _id) = make_arena("input", &[("type", "text")]);
    let rule = RequireAccessibleName;
    let config = RuleConfig {
        options: serde_json::json!({ "ariaVersion": "1.1" }),
        ..Default::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert_eq!(
        violations.len(),
        1,
        "ariaVersion 1.1 should still require accessible name for input[type=text]"
    );
}

#[test]
fn hidden_element_skipped() {
    // <input type="hidden"> is not exposed
    let s = spec();
    let (arena, _id) = make_arena("input", &[("type", "hidden")]);
    let rule = RequireAccessibleName;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty());
}

// ============================================================
// Pretenders. The TS tests other than `valid-009` use the JSX parser; these are the
// same scenarios with custom elements parsed as HTML (`<MyButton />` →
// `<x-button>`), expected values from the TS engine run on the HTML input.
// ============================================================

use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;

const REQUIRE: &str = "Require accessible name";

fn run(html: &str, pretenders: serde_json::Value) -> Vec<Brief> {
    lint_brief(
        "require-accessible-name",
        html,
        serde_json::json!({ "rules": { "require-accessible-name": true }, "pretenders": pretenders }),
    )
}

fn at(col: u32, raw: &str) -> Vec<Brief> {
    vec![brief(Severity::Error, 1, col, REQUIRE, raw)]
}

/// TS `[require-accessible-name-valid-009]`: the `as` attribute.
#[test]
fn require_accessible_name_valid_009() {
    const _ID: &str = "require-accessible-name-valid-009";
    let none = serde_json::json!([]);
    assert_eq!(
        run(r#"<x-button as="button"></x-button>"#, none.clone()),
        at(1, r#"<x-button as="button">"#)
    );
    assert_eq!(run(r#"<x-button as="button">Name</x-button>"#, none.clone()), []);
    assert_eq!(
        run(r#"<x-image as="img"></x-image>"#, none.clone()),
        at(1, r#"<x-image as="img">"#)
    );
    assert_eq!(run(r#"<x-image as="img" alt=""></x-image>"#, none.clone()), []);
    assert_eq!(run(r#"<x-image as="img" alt="Name"></x-image>"#, none), []);
}

/// TS `[require-accessible-name-invalid-013]`: a pretended child names its parent by
/// its `alt` and by the pretender's `aria.name`.
#[test]
fn v6_require_accessible_name_001() {
    let img = |extra: serde_json::Value| {
        let mut as_ = serde_json::json!({ "element": "img" });
        as_.as_object_mut().unwrap().extend(extra.as_object().unwrap().clone());
        serde_json::json!([{ "selector": "x-c", "as": as_ }])
    };
    let html = "<button><x-c></x-c></button>";
    assert_eq!(run(html, img(serde_json::json!({}))), at(1, "<button>"));
    assert_eq!(
        run(
            html,
            img(serde_json::json!({ "attrs": [{ "name": "alt", "value": "some text" }] }))
        ),
        []
    );
    assert_eq!(
        run(
            html,
            img(serde_json::json!({ "attrs": [{ "name": "alt", "value": "" }] }))
        ),
        at(1, "<button>")
    );
    assert_eq!(run(html, img(serde_json::json!({ "aria": { "name": true } }))), []);
    let from_label = img(serde_json::json!({ "aria": { "name": { "fromAttr": "label" } } }));
    assert_eq!(
        run(r#"<button><x-c label="accname"></x-c></button>"#, from_label.clone()),
        []
    );
    assert_eq!(
        run(r#"<button><x-c label=""></x-c></button>"#, from_label),
        at(1, "<button>")
    );
}

/// TS `[require-accessible-name-issue-2394]`: `nodeRules` match a pretended element by
/// its pretender name and by its own.
#[test]
fn v6_require_accessible_name_002() {
    let html = r#"<x-c href="https://markuplint.dev/"></x-c>"#;
    let raw = r#"<x-c href="https://markuplint.dev/">"#;
    let config = |node_rules: serde_json::Value| {
        serde_json::json!({
            "rules": { "require-accessible-name": true },
            "nodeRules": node_rules,
            "pretenders": [{ "selector": "x-c", "as": { "element": "a", "inheritAttrs": true } }]
        })
    };
    let lint = |node_rules| lint_brief("require-accessible-name", html, config(node_rules));
    assert_eq!(lint(serde_json::json!([])), at(1, raw));
    assert_eq!(
        lint(serde_json::json!([{ "selector": "a", "rules": { "require-accessible-name": false } }])),
        []
    );
    assert_eq!(
        lint(serde_json::json!([{ "selector": "x-c", "rules": { "require-accessible-name": true } }])),
        at(1, raw)
    );
    assert_eq!(
        lint(serde_json::json!([{ "selector": "x-c", "rules": { "require-accessible-name": false } }])),
        []
    );
}

fn dynamic_span(selector: &str, inherit: bool) -> serde_json::Value {
    serde_json::json!({ "selector": selector, "as": { "element": "span", "inheritAttrs": inherit, "contents": [{ "dynamic": true }] } })
}

/// TS `[require-accessible-name-issue-4069-001]`: the unknown content of the component
/// may be its name.
#[test]
fn v6_require_accessible_name_003() {
    assert_eq!(
        run(
            r#"<x-button label="Save"></x-button>"#,
            serde_json::json!([{ "selector": "x-button", "as": { "element": "button", "contents": [{ "dynamic": true }] } }])
        ),
        []
    );
}

/// TS `[require-accessible-name-issue-4069-002]`: a static content is still reported.
#[test]
fn v6_require_accessible_name_004() {
    assert_eq!(
        run(
            "<x-button></x-button>",
            serde_json::json!([{ "selector": "x-button", "as": { "element": "button", "contents": [{ "element": "span" }] } }])
        ),
        at(1, "<x-button>")
    );
}

/// TS `[require-accessible-name-issue-4069-003]`: a static name beside the unknown
/// content is still used.
#[test]
fn v6_require_accessible_name_005() {
    assert_eq!(
        run(
            "<x-button></x-button>",
            serde_json::json!([{ "selector": "x-button", "as": {
                "element": "button",
                "contents": [{ "element": "span" }, { "dynamic": true }],
                "attrs": [{ "name": "aria-label", "value": "Save" }]
            } }])
        ),
        []
    );
}

/// TS `[require-accessible-name-issue-4069-004]`: the unknown content of a single slot
/// wrapper may be the name.
#[test]
fn v6_require_accessible_name_006() {
    assert_eq!(
        run(
            "<x-button></x-button>",
            serde_json::json!([{ "selector": "x-button", "as": {
                "element": "button", "slots": [{ "element": "span", "contents": [{ "dynamic": true }] }]
            } }])
        ),
        []
    );
}

/// TS `[require-accessible-name-issue-4069-005]`: the unknown content of a pretended
/// child may be the name.
#[test]
fn v6_require_accessible_name_007() {
    assert_eq!(
        run(
            r#"<button><x-label text="Save"></x-label></button>"#,
            serde_json::json!([dynamic_span("x-label", false)])
        ),
        []
    );
}

/// TS `[require-accessible-name-issue-4069-006]`: the unknown content of a pretended
/// child placed in the contents may be the name.
#[test]
fn v6_require_accessible_name_008() {
    assert_eq!(
        run(
            r#"<x-button><x-label text="Save"></x-label></x-button>"#,
            serde_json::json!([
                { "selector": "x-button", "as": { "element": "button", "contents": [{ "element": "span" }, { "slot": true }] } },
                dynamic_span("x-label", false)
            ])
        ),
        []
    );
}

/// TS `[require-accessible-name-issue-4069-007]`: the unknown content of a pretended
/// child of the owned label may be the name.
#[test]
fn v6_require_accessible_name_009() {
    assert_eq!(
        run(
            r#"<label><x-label text="Name"></x-label><input></label>"#,
            serde_json::json!([dynamic_span("x-label", false)])
        ),
        []
    );
}

/// TS `[require-accessible-name-issue-4069-008]`: the unknown content of one of several
/// slot wrappers may be the name.
#[test]
fn v6_require_accessible_name_010() {
    assert_eq!(
        run(
            "<x-button></x-button>",
            serde_json::json!([{ "selector": "x-button", "as": { "element": "button", "slots": [
                { "element": "span", "contents": [{ "slot": true }] },
                { "element": "span", "contents": [{ "dynamic": true }] }
            ] } }])
        ),
        []
    );
}

/// TS `[require-accessible-name-issue-4069-009]`: a hidden pretended child is not read by
/// the name computation and is still reported.
#[test]
fn v6_require_accessible_name_011() {
    assert_eq!(
        run(
            r#"<button><x-icon aria-hidden="true"></x-icon></button>"#,
            serde_json::json!([dynamic_span("x-icon", true)])
        ),
        at(1, "<button>")
    );
}

/// TS `[require-accessible-name-issue-4069-010]`: the unknown content of the element
/// `aria-labelledby` refers to may be the name.
#[test]
fn v6_require_accessible_name_012() {
    assert_eq!(
        run(
            r#"<div><button aria-labelledby="label1"></button><x-label id="label1" text="Save"></x-label></div>"#,
            serde_json::json!([dynamic_span("x-label", true)])
        ),
        []
    );
}

/// TS `[require-accessible-name-issue-4069-011]`: a pretended child with a static content
/// is still reported.
#[test]
fn v6_require_accessible_name_013() {
    assert_eq!(
        run(
            "<button><x-icon></x-icon></button>",
            serde_json::json!([{ "selector": "x-icon", "as": { "element": "span", "contents": [{ "element": "svg" }] } }])
        ),
        at(1, "<button>")
    );
}

/// TS `[require-accessible-name-issue-4069-012]`: a pretended child with the `hidden`
/// attribute is not read by the name computation and is still reported.
#[test]
fn v6_require_accessible_name_014() {
    assert_eq!(
        run(
            "<button><x-icon hidden></x-icon></button>",
            serde_json::json!([dynamic_span("x-icon", true)])
        ),
        at(1, "<button>")
    );
}

/// TS `[require-accessible-name-issue-4069-013]`: `aria-labelledby` with a missing id and
/// a reference to unknown content is not reported.
#[test]
fn v6_require_accessible_name_015() {
    assert_eq!(
        run(
            r#"<div><button aria-labelledby="  missing   label1 "></button><x-label id="label1" text="Save"></x-label></div>"#,
            serde_json::json!([dynamic_span("x-label", true)])
        ),
        []
    );
}

/// TS `[require-accessible-name-issue-4069-014]`: `aria-labelledby` referring only to
/// static content is still reported.
#[test]
fn v6_require_accessible_name_016() {
    assert_eq!(
        run(
            r#"<div><button aria-labelledby="label1"></button><x-label id="label1"></x-label></div>"#,
            serde_json::json!([{ "selector": "x-label", "as": { "element": "span", "inheritAttrs": true, "contents": [{ "element": "svg" }] } }])
        ),
        at(6, r#"<button aria-labelledby="label1">"#)
    );
}

/// TS `[require-accessible-name-issue-4069-015]`: the unknown content of a pretended
/// child of the label referred to by `for` may be the name.
#[test]
fn v6_require_accessible_name_017() {
    assert_eq!(
        run(
            r#"<div><label for="input1"><x-label text="Name"></x-label></label><input id="input1"></div>"#,
            serde_json::json!([dynamic_span("x-label", false)])
        ),
        []
    );
}
