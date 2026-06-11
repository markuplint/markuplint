//! Label association and text collection for `AccName` Step 2E.

#![allow(clippy::too_many_arguments)]

use std::collections::HashSet;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers as dom;
use markuplint_dom::node::DomNode;

use super::helpers::{collect_text_content, flatten_text};
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
    let Some(children) = arena.children_of(label_id) else {
        return String::new();
    };

    let mut parts = Vec::new();
    for &child_id in children {
        if child_id == exclude_id {
            continue;
        }
        let Some(child) = arena.get(child_id) else {
            continue;
        };
        match child {
            DomNode::Text(t) => parts.push(t.base.raw.clone()),
            DomNode::Element(_) => {
                let result = super::compute::compute_accessible_name_internal(
                    arena,
                    child_id,
                    resolver,
                    in_labelledby_traversal,
                    visited,
                    computing,
                );
                if result.name.is_empty() {
                    let text = collect_text_content(arena, child_id);
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
    if let Some(label_id) = find_ancestor_label(arena, node_id) {
        return vec![label_id];
    }

    vec![]
}

fn find_ancestor_label(arena: &DomArena, node_id: NodeId) -> Option<NodeId> {
    for ancestor in arena.ancestors(node_id) {
        if let Some(el) = ancestor.as_element()
            && el.base.node_name.eq_ignore_ascii_case("label")
        {
            return Some(el.base.id);
        }
    }
    None
}
