//! `no-extra-selected-options` rule: a `<select>` without `multiple` has at most one selected
//! option.
//!
//! Ports `packages/@markuplint/rules/src/no-extra-selected-options/`. HTML LS § the select
//! element: without `multiple`, at most one option in the select's list of options may have
//! `selected`. The list of options is the select's `<option>` children and the `<option>`
//! children of its `<optgroup>` children (TS `:scope > option[selected], :scope > optgroup >
//! option[selected]`), in document order. Every selected option after the first is reported.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::get_attr_value_from_el;
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::element_local_name;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoExtraSelectedOptions;

impl Rule for NoExtraSelectedOptions {
    fn id(&self) -> &'static str {
        "no-extra-selected-options"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled || element_local_name(el) != "select" {
                continue;
            }
            // A select a pretender makes has unknown descendants until `as` pins what it is.
            if el.pretended().is_some() && get_attr_value_from_el(el, "as").is_none() {
                continue;
            }
            if get_attr_value_from_el(el, "multiple").is_some() {
                continue;
            }

            let mut selected = Vec::new();
            for child in child_elements(arena, node_id) {
                match element_local_name(child).as_str() {
                    "option" => selected.push(child),
                    "optgroup" => selected
                        .extend(child_elements(arena, child.base.id).filter(|opt| element_local_name(opt) == "option")),
                    _ => {}
                }
            }
            selected.retain(|opt| get_attr_value_from_el(opt, "selected").is_some());

            for opt in selected.iter().skip(1) {
                violations.push(Violation {
                    rule_id: self.id().to_owned(),
                    name: None,
                    severity: rule_config.severity,
                    message: "The \"select\" element cannot have more than one selected \"option\" descendant unless the \"multiple\" attribute is specified".to_owned(),
                    line: opt.base.line,
                    col: opt.base.col,
                    raw: opt.base.raw.clone(),
                    reason: rule_config.reason.clone(),
                    fix: None,
                });
            }
        }

        violations
    }
}

fn child_elements(arena: &DomArena, node_id: NodeId) -> impl Iterator<Item = &ElementData> {
    arena
        .children_of(node_id)
        .unwrap_or_default()
        .iter()
        .filter_map(|&id| arena.get(id).and_then(DomNode::as_element))
}
