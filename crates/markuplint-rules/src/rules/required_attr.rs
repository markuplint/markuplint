//! `required-attr` rule: report elements missing required attributes per spec.

use markuplint_core::mlast::{MLASTAttr, NamespaceURI};
use markuplint_dom::arena::DomArena;
use markuplint_selector::matcher;
use markuplint_selector::parser;
use markuplint_types::spec::lookup::get_attr_specs;
use markuplint_types::spec::types::{AttributeCondition, AttributeRequired, MLMLSpec};

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `required-attr` rule.
pub struct RequiredAttr;

impl Rule for RequiredAttr {
    fn id(&self) -> &'static str {
        "required-attr"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            // Skip ghost elements
            if el.is_ghost {
                continue;
            }

            // Check config-defined required attributes first (applies to any namespace)
            let required_from_config = match &rule_config.value {
                serde_json::Value::String(s) if !s.is_empty() => vec![s.clone()],
                serde_json::Value::Array(arr) => arr.iter().filter_map(|v| v.as_str().map(String::from)).collect(),
                _ => vec![],
            };

            for attr_name in &required_from_config {
                let has_attr = el.attributes.iter().any(|attr| {
                    if let MLASTAttr::HTMLAttr(html_attr) = attr {
                        html_attr.node_name.eq_ignore_ascii_case(attr_name)
                    } else {
                        false
                    }
                });

                if !has_attr {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        severity: rule_config.severity.clone(),
                        message: format!(
                            "The \"{}\" element expects the \"{}\" attribute",
                            el.base.node_name, attr_name
                        ),
                        line: el.base.line,
                        col: el.base.col,
                        raw: el.base.raw.clone(),
                    });
                }
            }

            // Read ignoreAttrs option
            let ignore_attrs: Vec<String> = rule_config
                .options
                .get("ignoreAttrs")
                .and_then(serde_json::Value::as_array)
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();

            // Spec-based required attributes: only check XHTML namespace
            if el.namespace != NamespaceURI::XHTML {
                continue;
            }

            let attr_specs = get_attr_specs(spec, &el.base.node_name);

            for (attr_name, attr_spec) in &attr_specs {
                // Skip ignored attributes
                if ignore_attrs.iter().any(|a| a.eq_ignore_ascii_case(attr_name)) {
                    continue;
                }

                let Some(ref required) = attr_spec.required else {
                    continue;
                };

                // Determine if this attribute is required for this element
                let is_required = match required {
                    AttributeRequired::Flag(flag) => {
                        if !flag {
                            continue;
                        }
                        // If there's a condition, check if the element matches it
                        if let Some(ref condition) = attr_spec.condition {
                            condition_matches(condition, arena, node_id, spec)
                        } else {
                            true
                        }
                    }
                    AttributeRequired::Conditional(condition) => {
                        // Required only when the element matches this condition
                        condition_matches(condition, arena, node_id, spec)
                    }
                };

                if !is_required {
                    continue;
                }

                // Check if the element actually has this attribute
                let has_attr = el.attributes.iter().any(|attr| {
                    if let MLASTAttr::HTMLAttr(html_attr) = attr {
                        html_attr.node_name.eq_ignore_ascii_case(attr_name)
                    } else {
                        false
                    }
                });

                if !has_attr {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        severity: rule_config.severity.clone(),
                        message: format!(
                            "The \"{}\" element expects the \"{}\" attribute",
                            el.base.node_name, attr_name
                        ),
                        line: el.base.line,
                        col: el.base.col,
                        raw: el.base.raw.clone(),
                    });
                }
            }
        }

        violations
    }
}

/// Check if the element matches a condition (CSS selector).
fn condition_matches(condition: &AttributeCondition, arena: &DomArena, node_id: usize, spec: &MLMLSpec) -> bool {
    let selectors = match condition {
        AttributeCondition::Single(s) => vec![s.as_str()],
        AttributeCondition::Multiple(v) => v.iter().map(String::as_str).collect(),
    };

    selectors.iter().any(|sel_str| {
        let Ok(sel) = parser::parse(sel_str) else {
            return false;
        };
        matcher::matches(&sel, arena, node_id, Some(node_id), Some(spec), None)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::rules::attr_duplication::tests::make_element_with_attrs;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn optgroup_requires_label() {
        // <optgroup> always requires "label"
        let arena = make_element_with_attrs("optgroup", &[]);
        let s = spec();
        let rule = RequiredAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.iter().any(|v| v.message.contains("\"label\"")),
            "Expected violation for missing label attribute on optgroup, got: {violations:?}"
        );
    }

    #[test]
    fn optgroup_with_label_no_violation() {
        let arena = make_element_with_attrs("optgroup", &[("label", "Group 1")]);
        let s = spec();
        let rule = RequiredAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty(), "Expected no violations, got: {violations:?}");
    }

    #[test]
    fn track_requires_src() {
        // <track> always requires "src"
        let arena = make_element_with_attrs("track", &[]);
        let s = spec();
        let rule = RequiredAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.iter().any(|v| v.message.contains("\"src\"")),
            "Expected violation for missing src attribute on track, got: {violations:?}"
        );
    }

    #[test]
    fn img_with_src_no_violation() {
        // <img src="photo.jpg" alt="A photo"> → no violation (src and alt present)
        let arena = make_element_with_attrs("img", &[("src", "photo.jpg"), ("alt", "A photo")]);
        let s = spec();
        let rule = RequiredAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.is_empty(),
            "Expected no violations for img with src and alt, got: {violations:?}"
        );
    }

    #[test]
    fn ignore_attrs_option() {
        // <optgroup> requires "label", but ignoreAttrs: ["label"] should skip it
        let arena = make_element_with_attrs("optgroup", &[]);
        let s = spec();
        let rule = RequiredAttr;
        let config = RuleConfig {
            options: serde_json::json!({ "ignoreAttrs": ["label"] }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let label_violations: Vec<_> = violations.iter().filter(|v| v.message.contains("\"label\"")).collect();
        assert!(
            label_violations.is_empty(),
            "ignoreAttrs should skip 'label' check, got: {label_violations:?}"
        );
    }

    #[test]
    fn img_without_alt_no_violation() {
        // <img src="photo.jpg"> → no violation in the spec data
        // Note: alt on <img> is NOT marked as "required" in the HTML spec JSON;
        // the TS version handles this via a separate `required-element` or
        // accessibility rule. This test documents the current Rust behavior.
        let arena = make_element_with_attrs("img", &[("src", "photo.jpg")]);
        let s = spec();
        let rule = RequiredAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.is_empty(),
            "alt on img is not marked as required in the spec data, got: {violations:?}"
        );
    }
}
