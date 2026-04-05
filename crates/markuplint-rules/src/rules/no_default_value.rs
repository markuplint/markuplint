//! `no-default-value` rule: attributes should not be explicitly set to their default value.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::lookup::{get_attr_specs, get_spec};
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `no-default-value` rule.
pub struct NoDefaultValue;

impl Rule for NoDefaultValue {
    fn id(&self) -> &'static str {
        "no-default-value"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let attr_specs = get_attr_specs(spec, &el.base.node_name);

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                let attr_name_lower = html_attr.node_name.to_ascii_lowercase();

                // Get default value from element-specific or global attribute spec
                // Element-specific attrs may have the name but no defaultValue — fall back
                let default_value = match attr_specs.get(attr_name_lower.as_str()) {
                    Some(attr_spec) if attr_spec.default_value.is_some() => attr_spec.default_value.as_deref(),
                    _ => get_global_attr_default(spec, &el.base.node_name, &attr_name_lower),
                };
                let Some(default_value) = default_value else {
                    continue;
                };

                // Case-insensitive comparison of attribute value against default
                if html_attr.value.raw.eq_ignore_ascii_case(default_value) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: "It is the default value".to_string(),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.raw.clone(),
                        reason: None,
                    });
                }
            }
        }

        violations
    }
}

/// Get the default value of a global attribute from the raw JSON spec.
fn get_global_attr_default<'a>(spec: &'a MLMLSpec, element_name: &str, attr_name: &str) -> Option<&'a str> {
    let el = get_spec(spec, element_name)?;
    for category in el.global_attrs.keys() {
        if category == "#ARIAAttrs" || category == "#GlobalEventAttrs" {
            continue;
        }
        if let Some(attrs_map) = spec.def.global_attrs.get(category)
            && let Some(attr_val) = attrs_map.get(attr_name)
        {
            return attr_val.get("defaultValue").and_then(serde_json::Value::as_str);
        }
    }
    None
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
    fn default_value_violation() {
        // <input> has type attribute with default "text"
        let arena = make_element_with_attrs("input", &[("type", "text")]);
        let s = spec();
        let rule = NoDefaultValue;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "It is the default value");
    }

    #[test]
    fn non_default_value_no_violation() {
        let arena = make_element_with_attrs("input", &[("type", "password")]);
        let s = spec();
        let rule = NoDefaultValue;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn no_default_in_spec_no_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = NoDefaultValue;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn non_matching_value_no_violation() {
        // <input type="email"> — default for type is "text", "email" is not the default
        let arena = make_element_with_attrs("input", &[("type", "email")]);
        let s = spec();
        let rule = NoDefaultValue;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
