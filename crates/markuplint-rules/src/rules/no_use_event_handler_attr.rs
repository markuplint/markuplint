//! `no-use-event-handler-attr` rule: disallow inline event handler attributes.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::helpers::pattern_match;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `no-use-event-handler-attr` rule.
pub struct NoUseEventHandlerAttr;

impl Rule for NoUseEventHandlerAttr {
    fn id(&self) -> &'static str {
        "no-use-event-handler-attr"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let global = config.global();

        // Config value: boolean (default true). If false, rule is disabled.
        if global.value == serde_json::Value::Bool(false) {
            return vec![];
        }

        // If value is an array of event names, only those events are disallowed
        let target_events: Option<Vec<String>> = match &global.value {
            serde_json::Value::Array(arr) => {
                Some(arr.iter().filter_map(|v| v.as_str().map(str::to_lowercase)).collect())
            }
            _ => None,
        };

        // Read ignore list from options
        let ignore_list: Vec<String> = match global.options.get("ignore") {
            Some(serde_json::Value::Array(arr)) => arr.iter().filter_map(|v| v.as_str().map(String::from)).collect(),
            Some(serde_json::Value::String(s)) => vec![s.clone()],
            _ => vec![],
        };

        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                if html_attr.node_name.len() <= 2 || !html_attr.node_name[..2].eq_ignore_ascii_case("on") {
                    continue;
                }

                // Check ignore list (matches full attribute name)
                if ignore_list
                    .iter()
                    .any(|pattern| pattern_match(&html_attr.node_name, pattern))
                {
                    continue;
                }

                // Extract event name (strip "on" prefix)
                let event_name = html_attr.node_name[2..].to_ascii_lowercase();

                // If value is an array, only report if the event is in the list
                if let Some(ref events) = target_events {
                    let matched = events.iter().any(|pattern| {
                        // Support regex patterns for event names
                        pattern_match(&event_name, pattern)
                    });
                    if !matched {
                        continue;
                    }
                }

                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity.clone(),
                    message: format!("The \"{}\" attribute is disallowed", html_attr.node_name),
                    line: html_attr.name.line,
                    col: html_attr.name.col,
                    raw: html_attr.raw.clone(),
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
    use crate::violation::Severity;
    use markuplint_types::spec::load_spec;
    use markuplint_types::spec::types::MLMLSpec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn onclick_reported() {
        let arena = make_element_with_attrs("button", &[("onclick", "alert()")]);
        let s = spec();
        let rule = NoUseEventHandlerAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "The \"onclick\" attribute is disallowed");
    }

    #[test]
    fn onload_reported() {
        let arena = make_element_with_attrs("body", &[("onload", "init()")]);
        let s = spec();
        let rule = NoUseEventHandlerAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "The \"onload\" attribute is disallowed");
    }

    #[test]
    fn non_event_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo"), ("id", "bar")]);
        let s = spec();
        let rule = NoUseEventHandlerAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn disabled_by_config() {
        let arena = make_element_with_attrs("button", &[("onclick", "alert()")]);
        let s = spec();
        let rule = NoUseEventHandlerAttr;
        let config = RuleConfig {
            severity: Severity::Error,
            value: serde_json::Value::Bool(false),
            options: serde_json::Value::Null,
            disabled: false,
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty());
    }

    #[test]
    fn on_attribute_alone_not_event_handler() {
        let arena = make_element_with_attrs("div", &[("on", "value")]);
        let s = spec();
        let rule = NoUseEventHandlerAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn disabled_by_false_value() {
        let arena = make_element_with_attrs("button", &[("onclick", "doSomething()")]);
        let s = spec();
        let rule = NoUseEventHandlerAttr;
        let config = RuleConfig {
            value: serde_json::Value::Bool(false),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty());
    }

    #[test]
    fn value_array_only_specified_events() {
        // value: ["click"] → only onclick is disallowed
        let arena = make_element_with_attrs("button", &[("onclick", "x()"), ("onload", "y()")]);
        let s = spec();
        let rule = NoUseEventHandlerAttr;
        let config = RuleConfig {
            value: serde_json::json!(["click"]),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations.len(), 1);
        assert!(violations[0].message.contains("onclick"));
    }

    #[test]
    fn ignore_option_skips_attr() {
        let arena = make_element_with_attrs("div", &[("onclick", "x()"), ("onload", "y()")]);
        let s = spec();
        let rule = NoUseEventHandlerAttr;
        let config = RuleConfig {
            options: serde_json::json!({ "ignore": ["onclick"] }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations.len(), 1);
        assert!(violations[0].message.contains("onload"));
    }
}
