//! `no-redundant-role` rule: report a `role` token that repeats the element's implicit role.
//!
//! Ports `packages/@markuplint/rules/src/no-redundant-role/` and
//! `.../wai-aria/checkings/implicit-role.ts`. The implicit role is `getARIA().implicitRole` at the
//! rule's ARIA version with the matching conditions applied
//! ([`ElementContext::implicit_role_name`]); the comparison is a case-sensitive `===`, and only
//! the first matching token of an attribute is reported. The message quotes the element's local
//! name.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::{ElementContext, ElementGate, role_attr, role_tokens, walk_elements};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct NoRedundantRole;

impl Rule for NoRedundantRole {
    fn id(&self) -> &'static str {
        "no-redundant-role"
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
            |(), ctx, violations| check(ctx, violations),
        )
    }
}

fn check(ctx: &ElementContext<'_>, violations: &mut Vec<Violation>) {
    let Some(attr) = role_attr(ctx.el) else {
        return;
    };
    let tokens = role_tokens(attr);
    if tokens.is_empty() {
        return;
    }
    let Some(implicit_role) = ctx.implicit_role_name() else {
        return;
    };
    if let Some(token) = tokens.iter().find(|token| token.value == implicit_role) {
        violations.push(ctx.token_violation(
            token,
            format!(
                "The \"{}\" role is the implicit role of the \"{}\" element",
                token.value,
                ctx.local_name()
            ),
        ));
    }
}
