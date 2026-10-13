//! `require-landmark-label` rule: when a role has more than one landmark, report each one that
//! has no label.
//!
//! Ports `packages/@markuplint/rules/src/require-landmark-label/`, the labelling half of the
//! former `landmark-roles` rule. Landmarks come from the selector-based set in
//! [`crate::landmark_check`], so an element listed twice for one role (a top-level
//! `<header role="banner">`) makes that role count as duplicated. TS `hasLabel()` accepts an
//! `aria-label` attribute whenever present, even empty, and an `aria-labelledby` attribute only
//! when the landmark contains an `h1`–`h6`; neither value is resolved. The former
//! `labelEachArea` option is gone: disabling this rule is how to opt out. Fragments are skipped.
//! The default severity is `warning`.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::landmark_check::{compute_landmark_roles, matches, parse};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct RequireLandmarkLabel;

impl Rule for RequireLandmarkLabel {
    fn id(&self) -> &'static str {
        "require-landmark-label"
    }

    fn default_severity(&self) -> Severity {
        Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        if arena.is_fragment() {
            return vec![];
        }
        let mut violations = Vec::new();
        for (_, ids) in compute_landmark_roles(arena, spec) {
            if ids.len() < 2 {
                continue;
            }
            for node_id in ids {
                let rule_config = config.get(node_id);
                if rule_config.disabled || has_label(arena, spec, node_id) {
                    continue;
                }
                let Some(el) = arena.get(node_id).and_then(|n| n.as_element()) else {
                    continue;
                };
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: "Require unique accessible name".to_string(),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                    reason: None,
                });
            }
        }
        violations
    }
}

/// TS `hasLabel()`.
fn has_label(arena: &DomArena, spec: &MLMLSpec, node_id: NodeId) -> bool {
    let heading = parse("h1, h2, h3, h4, h5, h6");
    let has_heading = arena
        .descendants(node_id)
        .filter_map(DomNode::as_element)
        .any(|el| matches(&heading, arena, spec, el.base.id));
    if has_heading && matches(&parse("[aria-labelledby]"), arena, spec, node_id) {
        return true;
    }
    matches(&parse("[aria-label]"), arena, spec, node_id)
}
