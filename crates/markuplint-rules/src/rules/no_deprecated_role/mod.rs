//! `no-deprecated-role` rule: report a `role` attribute whose computed role is deprecated.
//!
//! Ports `packages/@markuplint/rules/src/no-deprecated-role/` and
//! `.../wai-aria/checkings/deprecated-role.ts`. It reads `deprecated` off the **computed** role,
//! which is the explicit role when one survives the "Handling Author Errors" algorithm and
//! otherwise the implicit one, so `role="foo"` on an element whose implicit role is deprecated is
//! reported too. The scope is the whole attribute and the message quotes the whole attribute
//! value (`attr.value`), not a token.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::computed_role::get_computed_role;
use crate::aria_check::{ElementContext, ElementGate, role_attr, walk_elements};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct NoDeprecatedRole;

impl Rule for NoDeprecatedRole {
    fn id(&self) -> &'static str {
        "no-deprecated-role"
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
    let computed = get_computed_role(ctx.spec, ctx.arena, ctx.node_id, ctx.version, false);
    if computed.role.is_some_and(|role| role.deprecated) {
        violations.push(ctx.attr_violation(attr, format!("The \"{}\" role is deprecated", attr.value.raw)));
    }
}
