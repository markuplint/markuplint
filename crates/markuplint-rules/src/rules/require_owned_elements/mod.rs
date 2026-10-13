//! `require-owned-elements` rule: report an element whose role has allowed accessibility child
//! roles (WAI-ARIA 1.2 "Required Owned Elements") but which owns none of them.
//!
//! Ports `packages/@markuplint/rules/src/require-owned-elements/` and its checker
//! `wai-aria/checkings/required-owned-elements.ts`, without the pretender part (the slot wrapper
//! of a pretended component and the nodes a component renders itself), which waits for the
//! pretender port.
//!
//! The children are classified as TS does: a child element marked `aria-busy="true"` exempts the
//! element, as does a child that carries one of the roles (`"rowgroup > row"` queries included),
//! a preprocessor block, or anything that may change at build time (a `<slot>`, a spread or
//! dynamic attribute, a block without a behavior, anywhere below). A child whose role is
//! transparent for ownership (`presentation` / `none`, and `generic` from ARIA 1.3) is looked
//! through. Ownership through `aria-owns` is not resolved, as in TS.
//!
//! An element that is empty, or holds nothing but whitespace, comments, `<script>` and
//! `<template>`, may have its children created later, so the message suggests `aria-busy="true"`.

use markuplint_core::mlast::{MLASTAttr, MLASTBlockBehaviorType};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::get_attr_value;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::computed_role::{ResolvedRole, get_computed_role};
use crate::aria_check::{
    ElementContext, ElementGate, element_local_name, is_js_whitespace, quoted_list, walk_elements,
};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct RequireOwnedElements;

impl Rule for RequireOwnedElements {
    fn id(&self) -> &'static str {
        "require-owned-elements"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        walk_elements(
            self.id(),
            arena,
            spec,
            config,
            ElementGate::Supported,
            |_| (),
            |(), ctx, violations| violations.extend(check(ctx)),
        )
    }
}

/// How one owned node bears on the requirement (TS `OwnedElement`).
#[derive(Clone, Copy, PartialEq, Eq)]
enum Owned {
    /// The element has one of the required roles.
    Required,
    /// The element is `aria-busy="true"`: its content is still loading.
    Busy,
    /// An element that is neither.
    Other,
    /// A preprocessor block, which may produce the required elements.
    Block,
    /// A text or comment node.
    NoElement,
}

fn check(ctx: &ElementContext<'_>) -> Option<Violation> {
    let role = get_computed_role(ctx.spec, ctx.arena, ctx.node_id, ctx.version, false).role?;
    let child_roles = &role.allowed_accessibility_child_roles;
    if child_roles.is_empty() {
        return None;
    }
    if is_busy(ctx.arena, ctx.node_id) {
        return None;
    }

    let owned = classify_children(ctx.spec, ctx.arena, ctx.node_id, &role, ctx.version);
    if owned
        .iter()
        .any(|o| matches!(o, Owned::Busy | Owned::Required | Owned::Block))
    {
        return None;
    }
    if has_mutable_children(ctx.arena, ctx.node_id) {
        return None;
    }

    let required = match child_roles.as_slice() {
        [single] => format!("the \"{single}\" role"),
        several => format!("the roles: {}", quoted_list(several)),
    };
    let message = if may_be_before_created(ctx.arena, ctx.node_id) {
        format!("The child element requires {required}. Or, require aria-busy=\"true\"")
    } else {
        format!("The \"{}\" role expects {required}", role.name)
    };
    Some(ctx.element_violation(message))
}

/// TS `el.matches('[aria-busy="true" i]')`.
fn is_busy(arena: &DomArena, node_id: NodeId) -> bool {
    get_attr_value(arena, node_id, "aria-busy").is_some_and(|value| value.eq_ignore_ascii_case("true"))
}

/// TS `classifyChildren()`.
fn classify_children(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    role: &ResolvedRole,
    version: ARIAVersion,
) -> Vec<Owned> {
    let mut result = Vec::new();
    for child_id in child_nodes(arena, node_id) {
        match arena.get(child_id) {
            Some(DomNode::Element(_)) => {
                if is_busy(arena, child_id) {
                    result.push(Owned::Busy);
                    continue;
                }
                let child_role = get_computed_role(spec, arena, child_id, version, false).role;
                let child_role_name = child_role.as_ref().map(|r| r.name.as_str());
                if role
                    .allowed_accessibility_child_roles
                    .iter()
                    .any(|query| is_required_owned_element(spec, arena, child_id, child_role_name, query, version))
                {
                    result.push(Owned::Required);
                    continue;
                }
                if is_transparent_for_ownership(child_role_name, version) {
                    result.extend(classify_children(spec, arena, child_id, role, version));
                    continue;
                }
                result.push(Owned::Other);
            }
            Some(DomNode::PSBlock(_)) => result.push(Owned::Block),
            _ => result.push(Owned::NoElement),
        }
    }
    result
}

/// TS `isRequiredOwnedElement()`: `query` is a role, or `"base > owning"`, a role whose closest
/// non-presentational descendants include the owning role.
fn is_required_owned_element(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    role_name: Option<&str>,
    query: &str,
    version: ARIAVersion,
) -> bool {
    let mut parts = query.split(" > ");
    let base_role = parts.next().unwrap_or_default();
    if role_name != Some(base_role) {
        return false;
    }
    let Some(owning_role) = parts.next().filter(|owning| !owning.is_empty()) else {
        return true;
    };
    closest_non_presentational_descendants(spec, arena, node_id, version)
        .iter()
        .any(|name| name.as_deref() == Some(owning_role))
}

/// TS `getClosestNonPresentationalDescendants()`: the role names (explicit, else implicit, with
/// no context check) of the child elements, looking through the transparent ones.
fn closest_non_presentational_descendants(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    version: ARIAVersion,
) -> Vec<Option<String>> {
    let mut owned = Vec::new();
    for child_id in child_nodes(arena, node_id) {
        if arena.get(child_id).and_then(DomNode::as_element).is_none() {
            continue;
        }
        // With `assume_single_node`, the computed role is the explicit role, else the implicit one.
        let name = get_computed_role(spec, arena, child_id, version, true)
            .role
            .map(|r| r.name);
        if is_transparent_for_ownership(name.as_deref(), version) {
            owned.extend(closest_non_presentational_descendants(spec, arena, child_id, version));
            continue;
        }
        owned.push(name);
    }
    owned
}

/// TS `isTransparentForOwnership()`.
fn is_transparent_for_ownership(role_name: Option<&str>, version: ARIAVersion) -> bool {
    match role_name {
        Some("presentation" | "none") => true,
        Some("generic") => version == ARIAVersion::V1_3,
        _ => false,
    }
}

/// TS `node.childNodes`: the pure child nodes, with a fragment and an `each` / `end` block
/// replaced by their own child nodes.
fn child_nodes(arena: &DomArena, node_id: NodeId) -> Vec<NodeId> {
    let mut nodes = Vec::new();
    for child_id in arena.pure_children_of(node_id) {
        let flatten = match arena.get(child_id) {
            Some(DomNode::Element(el)) => el.is_fragment,
            Some(DomNode::PSBlock(block)) => {
                block.is_fragment
                    || block.block_behavior.as_ref().is_some_and(|behavior| {
                        matches!(
                            behavior.behavior_type,
                            MLASTBlockBehaviorType::Each | MLASTBlockBehaviorType::End
                        )
                    })
            }
            _ => false,
        };
        if flatten {
            nodes.extend(child_nodes(arena, child_id));
        } else {
            nodes.push(child_id);
        }
    }
    nodes
}

/// TS `el.hasMutableChildren(true)`: below the element there is a preprocessor block without a
/// behavior, an element with a spread or dynamic attribute, or a `<slot>`.
fn has_mutable_children(arena: &DomArena, node_id: NodeId) -> bool {
    arena
        .pure_children_of(node_id)
        .into_iter()
        .any(|child_id| match arena.get(child_id) {
            Some(DomNode::PSBlock(block)) => block.block_behavior.is_none(),
            Some(DomNode::Element(el)) => {
                el.attributes.iter().any(|attr| match attr {
                    MLASTAttr::Spread(_) => true,
                    MLASTAttr::HTMLAttr(attr) => attr.is_dynamic_value == Some(true),
                }) || has_mutable_children(arena, child_id)
                    || element_local_name(el) == "slot"
            }
            _ => false,
        })
}

/// TS `mayBeBeforeCreated()`: every child node is whitespace-only text, or every child element is
/// a `<script>` or a `<template>`.
fn may_be_before_created(arena: &DomArena, node_id: NodeId) -> bool {
    let children = child_nodes(arena, node_id);
    let blank = children.iter().all(|&child_id| match arena.get(child_id) {
        Some(DomNode::Text(text)) => text.base.raw.chars().all(is_js_whitespace),
        _ => false,
    });
    if blank {
        return true;
    }
    children
        .iter()
        .filter_map(|&child_id| arena.get(child_id).and_then(DomNode::as_element))
        .all(|el| matches!(element_local_name(el).as_str(), "script" | "template"))
}
