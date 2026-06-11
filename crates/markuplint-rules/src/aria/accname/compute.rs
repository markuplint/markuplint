//! `AccName` 1.2 §4.3.2 — Main computation algorithm.

use std::collections::HashSet;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers as dom;

use super::aria_steps;
use super::element_names;
use super::helpers;
use super::{AccnameResolver, AccnameResult, AccnameSource};

pub fn compute_accessible_name(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    computing: &mut HashSet<NodeId>,
) -> AccnameResult {
    let visited = HashSet::new();
    compute_accessible_name_internal(arena, node_id, resolver, false, &visited, computing)
}

/// Implements `AccName` 1.2 §4.3.2 Steps 2A through 2I.
pub fn compute_accessible_name_internal(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    in_labelledby_traversal: bool,
    visited: &HashSet<String>,
    computing: &mut HashSet<NodeId>,
) -> AccnameResult {
    // Reentrant guard
    if !computing.insert(node_id) {
        return AccnameResult::empty();
    }

    let result = compute_steps(arena, node_id, resolver, in_labelledby_traversal, visited, computing);

    computing.remove(&node_id);
    result
}

fn compute_steps(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    in_labelledby_traversal: bool,
    visited: &HashSet<String>,
    computing: &mut HashSet<NodeId>,
) -> AccnameResult {
    // Step 2A: Hidden check
    if !in_labelledby_traversal && resolver.is_hidden(node_id) {
        return AccnameResult::empty();
    }

    // [Implementation-specific] Pre-computed name (e.g., Pretender integration)
    // Checked after hidden check but before standard steps.
    if let Some(precomputed) = resolver.get_precomputed_name(node_id) {
        return AccnameResult::new(precomputed, AccnameSource::Content);
    }

    // Step 2B: aria-labelledby (skip if inside labelledby traversal)
    if !in_labelledby_traversal
        && let Some(result) = aria_steps::resolve_aria_labelledby(arena, node_id, resolver, visited, computing)
    {
        return result;
    }

    // Step 2D: aria-label
    if let Some(result) = aria_steps::resolve_aria_label(arena, node_id) {
        return result;
    }

    // Step 2E: Element-specific name
    if let Some(result) =
        element_names::get_element_specific_name(arena, node_id, resolver, visited, in_labelledby_traversal, computing)
        && (!result.name.is_empty() || result.source.is_some())
    {
        return result;
    }

    // Step 2F: Name from content (if role allows or in labelledby traversal)
    if in_labelledby_traversal || resolver.allows_name_from_content(node_id) {
        let content =
            helpers::resolve_name_from_content(arena, node_id, resolver, visited, in_labelledby_traversal, computing);
        if !content.is_empty() {
            return AccnameResult::new(content, AccnameSource::Content);
        }
    }

    // Step 2I: Title attribute fallback
    if let Some(title) = dom::get_attr_value(arena, node_id, "title") {
        let trimmed = title.trim();
        if !trimmed.is_empty() {
            return AccnameResult::new(trimmed, AccnameSource::Title);
        }
    }

    AccnameResult::empty()
}
