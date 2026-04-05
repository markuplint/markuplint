//! `ineffective-attr` rule: report attributes that have no effect on their owner element.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::get_raw_attr_name;
use markuplint_selector::matcher;
use markuplint_selector::parser;
use markuplint_types::spec::lookup::get_attr_specs;
use markuplint_types::spec::types::{AttributeCondition, MLMLSpec};

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

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
                    let raw_name = get_raw_attr_name(html_attr);
                    // TS: The "name" attribute is ineffective. It doesn't need the attribute
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: format!("The \"{raw_name}\" attribute is ineffective. It doesn't need the attribute"),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.name.raw.clone(),
                    reason: None,
            });
                }
            }
        }

        violations
    }
}
