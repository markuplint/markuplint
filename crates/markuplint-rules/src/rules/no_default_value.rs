//! `no-default-value` rule: an attribute set to its default value. Port of
//! `packages/@markuplint/rules/src/no-default-value/`.
//!
//! The attribute is looked up in the specs of the element, global ones merged (TS
//! `getAttrSpecs`), by the name the DOM gives it (TS `findAttrSpec`), and the value and the
//! default value are compared as the spec normalizes them (TS `toNormalizedValue`).

use markuplint_core::i18n::Primitive as Kw;
use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::attr_name_key::{attr_specs_of, find_attr_spec, to_normalized_value};
use crate::fix::Fix;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

pub struct NoDefaultValue;

impl Rule for NoDefaultValue {
    fn id(&self) -> &'static str {
        "no-default-value"
    }

    /// Matches TS `createRule({ defaultSeverity: 'warning' })`.
    fn default_severity(&self) -> Severity {
        Severity::Warning
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
                // The value of an attribute that is not known, or that is not output, is not the
                // default value
                if html_attr.is_dynamic_value == Some(true) || markuplint_dom::helpers::is_absent(html_attr) {
                    continue;
                }
                let Some(attr_spec) = find_attr_spec(&attr_specs, el, html_attr) else {
                    continue;
                };
                let Some(default_value) = attr_spec.default_value.as_deref().filter(|v| !v.is_empty()) else {
                    continue;
                };

                let value = to_normalized_value(markuplint_dom::helpers::attr_value(html_attr), attr_spec);
                if value != to_normalized_value(default_value, attr_spec) {
                    continue;
                }
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: tr.finish(&tr.t("It is {0}", &[Kw::S(&tr.t("the {0}", &[Kw::S("default value")]))])),
                    line: html_attr.value.line,
                    col: html_attr.value.col,
                    raw: html_attr.value.raw.clone(),
                    reason: rule_config.reason.clone(),
                    fix: Fix::remove_attr(html_attr),
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
    use crate::test_util::brief;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    fn fixed(html: &str) -> String {
        crate::test_util::fixed_code(html, &serde_json::json!({ "rules": { "no-default-value": true } }))
    }

    /// TS: `[no-default-value-fix-001]` — remove default value attribute
    /// (`no-default-value-fix-002` is a Pug parser case, which the Rust engine does not have.)
    #[test]
    fn no_default_value_fix_001() {
        const _ID: &str = "no-default-value-fix-001";
        assert_eq!(
            fixed(r#"<canvas width="300" height="150"></canvas>"#),
            "<canvas></canvas>"
        );
    }

    #[test]
    fn v6_no_default_value_001() {
        assert_eq!(
            fixed("<p>日本語😀</p><input\ttype = 'text' name=a>"),
            "<p>日本語😀</p><input name=a>"
        );
    }

    /// TS: `[no-default-value-invalid-001]` — a violation points at the value, not the attribute
    #[test]
    fn no_default_value_invalid_001() {
        const _ID: &str = "no-default-value-invalid-001";
        assert_eq!(
            crate::test_util::lint_brief(
                "no-default-value",
                r#"<canvas width="300" height="150"></canvas>"#,
                serde_json::json!({ "rules": { "no-default-value": true } }),
            ),
            vec![
                brief(Severity::Warning, 1, 16, "It is the default value", "300"),
                brief(Severity::Warning, 1, 29, "It is the default value", "150"),
            ]
        );
    }

    /// TS: `[no-default-value-valid-001]` — `hidden` has no default value to be reported
    #[test]
    fn no_default_value_valid_001() {
        const _ID: &str = "no-default-value-valid-001";
        for html in [
            "<div hidden></div>",
            r#"<div hidden=""></div>"#,
            r#"<div hidden="hidden"></div>"#,
            r#"<div hidden="until-found"></div>"#,
        ] {
            assert_eq!(
                crate::test_util::lint_brief(
                    "no-default-value",
                    html,
                    serde_json::json!({ "rules": { "no-default-value": true } }),
                ),
                vec![],
                "{html}"
            );
        }
    }

    #[test]
    fn v6_no_default_value_002() {
        // The value is what the violation points at whatever the quote around it is.
        assert_eq!(
            crate::test_util::lint_brief(
                "no-default-value",
                "<input type='text'>\n<input type=text>",
                serde_json::json!({ "rules": { "no-default-value": true } }),
            ),
            vec![
                brief(Severity::Warning, 1, 14, "It is the default value", "text"),
                brief(Severity::Warning, 2, 13, "It is the default value", "text"),
            ]
        );
    }

    #[test]
    fn default_value_violation() {
        // <input> has type attribute with default "text"
        let arena = make_element_with_attrs("input", &[("type", "text")]);
        let s = spec();
        let rule = NoDefaultValue;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "It is the default value");
    }

    #[test]
    fn non_default_value_no_violation() {
        let arena = make_element_with_attrs("input", &[("type", "password")]);
        let s = spec();
        let rule = NoDefaultValue;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn no_default_in_spec_no_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = NoDefaultValue;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn non_matching_value_no_violation() {
        // <input type="email"> — default for type is "text", "email" is not the default
        let arena = make_element_with_attrs("input", &[("type", "email")]);
        let s = spec();
        let rule = NoDefaultValue;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
