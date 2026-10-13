//! `role-supports-aria-prop` rule: report an `aria-*` attribute the element's computed role does
//! not support.
//!
//! Ports `packages/@markuplint/rules/src/role-supports-aria-prop/` and
//! `.../wai-aria/checkings/role-supports-aria-prop.ts`: the attribute must be in the role's
//! `ownedProperties` (WAI-ARIA "Supported States and Properties"). An element without a computed
//! role is left to `element-supports-aria-prop`.
//!
//! The name is compared as written, so an uppercase `ARIA-LABEL` is not found among the owned
//! properties and is reported. TS does the same (`role.ownedProperties.find(p => p.name ===
//! attr.name)`); the behavior is kept so the two engines agree.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::{ElementContext, ElementGate, aria_prop_attrs, attr_name, walk_elements};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct RoleSupportsAriaProp;

impl Rule for RoleSupportsAriaProp {
    fn id(&self) -> &'static str {
        "role-supports-aria-prop"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        walk_elements(
            self.id(),
            arena,
            spec,
            config,
            ElementGate::SupportedOrWebComponent,
            |_| (),
            |(), ctx, violations| check(ctx, violations),
        )
    }
}

fn check(ctx: &ElementContext<'_>, violations: &mut Vec<Violation>) {
    let attrs = aria_prop_attrs(ctx.el);
    if attrs.is_empty() {
        return;
    }
    let Some(role) = ctx.computed_role() else {
        return;
    };

    for attr in attrs {
        let name = attr_name(attr);
        if role.owned_properties.iter().any(|owned| owned.name == name) {
            continue;
        }
        violations.push(ctx.attr_violation(
            attr,
            format!(
                "The \"{name}\" ARIA {} is disallowed on the \"{}\" role",
                ctx.prop_type_of(name),
                role.name
            ),
        ));
    }
}
