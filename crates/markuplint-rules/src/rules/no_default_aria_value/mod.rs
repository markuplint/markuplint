//! `no-default-aria-value` rule: report an `aria-*` attribute set to the value the spec already
//! implies for it.
//!
//! Ports `packages/@markuplint/rules/src/no-default-aria-value/` and its checker
//! `wai-aria/checkings/default-value.ts`. The value is compared after `trim()` and
//! `toLowerCase()`; the property is matched by the attribute name as written, case-sensitively
//! (`ARIA-LIVE="off"` is not reported, as in TS). An attribute with a dynamic value is skipped.
//! The default severity is `warning`.

use markuplint_core::mlast::MLASTHTMLAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria;
use markuplint_types::spec::types::{ARIAProperty, MLMLSpec};

use crate::aria_check::{ElementContext, ElementGate, aria_prop_attrs, attr_name, is_js_whitespace, walk_elements};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct NoDefaultAriaValue;

impl Rule for NoDefaultAriaValue {
    fn id(&self) -> &'static str {
        "no-default-aria-value"
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
    if attrs.is_empty() {
        return;
    }

    let props = &aria::get_aria_spec(ctx.spec, ctx.version).props;

    for attr in attrs {
        if is_default_value(attr, props) {
            violations.push(ctx.attr_violation(attr, "It is default value"));
        }
    }
}

/// Whether `attr` carries the default value of its property. A dynamic value never does.
fn is_default_value(attr: &MLASTHTMLAttr, props: &[ARIAProperty]) -> bool {
    if attr.is_dynamic_value == Some(true) {
        return false;
    }
    let name = attr_name(attr);
    let Some(default_value) = props
        .iter()
        .find(|p| p.name == name)
        .and_then(|p| p.default_value.as_deref())
    else {
        return false;
    };
    attr.value.raw.trim_matches(is_js_whitespace).to_lowercase() == default_value
}
