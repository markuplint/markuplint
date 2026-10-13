//! `no-duplicate-sibling-attr` rule: an attribute the spec makes unique among siblings appears
//! on one sibling only.
//!
//! Ports `packages/@markuplint/rules/src/no-duplicate-sibling-attr/`. Which attributes are unique
//! is read from the element spec's `contentModel.uniqueAttrs` (e.g. `track[default]`, HTML LS §
//! the track element: "There must not be more than one track element with the same parent node
//! with the default attribute specified"). An element is reported when an earlier element child of
//! the same parent element has the same local name and the attribute. An element whose parent is
//! not an element (the top of a fragment) is not checked.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::get_attr_value_from_el;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::element_local_name;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoDuplicateSiblingAttr;

impl Rule for NoDuplicateSiblingAttr {
    fn id(&self) -> &'static str {
        "no-duplicate-sibling-attr"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let local_name = element_local_name(el);
            let unique_attrs = unique_attrs(spec, &local_name);
            if unique_attrs.is_empty() {
                continue;
            }
            let Some(parent) = el.base.parent.and_then(|p| arena.get(p)).and_then(DomNode::as_element) else {
                continue;
            };
            let preceding: Vec<NodeId> = arena
                .children_of(parent.base.id)
                .unwrap_or_default()
                .iter()
                .copied()
                .take_while(|&id| id != node_id)
                .collect();

            for attr_name in unique_attrs {
                if get_attr_value_from_el(el, attr_name).is_none() {
                    continue;
                }
                let has_preceding_duplicate = preceding.iter().any(|&id| {
                    arena.get(id).and_then(DomNode::as_element).is_some_and(|sibling| {
                        element_local_name(sibling) == local_name
                            && get_attr_value_from_el(sibling, attr_name).is_some()
                    })
                });
                if has_preceding_duplicate {
                    violations.push(Violation {
                        rule_id: self.id().to_owned(),
                        name: None,
                        severity: rule_config.severity,
                        message: format!(
                            "The \"{attr_name}\" attribute must not appear on more than one \"{local_name}\" element within the same parent"
                        ),
                        line: el.base.line,
                        col: el.base.col,
                        raw: el.base.raw.clone(),
                        reason: rule_config.reason.clone(),
                    });
                }
            }
        }

        violations
    }
}

/// TS `document.specs.specs.find(s => s.name === el.localName)?.contentModel?.uniqueAttrs`: the
/// spec is looked up by the exact local name.
fn unique_attrs<'a>(spec: &'a MLMLSpec, local_name: &str) -> Vec<&'a str> {
    spec.specs
        .iter()
        .find(|s| s.name == local_name)
        .and_then(|s| s.content_model.get("uniqueAttrs"))
        .and_then(serde_json::Value::as_array)
        .map(|attrs| attrs.iter().filter_map(serde_json::Value::as_str).collect())
        .unwrap_or_default()
}
