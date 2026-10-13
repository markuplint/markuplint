//! `no-aria-on-presentational-children` rule: report `role` / `aria-*` on a descendant of an
//! element whose role has presentational children (WAI-ARIA "Children Presentational: True").
//!
//! Ports `packages/@markuplint/rules/src/no-aria-on-presentational-children/` and its checker
//! `wai-aria/checkings/presentational-children.ts`. The ancestors are walked through
//! `parentElement` (so the walk stops at a non-element parent) and the closest one whose
//! **computed** role has `childrenPresentational` is the one named, so an implicit role
//! (`<button>`) counts as well as an explicit one. The attribute test is TS
//! `/^aria-|^role$/i` on the attribute name, case-insensitive. The report is on the start tag of
//! the descendant. The default severity is `warning`.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::computed_role::get_computed_role;
use crate::aria_check::{ElementContext, ElementGate, attr_name, html_attrs, is_aria_prop_attr, walk_elements};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct NoAriaOnPresentationalChildren;

impl Rule for NoAriaOnPresentationalChildren {
    fn id(&self) -> &'static str {
        "no-aria-on-presentational-children"
    }

    fn default_severity(&self) -> Severity {
        Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        walk_elements(
            self.id(),
            arena,
            spec,
            config,
            ElementGate::Supported,
            |_| (),
            |(), ctx, violations| violations.extend(check(ctx)),
        )
    }
}

fn check(ctx: &ElementContext<'_>) -> Option<Violation> {
    let has_aria_attr =
        html_attrs(ctx.el).any(|attr| is_aria_prop_attr(attr) || attr_name(attr).eq_ignore_ascii_case("role"));
    if !has_aria_attr {
        return None;
    }

    let role_name = ctx
        .arena
        .ancestors(ctx.node_id)
        .map_while(|node| node.as_element())
        .find_map(|ancestor| {
            get_computed_role(ctx.spec, ctx.arena, ancestor.base.id, ctx.version, false)
                .role
                .filter(|role| role.children_presentational)
                .map(|role| role.name)
        })?;

    Some(ctx.element_violation(format!(
        "It may be ineffective because it has the \"{role_name}\" role as an ancestor that doesn't expose its descendants to the accessibility tree"
    )))
}
