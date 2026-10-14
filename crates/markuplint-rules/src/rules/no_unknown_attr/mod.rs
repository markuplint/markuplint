//! `no-unknown-attr` rule: report attributes the HTML spec does not define for the element.
//!
//! Ports `packages/@markuplint/rules/src/no-unknown-attr/`. A name that matches a
//! spec name only in a different case (`viewbox` for `viewBox`) is reported too.
//! What the spec says about an attribute that does exist (`noUse`, `condition`,
//! its value type) is `no-disallowed-attr` and `no-invalid-attr-value`'s concern.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::attr_name;
use crate::attr_check::{
    AttrCheckContext, AttrEligibility, attr_violation, element_allows_additional_properties, parse_allow_attrs,
    parse_ignore_prefixes, resolve_attr_eligibility, walk_attrs,
};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoUnknownAttr;

struct Options {
    /// Attribute names to treat as known (`allowAttrs`); the value type they may carry
    /// is `no-invalid-attr-value`'s concern.
    allowed_names: Vec<String>,
    ignore_prefixes: Vec<String>,
    /// `allowToAddPropertiesForPretender` (default `true`): a pretended component may take
    /// attributes the element it pretends to be does not define (its own props).
    allow_pretender_properties: bool,
}

impl Options {
    fn from_config(options: &serde_json::Value) -> Self {
        let (simple, entries) = parse_allow_attrs(options);
        let mut allowed_names = simple;
        allowed_names.extend(entries.into_iter().map(|e| e.name));
        Self {
            allowed_names,
            ignore_prefixes: parse_ignore_prefixes(options),
            allow_pretender_properties: options
                .get("allowToAddPropertiesForPretender")
                .and_then(serde_json::Value::as_bool)
                .unwrap_or(true),
        }
    }
}

impl Rule for NoUnknownAttr {
    fn id(&self) -> &'static str {
        "no-unknown-attr"
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
    if !ctx.is_html() {
        return None;
    }

    // TS `attr.name`: the name the parser resolved (`:href` is `href`), else the raw
    // (original-case) one. The WHATWG parser lowercases node_name, but TS preserves original case.
    let name = attr_name(html_attr);

    // A parser-supplied IDL naming suggestion (e.g. `tabindex` -> `tabIndex` in JSX)
    // takes priority over spec-driven typo detection below.
    if let Some(candidate) = &html_attr.candidate {
        return Some(attr_violation(
            ctx,
            html_attr,
            format!("The \"{name}\" attribute is disallowed. Did you mean \"{candidate}\"?"),
        ));
    }

    let name_lower = name.to_ascii_lowercase();
    if options.ignore_prefixes.iter().any(|p| name_lower.starts_with(p)) {
        return None;
    }
    if options.allowed_names.iter().any(|a| a.eq_ignore_ascii_case(name)) {
        return None;
    }

    let message = match resolve_attr_eligibility(name, ctx) {
        AttrEligibility::Unknown {
            candidate: Some(candidate),
        }
        | AttrEligibility::CaseMismatch {
            expected_name: candidate,
        } => format!("The \"{name}\" attribute is disallowed. Did you mean \"{candidate}\"?"),
        AttrEligibility::Unknown { candidate: None } => format!("The \"{name}\" attribute is disallowed"),
        _ => return None,
    };

    // TS: the attribute's owner element is the pretender's `as` element, whose context is
    // `origin`, i.e. the element pretends.
    if options.allow_pretender_properties
        && ctx
            .arena
            .get(ctx.node_id)
            .and_then(markuplint_dom::node::DomNode::as_element)
            .is_some_and(|el| el.pretended().is_some())
    {
        return None;
    }

    if element_allows_additional_properties(ctx) {
        return None;
    }

    Some(attr_violation(ctx, html_attr, message))
}
