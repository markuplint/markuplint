//! `no-input-file-value` rule: `<input type="file">` takes no `value` but the empty string.
//!
//! Ports `packages/@markuplint/rules/src/no-input-file-value/`. HTML LS § File Upload state: "The
//! value attribute, if specified, must have a value that is the empty string." The `type` value
//! is compared case-insensitively (JS `toLowerCase()`, untrimmed), the `value` exactly. A dynamic
//! `type` or `value` skips the element.

use markuplint_core::i18n::Primitive as Kw;
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
        let tr = config.translator();

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
            if markuplint_dom::helpers::attr_value(type_attr).to_lowercase() != "file"
                || markuplint_dom::helpers::attr_value(value_attr).is_empty()
            {
                continue;
            }

            violations.push(Violation {
                spec_conformance: None,
                rule_id: self.id().to_owned(),
                name: None,
                severity: rule_config.severity,
                message: tr.finish(&tr.t(
                    "The \"{0}\" attribute on a \"{1}\" element with \"{2}={3}\" must be the empty string",
                    &[Kw::S("value"), Kw::S("input"), Kw::S("type"), Kw::S("file")],
                )),
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
