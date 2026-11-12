//! `require-owned-elements` rule: report an element whose role has allowed accessibility child
//! roles (WAI-ARIA 1.2 "Required Owned Elements") but which owns none of them.
//!
//! Ports `packages/@markuplint/rules/src/require-owned-elements/` and its checker
//! `wai-aria/checkings/required-owned-elements.ts`.
//!
//! For a pretended component, the owned elements are the ones the component renders: its own
//! `contents` around the children given at the usage site (none for `slots: null`). A single
//! slot wrapper sits between the component and those nodes and is checked as well (its role
//! stands on its own); several slot wrappers leave the owner of each node unknown, so nothing is
//! claimed. A report on the wrapper, which is not in the source, goes to the component.
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
//!
//! The owned nodes are the ones the page renders. A host owns the child nodes of its declarative
//! shadow root, of either mode, and not its light children, which only a `slot` of the shadow root
//! places ([`crate::slot_assignment`]): the nodes a `slot` takes are owned as if they were its
//! children (the fallback children when it takes none), and a `slot` whose assignment is not known,
//! or one that takes a node that may be something else at runtime, leaves the ownership unknown.
//! A `template` that may declare a shadow root without the markup telling it, or a block of a
//! template language that may enclose it, leaves the owned nodes unknown as well.

use markuplint_core::i18n::Primitive as Kw;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::get_attr_value;
use markuplint_dom::node::DomNode;
use markuplint_dom::pretender::PretenderContext;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::computed_role::{ResolvedRole, get_computed_role};
use crate::aria_check::{ElementContext, ElementGate, element_local_name, is_js_whitespace, walk_elements};
use crate::helpers::{has_mutable_attributes, has_mutable_children_with};
use crate::rule::{Rule, RuleConfigSet};
use crate::slot_assignment::{composed_parent_element, get_assigned_nodes, is_slot_element, shadow_root_template};
use crate::slot_content::{content_owner, expand_children, is_content_mutable, slot_content};
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
            |(), ctx, violations| {
                let role = get_computed_role(ctx.spec, ctx.arena, ctx.node_id, ctx.version, false).role;
                violations.extend(check(ctx, ctx.node_id, role.as_ref()));
                // The slot wrapper of a pretended component is not in the document, so the walk
                // never reaches it, yet it owns the children given to the component. The
                // component places it, so no context is asked of its parent.
                let wrapper = content_owner(ctx.arena, ctx.node_id);
                if wrapper != ctx.node_id {
                    let role = get_computed_role(ctx.spec, ctx.arena, wrapper, ctx.version, true).role;
                    violations.extend(check(ctx, wrapper, role.as_ref()));
                }
            },
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
    /// A pretended component whose rendered children cannot be known.
    Unknown,
}

/// TS `checkingRequiredOwnedElements` for `node_id` — the element of `ctx`, or its virtual slot
/// wrapper — with its computed `role`. A violation is reported on the element of `ctx`.
fn check(ctx: &ElementContext<'_>, node_id: NodeId, role: Option<&ResolvedRole>) -> Option<Violation> {
    let role = role?;
    let child_roles = &role.allowed_accessibility_child_roles;
    if child_roles.is_empty() {
        return None;
    }
    if is_busy(ctx.arena, node_id) {
        return None;
    }

    let owned_children = owned_child_nodes(ctx.spec, ctx.arena, node_id);
    let owned = classify_children(ctx.spec, ctx.arena, node_id, owned_children.clone(), role, ctx.version);
    if owned
        .iter()
        .any(|o| matches!(o, Owned::Busy | Owned::Unknown | Owned::Required | Owned::Block))
    {
        return None;
    }
    // A virtual slot wrapper stands for the component, whose nodes are the ones given to it.
    let component = match ctx.arena.get(node_id).and_then(DomNode::as_element) {
        Some(el) => match el.pretender_context {
            Some(PretenderContext::Origin { origin }) => origin,
            _ => node_id,
        },
        None => node_id,
    };
    if is_owned_content_mutable(ctx.spec, ctx.arena, component) {
        return None;
    }

    let tr = ctx.tr;
    let required = match child_roles.as_slice() {
        [single] => tr.t("the \"{0*}\" {1}", &[Kw::S(single), Kw::S("role")]),
        several => format!(
            "{}: {}",
            tr.t("the {0}", &[Kw::S("roles")]),
            tr.t_list(&crate::create_message::no_translate_all(several), false)
        ),
    };
    let message = if may_be_before_created(ctx.arena, &owned_children.unwrap_or_default()) {
        tr.t(
            "{0}. Or, {1}",
            &[
                Kw::S(&tr.t(
                    "{0} requires {1}",
                    &[Kw::S(&tr.t("the {0}", &[Kw::S("child element")])), Kw::S(&required)],
                )),
                Kw::S(&tr.t("require {0*}", &[Kw::S("aria-busy=\"true\"")])),
            ],
        )
    } else {
        tr.t(
            "{0} expects {1}",
            &[
                Kw::S(&tr.t("the \"{0*}\" {1}", &[Kw::S(&role.name), Kw::S("role")])),
                Kw::S(&required),
            ],
        )
    };
    Some(ctx.element_violation(tr.finish(&message)))
}

/// TS `el.matches('[aria-busy="true" i]')`.
fn is_busy(arena: &DomArena, node_id: NodeId) -> bool {
    get_attr_value(arena, node_id, "aria-busy").is_some_and(|value| value.eq_ignore_ascii_case("true"))
}

/// TS `classifyChildren()`: how each of `children`, the nodes `node_id` owns (`None` when they are not
/// known), bears on the requirement.
fn classify_children(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    children: Option<Vec<NodeId>>,
    role: &ResolvedRole,
    version: ARIAVersion,
) -> Vec<Owned> {
    let Some(children) = children else {
        return vec![Owned::Unknown];
    };
    let mut result = Vec::new();
    for child_id in children {
        match arena.get(child_id) {
            Some(DomNode::Element(_)) => {
                if is_busy(arena, child_id) {
                    result.push(Owned::Busy);
                    continue;
                }
                if is_slot_element(arena, child_id) {
                    result.extend(classify_slot(spec, arena, child_id, role, version));
                    continue;
                }
                // The role of a child is resolved against its parent in the accessibility tree. A
                // child that a pretender places somewhere other than under its parent (a node given
                // at the usage site that the component renders inside its slot wrapper, or an
                // element a fragment component renders in place) would be judged against the
                // wrong parent and lose its role, so it is resolved on its own.
                let assume_single_node = composed_parent_element(arena, spec, child_id) != Some(node_id);
                let child_role = get_computed_role(spec, arena, child_id, version, assume_single_node).role;
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
                    let scope = match shadow_root_template_of(spec, arena, child_id) {
                        ShadowTemplate::Unknown => None,
                        ShadowTemplate::Template(template) => Some(template),
                        ShadowTemplate::None => Some(child_id),
                    };
                    if let Some(scope) = scope
                        && is_content_mutable(arena, scope)
                    {
                        result.push(Owned::Unknown);
                        continue;
                    }
                    result.extend(classify_children(
                        spec,
                        arena,
                        child_id,
                        owned_child_nodes(spec, arena, child_id),
                        role,
                        version,
                    ));
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

/// TS `classifySlot()`: what a `slot` among the owned nodes places. A slot of unknown assignment, and
/// one that takes a node that may be something else at runtime, leave the ownership unknown; one that
/// takes none stands for its own children.
fn classify_slot(
    spec: &MLMLSpec,
    arena: &DomArena,
    slot: NodeId,
    role: &ResolvedRole,
    version: ARIAVersion,
) -> Vec<Owned> {
    let Some(assigned) = get_assigned_nodes(arena, spec, slot) else {
        return vec![Owned::Unknown];
    };
    if assigned.is_empty() {
        return classify_children(spec, arena, slot, owned_child_nodes(spec, arena, slot), role, version);
    }
    let mutable = assigned.iter().any(|&node| {
        arena.get(node).and_then(DomNode::as_element).is_some_and(|el| {
            has_mutable_attributes(el)
                || has_mutable_children_with(arena, node, true, &|slot| is_flattened_slot(arena, slot))
        })
    });
    if mutable {
        return vec![Owned::Unknown];
    }
    classify_children(spec, arena, slot, Some(assigned), role, version)
}

/// TS `isFlattenedSlot`: a `slot` that is flattened out of the child nodes (a fragment) is the only one
/// counted as mutable among the descendants: the rest are read through the assignment.
fn is_flattened_slot(arena: &DomArena, slot: NodeId) -> bool {
    arena
        .get(slot)
        .and_then(DomNode::as_element)
        .is_some_and(|el| el.is_fragment)
}

/// TS `isOwnedContentMutable()`: whether what `el` owns may be rendered by something that is not known:
/// a shadow root that may or may not be declared, a block without a behavior, an element with a mutable
/// attribute, a component, or a pretender whose `contents` are unknown, in the shadow root or in the
/// children.
fn is_owned_content_mutable(spec: &MLMLSpec, arena: &DomArena, el: NodeId) -> bool {
    let scope = match shadow_root_template_of(spec, arena, el) {
        ShadowTemplate::Unknown => return true,
        ShadowTemplate::Template(template) => template,
        ShadowTemplate::None => el,
    };
    has_mutable_children_with(arena, scope, true, &|slot| is_flattened_slot(arena, slot))
        || is_content_mutable(arena, scope)
}

/// TS `getShadowRootTemplate()` of the checker: the `template` element that declares the shadow root of
/// a host, as far as the markup tells.
enum ShadowTemplate {
    /// The host has no shadow root.
    None,
    /// The host has one, but where it is declared is not known.
    Unknown,
    Template(NodeId),
}

fn shadow_root_template_of(spec: &MLMLSpec, arena: &DomArena, host: NodeId) -> ShadowTemplate {
    let Some(template) = shadow_root_template(arena, spec, host) else {
        return ShadowTemplate::None;
    };
    // A block without a behavior may be a marker of a language whose blocks the syntax tree does
    // not nest (`{% if %}` ... `{% endif %}`), so whether it encloses the `template` is not known.
    if arena
        .pure_children_of(host)
        .into_iter()
        .any(|child| matches!(arena.get(child), Some(DomNode::PSBlock(block)) if block.block_behavior.is_none()))
    {
        return ShadowTemplate::Unknown;
    }
    if arena.child_nodes(host).contains(&template) {
        if arena.get(template).and_then(DomNode::parent_id) != Some(host) {
            return ShadowTemplate::Unknown;
        }
        if arena
            .conditional_child_nodes(host)
            .iter()
            .all(|branch| branch.contains(&template))
        {
            return ShadowTemplate::Template(template);
        }
    }
    ShadowTemplate::Unknown
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
    for child_id in arena.child_nodes(node_id) {
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

/// TS `getOwnedChildNodes()`: the child nodes `node_id` owns as the page renders them.
///
/// For a pretended component, what it renders (its `contents` around the nodes given to it,
/// none of which for `slots: null`), not what is written at the usage site. A single slot
/// wrapper that differs from the component sits between them: the component owns the wrapper,
/// and the wrapper owns the filled nodes. Several slot wrappers leave the owner of each node
/// unknown (`None`).
fn owned_child_nodes(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId) -> Option<Vec<NodeId>> {
    // The content of the `template` is the shadow root, and holds the same nodes as its children.
    match shadow_root_template_of(spec, arena, node_id) {
        ShadowTemplate::Unknown => return None,
        ShadowTemplate::Template(template) => {
            return Some(expand_children(arena, template, arena.child_nodes(template)));
        }
        ShadowTemplate::None => {}
    }
    let el = arena.get(node_id).and_then(DomNode::as_element);
    if let Some(pretended) = el.and_then(|el| el.pretended()) {
        if let Some(content) = &pretended.slot_content {
            let wrapper = content.wrapper?;
            if wrapper != node_id {
                return Some(vec![wrapper]);
            }
        }
        let given = arena.pretender_given_children(node_id).unwrap_or_default();
        return Some(expand_children(arena, node_id, given));
    }

    // The virtual slot wrapper has no child nodes of its own.
    if let Some(PretenderContext::Origin { origin }) = el.and_then(|el| el.pretender_context.as_ref())
        && slot_content(arena, *origin).and_then(|content| content.wrapper) == Some(node_id)
    {
        let given = arena.pretender_given_children(*origin).unwrap_or_default();
        return Some(expand_children(arena, *origin, given));
    }

    Some(expand_children(arena, node_id, arena.child_nodes(node_id)))
}

/// TS `mayBeBeforeCreated()`: every child node is whitespace-only text, or every child element is
/// a `<script>` or a `<template>`.
fn may_be_before_created(arena: &DomArena, children: &[NodeId]) -> bool {
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
