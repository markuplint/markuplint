//! `no-ambiguous-navigable-target-names` rule: navigable target names should not be ambiguous keywords.
//!
//! Values like "self", "blank", "parent", "top" without a leading underscore are likely
//! typos for "_self", "_blank", "_parent", "_top".
//!
//! Uses spec-based attribute type lookup (`NavigableTargetNameOrKeyword` or
//! `NavigableTargetName`) instead of hardcoding attribute names.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::lookup::{get_attr_specs, get_spec};
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `no-ambiguous-navigable-target-names` rule.
pub struct NoAmbiguousNavigableTargetNames;

impl Rule for NoAmbiguousNavigableTargetNames {
    fn id(&self) -> &'static str {
        "no-ambiguous-navigable-target-names"
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

                let attr_name = html_attr.node_name.to_ascii_lowercase();

                // Check if the attribute has NavigableTargetNameOrKeyword or
                // NavigableTargetName type (from element-specific or global spec)
                if !is_navigable_target_type(&attr_specs, &attr_name, spec, &el.base.node_name) {
                    continue;
                }

                let value = html_attr.value.raw.trim();

                // Skip if already has underscore prefix
                if value.starts_with('_') || value.is_empty() {
                    continue;
                }

                // Check if adding underscore makes it a valid keyword
                let with_underscore = format!("_{}", value.to_ascii_lowercase());
                if is_navigable_keyword(&with_underscore) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity.clone(),
                        message: format!(
                            "Don't use an ambiguous navigable target name. Did you mean \"{with_underscore}\"?"
                        ),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.raw.clone(),
                    });
                }
            }
        }

        violations
    }
}

/// Check if an attribute has `NavigableTargetNameOrKeyword` or `NavigableTargetName` type.
fn is_navigable_target_type(
    attr_specs: &std::collections::HashMap<&str, &markuplint_types::spec::types::Attribute>,
    attr_name: &str,
    spec: &MLMLSpec,
    el_name: &str,
) -> bool {
    // Check element-specific attribute
    if let Some(attr_spec) = attr_specs.get(attr_name)
        && is_navigable_type_value(&attr_spec.attr_type)
    {
        return true;
    }
    // Check global attribute
    if let Some(el) = get_spec(spec, el_name) {
        for category in el.global_attrs.keys() {
            if let Some(attrs_map) = spec.def.global_attrs.get(category)
                && let Some(attr_val) = attrs_map.get(attr_name)
                && let Some(type_val) = attr_val.get("type")
                && is_navigable_type_value(type_val)
            {
                return true;
            }
        }
    }
    false
}

/// Check if a type value is `NavigableTargetNameOrKeyword` or `NavigableTargetName`.
fn is_navigable_type_value(type_val: &serde_json::Value) -> bool {
    match type_val {
        serde_json::Value::String(s) => s == "NavigableTargetNameOrKeyword" || s == "NavigableTargetName",
        serde_json::Value::Array(arr) => arr.iter().any(is_navigable_type_value),
        _ => false,
    }
}

/// Check if a value with underscore prefix is a valid navigable keyword.
fn is_navigable_keyword(value: &str) -> bool {
    matches!(value, "_self" | "_blank" | "_parent" | "_top")
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
    fn ambiguous_blank_violation() {
        let arena = make_element_with_attrs("a", &[("target", "blank")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Don't use an ambiguous navigable target name. Did you mean \"_blank\"?"
        );
    }

    #[test]
    fn correct_underscore_blank_no_violation() {
        let arena = make_element_with_attrs("a", &[("target", "_blank")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn ambiguous_self_violation() {
        let arena = make_element_with_attrs("a", &[("target", "self")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Don't use an ambiguous navigable target name. Did you mean \"_self\"?"
        );
    }

    #[test]
    fn custom_target_name_no_violation() {
        let arena = make_element_with_attrs("a", &[("target", "myframe")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn ambiguous_parent_violation() {
        let arena = make_element_with_attrs("a", &[("target", "parent")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Don't use an ambiguous navigable target name. Did you mean \"_parent\"?"
        );
    }

    #[test]
    fn correct_underscore_top_no_violation() {
        let arena = make_element_with_attrs("a", &[("target", "_top")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn ambiguous_top_violation() {
        let arena = make_element_with_attrs("a", &[("target", "top")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Don't use an ambiguous navigable target name. Did you mean \"_top\"?"
        );
    }
}
