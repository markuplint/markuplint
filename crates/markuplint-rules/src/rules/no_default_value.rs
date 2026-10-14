//! `no-default-value` rule: attributes should not be explicitly set to their default value.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::lookup::{get_attr_specs, get_spec};
use markuplint_types::spec::types::MLMLSpec;

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

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let attr_specs = get_attr_specs(spec, &el.base.node_name);

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                let attr_name_lower = html_attr.node_name.to_ascii_lowercase();

                // Element-specific attrs may have the name but no defaultValue — fall back to global.
                let default_value = match attr_specs.get(attr_name_lower.as_str()) {
                    Some(attr_spec) if attr_spec.default_value.is_some() => attr_spec.default_value.as_deref(),
                    _ => get_global_attr_default(spec, &el.base.node_name, &attr_name_lower),
                };
                let Some(default_value) = default_value else {
                    continue;
                };

                if html_attr.value.raw.eq_ignore_ascii_case(default_value) {
                    // TS points at the value, not at the attribute. A valueless attribute never gets
                    // here: no default value in the spec is the empty string.
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: "It is the default value".to_string(),
                        line: html_attr.value.line,
                        col: html_attr.value.col,
                        raw: html_attr.value.raw.clone(),
                        reason: None,
                        fix: Fix::remove_attr(html_attr),
                    });
                }
            }
        }

        violations
    }
}

fn get_global_attr_default<'a>(spec: &'a MLMLSpec, element_name: &str, attr_name: &str) -> Option<&'a str> {
    let el = get_spec(spec, element_name)?;
    for category in el.global_attrs.keys() {
        if category == "#ARIAAttrs" || category == "#GlobalEventAttrs" {
            continue;
        }
        if let Some(attrs_map) = spec.def.global_attrs.get(category)
            && let Some(attr_val) = attrs_map.get(attr_name)
        {
            return attr_val.get("defaultValue").and_then(serde_json::Value::as_str);
        }
    }
    None
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
