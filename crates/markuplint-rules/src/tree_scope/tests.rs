//! The boundary of a tree, which the selector engine reads through `markuplint_dom::tree`. The tests are here, not in `markuplint-dom`, because they parse HTML, which that crate does only behind its optional `html-parser` feature.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::tree::{descendant_elements, tree_parent_element};

use crate::test_util::{html_arena, insert_spread_attr, make_id_dynamic, spec};
use crate::tree_scope::{has_element_of_unknown_id, is_unknown_value_attr};

/// The first element of the arena with this local name.
fn element(arena: &DomArena, name: &str) -> NodeId {
    arena
        .elements()
        .find(|(_, el)| el.base.node_name.eq_ignore_ascii_case(name))
        .map(|(id, _)| id)
        .unwrap_or_else(|| panic!("no <{name}>"))
}

fn names(arena: &DomArena, ids: &[NodeId]) -> Vec<String> {
    ids.iter()
        .filter_map(|&id| arena.get(id).and_then(|node| node.as_element()))
        .map(|el| el.base.node_name.to_ascii_lowercase())
        .collect()
}

#[test]
fn v6_tree_parent_element_is_the_parent_element() {
    let arena = html_arena("<section><div><p></p></div></section>");
    let spec = spec();
    assert_eq!(
        tree_parent_element(&arena, Some(&spec), element(&arena, "p")),
        Some(element(&arena, "div"))
    );
    assert_eq!(
        tree_parent_element(&arena, Some(&spec), element(&arena, "section")),
        None
    );
}

#[test]
fn v6_tree_parent_element_stops_at_the_top_of_the_content_of_a_template() {
    let arena = html_arena("<section><template><p></p></template></section>");
    let spec = spec();
    assert_eq!(tree_parent_element(&arena, Some(&spec), element(&arena, "p")), None);
    // The `template` element itself is in the tree of the `section`.
    assert_eq!(
        tree_parent_element(&arena, Some(&spec), element(&arena, "template")),
        Some(element(&arena, "section"))
    );
}

#[test]
fn v6_tree_parent_element_is_none_for_a_template_in_no_tree() {
    let arena = html_arena("<div><template shadowrootmode=\"open\"><p></p></template></div>");
    let spec = spec();
    assert_eq!(
        tree_parent_element(&arena, Some(&spec), element(&arena, "template")),
        None
    );
    assert_eq!(tree_parent_element(&arena, Some(&spec), element(&arena, "p")), None);
}

#[test]
fn v6_tree_parent_element_stops_at_a_template_without_a_spec() {
    let arena = html_arena("<section><template><p></p></template></section>");
    assert_eq!(tree_parent_element(&arena, None, element(&arena, "p")), None);
}

#[test]
fn v6_descendant_elements_do_not_enter_the_content_of_a_template() {
    let arena = html_arena("<section><b></b><template><p></p></template><i><u></u></i></section>");
    let spec = spec();
    assert_eq!(
        names(
            &arena,
            &descendant_elements(&arena, Some(&spec), element(&arena, "section"))
        ),
        ["b", "template", "i", "u"]
    );
    assert!(descendant_elements(&arena, Some(&spec), element(&arena, "template")).is_empty());
}

/// TS `hasElementOfUnknownId`: the tree has an element whose `id` is not known until it is rendered.
#[test]
fn v6_has_element_of_unknown_id_is_true_for_every_element_of_the_tree() {
    let mut arena = html_arena("<h2 id=\"x\"></h2><p></p>");
    let spec = spec();
    assert!(!has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));
    make_id_dynamic(&mut arena, "x");
    assert!(has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));
    assert!(has_element_of_unknown_id(&arena, &spec, element(&arena, "h2")));
}

/// TS `hasElementOfUnknownId`: the content of a `template` element is a tree of its own.
#[test]
fn v6_has_element_of_unknown_id_is_per_tree() {
    let mut arena = html_arena("<div><template><h2 id=\"x\"></h2><p></p></template></div><b></b>");
    let spec = spec();
    make_id_dynamic(&mut arena, "x");
    assert!(has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));
    assert!(has_element_of_unknown_id(&arena, &spec, element(&arena, "h2")));
    assert!(!has_element_of_unknown_id(&arena, &spec, element(&arena, "b")));
    assert!(!has_element_of_unknown_id(&arena, &spec, element(&arena, "div")));
    assert!(!has_element_of_unknown_id(&arena, &spec, element(&arena, "template")));

    let mut arena = html_arena("<h2 id=\"x\"></h2><div><template><p></p></template></div>");
    make_id_dynamic(&mut arena, "x");
    assert!(has_element_of_unknown_id(&arena, &spec, element(&arena, "div")));
    assert!(!has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));
}

/// TS `hasElementOfUnknownId` is false for an element that is in no tree: a `template` element that a declarative
/// shadow root is attached to is its own root, which is not a document or a document fragment.
#[test]
fn v6_has_element_of_unknown_id_is_false_for_an_element_in_no_tree() {
    let mut arena = html_arena("<h2 id=\"x\"></h2><div><template shadowrootmode=\"open\"></template></div>");
    let spec = spec();
    make_id_dynamic(&mut arena, "x");
    assert!(has_element_of_unknown_id(&arena, &spec, element(&arena, "div")));
    assert!(!has_element_of_unknown_id(&arena, &spec, element(&arena, "template")));
}

/// TS `isUnknownValueAttr`: an attribute that is there and whose value is not known.
#[test]
fn v6_is_unknown_value_attr_needs_an_attribute() {
    let mut arena = html_arena("<h2 id=\"x\" title=\"t\"></h2>");
    make_id_dynamic(&mut arena, "x");
    let (_, el) = arena.elements().next().unwrap();
    assert!(is_unknown_value_attr(markuplint_dom::helpers::get_attr_node_from_el(
        el, "id"
    )));
    assert!(!is_unknown_value_attr(markuplint_dom::helpers::get_attr_node_from_el(
        el, "title"
    )));
    assert!(!is_unknown_value_attr(None));
}

/// Sets what `set` does on the attribute `name` of the element.
fn set_attr(arena: &mut DomArena, el: NodeId, name: &str, set: impl Fn(&mut markuplint_core::mlast::MLASTHTMLAttr)) {
    for attr in &mut arena.element_mut(el).unwrap().attributes {
        if let markuplint_core::mlast::MLASTAttr::HTMLAttr(html_attr) = attr
            && markuplint_dom::helpers::attr_name(html_attr) == name
        {
            set(html_attr);
        }
    }
}

/// TS `mayBringUnknownId` (`helper/unknown-id.ts` of `ml-core`): a spread after the last `id`, or on an element
/// without an `id`, may carry the id; one before the `id` is overridden by it.
#[test]
fn v6_has_element_of_unknown_id_reads_where_a_spread_is() {
    let spec = spec();

    let mut arena = html_arena("<h2></h2><p></p>");
    let h2 = element(&arena, "h2");
    insert_spread_attr(&mut arena, h2, 0);
    assert!(has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));

    let mut arena = html_arena("<h2 id=\"a\"></h2><p></p>");
    let h2 = element(&arena, "h2");
    insert_spread_attr(&mut arena, h2, 1);
    assert!(has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));

    let mut arena = html_arena("<h2 id=\"a\"></h2><p></p>");
    let h2 = element(&arena, "h2");
    insert_spread_attr(&mut arena, h2, 0);
    assert!(!has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));
}

/// TS `mayBringUnknownId`: a spread that overrides the attributes wherever they are written (`x-bind="obj"` of
/// Alpine.js, `MLAttr#spreadOverridesWritten`) may carry the id even before the `id`.
#[test]
fn v6_has_element_of_unknown_id_counts_a_spread_that_overrides_what_is_written() {
    let spec = spec();

    let mut arena = html_arena("<h2 x-bind=\"o\" id=\"a\"></h2><p></p>");
    let h2 = element(&arena, "h2");
    set_attr(&mut arena, h2, "x-bind", |attr| attr.is_spread = Some(true));
    assert!(!has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));

    let mut arena = html_arena("<h2 x-bind=\"o\" id=\"a\"></h2><p></p>");
    set_attr(&mut arena, h2, "x-bind", |attr| {
        attr.is_spread = Some(true);
        attr.spread_overrides_written = Some(true);
    });
    assert!(has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));
}

/// TS `mayBringUnknownId`: an attribute that replaces the children with markup that the template does not show
/// (`MLAttr#isInnerHTML`), unless the framework does not output it.
#[test]
fn v6_has_element_of_unknown_id_counts_an_attribute_that_replaces_the_children() {
    let spec = spec();

    let arena = html_arena("<div v-html=\"h\"></div><p></p>");
    assert!(!has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));

    let mut arena = html_arena("<div v-html=\"h\"></div><p></p>");
    let div = element(&arena, "div");
    set_attr(&mut arena, div, "v-html", |attr| attr.is_inner_html = Some(true));
    assert!(has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));

    let mut arena = html_arena("<div v-html=\"h\"></div><p></p>");
    set_attr(&mut arena, div, "v-html", |attr| {
        attr.is_inner_html = Some(true);
        attr.is_absent = Some(true);
    });
    assert!(!has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));
}

/// TS `mayBringUnknownId`: a component that no pretender resolved, unless the language says that it renders what it
/// is given (`MLParser#isPassThroughComponent`).
#[test]
fn v6_has_element_of_unknown_id_counts_a_component_unless_it_passes_its_children_through() {
    let spec = spec();

    let mut arena = html_arena("<transition></transition><p></p>");
    let component = element(&arena, "transition");
    arena.element_mut(component).unwrap().element_type = markuplint_core::mlast::ElementType::Authored;
    assert!(has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));

    let mut arena = html_arena("<transition></transition><p></p>");
    let el = arena.element_mut(component).unwrap();
    el.element_type = markuplint_core::mlast::ElementType::Authored;
    el.is_pass_through_component = true;
    assert!(!has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));
}

/// TS `mayBringUnknownId`: the `slot` of a framework renders what the component is given; the HTML `slot` brings
/// none into its own tree.
#[test]
fn v6_has_element_of_unknown_id_counts_the_slot_of_a_framework() {
    let spec = spec();

    let arena = html_arena("<slot></slot><p></p>");
    assert!(!has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));

    let mut arena = html_arena("<slot></slot><p></p>");
    let mut settings = arena.settings();
    settings.slot_element = markuplint_core::mlast::SlotElement::Framework;
    arena.set_settings(settings);
    assert!(has_element_of_unknown_id(&arena, &spec, element(&arena, "p")));
}
