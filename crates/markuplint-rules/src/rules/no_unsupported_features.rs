//! `no-unsupported-features` rule: warns about experimental or non-standard
//! HTML elements and attributes based on spec metadata.
//!
//! BCD (Browser Compat Data) based browser-version checks are not yet implemented
//! in Rust — `browserslist` option is accepted but ignored. Only `checkExperimental`
//! and `checkNonStandard` work (using spec flags from html-spec).

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::lookup::{get_attr_specs, get_spec_by_tag_name};
use markuplint_types::spec::types::MLMLSpec;
use serde_json::Value;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct NoUnsupportedFeatures;

impl Rule for NoUnsupportedFeatures {
    fn id(&self) -> &'static str {
        "no-unsupported-features"
    }

    #[allow(clippy::too_many_lines)]
    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled || el.is_ghost {
                continue;
            }

            if el.namespace != markuplint_core::mlast::NamespaceURI::XHTML {
                continue;
            }

            let tag = el.base.node_name.as_str();

            let check_experimental = rule_config
                .options
                .get("checkExperimental")
                .and_then(Value::as_bool)
                .unwrap_or(false);

            let check_non_standard = rule_config
                .options
                .get("checkNonStandard")
                .and_then(Value::as_bool)
                .unwrap_or(false);

            let ignore_features = rule_config
                .options
                .get("ignoreFeatures")
                .and_then(Value::as_array)
                .map(|arr| {
                    arr.iter()
                        .filter_map(Value::as_str)
                        .map(str::to_ascii_lowercase)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();

            if ignore_features.iter().any(|f| f == tag) {
                continue;
            }

            let el_spec = get_spec_by_tag_name(spec, tag, None);

            if check_experimental
                && let Some(es) = el_spec
                && es.experimental == Some(true)
            {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: format!("The \"{tag}\" element is experimental"),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                    reason: None,
                });
            }

            if check_non_standard
                && let Some(es) = el_spec
                && es.non_standard == Some(true)
            {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: format!("The \"{tag}\" element is non-standard"),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                    reason: None,
                });
            }

            let attr_specs = get_attr_specs(spec, tag);

            for attr in &el.attributes {
                let markuplint_core::mlast::MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };
                let attr_name = html_attr.node_name.to_ascii_lowercase();

                // The ignore list accepts the `element[attr]` form as well as a bare attr name.
                let ignore_pattern = format!("{tag}[{attr_name}]");
                if ignore_features.iter().any(|f| f == &ignore_pattern || f == &attr_name) {
                    continue;
                }

                let attr_spec = attr_specs.get(attr_name.as_str());

                if check_experimental
                    && let Some(as_) = attr_spec
                    && as_.experimental == Some(true)
                {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: format!("The \"{attr_name}\" attribute of the \"{tag}\" element is experimental"),
                        line: html_attr.line,
                        col: html_attr.col,
                        raw: html_attr.raw.clone(),
                        reason: None,
                    });
                }

                if check_non_standard
                    && let Some(as_) = attr_spec
                    && as_.non_standard == Some(true)
                {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: format!("The \"{attr_name}\" attribute of the \"{tag}\" element is non-standard"),
                        line: html_attr.line,
                        col: html_attr.col,
                        raw: html_attr.raw.clone(),
                        reason: None,
                    });
                }
            }
        }

        violations
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::violation::Severity;

    fn html_arena(html: &str) -> DomArena {
        let as_doc = markuplint_html_parser::should_parse_as_document(html);
        let is_fragment = !as_doc;
        let parser_arena = if is_fragment {
            markuplint_html_parser::parse_fragment(html)
        } else {
            markuplint_html_parser::parse_document(html)
        };
        markuplint_dom::html_builder::build_from_html_arena(html, &parser_arena, is_fragment)
    }

    fn html_spec() -> MLMLSpec {
        markuplint_types::spec::load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json"))
            .unwrap()
    }

    fn run_with_options(html: &str, options: Value) -> Vec<Violation> {
        let arena = html_arena(html);
        let spec = html_spec();
        let config = RuleConfigSet::global_only(RuleConfig {
            options,
            ..Default::default()
        });
        NoUnsupportedFeatures.verify(&arena, &spec, &config)
    }

    // --- checkNonStandard ---

    #[test]
    fn non_standard_disabled_by_default() {
        // canvas[moz-opaque] is non-standard, but checkNonStandard defaults to false
        let v = run_with_options(r#"<canvas moz-opaque></canvas>"#, serde_json::json!({}));
        assert!(v.is_empty());
    }

    #[test]
    fn non_standard_attr_detected() {
        // canvas[moz-opaque] is flagged as nonStandard in html-spec
        let v = run_with_options(
            r#"<canvas moz-opaque></canvas>"#,
            serde_json::json!({ "checkNonStandard": true }),
        );
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("non-standard"));
        assert!(v[0].message.contains("moz-opaque"));
    }

    #[test]
    fn non_standard_attr_hr_align() {
        // hr[align] is non-standard
        let v = run_with_options(
            r#"<hr align="center">"#,
            serde_json::json!({ "checkNonStandard": true }),
        );
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("non-standard"));
    }

    #[test]
    fn non_standard_attr_input_webkitdirectory() {
        // input[webkitdirectory] is non-standard
        let v = run_with_options(
            r#"<input type="file" webkitdirectory>"#,
            serde_json::json!({ "checkNonStandard": true }),
        );
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("non-standard"));
        assert!(v[0].message.contains("webkitdirectory"));
    }

    // --- checkExperimental ---

    #[test]
    fn experimental_disabled_by_default() {
        // iframe[credentialless] is experimental, but checkExperimental defaults to false
        let v = run_with_options(r#"<iframe credentialless></iframe>"#, serde_json::json!({}));
        assert!(v.is_empty());
    }

    #[test]
    fn experimental_attr_iframe_credentialless() {
        // iframe[credentialless] is experimental
        let v = run_with_options(
            r#"<iframe credentialless></iframe>"#,
            serde_json::json!({ "checkExperimental": true }),
        );
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("experimental"));
        assert!(v[0].message.contains("credentialless"));
    }

    #[test]
    fn experimental_attr_iframe_csp() {
        // iframe[csp] is experimental
        let v = run_with_options(
            r#"<iframe csp="default-src 'self'"></iframe>"#,
            serde_json::json!({ "checkExperimental": true }),
        );
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("experimental"));
        assert!(v[0].message.contains("csp"));
    }

    #[test]
    fn experimental_attr_input_switch() {
        // input[switch] is experimental (and also non-standard)
        let v = run_with_options(
            r#"<input type="checkbox" switch>"#,
            serde_json::json!({ "checkExperimental": true }),
        );
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("experimental"));
    }

    // --- Both flags enabled ---

    #[test]
    fn both_experimental_and_non_standard_on_same_attr() {
        // input[switch] is both experimental and non-standard
        let v = run_with_options(
            r#"<input type="checkbox" switch>"#,
            serde_json::json!({ "checkExperimental": true, "checkNonStandard": true }),
        );
        assert_eq!(v.len(), 2);
        assert!(v.iter().any(|v| v.message.contains("experimental")));
        assert!(v.iter().any(|v| v.message.contains("non-standard")));
    }

    // --- ignoreFeatures ---

    #[test]
    fn ignore_features_skips_attr_by_element_pattern() {
        // iframe[credentialless] is experimental, but ignored via "iframe[credentialless]"
        let v = run_with_options(
            r#"<iframe credentialless></iframe>"#,
            serde_json::json!({ "checkExperimental": true, "ignoreFeatures": ["iframe[credentialless]"] }),
        );
        assert!(v.is_empty());
    }

    #[test]
    fn ignore_features_does_not_affect_other_attrs() {
        // Ignore credentialless but csp should still be flagged
        let v = run_with_options(
            r#"<iframe credentialless csp="default-src 'self'"></iframe>"#,
            serde_json::json!({ "checkExperimental": true, "ignoreFeatures": ["iframe[credentialless]"] }),
        );
        assert_eq!(v.len(), 1);
        assert!(v[0].message.contains("csp"));
    }

    // --- SVG elements skipped ---

    #[test]
    fn svg_element_skipped() {
        let v = run_with_options(
            r#"<svg><circle r="10"></circle></svg>"#,
            serde_json::json!({ "checkExperimental": true, "checkNonStandard": true }),
        );
        // SVG elements should not be checked (non-XHTML namespace)
        let svg_violations: Vec<_> = v.iter().filter(|v| v.raw.contains("circle")).collect();
        assert!(svg_violations.is_empty());
    }

    // --- Standard elements pass ---

    #[test]
    fn standard_element_no_violation() {
        let v = run_with_options(
            r#"<div></div>"#,
            serde_json::json!({ "checkExperimental": true, "checkNonStandard": true }),
        );
        assert!(v.is_empty());
    }

    #[test]
    fn standard_element_with_standard_attr_no_violation() {
        let v = run_with_options(
            r#"<div class="test"></div>"#,
            serde_json::json!({ "checkExperimental": true, "checkNonStandard": true }),
        );
        assert!(v.is_empty());
    }

    // --- No browserslist = no browser check ---

    #[test]
    fn no_browserslist_no_browser_check() {
        // dialog is not supported in IE 11, but without browserslist option, no violation
        let v = run_with_options(r#"<dialog></dialog>"#, serde_json::json!({}));
        assert!(v.is_empty());
    }

    // --- Default severity ---

    #[test]
    fn default_severity_is_error() {
        let v = run_with_options(
            r#"<iframe credentialless></iframe>"#,
            serde_json::json!({ "checkExperimental": true }),
        );
        assert_eq!(v.len(), 1);
        assert_eq!(v[0].severity, Severity::Error);
    }
}
