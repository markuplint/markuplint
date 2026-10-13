//! `aria-prop-requires-role` rule: report a non-global `aria-*` attribute on an element that has no
//! role.
//!
//! Ports `packages/@markuplint/rules/src/aria-prop-requires-role/` and its checker
//! `wai-aria/checkings/no-global-prop.ts`. Only an element whose computed role (explicit or
//! implicit) is `null` is looked at; the properties are matched by the attribute name as written,
//! case-sensitively, so `ARIA-CHECKED` is not recognised (as in TS).

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::computed_role::get_computed_role;
use crate::aria_check::{ElementContext, ElementGate, aria_prop_attrs, attr_name, prop_type_label, walk_elements};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct AriaPropRequiresRole;

impl Rule for AriaPropRequiresRole {
    fn id(&self) -> &'static str {
        "aria-prop-requires-role"
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
    let attrs = aria_prop_attrs(ctx.el);
    if attrs.is_empty() {
        return;
    }

    if get_computed_role(ctx.spec, ctx.arena, ctx.node_id, ctx.version, false)
        .role
        .is_some()
    {
        return;
    }

    let props = &aria::get_aria_spec(ctx.spec, ctx.version).props;

    for attr in attrs {
        let name = attr_name(attr);
        let Some(prop) = props.iter().find(|p| p.name == name) else {
            continue;
        };
        if prop.is_global == Some(true) {
            continue;
        }
        let prop_type = prop_type_label(&prop.prop_type);
        violations.push(ctx.attr_violation(
            attr,
            format!("The \"{name}\" ARIA {prop_type} is not global {prop_type}"),
        ));
    }
}
