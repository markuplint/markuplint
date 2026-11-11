//! `no-ambiguous-navigable-target-names` rule: a navigable target name that is a keyword without
//! its leading underscore (`blank` for `_blank`) is likely a typo. Port of
//! `packages/@markuplint/rules/src/no-ambiguous-navigable-target-names/`.
//!
//! An attribute is checked when its spec, global ones merged (TS `getAttrSpecs`) and looked up by
//! the name the DOM gives it (TS `findAttrSpec`), has the type `NavigableTargetNameOrKeyword` or
//! `NavigableTargetName`. The keywords are ASCII case-insensitive; the message shows the value as
//! written.
//!
//! <https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword>

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::attr_name_key::{attr_specs_of, find_attr_spec};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct NoAmbiguousNavigableTargetNames;

impl Rule for NoAmbiguousNavigableTargetNames {
    fn id(&self) -> &'static str {
        "no-ambiguous-navigable-target-names"
    }

    fn default_severity(&self) -> crate::violation::Severity {
        crate::violation::Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let Some(attr_specs) = attr_specs_of(spec, el) else {
                continue;
            };

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };
                // TS `attr.valueNode`: an attribute written without a value names no target
                if html_attr.value.raw.is_empty() && html_attr.equal.raw.is_empty() {
                    continue;
                }
                // TS `attr.isDynamicValue`: a value that is not known names no target
                if html_attr.is_dynamic_value == Some(true) {
                    continue;
                }
                let Some(attr_spec) = find_attr_spec(&attr_specs, el, html_attr) else {
                    continue;
                };
                let with_keyword = match attr_spec.attr_type.as_str() {
                    Some("NavigableTargetNameOrKeyword") => true,
                    Some("NavigableTargetName") => false,
                    _ => continue,
                };

                let value = markuplint_dom::helpers::attr_value(html_attr).trim();
                if value.starts_with('_') {
                    continue;
                }
                let with_underscore = format!("_{value}");
                if !is_navigable_keyword(&with_underscore) {
                    continue;
                }
                // As TS `t("a {0}", ...)` writes it (no "an").
                let message = if with_keyword {
                    format!("Don't use a ambiguous navigable target name. Did you mean \"{with_underscore}\"?")
                } else {
                    "Don't use a ambiguous navigable target name".to_string()
                };
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message,
                    line: html_attr.value.line,
                    col: html_attr.value.col,
                    raw: html_attr.value.raw.clone(),
                    reason: rule_config.reason.clone(),
                    fix: None,
                });
            }
        }

        violations
    }
}

/// The keywords of a valid navigable target name or keyword, which are ASCII case-insensitive.
fn is_navigable_keyword(value: &str) -> bool {
    ["_self", "_blank", "_parent", "_top"]
        .iter()
        .any(|keyword| keyword.eq_ignore_ascii_case(value))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::rules::no_duplicate_attr::tests::make_element_with_attrs;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn ambiguous_blank_violation() {
        let arena = make_element_with_attrs("a", &[("target", "blank")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Don't use a ambiguous navigable target name. Did you mean \"_blank\"?"
        );
    }

    #[test]
    fn correct_underscore_blank_no_violation() {
        let arena = make_element_with_attrs("a", &[("target", "_blank")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn ambiguous_self_violation() {
        let arena = make_element_with_attrs("a", &[("target", "self")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Don't use a ambiguous navigable target name. Did you mean \"_self\"?"
        );
    }

    #[test]
    fn custom_target_name_no_violation() {
        let arena = make_element_with_attrs("a", &[("target", "myframe")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn ambiguous_parent_violation() {
        let arena = make_element_with_attrs("a", &[("target", "parent")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Don't use a ambiguous navigable target name. Did you mean \"_parent\"?"
        );
    }

    #[test]
    fn correct_underscore_top_no_violation() {
        let arena = make_element_with_attrs("a", &[("target", "_top")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn ambiguous_top_violation() {
        let arena = make_element_with_attrs("a", &[("target", "top")]);
        let s = spec();
        let rule = NoAmbiguousNavigableTargetNames;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Don't use a ambiguous navigable target name. Did you mean \"_top\"?"
        );
    }
}
