//! `map-id-name-match` rule: the `id` of a `<map>` element, when present, must equal its
//! `name`.
//!
//! Per HTML LS: "If the id attribute is also specified, both attributes must have the
//! same value." The comparison is case-sensitive, although `usemap` matches `name`.
//!
//! <https://html.spec.whatwg.org/multipage/image-maps.html#the-map-element>

use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::get_attr_node_from_el;
use markuplint_types::spec::types::MLMLSpec;

use crate::helpers::is_pretender_without_as_attr;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct MapIdNameMatch;

impl Rule for MapIdNameMatch {
    fn id(&self) -> &'static str {
        "map-id-name-match"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if el.base.node_name != "map" {
                continue;
            }
            if is_pretender_without_as_attr(el) {
                continue;
            }
            let (Some(id_attr), Some(name_attr)) = (get_attr_node_from_el(el, "id"), get_attr_node_from_el(el, "name"))
            else {
                continue;
            };
            if id_attr.is_dynamic_value == Some(true) || name_attr.is_dynamic_value == Some(true) {
                continue;
            }
            if id_attr.value.raw == name_attr.value.raw {
                continue;
            }

            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message: "The \"id\" attribute on a \"map\" element must have the same value as the \"name\" attribute"
                    .to_string(),
                line: id_attr.value.line,
                col: id_attr.value.col,
                raw: id_attr.value.raw.clone(),
                reason: None,
                fix: None,
            });
        }

        violations
    }
}
