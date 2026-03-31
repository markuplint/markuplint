//! `required-element` rule: require descendant elements matching CSS selectors.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_selector::matcher;
use markuplint_selector::parser;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `required-element` rule.
pub struct RequiredElement;

impl Rule for RequiredElement {
    fn id(&self) -> &'static str {
        "required-element"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let config = config.global();
        // Config value: string[] of CSS selectors for required elements
        let selectors: Vec<String> = match &config.value {
            serde_json::Value::Array(arr) => arr.iter().filter_map(|v| v.as_str().map(String::from)).collect(),
            serde_json::Value::String(s) => vec![s.clone()],
            _ => return vec![],
        };

        if selectors.is_empty() {
            return vec![];
        }

        let mut violations = Vec::new();

        for selector_str in &selectors {
            let Ok(sel) = parser::parse(selector_str) else {
                continue;
            };

            // Check if any element in the document matches
            let found = arena
                .elements()
                .any(|(node_id, _el)| matcher::matches(&sel, arena, node_id, Some(node_id), Some(spec), None));

            if !found {
                // Report on document root
                let (line, col, raw) = match arena.document() {
                    Some(DomNode::Document(doc)) => (1u32, 1u32, doc.raw.clone()),
                    _ => (1, 1, String::new()),
                };

                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    severity: config.severity.clone(),
                    message: format!("Require the \"{selector_str}\" element"),
                    line,
                    col,
                    raw,
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
    fn element_present_no_violation() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = RequiredElement;
        let config = RuleConfig {
            value: serde_json::json!(["div"]),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty());
    }

    #[test]
    fn missing_element_reported() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = RequiredElement;
        let config = RuleConfig {
            value: serde_json::json!(["nav"]),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Require the \"nav\" element");
    }

    #[test]
    fn no_config_no_violation() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = RequiredElement;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
