//! `wai-aria` rule: validate WAI-ARIA role, states, and properties.
//!
//! Initial implementation focuses on the highest-value checks:
//! 1. Unknown role detection (role value not in ARIA spec)
//! 2. Abstract role detection (role value is abstract)
//! 3. Deprecated ARIA property detection
//! 4. Permitted roles check (role allowed on element)

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria::{self, ARIAVersion};
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfig};
use crate::violation::Violation;

/// The `wai-aria` rule.
pub struct WaiAria;

impl Rule for WaiAria {
    fn id(&self) -> &'static str {
        "wai-aria"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation> {
        let mut violations = Vec::new();
        let version = ARIAVersion::RECOMMENDED;

        for (_node_id, el) in arena.elements() {
            if el.is_ghost {
                continue;
            }

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
                let role_value = &role_attr_node.value.raw;

                // Check each token in space-separated role value
                for token in role_value.split_whitespace() {
                    let role_name = token.to_ascii_lowercase();

                    // Check if role exists
                    let role_spec = aria::get_role_spec(spec, &role_name, version);
                    if role_spec.is_none() {
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            severity: config.severity.clone(),
                            message: format!(
                                "The \"{token}\" role does not exist according to the WAI-ARIA specification."
                            ),
                            line: role_attr_node.value.line,
                            col: role_attr_node.value.col,
                            raw: role_attr_node.raw.clone(),
                        });
                        // Stop checking further tokens — first error wins (like TS)
                        break;
                    }

                    // Check if abstract
                    if aria::is_abstract_role(spec, &role_name, version) {
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            severity: config.severity.clone(),
                            message: format!("The \"{token}\" role is the abstract role"),
                            line: role_attr_node.value.line,
                            col: role_attr_node.value.col,
                            raw: role_attr_node.raw.clone(),
                        });
                        break;
                    }
                }

                // Check permitted roles
                if !check_permitted_roles_disabled(&config.options) {
                    check_permitted_roles(
                        spec,
                        el_name,
                        role_attr_node,
                        version,
                        &mut violations,
                        self.id(),
                        &config.severity,
                    );
                }
            }

            // Check deprecated aria-* properties
            if !check_deprecated_props_disabled(&config.options) {
                // Resolve the computed role for property checking
                let role_value = role_attr.map(|a| a.value.raw.as_str());
                let resolved_role = role_value.and_then(|rv| aria::resolve_explicit_role(spec, rv, version).ok());

                for aria_attr in &aria_attrs {
                    check_deprecated_prop(
                        spec,
                        aria_attr,
                        resolved_role,
                        version,
                        &mut violations,
                        self.id(),
                        &config.severity,
                    );
                }
            }
        }

        violations
    }
}

/// Check if `permittedAriaRoles` option is disabled.
fn check_permitted_roles_disabled(options: &serde_json::Value) -> bool {
    options.get("permittedAriaRoles").and_then(serde_json::Value::as_bool) == Some(false)
}

/// Check if `checkingDeprecatedProps` option is disabled.
fn check_deprecated_props_disabled(options: &serde_json::Value) -> bool {
    options
        .get("checkingDeprecatedProps")
        .and_then(serde_json::Value::as_bool)
        == Some(false)
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

#[cfg(test)]
mod tests {
    use super::*;
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
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty(), "valid role should not produce violations");
    }

    #[test]
    fn unknown_role_violation() {
        let arena = make_element_with_attrs("div", &[("role", "nonexistent")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
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
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
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
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
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
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }

    #[test]
    fn multiple_roles_first_invalid() {
        // "nonexistent button" — first token is unknown
        let arena = make_element_with_attrs("div", &[("role", "nonexistent button")]);
        let s = spec();
        let rule = WaiAria;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
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
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
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
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
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
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        // doc-bibliography is a valid dpub role; may or may not be permitted on div
        // At minimum, it should not produce "does not exist" violation
        let has_nonexist = violations.iter().any(|v| v.message.contains("does not exist"));
        assert!(!has_nonexist, "dpub roles should be recognized");
    }
}
