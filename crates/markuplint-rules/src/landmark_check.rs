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

use crate::helpers::is_html_template_element;
use crate::tree_scope::{TreeRoot, Trees};

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
/// TS `computeLandmarkRolesOfEachTree`: the landmark-role elements of every tree of the document,
/// the document itself first, then the content of each `template` element (and declarative shadow
/// root) in the order of the markup. Where the content of a `template` ends up in a document is
/// not known from the markup, so its landmarks are not counted with the ones of the document, nor
/// does an ancestor of the document make them nested.
pub(crate) fn compute_landmark_roles_of_each_tree(
    arena: &DomArena,
    spec: &MLMLSpec,
    trees: &Trees<'_>,
) -> Vec<Vec<(&'static str, Vec<NodeId>)>> {
    let mut roots = vec![TreeRoot::Document];
    roots.extend(
        arena
            .elements()
            .filter(|(_, el)| is_html_template_element(el, spec))
            .map(|(id, _)| TreeRoot::Content(id)),
    );
    roots
        .into_iter()
        .map(|root| compute_landmark_roles(arena, spec, trees, trees.elements_of(root)))
        .collect()
}

/// TS `computeLandmarkRoles` of one tree, whose elements are `elements`.
fn compute_landmark_roles(
    arena: &DomArena,
    spec: &MLMLSpec,
    trees: &Trees<'_>,
    elements: &[NodeId],
) -> Vec<(&'static str, Vec<NodeId>)> {
    let sectioning = parse(SECTIONING);
    let top_level = |name: &str| -> Vec<NodeId> {
        let selector = parse(name);
        elements
            .iter()
            .copied()
            .filter(|&id| matches(&selector, arena, spec, id))
            .filter(|&id| {
                !trees
                    .tree_ancestor_elements(id)
                    .any(|a| matches(&sectioning, arena, spec, a))
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
                "banner" => extend_without(&mut list, &headers),
                "contentinfo" => extend_without(&mut list, &footers),
                _ => {}
            }
            (role, list)
        })
        .collect()
}

/// Appends the implicit `<header>` / `<footer>` landmarks that the role's own selector has not
/// already collected: a lone `<header role="banner">` must not count as a duplicate (#4180).
fn extend_without(list: &mut Vec<NodeId>, implicit: &[NodeId]) {
    let collected = list.clone();
    list.extend(implicit.iter().copied().filter(|id| !collected.contains(id)));
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
