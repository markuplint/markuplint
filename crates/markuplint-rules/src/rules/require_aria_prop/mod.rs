//! `require-aria-prop` rule: report an element whose explicit role is missing a required ARIA
//! state or property.
//!
//! Ports `packages/@markuplint/rules/src/require-aria-prop/` and its checker
//! `wai-aria/checkings/required-prop.ts`:
//!
//! - Only an element with a `role` attribute is looked at, and only when its computed role is an
//!   explicit one; an implicit role gets its required values from the browser.
//! - A property marked `requiredCondition: "focusable"` (`separator`'s `aria-valuenow`) is required
//!   only when the element may be focusable.
//! - The first missing property decides the outcome, so an element is reported at most once. When
//!   the element's ARIA in HTML entry names a native attribute that carries the same information
//!   (`without` with `alt.method: "set-attr"`) and the element has it, nothing is reported for the
//!   element at all, not even for a later missing property. That is how TS returns from the loop.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::computed_role::get_computed_role;
use crate::aria::may_be_focusable::may_be_focusable;
use crate::aria_check::{
    AltMethod, ElementContext, ElementGate, ElementProperties, attr_name, find_attr, html_attrs, role_attr,
    walk_elements,
};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct RequireAriaProp;

impl Rule for RequireAriaProp {
    fn id(&self) -> &'static str {
        "require-aria-prop"
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
    role_attr(ctx.el)?;

    let role = get_computed_role(ctx.spec, ctx.arena, ctx.node_id, ctx.version, false).role?;
    if role.is_implicit {
        return None;
    }
    let role_spec = aria::get_role_spec(ctx.spec, &role.name, ctx.version)?;

    // Evaluated at most once, and only when a conditional property is reached.
    let mut focusable: Option<bool> = None;

    for owned in &role_spec.owned_properties {
        if owned.required != Some(true) {
            continue;
        }
        if owned.required_condition.as_deref() == Some("focusable")
            && !*focusable.get_or_insert_with(|| may_be_focusable(ctx.spec, ctx.arena, ctx.node_id))
        {
            continue;
        }

        let required = owned.name.as_str();
        // TS `attr.name.toLowerCase() === requiredProp`.
        if html_attrs(ctx.el).any(|attr| attr_name(attr).to_ascii_lowercase() == required) {
            continue;
        }

        if has_native_alternative(ctx, required) {
            return None;
        }

        return Some(ctx.element_violation(format!(
            "Require the \"{required}\" ARIA {} on the \"{}\" role",
            ctx.prop_type_of(required),
            role.name
        )));
    }

    None
}

/// The element's ARIA in HTML entry says `required` should be expressed by a native attribute
/// (`without: [{ name, alt: { method: "set-attr", target } }]`) and the element has that attribute.
fn has_native_alternative(ctx: &ElementContext<'_>, required: &str) -> bool {
    let Some(aria) = ctx.aria() else {
        return false;
    };
    let ElementProperties::Constrained(constraint) = &aria.properties else {
        return false;
    };
    let Some(alt) = constraint
        .without
        .as_ref()
        .and_then(|without| without.iter().find(|entry| entry.name == required))
        .and_then(|entry| entry.alt.as_ref())
    else {
        return false;
    };
    alt.method == AltMethod::SetAttr && find_attr(ctx.el, &alt.target).is_some()
}
