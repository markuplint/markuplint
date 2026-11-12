//! `AccName` Steps 2B and 2D: aria-labelledby and aria-label.

use std::collections::HashSet;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers as dom;

use super::helpers::flatten_text;
use super::{AccnameResolver, AccnameResult, AccnameSource, AccnameVisit};

/// Step 2B: Resolve `aria-labelledby`.
pub fn resolve_aria_labelledby(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    computing: &mut HashSet<NodeId>,
) -> Option<AccnameResult> {
    let attr = dom::get_attr_value(arena, node_id, "aria-labelledby")?;
    let idrefs: Vec<&str> = attr.split_whitespace().collect();
    if idrefs.is_empty() {
        return None;
    }

    let self_html_id = dom::get_attr_value(arena, node_id, "id")
        .unwrap_or_default()
        .to_string();

    let mut parts = Vec::new();
    // Mark the current element as visited to prevent other elements from circling back to it
    // (A -> B -> A).
    let mut new_visited = visited.clone();
    if !self_html_id.is_empty() {
        new_visited.insert(self_html_id.clone());
    }

    for idref in &idrefs {
        // An element may reference itself to include its own content alongside the others
        // (AccName 1.2 Example 2); the recursion ends with `in_labelledby_traversal`, not here.
        if new_visited.contains(*idref) && *idref != self_html_id {
            continue;
        }

        let Some(ref_node_id) = resolver.get_element_by_id(idref) else {
            continue;
        };

        // Each branch gets its own visited set so that one IDREF's traversal doesn't block the
        // resolution of a later IDREF.
        let mut branch_visited = new_visited.clone();
        branch_visited.insert(idref.to_string());

        let result = compute_referenced(arena, ref_node_id, resolver, &branch_visited, computing);

        if !result.name.is_empty() {
            parts.push(result.name);
        }
    }

    if parts.is_empty() {
        return None;
    }

    Some(AccnameResult::new(
        flatten_text(&parts.join(" ")),
        AccnameSource::AriaLabelledby,
    ))
}

/// TS `computeReferenced`: the text alternative of a node directly referenced by `aria-labelledby`
/// (Step 2B, `LabelledBy` Traversal).
///
/// Step 2A is skipped for the whole subtree only when the referenced node is hidden; otherwise its
/// hidden descendants contribute nothing.
///
/// > If the current node is hidden and is: Not part of an aria-labelledby or aria-describedby traversal,
/// > where the node directly referenced by that relation was hidden.
///
/// @see <https://w3c.github.io/accname/#comp_hidden_not_referenced>
pub fn compute_referenced(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    computing: &mut HashSet<NodeId>,
) -> AccnameResult {
    if resolver.is_hidden(node_id) {
        let traversal = NothingHidden(resolver);
        super::compute::compute_accessible_name_internal(arena, node_id, &traversal, true, visited, computing)
    } else {
        super::compute::compute_accessible_name_internal(arena, node_id, resolver, true, visited, computing)
    }
}

/// The resolver of a traversal that starts at a hidden node: the same, with nothing hidden.
struct NothingHidden<'a>(&'a dyn AccnameResolver);

impl AccnameResolver for NothingHidden<'_> {
    fn get_element_by_id(&self, id: &str) -> Option<NodeId> {
        self.0.get_element_by_id(id)
    }

    fn get_labels_for_id(&self, id: &str) -> Vec<NodeId> {
        self.0.get_labels_for_id(id)
    }

    fn allows_name_from_content(&self, node_id: NodeId) -> bool {
        self.0.allows_name_from_content(node_id)
    }

    fn is_hidden(&self, _node_id: NodeId) -> bool {
        false
    }

    fn is_embedded_control(&self, node_id: NodeId) -> bool {
        self.0.is_embedded_control(node_id)
    }

    fn is_exposed_as_presentational(&self, node_id: NodeId) -> bool {
        self.0.is_exposed_as_presentational(node_id)
    }

    fn on_visit(&self, node_id: NodeId, visit: AccnameVisit) {
        self.0.on_visit(node_id, visit);
    }

    fn get_tree_parent_element(&self, arena: &DomArena, node_id: NodeId) -> Option<NodeId> {
        self.0.get_tree_parent_element(arena, node_id)
    }

    fn get_precomputed_name(&self, node_id: NodeId) -> Option<String> {
        self.0.get_precomputed_name(node_id)
    }

    fn get_child_nodes(&self, node_id: NodeId) -> Option<Vec<NodeId>> {
        self.0.get_child_nodes(node_id)
    }
}

/// Step 2D: Resolve `aria-label`. The `slot` element of HTML is skipped (the computation goes on to
/// the following steps): it renders what is given to it, and has no label of its own.
pub fn resolve_aria_label(arena: &DomArena, node_id: NodeId) -> Option<AccnameResult> {
    if arena.get(node_id).and_then(|node| node.as_element()).is_some_and(|el| {
        el.base.node_name.eq_ignore_ascii_case("slot") && el.namespace == markuplint_core::mlast::NamespaceURI::XHTML
    }) {
        return None;
    }
    let attr = dom::get_attr_value(arena, node_id, "aria-label")?;
    let trimmed = attr.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(AccnameResult::new(trimmed, AccnameSource::AriaLabel))
}
