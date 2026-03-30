//! `no-ambiguous-navigable-target-names` rule: navigable target names should not be ambiguous keywords.
//!
//! Values like "self", "blank", "parent", "top" without a leading underscore are likely
//! typos for "_self", "_blank", "_parent", "_top".

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfig};
use crate::violation::Violation;

/// Known ambiguous navigable target names (without leading underscore).
const AMBIGUOUS_TARGETS: &[&str] = &["self", "blank", "parent", "top"];

/// The `no-ambiguous-navigable-target-names` rule.
pub struct NoAmbiguousNavigableTargetNames;

impl Rule for NoAmbiguousNavigableTargetNames {
    fn id(&self) -> &'static str {
        "no-ambiguous-navigable-target-names"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (_node_id, el) in arena.elements() {
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                // Only check "target" attributes
                if !html_attr.node_name.eq_ignore_ascii_case("target") {
                    continue;
                }

                let value_lower = html_attr.value.raw.to_ascii_lowercase();
                if AMBIGUOUS_TARGETS.contains(&value_lower.as_str()) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        severity: config.severity.clone(),
                        message: format!(
                            "Don't use an ambiguous navigable target name. Did you mean \"_{value_lower}\"?"
                        ),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.raw.clone(),
                    });
                }
            }
        }

        violations
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rules::attr_duplication::tests::make_element_with_attrs;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!(
            "../../../../packages/@markuplint/html-spec/index.json"
        ))
        .unwrap()
    }

    #[test]
    fn ambiguous_blank_violation() {
        let arena = make_element_with_attrs("a", &[("target", "blank")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Don't use an ambiguous navigable target name. Did you mean \"_blank\"?"
        );
    }

    #[test]
    fn correct_underscore_blank_no_violation() {
        let arena = make_element_with_attrs("a", &[("target", "_blank")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }

    #[test]
    fn ambiguous_self_violation() {
        let arena = make_element_with_attrs("a", &[("target", "self")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Don't use an ambiguous navigable target name. Did you mean \"_self\"?"
        );
    }

    #[test]
    fn custom_target_name_no_violation() {
        let arena = make_element_with_attrs("a", &[("target", "myframe")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }

    #[test]
    fn ambiguous_parent_violation() {
        let arena = make_element_with_attrs("a", &[("target", "parent")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Don't use an ambiguous navigable target name. Did you mean \"_parent\"?"
        );
    }

    #[test]
    fn correct_underscore_top_no_violation() {
        let arena = make_element_with_attrs("a", &[("target", "_top")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }

    #[test]
    fn ambiguous_top_violation() {
        let arena = make_element_with_attrs("a", &[("target", "top")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Don't use an ambiguous navigable target name. Did you mean \"_top\"?"
        );
    }
}
