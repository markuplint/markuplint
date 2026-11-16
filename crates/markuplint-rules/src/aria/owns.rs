//! Ports `packages/@markuplint/ml-spec/src/algorithm/aria/aria-owns.ts`.
//!
//! The ownership that `aria-owns` adds to the accessibility tree: an element that an `aria-owns`
//! refers to is an accessibility child of the element that refers to it, not of its DOM parent.
//!
//! > If an element has both aria-owns and DOM children then the order of the accessibility children
//! > with respect to the parent/child relationship is the DOM children first, then the elements
//! > referenced in aria-owns.
//!
//! > Authors MUST ensure that an element's ID is not specified in more than one other element's
//! > aria-owns attribute at any time. In other words, an element can have only one explicit owner.
//! > Authors MUST NOT create circular references with aria-owns. In the case of authoring error with
//! > aria-owns, the user agent MAY ignore some aria-owns element references in order to build a
//! > consistent model of the content.
//!
//! > aria-owns is resolved in the order it is encountered in the DOM.
//!
//! > User agents MUST NOT resolve aria-owns when it is set on an element that has been excluded from
//! > the accessibility tree.
//!
//! > User agents MUST NOT resolve aria-owns when it references an element that is, or has a DOM
//! > ancestor that is, hidden from all users.
//!
//! So the owner of an element is the first element in tree order whose `aria-owns` lists the ID of the
//! element and is resolved; a later element that lists it is ignored. A reference that is part of a
//! cycle of the tree (a parent is an owner when it has one, and the DOM parent otherwise) is ignored,
//! every reference of the cycle alike, so the tree does not depend on which element is asked about
//! first. Ignoring them gives the elements of the cycle their DOM parents, which can close another
//! cycle through the references left, so the references are removed until no cycle is left.
//!
//! An ID is looked up in the tree of the element that has the `aria-owns` ([`root_of`]): a reference
//! does not reach across the boundary of a shadow root or of the content of a `template` element, and
//! the first element in tree order with the ID is the one it refers to. Being hidden from all users is
//! read from the markup of the element and its ancestors of the flat tree, as `isExposed` reads it: the
//! `hidden` attribute, an inline style of `display: none` or `visibility: hidden`, or a light child
//! that no slot takes. Those, `aria-hidden="true"`, and an ancestor whose role has presentational
//! children exclude an owner; `aria-hidden` does not hide the element an `aria-owns` refers to, as it
//! does not hide an element from all users. A style sheet is not read. The role of an ancestor is its
//! explicit role, or its implicit role when it has none or has `none` / `presentation`: the
//! presentational children of a role come from the role alone, and reading the computed role would ask
//! for this ownership again.
//!
//! The ownership of a tree is computed once and kept for its root, as the TypeScript caches it: the
//! arena does not change while it is linted ([`DomArena::memoize`]). The references as they are
//! written, which do not depend on the version, are kept apart from the ownership a user agent
//! resolves, which does. The specification is the one the arena is linted with.
//!
//! @see <https://w3c.github.io/aria/#aria-owns>

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

use super::computed_role::{get_explicit_role, get_implicit_role, is_presentational};
use super::is_exposed::has_display_none_or_visibility_hidden;
use crate::slot_assignment::{accessibility_parent_element, composed_parent_element, is_not_rendered};
use crate::tree_scope::{TreeRoot, Trees, root_of};

/// The key of an answer of [`DomArena::memoize`] that is about the document.
const WHOLE_ARENA: NodeId = 0;

/// The references of one tree as the markup writes them (TS `WrittenReferences`).
struct WrittenReferences {
    /// The first element in tree order with each ID.
    element_by_id: HashMap<String, NodeId>,
    /// The elements with `aria-owns`, in tree order.
    referrers: Vec<NodeId>,
    /// The first element in tree order whose `aria-owns` lists each element, hidden or not.
    written_owner_of: HashMap<NodeId, NodeId>,
    /// `written_owner_of` without the references that are part of a cycle.
    acyclic_written_owner_of: HashMap<NodeId, NodeId>,
    /// The elements whose reference in `written_owner_of` is part of a cycle.
    circular_targets: HashSet<NodeId>,
}

/// The ownership a user agent resolves in one tree (TS `Ownership`).
struct Ownership {
    /// The owner of each owned element.
    owner_of: HashMap<NodeId, NodeId>,
    /// The elements each owner owns, in the order its `aria-owns` lists them.
    owned_by: HashMap<NodeId, Vec<NodeId>>,
}

/// TS `getAriaOwner`: the element whose `aria-owns` makes `el` its accessibility child, or `None`
/// when no `aria-owns` resolves to `el` (see the module comment for the order, the cycles and the
/// excluded elements).
#[must_use]
pub(crate) fn get_aria_owner(arena: &DomArena, spec: &MLMLSpec, el: NodeId, version: ARIAVersion) -> Option<NodeId> {
    ownership(arena, spec, el, version).owner_of.get(&el).copied()
}

/// TS `getAriaOwnedElements`: the elements that the `aria-owns` of `el` makes its accessibility
/// children, in the order the attribute lists them: the ones whose owner is `el`.
#[must_use]
pub(crate) fn get_aria_owned_elements(
    arena: &DomArena,
    spec: &MLMLSpec,
    el: NodeId,
    version: ARIAVersion,
) -> Vec<NodeId> {
    ownership(arena, spec, el, version)
        .owned_by
        .get(&el)
        .cloned()
        .unwrap_or_default()
}

/// TS `resolveAriaOwnsChildren`: the child nodes of `el` in the accessibility tree with `aria-owns`
/// resolved: its child nodes without the elements that another element owns through `aria-owns`, then
/// the elements that its own `aria-owns` makes its children ([`get_aria_owned_elements`]). A node that
/// is not an element is kept as it is.
#[must_use]
pub(crate) fn resolve_aria_owns_children(
    arena: &DomArena,
    spec: &MLMLSpec,
    el: NodeId,
    child_nodes: &[NodeId],
    version: ARIAVersion,
) -> Vec<NodeId> {
    let mut resolved: Vec<NodeId> = child_nodes
        .iter()
        .copied()
        .filter(|&child| {
            if !is_element(arena, child) {
                return true;
            }
            get_aria_owner(arena, spec, child, version).is_none_or(|owner| owner == el)
        })
        .collect();
    let kept = resolved.clone();
    resolved.extend(
        get_aria_owned_elements(arena, spec, el, version)
            .into_iter()
            .filter(|owned| !kept.contains(owned)),
    );
    resolved
}

/// TS `getOwnedChildElements`: the child elements of `el` in the accessibility tree with `aria-owns`
/// resolved ([`resolve_aria_owns_children`]).
#[must_use]
pub(crate) fn get_owned_child_elements(
    arena: &DomArena,
    spec: &MLMLSpec,
    el: NodeId,
    version: ARIAVersion,
) -> Vec<NodeId> {
    let children: Vec<NodeId> = arena
        .child_nodes(el)
        .into_iter()
        .filter(|&child| is_element(arena, child))
        .collect();
    resolve_aria_owns_children(arena, spec, el, &children, version)
}

/// TS `getOwningParentElement`: the parent of an element in the accessibility tree with `aria-owns`
/// resolved: the owner when an `aria-owns` resolves to the element ([`get_aria_owner`]), otherwise the
/// parent the DOM gives ([`accessibility_parent_element`]).
#[must_use]
pub(crate) fn get_owning_parent_element(
    arena: &DomArena,
    spec: &MLMLSpec,
    el: NodeId,
    version: ARIAVersion,
) -> Option<NodeId> {
    get_aria_owner(arena, spec, el, version).or_else(|| accessibility_parent_element(arena, spec, el))
}

/// TS `getAriaOwnsTarget`: the element that an ID in the `aria-owns` of `referrer` refers to: the first
/// element in tree order with the ID in the tree of `referrer`.
#[must_use]
pub(crate) fn get_aria_owns_target(arena: &DomArena, spec: &MLMLSpec, referrer: NodeId, id: &str) -> Option<NodeId> {
    written_references(arena, spec, referrer).element_by_id.get(id).copied()
}

/// TS `isCircularAriaOwnsReference`: whether the reference from the `aria-owns` of `referrer` to
/// `target` is circular: `target` is `referrer` itself, or an ancestor of `referrer` in the accessibility
/// tree, so owning it would make `referrer` its own ancestor.
///
/// > Authors MUST NOT create circular references with aria-owns.
///
/// It reads the markup as the author wrote it: every `aria-owns` counts (the first element in tree order
/// that lists an ID), including the ones on an excluded element, which [`get_aria_owner`] does not
/// resolve. The references that are part of a cycle are removed until none is, as [`get_aria_owner`]
/// does, and every reference removed on the way is circular: one that closes a cycle only once another
/// cycle is broken is reported as well. A later element that lists an ID that an earlier one lists is
/// circular when `target` is its ancestor in the tree that is left.
#[must_use]
pub(crate) fn is_circular_aria_owns_reference(
    arena: &DomArena,
    spec: &MLMLSpec,
    referrer: NodeId,
    target: NodeId,
) -> bool {
    if referrer == target {
        return true;
    }
    let written = written_references(arena, spec, referrer);
    if written.written_owner_of.get(&target) == Some(&referrer) {
        return written.circular_targets.contains(&target);
    }
    let mut visited = HashSet::new();
    let mut ancestor = Some(referrer);
    while let Some(current) = ancestor {
        if !visited.insert(current) {
            break;
        }
        if current == target {
            return true;
        }
        ancestor = written
            .acyclic_written_owner_of
            .get(&current)
            .copied()
            .or_else(|| accessibility_parent_element(arena, spec, current));
    }
    false
}

/// TS `getFirstAriaOwnsReferrer`: the first element in tree order whose `aria-owns` lists the ID of
/// `target`, as the markup writes it: an element that is excluded from the accessibility tree counts.
/// The ones after it specify the ID in more than one element's `aria-owns`. An element that lists its
/// own ID does not count.
#[must_use]
pub(crate) fn get_first_aria_owns_referrer(arena: &DomArena, spec: &MLMLSpec, target: NodeId) -> Option<NodeId> {
    written_references(arena, spec, target)
        .written_owner_of
        .get(&target)
        .copied()
}

/// Whether the document has a block of template syntax (`document.nodeList.some(node =>
/// node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK))`): which branch is rendered is not known, so the
/// element an ID refers to is not either.
#[must_use]
pub(crate) fn has_preprocessor_block(arena: &DomArena) -> bool {
    (0..arena.len()).any(|id| matches!(arena.get(id), Some(DomNode::PSBlock(_))))
}

/// The tokens of an ID reference list (TS `splitIdReferences`): split on ASCII whitespace.
pub(crate) fn split_id_references(value: &str) -> impl Iterator<Item = &str> {
    value
        .split(['\t', '\n', '\u{c}', '\r', ' '])
        .filter(|token| !token.is_empty())
}

fn is_element(arena: &DomArena, id: NodeId) -> bool {
    arena.get(id).and_then(DomNode::as_element).is_some()
}

fn aria_owns_of(arena: &DomArena, el: NodeId) -> &str {
    helpers::get_attr_value(arena, el, "aria-owns").unwrap_or_default()
}

/// The key of the answer for a tree: the document is the whole arena, any other tree is its
/// `template` element.
fn root_key(root: TreeRoot) -> NodeId {
    match root {
        TreeRoot::Document => WHOLE_ARENA,
        TreeRoot::Content(id) | TreeRoot::NoTree(id) => id,
    }
}

/// The elements of every tree in tree order (TS `getTreeElements`): those whose own root is the
/// tree. An element in no tree is in none.
fn tree_elements(arena: &DomArena, spec: &MLMLSpec) -> Arc<HashMap<TreeRoot, Vec<NodeId>>> {
    arena.memoize("aria-owns-tree-elements", WHOLE_ARENA, || {
        let trees = Trees::new(arena, spec);
        let mut elements: HashMap<TreeRoot, Vec<NodeId>> = HashMap::new();
        for (id, _) in arena.elements() {
            let root = trees.root_of(id);
            if !matches!(root, TreeRoot::NoTree(_)) {
                elements.entry(root).or_default().push(id);
            }
        }
        elements
    })
}

fn written_references(arena: &DomArena, spec: &MLMLSpec, el: NodeId) -> Arc<WrittenReferences> {
    let root = root_of(arena, spec, el);
    arena.memoize("aria-owns-written", root_key(root), || {
        compute_written_references(arena, spec, root)
    })
}

fn ownership(arena: &DomArena, spec: &MLMLSpec, el: NodeId, version: ARIAVersion) -> Arc<Ownership> {
    let root = root_of(arena, spec, el);
    let written = written_references(arena, spec, el);
    let kind = match version {
        ARIAVersion::V1_1 => "aria-owns-ownership-1.1",
        ARIAVersion::V1_2 => "aria-owns-ownership-1.2",
        ARIAVersion::V1_3 => "aria-owns-ownership-1.3",
    };
    arena.memoize(kind, root_key(root), || {
        compute_ownership(arena, spec, &written, version)
    })
}

fn compute_written_references(arena: &DomArena, spec: &MLMLSpec, root: TreeRoot) -> WrittenReferences {
    let all = tree_elements(arena, spec);
    let elements: &[NodeId] = all.get(&root).map_or(&[], Vec::as_slice);

    let mut element_by_id: HashMap<String, NodeId> = HashMap::new();
    for &el in elements {
        if let Some(id) = helpers::get_attr_value(arena, el, "id").filter(|id| !id.is_empty()) {
            element_by_id.entry(id.to_owned()).or_insert(el);
        }
    }

    let referrers: Vec<NodeId> = elements
        .iter()
        .copied()
        .filter(|&el| helpers::has_attr(arena, el, "aria-owns"))
        .collect();

    let mut written_owner_of: HashMap<NodeId, NodeId> = HashMap::new();
    for &referrer in &referrers {
        for id in split_id_references(aria_owns_of(arena, referrer)) {
            if let Some(&target) = element_by_id.get(id)
                && target != referrer
            {
                written_owner_of.entry(target).or_insert(referrer);
            }
        }
    }

    let mut acyclic_written_owner_of = written_owner_of.clone();
    let circular_targets = remove_cycles(arena, spec, &mut acyclic_written_owner_of);

    WrittenReferences {
        element_by_id,
        referrers,
        written_owner_of,
        acyclic_written_owner_of,
        circular_targets,
    }
}

fn compute_ownership(
    arena: &DomArena,
    spec: &MLMLSpec,
    written: &WrittenReferences,
    version: ARIAVersion,
) -> Ownership {
    let mut owner_of: HashMap<NodeId, NodeId> = HashMap::new();
    for &referrer in &written.referrers {
        // The `aria-owns` of an excluded element is not resolved, so it takes no part in the order
        if is_excluded_owner(arena, spec, referrer, version) {
            continue;
        }
        for id in split_id_references(aria_owns_of(arena, referrer)) {
            let Some(&target) = written.element_by_id.get(id) else {
                continue;
            };
            if target == referrer || owner_of.contains_key(&target) || is_hidden_from_all_users(arena, spec, target) {
                continue;
            }
            owner_of.insert(target, referrer);
        }
    }

    remove_cycles(arena, spec, &mut owner_of);

    let mut owned_by: HashMap<NodeId, Vec<NodeId>> = HashMap::new();
    for &referrer in &written.referrers {
        for id in split_id_references(aria_owns_of(arena, referrer)) {
            let Some(&target) = written.element_by_id.get(id) else {
                continue;
            };
            if owner_of.get(&target) != Some(&referrer) {
                continue;
            }
            let owned = owned_by.entry(referrer).or_default();
            if !owned.contains(&target) {
                owned.push(target);
            }
        }
    }

    Ownership { owner_of, owned_by }
}

/// Removes the references that are part of a cycle, until none is. Returns the owned elements whose
/// references were removed.
fn remove_cycles(arena: &DomArena, spec: &MLMLSpec, owner_of: &mut HashMap<NodeId, NodeId>) -> HashSet<NodeId> {
    let mut removed = HashSet::new();
    loop {
        let mut in_cycle: Vec<NodeId> = Vec::new();
        for (&target, &owner) in owner_of.iter() {
            let mut visited = HashSet::new();
            let mut ancestor = Some(owner);
            while let Some(current) = ancestor {
                if !visited.insert(current) {
                    break;
                }
                if current == target {
                    in_cycle.push(target);
                    break;
                }
                ancestor = owner_of
                    .get(&current)
                    .copied()
                    .or_else(|| accessibility_parent_element(arena, spec, current));
            }
        }
        if in_cycle.is_empty() {
            return removed;
        }
        for target in in_cycle {
            owner_of.remove(&target);
            removed.insert(target);
        }
    }
}

/// TS `isHiddenFromAllUsers`: the element or an ancestor of the flat tree is not rendered, has `hidden`,
/// or has an inline style that hides it.
fn is_hidden_from_all_users(arena: &DomArena, spec: &MLMLSpec, el: NodeId) -> bool {
    let mut current = Some(el);
    while let Some(id) = current {
        if is_not_rendered(arena, spec, id)
            || helpers::has_attr(arena, id, "hidden")
            || has_display_none_or_visibility_hidden(arena, id)
        {
            return true;
        }
        current = composed_parent_element(arena, spec, id);
    }
    false
}

/// TS `isExcludedOwner`: the element or an ancestor of the flat tree is hidden from all users, has
/// `aria-hidden="true"`, or has a parent whose role has presentational children.
fn is_excluded_owner(arena: &DomArena, spec: &MLMLSpec, el: NodeId, version: ARIAVersion) -> bool {
    let mut current = Some(el);
    while let Some(id) = current {
        if is_not_rendered(arena, spec, id)
            || helpers::has_attr(arena, id, "hidden")
            || has_display_none_or_visibility_hidden(arena, id)
            || helpers::get_attr_value(arena, id, "aria-hidden")
                .is_some_and(|value| value.trim().eq_ignore_ascii_case("true"))
        {
            return true;
        }
        let parent = composed_parent_element(arena, spec, id);
        if let Some(parent) = parent
            && has_presentational_children(arena, spec, parent, version)
        {
            return true;
        }
        current = parent;
    }
    false
}

/// TS `hasPresentationalChildren`: whether the role of an element has presentational children, read
/// from its explicit role, or its implicit role when it has none or has `none` / `presentation`.
fn has_presentational_children(arena: &DomArena, spec: &MLMLSpec, id: NodeId, version: ARIAVersion) -> bool {
    let Some(el) = arena.get(id).and_then(DomNode::as_element) else {
        return false;
    };
    let explicit = get_explicit_role(spec, arena, id, el, version).role;
    let role = match explicit {
        Some(role) if !is_presentational(&role.name) => Some(role),
        _ => get_implicit_role(spec, arena, id, el, version).role,
    };
    role.is_some_and(|role| role.children_presentational)
}
