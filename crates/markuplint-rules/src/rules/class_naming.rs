//! `class-naming` rule: validate class names against configured regex patterns.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;
use regex::Regex;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `class-naming` rule.
pub struct ClassNaming;

impl Rule for ClassNaming {
    fn id(&self) -> &'static str {
        "class-naming"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }

            // Parse pattern(s) from config value
            let pattern_strs: Vec<String> = match &rule_config.value {
                serde_json::Value::String(s) if !s.is_empty() => vec![s.clone()],
                serde_json::Value::Array(arr) => arr.iter().filter_map(|v| v.as_str().map(String::from)).collect(),
                _ => continue, // null, empty, or non-string → skip this node
            };

            if pattern_strs.is_empty() {
                continue;
            }

            // Compile all patterns
            let regexes: Vec<(String, Regex)> = pattern_strs
                .iter()
                .filter_map(|ps| {
                    let regex_str = strip_regex_delimiters(ps);
                    Regex::new(&regex_str).ok().map(|re| (ps.clone(), re))
                })
                .collect();

            if regexes.is_empty() {
                continue;
            }

            let display_pattern = pattern_strs.join(", ");

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                if !html_attr.node_name.eq_ignore_ascii_case("class") {
                    continue;
                }

                let value = &html_attr.value.raw;
                for class_name in value.split_whitespace() {
                    // Class must match at least one pattern
                    let matches_any = regexes.iter().any(|(_, re)| re.is_match(class_name));
                    if !matches_any {
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            name: None,
                            severity: rule_config.severity.clone(),
                            message: format!("\"{class_name}\" is unmatched with the pattern: {display_pattern}"),
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

/// Strip regex delimiters /pattern/flags and return the inner pattern.
fn strip_regex_delimiters(pattern: &str) -> String {
    if let Some(rest) = pattern.strip_prefix('/') {
        if let Some(last_slash) = rest.rfind('/') {
            rest[..last_slash].to_string()
        } else {
            pattern.to_string()
        }
    } else {
        pattern.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::rules::attr_duplication::tests::make_element_with_attrs;
    use markuplint_types::spec::load_spec;
    use markuplint_types::spec::types::MLMLSpec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
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
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
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
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
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
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
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
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty());
    }
}
