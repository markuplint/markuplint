//! `input-list-references-datalist` rule: the `list` attribute of an `<input>` element
//! must reference a `<datalist>` element.
//!
//! Per HTML LS: "If present, its value must be the ID of a datalist element in the same
//! tree." Whether the ID exists at all is `no-refer-to-non-existent-id`'s concern; this
//! rule only checks the element type once the ID resolves. The value constraint holds
//! whatever the `type` (the attribute merely has no effect on some types).
//!
//! <https://html.spec.whatwg.org/multipage/input.html#the-list-attribute>

use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::{find_element_by_id, get_attr_node_from_el};
use markuplint_types::spec::types::MLMLSpec;

use crate::helpers::is_pretender_without_as_attr;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct InputListReferencesDatalist;

impl Rule for InputListReferencesDatalist {
    fn id(&self) -> &'static str {
        "input-list-references-datalist"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if el.base.node_name != "input" {
                continue;
            }
            if is_pretender_without_as_attr(el) {
                continue;
            }
            let Some(list_attr) = get_attr_node_from_el(el, "list") else {
                continue;
            };
            if list_attr.is_dynamic_value == Some(true) {
                continue;
            }

            // An unresolved ID is left to `no-refer-to-non-existent-id`.
            let Some(target) = find_element_by_id(arena, &list_attr.value.raw)
                .and_then(|id| arena.get(id))
                .and_then(|n| n.as_element())
            else {
                continue;
            };
            if target.base.node_name == "datalist" {
                continue;
            }

            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message: "The \"list\" attribute of the \"input\" element must reference a \"datalist\" element"
                    .to_string(),
                line: list_attr.value.line,
                col: list_attr.value.col,
                raw: list_attr.value.raw.clone(),
                reason: None,
                fix: None,
            });
        }

        violations
    }
}
