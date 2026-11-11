//! `no-ineffective-attr` rule: report attributes that have no effect on their owner element.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::attr_name;
use markuplint_selector::matcher;
use markuplint_types::spec::types::{AttributeCondition, MLMLSpec};

use crate::attr_name_key::{attr_specs_of, find_attr_spec};
use crate::diagnostic;
use crate::fix::Fix;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoIneffectiveAttr;

impl Rule for NoIneffectiveAttr {
    fn id(&self) -> &'static str {
        "no-ineffective-attr"
    }

    /// Matches TS `createRule({ defaultSeverity: 'warning' })`.
    fn default_severity(&self) -> crate::violation::Severity {
        crate::violation::Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let Some(attr_specs) = attr_specs_of(spec, el) else {
                continue;
            };

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };
                // TS `attr.isAbsent`: an attribute that the framework does not output (`defer={false}`)
                // is not an attribute of the element
                if markuplint_dom::helpers::is_absent(html_attr) {
                    continue;
                }

                // TS `findAttrSpec`: the spec the attribute names as the DOM names it
                let Some(attr_spec) = find_attr_spec(&attr_specs, el, html_attr) else {
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
                    let Some(sel) = diagnostic::parse_selector("spec attribute ineffective condition", sel_str) else {
                        return false;
                    };
                    matcher::matches(&sel, arena, node_id, Some(node_id), Some(spec), None)
                });

                if is_ineffective {
                    let raw_name = attr_name(html_attr);
                    // TS: The "name" attribute is ineffective. It doesn't need the attribute
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: format!("The \"{raw_name}\" attribute is ineffective. It doesn't need the attribute"),
                        line: html_attr.line,
                        col: html_attr.col,
                        raw: html_attr.raw.clone(),
                        reason: rule_config.reason.clone(),
                        fix: Fix::remove_attr(html_attr),
                    });
                }
            }
        }

        violations
    }
}
