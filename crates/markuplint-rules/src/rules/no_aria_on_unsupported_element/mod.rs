//! `no-aria-on-unsupported-element` rule: report `role` and `aria-*` attributes on an element the
//! spec says does not support ARIA.
//!
//! Ports `packages/@markuplint/rules/src/no-aria-on-unsupported-element/`. It is the check the
//! `wai-aria` umbrella rule always ran first. No element in the bundled HTML / SVG / `MathML` spec
//! sets `globalAttrs['#ARIAAttrs']` to `false`, so against the shipped spec the rule cannot report
//! anything; it stays correct for a spec update that marks an element that way.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::{ElementContext, ElementGate, aria_prop_attrs, attr_name, role_attr, walk_elements};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoAriaOnUnsupportedElement;

impl Rule for NoAriaOnUnsupportedElement {
    fn id(&self) -> &'static str {
        "no-aria-on-unsupported-element"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        walk_elements(
            self.id(),
            arena,
            spec,
            config,
            ElementGate::Unsupported,
            |_| (),
            |(), ctx, violations| check(ctx, violations),
        )
    }
}

fn check(ctx: &ElementContext<'_>, violations: &mut Vec<Violation>) {
    // `role` first, then the `aria-*` attributes in source order.
    let attrs = role_attr(ctx.el).into_iter().chain(aria_prop_attrs(ctx.el));
    for attr in attrs {
        violations.push(ctx.attr_violation(attr, format!("The \"{}\" attribute is disallowed", attr_name(attr))));
    }
}
