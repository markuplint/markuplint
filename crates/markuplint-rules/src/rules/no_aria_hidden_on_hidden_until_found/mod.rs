//! `no-aria-hidden-on-hidden-until-found` rule: no `aria-hidden="true"` on an element whose
//! `hidden` is in the Hidden Until Found state.
//!
//! Ports `packages/@markuplint/rules/src/no-aria-hidden-on-hidden-until-found/`. ARIA in HTML,
//! the `hidden` row of "Rules of ARIA attribute usage by HTML feature": "authors MUST NOT use
//! `aria-hidden="true"` on any element which also has the `hidden` attribute specified in the
//! Hidden Until Found state." Both values are compared trimmed and lower-cased; the report is
//! on the `aria-hidden` attribute. A dynamic `aria-hidden` value is skipped.
//!
//! As TS `getAttributeNode('aria-hidden')` compares the lower-cased query with the attribute
//! name as written, an `ARIA-HIDDEN` attribute is not found; `getAttribute('hidden')`
//! lower-cases both sides, so `HIDDEN` is.
//!
//! <https://w3c.github.io/html-aria/#att-hidden>

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::{attr_name, html_attrs, is_js_whitespace};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct NoAriaHiddenOnHiddenUntilFound;

/// TS `value.trim().toLowerCase() === expected`.
fn is_value(value: &str, expected: &str) -> bool {
    value.trim_matches(is_js_whitespace).to_lowercase() == expected
}

impl Rule for NoAriaHiddenOnHiddenUntilFound {
    fn id(&self) -> &'static str {
        "no-aria-hidden-on-hidden-until-found"
    }

    fn default_severity(&self) -> Severity {
        Severity::Error
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        for (node_id, el) in arena.elements() {
            // TS `el.getAttributeNode('aria-hidden')`.
            let Some(aria_hidden) = html_attrs(el).find(|attr| attr_name(attr) == "aria-hidden") else {
                continue;
            };
            if aria_hidden.is_dynamic_value == Some(true) || !is_value(&aria_hidden.value.raw, "true") {
                continue;
            }
            // TS `el.getAttribute('hidden')`.
            let hidden = html_attrs(el).find(|attr| attr_name(attr).to_lowercase() == "hidden");
            if !hidden.is_some_and(|attr| is_value(&attr.value.raw, "until-found")) {
                continue;
            }
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message: "\"aria-hidden\" must not be \"true\" on an element with \"hidden\" value \"until-found\""
                    .to_string(),
                line: aria_hidden.line,
                col: aria_hidden.col,
                raw: aria_hidden.raw.clone(),
                reason: rule_config.reason.clone(),
                fix: None,
            });
        }
        violations
    }
}
