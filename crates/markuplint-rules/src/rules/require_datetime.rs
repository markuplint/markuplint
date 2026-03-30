//! `require-datetime` rule: `<time>` elements must have a `datetime` attribute.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfig};
use crate::violation::Violation;

/// The `require-datetime` rule.
pub struct RequireDatetime;

impl Rule for RequireDatetime {
    fn id(&self) -> &'static str {
        "require-datetime"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (_node_id, el) in arena.elements() {
            if !el.base.node_name.eq_ignore_ascii_case("time") {
                continue;
            }

            let has_datetime = el.attributes.iter().any(|attr| {
                if let MLASTAttr::HTMLAttr(html_attr) = attr {
                    html_attr.node_name.eq_ignore_ascii_case("datetime")
                } else {
                    false
                }
            });

            if !has_datetime {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    severity: config.severity.clone(),
                    message: "Need the datetime attribute".to_string(),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                });
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
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn time_with_datetime_no_violation() {
        let arena = make_element_with_attrs("time", &[("datetime", "2024-01-01")]);
        let s = spec();
        let rule = RequireDatetime;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }

    #[test]
    fn time_without_datetime_reported() {
        let arena = make_element_with_attrs("time", &[]);
        let s = spec();
        let rule = RequireDatetime;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Need the datetime attribute");
    }

    #[test]
    fn non_time_element_no_violation() {
        let arena = make_element_with_attrs("span", &[]);
        let s = spec();
        let rule = RequireDatetime;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }
}
