//! `progress-value-bounds` rule: a `<progress>` value must not exceed its maximum.
//!
//! Ports `packages/@markuplint/rules/src/progress-value-bounds/`. HTML LS § the progress element:
//! `value ≤ max` when both are written, and `value ≤ 1` when `max` is absent.
//!
//! Values are read with JS `Number()` semantics, as TS reads them. An unparsable value or `max`
//! skips the element (`no-invalid-attr-value` reports it), and so does a dynamic one. A
//! non-positive `max` is still compared, as in TS, although the TS doc comment says it is deferred.

use markuplint_core::i18n::Primitive as Kw;
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::get_attr_value_from_el;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::element_local_name;
use crate::helpers::finite_number_attr;
use crate::rule::{Rule, RuleConfigSet};
use crate::srcset_check::{attr_node, is_dynamic};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

const DEFAULT_MAX: f64 = 1.0;

pub struct ProgressValueBounds;

impl Rule for ProgressValueBounds {
    fn id(&self) -> &'static str {
        "progress-value-bounds"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let tr = config.translator();
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled || element_local_name(el) != "progress" {
                continue;
            }
            // A progress a pretender makes has unknown attributes until `as` pins what it is.
            if el.pretended().is_some() && get_attr_value_from_el(el, "as").is_none() {
                continue;
            }

            let Some(value_attr) = attr_node(el, "value") else {
                continue;
            };
            let max_attr = attr_node(el, "max");
            if is_dynamic(value_attr) || max_attr.is_some_and(is_dynamic) {
                continue;
            }

            let Some(value) = finite_number_attr(Some(markuplint_dom::helpers::attr_value(value_attr))) else {
                continue;
            };
            let max = finite_number_attr(max_attr.map(markuplint_dom::helpers::attr_value));
            if max_attr.is_some() && max.is_none() {
                continue;
            }
            if value <= max.unwrap_or(DEFAULT_MAX) {
                continue;
            }

            let upper_desc = if max_attr.is_some() {
                tr.t("the value of the \"{0*}\" attribute", &[Kw::S("max")])
            } else {
                tr.t(
                    "{0} when the \"{1*}\" attribute is absent",
                    &[Kw::S("one"), Kw::S("max")],
                )
            };
            violations.push(Violation {
                spec_conformance: None,
                rule_id: self.id().to_owned(),
                name: None,
                severity: rule_config.severity,
                message: tr.finish(&tr.t(
                    "The value of the \"{0*}\" attribute must be less than or equal to {1}",
                    &[Kw::S("value"), Kw::S(&upper_desc)],
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
