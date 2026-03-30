//! `no-use-event-handler-attr` rule: disallow inline event handler attributes.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfig};
use crate::violation::Violation;

/// The `no-use-event-handler-attr` rule.
pub struct NoUseEventHandlerAttr;

impl Rule for NoUseEventHandlerAttr {
    fn id(&self) -> &'static str {
        "no-use-event-handler-attr"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation> {
        // Config value: boolean (default true). If false, rule is disabled.
        if config.value == serde_json::Value::Bool(false) {
            return vec![];
        }

        let mut violations = Vec::new();

        for (_node_id, el) in arena.elements() {
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                if html_attr.node_name.len() > 2 && html_attr.node_name[..2].eq_ignore_ascii_case("on") {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        severity: config.severity.clone(),
                        message: format!("The \"{}\" attribute is disallowed", html_attr.node_name),
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
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "The \"onclick\" attribute is disallowed");
    }

    #[test]
    fn onload_reported() {
        let arena = make_element_with_attrs("body", &[("onload", "init()")]);
        let s = spec();
        let rule = NoUseEventHandlerAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "The \"onload\" attribute is disallowed");
    }

    #[test]
    fn non_event_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo"), ("id", "bar")]);
        let s = spec();
        let rule = NoUseEventHandlerAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
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
        };
        let violations = rule.verify(&arena, &s, &config);
        assert!(violations.is_empty());
    }

    #[test]
    fn on_attribute_alone_not_event_handler() {
        let arena = make_element_with_attrs("div", &[("on", "value")]);
        let s = spec();
        let rule = NoUseEventHandlerAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
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
        let violations = rule.verify(&arena, &s, &config);
        assert!(violations.is_empty());
    }
}
