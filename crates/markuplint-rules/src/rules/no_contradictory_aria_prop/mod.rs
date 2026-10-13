//! `no-contradictory-aria-prop` rule: report an `aria-*` attribute whose value contradicts an
//! equivalent native HTML attribute.
//!
//! Ports `packages/@markuplint/rules/src/no-contradictory-aria-prop/` and
//! `.../wai-aria/checkings/contradictory-aria-prop.ts`. ARIA in HTML §6 makes the native attribute
//! take precedence over its ARIA equivalent, so a contradicting value is a conformance error, not
//! a style preference (contrast `no-redundant-aria-prop`).
//!
//! Two cases, both read from the property's `equivalentHtmlAttrs` in the spec:
//!
//! - The native attribute is present and the values differ. A Boolean native attribute only
//!   contradicts `aria-*="false"`: its presence already means true, so any other value agrees.
//! - The native attribute is absent, the ARIA value is `true`, the equivalence is strict and the
//!   native attribute is Boolean: the implicit (absent) value is false.
//!
//! The native attribute is skipped when it does not apply to the element (unknown name, case
//! mismatch, unmet condition); `noUse` still counts.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::{ElementContext, ElementGate, aria_prop_attrs, attr_name, find_attr, walk_elements};
use crate::attr_check::{
    AttrEligibility, attr_spec_is_boolean, get_clean_value, resolve_attr_eligibility, with_element_attr_context,
};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoContradictoryAriaProp;

impl Rule for NoContradictoryAriaProp {
    fn id(&self) -> &'static str {
        "no-contradictory-aria-prop"
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
    // TS: `getAttrSpecs()` is null for an element the spec does not know.
    if attrs.is_empty() || markuplint_types::spec::lookup::get_spec(ctx.spec, ctx.el_name).is_none() {
        return;
    }
    let props = &aria::get_aria_spec(ctx.spec, ctx.version).props;

    with_element_attr_context(ctx, |attr_ctx| {
        for attr in attrs {
            if attr.is_dynamic_value == Some(true) {
                continue;
            }
            let name = attr_name(attr);
            let Some(prop) = props.iter().find(|prop| prop.name == name) else {
                continue;
            };
            let Some(equivalents) = &prop.equivalent_html_attrs else {
                continue;
            };

            for equivalent in equivalents {
                let native_name = equivalent.html_attr_name.as_str();
                let eligibility = resolve_attr_eligibility(native_name, attr_ctx);
                if matches!(
                    eligibility,
                    AttrEligibility::Unknown { .. }
                        | AttrEligibility::CaseMismatch { .. }
                        | AttrEligibility::ConditionNotMet
                ) {
                    continue;
                }

                let value = get_clean_value(attr).trim().to_lowercase();
                let is_boolean = attr_spec_is_boolean(native_name, attr_ctx);
                let contradicts_with = if let Some(native) = find_attr(ctx.el, native_name) {
                    let is_same = match &equivalent.value {
                        None => get_clean_value(native) == value,
                        Some(expected) => *expected == value,
                    };
                    // The same value is redundant, not contradictory.
                    if is_same || (is_boolean && value != "false") {
                        continue;
                    }
                    "current"
                } else if value == "true" && equivalent.is_not_strict_equivalent != Some(true) && is_boolean {
                    "implicit"
                } else {
                    continue;
                };

                violations.push(ctx.attr_violation(
                    attr,
                    format!(
                        "The \"{name}\" ARIA {} contradicts the {contradicts_with} \"{native_name}\" attribute",
                        ctx.prop_type_of(name),
                    ),
                ));
                break;
            }
        }
    });
}
