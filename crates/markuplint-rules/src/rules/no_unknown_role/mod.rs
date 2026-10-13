//! `no-unknown-role` rule: report a `role` token that names no WAI-ARIA role.
//!
//! Ports `packages/@markuplint/rules/src/no-unknown-role/` and
//! `.../wai-aria/checkings/non-existent-role.ts`. The lookup is case-sensitive, and which role
//! lists are searched depends on the element: the core roles and the `DPub` roles for every element,
//! the Graphics Module roles for SVG-namespace elements only
//! ([`markuplint_types::spec::aria::get_role_spec_for_element`]). Only the first unknown token of
//! an attribute is reported, as TS returns on the first one.

use markuplint_core::mlast::NamespaceURI;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria::get_role_spec_for_element;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::{ElementContext, ElementGate, role_attr, role_tokens, walk_elements};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoUnknownRole;

impl Rule for NoUnknownRole {
    fn id(&self) -> &'static str {
        "no-unknown-role"
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
    let Some(attr) = role_attr(ctx.el) else {
        return;
    };
    let is_svg = ctx.el.namespace == NamespaceURI::SVG;
    let unknown = role_tokens(attr)
        .into_iter()
        .find(|token| get_role_spec_for_element(ctx.spec, &token.value, ctx.version, is_svg).is_none());
    if let Some(token) = unknown {
        violations.push(ctx.token_violation(
            &token,
            format!(
                "The \"{}\" role does not exist according to the WAI-ARIA specification.",
                token.value
            ),
        ));
    }
}
