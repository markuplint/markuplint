//! `attr-duplication` rule: reports duplicate attributes on elements.
//!
//! Ports `packages/@markuplint/rules/src/attr-duplication/`.

use std::collections::HashMap;

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
pub(crate) mod tests;

/// The `attr-duplication` rule.
pub struct AttrDuplication;

impl Rule for AttrDuplication {
    fn id(&self) -> &'static str {
        "attr-duplication"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let mut seen: HashMap<String, usize> = HashMap::new();

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                let name_lower = html_attr.node_name.to_ascii_lowercase();
                let count = seen.entry(name_lower.clone()).or_insert(0);
                *count += 1;

                if *count > 1 {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: "The attribute name is duplicated".to_string(),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.name.raw.clone(),
                    });
                }
            }
        }

        violations
    }
}
