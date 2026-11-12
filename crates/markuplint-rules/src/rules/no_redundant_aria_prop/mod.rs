//! `no-redundant-aria-prop` rule: report an `aria-*` attribute that restates what an equivalent
//! native HTML attribute already says.
//!
//! Ports `packages/@markuplint/rules/src/no-redundant-aria-prop/` and
//! `.../wai-aria/checkings/redundant-aria-prop.ts`. ARIA in HTML §6 recommends the native
//! attribute over its ARIA equivalent (`aria-required` and `required`), so repeating the same
//! value is superfluous. That is a "should", hence the default severity is a warning, where
//! `no-contradictory-aria-prop` (a "must") defaults to an error.
//!
//! The equivalence comes from the spec (`equivalentHtmlAttrs` of each ARIA property). The native
//! attribute is skipped when it does not apply to the element (unknown name, case mismatch, unmet
//! condition); `noUse` still counts, since a forbidden native attribute can be implicit.

use markuplint_core::i18n::Primitive as Kw;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::{ElementContext, ElementGate, aria_prop_attrs, attr_name, find_attr, name_key, walk_elements};
use crate::attr_check::{AttrEligibility, get_clean_value, resolve_attr_eligibility, with_element_attr_context};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct NoRedundantAriaProp;

impl Rule for NoRedundantAriaProp {
    fn id(&self) -> &'static str {
        "no-redundant-aria-prop"
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
            let key = name_key(ctx.el, attr);
            let Some(prop) = props.iter().find(|prop| prop.name == key) else {
                continue;
            };
            let Some(equivalents) = &prop.equivalent_html_attrs else {
                continue;
            };

            for equivalent in equivalents {
                let eligibility = resolve_attr_eligibility(&equivalent.html_attr_name, attr_ctx);
                if matches!(
                    eligibility,
                    AttrEligibility::Unknown { .. } | AttrEligibility::ConditionNotMet
                ) {
                    continue;
                }
                let Some(native) = find_attr(ctx.el, &equivalent.html_attr_name) else {
                    continue;
                };

                let value = get_clean_value(attr).trim().to_lowercase();
                let is_same = match &equivalent.value {
                    None => get_clean_value(native) == value,
                    Some(expected) => *expected == value,
                };
                if is_same {
                    let tr = ctx.tr;
                    let native_name = equivalent.html_attr_name.as_str();
                    let message = tr.t(
                        "{0} has {1}",
                        &[
                            Kw::S(&tr.t(
                                "the \"{0*}\" {1}",
                                &[Kw::S(name), Kw::S(&format!("ARIA {}", ctx.prop_type_of(&key)))],
                            )),
                            Kw::S(&tr.t(
                                "the same {0} as {1}",
                                &[
                                    Kw::S("semantics"),
                                    Kw::S(&tr.t(
                                        "{0} or {1}",
                                        &[
                                            Kw::S(&tr.t(
                                                "the current \"{0*}\" {1}",
                                                &[Kw::S(native_name), Kw::S("attribute")],
                                            )),
                                            Kw::S(&tr.t(
                                                "the implicit \"{0*}\" {1}",
                                                &[Kw::S(native_name), Kw::S("attribute")],
                                            )),
                                        ],
                                    )),
                                ],
                            )),
                        ],
                    );
                    violations.push(ctx.attr_violation(attr, tr.finish(&message)));
                    break;
                }
            }
        }
    });
}
