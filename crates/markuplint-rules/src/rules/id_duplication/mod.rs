//! `id-duplication` rule: reports duplicate `id` attribute values across all elements.

use std::collections::HashMap;

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

/// The `id-duplication` rule.
pub struct IdDuplication;

impl Rule for IdDuplication {
    fn id(&self) -> &'static str {
        "id-duplication"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        let mut seen: HashMap<String, Vec<(u32, u32, String)>> = HashMap::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                if html_attr.is_dynamic_value == Some(true) || html_attr.is_directive == Some(true) {
                    continue;
                }

                if html_attr.node_name.eq_ignore_ascii_case("id") {
                    let value = html_attr.value.raw.clone();
                    if value.is_empty() {
                        continue;
                    }
                    seen.entry(value).or_default().push((
                        html_attr.name.line,
                        html_attr.name.col,
                        html_attr.raw.clone(),
                    ));
                }
            }
        }

        for locations in seen.values() {
            if locations.len() > 1 {
                for &(line, col, ref raw) in &locations[1..] {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: config.global().severity,
                        // TS message: The value of the "id" attribute is duplicated
                        message: "The value of the \"id\" attribute is duplicated".to_string(),
                        line,
                        col,
                        raw: raw.clone(),
                        reason: None,
                    });
                }
            }
        }

        violations
    }
}
