//! `deprecated-element` rule: reports deprecated or obsolete elements.

use markuplint_core::mlast::NamespaceURI;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::lookup::get_spec;
use markuplint_types::spec::types::{MLMLSpec, Obsolete};

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct DeprecatedElement;

impl Rule for DeprecatedElement {
    fn id(&self) -> &'static str {
        "deprecated-element"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if el.namespace != NamespaceURI::XHTML && el.namespace != NamespaceURI::SVG {
                continue;
            }

            let Some(el_spec) = get_spec(spec, &el.base.node_name) else {
                continue;
            };

            if el_spec.deprecated == Some(true) {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: format!("The \"{}\" element is deprecated", el.base.node_name),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                    reason: None,
                });
                continue;
            }

            if let Some(Obsolete::Flag(true) | Obsolete::Info { .. }) = &el_spec.obsolete {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: format!("The \"{}\" element is obsolete", el.base.node_name),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                    reason: None,
                });
            }
        }

        violations
    }
}
