//! Rust-only tests of `accessibility_at`: the TS `getAccessibilityProp` has no spec of its own that
//! reads a position. The results are fixed against the TS engine by
//! `packages/markuplint/src/api/ml-engine.rust-accessibility.spec.ts`.

use markuplint_types::spec::aria::ARIAVersion;
use serde_json::json;

use super::{InspectedAccessibility, InspectedName, accessibility_at};
use crate::lint::LintConfig;
use crate::test_util::{html_arena, spec};

fn aria_at(html: &str, line: u32, col: u32) -> Option<InspectedAccessibility> {
    let config: LintConfig = serde_json::from_value(json!({})).unwrap();
    accessibility_at(&html_arena(html), &spec(), &config, line, col, ARIAVersion::RECOMMENDED)
}

#[test]
fn v6_accessibility_at_reads_role_name_focusable_and_props() {
    let found = aria_at(r#"<button aria-pressed="true">b</button>"#, 1, 1).unwrap();
    assert_eq!(found.node_name, "button");
    assert_eq!(found.aria.exposed_to_tree, Some(true));
    assert_eq!(found.aria.role.as_deref(), Some("button"));
    assert_eq!(found.aria.name, Some(InspectedName::Text("b".to_owned())));
    assert_eq!(found.aria.focusable, Some(true));
    let props = found.aria.props.unwrap();
    let pressed = props.iter().find(|prop| prop.name == "pressed").unwrap();
    assert_eq!(pressed.value.as_deref(), Some("true"));
    assert!(!pressed.required);
}

#[test]
fn v6_accessibility_at_leaves_out_default_props_that_are_not_required() {
    let found = aria_at("<button>b</button>", 1, 1).unwrap();
    assert_eq!(found.aria.props, None);
}

#[test]
fn v6_accessibility_at_keeps_required_props_with_their_default() {
    let found = aria_at(r#"<div role="checkbox"></div>"#, 1, 1).unwrap();
    let props = found.aria.props.unwrap();
    let checked = props.iter().find(|prop| prop.name == "checked").unwrap();
    assert_eq!(checked.value.as_deref(), Some("undefined"));
    assert!(checked.required);
}

#[test]
fn v6_accessibility_at_hidden_element_is_not_exposed() {
    let found = aria_at("<div hidden>x</div>", 1, 1).unwrap();
    assert_eq!(found.aria.exposed_to_tree, Some(false));
    assert_eq!(found.aria.role, None);
    assert_eq!(found.aria.name, None);
}

#[test]
fn v6_accessibility_at_slot_is_unknown() {
    let found = aria_at("<slot></slot>", 1, 1).unwrap();
    assert!(found.aria.unknown);
    assert_eq!(found.aria.exposed_to_tree, None);
}

#[test]
fn v6_accessibility_at_name_is_unknown_with_a_slot_that_places_nothing_known() {
    let found = aria_at("<div><slot></slot></div>", 1, 1).unwrap();
    assert_eq!(found.aria.name, Some(InspectedName::Unknown { unknown: true }));
}

#[test]
fn v6_accessibility_at_ignores_a_slot_in_the_content_of_an_ordinary_template() {
    let found = aria_at("<div><template><slot></slot></template></div>", 1, 1).unwrap();
    assert_eq!(found.aria.name, Some(InspectedName::Text(String::new())));
}

#[test]
fn v6_accessibility_at_is_none_where_the_node_is_not_an_element_or_there_is_none() {
    // `<p>` is columns 1-4, the text starts at column 4
    assert_eq!(aria_at("<p>text</p>", 1, 5), None);
    assert_eq!(aria_at("<p>text</p>", 9, 1), None);
}

#[test]
fn v6_accessibility_at_serializes_as_the_ts_shape() {
    let found = aria_at("<h2>t</h2>", 1, 1).unwrap();
    let value = serde_json::to_value(&found).unwrap();
    assert_eq!(value["nodeName"], "h2");
    assert_eq!(value["aria"]["unknown"], false);
    assert_eq!(value["aria"]["exposedToTree"], true);
    assert_eq!(value["aria"]["role"], "heading");
    assert_eq!(value["aria"]["nameRequired"], true);
    assert_eq!(value["aria"]["name"], "t");
    assert_eq!(value["aria"]["props"][0]["name"], "level");
    assert_eq!(value["aria"]["props"][0]["value"], "2");
}
