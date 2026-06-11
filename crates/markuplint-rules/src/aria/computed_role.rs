//! Ports `packages/@markuplint/ml-spec/src/algorithm/aria/get-computed-role.ts`.

use std::collections::HashSet;

use markuplint_core::mlast::NamespaceURI;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_types::spec::aria::{self, ARIAVersion};
use markuplint_types::spec::types::{ARIARoleInSchema, MLMLSpec};

use super::may_be_focusable;

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

    let tag_name: &str = &el.base.node_name.to_ascii_lowercase();

    // Step 1: Get explicit role
    let explicit = get_explicit_role(spec, arena, node_id, tag_name, version);

    // Step 2: Get implicit role (lazy — only if explicit fails)
    let (computed_role, error_type) = if explicit.role.is_some() {
        (explicit.role.clone(), explicit.error_type.clone())
    } else {
        let implicit = get_implicit_role(spec, arena, node_id, tag_name, version);
        let error_type = if explicit.error_type == Some(RoleComputationError::NoExplicit) {
            None
        } else {
            explicit.error_type.clone()
        };
        (implicit.role, error_type)
    };

    // Step 3: Early return for single node assumption
    if assume_single_node {
        return ComputedRole {
            role: computed_role,
            error_type: Some(error_type.unwrap_or(RoleComputationError::NoOwner)),
        };
    }

    let Some(ref role) = computed_role else {
        return ComputedRole { role: None, error_type };
    };

    // Step 4: Required context role validation
    if !role.required_accessibility_parent_role.is_empty()
        && !is_native_context_intact(spec, arena, node_id, role, version)
    {
        if let Some(parent_id) = node.parent_id() {
            let ancestor_role = get_non_presentational_ancestor(spec, arena, parent_id, version, visited);
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
            let _ = ancestor_role;
        } else {
            return ComputedRole {
                role: None,
                error_type: Some(RoleComputationError::NoOwner),
            };
        }
    }

    // Step 5: SVG accessibility tree inclusion
    if el.namespace == NamespaceURI::SVG && explicit.role.is_none() && !has_svg_accessible_name_source(arena, node_id) {
        return ComputedRole { role: None, error_type };
    }

    // Step 6: Presentational Roles Conflict Resolution
    if is_presentational(&role.name) {
        let implicit = get_implicit_role(spec, arena, node_id, tag_name, version);

        // 6a: Interactive element override
        if may_be_focusable::may_be_focusable(spec, arena, node_id) && !is_disabled_or_hidden(arena, node_id) {
            return ComputedRole {
                role: implicit.role,
                error_type: Some(RoleComputationError::InteractiveElementMustNotBePresentational),
            };
        }

        // 6b: Global ARIA property override
        if has_global_aria_property(spec, arena, node_id, version) {
            return ComputedRole {
                role: implicit.role,
                error_type: Some(RoleComputationError::GlobalPropMustNotBePresentational),
            };
        }
    }

    ComputedRole {
        role: computed_role,
        error_type,
    }
}

// ============================================================
// Explicit role
// ============================================================

fn get_explicit_role(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    tag_name: &str,
    version: ARIAVersion,
) -> ComputedRole {
    let Some(role_attr) = helpers::get_attr_value(arena, node_id, "role") else {
        return ComputedRole {
            role: None,
            error_type: Some(RoleComputationError::NoExplicit),
        };
    };

    // TS getExplicitRole checks: exists → not abstract → permitted → valid landmark
    let mut last_error = RoleComputationError::NoExplicit;

    let (permitted, any_permitted) = resolve_permitted_roles(spec, arena, node_id, tag_name);

    for token in role_attr.split_whitespace() {
        let role_name = token.to_ascii_lowercase();

        let Some(role_spec) = aria::get_role_spec(spec, &role_name, version) else {
            last_error = RoleComputationError::RoleNoExists;
            continue;
        };

        if role_spec.is_abstract.unwrap_or(false) {
            last_error = RoleComputationError::Abstract;
            continue;
        }

        // Check permitted roles (TS: if (!permittedRoles.some(r => r.name === roleName)))
        // Note: presentation/none are handled in Presentational Roles Conflict
        // Resolution (later in computeRole), not rejected here.
        let is_presentational = role_name == "presentation" || role_name == "none";
        if !is_presentational
            && !any_permitted
            && !permitted
                .as_ref()
                .is_some_and(|roles| roles.iter().any(|r| r.eq_ignore_ascii_case(&role_name)))
        {
            last_error = RoleComputationError::NoPermitted;
            continue;
        }

        if is_landmark_role(spec, &role_name, version)
            && !is_valid_landmark_role(arena, node_id, &role_name, spec, version)
        {
            last_error = RoleComputationError::InvalidLandmark;
            continue;
        }

        return ComputedRole {
            role: Some(resolved_from_spec(role_spec, false)),
            error_type: None,
        };
    }

    ComputedRole {
        role: None,
        error_type: Some(last_error),
    }
}

/// Mirrors TS `getARIA()` condition evaluation for `permittedRoles`.
/// Returns (condition-resolved permitted roles, any-role-permitted flag).
pub fn resolve_permitted_roles(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    tag_name: &str,
) -> (Option<Vec<String>>, bool) {
    let base_permitted = aria::get_base_permitted_roles(spec, tag_name);
    let base_any = aria::is_any_role_permitted(spec, tag_name);

    let Some(el_spec) = markuplint_types::spec::lookup::get_spec(spec, tag_name) else {
        return (base_permitted, base_any);
    };

    let mut permitted = base_permitted;
    let mut any_permitted = base_any;

    if let Some(ref conditions) = el_spec.aria.conditions {
        for (selector_str, override_value) in conditions {
            let Ok(selector) = markuplint_selector::parser::parse(selector_str) else {
                continue;
            };
            if !markuplint_selector::matcher::matches(&selector, arena, node_id, None, Some(spec), None) {
                continue;
            }
            if let Some(obj) = override_value.as_object()
                && let Some(cond_roles) = obj.get("permittedRoles")
            {
                if cond_roles.as_bool() == Some(true) {
                    any_permitted = true;
                } else if let Some(arr) = cond_roles.as_array() {
                    permitted = Some(arr.iter().filter_map(|v| v.as_str().map(ToString::to_string)).collect());
                    any_permitted = false;
                }
            }
        }
    }

    // TS getPermittedRoles adds the implicit role to the permitted list.
    // This ensures setting the implicit role explicitly is always allowed
    // (e.g., <h1 role="heading"> — "heading" is permitted because it's the implicit role).
    if !any_permitted && let Some(implicit) = aria::get_base_implicit_role(spec, tag_name).map(str::to_string) {
        let roles = permitted.get_or_insert_with(Vec::new);
        if !roles.iter().any(|r| r.eq_ignore_ascii_case(&implicit)) {
            roles.push(implicit);
        }
    }

    (permitted, any_permitted)
}

// ============================================================
// Implicit role
// ============================================================

fn get_implicit_role(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    tag_name: &str,
    version: ARIAVersion,
) -> ComputedRole {
    // Check conditions in ElementARIA.conditions FIRST (before base implicit role).
    // Elements like <td>/<th> have implicitRole:false but condition-based overrides
    // that set the implicit role based on context (e.g., cell when inside table).
    // Conditions must be checked even when base implicit role is None/false.
    if let Some(el_spec) = markuplint_types::spec::lookup::get_spec(spec, tag_name)
        && let Some(ref conditions) = el_spec.aria.conditions
    {
        for (selector_str, override_value) in conditions {
            if let Ok(selector) = markuplint_selector::parser::parse(selector_str)
                && markuplint_selector::matcher::matches(&selector, arena, node_id, None, Some(spec), None)
                && let Some(override_obj) = override_value.as_object()
                && let Some(override_role) = override_obj.get("implicitRole")
            {
                if let Some(false) = override_role.as_bool() {
                    return ComputedRole {
                        role: None,
                        error_type: None,
                    };
                }
                if let Some(newrole_name) = override_role.as_str()
                    && let Some(new_spec) = aria::get_role_spec(spec, newrole_name, version)
                {
                    return ComputedRole {
                        role: Some(resolved_from_spec(new_spec, true)),
                        error_type: None,
                    };
                }
            }
        }
    }

    let Some(role_name) = aria::get_base_implicit_role(spec, tag_name) else {
        return ComputedRole {
            role: None,
            error_type: None,
        };
    };

    let Some(role_spec) = aria::get_role_spec(spec, role_name, version) else {
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

fn get_non_presentational_ancestor(
    spec: &MLMLSpec,
    arena: &DomArena,
    start_id: NodeId,
    version: ARIAVersion,
    visited: &mut HashSet<NodeId>,
) -> ComputedRole {
    let mut current = Some(start_id);
    while let Some(id) = current {
        if !visited.insert(id) {
            break; // Cycle detection
        }
        let cr = compute_role(spec, arena, id, version, false, visited);
        if let Some(ref role) = cr.role {
            if !is_transparent_for_ownership(&role.name, version) {
                return cr;
            }
        } else {
            return cr;
        }
        current = arena.get(id).and_then(markuplint_dom::node::DomNode::parent_id);
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

        let mut current_id = arena
            .get(owned_el_id)
            .and_then(markuplint_dom::node::DomNode::parent_id);
        let mut all_matched = true;

        for &expected_role in &reversed {
            loop {
                let Some(id) = current_id else {
                    all_matched = false;
                    break;
                };
                let cr = compute_role(spec, arena, id, version, false, visited);
                current_id = arena.get(id).and_then(markuplint_dom::node::DomNode::parent_id);

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
    let Some(parent_id) = arena.get(node_id).and_then(markuplint_dom::node::DomNode::parent_id) else {
        return false;
    };
    if helpers::get_attr_value(arena, parent_id, "role").is_some() {
        return false;
    }
    let parent_cr = get_computed_role(spec, arena, parent_id, version, true);
    parent_cr.role.is_some()
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
    // Landmark requires accessible name if accessibleNameRequired && accessibleNameFromAuthor
    if role_spec.accessible_name_required != Some(true) || role_spec.accessible_name_from_author != Some(true) {
        return true;
    }
    helpers::has_attr(arena, node_id, "aria-label") || helpers::has_attr(arena, node_id, "aria-labelledby")
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

fn has_global_aria_property(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> bool {
    let Some(el) = arena.get(node_id).and_then(|n| n.as_element()) else {
        return false;
    };
    let aria_spec = aria::get_aria_spec(spec, version);
    for attr in &el.attributes {
        if let markuplint_core::mlast::MLASTAttr::HTMLAttr(html_attr) = attr
            && aria_spec
                .props
                .iter()
                .any(|p| p.is_global == Some(true) && p.name == html_attr.node_name)
        {
            return true;
        }
    }
    false
}

fn is_disabled_or_hidden(arena: &DomArena, node_id: NodeId) -> bool {
    let mut current = Some(node_id);
    while let Some(id) = current {
        if helpers::has_attr(arena, id, "disabled")
            || helpers::has_attr(arena, id, "inert")
            || helpers::has_attr(arena, id, "hidden")
        {
            return true;
        }
        current = arena.get(id).and_then(markuplint_dom::node::DomNode::parent_id);
    }
    false
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
    fn not_permitted_role_falls_back_to_implicit() {
        let s = spec();
        // TS getExplicitRole checks permitted roles. "heading" is NOT permitted
        // on <a href>, so it falls back to the implicit role "link".
        let (arena, id) = make_arena("a", &[("role", "heading"), ("href", "#")]);
        let cr = get_computed_role(&s, &arena, id, ARIAVersion::V1_3, false);
        // Should fall back to implicit "link" because "heading" is not permitted
        assert_eq!(cr.role.as_ref().map(|r| r.name.as_str()), Some("link"));
        assert!(cr.role.as_ref().unwrap().is_implicit);
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
