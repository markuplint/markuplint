//! `label-has-control` rule: `<label>` elements must be associated with form controls.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

/// The `label-has-control` rule.
pub struct LabelHasControl;

/// Form control element names that can be associated with a label.
const FORM_CONTROLS: &[&str] = &["input", "select", "textarea", "button", "output", "meter", "progress"];

impl Rule for LabelHasControl {
    fn id(&self) -> &'static str {
        "label-has-control"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if !el.base.node_name.eq_ignore_ascii_case("label") {
                continue;
            }

            // Check for `for` attribute
            let for_value = el.attributes.iter().find_map(|attr| {
                if let MLASTAttr::HTMLAttr(html_attr) = attr
                    && html_attr.node_name.eq_ignore_ascii_case("for")
                {
                    return Some(html_attr.value.raw.clone());
                }
                None
            });

            if let Some(for_id) = for_value {
                if !for_id.is_empty() && id_exists_in_document(arena, &for_id) {
                    continue;
                }
            } else {
                // No `for` attribute — check contained form controls
                let controls = find_form_controls(arena, el.base.id);
                if controls.len() == 1 {
                    continue; // exactly one control → OK
                }
                if controls.is_empty() {
                    // No control found
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: "The \"label\" element should associate with a control".to_string(),
                        line: el.base.line,
                        col: el.base.col,
                        raw: el.base.raw.clone(),
            reason: None,
                    });
                    continue;
                }
                // Multiple controls — report all after the first
                for &(line, col, ref raw) in &controls[1..] {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: "The \"label\" element associates only first control".to_string(),
                        line,
                        col,
                        raw: raw.clone(),
            reason: None,
                    });
                }
                continue;
            }

            // for="" or for with no matching id
            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message: "The \"label\" element should associate with a control".to_string(),
                line: el.base.line,
                col: el.base.col,
                raw: el.base.raw.clone(),
            reason: None,
            });
        }

        violations
    }
}

/// Check if any element in the document has the given id.
fn id_exists_in_document(arena: &DomArena, target_id: &str) -> bool {
    arena.elements().any(|(_node_id, el)| {
        el.attributes.iter().any(|attr| {
            if let MLASTAttr::HTMLAttr(html_attr) = attr {
                html_attr.node_name.eq_ignore_ascii_case("id") && html_attr.value.raw == target_id
            } else {
                false
            }
        })
    })
}

/// Find all form control descendants, returning (line, col, raw) for each.
fn find_form_controls(arena: &DomArena, node_id: usize) -> Vec<(u32, u32, String)> {
    let mut result = Vec::new();
    find_form_controls_recursive(arena, node_id, &mut result);
    result
}

fn find_form_controls_recursive(arena: &DomArena, node_id: usize, result: &mut Vec<(u32, u32, String)>) {
    if let Some(children) = arena.children_of(node_id) {
        for &child_id in children {
            if let Some(DomNode::Element(child_el)) = arena.get(child_id) {
                if FORM_CONTROLS
                    .iter()
                    .any(|c| child_el.base.node_name.eq_ignore_ascii_case(c))
                {
                    result.push((child_el.base.line, child_el.base.col, child_el.base.raw.clone()));
                }
                find_form_controls_recursive(arena, child_id, result);
            }
        }
    }
}
