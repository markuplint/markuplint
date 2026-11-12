//! `no-invalid-attr-value` rule: report attribute values that violate the spec type.
//!
//! Ports `packages/@markuplint/rules/src/no-invalid-attr-value/`. An attribute listed in
//! `allowAttrs` is checked against the type the option gives it; any other attribute is
//! checked against its spec type, but only when the spec says the attribute applies
//! (a name `no-unknown-attr` or `no-disallowed-attr` reports is not checked here).

use markuplint_core::mlast::MLASTHTMLAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers;
use markuplint_types::spec::types::MLMLSpec;

use crate::attr_check::{
    AttrCheckContext, AttrEligibility, attr_check_value, get_clean_value, lookup_name_option,
    resolve_attr_eligibility_of, walk_attrs,
};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoInvalidAttrValue;

impl Rule for NoInvalidAttrValue {
    fn id(&self) -> &'static str {
        "no-invalid-attr-value"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        walk_attrs(self.id(), arena, spec, config, Clone::clone, check)
    }
}

fn check(options: &serde_json::Value, html_attr: &MLASTHTMLAttr, ctx: &AttrCheckContext<'_>) -> Vec<Violation> {
    let name = helpers::attr_name(html_attr);
    let value = get_clean_value(html_attr);

    // Whether an entry of `allowAttrs` is the attribute is up to the attribute: the DOM decides
    // whether two spellings are one name (`MLAttr#isNamedBy`).
    let any = serde_json::Value::String("Any".to_owned());
    let allow_type = lookup_name_option(options.get("allowAttrs"), ctx.el, html_attr, &any);

    let invalid = if let Some(allow_type) = allow_type {
        attr_check_value(ctx.tr, name, value, true, &allow_type)
    } else {
        if !ctx.is_html() {
            return vec![];
        }
        let Some(specs) = ctx.attr_specs.as_ref() else {
            return vec![];
        };
        let AttrEligibility::Ok { spec } = resolve_attr_eligibility_of(html_attr, specs, ctx) else {
            return vec![];
        };
        attr_check_value(ctx.tr, name, value, false, &spec.attr_type)
    };

    // TS `attr.isDynamicValue`: a value that is not known is not judged
    if html_attr.is_dynamic_value == Some(true) {
        return vec![];
    }

    let value_node = &html_attr.value;
    invalid
        .unwrap_or_default()
        .into_iter()
        .map(|one| {
            // The value of an expression is what the code results in, so a position in it is not a
            // position in the source (an escape, a quote): the whole value that is written is reported
            let (line, col, raw) = if html_attr.is_expression_value == Some(true) {
                (value_node.line, value_node.col, value_node.raw.clone())
            } else {
                let loc_line = u32::try_from(one.loc.line).unwrap_or(u32::MAX);
                let loc_col = u32::try_from(one.loc.col).unwrap_or(u32::MAX);
                let col = if one.loc.line > 0 {
                    loc_col + 1
                } else {
                    value_node.col + loc_col
                };
                (value_node.line + loc_line, col, one.loc.raw)
            };
            Violation {
                rule_id: ctx.rule_id.to_string(),
                name: None,
                severity: *ctx.severity,
                message: ctx.tr.finish(&one.message),
                line,
                col,
                raw,
                reason: None,
                fix: None,
            }
        })
        .collect()
}
