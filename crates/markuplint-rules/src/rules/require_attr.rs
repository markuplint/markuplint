//! `require-attr` rule: report elements missing required attributes per spec.
//!
//! Ports `packages/@markuplint/rules/src/require-attr/`. The requirements are the spec's
//! (`required`, `requiredEither`) for an element written as an HTML element, and those of the
//! rule's value for any element; a name of the rule value that the spec table names too is one
//! requirement, and the rule value's is the one that counts. Names are compared as TS
//! `Element#isSameAttrName` compares them.

use markuplint_core::mlast::{AttrNameRoute, ElementType, NamespaceURI};
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::{camelize, get_attr_value_from_el, get_html_attr_from_el};
use markuplint_dom::node::ElementData;
use markuplint_selector::matcher;
use markuplint_types::spec::types::{AttributeCondition, AttributeRequired, MLMLSpec};

use crate::aria_check::element_local_name;
use crate::attr_name_key::attr_specs_of;
use crate::create_message::Kw;
use crate::diagnostic;
use crate::helpers::pattern_match;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;
use markuplint_core::i18n::Translator;

pub struct RequireAttr;

/// One requirement: the spec's, or one of the rule value.
struct Requirement {
    name: String,
    required: Option<AttributeRequired>,
    required_either: Option<Vec<String>>,
    condition: Option<AttributeCondition>,
    values: Vec<String>,
}

/// TS `Element#isSameAttrName`: whether two names of an option or a spec name one attribute of
/// `el` as the DOM names it.
fn is_same_attr_name(arena: &DomArena, el: &ElementData, a: &str, b: &str) -> bool {
    if a == b {
        return true;
    }
    let settings = arena.settings();
    if el.element_type == ElementType::Authored {
        return settings.component_name_variants && camelize(a) == camelize(b);
    }
    if settings.attr_name_route == AttrNameRoute::DomApi
        && (el.namespace != NamespaceURI::XHTML || a.bytes().chain(b.bytes()).any(|c| c.is_ascii_uppercase()))
    {
        return false;
    }
    a.eq_ignore_ascii_case(b)
}

/// `{0} expects {1}` with the candidates the element is expected to have.
fn expects_message(tr: Translator<'_>, el_name: &str, candidates: &[&str], single_name: &str) -> String {
    let expects = if candidates.len() == 1 {
        tr.t("the \"{0*}\" {1}", &[Kw::S(single_name), Kw::S("attribute")])
    } else {
        let joined = candidates
            .iter()
            .map(|name| tr.t("the \"{0*}\"", &[Kw::S(name)]))
            .reduce(|a, b| tr.t("{0} or {1}", &[Kw::S(&a), Kw::S(&b)]))
            .unwrap_or_default();
        tr.t("{0} {1}", &[Kw::S(&joined), Kw::S("attribute")])
    };
    tr.finish(&tr.t(
        "{0} expects {1}",
        &[
            Kw::S(&tr.t("the \"{0*}\" {1}", &[Kw::S(el_name), Kw::S("element")])),
            Kw::S(&expects),
        ],
    ))
}

/// The requirements of the rule's value: a name, or `{ name, value }` with the values (patterns)
/// the attribute is expected to have.
fn custom_requirements(value: &serde_json::Value) -> Vec<(String, Vec<String>)> {
    match value {
        serde_json::Value::String(s) => vec![(s.clone(), Vec::new())],
        serde_json::Value::Array(arr) => arr
            .iter()
            .filter_map(|v| match v {
                serde_json::Value::String(s) => Some((s.clone(), Vec::new())),
                serde_json::Value::Object(obj) => {
                    let name = obj.get("name").and_then(serde_json::Value::as_str)?.to_owned();
                    let values = match obj.get("value") {
                        Some(serde_json::Value::Array(values)) => {
                            values.iter().filter_map(|v| v.as_str().map(String::from)).collect()
                        }
                        Some(serde_json::Value::String(value)) if !value.is_empty() => vec![value.clone()],
                        _ => Vec::new(),
                    };
                    Some((name, values))
                }
                _ => None,
            })
            .collect(),
        _ => Vec::new(),
    }
}

impl Rule for RequireAttr {
    fn id(&self) -> &'static str {
        "require-attr"
    }

    #[allow(clippy::too_many_lines)]
    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations: Vec<Violation> = Vec::new();
        let tr = config.translator();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled || rule_config.value == serde_json::Value::Bool(false) || el.is_ghost {
                continue;
            }

            // A spread attribute (`{...props}`) may carry any of them.
            if el.has_spread_attr {
                continue;
            }

            let el_name = element_local_name(el);
            let report = |violations: &mut Vec<Violation>, message: String, line: u32, col: u32, raw: String| {
                let violation = Violation {
                    spec_conformance: None,
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message,
                    line,
                    col,
                    raw,
                    reason: rule_config.reason.clone(),
                    fix: None,
                };
                // TS reports a violation once however many requirements find it (the `src` and the
                // `srcset` of an `img` are one `requiredEither` group)
                if !violations.iter().any(|v| {
                    v.message == violation.message
                        && v.line == violation.line
                        && v.col == violation.col
                        && v.raw == violation.raw
                }) {
                    violations.push(violation);
                }
            };

            let ignore_attrs: Vec<String> = rule_config
                .options
                .get("ignoreAttrs")
                .and_then(serde_json::Value::as_array)
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();
            let is_ignored = |name: &str| {
                ignore_attrs
                    .iter()
                    .any(|ignored| is_same_attr_name(arena, el, ignored, name))
            };
            let has_attribute = |name: &str| get_attr_value_from_el(el, name).is_some();

            let mut requirements: Vec<Requirement> = Vec::new();

            // The spec's requirements: only for an element written as an HTML element (TS
            // `el.elementType === 'html'`, which a pretender does not change).
            let original = el.identity(true);
            if *original.element_type == ElementType::Html
                && let Some(attr_specs) = attr_specs_of(spec, el)
            {
                for attr_spec in attr_specs.iter() {
                    if attr_spec.required.is_some()
                        || attr_spec.required_either.is_some()
                        || attr_spec.condition.is_some()
                    {
                        requirements.push(Requirement {
                            name: attr_spec.name.clone().unwrap_or_default(),
                            required: attr_spec.required.clone(),
                            required_either: attr_spec.required_either.clone(),
                            condition: attr_spec.condition.clone(),
                            values: Vec::new(),
                        });
                    }
                }
            }

            for (name, values) in custom_requirements(&rule_config.value) {
                // TS deletes the keys that name it and adds it as the last key
                requirements.retain(|r| !is_same_attr_name(arena, el, &r.name, &name));
                requirements.retain(|r| r.name != name);
                requirements.push(Requirement {
                    name,
                    required: Some(AttributeRequired::Flag(true)),
                    required_either: None,
                    condition: None,
                    values,
                });
            }

            for requirement in &requirements {
                if is_ignored(&requirement.name) {
                    if let Some(either) = &requirement.required_either {
                        let mut active: Vec<&str> =
                            either.iter().map(String::as_str).filter(|n| !is_ignored(n)).collect();
                        if !active.is_empty() && !active.iter().any(|n| has_attribute(n)) {
                            active.sort_unstable();
                            let message = expects_message(tr, &el_name, &active, active[0]);
                            report(&mut violations, message, el.base.line, el.base.col, el.base.raw.clone());
                        }
                    }
                    continue;
                }

                let didnt_have = !has_attribute(&requirement.name);
                let mut candidate: Vec<&str> = vec![requirement.name.as_str()];

                let invalid = if let Some(either) = &requirement.required_either {
                    candidate.extend(either.iter().map(String::as_str));
                    !candidate.iter().filter(|n| !is_ignored(n)).any(|n| has_attribute(n))
                } else {
                    match &requirement.required {
                        Some(AttributeRequired::Flag(true)) => {
                            requirement
                                .condition
                                .as_ref()
                                .is_none_or(|c| condition_matches(c, arena, node_id, spec))
                                && didnt_have
                        }
                        Some(AttributeRequired::Conditional(condition)) => {
                            condition_matches(condition, arena, node_id, spec) && didnt_have
                        }
                        _ => false,
                    }
                };

                if invalid {
                    let mut sorted: Vec<&str> = candidate.iter().copied().filter(|n| !is_ignored(n)).collect();
                    sorted.sort_unstable();
                    let message = expects_message(tr, &el_name, &sorted, &requirement.name);
                    report(&mut violations, message, el.base.line, el.base.col, el.base.raw.clone());
                }

                if requirement.values.is_empty() {
                    continue;
                }
                let Some(value) = get_attr_value_from_el(el, &requirement.name).filter(|v| !v.is_empty()) else {
                    continue;
                };
                if requirement.values.iter().any(|pattern| pattern_match(value, pattern)) {
                    continue;
                }
                let values = crate::create_message::no_translate_all(&requirement.values);
                let expects = if values.len() == 1 {
                    tr.t_list(&values, false)
                } else {
                    tr.t("either {0}", &[Kw::S(&tr.t_list(&values, false))])
                };
                let message = tr.finish(&tr.t(
                    "{0} expects {1}",
                    &[
                        Kw::S(&tr.t("the \"{0*}\" {1}", &[Kw::S(&requirement.name), Kw::S("attribute")])),
                        Kw::S(&expects),
                    ],
                ));
                if let Some(attr) = get_html_attr_from_el(el, &requirement.name) {
                    // TS reports the value token, or the attribute when it has none
                    let (line, col, raw) = if attr.value.raw.is_empty() && attr.start_quote.raw.is_empty() {
                        (attr.name.line, attr.name.col, attr.raw.clone())
                    } else {
                        (attr.value.line, attr.value.col, attr.value.raw.clone())
                    };
                    report(&mut violations, message, line, col, raw);
                }
            }
        }

        violations
    }
}

/// TS `attrMatches` / `el.matches(selector)`: the selectors of a condition are OR-ed.
fn condition_matches(condition: &AttributeCondition, arena: &DomArena, node_id: usize, spec: &MLMLSpec) -> bool {
    let selector = match condition {
        AttributeCondition::Single(s) => s.clone(),
        AttributeCondition::Multiple(v) => v.join(","),
    };
    diagnostic::parse_selector("spec attribute condition", &selector)
        .is_some_and(|sel| matcher::matches(&sel, arena, node_id, Some(node_id), Some(spec), None))
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

    #[test]
    fn optgroup_requires_label() {
        // <optgroup> always requires "label"
        let arena = make_element_with_attrs("optgroup", &[]);
        let s = spec();
        let rule = RequireAttr;
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
        let rule = RequireAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty(), "Expected no violations, got: {violations:?}");
    }

    #[test]
    fn track_requires_src() {
        // <track> always requires "src"
        let arena = make_element_with_attrs("track", &[]);
        let s = spec();
        let rule = RequireAttr;
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
        let rule = RequireAttr;
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
        let rule = RequireAttr;
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
        let rule = RequireAttr;
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
        let rule = RequireAttr;
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
        let rule = RequireAttr;
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
        // the TS version handles this via a separate `require-element` or
        // accessibility rule. This test documents the current Rust behavior.
        let arena = make_element_with_attrs("img", &[("src", "photo.jpg")]);
        let s = spec();
        let rule = RequireAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.is_empty(),
            "alt on img is not marked as required in the spec data, got: {violations:?}"
        );
    }

    /// Rust-only: TS checks the spec's required attributes only on an element written as
    /// an HTML element, so a component pretending to be an `img` is not asked for `src`;
    /// the attributes the rule's value requires still apply. Expected values from the TS
    /// rule.
    #[test]
    fn v6_require_attr_pretender_001() {
        let run = |html: &str, value: serde_json::Value, pretenders: serde_json::Value| {
            crate::test_util::lint_brief(
                "require-attr",
                html,
                serde_json::json!({ "rules": { "require-attr": value }, "pretenders": pretenders }),
            )
        };
        let img = serde_json::json!([{ "selector": "x-img", "as": "img" }]);
        assert_eq!(run("<x-img></x-img>", serde_json::json!(true), img.clone()), []);
        assert_eq!(
            run(
                r#"<x-img as="img"></x-img>"#,
                serde_json::json!(true),
                serde_json::json!([])
            ),
            []
        );
        assert_eq!(
            run("<math><x-img></x-img></math>", serde_json::json!(true), img.clone()),
            []
        );
        assert_eq!(
            run("<x-img></x-img>", serde_json::json!("title"), img),
            [crate::test_util::brief(
                crate::violation::Severity::Error,
                1,
                1,
                "The \"img\" element expects the \"title\" attribute",
                "<x-img>"
            )]
        );
    }

    /// Rust-only: an element with a spread attribute (`<img {...props} />`) may get any attribute
    /// from it, so nothing is required of it, as in TS; a bound attribute (`:src`) counts under the
    /// name it resolves to.
    #[test]
    fn v6_spread_and_bound_attributes_satisfy_the_requirement() {
        let run_mlast = |attrs: &[(&str, &str, serde_json::Value)], spread: bool| {
            let mut mlast: serde_json::Value =
                serde_json::from_str(&crate::test_util::mlast_element("img", attrs, &serde_json::json!({}))).unwrap();
            mlast["nodeList"][0]["hasSpreadAttr"] = spread.into();
            crate::test_util::lint_mlast_brief(
                "require-attr",
                &mlast.to_string(),
                serde_json::json!({ "rules": { "require-attr": true } }),
            )
        };
        let alt = || ("alt", "x", serde_json::json!({}));
        assert_eq!(run_mlast(&[alt()], true), []);
        assert_eq!(run_mlast(&[alt()], false).len(), 1);
        let bound = serde_json::json!({ "potentialName": "src", "isDynamicValue": true });
        assert_eq!(run_mlast(&[(":src", "src", bound), alt()], false), []);
    }
}
