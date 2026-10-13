//! `form-attr-references-form` rule: the `form` attribute of a form-associated element
//! must reference a `<form>` element.
//!
//! Per HTML LS: "If specified, the value must be the ID of a form element in the
//! element's tree." Whether the ID exists at all is `no-refer-to-non-existent-id`'s
//! concern; this rule only checks the element type once the ID resolves.
//!
//! <https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fae-form>

use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::{find_element_by_id, get_attr_node_from_el};
use markuplint_selector::{matcher, parser};
use markuplint_types::spec::types::MLMLSpec;

use crate::helpers::is_pretender_without_as_attr;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct FormAttrReferencesForm;

/// Listed form-associated elements (HTML LS §4.10.2), the ones that may carry `form`.
/// The same fixed selector as TS: the category is not in the spec data.
///
/// <https://html.spec.whatwg.org/multipage/forms.html#category-listed>
const FORM_ASSOCIATED_SELECTOR: &str = "button,fieldset,input,label,meter,object,output,progress,select,textarea";

impl Rule for FormAttrReferencesForm {
    fn id(&self) -> &'static str {
        "form-attr-references-form"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let selector = parser::parse(FORM_ASSOCIATED_SELECTOR).expect("a valid built-in selector");
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if !matcher::matches(&selector, arena, node_id, None, Some(spec), None) {
                continue;
            }
            if is_pretender_without_as_attr(el) {
                continue;
            }
            let Some(form_attr) = get_attr_node_from_el(el, "form") else {
                continue;
            };
            if form_attr.is_dynamic_value == Some(true) {
                continue;
            }

            // An unresolved ID is left to `no-refer-to-non-existent-id`.
            let Some(target) = find_element_by_id(arena, &form_attr.value.raw)
                .and_then(|id| arena.get(id))
                .and_then(|n| n.as_element())
            else {
                continue;
            };
            if target.base.node_name == "form" {
                continue;
            }

            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message: "The \"form\" attribute on a form-associated element must reference a \"form\" element"
                    .to_string(),
                line: form_attr.value.line,
                col: form_attr.value.col,
                raw: form_attr.value.raw.clone(),
                reason: None,
            });
        }

        violations
    }
}
