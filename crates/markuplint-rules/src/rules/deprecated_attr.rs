//! `deprecated-attr` rule: report deprecated or obsolete attributes.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::lookup::get_attr_specs;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfig};
use crate::violation::Violation;

/// The `deprecated-attr` rule.
pub struct DeprecatedAttr;

impl Rule for DeprecatedAttr {
    fn id(&self) -> &'static str {
        "deprecated-attr"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (_node_id, el) in arena.elements() {
            let attr_specs = get_attr_specs(spec, &el.base.node_name);

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                let attr_name_lower = html_attr.node_name.to_ascii_lowercase();
                let Some(attr_spec) = attr_specs.get(attr_name_lower.as_str()) else {
                    continue;
                };

                if attr_spec.deprecated == Some(true) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        severity: config.severity.clone(),
                        message: format!(
                            "The \"{}\" attribute is deprecated",
                            html_attr.node_name
                        ),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.raw.clone(),
                    });
                } else if attr_spec.obsolete == Some(true) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        severity: config.severity.clone(),
                        message: format!(
                            "The \"{}\" attribute is obsolete",
                            html_attr.node_name
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
    fn normal_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = DeprecatedAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }

    #[test]
    fn unknown_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("data-x", "y")]);
        let s = spec();
        let rule = DeprecatedAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }

    #[test]
    fn normal_element_with_standard_attr_no_violation() {
        // <input type="text"> — "type" on <input> is a standard, non-deprecated attribute
        let arena = make_element_with_attrs("input", &[("type", "text")]);
        let s = spec();
        let rule = DeprecatedAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }

    #[test]
    fn deprecated_charset_on_link() {
        // "charset" on <link> is deprecated (and obsolete) in the html-spec
        // deprecated is checked first, so message says "deprecated"
        let arena = make_element_with_attrs("link", &[("charset", "utf-8")]);
        let s = spec();
        let rule = DeprecatedAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "The \"charset\" attribute is deprecated"
        );
    }
}
