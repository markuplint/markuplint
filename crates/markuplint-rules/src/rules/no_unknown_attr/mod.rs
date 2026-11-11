//! `no-unknown-attr` rule: report attributes the HTML spec does not define for the element.
//!
//! Ports `packages/@markuplint/rules/src/no-unknown-attr/`. Whether a spelling is the name of a
//! spec is up to the attribute (`MLAttr#isNamedBy`): `VIEWBOX` is `viewBox` on an `<svg>` the HTML
//! parser reads, and is not where code sets the name. What the spec says about an attribute that
//! does exist (`noUse`, `condition`, its value type) is `no-disallowed-attr` and
//! `no-invalid-attr-value`'s concern.

use markuplint_core::mlast::MLASTHTMLAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers;
use markuplint_types::spec::types::MLMLSpec;

use crate::attr_check::{
    AttrCheckContext, AttrEligibility, attr_violation, element_allows_additional_properties, has_ignored_prefix,
    lookup_name_option, resolve_attr_eligibility_of, walk_attrs,
};
use crate::create_message::{Kw, capitalize, t};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoUnknownAttr;

impl Rule for NoUnknownAttr {
    fn id(&self) -> &'static str {
        "no-unknown-attr"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        walk_attrs(self.id(), arena, spec, config, Clone::clone, |o, a, c| {
            check(o, a, c).into_iter().collect()
        })
    }
}

/// `the "{name}" attribute is disallowed`, with the suggestion when there is one.
fn disallowed(name: &str, candidate: Option<&str>) -> String {
    let base = t(
        "{0} is {1:c}",
        &[
            Kw::S(&t("the \"{0*}\" {1}", &[Kw::S(name), Kw::S("attribute")])),
            Kw::S("disallowed"),
        ],
    );
    let message = match candidate {
        Some(candidate) => format!("{base}. {}", t("Did you mean \"{0*}\"?", &[Kw::S(candidate)])),
        None => base,
    };
    capitalize(&message)
}

fn check(options: &serde_json::Value, html_attr: &MLASTHTMLAttr, ctx: &AttrCheckContext<'_>) -> Option<Violation> {
    let name = helpers::attr_name(html_attr);

    // A parser-supplied IDL naming suggestion (e.g. `tabindex` -> `tabIndex` in JSX)
    // takes priority over spec-driven typo detection below.
    if ctx.is_html()
        && let Some(candidate) = &html_attr.candidate
    {
        return Some(attr_violation(ctx, html_attr, disallowed(name, Some(candidate))));
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

    let AttrEligibility::Unknown { candidate } = resolve_attr_eligibility_of(html_attr, specs, ctx) else {
        return None;
    };
    let message = disallowed(name, candidate.as_deref());

    // TS: the attribute's owner element is the pretender's `as` element, whose context is
    // `origin`, i.e. the element pretends.
    let allow_pretender_properties = options
        .get("allowToAddPropertiesForPretender")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(true);
    if allow_pretender_properties && ctx.el.pretended().is_some() {
        return None;
    }

    if element_allows_additional_properties(ctx) {
        return None;
    }

    Some(attr_violation(ctx, html_attr, message))
}
