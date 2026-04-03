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

    #[allow(clippy::too_many_lines)]
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
            // Supports both string format ("title") and object format ({ "name": "title" })
            let required_from_config = match &rule_config.value {
                serde_json::Value::String(s) if !s.is_empty() => vec![s.clone()],
                serde_json::Value::Array(arr) => arr
                    .iter()
                    .filter_map(|v| match v {
                        serde_json::Value::String(s) => Some(s.clone()),
                        serde_json::Value::Object(obj) => {
                            obj.get("name").and_then(serde_json::Value::as_str).map(String::from)
                        }
                        _ => None,
                    })
                    .collect(),
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
                        name: None,
                        severity: rule_config.severity,
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

            // Track requiredEither groups already checked to avoid duplicates
            // (e.g., src→["srcset"] and srcset→["src"] are the same group)
            let mut checked_either_groups: Vec<Vec<String>> = Vec::new();

            for (attr_name, attr_spec) in &attr_specs {
                // Skip ignored attributes
                if ignore_attrs.iter().any(|a| a.eq_ignore_ascii_case(attr_name)) {
                    continue;
                }

                // requiredEither: at least one of the candidates must be present
                // Check this BEFORE the required flag, since requiredEither can exist
                // without required (e.g., img[src] has requiredEither: ["srcset"]).
                if let Some(ref either) = attr_spec.required_either {
                    let mut candidates = vec![attr_name.to_string()];
                    candidates.extend(either.iter().cloned());
                    // Deduplicate: skip if this group was already checked
                    // Use case-insensitive sort to match the case-insensitive attr matching
                    let mut sorted = candidates.clone();
                    sorted.sort_by_cached_key(|s| s.to_ascii_lowercase());
                    if checked_either_groups.contains(&sorted) {
                        continue;
                    }
                    checked_either_groups.push(sorted);
                    let active: Vec<&str> = candidates
                        .iter()
                        .filter(|n| !ignore_attrs.iter().any(|a| a.eq_ignore_ascii_case(n)))
                        .map(String::as_str)
                        .collect();
                    let has_any = active.iter().any(|name| {
                        el.attributes.iter().any(|attr| {
                            if let MLASTAttr::HTMLAttr(html_attr) = attr {
                                html_attr.node_name.eq_ignore_ascii_case(name)
                            } else {
                                false
                            }
                        })
                    });
                    if !has_any && !active.is_empty() {
                        let expects = if active.len() == 1 {
                            format!("the \"{}\" attribute", active[0])
                        } else {
                            let parts: Vec<String> = active.iter().map(|n| format!("\"{n}\"")).collect();
                            format!("{} attribute", parts.join(" or "))
                        };
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            name: None,
                            severity: rule_config.severity,
                            message: format!("The \"{}\" element expects {}", el.base.node_name, expects),
                            line: el.base.line,
                            col: el.base.col,
                            raw: el.base.raw.clone(),
                        });
                    }
                    continue;
                }

                // Check required flag
                let Some(ref required) = attr_spec.required else {
                    continue;
                };
                let is_required = match required {
                    AttributeRequired::Flag(flag) => {
                        if !flag {
                            continue;
                        }
                        if let Some(ref condition) = attr_spec.condition {
                            condition_matches(condition, arena, node_id, spec)
                        } else {
                            true
                        }
                    }
                    AttributeRequired::Conditional(condition) => condition_matches(condition, arena, node_id, spec),
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
                        name: None,
                        severity: rule_config.severity,
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
    fn object_format_config_requires_attribute() {
        // Config value array with object format: [{ "name": "title" }]
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = RequiredAttr;
        let config = RuleConfig {
            value: serde_json::json!([{ "name": "title" }]),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(
            violations.iter().any(|v| v.message.contains("\"title\"")),
            "Expected violation for missing title attribute from object-format config, got: {violations:?}"
        );
    }

    #[test]
    fn object_format_config_no_violation_when_present() {
        // Config with object format, attribute is present → no violation
        let arena = make_element_with_attrs("div", &[("title", "Hello")]);
        let s = spec();
        let rule = RequiredAttr;
        let config = RuleConfig {
            value: serde_json::json!([{ "name": "title" }]),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let title_violations: Vec<_> = violations.iter().filter(|v| v.message.contains("\"title\"")).collect();
        assert!(
            title_violations.is_empty(),
            "Expected no title violation when attribute is present, got: {title_violations:?}"
        );
    }

    #[test]
    fn required_either_img_without_src_or_srcset() {
        // <img> without src or srcset should produce a requiredEither violation
        // (img spec has requiredEither: ["srcset"] on src, and vice versa)
        let arena = make_element_with_attrs("img", &[("alt", "A photo")]);
        let s = spec();
        let rule = RequiredAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations
                .iter()
                .any(|v| v.message.contains("\"src\"") || v.message.contains("\"srcset\"")),
            "Expected requiredEither violation for missing src/srcset on img, got: {violations:?}"
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
