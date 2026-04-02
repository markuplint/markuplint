//! `ineffective-attr` rule: report attributes that have no effect on their owner element.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_selector::matcher;
use markuplint_selector::parser;
use markuplint_types::spec::lookup::get_attr_specs;
use markuplint_types::spec::types::{AttributeCondition, MLMLSpec};

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `ineffective-attr` rule.
pub struct IneffectiveAttr;

impl Rule for IneffectiveAttr {
    fn id(&self) -> &'static str {
        "ineffective-attr"
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
                let Some(attr_spec) = attr_specs.get(attr_name_lower.as_str()) else {
                    continue;
                };

                let Some(ref ineffective) = attr_spec.ineffective else {
                    continue;
                };

                let selectors = match ineffective {
                    AttributeCondition::Single(s) => vec![s.as_str()],
                    AttributeCondition::Multiple(v) => v.iter().map(String::as_str).collect(),
                };

                let is_ineffective = selectors.iter().any(|sel_str| {
                    let Ok(sel) = parser::parse(sel_str) else {
                        return false;
                    };
                    matcher::matches(&sel, arena, node_id, Some(node_id), Some(spec), None)
                });

                if is_ineffective {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity.clone(),
                        message: format!("The \"{}\" attribute is ineffective", html_attr.node_name),
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
    fn normal_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = IneffectiveAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn unknown_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("data-x", "y")]);
        let s = spec();
        let rule = IneffectiveAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn input_type_text_with_alt_no_violation() {
        // alt on input[type=text] is not ineffective per spec
        let arena = make_element_with_attrs("input", &[("type", "text"), ("alt", "photo")]);
        let s = spec();
        let rule = IneffectiveAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn attribute_without_ineffective_spec_no_violation() {
        // The "class" attribute on <div> has no ineffective condition in the spec
        let arena = make_element_with_attrs("div", &[("class", "container")]);
        let s = spec();
        let rule = IneffectiveAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
