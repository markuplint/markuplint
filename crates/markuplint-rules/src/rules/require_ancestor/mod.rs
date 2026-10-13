//! `require-ancestor` rule: an element outside the ancestor its content model requires.
//!
//! Ports `packages/@markuplint/rules/src/require-ancestor/`. The required ancestor is the
//! selector of `contentModel.descendantOf` in the spec of the element's local name (e.g. an
//! `area` must have a `map` ancestor). An element with no ancestor matching it is reported.

use markuplint_dom::arena::DomArena;
use markuplint_selector::{matcher, parser};
use markuplint_types::spec::types::MLMLSpec;

use crate::helpers::{ancestor_elements, content_model_field};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct RequireAncestor;

impl Rule for RequireAncestor {
    fn id(&self) -> &'static str {
        "require-ancestor"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        for (node_id, el) in arena.elements() {
            let Some(descendant_of) =
                content_model_field(spec, &el.base.node_name, "descendantOf").and_then(serde_json::Value::as_str)
            else {
                continue;
            };
            let Ok(selector) = parser::parse(descendant_of) else {
                continue;
            };
            if ancestor_elements(arena, node_id)
                .any(|ancestor| matcher::matches(&selector, arena, ancestor, None, Some(spec), None))
            {
                continue;
            }
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message: format!(
                    "The \"{}\" element must appear as a descendant of the \"{descendant_of}\" element",
                    el.base.node_name
                ),
                line: el.base.line,
                col: el.base.col,
                raw: el.base.raw.clone(),
                reason: rule_config.reason.clone(),
            });
        }
        violations
    }
}
