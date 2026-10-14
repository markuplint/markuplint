//! `no-event-handler-attr` rule: disallow inline event handler attributes.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::helpers::pattern_match;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct NoEventHandlerAttr;

impl Rule for NoEventHandlerAttr {
    fn id(&self) -> &'static str {
        "no-event-handler-attr"
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
            // TS `attr.ownerElement.elementType !== 'html'`, as written (a pretender does not change it).
            if *el.identity(true).element_type != markuplint_core::mlast::ElementType::Html {
                continue;
            }
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                // Framework directives that resolve to an `onXxx` name (Vue `@click`, Alpine
                // `x-on:click`, htmx `hx-on:click`, Svelte `on:click`) never reach the DOM as a
                // literal inline-handler attribute.
                if html_attr.is_directive == Some(true) {
                    continue;
                }

                if html_attr.node_name.len() <= 2 || !html_attr.node_name[..2].eq_ignore_ascii_case("on") {
                    continue;
                }

                // The ignore list matches the full attribute name, not the bare event name.
                if ignore_list
                    .iter()
                    .any(|pattern| pattern_match(&html_attr.node_name, pattern))
                {
                    continue;
                }

                let event_name = html_attr.node_name[2..].to_ascii_lowercase();

                if let Some(ref events) = target_events {
                    let matched = events.iter().any(|pattern| {
                        // Event names support regex patterns.
                        pattern_match(&event_name, pattern)
                    });
                    if !matched {
                        continue;
                    }
                }

                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: format!("The \"{}\" attribute is disallowed", html_attr.node_name),
                    line: html_attr.name.line,
                    col: html_attr.name.col,
                    raw: html_attr.raw.clone(),
                    reason: None,
                    fix: None,
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
    use crate::rules::no_duplicate_attr::tests::make_element_with_attrs;
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
        let rule = NoEventHandlerAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "The \"onclick\" attribute is disallowed");
    }

    #[test]
    fn onload_reported() {
        let arena = make_element_with_attrs("body", &[("onload", "init()")]);
        let s = spec();
        let rule = NoEventHandlerAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "The \"onload\" attribute is disallowed");
    }

    #[test]
    fn non_event_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo"), ("id", "bar")]);
        let s = spec();
        let rule = NoEventHandlerAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn disabled_by_config() {
        let arena = make_element_with_attrs("button", &[("onclick", "alert()")]);
        let s = spec();
        let rule = NoEventHandlerAttr;
        let config = RuleConfig {
            severity: Severity::Error,
            value: serde_json::Value::Bool(false),
            options: serde_json::Value::Null,
            disabled: false,
            reason: None,
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty());
    }

    #[test]
    fn on_attribute_alone_not_event_handler() {
        let arena = make_element_with_attrs("div", &[("on", "value")]);
        let s = spec();
        let rule = NoEventHandlerAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn disabled_by_false_value() {
        let arena = make_element_with_attrs("button", &[("onclick", "doSomething()")]);
        let s = spec();
        let rule = NoEventHandlerAttr;
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
        let rule = NoEventHandlerAttr;
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
        let rule = NoEventHandlerAttr;
        let config = RuleConfig {
            options: serde_json::json!({ "ignore": ["onclick"] }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations.len(), 1);
        assert!(violations[0].message.contains("onload"));
    }

    /// Rust-only: a framework directive that resolves to an `onXxx` name (Vue `@click`, Svelte
    /// `on:click`) never reaches the DOM as an inline handler, and an element that is not an HTML
    /// element is not checked, as in TS.
    #[test]
    fn v6_directives_and_authored_elements_are_not_checked() {
        let run_mlast = |element_type: &str, resolved: serde_json::Value| {
            let json = crate::test_util::mlast_element_of_type(
                "button",
                element_type,
                &[("on:click", "go", resolved)],
                &serde_json::json!({}),
            );
            crate::test_util::lint_mlast_brief(
                "no-event-handler-attr",
                &json,
                serde_json::json!({ "rules": { "no-event-handler-attr": true } }),
            )
        };
        let directive = serde_json::json!({ "potentialName": "onclick", "isDirective": true });
        let resolved = serde_json::json!({ "potentialName": "onclick" });
        assert_eq!(run_mlast("html", directive.clone()), []);
        assert_eq!(run_mlast("authored", resolved.clone()), []);
        let v = run_mlast("html", resolved);
        assert_eq!(v.len(), 1);
        assert_eq!(v[0].3, "The \"onclick\" attribute is disallowed");
    }
}
