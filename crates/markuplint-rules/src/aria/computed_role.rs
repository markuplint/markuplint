//! Ports `packages/@markuplint/ml-spec/src/algorithm/aria/get-computed-role.ts`.

use std::collections::HashSet;

use markuplint_core::mlast::NamespaceURI;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_dom::node::ElementData;
use markuplint_types::spec::aria::{self, ARIAVersion};
use markuplint_types::spec::types::{ARIARoleInSchema, MLMLSpec};

use super::may_be_focusable;
use crate::slot_assignment::{accessibility_parent_element, composed_ancestors_inclusive, composed_parent_element};

// ============================================================
// Public types
// ============================================================

#[derive(Clone, Debug)]
pub struct ComputedRole {
    pub role: Option<ResolvedRole>,
    pub error_type: Option<RoleComputationError>,
}

#[derive(Clone, Debug)]
#[allow(clippy::struct_excessive_bools)]
pub struct ResolvedRole {
    pub name: String,
    pub is_implicit: bool,
    /// TS `deprecated: !!role.deprecated`.
    pub deprecated: bool,
    pub accessible_name_required: bool,
    pub accessible_name_from_author: bool,
    pub children_presentational: bool,
    pub required_accessibility_parent_role: Vec<String>,
    pub allowed_accessibility_child_roles: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RoleComputationError {
    Abstract,
    GlobalPropMustNotBePresentational,
    ImplicitRoleNamespaceError,
    InteractiveElementMustNotBePresentational,
    InvalidLandmark,
    InvalidRequiredContextRole,
    NoExplicit,
    NoOwner,
    NoPermitted,
    RequiredOwnedElementMustNotBePresentational,
    RoleNoExists,
}

// ============================================================
// Public API
// ============================================================

/// `assume_single_node`: if `true`, skip ancestor context validation (for fragment checks).
pub fn get_computed_role(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    version: ARIAVersion,
    assume_single_node: bool,
) -> ComputedRole {
    compute_role(spec, arena, node_id, version, assume_single_node, &mut HashSet::new())
}

// ============================================================
// Core algorithm
// ============================================================

fn compute_role(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    version: ARIAVersion,
    assume_single_node: bool,
    visited: &mut HashSet<NodeId>,
) -> ComputedRole {
    let Some(node) = arena.get(node_id) else {
        return ComputedRole {
            role: None,
            error_type: None,
        };
    };
    let Some(el) = node.as_element() else {
        return ComputedRole {
            role: None,
            error_type: None,
        };
    };

    // Step 1: the explicit role, else the implicit one
    let explicit = get_explicit_role(spec, arena, node_id, el, version);
    let mut lazy_implicit: Option<ComputedRole> = None;
    let (computed_role, error_type) = if explicit.role.is_some() {
        (explicit.role.clone(), explicit.error_type.clone())
    } else {
        let implicit = get_implicit_role(spec, arena, node_id, el, version);
        let error_type = if explicit.error_type == Some(RoleComputationError::NoExplicit) {
            None
        } else {
            explicit.error_type.clone()
        };
        let role = implicit.role.clone();
        lazy_implicit = Some(implicit);
        (role, error_type)
    };

    // Step 2: for a single node, no context is checked
    if assume_single_node {
        return ComputedRole {
            role: computed_role,
            error_type: Some(RoleComputationError::NoOwner),
        };
    }

    // Step 3: the required context role
    if let Some(ref role) = computed_role
        && !role.required_accessibility_parent_role.is_empty()
        && !is_native_context_intact(spec, arena, node_id, role, version)
    {
        // TS `getComposedParentElement(el) === null`: an element at the root (of a fragment, or
        // under the document, or at the top of the content of an ordinary `template`) cannot
        // satisfy the requirement, and keeps its role, reported as `NoOwner`.
        if composed_parent_element(arena, spec, node_id).is_none() {
            return ComputedRole {
                role: computed_role,
                error_type: Some(RoleComputationError::NoOwner),
            };
        }
        if get_non_presentational_ancestor(spec, arena, node_id, version, visited)
            .role
            .is_none()
        {
            return ComputedRole {
                role: None,
                error_type: Some(RoleComputationError::NoOwner),
            };
        }
        if !matches_context_role(
            &role.required_accessibility_parent_role,
            spec,
            arena,
            node_id,
            version,
            visited,
        ) {
            return ComputedRole {
                role: None,
                error_type: Some(RoleComputationError::InvalidRequiredContextRole),
            };
        }
    }

    // Step 4: an SVG element without a role of its own or a source of a name is not in the tree
    if explicit.role.is_none() && el.namespace == NamespaceURI::SVG && !has_svg_accessible_name_source(arena, node_id) {
        return ComputedRole {
            role: None,
            error_type: None,
        };
    }

    // Step 5: Presentational Roles Conflict Resolution
    if computed_role
        .as_ref()
        .is_some_and(|role| !is_presentational(&role.name))
    {
        return ComputedRole {
            role: computed_role,
            error_type,
        };
    }
    let implicit = lazy_implicit.unwrap_or_else(|| get_implicit_role(spec, arena, node_id, el, version));
    resolve_presentational_conflict(
        spec,
        arena,
        node_id,
        explicit.role.is_some(),
        implicit,
        version,
        visited,
    )
    .unwrap_or(ComputedRole {
        role: computed_role,
        error_type,
    })
}

/// The Presentational Roles Conflict Resolution of an element without a role or with a
/// presentational one: the implicit role with the reason the role is ignored, or `None` when
/// none of the exceptions applies.
///
/// <https://w3c.github.io/aria/#conflict_resolution_presentation_none>
fn resolve_presentational_conflict(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    has_explicit_role: bool,
    implicit: ComputedRole,
    version: ARIAVersion,
    visited: &mut HashSet<NodeId>,
) -> Option<ComputedRole> {
    // 5a. A focusable element is exposed with its implicit role, unless it or an ancestor is
    // disabled, inert or hidden (WAI-ARIA, conflict resolution of none/presentation).
    if may_be_focusable::may_be_focusable(spec, arena, node_id)
        && !some_ancestors(spec, arena, node_id, |id| is_enabled_attr(spec, arena, id, "disabled"))
        && !some_ancestors(spec, arena, node_id, |id| is_enabled_attr(spec, arena, id, "inert"))
        && !some_ancestors(spec, arena, node_id, |id| is_enabled_attr(spec, arena, id, "hidden"))
    {
        return Some(ComputedRole {
            role: implicit.role,
            error_type: Some(RoleComputationError::InteractiveElementMustNotBePresentational),
        });
    }

    // 5b. A required owned element of the non-presentational ancestor ignores an explicit
    // presentational role.
    if has_explicit_role {
        let ancestor = get_non_presentational_ancestor(spec, arena, node_id, version, visited);
        if let Some(ancestor_role) = ancestor.role
            && ancestor_role.allowed_accessibility_child_roles.iter().any(|expected| {
                is_required_owned_element(spec, arena, node_id, implicit.role.as_ref(), expected, version)
            })
        {
            return Some(ComputedRole {
                role: implicit.role,
                error_type: Some(RoleComputationError::RequiredOwnedElementMustNotBePresentational),
            });
        }
    }

    // 5c. A global ARIA property makes the element exposed with its implicit role.
    if has_global_aria_property(spec, arena, node_id, version) {
        return Some(ComputedRole {
            role: implicit.role,
            error_type: Some(RoleComputationError::GlobalPropMustNotBePresentational),
        });
    }

    None
}

/// TS `someAncestors`: the element or one of its ancestors in the accessibility tree
/// ([`composed_parent_element`]).
fn some_ancestors(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId, predicate: impl FnMut(NodeId) -> bool) -> bool {
    composed_ancestors_inclusive(arena, spec, node_id).any(predicate)
}

/// TS `isEnabledAttr`: the element has the attribute, and its spec defines it.
fn is_enabled_attr(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId, attr_name: &str) -> bool {
    let Some(el) = arena.get(node_id).and_then(|n| n.as_element()) else {
        return false;
    };
    crate::attr_name_key::attr_specs_of(spec, el)
        .is_some_and(|specs| specs.iter().any(|attr| attr.name.as_deref() == Some(attr_name)))
        && helpers::has_attr(arena, node_id, attr_name)
}

/// TS `isRequiredOwnedElement`: whether an element of `role` is the required owned element
/// `query` (`row`, or `group > row` for a `group` that owns a `row`).
pub(crate) fn is_required_owned_element(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    role: Option<&ResolvedRole>,
    query: &str,
    version: ARIAVersion,
) -> bool {
    let mut parts = query.split(" > ");
    let base_role = parts.next().unwrap_or_default();
    if role.map(|r| r.name.as_str()) != Some(base_role) {
        return false;
    }
    let Some(owning_role) = parts.next() else {
        return true;
    };
    closest_non_presentational_descendants(spec, arena, node_id, version)
        .iter()
        .any(|name| name.as_deref() == Some(owning_role))
}

/// TS `getClosestNonPresentationalDescendants()`: the role names (explicit, else implicit, with
/// no context check) of the child elements, looking through the transparent ones.
pub(crate) fn closest_non_presentational_descendants(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    version: ARIAVersion,
) -> Vec<Option<String>> {
    let mut owned = Vec::new();
    for child_id in arena.child_nodes(node_id) {
        if arena
            .get(child_id)
            .and_then(markuplint_dom::node::DomNode::as_element)
            .is_none()
        {
            continue;
        }
        let name = get_computed_role(spec, arena, child_id, version, true)
            .role
            .map(|r| r.name);
        if name
            .as_deref()
            .is_some_and(|name| is_transparent_for_ownership(name, version))
        {
            owned.extend(closest_non_presentational_descendants(spec, arena, child_id, version));
            continue;
        }
        owned.push(name);
    }
    owned
}

// ============================================================
// Explicit role
// ============================================================

/// TS `el.localName`: lower-cased for an element of the HTML namespace, as written (as the
/// parser restored its case) for SVG and `MathML`.
fn local_name(el: &ElementData) -> String {
    if el.namespace == NamespaceURI::XHTML {
        el.base.node_name.to_ascii_lowercase()
    } else {
        el.base.node_name.clone()
    }
}

/// TS `getARIA()` for the element, with its conditions matched through the ARIA resolver as
/// `el.matches` does (`:aria(has name)` on `<section>`). Computing a name asks for the role of the
/// same element again; that nested evaluation matches without the resolver, so it terminates.
fn element_aria(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    el: &ElementData,
    version: ARIAVersion,
) -> Option<crate::aria_check::ResolvedElementARIA> {
    let spec_resolver = crate::aria_resolver_impl::SpecAriaResolver { spec };
    let guard = ConditionGuard::enter(node_id);
    let resolver: Option<&dyn markuplint_selector::aria_resolver::AriaResolver> =
        if guard.nested { None } else { Some(&spec_resolver) };
    crate::aria_check::get_element_aria_with(spec, arena, node_id, &local_name(el), version, resolver)
}

/// TS `getPermittedRoles()`: the roles the element may take explicitly. `true` is every
/// non-abstract core and DPUB role, an AAM object the non-abstract roles of the mappings it
/// names, and the implicit role is added (with its synonym) unless the spec says `false`.
fn permitted_role_names(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    el: &ElementData,
    version: ARIAVersion,
) -> Vec<String> {
    use crate::aria_check::PermittedRoles;

    let Some(element_aria) = element_aria(spec, arena, node_id, el, version) else {
        return Vec::new();
    };
    let specs = aria::get_aria_spec(spec, version);
    let non_abstract = |roles: &[ARIARoleInSchema]| -> Vec<String> {
        roles
            .iter()
            .filter(|r| r.is_abstract != Some(true))
            .map(|r| r.name.clone())
            .collect()
    };
    let mut names: Vec<String> = match &element_aria.permitted_roles {
        PermittedRoles::Any => {
            let mut all = non_abstract(&specs.roles);
            all.extend(non_abstract(&specs.dpub_roles));
            all
        }
        PermittedRoles::Aam { core_aam, graphics_aam } => {
            let mut all = Vec::new();
            if *core_aam {
                all.extend(non_abstract(&specs.roles));
            }
            if *graphics_aam {
                all.extend(non_abstract(&specs.graphics_roles));
            }
            all
        }
        PermittedRoles::Roles(roles) => roles.iter().map(|r| r.name.clone()).collect(),
        PermittedRoles::Nothing => return Vec::new(),
    };
    if let Some(implicit) = element_aria.implicit_role.as_deref() {
        let implicit_roles: &[&str] = match implicit {
            "presentation" | "none" => &["none", "presentation"],
            "img" | "image" if version == ARIAVersion::V1_3 => &["image", "img"],
            other => &[other],
        };
        names.extend(implicit_roles.iter().map(|r| (*r).to_owned()));
    }
    names
}

/// HTML elements that the user agent style sheet never renders (`display: none`), and
/// `input[type=hidden]`. `area` is rendered through its image map; the state-dependent rules
/// (`[hidden]`, `noscript` with scripting) are left out, as TS `isNeverRendered` leaves them.
///
/// <https://html.spec.whatwg.org/multipage/rendering.html#hidden-elements>
const NEVER_RENDERED_HTML_ELEMENTS: &[&str] = &[
    "base", "basefont", "datalist", "head", "link", "meta", "noembed", "noframes", "param", "rp", "script", "style",
    "template", "title",
];

/// TS `isNeverRendered`: an element of the HTML namespace that is never in the accessibility tree.
fn is_never_rendered(arena: &DomArena, node_id: NodeId, el: &ElementData) -> bool {
    if el.namespace != NamespaceURI::XHTML {
        return false;
    }
    let name = local_name(el);
    if NEVER_RENDERED_HTML_ELEMENTS.contains(&name.as_str()) {
        return true;
    }
    name == "input"
        && helpers::get_attr_value(arena, node_id, "type").is_some_and(|t| t.trim().eq_ignore_ascii_case("hidden"))
}

/// TS `getExplicitRole()`: the WAI-ARIA "Handling Author Errors" algorithm. The first token of
/// `role` that names a non-abstract role, a landmark with the name it requires, is the role. A
/// role that ARIA in HTML does not permit on the element is kept with `NoPermitted`, as user
/// agents still expose it, except on an element that is never rendered.
///
/// - <https://w3c.github.io/aria/#document-handling_author-errors>
/// - <https://w3c.github.io/core-aam/#mapping_conflicts>
fn get_explicit_role(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    el: &ElementData,
    version: ARIAVersion,
) -> ComputedRole {
    let Some(role_value) = helpers::get_attr_value(arena, node_id, "role") else {
        return ComputedRole {
            role: None,
            error_type: Some(RoleComputationError::NoExplicit),
        };
    };
    let role_value = role_value.to_lowercase();
    let permitted = permitted_role_names(spec, arena, node_id, el, version);
    let is_svg = el.namespace == NamespaceURI::SVG;
    let mut error = RoleComputationError::NoExplicit;

    for role_name in role_value.split_whitespace() {
        let Some(role_spec) = aria::get_role_spec_for_element(spec, role_name, version, is_svg) else {
            error = RoleComputationError::RoleNoExists;
            continue;
        };
        if role_spec.is_abstract.unwrap_or(false) {
            error = RoleComputationError::Abstract;
            continue;
        }
        if is_landmark_role(spec, role_name, version)
            && !is_valid_landmark_role(arena, node_id, role_name, spec, version)
        {
            error = RoleComputationError::InvalidLandmark;
            continue;
        }
        if !permitted.iter().any(|name| name == role_name) {
            if is_never_rendered(arena, node_id, el) {
                error = RoleComputationError::NoPermitted;
                continue;
            }
            return ComputedRole {
                role: Some(resolved_from_spec(role_spec, false)),
                error_type: Some(RoleComputationError::NoPermitted),
            };
        }
        return ComputedRole {
            role: Some(resolved_from_spec(role_spec, false)),
            error_type: None,
        };
    }

    ComputedRole {
        role: None,
        error_type: Some(error),
    }
}

// ============================================================
// Implicit role
// ============================================================

thread_local! {
    static EVALUATING_CONDITIONS: std::cell::RefCell<HashSet<NodeId>> = std::cell::RefCell::new(HashSet::new());
}

/// Marks `node_id` as having its implicit-role conditions evaluated, so a nested evaluation for the
/// same element (reached through the accessible name) can be detected.
struct ConditionGuard {
    node_id: NodeId,
    nested: bool,
}

impl ConditionGuard {
    fn enter(node_id: NodeId) -> Self {
        let nested = EVALUATING_CONDITIONS.with(|active| !active.borrow_mut().insert(node_id));
        Self { node_id, nested }
    }
}

impl Drop for ConditionGuard {
    fn drop(&mut self) {
        if !self.nested {
            EVALUATING_CONDITIONS.with(|active| {
                active.borrow_mut().remove(&self.node_id);
            });
        }
    }
}

/// TS `getImplicitRole()`: the `implicitRole` of `getARIA()`, looked up among the roles of the
/// element's namespace (the graphics roles for SVG). An implicit role the namespace does not
/// have is `ImplicitRoleNamespaceError`.
fn get_implicit_role(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    el: &ElementData,
    version: ARIAVersion,
) -> ComputedRole {
    let Some(role_name) = element_aria(spec, arena, node_id, el, version).and_then(|aria| aria.implicit_role) else {
        return ComputedRole {
            role: None,
            error_type: None,
        };
    };
    let is_svg = el.namespace == NamespaceURI::SVG;
    let Some(role_spec) = aria::get_role_spec_for_element(spec, &role_name, version, is_svg) else {
        return ComputedRole {
            role: None,
            error_type: Some(RoleComputationError::ImplicitRoleNamespaceError),
        };
    };
    ComputedRole {
        role: Some(resolved_from_spec(role_spec, true)),
        error_type: None,
    }
}

// ============================================================
// Context role validation
// ============================================================

/// TS `getNonPresentationalAncestor()`: the computed role of the closest ancestor of `node_id` in the
/// accessibility tree ([`accessibility_parent_element`]) whose role is not transparent for ownership.
/// From ARIA 1.3 the role of an ancestor is computed as for a single node.
fn get_non_presentational_ancestor(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    version: ARIAVersion,
    visited: &mut HashSet<NodeId>,
) -> ComputedRole {
    let assume_single_node = version == ARIAVersion::V1_3;
    let mut current = accessibility_parent_element(arena, spec, node_id);
    while let Some(id) = current {
        if !visited.insert(id) {
            break; // Cycle detection
        }
        let cr = compute_role(spec, arena, id, version, assume_single_node, visited);
        visited.remove(&id);
        if !cr
            .role
            .as_ref()
            .is_some_and(|role| is_transparent_for_ownership(&role.name, version))
        {
            return cr;
        }
        current = accessibility_parent_element(arena, spec, id);
    }
    ComputedRole {
        role: None,
        error_type: None,
    }
}

fn matches_context_role(
    conditions: &[String],
    spec: &MLMLSpec,
    arena: &DomArena,
    owned_el_id: NodeId,
    version: ARIAVersion,
    visited: &mut HashSet<NodeId>,
) -> bool {
    for condition in conditions {
        let chain: Vec<&str> = condition.split(" > ").collect();
        let reversed: Vec<&str> = chain.into_iter().rev().collect();

        let mut current_id = accessibility_parent_element(arena, spec, owned_el_id);
        let mut all_matched = true;

        for &expected_role in &reversed {
            loop {
                let Some(id) = current_id else {
                    all_matched = false;
                    break;
                };
                let cr = compute_role(spec, arena, id, version, false, visited);
                current_id = accessibility_parent_element(arena, spec, id);

                if let Some(ref role) = cr.role {
                    if is_transparent_for_ownership(&role.name, version) {
                        continue;
                    }
                    if role.name == expected_role {
                        break;
                    }
                }
                all_matched = false;
                break;
            }
            if !all_matched {
                break;
            }
        }

        if all_matched {
            return true;
        }
    }
    false
}

/// TS `isNativeContextIntact()`: an implicit role whose parent has no explicit role and has a
/// role is in the context its element gives it.
fn is_native_context_intact(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    role: &ResolvedRole,
    version: ARIAVersion,
) -> bool {
    if !role.is_implicit {
        return false;
    }
    let Some(parent_id) = accessibility_parent_element(arena, spec, node_id) else {
        return false;
    };
    let Some(parent) = arena.get(parent_id).and_then(|n| n.as_element()) else {
        return false;
    };
    if get_explicit_role(spec, arena, parent_id, parent, version)
        .role
        .is_some()
    {
        return false;
    }
    get_computed_role(spec, arena, parent_id, version, false).role.is_some()
}

// ============================================================
// Helpers
// ============================================================

fn resolved_from_spec(role_spec: &ARIARoleInSchema, is_implicit: bool) -> ResolvedRole {
    // Normalize ARIA 1.1/1.2 field names to 1.3 equivalents
    let parent_roles = if role_spec.required_accessibility_parent_role.is_empty() {
        role_spec.required_context_role.clone()
    } else {
        role_spec.required_accessibility_parent_role.clone()
    };
    let child_roles = if role_spec.allowed_accessibility_child_roles.is_empty() {
        role_spec.required_owned_elements.clone()
    } else {
        role_spec.allowed_accessibility_child_roles.clone()
    };

    ResolvedRole {
        name: role_spec.name.clone(),
        is_implicit,
        deprecated: role_spec.deprecated.unwrap_or(false),
        accessible_name_required: role_spec.accessible_name_required.unwrap_or(false),
        accessible_name_from_author: role_spec.accessible_name_from_author.unwrap_or(false),
        children_presentational: role_spec.children_presentational.unwrap_or(false),
        required_accessibility_parent_role: parent_roles,
        allowed_accessibility_child_roles: child_roles,
    }
}

fn is_presentational(role_name: &str) -> bool {
    role_name == "presentation" || role_name == "none"
}

fn is_transparent_for_ownership(role_name: &str, version: ARIAVersion) -> bool {
    if is_presentational(role_name) {
        return true;
    }
    if version == ARIAVersion::V1_3 && role_name == "generic" {
        return true;
    }
    false
}

fn is_landmark_role(spec: &MLMLSpec, role_name: &str, version: ARIAVersion) -> bool {
    let supers = aria::get_superclass_roles(spec, role_name, version);
    supers.iter().any(|r| r.name == "landmark")
}

/// TS `isValidLandmarkRole()`: a landmark that requires a name has one from its author, a
/// non-empty `aria-label` or an `aria-labelledby` whose id (as written, or with its character
/// references resolved) is in the document.
fn is_valid_landmark_role(
    arena: &DomArena,
    node_id: NodeId,
    role_name: &str,
    spec: &MLMLSpec,
    version: ARIAVersion,
) -> bool {
    let Some(role_spec) = aria::get_role_spec(spec, role_name, version) else {
        return true;
    };
    if role_spec.accessible_name_required != Some(true) {
        return true;
    }
    if role_spec.accessible_name_from_author == Some(true) {
        if helpers::get_attr_value(arena, node_id, "aria-label").is_some_and(|label| !label.is_empty()) {
            return true;
        }
        let ids = helpers::get_attr_value(arena, node_id, "aria-labelledby").unwrap_or_default();
        if ids.split_whitespace().any(|id| {
            helpers::find_element_by_id(arena, id).is_some()
                || crate::decode::decode_entities(id)
                    .is_some_and(|decoded| helpers::find_element_by_id(arena, &decoded).is_some())
        }) {
            return true;
        }
    }
    false
}

fn has_svg_accessible_name_source(arena: &DomArena, node_id: NodeId) -> bool {
    helpers::has_attr(arena, node_id, "aria-label")
        || helpers::has_attr(arena, node_id, "aria-labelledby")
        || has_child_element(arena, node_id, "title")
        || has_child_element(arena, node_id, "desc")
}

fn has_child_element(arena: &DomArena, node_id: NodeId, child_tag: &str) -> bool {
    arena.children_of(node_id).unwrap_or_default().iter().any(|&cid| {
        arena
            .get(cid)
            .and_then(|n| n.as_element())
            .is_some_and(|el| el.base.node_name.eq_ignore_ascii_case(child_tag))
    })
}

/// TS `props.some(p => p.isGlobal && el.hasAttribute(p.name))`.
fn has_global_aria_property(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> bool {
    aria::get_aria_spec(spec, version)
        .props
        .iter()
        .any(|p| p.is_global == Some(true) && helpers::has_attr(arena, node_id, &p.name))
}

// ============================================================
// Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::aria::is_exposed::tests::make_nested;
    use crate::aria::may_be_focusable::tests::make_arena;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn v6_named_section_is_region() {
        let s = spec();
        let (arena, id) = make_arena("section", &[("aria-label", "News")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("region"));
    }

    #[test]
    fn v6_named_form_is_form() {
        let s = spec();
        let (arena, id) = make_arena("form", &[("aria-label", "Search")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("form"));
    }

    #[test]
    fn v6_self_referencing_labelledby_terminates() {
        let s = spec();
        let (arena, id) = make_arena("section", &[("id", "a"), ("aria-labelledby", "a")]);
        // The name of the element depends on its own role; the only name source is itself and it
        // is empty, so the element is unnamed and has no implicit role.
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert!(cr.role.is_none());
    }

    #[test]
    fn v6_unnamed_section_has_no_role() {
        let s = spec();
        let (arena, id) = make_arena("section", &[]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert!(cr.role.is_none());
    }

    #[test]
    fn button_implicit_role() {
        let s = spec();
        let (arena, id) = make_arena("button", &[]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("button"));
        assert!(cr.role.as_ref().unwrap().is_implicit);
    }

    #[test]
    fn div_explicit_role_button() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "button")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("button"));
        assert!(!cr.role.as_ref().unwrap().is_implicit);
    }

    #[test]
    fn div_implicit_role_generic() {
        let s = spec();
        let (arena, id) = make_arena("div", &[]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("generic"));
    }

    #[test]
    fn heading_implicit_role() {
        let s = spec();
        let (arena, id) = make_arena("h1", &[]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("heading"));
    }

    #[test]
    fn nonexistent_explicit_role() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "nonexistent")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        // Fallback to implicit "generic"
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("generic"));
        assert_eq!(cr.error_type, Some(RoleComputationError::RoleNoExists));
    }

    #[test]
    fn abstract_role_rejected() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "roletype")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("generic"));
        assert_eq!(cr.error_type, Some(RoleComputationError::Abstract));
    }

    #[test]
    fn multiple_roles_first_valid() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "nonexistent button")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("button"));
    }

    #[test]
    fn role_presentation() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "presentation")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("presentation"));
    }

    #[test]
    fn presentational_with_global_aria_overrides() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "presentation"), ("aria-label", "test")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        // Global ARIA property overrides presentational → implicit role
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("generic"));
        assert_eq!(
            cr.error_type,
            Some(RoleComputationError::GlobalPropMustNotBePresentational)
        );
    }

    #[test]
    fn presentational_focusable_button_overrides() {
        let s = spec();
        let (arena, id) = make_arena("button", &[("role", "presentation")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        // Button is focusable → presentational overridden to implicit "button"
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("button"));
        assert_eq!(
            cr.error_type,
            Some(RoleComputationError::InteractiveElementMustNotBePresentational)
        );
    }

    #[test]
    fn presentational_disabled_button_stays_presentational() {
        let s = spec();
        let (arena, id) = make_arena("button", &[("role", "presentation"), ("disabled", "")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        // Disabled → not focusable → stays presentational
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("presentation"));
    }

    #[test]
    fn assume_single_node_returns_no_owner() {
        let s = spec();
        let (arena, id) = make_arena("li", &[]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, true);
        assert!(cr.role.is_some());
        assert_eq!(cr.error_type, Some(RoleComputationError::NoOwner));
    }

    #[test]
    fn a_href_implicit_role_with_conditions() {
        let s = spec();
        // <a> with href should have implicit role "link"
        let (arena, id) = make_arena("a", &[("href", "https://example.com")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_3, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("link"));
    }

    #[test]
    fn a_without_href_role_with_conditions() {
        let s = spec();
        // <a> without href — condition ":not([href])" applies, implicitRole: "generic"
        let (arena, id) = make_arena("a", &[]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_3, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("generic"));
    }

    #[test]
    fn li_in_ul_context_role() {
        let s = spec();
        let (arena, child) = make_nested("ul", &[], "li", &[]);
        let cr = get_computed_role(&s, &arena, child, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("listitem"));
    }

    // --- QA review: additional coverage ---

    #[test]
    fn role_none_same_as_presentation() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "none")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("none"));
    }

    #[test]
    fn role_none_focusable_overrides_to_implicit() {
        let s = spec();
        let (arena, id) = make_arena("button", &[("role", "none")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("button"));
        assert_eq!(
            cr.error_type,
            Some(RoleComputationError::InteractiveElementMustNotBePresentational)
        );
    }

    #[test]
    fn presentational_with_inert_stays_presentational() {
        let s = spec();
        let (arena, id) = make_arena("button", &[("role", "presentation"), ("inert", "")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("presentation"));
    }

    #[test]
    fn presentational_with_hidden_stays_presentational() {
        let s = spec();
        let (arena, id) = make_arena("button", &[("role", "presentation"), ("hidden", "")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("presentation"));
    }

    #[test]
    fn global_aria_live_overrides_presentational() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "presentation"), ("aria-live", "polite")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_2, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("generic"));
        assert_eq!(
            cr.error_type,
            Some(RoleComputationError::GlobalPropMustNotBePresentational)
        );
    }

    #[test]
    fn not_permitted_role_is_kept() {
        let s = spec();
        // "heading" is not permitted on <a href>, but user agents still expose it (Core-AAM), so
        // it is the role, with `NoPermitted`.
        let (arena, id) = make_arena("a", &[("role", "heading"), ("href", "#")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_3, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("heading"));
        assert!(!cr.role.as_ref().unwrap().is_implicit);
        assert_eq!(cr.error_type, Some(RoleComputationError::NoPermitted));
    }

    #[test]
    fn condition_override_with_multiple_conditions() {
        let s = spec();
        // <aside> without accessible name in ARIA 1.3 might have different role
        let (arena, id) = make_arena("aside", &[]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_3, false);
        // aside has conditional implicit role based on context
        assert!(cr.role.is_some());
    }

    #[test]
    fn input_implicit_role_is_textbox() {
        let s = spec();
        let (arena, id) = make_arena("input", &[]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_3, false);
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("textbox"));
    }

    #[test]
    fn select_implicit_role() {
        let s = spec();
        let (arena, id) = make_arena("select", &[]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_3, false);
        // select has implicit role "combobox" or "listbox"
        assert!(cr.role.is_some());
    }
}
