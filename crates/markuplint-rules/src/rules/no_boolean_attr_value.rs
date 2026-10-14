//! `no-boolean-attr-value` rule: boolean attributes should not have explicit values.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::lookup::{get_attr_specs, get_spec};
use markuplint_types::spec::types::MLMLSpec;

use crate::fix::Fix;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct NoBooleanAttrValue;

impl Rule for NoBooleanAttrValue {
    fn id(&self) -> &'static str {
        "no-boolean-attr-value"
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

                if html_attr.is_dynamic_value == Some(true) {
                    continue;
                }

                let attr_name_lower = html_attr.node_name.to_ascii_lowercase();

                // Element-specific attrs may have the name but no type — fall back to global.
                let is_boolean = match attr_specs.get(attr_name_lower.as_str()) {
                    Some(attr_spec) if attr_spec.attr_type.as_str() == Some("Boolean") => true,
                    Some(attr_spec)
                        if attr_spec.attr_type.is_null() || attr_spec.attr_type == serde_json::Value::default() =>
                    {
                        is_global_boolean_attr(spec, &el.base.node_name, &attr_name_lower)
                    }
                    Some(_) => false,
                    None => is_global_boolean_attr(spec, &el.base.node_name, &attr_name_lower),
                };
                if !is_boolean {
                    continue;
                }

                // An equal sign is reported even with an empty value like `disabled=""`.
                if !html_attr.equal.raw.is_empty() {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: format!(
                            "\"{}\" is a boolean attribute. It doesn't need the value",
                            html_attr.node_name
                        ),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.raw.clone(),
                        reason: None,
                        fix: Fix::remove_attr_value(html_attr),
                    });
                }
            }
        }

        violations
    }
}

fn is_global_boolean_attr(spec: &MLMLSpec, element_name: &str, attr_name: &str) -> bool {
    let Some(el) = get_spec(spec, element_name) else {
        return false;
    };
    for category in el.global_attrs.keys() {
        if category == "#ARIAAttrs" || category == "#GlobalEventAttrs" {
            continue;
        }
        if let Some(attrs_map) = spec.def.global_attrs.get(category)
            && let Some(attr_val) = attrs_map.get(attr_name)
        {
            return attr_val.get("type").and_then(serde_json::Value::as_str) == Some("Boolean");
        }
    }
    false
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
            "\"checked\" is a boolean attribute. It doesn't need the value"
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
