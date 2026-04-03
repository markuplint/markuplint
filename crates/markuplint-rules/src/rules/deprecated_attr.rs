//! `deprecated-attr` rule: report deprecated or obsolete attributes.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::lookup::{get_attr_specs, get_spec};
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `deprecated-attr` rule.
pub struct DeprecatedAttr;

impl Rule for DeprecatedAttr {
    fn id(&self) -> &'static str {
        "deprecated-attr"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            // Use namespace-qualified name for spec lookup so SVG elements
            // (e.g., svg:a) find the correct spec instead of the HTML element.
            let qualified_name = match el.namespace {
                markuplint_core::mlast::NamespaceURI::SVG => format!("svg:{}", el.base.node_name),
                markuplint_core::mlast::NamespaceURI::MathML => format!("math:{}", el.base.node_name),
                _ => el.base.node_name.clone(),
            };
            let attr_specs = get_attr_specs(spec, &qualified_name);

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                let attr_name_lower = html_attr.node_name.to_ascii_lowercase();

                // Check element-specific attrs first, then fall back to global attrs
                let (is_deprecated, is_obsolete) = match attr_specs.get(attr_name_lower.as_str()) {
                    Some(attr_spec) if attr_spec.deprecated == Some(true) || attr_spec.obsolete == Some(true) => {
                        (attr_spec.deprecated == Some(true), attr_spec.obsolete == Some(true))
                    }
                    _ => get_global_attr_deprecated_flags(spec, &qualified_name, &attr_name_lower),
                };

                if is_deprecated {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: format!("The \"{}\" attribute is deprecated", html_attr.node_name),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.raw.clone(),
                    });
                } else if is_obsolete {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: format!("The \"{}\" attribute is obsolete", html_attr.node_name),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.raw.clone(),
                    });
                }
            }
        }

        violations
    }
}

/// Check deprecated/obsolete flags for a global attribute from the raw JSON spec.
fn get_global_attr_deprecated_flags(spec: &MLMLSpec, element_name: &str, attr_name: &str) -> (bool, bool) {
    let Some(el) = get_spec(spec, element_name) else {
        return (false, false);
    };
    for category in el.global_attrs.keys() {
        if let Some(attrs_map) = spec.def.global_attrs.get(category)
            && let Some(attr_val) = attrs_map.get(attr_name)
        {
            let deprecated = attr_val
                .get("deprecated")
                .and_then(serde_json::Value::as_bool)
                .unwrap_or(false);
            let obsolete = attr_val
                .get("obsolete")
                .and_then(serde_json::Value::as_bool)
                .unwrap_or(false);
            return (deprecated, obsolete);
        }
    }
    (false, false)
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
    fn normal_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = DeprecatedAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn unknown_attr_no_violation() {
        let arena = make_element_with_attrs("div", &[("data-x", "y")]);
        let s = spec();
        let rule = DeprecatedAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn normal_element_with_standard_attr_no_violation() {
        // <input type="text"> — "type" on <input> is a standard, non-deprecated attribute
        let arena = make_element_with_attrs("input", &[("type", "text")]);
        let s = spec();
        let rule = DeprecatedAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn deprecated_charset_on_link() {
        // "charset" on <link> is deprecated (and obsolete) in the html-spec
        // deprecated is checked first, so message says "deprecated"
        let arena = make_element_with_attrs("link", &[("charset", "utf-8")]);
        let s = spec();
        let rule = DeprecatedAttr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "The \"charset\" attribute is deprecated");
    }
}
