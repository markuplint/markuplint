//! `no-boolean-attr-value` rule: boolean attributes should not have explicit values.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::lookup::get_attr_specs;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `no-boolean-attr-value` rule.
pub struct NoBooleanAttrValue;

impl Rule for NoBooleanAttrValue {
    fn id(&self) -> &'static str {
        "no-boolean-attr-value"
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

                // Skip dynamic values
                if html_attr.is_dynamic_value == Some(true) {
                    continue;
                }

                let attr_name_lower = html_attr.node_name.to_ascii_lowercase();
                let Some(attr_spec) = attr_specs.get(attr_name_lower.as_str()) else {
                    continue;
                };

                // Check if the attribute type is "Boolean"
                let is_boolean = attr_spec.attr_type.as_str() == Some("Boolean");
                if !is_boolean {
                    continue;
                }

                // If the attribute has an equal sign and a value, report
                if !html_attr.equal.raw.is_empty() && !html_attr.value.raw.is_empty() {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        severity: rule_config.severity.clone(),
                        message: format!(
                            "\"{}\" is a boolean attribute. It doesn't need the value",
                            html_attr.node_name
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
    fn boolean_attr_with_value_violation() {
        // "checked" on <input> has type "Boolean" in the spec
        let arena = make_element_with_attrs("input", &[("checked", "checked")]);
        let s = spec();
        let rule = NoBooleanAttrValue;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "\"checked\" is a boolean attribute. It doesn't need the value"
        );
    }

    #[test]
    fn non_boolean_attr_no_violation() {
        let arena = make_element_with_attrs("input", &[("type", "text")]);
        let s = spec();
        let rule = NoBooleanAttrValue;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn unknown_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("data-foo", "bar")]);
        let s = spec();
        let rule = NoBooleanAttrValue;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
