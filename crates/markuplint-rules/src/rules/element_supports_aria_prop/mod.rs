//! `element-supports-aria-prop` rule: report an `aria-*` attribute the element itself restricts.
//!
//! Ports `packages/@markuplint/rules/src/element-supports-aria-prop/` and
//! `.../wai-aria/checkings/element-supports-aria-prop.ts`. ARIA in HTML restricts the `aria-*`
//! attributes of some elements regardless of the role; the spec carries it as the element's
//! `aria.properties`:
//!
//! - `false`: no `aria-*` at all, on an element with no role (`input[type=hidden]`). It applies
//!   only while the computed role is `None`.
//! - `only`: a whitelist (`br` / `wbr` accept only `aria-hidden`). Only the name is matched; no
//!   entry of the shipped spec carries a value.
//! - `without`: a blacklist with the alternative to suggest. A `must-not` entry is a conformance
//!   error, `should-not` and `not-recommended` are worded accordingly.
//!
//! The elements this rule applies to are those with a spec entry; an autonomous custom element has
//! no restriction of its own.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::{
    AltMethod, ElementContext, ElementGate, ElementProperties, Restriction, aria_prop_attrs, attr_name, find_attr,
    walk_elements,
};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct ElementSupportsAriaProp;

impl Rule for ElementSupportsAriaProp {
    fn id(&self) -> &'static str {
        "element-supports-aria-prop"
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
    let Some(aria) = ctx.aria() else {
        return;
    };

    for attr in attrs {
        let name = attr_name(attr);
        let prop_type = ctx.prop_type_of(name);
        let disallowed = || {
            ctx.attr_violation(
                attr,
                format!(
                    "The \"{name}\" ARIA {prop_type} is disallowed on the \"{}\" element",
                    ctx.el_name
                ),
            )
        };

        let constraint = match &aria.properties {
            ElementProperties::Disallowed => {
                if ctx.computed_role().is_none() {
                    violations.push(disallowed());
                }
                continue;
            }
            ElementProperties::Constrained(constraint) => constraint,
            ElementProperties::Unspecified => continue,
        };

        if let Some(only) = &constraint.only
            && !only.iter().any(|entry| entry.name == name)
        {
            violations.push(disallowed());
            continue;
        }

        let Some(entry) = constraint
            .without
            .as_ref()
            .and_then(|without| without.iter().find(|entry| entry.name == name))
        else {
            continue;
        };

        let verb = match entry.restriction {
            Restriction::MustNot => "must not",
            Restriction::ShouldNot => "should not",
            Restriction::NotRecommended => "is not recommended to",
        };
        let hint = entry.alt.as_ref().map_or_else(String::new, |alt| {
            let has_native_attr = alt.method == AltMethod::SetAttr && find_attr(ctx.el, &alt.target).is_some();
            if has_native_attr {
                format!(". As its state is already provided by the \"{}\" attribute", alt.target)
            } else {
                let action = match alt.method {
                    AltMethod::RemoveAttr => "Remove",
                    AltMethod::SetAttr => "Add",
                };
                format!(
                    ". {action} the \"{}\" attribute if you use the ARIA {prop_type}",
                    alt.target
                )
            }
        });
        violations.push(ctx.attr_violation(
            attr,
            format!(
                "The \"{name}\" ARIA {prop_type} {verb} use on the \"{}\" element{hint}",
                ctx.el_name
            ),
        ));
    }
}
