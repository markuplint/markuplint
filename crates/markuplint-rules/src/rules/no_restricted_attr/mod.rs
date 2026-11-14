//! `no-restricted-attr` rule: report attributes the user disallowed through `disallowAttrs`.
//!
//! Ports `packages/@markuplint/rules/src/no-restricted-attr/`. Purely user-defined
//! denylisting, independent of what the spec says: it applies to every element, not
//! only HTML ones.

use markuplint_core::i18n::Primitive as Kw;
use markuplint_dom::arena::DomArena;
use markuplint_types::check::pattern::check_pattern;
use markuplint_types::check::types::PatternType;
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
        walk_attrs(self.id(), arena, spec, config, Options::from_config, |o, a, c| {
            check(o, a, c).into_iter().collect()
        })
    }
}

fn check(
    options: &Options,
    html_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    ctx: &AttrCheckContext<'_>,
) -> Option<Violation> {
    let name = markuplint_dom::helpers::attr_name(html_attr);

    // TS `createNameOptionLookup`: the exact spelling first (the later of two entries of one
    // spelling), else the last entry that the attribute says it is (`MLAttr#isNamedBy`), so the
    // case of a name is decided by the attribute: an SVG element keeps it as written.
    let entry = options.disallowed.iter().rfind(|e| e.name == name).or_else(|| {
        options
            .disallowed
            .iter()
            .rfind(|e| markuplint_dom::helpers::is_named_by(ctx.el, html_attr, &e.name))
    })?;
    // TS checks the name first: a value that is not known (`attr.isDynamicValue`) is not judged
    if html_attr.is_dynamic_value == Some(true) && !matches!(entry.constraint, ValueConstraint::Any) {
        return None;
    }
    let value = get_clean_value(html_attr);
    let tr = ctx.tr;
    let the_attr = || tr.t("the \"{0*}\" {1}", &[Kw::S(name), Kw::S("attribute")]);

    match &entry.constraint {
        ValueConstraint::Any => Some(attr_violation(
            ctx,
            html_attr,
            tr.finish(&tr.t("{0} is disallowed", &[Kw::S(&the_attr())])),
        )),
        ValueConstraint::Enum(values) => values.iter().any(|v| v == value).then(|| {
            attr_value_violation(
                ctx,
                html_attr,
                tr.finish(&tr.t(
                    "{0} is disallowed to accept the following values: {1}",
                    &[
                        Kw::S(&the_attr()),
                        Kw::S(&tr.t_list(&crate::create_message::no_translate_all(values), false)),
                    ],
                )),
            )
        }),
        ValueConstraint::Pattern(pattern) => matches_pattern(value, pattern).then(|| {
            attr_value_violation(
                ctx,
                html_attr,
                tr.finish(&tr.t(
                    "{0} is matched with the below disallowed patterns: {1}",
                    &[Kw::S(&the_attr()), Kw::S(pattern)],
                )),
            )
        }),
        ValueConstraint::Type(type_name) => check_type_constraint(value, type_name).then(|| {
            attr_value_violation(
                ctx,
                html_attr,
                tr.finish(&tr.t(
                    "{0} is disallowed",
                    &[Kw::S(&tr.t(
                        "{0} of {1}",
                        &[Kw::S(&tr.t("the {0}", &[Kw::S("type")])), Kw::S(&the_attr())],
                    ))],
                )),
            )
        }),
    }
}

/// TS `check(value, { pattern })`: whether `value` matches the pattern of an entry.
fn matches_pattern(value: &str, pattern: &str) -> bool {
    check_pattern(
        value,
        &PatternType {
            pattern: pattern.to_owned(),
        },
    )
    .is_matched()
}
