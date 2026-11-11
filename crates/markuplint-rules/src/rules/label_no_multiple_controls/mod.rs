//! `label-no-multiple-controls` rule: the descendant-control constraints of a `<label>`.
//!
//! Per HTML LS the content model is "phrasing content, but with no descendant labelable
//! elements unless it is the element's labeled control". The labeled control is the
//! element the `for` attribute names (when it is a labelable element) or else the first
//! labelable descendant in tree order. Two branches follow:
//!
//! - `for` resolves to a labelable element outside the label: every descendant form
//!   control is reported (the labeled control is elsewhere).
//! - Otherwise: the first descendant form control is the labeled control and the rest
//!   are reported.
//!
//! A missing ID is `no-refer-to-non-existent-id`'s concern and a non-labelable target
//! `label-for-references-labelable`'s; both fall into the second branch here.
//!
//! <https://html.spec.whatwg.org/multipage/forms.html#the-label-element>

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::get_attr_node_from_el;
use markuplint_dom::node::DomNode;
use markuplint_selector::ast::SelectorList;
use markuplint_selector::{matcher, parser};
use markuplint_types::spec::types::MLMLSpec;

use crate::helpers::is_pretender_without_as_attr;
use crate::rule::{Rule, RuleConfigSet};
use crate::rules::label_for_references_labelable::LABELABLE_SELECTOR;
use crate::tree_scope::{Trees, is_expression};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct LabelNoMultipleControls;

/// The form controls a label may contain one of. The same fixed selector as TS; unlike
/// [`LABELABLE_SELECTOR`] it includes `<input type=hidden>`.
const FORM_CONTROL_SELECTOR: &str = "button,input,meter,output,progress,select,textarea";

impl Rule for LabelNoMultipleControls {
    fn id(&self) -> &'static str {
        "label-no-multiple-controls"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let form_control = parser::parse(FORM_CONTROL_SELECTOR).expect("a valid built-in selector");
        let labelable = parser::parse(LABELABLE_SELECTOR).expect("a valid built-in selector");
        let mut violations = Vec::new();
        let trees = Trees::new(arena, spec);

        for (node_id, el) in arena.elements() {
            if config.get(node_id).disabled {
                continue;
            }
            if el.base.node_name != "label" {
                continue;
            }
            // A pretended label's descendants are unknown until the `as` attribute pins the type.
            if is_pretender_without_as_attr(el) {
                continue;
            }

            // The controls under the label are the ones of its own tree: what is in the content of a
            // `template` element under the label is not a descendant of it
            let controls: Vec<NodeId> = trees
                .descendant_elements_in_tree(node_id)
                .into_iter()
                .filter(|&id| matcher::matches(&form_control, arena, id, None, Some(spec), None))
                .collect();
            if controls.is_empty() {
                continue;
            }

            let (reported, message) = if has_external_labeled_control(arena, spec, &trees, node_id, &labelable) {
                (
                    &controls[..],
                    "The \"label\" element must not contain a form-control descendant when the \"for\" attribute references an external labelable element",
                )
            } else {
                (
                    &controls[1..],
                    "The \"label\" element may contain at most one form-control descendant (button, input, meter, output, progress, select, or textarea)",
                )
            };

            for &control_id in reported {
                let Some(DomNode::Element(control)) = arena.get(control_id) else {
                    continue;
                };
                // TS reports with the control as the scope, so the control's settings apply.
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: config.get(control_id).severity,
                    message: message.to_string(),
                    line: control.base.line,
                    col: control.base.col,
                    raw: control.base.raw.clone(),
                    reason: None,
                    fix: None,
                });
            }
        }

        violations
    }
}

/// Whether the `for` attribute of `label_id` resolves to a labelable element outside the
/// label. A target inside the label (or the label itself, as DOM `contains()` includes the
/// node) is still found by the same-tree lookup, so it is not external.
fn has_external_labeled_control(
    arena: &DomArena,
    spec: &MLMLSpec,
    trees: &Trees<'_>,
    label_id: NodeId,
    labelable: &SelectorList,
) -> bool {
    let Some(label) = arena.get(label_id).and_then(DomNode::as_element) else {
        return false;
    };
    let Some(for_attr) = get_attr_node_from_el(label, "for") else {
        return false;
    };
    if for_attr.is_dynamic_value == Some(true) {
        return false;
    }
    // The target is resolved in the tree of the label
    let Some(target) = trees.element_by_id_in_tree(
        label_id,
        markuplint_dom::helpers::attr_value(for_attr),
        is_expression(for_attr),
    ) else {
        return false;
    };
    if trees.contains(label_id, target) {
        return false;
    }
    matcher::matches(labelable, arena, target, None, Some(spec), None)
}
