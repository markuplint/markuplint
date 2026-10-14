//! `no-duplicate-attr` rule: reports duplicate attributes on elements.
//!
//! Ports `packages/@markuplint/rules/src/no-duplicate-attr/`.

use std::collections::HashMap;

use markuplint_core::mlast::{ElementType, MLASTAttr};
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::attr_name;
use crate::fix::Fix;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
pub(crate) mod tests;

pub struct NoDuplicateAttr;

impl Rule for NoDuplicateAttr {
    fn id(&self) -> &'static str {
        "no-duplicate-attr"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let mut seen: HashMap<String, usize> = HashMap::new();
            // TS compares names case-insensitively on an element written as an HTML element
            // only (`node.elementType`, which a pretender does not change).
            let case_insensitive = *el.identity(true).element_type == ElementType::Html;

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };
                // An attribute a pretender adds may repeat one written on the element.
                if html_attr.is_duplicatable {
                    continue;
                }

                // TS `attr.name`: the name the parser resolved (`:href` is `href`), else as written.
                let name = attr_name(html_attr);
                let name = if case_insensitive {
                    name.to_ascii_lowercase()
                } else {
                    name.to_owned()
                };
                let count = seen.entry(name).or_insert(0);
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
                        reason: None,
                        fix: Fix::remove_attr(html_attr),
                    });
                }
            }
        }

        violations
    }
}
