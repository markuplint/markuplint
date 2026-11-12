//! `no-disallowed-attr` rule: report attributes the spec defines but does not allow here.
//!
//! Ports `packages/@markuplint/rules/src/no-disallowed-attr/`: an attribute the spec
//! marks `noUse`, one whose `condition` does not hold on the element
//! (`referrerpolicy` on an `<a>` without `href`), and `is` on an autonomous custom
//! element.

use markuplint_core::mlast::{ElementType, MLASTHTMLAttr};
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers;
use markuplint_types::spec::types::MLMLSpec;

use crate::attr_check::{
    AttrCheckContext, AttrEligibility, attr_full_violation, attr_violation, element_allows_additional_properties,
    has_ignored_prefix, lookup_name_option, resolve_attr_eligibility_of, walk_attrs,
};
use crate::create_message::Kw;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoDisallowedAttr;

impl Rule for NoDisallowedAttr {
    fn id(&self) -> &'static str {
        "no-disallowed-attr"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        walk_attrs(self.id(), arena, spec, config, Clone::clone, |o, a, c| {
            check(o, a, c).into_iter().collect()
        })
    }
}

fn check(options: &serde_json::Value, html_attr: &MLASTHTMLAttr, ctx: &AttrCheckContext<'_>) -> Option<Violation> {
    // TS `attr.isAbsent`: an attribute that the framework does not output is not an attribute of
    // the element
    if helpers::is_absent(html_attr) {
        return None;
    }

    let name = helpers::attr_name(html_attr);

    // https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is
    // "The is attribute must not be specified on an autonomous custom element"
    if helpers::name_key(ctx.el, html_attr) == "is" && ctx.element_type == ElementType::WebComponent {
        return Some(attr_violation(
            ctx,
            html_attr,
            ctx.tr.t(
                "The \"{0*}\" attribute must not be specified on an autonomous custom element",
                &[Kw::S("is")],
            ),
        ));
    }

    if has_ignored_prefix(options, ctx.el, html_attr) {
        return None;
    }

    // A name listed in `allowAttrs` is allowed whatever its value
    let any = serde_json::Value::String("Any".to_owned());
    if lookup_name_option(options.get("allowAttrs"), ctx.el, html_attr, &any).is_some() {
        return None;
    }

    if !ctx.is_html() {
        return None;
    }

    let specs = ctx.attr_specs.as_ref()?;

    let base = ctx.tr.t("the \"{0*}\" {1}", &[Kw::S(name), Kw::S("attribute")]);
    match resolve_attr_eligibility_of(html_attr, specs, ctx) {
        // Reported with the whole attribute as `raw`, as TS reports the attribute node.
        AttrEligibility::NoUse => Some(attr_full_violation(
            ctx,
            html_attr,
            ctx.tr
                .finish(&ctx.tr.t("{0} is {1:c}", &[Kw::S(&base), Kw::S("disallowed")])),
        )),
        AttrEligibility::ConditionNotMet if !element_allows_additional_properties(ctx) => Some(attr_violation(
            ctx,
            html_attr,
            ctx.tr
                .finish(&ctx.tr.t("{0} is {1}", &[Kw::S(&base), Kw::S("disallowed")])),
        )),
        _ => None,
    }
}
