//! Tests for the flat tree, with no TS counterpart of the same shape (the TS specs are
//! `element-slot-assignment.spec.ts` and `tree-boundary.spec.ts`, which the parity run of the rules
//! covers through the rules that read it).
//!
//! Test ID mapping (TS → Rust):
//!   v6_slot_assignment_NNN — Rust-only

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::get_attr_value_from_el;
use markuplint_dom::node::DomNode;

use super::{
    FlatTreeSlot, accessibility_parent_element, composed_parent_element, get_assigned_nodes, get_flat_tree_slot,
    get_flattened_slottables, is_not_rendered,
};
use crate::test_util::{html_arena, spec};

/// The element whose `id` is `id`.
fn by_id(arena: &DomArena, id: &str) -> NodeId {
    arena
        .elements()
        .find(|(_, el)| get_attr_value_from_el(el, "id") == Some(id))
        .map(|(node_id, _)| node_id)
        .unwrap()
}

/// The `id`s of the elements among the nodes (a text node is `#text`).
fn names(arena: &DomArena, nodes: &[NodeId]) -> Vec<String> {
    nodes
        .iter()
        .map(|&node| match arena.get(node) {
            Some(DomNode::Element(el)) => get_attr_value_from_el(el, "id").unwrap_or("?").to_owned(),
            _ => "#text".to_owned(),
        })
        .collect()
}

#[test]
fn v6_slot_assignment_001() {
    let arena = html_arena(
        r#"<x-a><template shadowrootmode="open"><slot id="named" name="a"></slot><slot id="default"></slot></template><b id="b" slot="a"></b><i id="i"></i>text</x-a>"#,
    );
    let spec = spec();
    assert_eq!(
        names(
            &arena,
            &get_assigned_nodes(&arena, &spec, by_id(&arena, "named")).unwrap()
        ),
        ["b"]
    );
    assert_eq!(
        names(
            &arena,
            &get_assigned_nodes(&arena, &spec, by_id(&arena, "default")).unwrap()
        ),
        ["i", "#text"]
    );
    assert_eq!(
        get_flat_tree_slot(&arena, &spec, by_id(&arena, "b")),
        FlatTreeSlot::Slot(by_id(&arena, "named"))
    );
}

#[test]
fn v6_slot_assignment_002() {
    // No slot takes it: it is not rendered, and a walk ends there
    let arena = html_arena(
        r#"<x-a id="host"><template shadowrootmode="open"><slot name="a"></slot></template><b id="b" slot="z"></b></x-a>"#,
    );
    let spec = spec();
    let b = by_id(&arena, "b");
    assert_eq!(get_flat_tree_slot(&arena, &spec, b), FlatTreeSlot::NotRendered);
    assert!(is_not_rendered(&arena, &spec, b));
    assert_eq!(composed_parent_element(&arena, &spec, b), None);
}

#[test]
fn v6_slot_assignment_003() {
    // A slot that is not in a shadow root has no assignment
    let arena = html_arena(r#"<div><slot id="s"></slot></div>"#);
    assert_eq!(get_assigned_nodes(&arena, &spec(), by_id(&arena, "s")), None);
}

#[test]
fn v6_slot_assignment_004() {
    // Manual assignment is decided by a script
    let arena = html_arena(
        r#"<x-a><template shadowrootmode="open" shadowrootslotassignment="manual"><slot id="s"></slot></template><b id="b"></b></x-a>"#,
    );
    let spec = spec();
    assert_eq!(get_assigned_nodes(&arena, &spec, by_id(&arena, "s")), None);
    assert_eq!(
        get_flat_tree_slot(&arena, &spec, by_id(&arena, "b")),
        FlatTreeSlot::Unknown
    );
}

#[test]
fn v6_slot_assignment_005() {
    // The top of a shadow root is in its host, and the top of an ordinary template is in no place
    let arena = html_arena(
        r#"<x-a id="host"><template shadowrootmode="open"><p id="top"></p></template></x-a><template><p id="inert"></p></template>"#,
    );
    let spec = spec();
    assert_eq!(
        composed_parent_element(&arena, &spec, by_id(&arena, "top")),
        Some(by_id(&arena, "host"))
    );
    assert_eq!(composed_parent_element(&arena, &spec, by_id(&arena, "inert")), None);
}

#[test]
fn v6_slot_assignment_006() {
    // The accessibility tree has no `slot`: the walk passes through it
    let arena = html_arena(
        r#"<div id="host"><template shadowrootmode="open"><slot id="s"></slot></template><p id="li"></p></div>"#,
    );
    let spec = spec();
    let li = by_id(&arena, "li");
    assert_eq!(composed_parent_element(&arena, &spec, li), Some(by_id(&arena, "s")));
    assert_eq!(
        accessibility_parent_element(&arena, &spec, li),
        Some(by_id(&arena, "host"))
    );
}

#[test]
fn v6_slot_assignment_007() {
    // A slot that takes none renders its own children
    let arena = html_arena(
        r#"<x-a><template shadowrootmode="open"><slot id="s"><u id="fallback"></u></slot></template></x-a>"#,
    );
    let spec = spec();
    let slot = by_id(&arena, "s");
    assert_eq!(get_assigned_nodes(&arena, &spec, slot), Some(vec![]));
    assert_eq!(
        names(&arena, &get_flattened_slottables(&arena, &spec, slot)),
        ["fallback"]
    );
}

#[test]
fn v6_slot_assignment_008() {
    // The slot of a nested shadow root belongs to the inner one
    let arena = html_arena(
        r#"<x-a><template shadowrootmode="open"><x-b><template shadowrootmode="open"><slot id="inner"></slot></template><slot id="outer"></slot></x-b></template><i id="i"></i></x-a>"#,
    );
    let spec = spec();
    // The outer slot is a light child of x-b, assigned to the inner slot; `i` is taken by the outer slot
    assert_eq!(
        get_flat_tree_slot(&arena, &spec, by_id(&arena, "i")),
        FlatTreeSlot::Slot(by_id(&arena, "outer"))
    );
    assert_eq!(
        get_flat_tree_slot(&arena, &spec, by_id(&arena, "outer")),
        FlatTreeSlot::Slot(by_id(&arena, "inner"))
    );
    assert_eq!(
        names(&arena, &get_flattened_slottables(&arena, &spec, by_id(&arena, "inner"))),
        ["i"]
    );
}
