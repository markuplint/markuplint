//! `require-parent-role` rule: report an explicit role whose required accessibility parent role
//! (WAI-ARIA 1.2 "Required Context Role") is not satisfied.
//!
//! Ports `packages/@markuplint/rules/src/require-parent-role/` and its checker
//! `wai-aria/checkings/required-accessibility-parent-role.ts`. The decision is the computed
//! role's: an element whose role was dropped because the parent does not match
//! (`InvalidRequiredContextRole`), or because no non-transparent ancestor provides a context
//! (`NoOwner` without a role), is reported. `NoOwner` with the role kept is a fragment root, which
//! is not reported.
//!
//! The report is at the first token of the `role` attribute that names a core WAI-ARIA role with
//! required parent roles. Tokens are matched case-sensitively against the core role list, as TS
//! `ariaSpecs().roles.find(r => r.name === token.raw)` does, so a DPUB or graphics role is not
//! reported here.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::computed_role::{RoleComputationError, get_computed_role};
use crate::aria_check::{ElementContext, ElementGate, quoted_list, role_attr, role_tokens, walk_elements};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct RequireParentRole;

impl Rule for RequireParentRole {
    fn id(&self) -> &'static str {
        "require-parent-role"
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
    let role_attr = role_attr(ctx.el)?;

    let computed = get_computed_role(ctx.spec, ctx.arena, ctx.node_id, ctx.version, false);
    let context_missing = match computed.error_type {
        Some(RoleComputationError::InvalidRequiredContextRole) => true,
        Some(RoleComputationError::NoOwner) => computed.role.is_none(),
        _ => false,
    };
    if !context_missing {
        return None;
    }

    let roles = &aria::get_aria_spec(ctx.spec, ctx.version).roles;
    for token in role_tokens(role_attr) {
        let Some(role_spec) = roles.iter().find(|role| role.name == token.value) else {
            continue;
        };
        // TS `requiredContextRole ?? requiredAccessibilityParentRole`: the spec data carries the
        // former for every version.
        let parent_roles = if role_spec.required_context_role.is_empty() {
            &role_spec.required_accessibility_parent_role
        } else {
            &role_spec.required_context_role
        };
        let requirement = match parent_roles.as_slice() {
            [] => continue,
            [single] => format!("an accessibility parent with the \"{single}\" role"),
            several => format!(
                "an accessibility parent with one of the roles: {}",
                quoted_list(several)
            ),
        };
        return Some(ctx.token_violation(
            &token,
            format!("The \"{}\" role requires {requirement}", role_spec.name),
        ));
    }

    None
}
