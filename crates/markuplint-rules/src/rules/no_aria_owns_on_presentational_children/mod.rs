//! `no-aria-owns-on-presentational-children` rule: report an `aria-owns` on an element whose role has
//! presentational children.
//!
//! Ports `packages/@markuplint/rules/src/no-aria-owns-on-presentational-children/`.
//!
//! > Authors MUST NOT specify aria-owns on an element which has Presentational Children.
//!
//! The role is the computed role of the element, so an implicit role with presentational children
//! (`<button>`, `<img>`) counts as an explicit one does. The rule reports under every ARIA version,
//! although WAI-ARIA 1.1 and 1.2 do not state the requirement; the version decides the roles.
//!
//! @see <https://w3c.github.io/aria/#childrenArePresentational>

use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::get_attr_node_from_el;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::computed_role::get_computed_role;
use crate::aria_check::{ElementContext, ElementGate, walk_elements};
use crate::create_message::Kw;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoAriaOwnsOnPresentationalChildren;

impl Rule for NoAriaOwnsOnPresentationalChildren {
    fn id(&self) -> &'static str {
        "no-aria-owns-on-presentational-children"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        walk_elements(
            self.id(),
            arena,
            spec,
            config,
            ElementGate::Supported,
            |_| (),
            |(), ctx, violations| check(ctx, violations),
        )
    }
}

fn check(ctx: &ElementContext<'_>, violations: &mut Vec<Violation>) {
    let Some(attr) = get_attr_node_from_el(ctx.el, "aria-owns") else {
        return;
    };
    let Some(role) = get_computed_role(ctx.spec, ctx.arena, ctx.node_id, ctx.version, false).role else {
        return;
    };
    if !role.children_presentational {
        return;
    }
    let tr = ctx.tr;
    let message = tr.t(
        "\"aria-owns\" must not be specified on an element with the \"{0*}\" role, whose children are presentational",
        &[Kw::S(&role.name)],
    );
    violations.push(ctx.attr_violation(attr, tr.finish(&message)));
}
