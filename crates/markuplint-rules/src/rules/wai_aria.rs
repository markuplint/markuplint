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

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `wai-aria` rule.
pub struct WaiAria;

impl Rule for WaiAria {
    fn id(&self) -> &'static str {
        "wai-aria"
    }

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
            let el_name = &el.base.node_name;

            // Collect role attr and aria-* attrs
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

            // Check role attribute
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
                    &rule_config.severity,
                );
            }

            // Resolve the computed role for property checks
            let role_value = role_attr.map(|a| a.value.raw.as_str());
            let resolved_role = role_value.and_then(|rv| aria::resolve_explicit_role(spec, rv, version).ok());

            // Check deprecated aria-* properties
            if !is_option_disabled(&rule_config.options, "checkingDeprecatedProps") {
                for aria_attr in &aria_attrs {
                    check_deprecated_prop(
                        spec,
                        aria_attr,
                        resolved_role,
                        version,
                        &mut violations,
                        self.id(),
                        &rule_config.severity,
                    );
                }
            }

            // Check disallowSetImplicitProps (default: true)
            if is_option_enabled(&rule_config.options, "disallowSetImplicitProps", true) {
                let aria_spec = aria::get_aria_spec(spec, version);
                for aria_attr in &aria_attrs {
                    check_implicit_props(
                        spec,
                        aria_attr,
                        el,
                        &aria_spec.props,
                        &mut violations,
                        self.id(),
                        &rule_config.severity,
                    );
                }
            }

            // Check ARIA property values (checkingValue, default: true)
            if is_option_enabled(&rule_config.options, "checkingValue", true) {
                let aria_spec = aria::get_aria_spec(spec, version);
                for aria_attr in &aria_attrs {
                    check_value(
                        aria_attr,
                        resolved_role,
                        &aria_spec.props,
                        &mut violations,
                        self.id(),
                        &rule_config.severity,
                    );
                }
            }

            // Check disallowDefaultValue (default: false)
            if is_option_enabled(&rule_config.options, "disallowDefaultValue", false) {
                let aria_spec = aria::get_aria_spec(spec, version);
                for aria_attr in &aria_attrs {
                    check_default_value(
                        aria_attr,
                        &aria_spec.props,
                        &mut violations,
                        self.id(),
                        &rule_config.severity,
                    );
                }
            }

            // TODO: checkingAllowedAccessibilityChildRoles (default: true)
            // Requires DOM tree traversal to check child roles against
            // role.allowed_accessibility_child_roles. Config is read but
            // implementation deferred until DOM child iteration API is available.

            // TODO: checkingRequiredOwnedElements (default: true, deprecated alias)
            // Same as checkingAllowedAccessibilityChildRoles.

            // TODO: checkingRequiredAccessibilityParentRole (default: true)
            // Requires DOM tree traversal to check parent context against
            // role.required_accessibility_parent_role / role.required_context_role.

            // TODO: checkingPresentationalChildren (default: false)
            // Requires DOM tree traversal to check ARIA on descendants of
            // roles with children_presentational = true.

            // TODO: checkingInteractionInHidden (default: false)
            // Requires checking if element is focusable/interactive and
            // within an aria-hidden subtree. Needs DOM tree traversal.
        }

        violations
    }
}

/// Resolve the ARIA version from the options.
fn resolve_version(options: &serde_json::Value) -> ARIAVersion {
    match options.get("version").and_then(serde_json::Value::as_str) {
        Some("1.1") => ARIAVersion::V1_1,
        Some("1.2") => ARIAVersion::V1_2,
        Some("1.3") => ARIAVersion::V1_3,
        _ => ARIAVersion::RECOMMENDED,
    }
}

/// Check if an option is explicitly disabled (value === false).
fn is_option_disabled(options: &serde_json::Value, key: &str) -> bool {
    options.get(key).and_then(serde_json::Value::as_bool) == Some(false)
}

/// Check if an option is enabled (with a given default).
fn is_option_enabled(options: &serde_json::Value, key: &str, default: bool) -> bool {
    options.get(key).and_then(serde_json::Value::as_bool).unwrap_or(default)
}

/// Check role attribute: unknown, abstract, deprecated, permitted, and implicit role checks.
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
    severity: &crate::violation::Severity,
) {
    let role_value = &role_attr_node.value.raw;

    // Check each token in space-separated role value
    for token in role_value.split_whitespace() {
        let role_name = token.to_ascii_lowercase();

        if aria::get_role_spec(spec, &role_name, version).is_none() {
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                severity: severity.clone(),
                message: format!("The \"{token}\" role does not exist according to the WAI-ARIA specification."),
                line: role_attr_node.value.line,
                col: role_attr_node.value.col,
                raw: role_attr_node.raw.clone(),
            });
            break;
        }

        if aria::is_abstract_role(spec, &role_name, version) {
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                severity: severity.clone(),
                message: format!("The \"{token}\" role is the abstract role"),
                line: role_attr_node.value.line,
                col: role_attr_node.value.col,
                raw: role_attr_node.raw.clone(),
            });
            break;
        }
    }

    // Check deprecated role (checkingDeprecatedRole, default: true)
    if is_option_enabled(options, "checkingDeprecatedRole", true) {
        for token in role_value.split_whitespace() {
            let role_name = token.to_ascii_lowercase();
            if let Some(role_spec) = aria::get_role_spec(spec, &role_name, version)
                && role_spec.deprecated == Some(true)
            {
                violations.push(Violation {
                    rule_id: rule_id.to_string(),
                    severity: severity.clone(),
                    message: format!("The \"{token}\" role is deprecated"),
                    line: role_attr_node.value.line,
                    col: role_attr_node.value.col,
                    raw: role_attr_node.raw.clone(),
                });
                break;
            }
        }
    }

    let implicit_role = get_effective_implicit_role(spec, arena, node_id, el_name, version);
    let disallow_implicit = is_option_enabled(options, "disallowSetImplicitRole", true);

    // Check permitted roles (skip if role matches implicit and disallowSetImplicitRole is false)
    if !is_option_disabled(options, "permittedAriaRoles") {
        let role_is_implicit = implicit_role.as_ref().is_some_and(|ir| {
            role_value
                .split_whitespace()
                .next()
                .is_some_and(|t| t.eq_ignore_ascii_case(ir))
        });
        if disallow_implicit || !role_is_implicit {
            check_permitted_roles(spec, el_name, role_attr_node, version, violations, rule_id, severity);
        }
    }

    // Check disallowSetImplicitRole (default: true)
    if disallow_implicit && let Some(ref ir) = implicit_role {
        for token in role_value.split_whitespace() {
            if token.eq_ignore_ascii_case(ir) {
                violations.push(Violation {
                    rule_id: rule_id.to_string(),
                    severity: severity.clone(),
                    message: format!("The \"{token}\" role is the implicit role of the \"{el_name}\" element"),
                    line: role_attr_node.value.line,
                    col: role_attr_node.value.col,
                    raw: role_attr_node.raw.clone(),
                });
                break;
            }
        }
    }
}

/// Check if the role is permitted on the element.
fn check_permitted_roles(
    spec: &MLMLSpec,
    element_name: &str,
    role_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    version: ARIAVersion,
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: &crate::violation::Severity,
) {
    // If any role is permitted, skip
    if aria::is_any_role_permitted(spec, element_name) {
        return;
    }

    let permitted = aria::get_base_permitted_roles(spec, element_name);

    match permitted {
        // permittedRoles is an empty list → no role override allowed
        Some(ref roles) if roles.is_empty() => {
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                severity: severity.clone(),
                message: format!(
                    "Cannot overwrite the role of the \"{element_name}\" element according to ARIA in HTML specification"
                ),
                line: role_attr.name.line,
                col: role_attr.name.col,
                raw: role_attr.raw.clone(),
            });
        }
        // permittedRoles is a specific list → check each token
        Some(ref roles) => {
            let role_value = &role_attr.value.raw;
            for token in role_value.split_whitespace() {
                let role_name = token.to_ascii_lowercase();
                // Only check if role exists (non-existent roles are caught by earlier check)
                if aria::get_role_spec(spec, &role_name, version).is_some()
                    && !roles.iter().any(|r| r.eq_ignore_ascii_case(&role_name))
                {
                    violations.push(Violation {
                        rule_id: rule_id.to_string(),
                        severity: severity.clone(),
                        message: format!(
                            "Cannot overwrite the \"{token}\" role to the \"{element_name}\" element according to ARIA in HTML specification"
                        ),
                        line: role_attr.value.line,
                        col: role_attr.value.col,
                        raw: role_attr.raw.clone(),
                    });
                    break;
                }
            }
        }
        // None → any role permitted (true)
        None => {}
    }
}

/// Get the effective implicit role for an element, evaluating conditions.
///
/// This mirrors the condition evaluation in `computed_role.rs::get_implicit_role`
/// but returns just the role name string.
fn get_effective_implicit_role(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    element_name: &str,
    version: ARIAVersion,
) -> Option<String> {
    let base_role = aria::get_base_implicit_role(spec, element_name)?;

    // Check conditions that may override the implicit role
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
                    // Verify the overridden role exists
                    if aria::get_role_spec(spec, newrole_name, version).is_some() {
                        return Some(newrole_name.to_string());
                    }
                }
            }
        }
    }

    Some(base_role.to_string())
}

/// Check if an ARIA property is deprecated on the element's computed role.
fn check_deprecated_prop(
    spec: &MLMLSpec,
    attr: &markuplint_core::mlast::MLASTHTMLAttr,
    role: Option<&markuplint_types::spec::types::ARIARoleInSchema>,
    version: ARIAVersion,
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: &crate::violation::Severity,
) {
    let Some(role) = role else {
        return;
    };

    let attr_name = attr.node_name.to_ascii_lowercase();

    // Check if this property is deprecated on the role
    let owned_prop = role.owned_properties.iter().find(|p| p.name == attr_name);
    if let Some(prop) = owned_prop
        && prop.deprecated == Some(true)
    {
        // Look up the property spec to get its type (property vs state)
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
            severity: severity.clone(),
            message: format!(
                "The \"{attr_name}\" ARIA {prop_type} is deprecated on the \"{}\" role",
                role.name
            ),
            line: attr.name.line,
            col: attr.name.col,
            raw: attr.raw.clone(),
        });
    }
}

/// Check if an ARIA property duplicates semantics of an equivalent HTML attribute.
fn check_implicit_props(
    spec: &MLMLSpec,
    attr: &markuplint_core::mlast::MLASTHTMLAttr,
    el: &markuplint_dom::node::ElementData,
    props: &[markuplint_types::spec::types::ARIAProperty],
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: &crate::violation::Severity,
) {
    let attr_name = attr.node_name.to_ascii_lowercase();

    // Find the ARIA property spec
    let Some(prop_spec) = props.iter().find(|p| p.name == attr_name) else {
        return;
    };

    // Check if there are equivalent HTML attributes
    let Some(ref equiv_attrs) = prop_spec.equivalent_html_attrs else {
        return;
    };

    let prop_type = match prop_spec.prop_type {
        markuplint_types::spec::types::ARIAPropertyType::Property => "property",
        markuplint_types::spec::types::ARIAPropertyType::State => "state",
    };

    // Get element's attribute specs to check if the equivalent HTML attr is valid on this element
    let el_spec = markuplint_types::spec::lookup::get_spec(spec, &el.base.node_name);

    for equiv in equiv_attrs {
        // Check if the equivalent HTML attribute is valid on this element
        // (exists in the element's attribute spec or global attrs)
        let html_attr_exists_on_element = el_spec.is_some_and(|es| es.attributes.contains_key(&equiv.html_attr_name));
        if !html_attr_exists_on_element {
            // Also check global attrs — simplified: skip if attr is not on element
            continue;
        }

        let aria_value = attr.value.raw.trim().to_ascii_lowercase();

        // Check if the element has the equivalent HTML attribute set
        let html_attr_on_element = el.attributes.iter().find(|a| {
            if let MLASTAttr::HTMLAttr(ha) = a {
                ha.node_name.eq_ignore_ascii_case(&equiv.html_attr_name)
            } else {
                false
            }
        });

        if let Some(MLASTAttr::HTMLAttr(html_attr_node)) = html_attr_on_element {
            let html_value = html_attr_node.value.raw.trim().to_ascii_lowercase();
            // Same semantics check
            let is_same = match &equiv.value {
                None => html_value == aria_value,
                Some(v) => v == &aria_value,
            };

            if is_same {
                violations.push(Violation {
                    rule_id: rule_id.to_string(),
                    severity: severity.clone(),
                    message: format!(
                        "The \"{attr_name}\" ARIA {prop_type} has the same semantics as the current \"{0}\" attribute or the implicit \"{0}\" attribute",
                        equiv.html_attr_name
                    ),
                    line: attr.name.line,
                    col: attr.name.col,
                    raw: attr.raw.clone(),
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
                severity: severity.clone(),
                message: format!(
                    "The \"{attr_name}\" ARIA {prop_type} contradicts the current \"{0}\" attribute",
                    equiv.html_attr_name
                ),
                line: attr.name.line,
                col: attr.name.col,
                raw: attr.raw.clone(),
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
                    severity: severity.clone(),
                    message: format!(
                        "The \"{attr_name}\" ARIA {prop_type} contradicts the implicit \"{0}\" attribute",
                        equiv.html_attr_name
                    ),
                    line: attr.name.line,
                    col: attr.name.col,
                    raw: attr.raw.clone(),
                });
                return;
            }
        }
    }
}

/// Validate ARIA property values against the ARIA spec.
fn check_value(
    attr: &markuplint_core::mlast::MLASTHTMLAttr,
    role: Option<&markuplint_types::spec::types::ARIARoleInSchema>,
    props: &[markuplint_types::spec::types::ARIAProperty],
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: &crate::violation::Severity,
) {
    let attr_name = attr.node_name.to_ascii_lowercase();

    let Some(prop_spec) = props.iter().find(|p| p.name == attr_name) else {
        return; // Unknown property — skip (not our concern here)
    };

    // Resolve the effective value type (may be overridden by role-specific conditional)
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

        violations.push(Violation {
            rule_id: rule_id.to_string(),
            severity: severity.clone(),
            message,
            line: attr.value.line,
            col: attr.value.col,
            raw: attr.raw.clone(),
        });
    }
}

/// Validate a raw ARIA value against the expected value type.
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
        ARIAAttributeValue::Integer => {
            value.parse::<i64>().is_ok() && value.parse::<i64>().unwrap().to_string() == value
        }
        ARIAAttributeValue::Number => {
            value.parse::<f64>().is_ok() && value.parse::<f64>().unwrap().to_string() == value
        }
    }
}

/// Check if ARIA property value is set to its default value (disallowDefaultValue).
fn check_default_value(
    attr: &markuplint_core::mlast::MLASTHTMLAttr,
    props: &[markuplint_types::spec::types::ARIAProperty],
    violations: &mut Vec<Violation>,
    rule_id: &str,
    severity: &crate::violation::Severity,
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
            severity: severity.clone(),
            message: format!("The \"{attr_name}\" ARIA {prop_type} is set to its default value \"{default_val}\""),
            line: attr.name.line,
            col: attr.name.col,
            raw: attr.raw.clone(),
        });
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
    fn deprecated_role_check_disabled() {
        // When checkingDeprecatedRole is false, no deprecated role violation
        let arena = make_element_with_attrs("div", &[("role", "button")]);
        let s = spec();
        let rule = WaiAria;
        let config = RuleConfig {
            options: serde_json::json!({ "checkingDeprecatedRole": false }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let dep_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("is deprecated"))
            .collect();
        assert!(
            dep_violations.is_empty(),
            "No deprecated violation when check is disabled"
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
}
