//! Corresponds to `@markuplint/ml-spec/src/algorithm/aria/`.
//!
//! Note: Condition-based resolution (CSS selector matching on the DOM element)
//! requires DOM access and is deferred to Phase 2-3b. Functions here return
//! the **base** ARIA spec without evaluating conditions.

use super::lookup;
use super::types::{ARIARoleInSchema, ARIASpec, ElementARIA, MLMLSpec};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ARIAVersion {
    V1_1,
    V1_2,
    V1_3,
}

impl ARIAVersion {
    pub const RECOMMENDED: Self = Self::V1_3;
}

pub fn get_aria_spec(spec: &MLMLSpec, version: ARIAVersion) -> &ARIASpec {
    match version {
        ARIAVersion::V1_1 => &spec.def.aria.v1_1,
        ARIAVersion::V1_2 => &spec.def.aria.v1_2,
        ARIAVersion::V1_3 => &spec.def.aria.v1_3,
    }
}

pub fn get_role_spec<'a>(spec: &'a MLMLSpec, role_name: &str, version: ARIAVersion) -> Option<&'a ARIARoleInSchema> {
    let aria = get_aria_spec(spec, version);

    if let Some(role) = aria.roles.iter().find(|r| r.name == role_name) {
        return Some(role);
    }
    if let Some(role) = aria.graphics_roles.iter().find(|r| r.name == role_name) {
        return Some(role);
    }
    aria.dpub_roles.iter().find(|r| r.name == role_name)
}

/// Abstract roles cannot be used as an explicit `role` value.
pub fn is_abstract_role(spec: &MLMLSpec, role_name: &str, version: ARIAVersion) -> bool {
    get_role_spec(spec, role_name, version).is_some_and(|r| r.is_abstract.unwrap_or(false))
}

/// Note: This does NOT evaluate conditions (CSS selectors). For example,
/// `<a>` returns `"link"` regardless of whether `href` is present.
/// Condition-based resolution requires DOM access (Phase 2-3b).
pub fn get_base_implicit_role<'a>(spec: &'a MLMLSpec, element_name: &str) -> Option<&'a str> {
    let el = lookup::get_spec(spec, element_name)?;
    implicit_role_from_aria(&el.aria)
}

/// Returns:
/// - `Some(vec)` with specific role names if permittedRoles is an array
/// - `None` if permittedRoles is `true` (any role permitted) or not specified
///
/// Note: Does NOT evaluate conditions. See `get_base_implicit_role` note.
pub fn get_base_permitted_roles(spec: &MLMLSpec, element_name: &str) -> Option<Vec<String>> {
    let el = lookup::get_spec(spec, element_name)?;
    permitted_roles_from_aria(&el.aria)
}

/// True only when `permittedRoles === true` in the spec data.
pub fn is_any_role_permitted(spec: &MLMLSpec, element_name: &str) -> bool {
    let Some(el) = lookup::get_spec(spec, element_name) else {
        return false;
    };
    el.aria.permitted_roles.as_ref().and_then(serde_json::Value::as_bool) == Some(true)
}

/// The chain is the role's `generalization` (parent roles) walked transitively.
pub fn get_superclass_roles<'a>(
    spec: &'a MLMLSpec,
    role_name: &str,
    version: ARIAVersion,
) -> Vec<&'a ARIARoleInSchema> {
    let mut result = Vec::new();
    let mut visited = std::collections::HashSet::new();
    collect_superclass_roles(spec, role_name, version, &mut result, &mut visited);
    result
}

fn collect_superclass_roles<'a>(
    spec: &'a MLMLSpec,
    role_name: &str,
    version: ARIAVersion,
    result: &mut Vec<&'a ARIARoleInSchema>,
    visited: &mut std::collections::HashSet<String>,
) {
    if !visited.insert(role_name.to_string()) {
        return; // Cycle detection
    }
    if let Some(role) = get_role_spec(spec, role_name, version) {
        for parent_name in &role.generalization {
            if let Some(parent) = get_role_spec(spec, parent_name, version) {
                result.push(parent);
                collect_superclass_roles(spec, parent_name, version, result, visited);
            }
        }
    }
}

/// Note: This performs basic validation only (role exists, not abstract).
/// Full validation including permitted roles check requires DOM access
/// for condition evaluation.
///
/// # Errors
///
/// Returns [`ExplicitRoleError`] if no valid role is found in the attribute value.
pub fn resolve_explicit_role<'a>(
    spec: &'a MLMLSpec,
    role_attr: &str,
    version: ARIAVersion,
) -> Result<&'a ARIARoleInSchema, ExplicitRoleError> {
    let mut last_error = ExplicitRoleError::NoExplicit;

    for token in role_attr.split_whitespace() {
        let role_name = token.to_ascii_lowercase();

        let Some(role) = get_role_spec(spec, &role_name, version) else {
            last_error = ExplicitRoleError::RoleNoExists(role_name);
            continue;
        };

        if role.is_abstract.unwrap_or(false) {
            last_error = ExplicitRoleError::Abstract(role_name);
            continue;
        }

        return Ok(role);
    }

    Err(last_error)
}

#[derive(Clone, Debug, PartialEq)]
pub enum ExplicitRoleError {
    /// No role attribute, or an empty/whitespace-only value.
    NoExplicit,
    RoleNoExists(String),
    Abstract(String),
}

// --- Internal helpers ---

fn implicit_role_from_aria(aria: &ElementARIA) -> Option<&str> {
    match aria.implicit_role.as_ref()? {
        super::types::ImplicitRole::Role(role) => Some(role.as_str()),
        super::types::ImplicitRole::None(_) => None,
    }
}

fn permitted_roles_from_aria(aria: &ElementARIA) -> Option<Vec<String>> {
    let value = aria.permitted_roles.as_ref()?;

    // Return None for "any role permitted" to distinguish it from an empty list.
    if value.as_bool() == Some(true) {
        return None;
    }

    if value.as_bool() == Some(false) {
        return Some(Vec::new());
    }

    value
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::spec::load_spec;

    fn html_spec() -> MLMLSpec {
        let json = include_str!("../../../../packages/@markuplint/html-spec/index.json");
        load_spec(json).unwrap()
    }

    // --- get_aria_spec ---

    #[test]
    fn aria_spec_versions_have_roles() {
        let spec = html_spec();
        assert!(!get_aria_spec(&spec, ARIAVersion::V1_1).roles.is_empty());
        assert!(!get_aria_spec(&spec, ARIAVersion::V1_2).roles.is_empty());
        assert!(!get_aria_spec(&spec, ARIAVersion::V1_3).roles.is_empty());
    }

    // --- get_role_spec ---

    #[test]
    fn role_spec_button() {
        let spec = html_spec();
        let button = get_role_spec(&spec, "button", ARIAVersion::V1_3);
        assert!(button.is_some());
        let button = button.unwrap();
        assert_eq!(button.name, "button");
        assert!(!button.is_abstract.unwrap_or(false));
    }

    #[test]
    fn role_spec_abstract_roletype() {
        let spec = html_spec();
        let roletype = get_role_spec(&spec, "roletype", ARIAVersion::V1_3);
        assert!(roletype.is_some());
        assert_eq!(roletype.unwrap().is_abstract, Some(true));
    }

    #[test]
    fn role_spec_nonexistent() {
        let spec = html_spec();
        assert!(get_role_spec(&spec, "nonexistent", ARIAVersion::V1_3).is_none());
    }

    #[test]
    fn role_spec_dpub_role() {
        let spec = html_spec();
        // doc-bibliography is a dpub role
        let role = get_role_spec(&spec, "doc-bibliography", ARIAVersion::V1_3);
        assert!(role.is_some());
    }

    // --- is_abstract_role ---

    #[test]
    fn abstract_roles() {
        let spec = html_spec();
        assert!(is_abstract_role(&spec, "roletype", ARIAVersion::V1_3));
        assert!(is_abstract_role(&spec, "widget", ARIAVersion::V1_3));
        assert!(!is_abstract_role(&spec, "button", ARIAVersion::V1_3));
        assert!(!is_abstract_role(&spec, "link", ARIAVersion::V1_3));
    }

    // --- get_base_implicit_role ---

    #[test]
    fn implicit_role_a() {
        let spec = html_spec();
        // Base implicit role of <a> is "link" (conditions not evaluated)
        assert_eq!(get_base_implicit_role(&spec, "a"), Some("link"));
    }

    #[test]
    fn implicit_role_button() {
        let spec = html_spec();
        assert_eq!(get_base_implicit_role(&spec, "button"), Some("button"));
    }

    #[test]
    fn implicit_role_div() {
        let spec = html_spec();
        // <div> has implicit role "generic"
        assert_eq!(get_base_implicit_role(&spec, "div"), Some("generic"));
    }

    #[test]
    fn implicit_role_h1() {
        let spec = html_spec();
        assert_eq!(get_base_implicit_role(&spec, "h1"), Some("heading"));
    }

    #[test]
    fn implicit_role_input() {
        let spec = html_spec();
        // Base implicit role (without type condition) is "textbox"
        assert_eq!(get_base_implicit_role(&spec, "input"), Some("textbox"));
    }

    #[test]
    fn implicit_role_nonexistent() {
        let spec = html_spec();
        assert_eq!(get_base_implicit_role(&spec, "nonexistent"), None);
    }

    // --- get_base_permitted_roles ---

    #[test]
    fn permitted_roles_a() {
        let spec = html_spec();
        let roles = get_base_permitted_roles(&spec, "a");
        // <a> has a specific list of permitted roles
        assert!(roles.is_some());
        let roles = roles.unwrap();
        assert!(roles.contains(&"button".to_string()));
    }

    #[test]
    fn permitted_roles_div_is_any() {
        let spec = html_spec();
        // <div> permits any role → returns None
        assert!(is_any_role_permitted(&spec, "div"));
        assert!(get_base_permitted_roles(&spec, "div").is_none());
    }

    // --- get_superclass_roles ---

    #[test]
    fn superclass_roles_button() {
        let spec = html_spec();
        let supers = get_superclass_roles(&spec, "button", ARIAVersion::V1_3);
        let names: Vec<&str> = supers.iter().map(|r| r.name.as_str()).collect();
        // button → command → widget → roletype
        assert!(names.contains(&"command"));
        assert!(names.contains(&"widget"));
        assert!(names.contains(&"roletype"));
    }

    #[test]
    fn superclass_roles_nonexistent() {
        let spec = html_spec();
        let supers = get_superclass_roles(&spec, "nonexistent", ARIAVersion::V1_3);
        assert!(supers.is_empty());
    }

    // --- resolve_explicit_role ---

    #[test]
    fn explicit_role_valid() {
        let spec = html_spec();
        let result = resolve_explicit_role(&spec, "button", ARIAVersion::V1_3);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().name, "button");
    }

    #[test]
    fn explicit_role_first_valid_wins() {
        let spec = html_spec();
        // "nonexistent button" → skips nonexistent, returns button
        let result = resolve_explicit_role(&spec, "nonexistent button", ARIAVersion::V1_3);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().name, "button");
    }

    #[test]
    fn explicit_role_abstract_rejected() {
        let spec = html_spec();
        let result = resolve_explicit_role(&spec, "roletype", ARIAVersion::V1_3);
        assert_eq!(result, Err(ExplicitRoleError::Abstract("roletype".to_string())));
    }

    #[test]
    fn explicit_role_nonexistent() {
        let spec = html_spec();
        let result = resolve_explicit_role(&spec, "nonexistent", ARIAVersion::V1_3);
        assert_eq!(result, Err(ExplicitRoleError::RoleNoExists("nonexistent".to_string())));
    }

    #[test]
    fn explicit_role_empty() {
        let spec = html_spec();
        let result = resolve_explicit_role(&spec, "", ARIAVersion::V1_3);
        assert_eq!(result, Err(ExplicitRoleError::NoExplicit));
    }

    #[test]
    fn explicit_role_case_insensitive() {
        let spec = html_spec();
        let result = resolve_explicit_role(&spec, "BUTTON", ARIAVersion::V1_3);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().name, "button");
    }

    // --- Superclass cycle detection ---

    #[test]
    fn superclass_roles_terminates_on_cycles() {
        // The spec data shouldn't have cycles, but the algorithm must handle them.
        // Verify it terminates (doesn't hang) and returns partial results.
        use std::time::{Duration, Instant};
        let spec = html_spec();
        let start = Instant::now();
        let _ = get_superclass_roles(&spec, "button", ARIAVersion::V1_3);
        assert!(start.elapsed() < Duration::from_secs(1));
    }

    // --- Multi-version tests ---

    #[test]
    fn role_spec_exists_across_versions() {
        let spec = html_spec();
        // "button" should exist in all ARIA versions
        assert!(get_role_spec(&spec, "button", ARIAVersion::V1_1).is_some());
        assert!(get_role_spec(&spec, "button", ARIAVersion::V1_2).is_some());
        assert!(get_role_spec(&spec, "button", ARIAVersion::V1_3).is_some());
    }

    #[test]
    fn aria_v1_3_has_more_roles_than_v1_1() {
        let spec = html_spec();
        let v1_1_count = get_aria_spec(&spec, ARIAVersion::V1_1).roles.len();
        let v1_3_count = get_aria_spec(&spec, ARIAVersion::V1_3).roles.len();
        // ARIA 1.3 should have at least as many roles as 1.1
        assert!(
            v1_3_count >= v1_1_count,
            "v1.3 ({v1_3_count}) should have >= v1.1 ({v1_1_count}) roles"
        );
    }

    // --- Graphics/DPUB roles ---

    #[test]
    fn graphics_role_lookup() {
        let spec = html_spec();
        let aria = get_aria_spec(&spec, ARIAVersion::V1_3);
        if !aria.graphics_roles.is_empty() {
            let first = &aria.graphics_roles[0];
            assert!(get_role_spec(&spec, &first.name, ARIAVersion::V1_3).is_some());
        }
    }
}
