//! `label-has-control` rule: a `<label>` without `for` and without an element to label. Port of
//! `packages/@markuplint/rules/src/label-has-control/`.
//!
//! A label with `for` is left to `label-for-references-labelable`, and one with more than one
//! control to `label-no-multiple-controls`. An element in any branch of a conditional block of a
//! preprocessor is enough (TS `conditionalChildNodes()`): the label has it whenever that branch
//! renders.

use markuplint_core::i18n::Primitive as Kw;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::get_attr_value_from_el;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct LabelHasControl;

impl Rule for LabelHasControl {
    fn id(&self) -> &'static str {
        "label-has-control"
    }

    /// Matches TS `createRule({ defaultSeverity: 'warning' })`.
    fn default_severity(&self) -> crate::violation::Severity {
        crate::violation::Severity::Warning
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let tr = config.translator();
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            // TS `el.localName !== 'label'`
            if !el.base.node_name.eq_ignore_ascii_case("label") {
                continue;
            }
            // A pretended label's descendants are unknown, unless the `as` attribute says
            // what it is: then the descendants are the ones written (TS reads the attribute
            // through the pretender, which inherits it).
            if el.pretended().is_some() && get_attr_value_from_el(el, "as").is_none() {
                continue;
            }
            // TS `el.hasAttr('for')`
            if get_attr_value_from_el(el, "for").is_some() {
                continue;
            }
            if has_element_in_some_branch(arena, node_id) {
                continue;
            }
            violations.push(Violation {
                spec_conformance: None,
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message: tr.finish(&tr.t(
                    "{0} should associate with {1}",
                    &[
                        Kw::S(&tr.t("The \"{0*}\" {1}", &[Kw::S("label"), Kw::S("element")])),
                        Kw::S(&tr.t("a {0}", &[Kw::S("control")])),
                    ],
                )),
                line: el.base.line,
                col: el.base.col,
                raw: el.base.raw.clone(),
                reason: rule_config.reason.clone(),
                fix: None,
            });
        }

        violations
    }
}

/// TS `el.children.length > 0 || el.conditionalChildNodes().some(branch => branch has an element)`:
/// an element among the child nodes, looking into a fragment and into a block of a preprocessor
/// that has a behavior (`if`, `each`, `await`, ...). A block without one (the output of an
/// expression) is not a branch, and what it holds is not known.
fn has_element_in_some_branch(arena: &DomArena, node_id: NodeId) -> bool {
    arena
        .child_nodes(node_id)
        .into_iter()
        .any(|child_id| match arena.get(child_id) {
            Some(DomNode::Element(_)) => true,
            Some(DomNode::PSBlock(block)) if block.is_fragment || block.block_behavior.is_some() => {
                has_element_in_some_branch(arena, child_id)
            }
            _ => false,
        })
}
