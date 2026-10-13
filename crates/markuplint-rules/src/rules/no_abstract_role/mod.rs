//! `no-abstract-role` rule: report a `role` token that is an abstract WAI-ARIA role.
//!
//! Ports `packages/@markuplint/rules/src/no-abstract-role/` and
//! `.../wai-aria/checkings/abstract-role.ts`. As in TS only the core `roles` list is searched
//! (case-sensitively): the abstract roles all live there, and a token that is not in it is
//! `no-unknown-role`'s business. Only the first abstract token of an attribute is reported.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria::get_aria_spec;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::{ElementContext, ElementGate, role_attr, role_tokens, walk_elements};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoAbstractRole;

impl Rule for NoAbstractRole {
    fn id(&self) -> &'static str {
        "no-abstract-role"
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
    // Only the core `roles`, as TS `abstract-role.ts` does: a graphics or DPub role is never
    // reported here, so this is not `markuplint_types::spec::aria::is_abstract_role`, which also
    // searches those two lists.
    let roles = &get_aria_spec(ctx.spec, ctx.version).roles;
    let abstract_token = role_tokens(attr).into_iter().find(|token| {
        roles
            .iter()
            .any(|role| role.name == token.value && role.is_abstract == Some(true))
    });
    if let Some(token) = abstract_token {
        violations.push(ctx.token_violation(&token, format!("The \"{}\" role is the abstract role", token.value)));
    }
}
