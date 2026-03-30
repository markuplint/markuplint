//! `class-naming` rule: validate class names against configured regex patterns.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;
use regex::Regex;

use crate::rule::{Rule, RuleConfig};
use crate::violation::Violation;

/// The `class-naming` rule.
pub struct ClassNaming;

impl Rule for ClassNaming {
    fn id(&self) -> &'static str {
        "class-naming"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation> {
        let pattern_str = match &config.value {
            serde_json::Value::String(s) if !s.is_empty() => s.clone(),
            _ => return vec![], // null, empty, or non-string → disabled
        };

        let Ok(re) = Regex::new(&pattern_str) else {
            return vec![]; // invalid regex → skip
        };

        let mut violations = Vec::new();

        for (_node_id, el) in arena.elements() {
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                if !html_attr.node_name.eq_ignore_ascii_case("class") {
                    continue;
                }

                let value = &html_attr.value.raw;
                for class_name in value.split_whitespace() {
                    if !re.is_match(class_name) {
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            severity: config.severity.clone(),
                            message: format!(
                                "\"{class_name}\" is unmatched with the pattern: {pattern_str}"
                            ),
                            line: html_attr.name.line,
                            col: html_attr.name.col,
                            raw: html_attr.raw.clone(),
                        });
                    }
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
    use markuplint_types::spec::types::MLMLSpec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!(
            "../../../../packages/@markuplint/html-spec/index.json"
        ))
        .unwrap()
    }

    #[test]
    fn matching_class_no_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo-bar")]);
        let s = spec();
        let rule = ClassNaming;
        let config = RuleConfig {
            value: serde_json::Value::String("^[a-z][a-z0-9-]*$".to_string()),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &config);
        assert!(violations.is_empty());
    }

    #[test]
    fn non_matching_class_reported() {
        let arena = make_element_with_attrs("div", &[("class", "FooBar")]);
        let s = spec();
        let rule = ClassNaming;
        let config = RuleConfig {
            value: serde_json::Value::String("^[a-z][a-z0-9-]*$".to_string()),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &config);
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "\"FooBar\" is unmatched with the pattern: ^[a-z][a-z0-9-]*$"
        );
    }

    #[test]
    fn multiple_classes_mixed() {
        let arena = make_element_with_attrs("div", &[("class", "valid-name InvalidName")]);
        let s = spec();
        let rule = ClassNaming;
        let config = RuleConfig {
            value: serde_json::Value::String("^[a-z][a-z0-9-]*$".to_string()),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &config);
        assert_eq!(violations.len(), 1);
        assert!(violations[0].message.contains("InvalidName"));
    }

    #[test]
    fn null_config_disabled() {
        let arena = make_element_with_attrs("div", &[("class", "anything")]);
        let s = spec();
        let rule = ClassNaming;
        let config = RuleConfig {
            value: serde_json::Value::Null,
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &config);
        assert!(violations.is_empty());
    }
}
