//! `no-boolean-attr-value` rule: a boolean attribute needs no value. Port of
//! `packages/@markuplint/rules/src/no-boolean-attr-value/`.
//!
//! The attribute is looked up in the specs of the element, global ones merged (TS
//! `getAttrSpecs`), by the name the DOM gives it (TS `findAttrSpec`), so `REQUIRED` on an
//! `<input>` is the boolean `required`. What follows the name, from the spaces before `=` to the
//! closing quote, is what is reported and removed.

use markuplint_core::i18n::Primitive as Kw;
use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::attr_name_key::{attr_specs_of, find_attr_spec};
use crate::fix::Fix;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct NoBooleanAttrValue;

impl Rule for NoBooleanAttrValue {
    fn id(&self) -> &'static str {
        "no-boolean-attr-value"
    }

    fn default_severity(&self) -> crate::violation::Severity {
        crate::violation::Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        let tr = config.translator();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let Some(attr_specs) = attr_specs_of(spec, el) else {
                continue;
            };

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                // The value of an expression is not written as the value of an HTML attribute
                if html_attr.is_expression_value == Some(true) {
                    continue;
                }

                let Some(attr_spec) = find_attr_spec(&attr_specs, el, html_attr) else {
                    continue;
                };
                if attr_spec.attr_type.as_str() != Some("Boolean") {
                    continue;
                }

                let extra_raw: String = [
                    &html_attr.spaces_before_equal,
                    &html_attr.equal,
                    &html_attr.spaces_after_equal,
                    &html_attr.start_quote,
                    &html_attr.value,
                    &html_attr.end_quote,
                ]
                .iter()
                .map(|token| token.raw.as_str())
                .collect();
                if extra_raw.is_empty() {
                    continue;
                }

                violations.push(Violation {
                    spec_conformance: None,
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: tr.finish(&format!(
                        "{}{}{}",
                        tr.t(
                            "{0} is {1}",
                            &[
                                Kw::S(&tr.t(
                                    "the \"{0*}\" {1}",
                                    &[Kw::S(markuplint_dom::helpers::attr_name(html_attr)), Kw::S("attribute")]
                                )),
                                Kw::S(&tr.t("a {0}", &[Kw::S("boolean attribute")])),
                            ],
                        ),
                        tr.t(". ", &[]),
                        tr.t("It doesn't need {0}", &[Kw::S(&tr.t("the {0}", &[Kw::S("value")]))]),
                    )),
                    line: html_attr.spaces_before_equal.line,
                    col: html_attr.spaces_before_equal.col,
                    raw: extra_raw,
                    reason: rule_config.reason.clone(),
                    fix: Fix::remove_attr_value(html_attr),
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
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    fn fixed(html: &str) -> String {
        crate::test_util::fixed_code(html, &serde_json::json!({ "rules": { "no-boolean-attr-value": true } }))
    }

    /// TS: `[no-boolean-attr-value-fix-001]` — remove value from boolean attribute
    #[test]
    fn no_boolean_attr_value_fix_001() {
        const _ID: &str = "no-boolean-attr-value-fix-001";
        assert_eq!(
            fixed(r#"<input type="text" required="required" />"#),
            r#"<input type="text" required />"#
        );
    }

    /// TS: `[no-boolean-attr-value-fix-002]` — multiple boolean attributes
    #[test]
    fn no_boolean_attr_value_fix_002() {
        const _ID: &str = "no-boolean-attr-value-fix-002";
        assert_eq!(
            fixed(r#"<input disabled="disabled" required="required" />"#),
            "<input disabled required />"
        );
    }

    /// TS: `[no-boolean-attr-value-fix-003]` — spaces around equals
    #[test]
    fn no_boolean_attr_value_fix_003() {
        const _ID: &str = "no-boolean-attr-value-fix-003";
        assert_eq!(fixed(r#"<input required = "required" />"#), "<input required />");
    }

    /// TS: `[no-boolean-attr-value-fix-004]` — single-quoted value
    #[test]
    fn no_boolean_attr_value_fix_004() {
        const _ID: &str = "no-boolean-attr-value-fix-004";
        assert_eq!(fixed("<input required='required' />"), "<input required />");
    }

    /// TS: `[no-boolean-attr-value-fix-005]` — unquoted value
    /// (`-006` to `-009` are Pug, JSX, Vue and Markdown parser cases, which the Rust engine
    /// does not have.)
    #[test]
    fn no_boolean_attr_value_fix_005() {
        const _ID: &str = "no-boolean-attr-value-fix-005";
        assert_eq!(fixed("<input required=required />"), "<input required />");
    }

    #[test]
    fn v6_no_boolean_attr_value_001() {
        assert_eq!(
            fixed("<p>日本語😀</p><input required=\"\" />"),
            "<p>日本語😀</p><input required />"
        );
    }

    #[test]
    fn boolean_attr_with_value_violation() {
        // "checked" on <input> has type "Boolean" in the spec
        let arena = make_element_with_attrs("input", &[("checked", "checked")]);
        let s = spec();
        let rule = NoBooleanAttrValue;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "The \"checked\" attribute is a boolean attribute. It doesn't need the value"
        );
    }

    #[test]
    fn non_boolean_attr_no_violation() {
        let arena = make_element_with_attrs("input", &[("type", "text")]);
        let s = spec();
        let rule = NoBooleanAttrValue;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn unknown_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("data-foo", "bar")]);
        let s = spec();
        let rule = NoBooleanAttrValue;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
