//! `invalid-attr` rule: validate attributes against the HTML spec.
//!
//! Checks:
//! 1. Unknown attribute detection (not in spec, not data-*, not aria-*)
//! 2. Typo suggestion via Levenshtein distance
//! 3. Config-based allow/disallow lists
//! 4. Prefix-based ignore

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::lookup::{get_attr_specs, get_spec};
use markuplint_types::spec::types::MLMLSpec;
use strsim::levenshtein;

use crate::rule::{Rule, RuleConfig};
use crate::violation::Violation;

/// The `invalid-attr` rule.
pub struct InvalidAttr;

/// Maximum Levenshtein distance for typo suggestions.
const MAX_TYPO_DISTANCE: usize = 2;

impl Rule for InvalidAttr {
    fn id(&self) -> &'static str {
        "invalid-attr"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation> {
        if config.value == serde_json::Value::Bool(false) {
            return vec![];
        }

        let mut violations = Vec::new();
        let opts = ParsedOptions::from_config(&config.options);

        for (_node_id, el) in arena.elements() {
            if el.is_ghost || el.element_type != markuplint_core::mlast::ElementType::Html {
                continue;
            }

            let el_name = &el.base.node_name;
            let attr_specs = get_attr_specs(spec, el_name);
            let global_attr_names = get_global_attr_names(spec, el_name);

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };
                if html_attr.is_directive == Some(true) {
                    continue;
                }

                let ctx = AttrCheckContext {
                    spec, el_name, attr_specs: &attr_specs, global_attr_names: &global_attr_names,
                    opts: &opts, rule_id: self.id(), severity: &config.severity,
                };
                if let Some(v) = check_attr(html_attr, &ctx) {
                    violations.push(v);
                }
            }
        }

        violations
    }
}

/// Parsed rule options.
struct ParsedOptions {
    allow_attrs: Vec<String>,
    disallow_attrs: Vec<String>,
    ignore_prefixes: Vec<String>,
}

impl ParsedOptions {
    fn from_config(options: &serde_json::Value) -> Self {
        Self {
            allow_attrs: parse_string_list(options, "allowAttrs"),
            disallow_attrs: parse_string_list(options, "disallowAttrs"),
            ignore_prefixes: parse_ignore_prefixes(options),
        }
    }
}

/// Context for checking a single attribute.
struct AttrCheckContext<'a> {
    spec: &'a MLMLSpec,
    el_name: &'a str,
    attr_specs: &'a std::collections::HashMap<&'a str, &'a markuplint_types::spec::types::Attribute>,
    global_attr_names: &'a [String],
    opts: &'a ParsedOptions,
    rule_id: &'a str,
    severity: &'a crate::violation::Severity,
}

/// Check a single attribute and return a violation if invalid.
fn check_attr(
    html_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    ctx: &AttrCheckContext<'_>,
) -> Option<Violation> {
    let name = &html_attr.node_name;
    let name_lower = name.to_ascii_lowercase();

    // Parser-detected candidate (typo)
    if let Some(candidate) = &html_attr.candidate {
        return Some(Violation {
            rule_id: ctx.rule_id.to_string(),
            severity: ctx.severity.clone(),
            message: format!("The \"{name}\" attribute is disallowed. Did you mean \"{candidate}\"?"),
            line: html_attr.name.line,
            col: html_attr.name.col,
            raw: html_attr.raw.clone(),
        });
    }

    // Skip known prefixes handled by other rules
    if name_lower.starts_with("data-")
        || name_lower.starts_with("aria-")
        || (name_lower.len() > 2 && name_lower.starts_with("on"))
    {
        return None;
    }

    if ctx.opts.ignore_prefixes.iter().any(|p| name_lower.starts_with(p)) {
        return None;
    }

    // Disallow list
    if ctx.opts.disallow_attrs.iter().any(|a| a.eq_ignore_ascii_case(name)) {
        return Some(Violation {
            rule_id: ctx.rule_id.to_string(),
            severity: ctx.severity.clone(),
            message: format!("The \"{name}\" attribute is disallowed"),
            line: html_attr.name.line,
            col: html_attr.name.col,
            raw: html_attr.raw.clone(),
        });
    }

    // Allow list / spec check / global attrs
    if ctx.opts.allow_attrs.iter().any(|a| a.eq_ignore_ascii_case(name))
        || ctx.attr_specs.contains_key(name_lower.as_str())
        || ctx.global_attr_names.iter().any(|a| a == &name_lower)
    {
        return None;
    }

    // Element allows additional properties (framework components)
    if get_spec(ctx.spec, ctx.el_name).is_some_and(|s| s.possible_to_add_properties == Some(true)) {
        return None;
    }

    // Unknown attr — typo suggestion
    let mut known: Vec<&str> = ctx.attr_specs.keys().copied().collect();
    for ga in ctx.global_attr_names {
        known.push(ga.as_str());
    }
    let message = match find_closest_match(&name_lower, &known) {
        Some(candidate) => format!("The \"{name}\" attribute is not allowed. Did you mean \"{candidate}\"?"),
        None => format!("The \"{name}\" attribute is not allowed"),
    };

    Some(Violation {
        rule_id: ctx.rule_id.to_string(),
        severity: ctx.severity.clone(),
        message,
        line: html_attr.name.line,
        col: html_attr.name.col,
        raw: html_attr.raw.clone(),
    })
}

/// Parse a string array from options JSON.
fn parse_string_list(options: &serde_json::Value, key: &str) -> Vec<String> {
    options
        .get(key)
        .and_then(serde_json::Value::as_array)
        .map(|arr| {
            arr.iter()
                .filter_map(|v| {
                    // Support both string items and { name: string } objects
                    v.as_str()
                        .map(String::from)
                        .or_else(|| v.get("name").and_then(serde_json::Value::as_str).map(String::from))
                })
                .collect()
        })
        .unwrap_or_default()
}

/// Parse the `ignoreAttrNamePrefix` option (string or string[]).
fn parse_ignore_prefixes(options: &serde_json::Value) -> Vec<String> {
    match options.get("ignoreAttrNamePrefix") {
        Some(serde_json::Value::String(s)) => vec![s.to_ascii_lowercase()],
        Some(serde_json::Value::Array(arr)) => arr
            .iter()
            .filter_map(|v| v.as_str().map(str::to_ascii_lowercase))
            .collect(),
        _ => vec![],
    }
}

/// Get all global attribute names applicable to an element.
///
/// Looks up which global attr categories the element enables (e.g., `#HTMLGlobalAttrs`),
/// then collects all attribute names from those categories in the spec definitions.
/// Excludes `#ARIAAttrs` (handled by wai-aria rule) and `#GlobalEventAttrs` (handled
/// by no-use-event-handler-attr rule).
fn get_global_attr_names(spec: &MLMLSpec, element_name: &str) -> Vec<String> {
    let mut names = Vec::new();

    let Some(el) = get_spec(spec, element_name) else {
        return names;
    };

    for category in el.global_attrs.keys() {
        // Skip ARIA and event handler categories — handled by other rules
        if category == "#ARIAAttrs" || category == "#GlobalEventAttrs" {
            continue;
        }

        if let Some(attrs_map) = spec.def.global_attrs.get(category) {
            for attr_name in attrs_map.keys() {
                names.push(attr_name.clone());
            }
        }
    }

    names
}

/// Find the closest matching attribute name by Levenshtein distance.
fn find_closest_match<'a>(name: &str, candidates: &[&'a str]) -> Option<&'a str> {
    let mut best: Option<(&str, usize)> = None;

    for candidate in candidates {
        let dist = levenshtein(name, candidate);
        if dist <= MAX_TYPO_DISTANCE
            && (best.is_none() || dist < best.unwrap().1)
        {
            best = Some((candidate, dist));
        }
    }

    best.map(|(name, _)| name)
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
    fn valid_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty(), "class is a valid attr for div");
    }

    #[test]
    fn data_attr_allowed() {
        let arena = make_element_with_attrs("div", &[("data-custom", "value")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty(), "data-* attributes should be allowed");
    }

    #[test]
    fn aria_attr_skipped() {
        let arena = make_element_with_attrs("div", &[("aria-label", "test")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(
            violations.is_empty(),
            "aria-* attributes should be skipped (handled by wai-aria)"
        );
    }

    #[test]
    fn unknown_attr_violation() {
        let arena = make_element_with_attrs("div", &[("foo", "bar")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert!(violations[0].message.contains("foo"));
        assert!(violations[0].message.contains("not allowed"));
    }

    #[test]
    fn disallow_attrs_config() {
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "disallowAttrs": ["class"]
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &config);
        assert_eq!(violations.len(), 1);
        assert!(violations[0].message.contains("disallowed"));
    }

    #[test]
    fn disallow_attrs_config_violation() {
        // <div class="foo"> with config disallowAttrs: ["class"] → violation
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "disallowAttrs": ["class"]
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &config);
        assert_eq!(
            violations.len(),
            1,
            "Expected exactly 1 violation for disallowed class attr, got: {violations:?}"
        );
        assert!(
            violations[0].message.contains("class"),
            "Violation message should mention the disallowed attribute name 'class', got: {}",
            violations[0].message
        );
        assert!(
            violations[0].message.contains("disallowed"),
            "Violation message should say 'disallowed', got: {}",
            violations[0].message
        );
    }

    #[test]
    fn ignore_prefix_config() {
        let arena = make_element_with_attrs("div", &[("v-bind", "foo")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "ignoreAttrNamePrefix": "v-"
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &config);
        assert!(
            violations.is_empty(),
            "v- prefixed attrs should be ignored"
        );
    }

    #[test]
    fn allow_attrs_config() {
        let arena = make_element_with_attrs("div", &[("custom-attr", "val")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "allowAttrs": ["custom-attr"]
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &config);
        assert!(violations.is_empty(), "allowed attrs should not produce violations");
    }

    #[test]
    fn typo_suggestion() {
        // "classs" is close to "class"
        let arena = make_element_with_attrs("div", &[("classs", "foo")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert!(
            violations[0].message.contains("Did you mean"),
            "should suggest a correction for typo"
        );
    }

    #[test]
    fn event_handler_skipped() {
        let arena = make_element_with_attrs("div", &[("onclick", "foo()")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(
            violations.is_empty(),
            "event handler attrs should be skipped"
        );
    }

    #[test]
    fn valid_element_specific_attr() {
        let arena = make_element_with_attrs("input", &[("type", "text")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty(), "type is valid on input");
    }

    #[test]
    fn custom_element_allows_any_attrs() {
        // Custom elements (with hyphen) are not in the spec, so unknown attrs are reported.
        // This test documents the current behavior: custom elements are NOT exempt from
        // attribute validation in the Rust implementation (unlike the TS version which
        // checks possibleToAddProperties).
        let arena = make_element_with_attrs("custom-element", &[("any-attr", "value")]);
        let s = spec();
        let rule = InvalidAttr;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        // Current behavior: custom elements are not in the spec, so unknown attrs
        // are flagged. The element_type is Html but get_spec returns None, and
        // possible_to_add_properties is not set.
        assert!(
            !violations.is_empty(),
            "Custom elements currently do not get special treatment in Rust impl; \
             unknown attrs are flagged. Got: {violations:?}"
        );
    }

    #[test]
    fn ignore_attr_name_prefix_array() {
        // Element with v-bind:title and config ignoreAttrNamePrefix: ["v-", ":"]
        let arena = make_element_with_attrs("div", &[("v-bind:title", "title")]);
        let s = spec();
        let rule = InvalidAttr;
        let config = RuleConfig {
            options: serde_json::json!({
                "ignoreAttrNamePrefix": ["v-", ":"]
            }),
            ..RuleConfig::default()
        };
        let violations = rule.verify(&arena, &s, &config);
        assert!(
            violations.is_empty(),
            "v-bind:title should be ignored with ignoreAttrNamePrefix containing 'v-', got: {violations:?}"
        );
    }

    #[test]
    fn find_closest_match_works() {
        let candidates = &["class", "id", "style", "title"];
        assert_eq!(find_closest_match("classs", candidates), Some("class"));
        assert_eq!(find_closest_match("styl", candidates), Some("style"));
        assert_eq!(find_closest_match("completely_wrong", candidates), None);
    }
}
