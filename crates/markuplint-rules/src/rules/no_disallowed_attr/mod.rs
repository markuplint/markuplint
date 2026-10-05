//! `no-disallowed-attr` rule: report attributes the spec defines but does not allow here.
//!
//! Ports `packages/@markuplint/rules/src/no-disallowed-attr/`: an attribute the spec
//! marks `noUse`, one whose `condition` does not hold on the element
//! (`referrerpolicy` on an `<a>` without `href`), and `is` on an autonomous custom
//! element.

use markuplint_core::mlast::ElementType;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::attr_check::{
    AttrCheckContext, AttrEligibility, attr_full_violation, attr_violation, element_allows_additional_properties,
    parse_allow_attrs, parse_ignore_prefixes, resolve_attr_eligibility, walk_attrs,
};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoDisallowedAttr;

struct Options {
    /// Attribute names to treat as allowed (`allowAttrs`).
    allowed_names: Vec<String>,
    ignore_prefixes: Vec<String>,
}

impl Options {
    fn from_config(options: &serde_json::Value) -> Self {
        let (simple, entries) = parse_allow_attrs(options);
        let mut allowed_names = simple;
        allowed_names.extend(entries.into_iter().map(|e| e.name));
        Self {
            allowed_names,
            ignore_prefixes: parse_ignore_prefixes(options),
        }
    }
}

impl Rule for NoDisallowedAttr {
    fn id(&self) -> &'static str {
        "no-disallowed-attr"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        walk_attrs(self.id(), arena, spec, config, Options::from_config, check)
    }
}

fn check(
    options: &Options,
    html_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    ctx: &AttrCheckContext<'_>,
) -> Option<Violation> {
    let name = markuplint_dom::helpers::get_raw_attr_name(html_attr);

    // https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is
    // "The is attribute must not be specified on an autonomous custom element"
    if name == "is" && ctx.element_type == ElementType::WebComponent {
        return Some(attr_violation(
            ctx,
            html_attr,
            "The \"is\" attribute must not be specified on an autonomous custom element".to_string(),
        ));
    }

    let name_lower = name.to_ascii_lowercase();
    if options.ignore_prefixes.iter().any(|p| name_lower.starts_with(p)) {
        return None;
    }
    if options.allowed_names.iter().any(|a| a.eq_ignore_ascii_case(name)) {
        return None;
    }
    if !ctx.is_html() {
        return None;
    }

    let message = format!("The \"{name}\" attribute is disallowed");
    match resolve_attr_eligibility(name, ctx) {
        // Reported with the whole attribute as `raw`, as TS reports the attribute node.
        AttrEligibility::NoUse => Some(attr_full_violation(ctx, html_attr, message)),
        AttrEligibility::ConditionNotMet if !element_allows_additional_properties(ctx) => {
            Some(attr_violation(ctx, html_attr, message))
        }
        _ => None,
    }
}
