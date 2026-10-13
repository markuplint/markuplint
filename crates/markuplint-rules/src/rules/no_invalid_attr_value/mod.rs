//! `no-invalid-attr-value` rule: report attribute values that violate the spec type.
//!
//! Ports `packages/@markuplint/rules/src/no-invalid-attr-value/`. An attribute listed in
//! `allowAttrs` is checked against the type the option gives it; any other attribute is
//! checked against its spec type, but only when the spec says the attribute applies
//! (a name `no-unknown-attr` or `no-disallowed-attr` reports is not checked here).

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::attr_check::{
    AttrCheckContext, AttrEligibility, AttrEntry, ValueConstraint, attr_value_violation, check_attr_value_type,
    check_type_constraint, get_clean_value, parse_allow_attrs, resolve_attr_eligibility, walk_attrs,
};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoInvalidAttrValue;

struct Options {
    /// `allowAttrs`: a bare name allows any value.
    allowed: Vec<AttrEntry>,
}

impl Options {
    fn from_config(options: &serde_json::Value) -> Self {
        let (simple, entries) = parse_allow_attrs(options);
        let mut allowed: Vec<AttrEntry> = simple
            .into_iter()
            .map(|name| AttrEntry {
                name,
                constraint: ValueConstraint::Any,
            })
            .collect();
        allowed.extend(entries);
        Self { allowed }
    }
}

impl Rule for NoInvalidAttrValue {
    fn id(&self) -> &'static str {
        "no-invalid-attr-value"
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
    // Use the raw (original-case) attribute name, matching TS behavior.
    let name = markuplint_dom::helpers::get_raw_attr_name(html_attr);

    if let Some(entry) = options.allowed.iter().find(|e| e.name.eq_ignore_ascii_case(name)) {
        return check_allowed_entry(name, entry, html_attr, ctx);
    }

    if !ctx.is_html() {
        return None;
    }

    match resolve_attr_eligibility(name, ctx) {
        AttrEligibility::Ok { attr_type } => check_attr_value_type(name, html_attr, &attr_type, ctx),
        _ => None,
    }
}

/// Checks the value of an `allowAttrs` entry against the constraint the option gives it.
fn check_allowed_entry(
    name: &str,
    entry: &AttrEntry,
    html_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    ctx: &AttrCheckContext<'_>,
) -> Option<Violation> {
    let value = get_clean_value(html_attr);
    match &entry.constraint {
        ValueConstraint::Any => None,
        ValueConstraint::Enum(values) => {
            if values.iter().any(|v| v == value) {
                None
            } else {
                let message = if values.len() == 1 {
                    format!("The \"{name}\" attribute expects {}", values[0])
                } else {
                    let list = values.iter().map(|v| format!("\"{v}\"")).collect::<Vec<_>>().join(", ");
                    format!("The \"{name}\" attribute expects either {list}")
                };
                Some(attr_value_violation(ctx, html_attr, message))
            }
        }
        ValueConstraint::Pattern(re, original) => {
            if re.is_match(value) {
                None
            } else {
                Some(attr_value_violation(
                    ctx,
                    html_attr,
                    format!("The \"{name}\" attribute expects regular expression ({original})"),
                ))
            }
        }
        ValueConstraint::Type(type_name) => {
            if check_type_constraint(value, type_name) {
                None
            } else {
                // Run full type validation to get TS-compatible error message
                let type_json = serde_json::Value::String(type_name.clone());
                check_attr_value_type(name, html_attr, &type_json, ctx).or_else(|| {
                    Some(attr_value_violation(
                        ctx,
                        html_attr,
                        format!("The \"{name}\" attribute value is invalid"),
                    ))
                })
            }
        }
    }
}
