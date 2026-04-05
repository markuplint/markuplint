//! `case-sensitive-attr-name` rule: attribute names must be lowercase (or uppercase per config).

use markuplint_core::mlast::{MLASTAttr, NamespaceURI};
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::get_raw_attr_name;
use markuplint_types::spec::lookup::get_attr_specs;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

/// The `case-sensitive-attr-name` rule.
pub struct CaseSensitiveAttrName;

impl Rule for CaseSensitiveAttrName {
    fn id(&self) -> &'static str {
        "case-sensitive-attr-name"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let case = config.global().value.as_str().unwrap_or("lower");
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            // Only check HTML namespace elements
            if el.namespace != NamespaceURI::XHTML {
                continue;
            }

            let attr_specs = get_attr_specs(spec, &el.base.node_name);

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                // Use raw attr name from source to preserve original case
                let raw_name = get_raw_attr_name(html_attr);

                // If the spec says this attribute is case-sensitive, skip enforcement
                let attr_name_lower = raw_name.to_ascii_lowercase();
                if let Some(attr_spec) = attr_specs.get(attr_name_lower.as_str())
                    && attr_spec.case_sensitive == Some(true)
                {
                    continue;
                }

                let is_correct = match case {
                    "upper" => raw_name == raw_name.to_ascii_uppercase(),
                    _ => raw_name == raw_name.to_ascii_lowercase(),
                };

                if !is_correct {
                    // TS uses "should" for warning, "must" for error
                    let verb = if rule_config.severity == Severity::Warning {
                        "should"
                    } else {
                        "must"
                    };
                    let case_str = if case == "upper" { "uppercase" } else { "lowercase" };
                    let message = format!("Attribute names of HTML elements {verb} be {case_str}");
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message,
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
