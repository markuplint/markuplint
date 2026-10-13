//! `label-for-references-labelable` rule: the `for` attribute of a `<label>` element must
//! reference a labelable element.
//!
//! Per HTML LS: "If the attribute is specified, the attribute's value must be the ID of a
//! labelable element in the same tree as the label element." Whether the ID exists at all
//! is `no-refer-to-non-existent-id`'s concern; this rule only checks the element type once
//! the ID resolves, to the first element with that ID in tree order.
//!
//! <https://html.spec.whatwg.org/multipage/forms.html#attr-label-for>

use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::{find_element_by_id, get_attr_node_from_el};
use markuplint_selector::{matcher, parser};
use markuplint_types::spec::types::MLMLSpec;

use crate::helpers::is_pretender_without_as_attr;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct LabelForReferencesLabelable;

/// Labelable elements (HTML LS §4.10.2), `<input>` only outside the Hidden state (the
/// `i` flag matches the state keyword ASCII case-insensitively). The same fixed selector
/// as TS: the category is not in the spec data.
///
/// Known limitation (shared with TS): form-associated custom elements are labelable too,
/// but that is decided by `ElementInternals` at run time, so custom elements are treated
/// as not labelable.
///
/// <https://html.spec.whatwg.org/multipage/forms.html#category-label>
pub(crate) const LABELABLE_SELECTOR: &str =
    r#"button,input:not([type="hidden" i]),meter,output,progress,select,textarea"#;

impl Rule for LabelForReferencesLabelable {
    fn id(&self) -> &'static str {
        "label-for-references-labelable"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let labelable = parser::parse(LABELABLE_SELECTOR).expect("a valid built-in selector");
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if el.base.node_name != "label" {
                continue;
            }
            if is_pretender_without_as_attr(el) {
                continue;
            }
            let Some(for_attr) = get_attr_node_from_el(el, "for") else {
                continue;
            };
            if for_attr.is_dynamic_value == Some(true) {
                continue;
            }

            // An unresolved ID is left to `no-refer-to-non-existent-id`.
            let Some(target) = find_element_by_id(arena, &for_attr.value.raw) else {
                continue;
            };
            if matcher::matches(&labelable, arena, target, None, Some(spec), None) {
                continue;
            }

            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message: "The \"for\" attribute of the \"label\" element must reference a labelable element"
                    .to_string(),
                line: for_attr.value.line,
                col: for_attr.value.col,
                raw: for_attr.value.raw.clone(),
                reason: None,
            });
        }

        violations
    }
}
