//! `no-nested-top-level-landmark` rule: report a `banner`, `main` or `contentinfo` landmark that
//! is nested inside another landmark.
//!
//! Ports `packages/@markuplint/rules/src/no-nested-top-level-landmark/`, the nesting half of the
//! former `landmark-roles` rule. Landmarks come from the selector-based set in
//! [`crate::landmark_check`]; any landmark of any role counts as an enclosing ancestor.
//! `complementary` is deliberately not checked: `<aside>` is always `complementary` to the
//! selectors, while under ARIA 1.3 a nested `<aside>` may be `generic`. `disabled` and the
//! `ignoreRoles` option are read from each element's own (per-node) config. Fragments are
//! skipped. The default severity is `warning`.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::landmark_check::{compute_landmark_roles, is_descendant_of_any};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

/// The roles this rule requires to be top level.
const TOP_LEVEL_ROLES: [&str; 3] = ["banner", "main", "contentinfo"];

pub struct NoNestedTopLevelLandmark;

impl Rule for NoNestedTopLevelLandmark {
    fn id(&self) -> &'static str {
        "no-nested-top-level-landmark"
    }

    fn default_severity(&self) -> Severity {
        Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        if arena.is_fragment() {
            return vec![];
        }
        let roles = compute_landmark_roles(arena, spec);
        let all_landmarks: Vec<_> = roles.iter().flat_map(|(_, ids)| ids.iter().copied()).collect();

        let mut violations = Vec::new();
        for role in TOP_LEVEL_ROLES {
            let Some((_, ids)) = roles.iter().find(|(r, _)| *r == role) else {
                continue;
            };
            for &node_id in ids {
                let rule_config = config.get(node_id);
                if rule_config.disabled {
                    continue;
                }
                let ignored = rule_config
                    .options
                    .get("ignoreRoles")
                    .and_then(serde_json::Value::as_array)
                    .is_some_and(|list| list.iter().any(|v| v.as_str() == Some(role)));
                if ignored {
                    continue;
                }
                if !is_descendant_of_any(arena, node_id, &all_landmarks) {
                    continue;
                }
                let Some(el) = arena.get(node_id).and_then(|n| n.as_element()) else {
                    continue;
                };
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: format!("The \"{role}\" role should be top level"),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                    reason: None,
                    fix: None,
                });
            }
        }
        violations
    }
}
