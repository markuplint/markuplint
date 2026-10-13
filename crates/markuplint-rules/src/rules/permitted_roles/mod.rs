//! `permitted-roles` rule: report a `role` token the element may not take, according to ARIA in
//! HTML.
//!
//! Ports `packages/@markuplint/rules/src/permitted-roles/`,
//! `.../wai-aria/checkings/permitted-roles.ts` and `ml-spec/src/algorithm/aria/
//! get-permitted-roles-spec.ts`. The list of roles an element may take ([`permitted_role_names`])
//! is built from [`crate::aria_check::PermittedRoles`] as TS does:
//!
//! - `true` is every non-abstract core role and every non-abstract `DPub` role (graphics roles are
//!   not included).
//! - `{ "core-aam": true }` is the non-abstract core roles, `{ "graphics-aam": true }` the
//!   non-abstract Graphics Module roles.
//! - A list is the list.
//! - The implicit role (with its `presentation` / `none` and, from ARIA 1.3, `img` / `image`
//!   synonyms) is then added, **except** when the spec says `false`: ARIA in HTML's "No role
//!   permitted" forbids even the implicit role (`<img alt="">` with `role="presentation"`,
//!   `<summary role="button">`), and an element with no corresponding role adds nothing.
//!
//! Only the first offending token of an attribute is reported. When the list is empty every
//! token is offending, so the first one is reported; when there is no token to name the message
//! falls back to the attribute.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria::{ARIAVersion, get_aria_spec};
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::{
    ElementContext, ElementGate, PermittedRoles as ElementPermittedRoles, role_attr, role_tokens, walk_elements,
};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct PermittedRoles;

impl Rule for PermittedRoles {
    fn id(&self) -> &'static str {
        "permitted-roles"
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

const NO_PERMITTED_SUFFIX: &str = "according to ARIA in HTML specification";

fn check(ctx: &ElementContext<'_>, violations: &mut Vec<Violation>) {
    let Some(attr) = role_attr(ctx.el) else {
        return;
    };
    let permitted = permitted_role_names(ctx);
    let tokens = role_tokens(attr);
    let el_name = ctx.local_name();

    if permitted.is_empty() {
        if let Some(first) = tokens.first() {
            violations.push(ctx.token_violation(
                first,
                format!(
                    "Cannot overwrite the \"{}\" role to the \"{el_name}\" element {NO_PERMITTED_SUFFIX}",
                    first.value
                ),
            ));
        } else {
            violations.push(ctx.attr_violation(
                attr,
                format!("Cannot overwrite the role of the \"{el_name}\" element {NO_PERMITTED_SUFFIX}"),
            ));
        }
        return;
    }

    if let Some(token) = tokens.iter().find(|token| !permitted.contains(&token.value)) {
        violations.push(ctx.token_violation(
            token,
            format!(
                "Cannot overwrite the \"{}\" role to the \"{el_name}\" element {NO_PERMITTED_SUFFIX}",
                token.value
            ),
        ));
    }
}

/// TS `getPermittedRoles()`: the names of the roles `role` may take on the element.
fn permitted_role_names(ctx: &ElementContext<'_>) -> Vec<String> {
    let Some(aria) = ctx.aria() else {
        return vec![];
    };
    let aria_spec = get_aria_spec(ctx.spec, ctx.version);
    let non_abstract = |roles: &[markuplint_types::spec::types::ARIARoleInSchema]| -> Vec<String> {
        roles
            .iter()
            .filter(|role| role.is_abstract != Some(true))
            .map(|role| role.name.clone())
            .collect()
    };

    let mut names: Vec<String> = match &aria.permitted_roles {
        ElementPermittedRoles::Any => {
            let mut names = non_abstract(&aria_spec.roles);
            names.extend(non_abstract(&aria_spec.dpub_roles));
            names
        }
        ElementPermittedRoles::Aam { core_aam, graphics_aam } => {
            let mut names = Vec::new();
            if *core_aam {
                names.extend(non_abstract(&aria_spec.roles));
            }
            if *graphics_aam {
                names.extend(non_abstract(&aria_spec.graphics_roles));
            }
            names
        }
        ElementPermittedRoles::Roles(roles) => roles.iter().map(|role| role.name.clone()).collect(),
        // "No role permitted": not even the implicit role.
        ElementPermittedRoles::Nothing => return vec![],
    };

    if let Some(implicit_role) = ctx.implicit_role_name() {
        names.extend(implicit_role_names(implicit_role, ctx.version));
    }
    names
}

/// The implicit role plus the synonym the spec treats as the same role.
fn implicit_role_names(implicit_role: &str, version: ARIAVersion) -> Vec<String> {
    match implicit_role {
        "presentation" | "none" => vec!["none".to_string(), "presentation".to_string()],
        "img" | "image" if version == ARIAVersion::V1_3 => vec!["image".to_string(), "img".to_string()],
        role => vec![role.to_string()],
    }
}
