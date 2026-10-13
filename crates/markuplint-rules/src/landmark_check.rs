//! The landmark-role element set shared by the two rules `landmark-roles` was split into:
//! `no-nested-top-level-landmark` and `require-landmark-label`.
//!
//! Port of `packages/@markuplint/rules/src/landmark-roles/roles.ts`. Landmarks are found with
//! fixed CSS selectors, not with the computed role, so `<aside>` is always `complementary` and
//! `search` is not a landmark here. Top-level `<header>`/`<footer>` elements (those without an
//! `article, aside, main, nav, section` ancestor) are appended to `banner`/`contentinfo` after
//! the selector matches without de-duplication, as TS does: a `<header role="banner">` appears
//! in the banner list twice.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
use markuplint_selector::ast::SelectorList;
use markuplint_selector::{matcher, parser};
use markuplint_types::spec::types::MLMLSpec;

/// The landmark roles in the order TS builds its `RoleSet`.
pub(crate) const ROLES: [(&str, &str); 7] = [
    ("complementary", "[role=\"complementary\"], aside"),
    ("contentinfo", "[role=\"contentinfo\"]"),
    (
        "form",
        "[role=\"form\"], form[aria-labelledby], form[aria-label], form[title]",
    ),
    ("banner", "[role=\"banner\"]"),
    ("main", "[role=\"main\"], main"),
    ("navigation", "[role=\"navigation\"], nav"),
    (
        "region",
        "[role=\"region\"], section[aria-labelledby], section[aria-label], section[title]",
    ),
];

const SECTIONING: &str = "article, aside, main, nav, section";

/// Each landmark role with its elements in document order, in [`ROLES`] order.
pub(crate) fn compute_landmark_roles(arena: &DomArena, spec: &MLMLSpec) -> Vec<(&'static str, Vec<NodeId>)> {
    let elements: Vec<NodeId> = arena
        .descendants(0)
        .filter_map(DomNode::as_element)
        .map(|el| el.base.id)
        .collect();
    let sectioning = parse(SECTIONING);
    let top_level = |name: &str| -> Vec<NodeId> {
        let selector = parse(name);
        elements
            .iter()
            .copied()
            .filter(|&id| matches(&selector, arena, spec, id))
            .filter(|&id| {
                !arena
                    .ancestors(id)
                    .filter_map(DomNode::as_element)
                    .any(|a| matches(&sectioning, arena, spec, a.base.id))
            })
            .collect()
    };
    let headers = top_level("header");
    let footers = top_level("footer");

    ROLES
        .iter()
        .map(|&(role, selector)| {
            let selector = parse(selector);
            let mut list: Vec<NodeId> = elements
                .iter()
                .copied()
                .filter(|&id| matches(&selector, arena, spec, id))
                .collect();
            match role {
                "banner" => list.extend(&headers),
                "contentinfo" => list.extend(&footers),
                _ => {}
            }
            (role, list)
        })
        .collect()
}

/// TS `Element.isDescendantByUUIDList()`: whether any ancestor element is in `list`.
pub(crate) fn is_descendant_of_any(arena: &DomArena, node_id: NodeId, list: &[NodeId]) -> bool {
    arena
        .ancestors(node_id)
        .filter_map(DomNode::as_element)
        .any(|a| list.contains(&a.base.id))
}

/// Parses one of this module's fixed selectors.
pub(crate) fn parse(selector: &str) -> SelectorList {
    parser::parse(selector).unwrap_or_else(|e| panic!("invalid built-in selector {selector:?}: {e}"))
}

pub(crate) fn matches(selector: &SelectorList, arena: &DomArena, spec: &MLMLSpec, node_id: NodeId) -> bool {
    matcher::matches(selector, arena, node_id, None, Some(spec), None)
}
