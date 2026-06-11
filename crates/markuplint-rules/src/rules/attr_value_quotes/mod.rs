//! `attr-value-quotes` rule: attribute values must use consistent quote style.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct AttrValueQuotes;

impl Rule for AttrValueQuotes {
    fn id(&self) -> &'static str {
        "attr-value-quotes"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let quote_style = config.global().value.as_str().unwrap_or("double");

        let (expected_quote, message) = match quote_style {
            "single" => ("'", "Attribute value is must quote on single quotation mark"),
            _ => ("\"", "Attribute value is must quote on double quotation mark"),
        };

        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                // Boolean attributes have neither value nor quotes, so there is nothing to check.
                if html_attr.value.raw.is_empty() && html_attr.start_quote.raw.is_empty() {
                    continue;
                }

                if html_attr.start_quote.raw != expected_quote {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: message.to_string(),
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
