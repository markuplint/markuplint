//! `no-disallowed-ancestor` rule: an element inside an ancestor its content model forbids.
//!
//! Ports `packages/@markuplint/rules/src/no-disallowed-ancestor/`. The forbidden ancestors
//! are the selectors of `contentModel.forbiddenAncestors` in the spec of the element's local
//! name (e.g. `address` must not have an `address` ancestor). The nearest ancestor that
//! matches one of them is reported, once per element.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_selector::{matcher, parser};
use markuplint_types::spec::types::MLMLSpec;

use crate::helpers::{ancestor_elements, content_model_field};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoDisallowedAncestor;

impl Rule for NoDisallowedAncestor {
    fn id(&self) -> &'static str {
        "no-disallowed-ancestor"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        for (node_id, el) in arena.elements() {
            let Some(serde_json::Value::Array(forbidden)) =
                content_model_field(spec, &el.base.node_name, "forbiddenAncestors")
            else {
                continue;
            };
            let selectors: Vec<_> = forbidden
                .iter()
                .filter_map(serde_json::Value::as_str)
                .filter_map(|s| parser::parse(s).ok())
                .collect();
            if selectors.is_empty() {
                continue;
            }
            let Some(ancestor) = ancestor_elements(arena, node_id).find(|&ancestor| {
                selectors
                    .iter()
                    .any(|sel| matcher::matches(sel, arena, ancestor, None, Some(spec), None))
            }) else {
                continue;
            };
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let ancestor_name = arena
                .get(ancestor)
                .and_then(DomNode::as_element)
                .map_or("", |a| a.base.node_name.as_str());
            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message: format!(
                    "The \"{}\" element must not appear as a descendant of the \"{ancestor_name}\" element",
                    el.base.node_name
                ),
                line: el.base.line,
                col: el.base.col,
                raw: el.base.raw.clone(),
                reason: rule_config.reason.clone(),
                fix: None,
            });
        }
        violations
    }
}
