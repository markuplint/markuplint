//! `deprecated-element` rule: reports deprecated or obsolete elements.

use markuplint_core::mlast::NamespaceURI;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::lookup::get_spec;
use markuplint_types::spec::types::{MLMLSpec, Obsolete};

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `deprecated-element` rule.
pub struct DeprecatedElement;

impl Rule for DeprecatedElement {
    fn id(&self) -> &'static str {
        "deprecated-element"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            // Only check HTML and SVG namespaces
            if el.namespace != NamespaceURI::XHTML && el.namespace != NamespaceURI::SVG {
                continue;
            }

            let Some(el_spec) = get_spec(spec, &el.base.node_name) else {
                continue;
            };

            // Check deprecated
            if el_spec.deprecated == Some(true) {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: format!("The \"{}\" element is deprecated", el.base.node_name),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                });
                continue;
            }

            // Check obsolete
            if let Some(Obsolete::Flag(true) | Obsolete::Info { .. }) = &el_spec.obsolete {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: format!("The \"{}\" element is obsolete", el.base.node_name),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                });
            }
        }

        violations
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::rules::attr_duplication::tests::make_element_with_attrs;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn normal_element_no_violation() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = DeprecatedElement;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn unknown_element_no_violation() {
        let arena = make_element_with_attrs("x-custom", &[]);
        let s = spec();
        let rule = DeprecatedElement;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn hgroup_not_deprecated() {
        // <hgroup> was restored in HTML Living Standard and is NOT deprecated
        let arena = make_element_with_attrs("hgroup", &[]);
        let s = spec();
        let rule = DeprecatedElement;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn deprecated_element_reported() {
        // No HTML/SVG element currently has deprecated=true in the spec.
        // <marquee> is obsolete (not deprecated). Verify the obsolete message is reported.
        let arena = make_element_with_attrs("marquee", &[]);
        let s = spec();
        let rule = DeprecatedElement;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "The \"marquee\" element is obsolete");
    }
}
