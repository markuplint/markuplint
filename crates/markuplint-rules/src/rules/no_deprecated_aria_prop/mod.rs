//! `no-deprecated-aria-prop` rule: report an `aria-*` attribute the element's role deprecates.
//!
//! Ports `packages/@markuplint/rules/src/no-deprecated-aria-prop/` and its checker
//! `wai-aria/checkings/deprecated-props.ts`. The role is the **computed** role, so a property
//! deprecated on an implicit role (`<article aria-disabled>`) is reported too; the pre-split
//! `wai-aria` implementation only looked at the explicit `role`. Properties are matched by the
//! attribute name as written, case-sensitively, so `ARIA-INVALID` is not recognised as
//! `aria-invalid` (as in TS). The default severity is `warning`.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::computed_role::get_computed_role;
use crate::aria_check::{ElementContext, ElementGate, aria_prop_attrs, attr_name, prop_type_label, walk_elements};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct NoDeprecatedAriaProp;

impl Rule for NoDeprecatedAriaProp {
    fn id(&self) -> &'static str {
        "no-deprecated-aria-prop"
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
    let attrs = aria_prop_attrs(ctx.el);
    if attrs.is_empty() {
        return;
    }

    let computed = get_computed_role(ctx.spec, ctx.arena, ctx.node_id, ctx.version, false);
    let Some(role) = computed.role else {
        return;
    };
    let Some(role_spec) = aria::get_role_spec(ctx.spec, &role.name, ctx.version) else {
        return;
    };
    let props = &aria::get_aria_spec(ctx.spec, ctx.version).props;

    for attr in attrs {
        let name = attr_name(attr);
        let deprecated = role_spec
            .owned_properties
            .iter()
            .find(|p| p.name == name)
            .is_some_and(|p| p.deprecated == Some(true));
        if !deprecated {
            continue;
        }
        let prop_type = props
            .iter()
            .find(|p| p.name == name)
            .map_or("property", |p| prop_type_label(&p.prop_type));
        violations.push(ctx.attr_violation(
            attr,
            format!(
                "The \"{name}\" ARIA {prop_type} is deprecated on the \"{}\" role",
                role.name
            ),
        ));
    }
}
