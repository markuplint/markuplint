//! `case-sensitive-attr-name` rule: attribute names must be lowercase (or uppercase per config).

use markuplint_core::mlast::{MLASTAttr, NamespaceURI};
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::lookup::get_attr_specs;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfig};
use crate::violation::Violation;

/// The `case-sensitive-attr-name` rule.
pub struct CaseSensitiveAttrName;

impl Rule for CaseSensitiveAttrName {
    fn id(&self) -> &'static str {
        "case-sensitive-attr-name"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation> {
        let case = config.value.as_str().unwrap_or("lower");
        let mut violations = Vec::new();

        for (_node_id, el) in arena.elements() {
            // Only check HTML namespace elements
            if el.namespace != NamespaceURI::XHTML {
                continue;
            }

            let attr_specs = get_attr_specs(spec, &el.base.node_name);

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                // If the spec says this attribute is case-sensitive, skip enforcement
                let attr_name_lower = html_attr.node_name.to_ascii_lowercase();
                if let Some(attr_spec) = attr_specs.get(attr_name_lower.as_str())
                    && attr_spec.case_sensitive == Some(true)
                {
                    continue;
                }

                let is_correct = match case {
                    "upper" => html_attr.node_name == html_attr.node_name.to_ascii_uppercase(),
                    _ => html_attr.node_name == html_attr.node_name.to_ascii_lowercase(),
                };

                if !is_correct {
                    let message = match case {
                        "upper" => "Attribute names must be uppercase".to_string(),
                        _ => "Attribute names must be lowercase".to_string(),
                    };
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        severity: config.severity.clone(),
                        message,
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

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn lowercase_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = CaseSensitiveAttrName;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }

    #[test]
    fn uppercase_attr_violation() {
        let arena = make_element_with_attrs("div", &[("CLASS", "foo")]);
        let s = spec();
        let rule = CaseSensitiveAttrName;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Attribute names must be lowercase");
    }

    #[test]
    fn uppercase_mode_lowercase_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = CaseSensitiveAttrName;
        let config = RuleConfig {
            severity: Severity::Error,
            value: serde_json::json!("upper"),
            options: serde_json::Value::Null,
        };
        let violations = rule.verify(&arena, &s, &config);
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Attribute names must be uppercase");
    }
}
