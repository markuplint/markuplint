//! `AccName` Steps 2B and 2D: aria-labelledby and aria-label.

use std::collections::HashSet;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers as dom;

use super::helpers::flatten_text;
use super::{AccnameResolver, AccnameResult, AccnameSource};

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

    for idref in &idrefs {
        let is_self = *idref == self_html_id && !self_html_id.is_empty();

        if !is_self && visited.contains(*idref) {
            continue;
        }

        let Some(ref_node_id) = resolver.get_element_by_id(idref) else {
            continue;
        };

        let mut branch_visited = visited.clone();
        branch_visited.insert(idref.to_string());

        let result = super::compute::compute_accessible_name_internal(
            arena,
            ref_node_id,
            resolver,
            true, // inLabelledbyTraversal
            &branch_visited,
            computing,
        );

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

/// Step 2D: Resolve `aria-label`.
pub fn resolve_aria_label(arena: &DomArena, node_id: NodeId) -> Option<AccnameResult> {
    let attr = dom::get_attr_value(arena, node_id, "aria-label")?;
    let trimmed = attr.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(AccnameResult::new(trimmed, AccnameSource::AriaLabel))
}
