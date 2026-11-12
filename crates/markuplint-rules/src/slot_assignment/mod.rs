//! The flat tree of a document: the slot assignment of a declarative shadow root, and the parent
//! of an element as the accessibility tree is built from it. The Rust counterpart of
//! `slot-assignment.ts` of `ml-core` and of `tree-boundary.ts` of `ml-spec`.
//!
//! It sits next to [`crate::tree_scope`] (which tells whether a `template` attaches a shadow root)
//! and not in `markuplint-dom`, as it reads the spec to tell an HTML `template` element.
//!
//! The DOM assigns each slottable (an element or a text node that is a child of the shadow host) to
//! the first `slot` of the shadow root, in tree order, whose `name` is the `slot` attribute of the
//! slottable (`""` for a text node and for an element that has none), and what a `slot` renders is the
//! slottables assigned to it, or its own children when it has none. Only a slot of a shadow root
//! places the light children of that root's host, and the `slot` of a nested shadow root belongs to
//! the inner one.
//!
//! Each of the following leaves the assignment unknown, as markuplint does not decide what the markup
//! does not tell (a slot has no assigned nodes that a rule can rely on, and a node has no slot):
//!
//! - The `slot` is not the HTML element: the placeholder of a framework's component
//!   (`MLParser#slotElement`, [`SlotElement`])
//! - The slot is not in a shadow root: the content of an ordinary `template` element, where the markup
//!   does not tell where it is inserted, or the document
//! - The shadow root asks for manual assignment (`shadowrootslotassignment="manual"`), which a script
//!   decides with `HTMLSlotElement#assign()`
//! - A `name` or a `slot` attribute is written as code, or an element has a spread attribute that may
//!   set either of them
//! - The host has a child that renders what the markup does not tell: a block of a template language
//!   that has no behavior, or a component that no pretender resolved, whose output may carry any `slot`
//!   attribute
//! - A `slot` of the shadow root is in a block of a template language, so that whether it is rendered,
//!   and so which slot is the first of its name, is not known
//! - The `template` that declares the shadow root is not written right in the host, so that whether
//!   the shadow root is attached is not known
//!
//! An unknown assignment is `None`, never an empty list: a rule that must not report what it cannot
//! know asks [`get_assigned_nodes`] for it, and a slot with none assigned has its own children for what
//! it renders.
//!
//! The nodes in the branches of a conditional block are candidates, whichever of them is rendered: a
//! rendered one is a child of the host, which is what the assignment reads.
//!
//! The composed parent follows what the accessibility tree is built from: the flat tree. The content
//! of a shadow root is rendered in its host, so the elements above it are the host and the ancestors
//! of the host. The content of an ordinary `template` element is not rendered, and where it is
//! inserted is not known from the markup, so a walk ends at its top. A light child of a shadow host is
//! rendered where the `slot` that takes it is, so its parent is that `slot`; a child that no slot takes
//! is not rendered, so a walk ends there as well. Where the assignment is not known the walk goes to the
//! host as it does for any other child.
//!
//! Known limitation (as TS): a walk from the top of the shadow root goes to the host and does not model
//! where the `slot` sits in the shadow root, so the elements of the shadow root that are above the
//! `slot` are not between the host and a light child the `slot` takes. The fallback content of a slot
//! that takes nodes is not rendered either, and a walk from it still goes through the `slot`.
//!
//! @see <https://dom.spec.whatwg.org/#find-slotables>
//! @see <https://dom.spec.whatwg.org/#find-flattened-slotables>
//! @see <https://dom.spec.whatwg.org/#find-a-slot>
//! @see <https://dom.spec.whatwg.org/#dom-slot-assignednodes>
//! @see <https://html.spec.whatwg.org/multipage/scripting.html#the-template-element>

use std::collections::HashMap;
use std::sync::Arc;

use markuplint_core::mlast::{MLASTAttr, NamespaceURI, SlotElement};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::{get_attr_node_from_el, get_attr_value_from_el};
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::element_local_name;
use crate::helpers::{is_html_template_element, is_unresolved_component};
use crate::tree_scope::{
    ShadowRootAttachment, TreeRoot, declarative_shadow_root_attachment, dom_value, is_transparent, root_of,
    shadow_host, templates_of_host,
};

/// Which slot takes each slottable of a host, and which slottables each slot takes.
#[derive(Debug)]
struct SlotAssignment {
    /// The slottables each slot of the shadow root takes, in tree order; a slot that takes none has `[]`.
    slots: HashMap<NodeId, Vec<NodeId>>,
    /// The slot each slottable of the host is assigned to; `None` when no slot of the shadow root takes it.
    assigned: HashMap<NodeId, Option<NodeId>>,
}

/// What the flat tree says of the slot of a node (TS `getFlatTreeSlot`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FlatTreeSlot {
    /// The node is not a child of a shadow host, or the assignment is not known (`undefined`).
    Unknown,
    /// The node is a child of a shadow host that no slot of its shadow root takes, so it is not
    /// rendered (`null`).
    NotRendered,
    /// The slot that places the node.
    Slot(NodeId),
}

/// TS `isHTMLSlot`: whether the element is the HTML `slot` element, not the placeholder of a
/// framework's component (`MLParser#slotElement`, and what the parser of a framework turns into a
/// fragment).
fn is_html_slot(arena: &DomArena, el: &ElementData) -> bool {
    element_local_name(el) == "slot"
        && el.namespace == NamespaceURI::XHTML
        && !el.is_fragment
        && arena.settings().slot_element == SlotElement::Html
}

/// TS `getSlotName`: the string that the DOM has for an attribute that names a slot: `""` when it is
/// missing, `None` when it is written as code.
fn get_slot_name(el: &ElementData, name: &str) -> Option<String> {
    // An attribute that has no name node is a spread (`{...props}`), which may set it
    if el.attributes.iter().any(|attr| matches!(attr, MLASTAttr::Spread(_))) {
        return None;
    }
    match get_attr_node_from_el(el, name) {
        None => Some(String::new()),
        Some(attr) => dom_value(attr),
    }
}

/// TS `collectSlots`: the HTML `slot` elements of the shadow root in tree order, without entering
/// the content of a `template` element, which is a tree of its own.
///
/// `in_block` is whether the walk went through a node that the engine renders away (a block or a
/// fragment), under which a slot may not be rendered. Returns `false` when which slot is the first of
/// its name is not known: a slot in such a node, or one whose `name` is not known.
fn collect_slots(arena: &DomArena, spec: &MLMLSpec, parent: NodeId, slots: &mut Vec<NodeId>, in_block: bool) -> bool {
    for child in arena.pure_children_of(parent) {
        let Some(node) = arena.get(child) else {
            continue;
        };
        if !matches!(node, DomNode::Element(_) | DomNode::PSBlock(_)) {
            continue;
        }
        if is_transparent(node) {
            if !collect_slots(arena, spec, child, slots, true) {
                return false;
            }
            continue;
        }
        let DomNode::Element(el) = node else {
            continue;
        };
        if is_html_slot(arena, el) {
            // Whether it is rendered, and its `name`, are not known
            if in_block || get_slot_name(el, "name").is_none() {
                return false;
            }
            slots.push(child);
        }
        // The content of a `template` element is a tree of its own, which has its own slots
        if !is_html_template_element(el, spec) && !collect_slots(arena, spec, child, slots, in_block) {
            return false;
        }
    }
    true
}

/// TS `collectSlottables`: the nodes that are the children of the host in the output, seen through
/// what the engine renders away, the nodes in every branch of a conditional block included.
///
/// `declaring` is the `template` element that declares the shadow root, which is not a child of the
/// host in the tree. Returns `false` when the nodes are not known.
fn collect_slottables(arena: &DomArena, parent: NodeId, nodes: &mut Vec<NodeId>, declaring: NodeId) -> bool {
    for child in arena.pure_children_of(parent) {
        if child == declaring {
            continue;
        }
        match arena.get(child) {
            Some(DomNode::PSBlock(block)) => {
                // A block that has no behavior may be a marker of a language whose blocks the syntax
                // tree does not nest
                if block.block_behavior.is_none() || !collect_slottables(arena, child, nodes, declaring) {
                    return false;
                }
            }
            Some(node @ DomNode::Element(el)) => {
                if is_transparent(node) {
                    if !collect_slottables(arena, child, nodes, declaring) {
                        return false;
                    }
                    continue;
                }
                // What it renders may carry any `slot` attribute
                if is_unresolved_component(el) {
                    return false;
                }
                nodes.push(child);
            }
            Some(DomNode::Text(_)) => nodes.push(child),
            _ => {}
        }
    }
    true
}

/// TS `getShadowRootTemplate` of `tree-scope.ts`: the `template` element that declares the shadow
/// root of the host, the first one that asks for it and that can have it.
#[must_use]
pub fn shadow_root_template(arena: &DomArena, spec: &MLMLSpec, host: NodeId) -> Option<NodeId> {
    *arena.memoize("shadow-root-template", host, || {
        let mut templates = Vec::new();
        templates_of_host(arena, spec, host, &mut templates);
        templates.into_iter().find(|&template| {
            declarative_shadow_root_attachment(arena, spec, template) == ShadowRootAttachment::Attached
        })
    })
}

/// TS `compute`: the assignment of the shadow root of a host, or `None` when the host has no shadow
/// root or any of the causes in the module comment leaves the assignment unknown.
fn compute(arena: &DomArena, spec: &MLMLSpec, host: NodeId) -> Option<SlotAssignment> {
    let template = shadow_root_template(arena, spec, host)?;
    if arena.settings().slot_element != SlotElement::Html {
        return None;
    }
    let template_el = arena.get(template)?.as_element()?;
    if get_attr_value_from_el(template_el, "shadowrootslotassignment")
        .is_some_and(|value| value.eq_ignore_ascii_case("manual"))
    {
        return None;
    }
    // A shadow root that a conditional wrapper may not render has no known slots
    if arena.get(template)?.parent_id() != Some(host) {
        return None;
    }

    let mut slot_list = Vec::new();
    if !collect_slots(arena, spec, template, &mut slot_list, false) {
        return None;
    }
    let mut slottables = Vec::new();
    if !collect_slottables(arena, host, &mut slottables, template) {
        return None;
    }

    // The first slot of the shadow root, in tree order, that has each name
    let mut first_slot_of_name: HashMap<String, NodeId> = HashMap::new();
    for &slot in &slot_list {
        let name = get_slot_name(arena.get(slot)?.as_element()?, "name")?;
        first_slot_of_name.entry(name).or_insert(slot);
    }
    let mut slots: HashMap<NodeId, Vec<NodeId>> = slot_list.iter().map(|&slot| (slot, Vec::new())).collect();
    let mut assigned = HashMap::new();
    for node in slottables {
        let name = match arena.get(node)? {
            DomNode::Element(el) => get_slot_name(el, "slot")?,
            _ => String::new(),
        };
        let slot = first_slot_of_name.get(&name).copied();
        assigned.insert(node, slot);
        if let Some(slot) = slot {
            slots.entry(slot).or_default().push(node);
        }
    }
    Some(SlotAssignment { slots, assigned })
}

/// The assignment of a host, computed once: the document does not change after it is built, as the
/// other getters about trees assume, so the answer never goes stale.
fn slot_assignment(arena: &DomArena, spec: &MLMLSpec, host: NodeId) -> Arc<Option<SlotAssignment>> {
    arena.memoize("slot-assignment", host, || compute(arena, spec, host))
}

/// The host of the shadow root that the node is the content of: TS `isShadowRoot(root) && root.host`.
fn host_of_root(arena: &DomArena, spec: &MLMLSpec, root: TreeRoot) -> Option<NodeId> {
    match root {
        TreeRoot::Content(template)
            if declarative_shadow_root_attachment(arena, spec, template) == ShadowRootAttachment::Attached =>
        {
            shadow_host(arena, template)
        }
        _ => None,
    }
}

/// TS `getAssignedNodes`: the nodes a `slot` places.
///
/// The assigned nodes in tree order (`Some(vec![])` when it takes none), or `None` when the element is
/// not an HTML `slot` of a declarative shadow root whose assignment is known (see the module comment).
#[must_use]
pub fn get_assigned_nodes(arena: &DomArena, spec: &MLMLSpec, slot: NodeId) -> Option<Vec<NodeId>> {
    let el = arena.get(slot)?.as_element()?;
    if !is_html_slot(arena, el) {
        return None;
    }
    let host = host_of_root(arena, spec, root_of(arena, spec, slot))?;
    slot_assignment(arena, spec, host)
        .as_ref()
        .as_ref()?
        .slots
        .get(&slot)
        .cloned()
}

/// TS `getFlatTreeSlot`: the slot that places a node, as the flat tree has it.
#[must_use]
pub fn get_flat_tree_slot(arena: &DomArena, spec: &MLMLSpec, node: NodeId) -> FlatTreeSlot {
    // The parent in the output: a block or a fragment that the engine renders away is not the parent
    let Some(host) = shadow_host(arena, node) else {
        return FlatTreeSlot::Unknown;
    };
    if shadow_root_template(arena, spec, host).is_none() {
        return FlatTreeSlot::Unknown;
    }
    match slot_assignment(arena, spec, host)
        .as_ref()
        .as_ref()
        .and_then(|assignment| assignment.assigned.get(&node))
    {
        None => FlatTreeSlot::Unknown,
        Some(None) => FlatTreeSlot::NotRendered,
        Some(Some(slot)) => FlatTreeSlot::Slot(*slot),
    }
}

/// TS `getFlattenedSlottables`: the nodes a `slot` renders, with each assigned slot replaced by what
/// that slot renders in turn, and the children of a slot that takes none in its place. Empty when the
/// assignment is not known.
#[must_use]
pub fn get_flattened_slottables(arena: &DomArena, spec: &MLMLSpec, slot: NodeId) -> Vec<NodeId> {
    let Some(assigned) = get_assigned_nodes(arena, spec, slot) else {
        return Vec::new();
    };
    let slottables = if assigned.is_empty() {
        arena
            .child_nodes(slot)
            .into_iter()
            .filter(|&id| matches!(arena.get(id), Some(DomNode::Element(_) | DomNode::Text(_))))
            .collect()
    } else {
        assigned
    };
    slottables
        .into_iter()
        .flat_map(|node| {
            if matches!(arena.get(node), Some(DomNode::Element(_))) && get_assigned_nodes(arena, spec, node).is_some() {
                get_flattened_slottables(arena, spec, node)
            } else {
                vec![node]
            }
        })
        .collect()
}

/// TS `treeParentElement` / `getTreeParentElement`: the parent element in the tree of the node, which
/// is what the DOM calls `parentElement`: `None` at the top of the content of a `template` element or of
/// a shadow root, at a `template` element that is in no tree, and at the top of the document. A block of
/// a template language is walked through, as TS `parentElement` does.
#[must_use]
pub fn tree_parent_element(arena: &DomArena, spec: &MLMLSpec, id: NodeId) -> Option<NodeId> {
    markuplint_dom::tree::tree_parent_element(arena, Some(spec), id)
}

/// TS `getComposedParentElement`: the parent element of an element as the accessibility tree is built:
/// the parent element in its own tree, or, at the top of a shadow root, the host of the shadow root. `None`
/// at the top of the content of an ordinary `template` element, and at the top of a document or of any
/// other root that is not a shadow root. For a light child of a shadow host, the slot that takes it, or
/// `None` when none does.
#[must_use]
pub fn composed_parent_element(arena: &DomArena, spec: &MLMLSpec, id: NodeId) -> Option<NodeId> {
    match get_flat_tree_slot(arena, spec, id) {
        FlatTreeSlot::Slot(slot) => return Some(slot),
        FlatTreeSlot::NotRendered => return None,
        FlatTreeSlot::Unknown => {}
    }
    if let Some(parent) = tree_parent_element(arena, spec, id) {
        return Some(parent);
    }
    host_of_root(arena, spec, root_of(arena, spec, id))
}

/// TS `isSlotElement`: whether an element is a `slot` element of the HTML namespace, which the
/// accessibility tree does not map: it has no role of its own, and what it renders belongs to the parent
/// of the `slot`. It does not look at `MLParser#slotElement` on purpose: the `slot` of a framework is
/// replaced with what it is given, so it is no element of the accessibility tree either.
///
/// @see <https://w3c.github.io/html-aam/#el-slot>
#[must_use]
pub fn is_slot_element(arena: &DomArena, id: NodeId) -> bool {
    arena
        .get(id)
        .and_then(DomNode::as_element)
        .is_some_and(|el| element_local_name(el) == "slot" && el.namespace == NamespaceURI::XHTML)
}

/// TS `isNotRendered`: an element that is a light child of a shadow host that no slot of the shadow root
/// takes. The flat tree has no place for it, so it is not in the accessibility tree either, whatever its
/// host is.
#[must_use]
pub fn is_not_rendered(arena: &DomArena, spec: &MLMLSpec, id: NodeId) -> bool {
    get_flat_tree_slot(arena, spec, id) == FlatTreeSlot::NotRendered
}

/// TS `getAccessibilityParentElement`: the composed parent element with the `slot` elements passed
/// through. The walks that read the roles of the ancestors take it; the walks that read an attribute of
/// the ancestors take [`composed_parent_element`], as what a `slot` that has `hidden` renders is hidden.
#[must_use]
pub fn accessibility_parent_element(arena: &DomArena, spec: &MLMLSpec, id: NodeId) -> Option<NodeId> {
    let mut parent = composed_parent_element(arena, spec, id);
    while let Some(p) = parent
        && is_slot_element(arena, p)
    {
        parent = composed_parent_element(arena, spec, p);
    }
    parent
}

/// The element and its composed ancestors, nearest first (the walk `isExposed` and `someAncestors` make
/// with `getComposedParentElement`).
pub fn composed_ancestors_inclusive<'a>(
    arena: &'a DomArena,
    spec: &'a MLMLSpec,
    id: NodeId,
) -> impl Iterator<Item = NodeId> + 'a {
    std::iter::successors(Some(id), move |&current| composed_parent_element(arena, spec, current))
}

#[cfg(test)]
mod tests;
