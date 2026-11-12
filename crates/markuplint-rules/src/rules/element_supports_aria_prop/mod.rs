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
    AltMethod, ElementContext, ElementGate, ElementProperties, Restriction, WithoutAlt, aria_prop_attrs, attr_name,
    find_attr, name_key, walk_elements,
};
use crate::create_message::Kw;
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
        let key = name_key(ctx.el, attr);
        let prop_type = ctx.prop_type_of(&key);
        let tr = ctx.tr;
        let prop_label = format!("ARIA {prop_type}");
        let on_element = || tr.t("the \"{0*}\" {1}", &[Kw::S(&ctx.local_name()), Kw::S("element")]);
        let disallowed = || {
            ctx.attr_violation(
                attr,
                tr.finish(&tr.t(
                    "{0:c} on {1}",
                    &[
                        Kw::S(&tr.t(
                            "{0} is {1:c}",
                            &[
                                Kw::S(&tr.t("the \"{0*}\" {1}", &[Kw::S(name), Kw::S(&prop_label)])),
                                Kw::S("disallowed"),
                            ],
                        )),
                        Kw::S(&on_element()),
                    ],
                )),
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
            && !only.iter().any(|entry| entry.name == key)
        {
            violations.push(disallowed());
            continue;
        }

        let Some(entry) = constraint
            .without
            .as_ref()
            .and_then(|without| without.iter().find(|entry| entry.name == key))
        else {
            continue;
        };

        let verb_template = match entry.restriction {
            Restriction::MustNot => "{0} must not {1}",
            Restriction::ShouldNot => "{0} should not {1}",
            Restriction::NotRecommended => "{0} is not recommended to {1}",
        };
        let hint = entry
            .alt
            .as_ref()
            .map_or_else(String::new, |alt| alt_hint(ctx, alt, &prop_label));
        let main = tr.t(
            "{0:c} on {1}",
            &[
                Kw::S(&tr.t(
                    verb_template,
                    &[
                        Kw::S(&tr.t("the \"{0*}\" {1}", &[Kw::S(name), Kw::S(&prop_label)])),
                        Kw::S("use"),
                    ],
                )),
                Kw::S(&on_element()),
            ],
        );
        violations.push(ctx.attr_violation(attr, tr.finish(&format!("{main}{hint}"))));
    }
}

/// The sentence that follows the main message: what to do instead of the restricted attribute.
fn alt_hint(ctx: &ElementContext<'_>, alt: &WithoutAlt, prop_label: &str) -> String {
    let tr = ctx.tr;
    let target = tr.t("the \"{0*}\" {1}", &[Kw::S(&alt.target), Kw::S("attribute")]);
    let has_native_attr = alt.method == AltMethod::SetAttr && find_attr(ctx.el, &alt.target).is_some();
    let sentence = if has_native_attr {
        tr.t(
            "As its {0} is already provided by {1}",
            &[Kw::S(&tr.t("state", &[])), Kw::S(&target)],
        )
    } else {
        let action = match alt.method {
            AltMethod::RemoveAttr => "Remove {0}",
            AltMethod::SetAttr => "Add {0}",
        };
        tr.t(
            "{0} if you {1} {2}",
            &[
                Kw::S(&tr.t(action, &[Kw::S(&target)])),
                Kw::S("use"),
                Kw::S(&tr.t("the {0}", &[Kw::S(prop_label)])),
            ],
        )
    };
    format!("{}{sentence}", tr.t(". ", &[]))
}
