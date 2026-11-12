//! The boundary of a tree, which the selector engine reads through `markuplint_dom::tree`. The tests are here, not in `markuplint-dom`, because they parse HTML, which that crate does only behind its optional `html-parser` feature.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::tree::{descendant_elements, tree_parent_element};

use crate::test_util::{html_arena, spec};

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
