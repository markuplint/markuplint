//! `no-input-file-value` rule: `<input type="file">` takes no `value` but the empty string.
//!
//! Ports `packages/@markuplint/rules/src/no-input-file-value/`. HTML LS § File Upload state: "The
//! value attribute, if specified, must have a value that is the empty string." The `type` value
//! is compared case-insensitively (JS `toLowerCase()`, untrimmed), the `value` exactly. A dynamic
//! `type` or `value` skips the element.

use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::get_attr_value_from_el;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::element_local_name;
use crate::rule::{Rule, RuleConfigSet};
use crate::srcset_check::{attr_node, is_dynamic};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoInputFileValue;

impl Rule for NoInputFileValue {
    fn id(&self) -> &'static str {
        "no-input-file-value"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled || element_local_name(el) != "input" {
                continue;
            }
            // An input a pretender makes has unknown attributes until `as` pins what it is.
            if el.pretended().is_some() && get_attr_value_from_el(el, "as").is_none() {
                continue;
            }

            let (Some(type_attr), Some(value_attr)) = (attr_node(el, "type"), attr_node(el, "value")) else {
                continue;
            };
            if is_dynamic(type_attr) || is_dynamic(value_attr) {
                continue;
            }
            if type_attr.value.raw.to_lowercase() != "file" || value_attr.value.raw.is_empty() {
                continue;
            }

            violations.push(Violation {
                rule_id: self.id().to_owned(),
                name: None,
                severity: rule_config.severity,
                message: "The \"value\" attribute on a \"input\" element with \"type=file\" must be the empty string"
                    .to_owned(),
                line: value_attr.value.line,
                col: value_attr.value.col,
                raw: value_attr.value.raw.clone(),
                reason: rule_config.reason.clone(),
                fix: None,
            });
        }

        violations
    }
}
