//! Label association and text collection for `AccName` Step 2E.

#![allow(clippy::too_many_arguments)]

use std::collections::HashSet;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers as dom;
use markuplint_dom::node::DomNode;

use super::helpers::{child_nodes, embedded_control_text, flatten_text, is_svg_descriptive_element};
use super::{AccnameResolver, AccnameResult, AccnameSource};

pub fn resolve_label_text(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    in_labelledby_traversal: bool,
    computing: &mut HashSet<NodeId>,
) -> Option<AccnameResult> {
    let labels = resolve_labels(arena, node_id, resolver);
    if labels.is_empty() {
        return None;
    }

    let mut parts = Vec::new();
    for label_id in &labels {
        let text = collect_label_text(
            arena,
            *label_id,
            node_id,
            resolver,
            visited,
            in_labelledby_traversal,
            computing,
        );
        if !text.is_empty() {
            parts.push(text);
        }
    }

    if parts.is_empty() {
        return None;
    }

    Some(AccnameResult::new(flatten_text(&parts.join(" ")), AccnameSource::Label))
}

/// Excludes the labeled element itself (`exclude_id`) to avoid self-reference.
fn collect_label_text(
    arena: &DomArena,
    label_id: NodeId,
    exclude_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    in_labelledby_traversal: bool,
    computing: &mut HashSet<NodeId>,
) -> String {
    let mut parts = Vec::new();
    for child_id in child_nodes(arena, label_id, resolver) {
        let Some(child) = arena.get(child_id) else {
            continue;
        };
        match child {
            DomNode::Text(t) => parts.push(t.base.raw.clone()),
            DomNode::Element(_) => {
                if child_id == exclude_id || is_svg_descriptive_element(arena, child_id) {
                    continue;
                }
                if resolver.is_embedded_control(child_id) {
                    parts.push(embedded_control_text(
                        arena,
                        child_id,
                        resolver,
                        visited,
                        in_labelledby_traversal,
                        computing,
                    ));
                    continue;
                }
                let result = super::compute::compute_accessible_name_internal(
                    arena,
                    child_id,
                    resolver,
                    in_labelledby_traversal,
                    visited,
                    computing,
                );
                if result.name.is_empty() {
                    // Transparent traversal (TS `collectLabelText` recurses, still
                    // excluding the labeled element), unless the child is hidden.
                    if resolver.is_hidden(child_id) {
                        continue;
                    }
                    let text = collect_label_text(
                        arena,
                        child_id,
                        exclude_id,
                        resolver,
                        visited,
                        in_labelledby_traversal,
                        computing,
                    );
                    if !text.is_empty() {
                        parts.push(text);
                    }
                } else {
                    parts.push(result.name);
                }
            }
            _ => {}
        }
    }

    flatten_text(&parts.join(" "))
}

fn resolve_labels(arena: &DomArena, node_id: NodeId, resolver: &dyn AccnameResolver) -> Vec<NodeId> {
    // Explicit: <label for="id">
    if let Some(el_id) = dom::get_attr_value(arena, node_id, "id")
        && !el_id.is_empty()
    {
        let explicit = resolver.get_labels_for_id(el_id);
        if !explicit.is_empty() {
            return explicit;
        }
    }

    // Implicit: ancestor <label>
    if let Some(label_id) = find_ancestor_label(arena, node_id, resolver) {
        return vec![label_id];
    }

    vec![]
}

/// TS `findAncestorLabel`: the closest `label` element among the ancestors of the element in its own
/// tree, as the HTML Standard defines the relation between a `label` and its labeled control by
/// ancestors in the tree, so a `label` that wraps a `template` element does not label a control in its
/// content.
///
/// @see <https://html.spec.whatwg.org/multipage/forms.html#labeled-control>
fn find_ancestor_label(arena: &DomArena, node_id: NodeId, resolver: &dyn AccnameResolver) -> Option<NodeId> {
    let mut current = resolver.get_tree_parent_element(arena, node_id);
    while let Some(id) = current {
        if arena
            .get(id)
            .and_then(DomNode::as_element)
            .is_some_and(|el| el.base.node_name.eq_ignore_ascii_case("label"))
        {
            return Some(id);
        }
        current = resolver.get_tree_parent_element(arena, id);
    }
    None
}
