//! `disallowed-element` rule: report elements matching configured CSS selectors.

use markuplint_dom::arena::DomArena;
use markuplint_selector::matcher;
use markuplint_selector::parser;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `disallowed-element` rule.
pub struct DisallowedElement;

impl Rule for DisallowedElement {
    fn id(&self) -> &'static str {
        "disallowed-element"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        // Config value: string[] of CSS selectors
        let selectors: Vec<String> = match &config.global().value {
            serde_json::Value::Array(arr) => arr.iter().filter_map(|v| v.as_str().map(String::from)).collect(),
            serde_json::Value::String(s) => vec![s.clone()],
            _ => return vec![],
        };

        if selectors.is_empty() {
            return vec![];
        }

        // Pre-parse selectors
        let parsed: Vec<_> = selectors
            .iter()
            .filter_map(|s| parser::parse(s).ok().map(|sel| (s.clone(), sel)))
            .collect();

        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            for (selector_str, sel) in &parsed {
                if matcher::matches(sel, arena, node_id, Some(node_id), Some(spec), None) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity.clone(),
                        message: format!("\"{selector_str}\" is disallowed"),
                        line: el.base.line,
                        col: el.base.col,
                        raw: el.base.raw.clone(),
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
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::rules::attr_duplication::tests::make_element_with_attrs;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn no_match_no_violation() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = DisallowedElement;
        let config = RuleConfig {
            value: serde_json::json!(["span"]),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty());
    }

    #[test]
    fn matching_element_reported() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = DisallowedElement;
        let config = RuleConfig {
            value: serde_json::json!(["div"]),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "\"div\" is disallowed");
    }

    #[test]
    fn no_config_no_violation() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = DisallowedElement;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
