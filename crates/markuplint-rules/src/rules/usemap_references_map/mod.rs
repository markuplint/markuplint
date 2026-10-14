//! `usemap-references-map` rule: the `usemap` attribute of an `<img>` element must be a
//! valid hash-name reference to a `<map>` element.
//!
//! A valid hash-name reference is "#" followed by a string that matches the `name`
//! attribute of an element of the referenced type in the same tree. Matching is by
//! `name`, not `id`, so `no-refer-to-non-existent-id` never covers this attribute. A value
//! that is not of the `#name` form is not checked.
//!
//! <https://html.spec.whatwg.org/multipage/image-maps.html#attr-hyperlink-usemap>
//! <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-hash-name-reference>

use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::{get_attr_node_from_el, get_attr_value_from_el};
use markuplint_selector::{matcher, parser};
use markuplint_types::spec::types::MLMLSpec;

use crate::helpers::is_pretender_without_as_attr;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct UsemapReferencesMap;

impl Rule for UsemapReferencesMap {
    fn id(&self) -> &'static str {
        "usemap-references-map"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        // TS `document.querySelectorAll('map')`.
        let map_selector = parser::parse("map").expect("a valid built-in selector");
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if el.base.node_name != "img" {
                continue;
            }
            if is_pretender_without_as_attr(el) {
                continue;
            }
            let Some(usemap_attr) = get_attr_node_from_el(el, "usemap") else {
                continue;
            };
            if usemap_attr.is_dynamic_value == Some(true) {
                continue;
            }
            let Some(target_name) = usemap_attr.value.raw.strip_prefix('#').filter(|name| !name.is_empty()) else {
                continue;
            };

            let resolved = arena.elements().any(|(map_id, map)| {
                matcher::matches(&map_selector, arena, map_id, None, Some(spec), None)
                    && get_attr_value_from_el(map, "name") == Some(target_name)
            });
            if resolved {
                continue;
            }

            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message: "The \"usemap\" attribute of the \"img\" element must be a valid hash-name reference to a \"map\" element".to_string(),
                line: usemap_attr.value.line,
                col: usemap_attr.value.col,
                raw: usemap_attr.value.raw.clone(),
                reason: None,
                fix: None,
            });
        }

        violations
    }
}
