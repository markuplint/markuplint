//! `no-prohibited-naming` rule: report `aria-label` / `aria-labelledby` / `aria-braillelabel` on an
//! element whose naming is prohibited.
//!
//! Ports `packages/@markuplint/rules/src/no-prohibited-naming/` and
//! `.../wai-aria/checkings/prohibited-naming.ts`. ARIA in HTML marks the elements without a
//! corresponding role (`abbr`, `cite`, `figcaption`, ...) as `namingProhibited`
//! (<https://w3c.github.io/html-aria/#dfn-naming-prohibited>); the flag is read from the spec, not
//! listed here.
//!
//! An autonomous custom element (a web component without an `is` attribute) has no spec entry yet
//! is treated the same way, because ARIA in HTML §4.4 forbids naming attributes on it unless the
//! author gives it a role. The computed role is `None` for a custom element even with a `role`
//! attribute, so a non-empty `role` value is taken as "a role that supports naming is set" without
//! validating it: `role="presentation"` lifts the prohibition too. That is permissive on purpose
//! (pinned by the TS test `no-prohibited-naming-issue-3630-013`).

use markuplint_core::mlast::ElementType;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::{ElementContext, ElementGate, aria_prop_attrs, attr_name, find_attr, role_attr, walk_elements};
use crate::attr_check::get_clean_value;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

const NAMING_ATTRS: [&str; 3] = ["aria-label", "aria-labelledby", "aria-braillelabel"];

pub struct NoProhibitedNaming;

impl Rule for NoProhibitedNaming {
    fn id(&self) -> &'static str {
        "no-prohibited-naming"
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
    let naming_attrs: Vec<_> = aria_prop_attrs(ctx.el)
        .into_iter()
        .filter(|attr| NAMING_ATTRS.contains(&attr_name(attr)))
        .collect();
    if naming_attrs.is_empty() || ctx.computed_role().is_some() {
        return;
    }

    let is_autonomous_custom_element =
        ctx.el.element_type == ElementType::WebComponent && find_attr(ctx.el, "is").is_none();
    let has_explicit_role_attr =
        is_autonomous_custom_element && role_attr(ctx.el).is_some_and(|attr| !get_clean_value(attr).trim().is_empty());
    if has_explicit_role_attr {
        return;
    }

    let naming_prohibited = ctx.aria().is_some_and(|aria| aria.naming_prohibited);
    if !naming_prohibited && !is_autonomous_custom_element {
        return;
    }

    for attr in naming_attrs {
        let name = attr_name(attr);
        violations.push(ctx.attr_violation(
            attr,
            format!(
                "The \"{name}\" ARIA {} is prohibited on the \"{}\" element",
                ctx.prop_type_of(name),
                ctx.el_name
            ),
        ));
    }
}
