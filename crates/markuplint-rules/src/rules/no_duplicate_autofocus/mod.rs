//! `no-duplicate-autofocus` rule: one `autofocus` per autofocus scoping root.
//!
//! Ports `packages/@markuplint/rules/src/no-duplicate-autofocus/`. HTML LS § the autofocus
//! attribute scopes uniqueness to the nearest ancestor autofocus scoping root element: the element
//! itself if it is a `dialog` or has `popover`, else the nearest such ancestor, else the document
//! (TS `el.closest('dialog, [popover]')`). Two `autofocus` elements conflict only when they share
//! that root; every one after the first in document order is reported.

use std::collections::HashSet;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::get_attr_value_from_el;
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::element_local_name;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoDuplicateAutofocus;

impl Rule for NoDuplicateAutofocus {
    fn id(&self) -> &'static str {
        "no-duplicate-autofocus"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        // `None` is the document.
        let mut seen_roots: HashSet<Option<NodeId>> = HashSet::new();

        for (node_id, el) in arena.elements() {
            // An element the rule is disabled on is not collected at all (TS `walkOn` skips it),
            // so it takes no scoping root either.
            let rule_config = config.get(node_id);
            if rule_config.disabled || get_attr_value_from_el(el, "autofocus").is_none() {
                continue;
            }
            if seen_roots.insert(scoping_root(arena, node_id, el)) {
                continue;
            }
            violations.push(Violation {
                rule_id: self.id().to_owned(),
                name: None,
                severity: rule_config.severity,
                message: "The \"autofocus\" attribute must be unique in the document".to_owned(),
                line: el.base.line,
                col: el.base.col,
                raw: el.base.raw.clone(),
                reason: rule_config.reason.clone(),
            });
        }

        violations
    }
}

/// TS `el.closest('dialog, [popover]')`.
fn scoping_root(arena: &DomArena, node_id: NodeId, el: &ElementData) -> Option<NodeId> {
    let is_root =
        |el: &ElementData| element_local_name(el) == "dialog" || get_attr_value_from_el(el, "popover").is_some();
    if is_root(el) {
        return Some(node_id);
    }
    arena
        .ancestors(node_id)
        .filter_map(DomNode::as_element)
        .find(|ancestor| is_root(ancestor))
        .map(|ancestor| ancestor.base.id)
}
