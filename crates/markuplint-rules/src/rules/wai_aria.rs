//! `wai-aria` rule: validate WAI-ARIA role, states, and properties.
//!
//! Implements:
//! 1. Unknown role detection (role value not in ARIA spec)
//! 2. Abstract role detection (role value is abstract)
//! 3. Deprecated ARIA property detection (checkingDeprecatedProps)
//! 4. Permitted roles check (permittedAriaRoles)
//! 5. disallowSetImplicitRole
//! 6. version option
//! 7. checkingDeprecatedRole
//! 8. disallowSetImplicitProps
//! 9. checkingValue
//! 10. Other options (config reading + stubs/partial)

use std::fmt::Write;

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_types::spec::aria::{self, ARIAVersion};
use markuplint_types::spec::types::{ARIAAttributeValue, MLMLSpec};

use crate::aria::computed_role::{ResolvedRole, RoleComputationError, get_computed_role};
use crate::aria::may_be_focusable;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct WaiAria;

impl Rule for WaiAria {
    fn id(&self) -> &'static str {
        "wai-aria"
    }

    #[allow(clippy::too_many_lines)]
    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if el.is_ghost {
                continue;
            }

            let version = resolve_version(&rule_config.options);
            let el_name_lc = el.base.node_name.to_ascii_lowercase();
            let el_name = el_name_lc.as_str();

            let mut role_attr: Option<&markuplint_core::mlast::MLASTHTMLAttr> = None;
            let mut aria_attrs: Vec<&markuplint_core::mlast::MLASTHTMLAttr> = Vec::new();

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                if html_attr.node_name.eq_ignore_ascii_case("role") {
                    role_attr = Some(html_attr);
                } else if html_attr.node_name.to_ascii_lowercase().starts_with("aria-") {
                    aria_attrs.push(html_attr);
                }
            }

            if let Some(role_attr_node) = role_attr {
                check_role_attr(
                    spec,
                    arena,
                    node_id,
                    el_name,
                    role_attr_node,
                    version,
                    &rule_config.options,
                    &mut violations,
                    self.id(),
                    rule_config.severity,
                );
            }

            // Matches TS `getComputedRole`: the full role includes the implicit role.
            let computed = get_computed_role(spec, arena, node_id, version, false);
            let computed_role = computed.role.as_ref();
            let computed_role_spec = computed_role.and_then(|cr| aria::get_role_spec(spec, &cr.name, version));

            if let Some(role_attr_node) = role_attr {
                check_required_prop(
                    spec,
                    arena,
                    node_id,
                    el,
                    role_attr_node,
                    computed_role,
                    computed_role_spec,
                    version,
                    &mut violations,
                    self.id(),
                    rule_config.severity,
                );
            }

            let role_value = role_attr.map(|a| a.value.raw.as_str());
            let resolved_role = role_value.and_then(|rv| aria::resolve_explicit_role(spec, rv, version).ok());

            if !is_option_disabled(&rule_config.options, "checkingDeprecatedProps") {
                for aria_attr in &aria_attrs {
                    check_deprecated_prop(
                        spec,
                        aria_attr,
                        resolved_role,
                        version,
                        &mut violations,
                        self.id(),
                        rule_config.severity,
                    );
                }
            }

            // checkingDisallowedProp: always called (TS calls it unconditionally)
            // disallowSetImplicitProps controls only the element-specific without check inside
            {
                for aria_attr in &aria_attrs {
                    check_disallowed_prop(
                        spec,
                        arena,
                        node_id,
                        el,
                        aria_attr,
                        computed_role_spec,
                        version,
                        &rule_config.options,
                        &mut violations,
                        self.id(),
                        rule_config.severity,
                    );
                }
            }

            if is_option_enabled(&rule_config.options, "disallowSetImplicitProps", true) {
                let aria_spec = aria::get_aria_spec(spec, version);
                for aria_attr in &aria_attrs {
                    check_implicit_props(
                        spec,
                        arena,
                        node_id,
                        aria_attr,
                        el,
                        &aria_spec.props,
                        &mut violations,
                        self.id(),
                        rule_config.severity,
                    );
                }
            }

            // TS uses computed.role (which includes the implicit role) for conditional value resolution.
            if is_option_enabled(&rule_config.options, "checkingValue", true) {
                let aria_spec = aria::get_aria_spec(spec, version);
                for aria_attr in &aria_attrs {
                    check_value(
                        aria_attr,
                        computed_role_spec,
                        &aria_spec.props,
                        &mut violations,
                        self.id(),
                        rule_config.severity,
                    );
                }
            }

            if is_option_enabled(&rule_config.options, "disallowDefaultValue", false) {
                let aria_spec = aria::get_aria_spec(spec, version);
                for aria_attr in &aria_attrs {
                    check_default_value(
                        aria_attr,
                        &aria_spec.props,
                        &mut violations,
                        self.id(),
                        rule_config.severity,
                    );
                }
            }

            // `checkingRequiredOwnedElements` is a deprecated alias for
            // `checkingAllowedAccessibilityChildRoles`; either enables the check.
            if is_option_enabled(&rule_config.options, "checkingAllowedAccessibilityChildRoles", true)
                || is_option_enabled(&rule_config.options, "checkingRequiredOwnedElements", true)
            {
                check_allowed_child_roles(
                    spec,
                    arena,
                    node_id,
                    el,
                    version,
                    &mut violations,
                    self.id(),
                    rule_config.severity,
                );
            }

            if is_option_enabled(&rule_config.options, "checkingRequiredAccessibilityParentRole", true) {
                check_required_parent_role(
                    spec,
                    arena,
                    node_id,
                    el,
                    version,
                    &mut violations,
                    self.id(),
                    rule_config.severity,
                );
            }

            if is_option_enabled(&rule_config.options, "checkingPresentationalChildren", false) {
                check_presentational_children(
                    spec,
                    arena,
                    node_id,
                    el,
                    version,
                    &mut violations,
                    self.id(),
                    rule_config.severity,
                );
            }

            if is_option_enabled(&rule_config.options, "checkingInteractionInHidden", false) {
                check_interaction_in_hidden(spec, arena, node_id, &mut violations, self.id(), rule_config.severity);
            }
        }

        violations
    }
}

fn resolve_version(options: &serde_json::Value) -> ARIAVersion {
    match options.get("version").and_then(serde_json::Value::as_str) {
        Some("1.1") => ARIAVersion::V1_1,
        Some("1.2") => ARIAVersion::V1_2,
        Some("1.3") => ARIAVersion::V1_3,
        _ => ARIAVersion::RECOMMENDED,
    }
}

fn is_option_disabled(options: &serde_json::Value, key: &str) -> bool {
    options.get(key).and_then(serde_json::Value::as_bool) == Some(false)
}

fn is_option_enabled(options: &serde_json::Value, key: &str, default: bool) -> bool {
    options.get(key).and_then(serde_json::Value::as_bool).unwrap_or(default)
}

#[allow(clippy::too_many_arguments)]
fn check_role_attr(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    el_name: &str,
    role_attr_node: &markuplint_core::mlast::MLASTHTMLAttr,
    version: ARIAVersion,
    options: &serde_json::Value,
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: crate::violation::Severity,
) {
    let role_value = &role_attr_node.value.raw;

    for token in role_value.split_whitespace() {
        let role_name = token.to_ascii_lowercase();

        if aria::get_role_spec(spec, &role_name, version).is_none() {
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity,
                message: format!("The \"{token}\" role does not exist according to the WAI-ARIA specification."),
                line: role_attr_node.value.line,
                col: role_attr_node.value.col,
                raw: role_attr_node.raw.clone(),
                reason: None,
            });
            break;
        }

        if aria::is_abstract_role(spec, &role_name, version) {
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity,
                message: format!("The \"{token}\" role is the abstract role"),
                line: role_attr_node.value.line,
                col: role_attr_node.value.col,
                raw: role_attr_node.raw.clone(),
                reason: None,
            });
            break;
        }
    }

    if is_option_enabled(options, "checkingDeprecatedRole", true) {
        for token in role_value.split_whitespace() {
            let role_name = token.to_ascii_lowercase();
            if let Some(role_spec) = aria::get_role_spec(spec, &role_name, version)
                && role_spec.deprecated == Some(true)
            {
                violations.push(Violation {
                    rule_id: rule_id.to_string(),
                    name: None,
                    severity,
                    message: format!("The \"{token}\" role is deprecated"),
                    line: role_attr_node.value.line,
                    col: role_attr_node.value.col,
                    raw: role_attr_node.raw.clone(),
                    reason: None,
                });
                break;
            }
        }
    }

    let implicit_role = get_effective_implicit_role(spec, arena, node_id, el_name, version);
    let disallow_implicit = is_option_enabled(options, "disallowSetImplicitRole", true);

    // An explicit role equal to the implicit role is allowed unless `disallowSetImplicitRole`.
    if !is_option_disabled(options, "permittedAriaRoles") {
        let role_is_implicit = implicit_role.as_ref().is_some_and(|ir| {
            role_value
                .split_whitespace()
                .next()
                .is_some_and(|t| t.eq_ignore_ascii_case(ir))
        });
        if disallow_implicit || !role_is_implicit {
            check_permitted_roles(
                spec,
                arena,
                node_id,
                el_name,
                role_attr_node,
                version,
                violations,
                rule_id,
                severity,
            );
        }
    }

    if disallow_implicit && let Some(ref ir) = implicit_role {
        for token in role_value.split_whitespace() {
            if token.eq_ignore_ascii_case(ir) {
                violations.push(Violation {
                    rule_id: rule_id.to_string(),
                    name: None,
                    severity,
                    message: format!("The \"{token}\" role is the implicit role of the \"{el_name}\" element"),
                    line: role_attr_node.value.line,
                    col: role_attr_node.value.col,
                    raw: role_attr_node.raw.clone(),
                    reason: None,
                });
                break;
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn check_permitted_roles(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    element_name: &str,
    role_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    version: ARIAVersion,
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: crate::violation::Severity,
) {
    let (permitted, any_permitted) =
        crate::aria::computed_role::resolve_permitted_roles(spec, arena, node_id, element_name);

    if any_permitted {
        return;
    }

    // Match TS getPermittedRoles: add implicit role to permitted list
    let implicit_role = get_effective_implicit_role(spec, arena, node_id, element_name, version);
    let permitted = permitted.map(|mut roles| {
        if let Some(ref ir) = implicit_role {
            if !roles.iter().any(|r| r.eq_ignore_ascii_case(ir)) {
                roles.push(ir.clone());
            }
            // presentation/none synonyms
            if ir == "presentation" || ir == "none" {
                let other = if ir == "presentation" { "none" } else { "presentation" };
                if !roles.iter().any(|r| r.eq_ignore_ascii_case(other)) {
                    roles.push(other.to_string());
                }
            }
        }
        roles
    });

    match permitted {
        // permittedRoles is an empty list → no role override allowed
        Some(ref roles) if roles.is_empty() => {
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                    name: None,
                severity,
                message: format!(
                    "Cannot overwrite the role of the \"{element_name}\" element according to ARIA in HTML specification"
                ),
                line: role_attr.name.line,
                col: role_attr.name.col,
                raw: role_attr.raw.clone(),
            reason: None,
            });
        }
        Some(ref roles) => {
            let role_value = &role_attr.value.raw;
            for token in role_value.split_whitespace() {
                let role_name = token.to_ascii_lowercase();
                // Non-existent roles are already reported earlier, so only existing roles are checked here.
                if aria::get_role_spec(spec, &role_name, version).is_some()
                    && !roles.iter().any(|r| r.eq_ignore_ascii_case(&role_name))
                {
                    violations.push(Violation {
                        rule_id: rule_id.to_string(),
                    name: None,
                        severity,
                        message: format!(
                            "Cannot overwrite the \"{token}\" role to the \"{element_name}\" element according to ARIA in HTML specification"
                        ),
                        line: role_attr.value.line,
                        col: role_attr.value.col,
                        raw: role_attr.raw.clone(),
                    reason: None,
            });
                    break;
                }
            }
        }
        // None → any role permitted (true)
        None => {}
    }
}

/// Mirrors the condition evaluation in `computed_role.rs::get_implicit_role`,
/// but returns just the role name string.
fn get_effective_implicit_role(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    element_name: &str,
    version: ARIAVersion,
) -> Option<String> {
    let base_role = aria::get_base_implicit_role(spec, element_name)?;

    if let Some(el_spec) = markuplint_types::spec::lookup::get_spec(spec, element_name)
        && let Some(ref conditions) = el_spec.aria.conditions
    {
        for (selector_str, override_value) in conditions {
            if let Ok(selector) = markuplint_selector::parser::parse(selector_str)
                && markuplint_selector::matcher::matches(&selector, arena, node_id, None, Some(spec), None)
                && let Some(override_obj) = override_value.as_object()
                && let Some(override_role) = override_obj.get("implicitRole")
            {
                if let Some(false) = override_role.as_bool() {
                    return None;
                }
                if let Some(newrole_name) = override_role.as_str() {
                    // An override naming a non-existent role is ignored.
                    if aria::get_role_spec(spec, newrole_name, version).is_some() {
                        return Some(newrole_name.to_string());
                    }
                }
            }
        }
    }

    Some(base_role.to_string())
}

fn check_deprecated_prop(
    spec: &MLMLSpec,
    attr: &markuplint_core::mlast::MLASTHTMLAttr,
    role: Option<&markuplint_types::spec::types::ARIARoleInSchema>,
    version: ARIAVersion,
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: crate::violation::Severity,
) {
    let Some(role) = role else {
        return;
    };

    let attr_name = attr.node_name.to_ascii_lowercase();

    let owned_prop = role.owned_properties.iter().find(|p| p.name == attr_name);
    if let Some(prop) = owned_prop
        && prop.deprecated == Some(true)
    {
        let aria_spec = aria::get_aria_spec(spec, version);
        let prop_type = aria_spec
            .props
            .iter()
            .find(|p| p.name == attr_name)
            .map_or("property", |p| match p.prop_type {
                markuplint_types::spec::types::ARIAPropertyType::Property => "property",
                markuplint_types::spec::types::ARIAPropertyType::State => "state",
            });

        violations.push(Violation {
            rule_id: rule_id.to_string(),
            name: None,
            severity,
            message: format!(
                "The \"{attr_name}\" ARIA {prop_type} is deprecated on the \"{}\" role",
                role.name
            ),
            line: attr.name.line,
            col: attr.name.col,
            raw: attr.raw.clone(),
            reason: None,
        });
    }
}

/// Matches TS `checkingRequiredProp`. Implicit roles are skipped since the
/// browser provides default semantics.
#[allow(clippy::too_many_arguments)]
fn check_required_prop(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    el: &markuplint_dom::node::ElementData,
    _role_attr_node: &markuplint_core::mlast::MLASTHTMLAttr,
    computed_role: Option<&ResolvedRole>,
    role_spec: Option<&markuplint_types::spec::types::ARIARoleInSchema>,
    version: ARIAVersion,
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: crate::violation::Severity,
) {
    let Some(role) = computed_role else {
        return;
    };
    // Skip implicit roles — browser provides default semantics
    if role.is_implicit {
        return;
    }
    let Some(role_spec) = role_spec else {
        return;
    };

    let aria_spec = aria::get_aria_spec(spec, version);

    for owned in &role_spec.owned_properties {
        if owned.required != Some(true) {
            continue;
        }
        let has = el.attributes.iter().any(|attr| {
            let MLASTAttr::HTMLAttr(html_attr) = attr else {
                return false;
            };
            html_attr.node_name.eq_ignore_ascii_case(&owned.name)
        });
        if has {
            continue;
        }

        // Check for native HTML alternative via element ARIA spec properties.without
        let without = get_element_aria_without(spec, arena, node_id, &el.base.node_name, version);
        let alt_satisfied = without.iter().any(|w| {
            w.name == owned.name
                && w.alt_method.as_deref() == Some("set-attr")
                && w.alt_target.as_ref().is_some_and(|target| {
                    el.attributes.iter().any(|attr| {
                        let MLASTAttr::HTMLAttr(ha) = attr else {
                            return false;
                        };
                        ha.node_name.eq_ignore_ascii_case(target)
                    })
                })
        });
        if alt_satisfied {
            continue;
        }

        let prop_type = aria_spec
            .props
            .iter()
            .find(|p| p.name == owned.name)
            .map_or("property", |p| match p.prop_type {
                markuplint_types::spec::types::ARIAPropertyType::Property => "property",
                markuplint_types::spec::types::ARIAPropertyType::State => "state",
            });

        // TS reports at element scope (el.line/col), not at the role attribute
        violations.push(Violation {
            rule_id: rule_id.to_string(),
            name: None,
            severity,
            message: format!(
                "Require the \"{name}\" ARIA {prop_type} on the \"{role}\" role",
                name = owned.name,
                role = role.name,
            ),
            line: el.base.line,
            col: el.base.col,
            raw: el.base.raw.clone(),
            reason: None,
        });
    }
}

/// Check element-specific ARIA property restrictions (matching TS checkingDisallowedProp).
///
/// Checks whether an ARIA property or state is disallowed on the element per
/// ARIA in HTML specification. Also checks if property is supported by the role.
#[allow(clippy::too_many_arguments)]
fn check_disallowed_prop(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    el: &markuplint_dom::node::ElementData,
    attr: &markuplint_core::mlast::MLASTHTMLAttr,
    role_spec: Option<&markuplint_types::spec::types::ARIARoleInSchema>,
    version: ARIAVersion,
    options: &serde_json::Value,
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: crate::violation::Severity,
) {
    let Some(role) = role_spec else {
        return;
    };
    let attr_name = attr.node_name.to_ascii_lowercase();
    if !attr_name.starts_with("aria-") {
        return;
    }

    let aria_spec = aria::get_aria_spec(spec, version);
    let prop_spec = aria_spec.props.iter().find(|p| p.name == attr_name);
    let prop_type_str = prop_spec.map_or("property", |p| match p.prop_type {
        markuplint_types::spec::types::ARIAPropertyType::Property => "property",
        markuplint_types::spec::types::ARIAPropertyType::State => "state",
    });

    if is_option_enabled(options, "disallowSetImplicitProps", true) {
        let without = get_element_aria_without(spec, arena, node_id, &el.base.node_name, version);
        for w in &without {
            if w.name != attr_name {
                continue;
            }

            let has_native_attr = w.alt_method.as_deref() == Some("set-attr")
                && w.alt_target.as_ref().is_some_and(|target| {
                    el.attributes.iter().any(|a| {
                        let MLASTAttr::HTMLAttr(ha) = a else {
                            return false;
                        };
                        ha.node_name.eq_ignore_ascii_case(target)
                    })
                });

            let restriction_msg = match w.restriction_type.as_str() {
                "must-not" => format!(
                    "The \"{attr_name}\" ARIA {prop_type_str} must not use on the \"{}\" element",
                    el.base.node_name
                ),
                "should-not" => format!(
                    "The \"{attr_name}\" ARIA {prop_type_str} should not use on the \"{}\" element",
                    el.base.node_name
                ),
                _ => format!(
                    "The \"{attr_name}\" ARIA {prop_type_str} is not recommended to use on the \"{}\" element",
                    el.base.node_name
                ),
            };

            let alt_msg = if has_native_attr {
                format!(
                    ". As its state is already provided by the \"{}\" attribute",
                    w.alt_target.as_deref().unwrap_or("")
                )
            } else if let Some(ref target) = w.alt_target {
                match w.alt_method.as_deref() {
                    Some("remove-attr") => {
                        format!(". Remove the \"{target}\" attribute if you use the ARIA {prop_type_str}")
                    }
                    Some("set-attr") => format!(". Add the \"{target}\" attribute if you use the ARIA {prop_type_str}"),
                    _ => String::new(),
                }
            } else {
                String::new()
            };

            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity,
                message: format!("{restriction_msg}{alt_msg}"),
                line: attr.name.line,
                col: attr.name.col,
                raw: attr.raw.clone(),
                reason: None,
            });
            return;
        }
    }

    // Check if property is supported by the role.
    // Note: TS uses raw attr.name (case-sensitive) to match against ownedProperties.
    // This means uppercase ARIA attrs like "ARIA-LABEL" won't match "aria-label" in
    // ownedProperties and will be reported as disallowed. This appears to be a TS bug
    // (see memory: suspected_ts_bug_uppercase_aria.md) but we match TS behavior for now.
    // Use attr.name.raw to preserve the original case from source (matching TS attr.name).
    let raw_attr_name = markuplint_dom::helpers::get_raw_attr_name(attr);
    let is_owned = role.owned_properties.iter().any(|p| p.name == raw_attr_name);
    if !is_owned {
        violations.push(Violation {
            rule_id: rule_id.to_string(),
            name: None,
            severity,
            message: format!(
                "The \"{raw_attr_name}\" ARIA {prop_type_str} is disallowed on the \"{role_name}\" role",
                role_name = role.name,
            ),
            line: attr.name.line,
            col: attr.name.col,
            raw: attr.raw.clone(),
            reason: None,
        });
    }
}

/// Represents a "without" entry from element ARIA properties.
struct WithoutEntry {
    name: String,
    restriction_type: String,
    alt_method: Option<String>,
    alt_target: Option<String>,
}

/// Mirrors TS `getARIA()` condition evaluation for the `properties.without` field.
fn get_element_aria_without(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    element_name: &str,
    _version: ARIAVersion,
) -> Vec<WithoutEntry> {
    let Some(el_spec) = markuplint_types::spec::lookup::get_spec(spec, element_name) else {
        return Vec::new();
    };

    let mut properties = el_spec.aria.properties.clone();

    if let Some(ref conditions) = el_spec.aria.conditions {
        for (selector_str, override_value) in conditions {
            let Ok(selector) = markuplint_selector::parser::parse(selector_str) else {
                continue;
            };
            if !markuplint_selector::matcher::matches(&selector, arena, node_id, None, Some(spec), None) {
                continue;
            }
            if let Some(obj) = override_value.as_object()
                && let Some(cond_props) = obj.get("properties")
            {
                properties = Some(cond_props.clone());
            }
        }
    }

    parse_without_entries(properties.as_ref())
}

fn parse_without_entries(properties: Option<&serde_json::Value>) -> Vec<WithoutEntry> {
    let Some(props) = properties else {
        return Vec::new();
    };
    let Some(obj) = props.as_object() else {
        return Vec::new();
    };
    let Some(without) = obj.get("without") else {
        return Vec::new();
    };
    let Some(arr) = without.as_array() else {
        return Vec::new();
    };

    arr.iter()
        .filter_map(|entry| {
            let obj = entry.as_object()?;
            let name = obj.get("name")?.as_str()?.to_string();
            let restriction_type = obj.get("type")?.as_str()?.to_string();
            let alt = obj.get("alt").and_then(|a| a.as_object());
            let alt_method = alt.and_then(|a| a.get("method")?.as_str().map(ToString::to_string));
            let alt_target = alt.and_then(|a| a.get("target")?.as_str().map(ToString::to_string));
            Some(WithoutEntry {
                name,
                restriction_type,
                alt_method,
                alt_target,
            })
        })
        .collect()
}

/// Check if an ARIA property duplicates semantics of an equivalent HTML attribute.
#[allow(clippy::too_many_arguments, clippy::too_many_lines)]
fn check_implicit_props(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    attr: &markuplint_core::mlast::MLASTHTMLAttr,
    el: &markuplint_dom::node::ElementData,
    props: &[markuplint_types::spec::types::ARIAProperty],
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: crate::violation::Severity,
) {
    let attr_name = attr.node_name.to_ascii_lowercase();

    let Some(prop_spec) = props.iter().find(|p| p.name == attr_name) else {
        return;
    };

    let Some(ref equiv_attrs) = prop_spec.equivalent_html_attrs else {
        return;
    };

    let prop_type = match prop_spec.prop_type {
        markuplint_types::spec::types::ARIAPropertyType::Property => "property",
        markuplint_types::spec::types::ARIAPropertyType::State => "state",
    };

    let el_spec = markuplint_types::spec::lookup::get_spec(spec, &el.base.node_name);

    for equiv in equiv_attrs {
        // Check if the equivalent HTML attribute is valid on this element.
        // TS uses isValidAttr() which returns 'non-existent' when the attr
        // doesn't exist or its condition doesn't match the element.
        let attr_valid = el_spec.is_some_and(|es| {
            if let Some(attr_spec) = es.attributes.get(&equiv.html_attr_name) {
                // Check condition (e.g., checked requires [type='checkbox' i])
                match &attr_spec.condition {
                    None => true,
                    Some(markuplint_types::spec::types::AttributeCondition::Single(sel_str)) => {
                        markuplint_selector::parser::parse(sel_str).is_ok_and(|sel| {
                            markuplint_selector::matcher::matches(&sel, arena, node_id, None, Some(spec), None)
                        })
                    }
                    Some(markuplint_types::spec::types::AttributeCondition::Multiple(sels)) => {
                        sels.iter().any(|sel_str| {
                            markuplint_selector::parser::parse(sel_str).is_ok_and(|sel| {
                                markuplint_selector::matcher::matches(&sel, arena, node_id, None, Some(spec), None)
                            })
                        })
                    }
                }
            } else {
                spec.def
                    .global_attrs
                    .iter()
                    .any(|(name, _)| name == &equiv.html_attr_name)
            }
        });
        if !attr_valid {
            continue;
        }

        let aria_value = attr.value.raw.trim().to_ascii_lowercase();

        let html_attr_on_element = el.attributes.iter().find(|a| {
            if let MLASTAttr::HTMLAttr(ha) = a {
                ha.node_name.eq_ignore_ascii_case(&equiv.html_attr_name)
            } else {
                false
            }
        });

        if let Some(MLASTAttr::HTMLAttr(html_attr_node)) = html_attr_on_element {
            let html_value = html_attr_node.value.raw.trim().to_ascii_lowercase();
            let is_same = match &equiv.value {
                None => html_value == aria_value,
                Some(v) => v == &aria_value,
            };

            if is_same {
                violations.push(Violation {
                    rule_id: rule_id.to_string(),
                    name: None,
                    severity,
                    message: format!(
                        "The \"{attr_name}\" ARIA {prop_type} has the same semantics as the current \"{0}\" attribute or the implicit \"{0}\" attribute",
                        equiv.html_attr_name
                    ),
                    line: attr.name.line,
                    col: attr.name.col,
                    raw: attr.raw.clone(),
                reason: None,
            });
                return;
            }

            // Check for contradiction (HTML boolean attr with aria value != "false")
            let is_boolean_attr = el_spec.is_some_and(|es| {
                es.attributes
                    .get(&equiv.html_attr_name)
                    .is_some_and(|a| a.attr_type == serde_json::json!("Boolean"))
            });
            if is_boolean_attr && aria_value != "false" {
                continue;
            }

            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity,
                message: format!(
                    "The \"{attr_name}\" ARIA {prop_type} contradicts the current \"{0}\" attribute",
                    equiv.html_attr_name
                ),
                line: attr.name.line,
                col: attr.name.col,
                raw: attr.raw.clone(),
                reason: None,
            });
            return;
        } else if aria_value == "true" && equiv.is_not_strict_equivalent != Some(true) {
            // No HTML attribute set, but aria value is "true" for a boolean equivalent
            let is_boolean_attr = el_spec.is_some_and(|es| {
                es.attributes
                    .get(&equiv.html_attr_name)
                    .is_some_and(|a| a.attr_type == serde_json::json!("Boolean"))
            });
            if is_boolean_attr {
                violations.push(Violation {
                    rule_id: rule_id.to_string(),
                    name: None,
                    severity,
                    message: format!(
                        "The \"{attr_name}\" ARIA {prop_type} contradicts the implicit \"{0}\" attribute",
                        equiv.html_attr_name
                    ),
                    line: attr.name.line,
                    col: attr.name.col,
                    raw: attr.raw.clone(),
                    reason: None,
                });
                return;
            }
        }
    }
}

fn check_value(
    attr: &markuplint_core::mlast::MLASTHTMLAttr,
    role: Option<&markuplint_types::spec::types::ARIARoleInSchema>,
    props: &[markuplint_types::spec::types::ARIAProperty],
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: crate::violation::Severity,
) {
    let attr_name = attr.node_name.to_ascii_lowercase();

    let Some(prop_spec) = props.iter().find(|p| p.name == attr_name) else {
        return; // Unknown property — skip (not our concern here)
    };

    // A role-specific conditional may override the value type.
    let mut value_type = &prop_spec.value;
    if let Some(role) = role
        && let Some(ref conds) = prop_spec.conditional_value
    {
        for cond in conds {
            if cond.role.contains(&role.name) {
                value_type = &cond.value;
                break;
            }
        }
    }

    let raw_value = &attr.value.raw;
    let is_valid = check_aria_value(value_type, raw_value, &prop_spec.enum_values);

    if !is_valid {
        let prop_type = match prop_spec.prop_type {
            markuplint_types::spec::types::ARIAPropertyType::Property => "property",
            markuplint_types::spec::types::ARIAPropertyType::State => "state",
        };

        let mut message =
            format!("Disallowed on the \"{attr_name}\" ARIA {prop_type}: the \"{raw_value}\" is disallowed");
        if !prop_spec.enum_values.is_empty() {
            let _ = write!(message, ". Allowed values are: {}", prop_spec.enum_values.join(", "));
        }

        // TS reports at scope: attr (attribute name position)
        violations.push(Violation {
            rule_id: rule_id.to_string(),
            name: None,
            severity,
            message,
            line: attr.name.line,
            col: attr.name.col,
            raw: attr.raw.clone(),
            reason: None,
        });
    }
}

fn check_aria_value(value_type: &ARIAAttributeValue, value: &str, enum_values: &[String]) -> bool {
    match value_type {
        ARIAAttributeValue::Token => enum_values.iter().any(|e| e == value),
        ARIAAttributeValue::TokenList => {
            let tokens: Vec<&str> = value.split_whitespace().collect();
            !tokens.is_empty() && tokens.iter().all(|t| enum_values.iter().any(|e| e == t))
        }
        ARIAAttributeValue::StringValue
        | ARIAAttributeValue::IdReference
        | ARIAAttributeValue::IdReferenceList
        | ARIAAttributeValue::Uri => true,
        ARIAAttributeValue::TrueFalse => matches!(value, "true" | "false"),
        ARIAAttributeValue::Tristate => matches!(value, "mixed" | "true" | "false" | "undefined"),
        ARIAAttributeValue::TrueFalseUndefined => matches!(value, "true" | "false" | "undefined"),
        ARIAAttributeValue::Integer => value.parse::<i64>().is_ok_and(|n| n.to_string() == value),
        ARIAAttributeValue::Number => value.parse::<f64>().is_ok_and(|n| n.to_string() == value),
    }
}

fn check_default_value(
    attr: &markuplint_core::mlast::MLASTHTMLAttr,
    props: &[markuplint_types::spec::types::ARIAProperty],
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: crate::violation::Severity,
) {
    let attr_name = attr.node_name.to_ascii_lowercase();

    let Some(prop_spec) = props.iter().find(|p| p.name == attr_name) else {
        return;
    };

    let Some(ref default_val) = prop_spec.default_value else {
        return;
    };

    if attr.value.raw.trim() == default_val {
        let prop_type = match prop_spec.prop_type {
            markuplint_types::spec::types::ARIAPropertyType::Property => "property",
            markuplint_types::spec::types::ARIAPropertyType::State => "state",
        };
        violations.push(Violation {
            rule_id: rule_id.to_string(),
            name: None,
            severity,
            message: format!("The \"{attr_name}\" ARIA {prop_type} is set to its default value \"{default_val}\""),
            line: attr.name.line,
            col: attr.name.col,
            raw: attr.raw.clone(),
            reason: None,
        });
    }
}

/// For elements with a computed role that has `allowedAccessibilityChildRoles`,
/// verifies that at least one child element has one of the required roles.
/// Skips if `aria-busy="true"` is set or if no children exist.
#[allow(clippy::too_many_arguments)]
fn check_allowed_child_roles(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    el: &markuplint_dom::node::ElementData,
    version: ARIAVersion,
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: crate::violation::Severity,
) {
    if markuplint_dom::helpers::get_attr_value(arena, node_id, "aria-busy")
        .is_some_and(|v| v.eq_ignore_ascii_case("true"))
    {
        return;
    }

    let cr = get_computed_role(spec, arena, node_id, version, false);
    let Some(ref role) = cr.role else {
        return;
    };

    if role.allowed_accessibility_child_roles.is_empty() {
        return;
    }

    let children = arena.children_of(node_id).unwrap_or_default();

    // Transparent ownership roles are traversed when looking for the required role.
    if !children.is_empty()
        && has_required_child(spec, arena, node_id, &role.allowed_accessibility_child_roles, version)
    {
        return;
    }

    // A child marked `aria-busy="true"` also exempts the parent.
    for &child_id in children {
        if markuplint_dom::helpers::get_attr_value(arena, child_id, "aria-busy")
            .is_some_and(|v| v.eq_ignore_ascii_case("true"))
        {
            return;
        }
    }

    let required_roles = role.allowed_accessibility_child_roles.join(", ");

    // Match TS mayBeBeforeCreated: empty elements or elements with only script/template children
    let may_be_before_created = children.is_empty()
        || children.iter().all(|&cid| {
            arena.get(cid).and_then(|n| n.as_element()).is_some_and(|e| {
                let name = e.base.node_name.to_ascii_lowercase();
                name == "script" || name == "template"
            })
        });

    if may_be_before_created {
        violations.push(Violation {
            rule_id: rule_id.to_string(),
            name: None,
            severity,
            message: format!(
                "The child element requires the role(s): {required_roles}. Or, require aria-busy=\"true\""
            ),
            line: el.base.line,
            col: el.base.col,
            raw: el.base.raw.clone(),
            reason: None,
        });
    } else {
        violations.push(Violation {
            rule_id: rule_id.to_string(),
            name: None,
            severity,
            message: format!(
                "The \"{}\" role expects the child element requires the role(s): {required_roles}",
                role.name
            ),
            line: el.base.line,
            col: el.base.col,
            raw: el.base.raw.clone(),
            reason: None,
        });
    }
}

/// Matches TS `isRequiredOwnedElement`, which handles the `"parent > child"` query syntax
/// (e.g. `"rowgroup > row"` means a child with role `rowgroup` that itself contains `row`).
fn has_required_child(
    spec: &MLMLSpec,
    arena: &DomArena,
    parent_id: NodeId,
    required_roles: &[String],
    version: ARIAVersion,
) -> bool {
    let children = arena.children_of(parent_id).unwrap_or_default();
    for &child_id in children {
        let Some(child_node) = arena.get(child_id) else {
            continue;
        };
        if child_node.as_element().is_none() {
            continue;
        }
        let child_cr = get_computed_role(spec, arena, child_id, version, false);
        if let Some(ref child_role) = child_cr.role {
            for required in required_roles {
                if is_required_owned_match(spec, arena, child_id, &child_role.name, required, version) {
                    return true;
                }
            }
            // If child role is transparent for ownership, recurse
            if is_transparent_for_ownership_check(&child_role.name, version)
                && has_required_child(spec, arena, child_id, required_roles, version)
            {
                return true;
            }
        }
    }
    false
}

/// Mirrors TS `isRequiredOwnedElement`: handles `"role"` (simple) and
/// `"parent > child"` (nested) query syntax.
fn is_required_owned_match(
    spec: &MLMLSpec,
    arena: &DomArena,
    child_id: NodeId,
    child_role_name: &str,
    query: &str,
    version: ARIAVersion,
) -> bool {
    if let Some((base_role, owning_role)) = query.split_once(" > ") {
        // Nested: child must have base_role, and its descendants must have owning_role
        if !base_role.eq_ignore_ascii_case(child_role_name) {
            return false;
        }
        has_descendant_with_role(spec, arena, child_id, owning_role, version)
    } else {
        // Simple query: direct role match.
        query.eq_ignore_ascii_case(child_role_name)
    }
}

/// Check if any descendant (through transparent roles) has the specified role.
fn has_descendant_with_role(
    spec: &MLMLSpec,
    arena: &DomArena,
    parent_id: NodeId,
    target_role: &str,
    version: ARIAVersion,
) -> bool {
    let children = arena.children_of(parent_id).unwrap_or_default();
    for &child_id in children {
        let Some(child_node) = arena.get(child_id) else {
            continue;
        };
        if child_node.as_element().is_none() {
            continue;
        }
        let child_cr = get_computed_role(spec, arena, child_id, version, false);
        if let Some(ref child_role) = child_cr.role {
            if target_role.eq_ignore_ascii_case(&child_role.name) {
                return true;
            }
            if is_transparent_for_ownership_check(&child_role.name, version)
                && has_descendant_with_role(spec, arena, child_id, target_role, version)
            {
                return true;
            }
        }
    }
    false
}

/// Check if a role is transparent for ownership (presentation/none/generic in 1.3).
fn is_transparent_for_ownership_check(role_name: &str, version: ARIAVersion) -> bool {
    if role_name == "presentation" || role_name == "none" {
        return true;
    }
    if version == ARIAVersion::V1_3 && role_name == "generic" {
        return true;
    }
    false
}

/// For elements with an EXPLICIT role that has `requiredContextRole`,
/// verifies that an ancestor has one of the required context roles.
#[allow(clippy::too_many_arguments)]
fn check_required_parent_role(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    el: &markuplint_dom::node::ElementData,
    version: ARIAVersion,
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: crate::violation::Severity,
) {
    // Only check explicit roles (skip implicit)
    let role_attr_value = markuplint_dom::helpers::get_attr_value(arena, node_id, "role");
    let Some(role_value) = role_attr_value else {
        return;
    };

    let cr = get_computed_role(spec, arena, node_id, version, false);

    if cr.error_type == Some(RoleComputationError::InvalidRequiredContextRole)
        || (cr.error_type == Some(RoleComputationError::NoOwner) && cr.role.is_none())
    {
        for token in role_value.split_whitespace() {
            let role_name = token.to_ascii_lowercase();
            let Some(role_spec) = aria::get_role_spec(spec, &role_name, version) else {
                continue;
            };

            let parent_roles = if role_spec.required_accessibility_parent_role.is_empty() {
                &role_spec.required_context_role
            } else {
                &role_spec.required_accessibility_parent_role
            };

            if !parent_roles.is_empty() {
                let required = parent_roles.join(", ");
                violations.push(Violation {
                    rule_id: rule_id.to_string(),
                    name: None,
                    severity,
                    message: format!(
                        "The \"{role_name}\" role requires an accessibility parent with the role(s): {required}"
                    ),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                    reason: None,
                });
                return;
            }
        }
    }
}

/// If an ancestor has a role with `childrenPresentational: true`,
/// ARIA attributes on this element are ineffective.
#[allow(clippy::too_many_arguments)]
fn check_presentational_children(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    el: &markuplint_dom::node::ElementData,
    version: ARIAVersion,
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: crate::violation::Severity,
) {
    let has_aria_attr = el.attributes.iter().any(|attr| {
        if let MLASTAttr::HTMLAttr(html_attr) = attr {
            let name = html_attr.node_name.to_ascii_lowercase();
            name == "role" || name.starts_with("aria-")
        } else {
            false
        }
    });
    if !has_aria_attr {
        return;
    }

    for ancestor in arena.ancestors(node_id) {
        let Some(ancestor_el) = ancestor.as_element() else {
            continue;
        };
        let ancestor_id = ancestor_el.base.id;
        let cr = get_computed_role(spec, arena, ancestor_id, version, false);
        if let Some(ref role) = cr.role
            && role.children_presentational
        {
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                    name: None,
                severity,
                message: format!(
                    "It may be ineffective because it has the \"{}\" role as an ancestor that doesn't expose its descendants to the accessibility tree",
                    role.name
                ),
                line: el.base.line,
                col: el.base.col,
                raw: el.base.raw.clone(),
            reason: None,
            });
            return;
        }
    }
}

/// Reports a violation when a focusable element has `aria-hidden="true"` on
/// itself or an ancestor.
fn check_interaction_in_hidden(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: crate::violation::Severity,
) {
    if !may_be_focusable::may_be_focusable(spec, arena, node_id) {
        return;
    }

    if markuplint_dom::helpers::get_attr_value(arena, node_id, "aria-hidden")
        .is_some_and(|v| v.eq_ignore_ascii_case("true"))
    {
        let Some(el) = arena.get(node_id).and_then(|n| n.as_element()) else {
            return;
        };
        violations.push(Violation {
            rule_id: rule_id.to_string(),
            name: None,
            severity,
            message: "It may be focusable in spite of it has aria-hidden=true".to_string(),
            line: el.base.line,
            col: el.base.col,
            raw: el.base.raw.clone(),
            reason: None,
        });
        return;
    }

    for ancestor in arena.ancestors(node_id) {
        let Some(ancestor_el) = ancestor.as_element() else {
            continue;
        };
        let ancestor_id = ancestor_el.base.id;
        if markuplint_dom::helpers::get_attr_value(arena, ancestor_id, "aria-hidden")
            .is_some_and(|v| v.eq_ignore_ascii_case("true"))
        {
            let Some(el) = arena.get(node_id).and_then(|n| n.as_element()) else {
                return;
            };
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity,
                message: "It may be focusable in spite of it has the ancestor that has aria-hidden=true".to_string(),
                line: el.base.line,
                col: el.base.col,
                raw: el.base.raw.clone(),
                reason: None,
            });
            return;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::rules::attr_duplication::tests::make_element_with_attrs;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn valid_role_no_violation() {
        let arena = make_element_with_attrs("div", &[("role", "button")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty(), "valid role should not produce violations");
    }

    #[test]
    fn unknown_role_violation() {
        let arena = make_element_with_attrs("div", &[("role", "nonexistent")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert!(
            violations[0].message.contains("nonexistent"),
            "message should mention the unknown role"
        );
        assert!(
            violations[0].message.contains("does not exist"),
            "message should say role does not exist"
        );
    }

    #[test]
    fn abstract_role_violation() {
        let arena = make_element_with_attrs("div", &[("role", "widget")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert!(
            violations[0].message.contains("widget"),
            "message should mention the abstract role"
        );
        assert!(
            violations[0].message.contains("abstract"),
            "message should say role is abstract"
        );
    }

    #[test]
    fn abstract_role_roletype_violation() {
        // "roletype" is the root abstract role
        let arena = make_element_with_attrs("div", &[("role", "roletype")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.iter().any(|v| v.message.contains("abstract")),
            "roletype should be flagged as abstract role, got: {violations:?}"
        );
    }

    #[test]
    fn no_role_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn multiple_roles_first_invalid() {
        // "nonexistent button" — first token is unknown
        let arena = make_element_with_attrs("div", &[("role", "nonexistent button")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert!(violations[0].message.contains("nonexistent"));
    }

    #[test]
    fn permitted_roles_violation() {
        // <meta> does not permit any role override
        // permittedRoles for <meta> should be empty or false
        let arena = make_element_with_attrs("meta", &[("role", "button")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        // Should have a violation for non-permitted role
        assert!(!violations.is_empty(), "meta element should not allow role attribute");
    }

    #[test]
    fn non_permitted_role_on_element_violation() {
        // <meta role="button"> — the meta element does not permit role override.
        // The violation message should contain "Cannot overwrite".
        let arena = make_element_with_attrs("meta", &[("role", "button")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(!violations.is_empty(), "meta element should not allow role override");
        let overwrite_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("Cannot overwrite"))
            .collect();
        assert!(
            !overwrite_violations.is_empty(),
            "Expected a 'Cannot overwrite' violation for <meta role=\"button\">, got: {violations:?}"
        );
    }

    #[test]
    fn dpub_role_valid() {
        let arena = make_element_with_attrs("div", &[("role", "doc-bibliography")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        // doc-bibliography is a valid dpub role; may or may not be permitted on div
        // At minimum, it should not produce "does not exist" violation
        let has_nonexist = violations.iter().any(|v| v.message.contains("does not exist"));
        assert!(!has_nonexist, "dpub roles should be recognized");
    }

    #[test]
    fn implicit_role_violation_by_default() {
        // <button role="button"> — button's implicit role is "button", so this is redundant
        let arena = make_element_with_attrs("button", &[("role", "button")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let implicit_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("is the implicit role of"))
            .collect();
        assert!(
            !implicit_violations.is_empty(),
            "Setting role='button' on <button> should be flagged as redundant by default, got: {violations:?}"
        );
    }

    #[test]
    fn implicit_role_allowed_when_disabled() {
        // <button role="button"> with disallowSetImplicitRole: false → no violation
        let arena = make_element_with_attrs("button", &[("role", "button")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "disallowSetImplicitRole": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let implicit_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("is the implicit role of"))
            .collect();
        assert!(
            implicit_violations.is_empty(),
            "Setting role='button' on <button> should be allowed when disallowSetImplicitRole is false, got: {violations:?}"
        );
    }

    #[test]
    fn implicit_role_node_override() {
        // Test per-node override: global disallowSetImplicitRole=true, but node override=false
        let arena = make_element_with_attrs("button", &[("role", "button")]);
        let s = spec();
        let rule = WaiAria;

        // Get the element's NodeId
        let node_id = arena.elements().next().unwrap().0;

        let global_config = RuleConfig::default(); // disallowSetImplicitRole defaults to true
        let node_config = RuleConfig {
            options: serde_json::json!({ "disallowSetImplicitRole": false }),
            ..RuleConfig::default()
        };
        let mut overrides = std::collections::HashMap::new();
        overrides.insert(node_id, node_config);
        let config_set = RuleConfigSet::new(global_config, overrides);

        let violations = rule.verify(&arena, &s, &config_set);
        let implicit_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("is the implicit role of"))
            .collect();
        assert!(
            implicit_violations.is_empty(),
            "Per-node disallowSetImplicitRole:false should suppress implicit role violation, got: {violations:?}"
        );
    }

    #[test]
    fn different_role_no_implicit_violation() {
        // <button role="link"> — "link" is not button's implicit role, so no implicit role violation
        // (may have permitted-roles violation, but not an implicit-role one)
        let arena = make_element_with_attrs("button", &[("role", "link")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let implicit_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("is the implicit role of"))
            .collect();
        assert!(
            implicit_violations.is_empty(),
            "Setting a different role should not trigger implicit role violation, got: {violations:?}"
        );
    }

    #[test]
    fn heading_implicit_role_violation() {
        // <h1 role="heading"> — heading is the implicit role of h1
        let arena = make_element_with_attrs("h1", &[("role", "heading")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let implicit_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("is the implicit role of"))
            .collect();
        assert!(
            !implicit_violations.is_empty(),
            "Setting role='heading' on <h1> should be flagged as redundant, got: {violations:?}"
        );
    }

    // --- version option tests ---

    #[test]
    fn version_option_1_1() {
        let arena = make_element_with_attrs("div", &[("role", "button")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "version": "1.1" }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty(), "button role should exist in ARIA 1.1");
    }

    #[test]
    fn version_option_1_2() {
        let arena = make_element_with_attrs("div", &[("role", "button")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "version": "1.2" }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty(), "button role should exist in ARIA 1.2");
    }

    #[test]
    fn version_option_default_is_recommended() {
        // Without version option, should use RECOMMENDED (1.3)
        let arena = make_element_with_attrs("div", &[("role", "button")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    // --- checkingDeprecatedRole tests ---

    #[test]
    fn deprecated_role_check_enabled() {
        // "directory" is deprecated in ARIA 1.3 → violation by default
        let arena = make_element_with_attrs("div", &[("role", "directory")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let dep_violations: Vec<_> = violations.iter().filter(|v| v.message.contains("deprecated")).collect();
        assert!(
            !dep_violations.is_empty(),
            "Default should report deprecated role 'directory', got: {violations:?}"
        );
    }

    #[test]
    fn deprecated_role_check_disabled() {
        // "directory" is deprecated, but with checkingDeprecatedRole: false → no violation
        let arena = make_element_with_attrs("div", &[("role", "directory")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "checkingDeprecatedRole": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let dep_violations: Vec<_> = violations.iter().filter(|v| v.message.contains("deprecated")).collect();
        assert!(
            dep_violations.is_empty(),
            "No deprecated violation when check is disabled, got: {violations:?}"
        );
    }

    // --- checkingValue tests ---

    #[test]
    fn aria_value_token_valid() {
        // aria-autocomplete accepts "inline", "list", "both", "none"
        let arena = make_element_with_attrs("input", &[("role", "combobox"), ("aria-autocomplete", "list")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "disallowSetImplicitRole": false, "permittedAriaRoles": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let value_violations: Vec<_> = violations.iter().filter(|v| v.message.contains("disallowed")).collect();
        assert!(
            value_violations.is_empty(),
            "valid token should not produce violation, got: {violations:?}"
        );
    }

    #[test]
    fn aria_value_token_invalid() {
        // aria-autocomplete with invalid value
        let arena = make_element_with_attrs("input", &[("role", "combobox"), ("aria-autocomplete", "invalid")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "disallowSetImplicitRole": false, "permittedAriaRoles": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let value_violations: Vec<_> = violations.iter().filter(|v| v.message.contains("disallowed")).collect();
        assert!(
            !value_violations.is_empty(),
            "invalid token should produce violation, got: {violations:?}"
        );
    }

    #[test]
    fn aria_value_true_false_valid() {
        // aria-disabled accepts "true" or "false"
        let arena = make_element_with_attrs("div", &[("role", "button"), ("aria-disabled", "true")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig::default();
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let value_violations: Vec<_> = violations.iter().filter(|v| v.message.contains("disallowed")).collect();
        assert!(
            value_violations.is_empty(),
            "true should be valid for true/false type, got: {violations:?}"
        );
    }

    #[test]
    fn aria_value_true_false_invalid() {
        // aria-disabled with invalid value
        let arena = make_element_with_attrs("div", &[("role", "button"), ("aria-disabled", "yes")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig::default();
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let value_violations: Vec<_> = violations.iter().filter(|v| v.message.contains("disallowed")).collect();
        assert!(
            !value_violations.is_empty(),
            "\"yes\" should be invalid for true/false type, got: {violations:?}"
        );
    }

    #[test]
    fn aria_value_integer_valid() {
        // aria-level accepts integer
        let arena = make_element_with_attrs("div", &[("role", "heading"), ("aria-level", "2")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "disallowSetImplicitRole": false, "permittedAriaRoles": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let value_violations: Vec<_> = violations.iter().filter(|v| v.message.contains("disallowed")).collect();
        assert!(
            value_violations.is_empty(),
            "2 should be valid integer, got: {violations:?}"
        );
    }

    #[test]
    fn aria_value_integer_invalid() {
        // aria-level with non-integer value
        let arena = make_element_with_attrs("div", &[("role", "heading"), ("aria-level", "abc")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "disallowSetImplicitRole": false, "permittedAriaRoles": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let value_violations: Vec<_> = violations.iter().filter(|v| v.message.contains("disallowed")).collect();
        assert!(
            !value_violations.is_empty(),
            "\"abc\" should be invalid integer, got: {violations:?}"
        );
    }

    #[test]
    fn checking_value_disabled() {
        let arena = make_element_with_attrs("div", &[("role", "button"), ("aria-disabled", "yes")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "checkingValue": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let value_violations: Vec<_> = violations.iter().filter(|v| v.message.contains("disallowed")).collect();
        assert!(
            value_violations.is_empty(),
            "No value violation when checkingValue is false"
        );
    }

    // --- disallowDefaultValue tests ---

    #[test]
    fn disallow_default_value_enabled() {
        // aria-checked has default "undefined"; setting it to "undefined" should be flagged
        let arena = make_element_with_attrs("div", &[("role", "checkbox"), ("aria-checked", "undefined")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "disallowDefaultValue": true, "permittedAriaRoles": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let default_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("default value"))
            .collect();
        assert!(
            !default_violations.is_empty(),
            "Setting aria-checked to its default should be flagged when disallowDefaultValue is true, got: {violations:?}"
        );
    }

    #[test]
    fn disallow_default_value_disabled_by_default() {
        // By default disallowDefaultValue is false — no violation
        let arena = make_element_with_attrs("div", &[("role", "checkbox"), ("aria-checked", "undefined")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "permittedAriaRoles": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let default_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("default value"))
            .collect();
        assert!(
            default_violations.is_empty(),
            "No default value violation when disallowDefaultValue is false (default)"
        );
    }

    // --- disallowSetImplicitProps tests ---

    #[test]
    fn implicit_props_check_enabled() {
        // <input required aria-required="true"> → same semantics violation by default
        let arena = make_element_with_attrs("input", &[("aria-required", "true"), ("required", "")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let implicit_prop_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("same semantics") || v.message.contains("contradicts"))
            .collect();
        assert!(
            !implicit_prop_violations.is_empty(),
            "Default disallowSetImplicitProps=true should report same-semantics violation, got: {violations:?}"
        );
    }

    #[test]
    fn implicit_props_check_disabled() {
        let arena = make_element_with_attrs("input", &[("aria-required", "true"), ("required", "")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "disallowSetImplicitProps": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let implicit_prop_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("same semantics") || v.message.contains("contradicts"))
            .collect();
        assert!(
            implicit_prop_violations.is_empty(),
            "No implicit props violation when disallowSetImplicitProps is false, got: {violations:?}"
        );
    }

    // --- check_aria_value unit tests ---

    #[test]
    fn check_aria_value_token() {
        let enums = vec![
            "inline".to_string(),
            "list".to_string(),
            "both".to_string(),
            "none".to_string(),
        ];
        assert!(check_aria_value(&ARIAAttributeValue::Token, "list", &enums));
        assert!(!check_aria_value(&ARIAAttributeValue::Token, "invalid", &enums));
    }

    #[test]
    fn check_aria_value_token_list() {
        let enums = vec!["ascending".to_string(), "descending".to_string(), "other".to_string()];
        assert!(check_aria_value(
            &ARIAAttributeValue::TokenList,
            "ascending descending",
            &enums
        ));
        assert!(!check_aria_value(
            &ARIAAttributeValue::TokenList,
            "ascending invalid",
            &enums
        ));
    }

    #[test]
    fn check_aria_value_true_false() {
        assert!(check_aria_value(&ARIAAttributeValue::TrueFalse, "true", &[]));
        assert!(check_aria_value(&ARIAAttributeValue::TrueFalse, "false", &[]));
        assert!(!check_aria_value(&ARIAAttributeValue::TrueFalse, "yes", &[]));
    }

    #[test]
    fn check_aria_value_tristate() {
        assert!(check_aria_value(&ARIAAttributeValue::Tristate, "mixed", &[]));
        assert!(check_aria_value(&ARIAAttributeValue::Tristate, "true", &[]));
        assert!(check_aria_value(&ARIAAttributeValue::Tristate, "false", &[]));
        assert!(check_aria_value(&ARIAAttributeValue::Tristate, "undefined", &[]));
        assert!(!check_aria_value(&ARIAAttributeValue::Tristate, "yes", &[]));
    }

    #[test]
    fn check_aria_value_integer() {
        assert!(check_aria_value(&ARIAAttributeValue::Integer, "42", &[]));
        assert!(check_aria_value(&ARIAAttributeValue::Integer, "-1", &[]));
        assert!(!check_aria_value(&ARIAAttributeValue::Integer, "3.5", &[]));
        assert!(!check_aria_value(&ARIAAttributeValue::Integer, "abc", &[]));
    }

    #[test]
    fn check_aria_value_number() {
        assert!(check_aria_value(&ARIAAttributeValue::Number, "42", &[]));
        assert!(check_aria_value(&ARIAAttributeValue::Number, "3.5", &[]));
        assert!(!check_aria_value(&ARIAAttributeValue::Number, "abc", &[]));
    }

    #[test]
    fn check_aria_value_string() {
        assert!(check_aria_value(&ARIAAttributeValue::StringValue, "anything", &[]));
    }

    #[test]
    fn check_aria_value_id_reference() {
        assert!(check_aria_value(&ARIAAttributeValue::IdReference, "my-id", &[]));
    }

    #[test]
    fn checking_deprecated_props_disabled() {
        // aria-disabled is deprecated on the "alert" role.
        // With checkingDeprecatedProps: false, no violation should be reported.
        let arena = make_element_with_attrs("div", &[("role", "alert"), ("aria-disabled", "true")]);
        let s = spec();
        let rule = WaiAria;

        // Default (true) — should report deprecated prop
        let v_default = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let dep_violations: Vec<_> = v_default.iter().filter(|v| v.message.contains("deprecated")).collect();
        assert!(
            !dep_violations.is_empty(),
            "Default should report deprecated prop, got: {v_default:?}"
        );

        // Disabled — should NOT report deprecated prop
        let config = RuleConfig {
            options: serde_json::json!({ "checkingDeprecatedProps": false }),
            ..RuleConfig::default()
        };
        let v_disabled = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let dep_violations: Vec<_> = v_disabled.iter().filter(|v| v.message.contains("deprecated")).collect();
        assert!(
            dep_violations.is_empty(),
            "checkingDeprecatedProps:false should suppress, got: {v_disabled:?}"
        );
    }

    // --- Helper for nested DOM structures ---

    /// Build a DOM arena with parent > child structure, returning the full arena.
    fn make_nested_arena(
        parent_tag: &str,
        parent_attrs: &[(&str, &str)],
        child_tag: &str,
        child_attrs: &[(&str, &str)],
    ) -> DomArena {
        use markuplint_core::mlast::{ElementType, MLASTHTMLAttr, MLASTToken, NamespaceURI};
        use markuplint_dom::arena::DomArenaBuilder;
        use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};

        let empty_token = || MLASTToken {
            uuid: String::new(),
            raw: String::new(),
            offset: 0,
            line: 1,
            col: 1,
        };

        let make_attrs = |attrs: &[(&str, &str)]| -> Vec<MLASTAttr> {
            attrs
                .iter()
                .map(|(name, value)| {
                    MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                        uuid: String::new(),
                        raw: format!("{name}=\"{value}\""),
                        offset: 0,
                        line: 1,
                        col: 1,
                        node_name: name.to_string(),
                        spaces_before_name: empty_token(),
                        name: MLASTToken {
                            raw: name.to_string(),
                            ..empty_token()
                        },
                        spaces_before_equal: empty_token(),
                        equal: MLASTToken {
                            raw: "=".to_string(),
                            ..empty_token()
                        },
                        spaces_after_equal: empty_token(),
                        start_quote: MLASTToken {
                            raw: "\"".to_string(),
                            ..empty_token()
                        },
                        value: MLASTToken {
                            raw: value.to_string(),
                            ..empty_token()
                        },
                        end_quote: MLASTToken {
                            raw: "\"".to_string(),
                            ..empty_token()
                        },
                        is_dynamic_value: None,
                        is_directive: None,
                        potential_name: None,
                        potential_value: None,
                        value_type: None,
                        candidate: None,
                        is_duplicatable: false,
                    }))
                })
                .collect()
        };

        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let parent_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 1,
                uuid: "parent".to_string(),
                raw: format!("<{parent_tag}>"),
                offset: 0,
                line: 1,
                col: 1,
                node_name: parent_tag.to_string(),
                parent: Some(doc_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: make_attrs(parent_attrs),
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }));
        let child_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 2,
                uuid: "child".to_string(),
                raw: format!("<{child_tag}>"),
                offset: 0,
                line: 2,
                col: 1,
                node_name: child_tag.to_string(),
                parent: Some(parent_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 2,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: make_attrs(child_attrs),
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }));
        if let Some(DomNode::Document(doc)) = builder.get_mut(doc_id) {
            doc.children.push(parent_id);
        }
        if let Some(DomNode::Element(p)) = builder.get_mut(parent_id) {
            p.base.children.push(child_id);
        }
        builder.finish()
    }

    // --- checkingAllowedAccessibilityChildRoles tests ---

    #[test]
    fn child_roles_list_with_listitem_passes() {
        // <ul role="list"><li role="listitem"> — valid
        let arena = make_nested_arena("ul", &[], "li", &[]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let child_violations: Vec<_> = violations.iter().filter(|v| v.message.contains("expects")).collect();
        assert!(
            child_violations.is_empty(),
            "ul with li child should pass child roles check, got: {violations:?}"
        );
    }

    #[test]
    fn child_roles_list_without_listitem_fails() {
        // <div role="list"><div> — missing required listitem child
        let arena = make_nested_arena("div", &[("role", "list")], "div", &[]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "permittedAriaRoles": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let child_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("expects") && v.message.contains("role"))
            .collect();
        assert!(
            !child_violations.is_empty(),
            "list without listitem child should fail, got: {violations:?}"
        );
    }

    #[test]
    fn child_roles_aria_busy_skips() {
        // <div role="list" aria-busy="true"><div> — aria-busy skips the check
        let arena = make_nested_arena("div", &[("role", "list"), ("aria-busy", "true")], "div", &[]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "permittedAriaRoles": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let child_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("expects") && v.message.contains("child"))
            .collect();
        assert!(
            child_violations.is_empty(),
            "aria-busy=true should skip child roles check, got: {violations:?}"
        );
    }

    #[test]
    fn child_roles_check_disabled() {
        // Disable both aliases
        let arena = make_nested_arena("div", &[("role", "list")], "div", &[]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({
                "checkingAllowedAccessibilityChildRoles": false,
                "checkingRequiredOwnedElements": false,
                "permittedAriaRoles": false
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let child_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("expects") && v.message.contains("child"))
            .collect();
        assert!(
            child_violations.is_empty(),
            "No child roles violation when check is disabled, got: {violations:?}"
        );
    }

    // --- checkingRequiredAccessibilityParentRole tests ---

    #[test]
    fn parent_role_listitem_in_list_passes() {
        // <ul><li role="listitem"> — valid context
        let arena = make_nested_arena("ul", &[], "li", &[("role", "listitem")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "disallowSetImplicitRole": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let parent_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("requires an accessibility parent"))
            .collect();
        assert!(
            parent_violations.is_empty(),
            "listitem in list should pass parent role check, got: {violations:?}"
        );
    }

    #[test]
    fn parent_role_listitem_outside_list_fails() {
        // <div><div role="listitem"> — no list parent
        let arena = make_nested_arena("div", &[], "div", &[("role", "listitem")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "permittedAriaRoles": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let parent_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("requires an accessibility parent"))
            .collect();
        assert!(
            !parent_violations.is_empty(),
            "listitem outside list should fail parent role check, got: {violations:?}"
        );
    }

    #[test]
    fn parent_role_check_disabled() {
        let arena = make_nested_arena("div", &[], "div", &[("role", "listitem")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({
                "checkingRequiredAccessibilityParentRole": false,
                "permittedAriaRoles": false
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let parent_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("requires an accessibility parent"))
            .collect();
        assert!(
            parent_violations.is_empty(),
            "No parent role violation when check is disabled, got: {violations:?}"
        );
    }

    // --- checkingPresentationalChildren tests ---

    #[test]
    fn presentational_children_with_aria_on_descendant_fails() {
        // <div role="button"><span role="img"> — button has childrenPresentational
        // The span's role attribute is ineffective
        let arena = make_nested_arena("div", &[("role", "button")], "span", &[("role", "img")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "checkingPresentationalChildren": true }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let pres_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("ineffective"))
            .collect();
        assert!(
            !pres_violations.is_empty(),
            "ARIA on descendant of presentational children role should be flagged, got: {violations:?}"
        );
    }

    #[test]
    fn presentational_children_without_aria_passes() {
        // <div role="button"><span> — no ARIA attrs on span, no violation
        let arena = make_nested_arena("div", &[("role", "button")], "span", &[]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "checkingPresentationalChildren": true }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let pres_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("ineffective"))
            .collect();
        assert!(
            pres_violations.is_empty(),
            "No ARIA attrs on descendant should not be flagged, got: {violations:?}"
        );
    }

    #[test]
    fn presentational_children_disabled_by_default() {
        // Default is false — should not check
        let arena = make_nested_arena("div", &[("role", "button")], "span", &[("role", "img")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let pres_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("ineffective"))
            .collect();
        assert!(
            pres_violations.is_empty(),
            "Presentational children check should be off by default, got: {violations:?}"
        );
    }

    // --- checkingInteractionInHidden tests ---

    #[test]
    fn interaction_in_hidden_self_fails() {
        // <button aria-hidden="true"> — focusable and hidden
        let arena = make_element_with_attrs("button", &[("aria-hidden", "true")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "checkingInteractionInHidden": true }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let hidden_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("focusable") && v.message.contains("aria-hidden"))
            .collect();
        assert!(
            !hidden_violations.is_empty(),
            "Focusable element with aria-hidden=true should be flagged, got: {violations:?}"
        );
    }

    #[test]
    fn interaction_in_hidden_ancestor_fails() {
        // <div aria-hidden="true"><button> — button is focusable in hidden ancestor
        let arena = make_nested_arena("div", &[("aria-hidden", "true")], "button", &[]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "checkingInteractionInHidden": true }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let hidden_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("focusable") && v.message.contains("ancestor"))
            .collect();
        assert!(
            !hidden_violations.is_empty(),
            "Focusable element in aria-hidden ancestor should be flagged, got: {violations:?}"
        );
    }

    #[test]
    fn interaction_in_hidden_non_focusable_passes() {
        // <div aria-hidden="true"><span> — span is not focusable
        let arena = make_nested_arena("div", &[("aria-hidden", "true")], "span", &[]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "checkingInteractionInHidden": true }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let hidden_violations: Vec<_> = violations.iter().filter(|v| v.message.contains("focusable")).collect();
        assert!(
            hidden_violations.is_empty(),
            "Non-focusable element should not be flagged, got: {violations:?}"
        );
    }

    #[test]
    fn interaction_in_hidden_disabled_by_default() {
        // Default is false — should not check
        let arena = make_element_with_attrs("button", &[("aria-hidden", "true")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let hidden_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("focusable") && v.message.contains("aria-hidden"))
            .collect();
        assert!(
            hidden_violations.is_empty(),
            "Interaction in hidden check should be off by default, got: {violations:?}"
        );
    }
}
