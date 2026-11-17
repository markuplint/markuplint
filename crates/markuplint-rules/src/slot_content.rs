//! What the rules read of a pretended component's slot content — the Rust
//! counterpart of `packages/@markuplint/rules/src/permitted-contents/slot-content.ts`,
//! which `permitted-contents` and `require-owned-elements` share so that both read a
//! pretended component the same way.
//!
//! TS threads a `mode` through these helpers; only its `'pretended'` mode is
//! ported (the `'origin'` mode evaluates user tag rules keyed on the component name,
//! which the Rust `permitted-contents` does not accept), so the mode is implicit.

use markuplint_core::mlast::SlotTarget;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
use markuplint_dom::pretender::SlotContent;
use markuplint_dom::tree::is_rendered_away;

/// TS `getSlotContent`.
pub(crate) fn slot_content(arena: &DomArena, id: NodeId) -> Option<&SlotContent> {
    arena.get(id)?.as_element()?.pretended()?.slot_content.as_ref()
}

/// TS `getContentOwner`: the element whose content model governs the children of
/// `id` — the single slot wrapper of its pretender, or `id` itself.
pub(crate) fn content_owner(arena: &DomArena, id: NodeId) -> NodeId {
    match slot_content(arena, id).and_then(|content| content.wrapper) {
        Some(wrapper) if wrapper != id => wrapper,
        _ => id,
    }
}

/// TS `expandChildren`: the children of `id` to validate — the nodes `given` at the
/// usage site, passed through the pretender's `contents`, with the children of a
/// fragment pretender (`element: '#fragment'`) expanded in place, since such a
/// component contributes its contents directly to its parent.
pub(crate) fn expand_children(arena: &DomArena, id: NodeId, given: Vec<NodeId>) -> Vec<NodeId> {
    // What the component renders is what it is given, as the pretender says (`slots` or not)
    let given = if is_pretended(arena, id) {
        expand_default_slot_templates(arena, &given)
    } else {
        given
    };
    let children = match slot_content(arena, id) {
        Some(content) => content.fill(&given),
        None => given,
    };
    children
        .into_iter()
        .flat_map(|child| {
            if is_fragment_pretender(arena, child) {
                expand_children(arena, child, arena.pure_children_of(child))
            } else {
                vec![child]
            }
        })
        .collect()
}

/// Whether the element is a component that a pretender stands for (TS `el.pretenderContext`).
pub(crate) fn is_pretended(arena: &DomArena, id: NodeId) -> bool {
    arena
        .get(id)
        .and_then(DomNode::as_element)
        .is_some_and(|el| el.pretended().is_some())
}

/// TS `expandDefaultSlotTemplates`: replaces a `<template v-slot>` that passes its children to the default
/// slot (`#default`, `v-slot`) with those children. The component renders the children that it is given, and
/// the `template` is not one of them: Vue renders it away. A `template` for any other slot is placed where the
/// component says, which is not known from the markup, so it stays (`may_render_unknown_children`); so does
/// one that also has `v-if`, which is a conditional branch.
///
/// @see <https://vuejs.org/guide/components/slots.html#named-slots>
pub(crate) fn expand_default_slot_templates(arena: &DomArena, given: &[NodeId]) -> Vec<NodeId> {
    given
        .iter()
        .flat_map(|&child| match arena.get(child) {
            Some(DomNode::Element(el))
                if is_rendered_away(el)
                    && el.slot_target == Some(SlotTarget::Default)
                    && el.block_behavior.is_none() =>
            {
                expand_default_slot_templates(arena, &arena.child_nodes(child))
            }
            _ => vec![child],
        })
        .collect()
}

/// TS `isContentMutable`: whether a required child of `id` may be rendered by
/// something the pretender does not know — an unknown entry in its own `contents`,
/// or in those of a fragment pretender among its children.
pub(crate) fn is_content_mutable(arena: &DomArena, id: NodeId) -> bool {
    if slot_content(arena, id).is_some_and(|content| content.mutable) {
        return true;
    }
    arena
        .children_of(id)
        .unwrap_or_default()
        .iter()
        .any(|&child| is_fragment_pretender(arena, child) && is_content_mutable(arena, child))
}

pub(crate) fn is_fragment_pretender(arena: &DomArena, id: NodeId) -> bool {
    arena
        .get(id)
        .and_then(DomNode::as_element)
        .is_some_and(|el| el.pretended().is_some() && el.base.node_name == "#fragment")
}
