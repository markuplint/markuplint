//! `no-restricted-attr` rule: report attributes the user disallowed through `disallowAttrs`.
//!
//! Ports `packages/@markuplint/rules/src/no-restricted-attr/`. Purely user-defined
//! denylisting, independent of what the spec says: it applies to every element, not
//! only HTML ones.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::attr_check::{
    AttrCheckContext, AttrEntry, ValueConstraint, attr_value_violation, attr_violation, check_type_constraint,
    get_clean_value, parse_disallow_attrs, walk_attrs,
};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoRestrictedAttr;

struct Options {
    /// `disallowAttrs`: a bare name is disallowed whatever its value.
    disallowed: Vec<AttrEntry>,
}

impl Options {
    fn from_config(options: &serde_json::Value) -> Self {
        let (simple, entries) = parse_disallow_attrs(options);
        let mut disallowed: Vec<AttrEntry> = simple
            .into_iter()
            .map(|name| AttrEntry {
                name,
                constraint: ValueConstraint::Any,
            })
            .collect();
        disallowed.extend(entries);
        Self { disallowed }
    }
}

impl Rule for NoRestrictedAttr {
    fn id(&self) -> &'static str {
        "no-restricted-attr"
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

    let entry = options.disallowed.iter().find(|e| e.name.eq_ignore_ascii_case(name))?;
    let value = get_clean_value(html_attr);

    match &entry.constraint {
        ValueConstraint::Any => Some(attr_violation(
            ctx,
            html_attr,
            format!("The \"{name}\" attribute is disallowed"),
        )),
        ValueConstraint::Enum(values) => values.iter().any(|v| v == value).then(|| {
            attr_value_violation(
                ctx,
                html_attr,
                format!(
                    "The \"{name}\" attribute is disallowed to accept the following values: {}",
                    values.iter().map(|v| format!("\"{v}\"")).collect::<Vec<_>>().join(", ")
                ),
            )
        }),
        ValueConstraint::Pattern(re, original) => re.is_match(value).then(|| {
            attr_value_violation(
                ctx,
                html_attr,
                format!("The \"{name}\" attribute is matched with the below disallowed patterns: {original}"),
            )
        }),
        ValueConstraint::Type(type_name) => check_type_constraint(value, type_name).then(|| {
            attr_value_violation(
                ctx,
                html_attr,
                format!("The type of the \"{name}\" attribute is disallowed"),
            )
        }),
    }
}
