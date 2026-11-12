//! Rust-only tests: the TS `getComputedAriaProps` has no spec of its own. Its results are fixed against
//! the TS engine by `packages/markuplint/src/api/ml-engine.rust-accessibility.spec.ts`, which reads them
//! through the hover of the language server.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::ARIAAttributeValue;

use super::{AriaPropSource, ComputedAriaProp, get_computed_aria_props};
use crate::test_util::{html_arena, spec};

fn element(arena: &DomArena, name: &str) -> NodeId {
    arena
        .elements()
        .find(|(_, el)| el.base.node_name.eq_ignore_ascii_case(name))
        .map(|(id, _)| id)
        .unwrap()
}

fn props(html: &str, name: &str) -> Vec<ComputedAriaProp> {
    let arena = html_arena(html);
    let id = element(&arena, name);
    get_computed_aria_props(&spec(), &arena, id, ARIAVersion::RECOMMENDED)
}

fn find<'a>(props: &'a [ComputedAriaProp], name: &str) -> &'a ComputedAriaProp {
    props
        .iter()
        .find(|prop| prop.name == name)
        .unwrap_or_else(|| panic!("no {name} in {:?}", props.iter().map(|p| &p.name).collect::<Vec<_>>()))
}

#[test]
fn v6_computed_props_aria_attr_is_read() {
    let list = props(r#"<button aria-pressed="true">b</button>"#, "button");
    let pressed = find(&list, "aria-pressed");
    assert_eq!(pressed.value.as_deref(), Some("true"));
    assert_eq!(pressed.from, AriaPropSource::AriaAttr);
}

#[test]
fn v6_computed_props_invalid_aria_attr_falls_back_to_default() {
    let list = props(r#"<button aria-pressed="nope">b</button>"#, "button");
    let pressed = find(&list, "aria-pressed");
    assert_eq!(pressed.from, AriaPropSource::Default);
    assert_ne!(pressed.value.as_deref(), Some("nope"));
}

#[test]
fn v6_computed_props_empty_aria_attr_falls_back_to_default() {
    let list = props(r#"<button aria-pressed="">b</button>"#, "button");
    assert_eq!(find(&list, "aria-pressed").from, AriaPropSource::Default);
}

#[test]
fn v6_computed_props_heading_level_is_the_number_of_the_element() {
    let list = props("<h3>t</h3>", "h3");
    let level = find(&list, "aria-level");
    assert_eq!(level.value.as_deref(), Some("3"));
    assert_eq!(level.from, AriaPropSource::Default);
}

#[test]
fn v6_computed_props_aria_level_beats_the_number_of_the_element() {
    let list = props(r#"<h3 aria-level="5">t</h3>"#, "h3");
    let level = find(&list, "aria-level");
    assert_eq!(level.value.as_deref(), Some("5"));
    assert_eq!(level.from, AriaPropSource::AriaAttr);
}

#[test]
fn v6_computed_props_equivalent_html_attr_is_read() {
    let list = props(r#"<input type="checkbox" checked>"#, "input");
    let checked = find(&list, "aria-checked");
    assert_eq!(checked.from, AriaPropSource::HtmlAttr);
    assert_eq!(checked.value.as_deref(), Some("true"));
}

#[test]
fn v6_computed_props_required_is_the_one_of_the_role() {
    let list = props(r#"<div role="checkbox"></div>"#, "div");
    let checked = find(&list, "aria-checked");
    assert!(checked.required);
    assert_eq!(checked.value.as_deref(), Some("undefined"));
}

#[test]
fn v6_computed_props_no_role_has_none() {
    // `<script>` has no role
    assert!(props("<script></script>", "script").is_empty());
}

#[test]
fn v6_computed_props_token_properties_list_their_tokens() {
    // TS `isValidAriaValue` throws for a token property without tokens; the data never has one.
    let spec = spec();
    for version in [ARIAVersion::V1_1, ARIAVersion::V1_2, ARIAVersion::V1_3] {
        for prop in &markuplint_types::spec::aria::get_aria_spec(&spec, version).props {
            if matches!(prop.value, ARIAAttributeValue::Token | ARIAAttributeValue::TokenList) {
                assert!(!prop.enum_values.is_empty(), "{} has no tokens", prop.name);
            }
            for conditional in prop.conditional_value.iter().flatten() {
                if matches!(
                    conditional.value,
                    ARIAAttributeValue::Token | ARIAAttributeValue::TokenList
                ) {
                    assert!(!prop.enum_values.is_empty(), "{} has no tokens", prop.name);
                }
            }
        }
    }
}
