//! `deprecated-attr` rule: report deprecated or obsolete attributes.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::get_raw_attr_name;
use markuplint_types::spec::lookup::{get_attr_specs, get_spec};
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

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

                // Use raw attr name from source for message (preserves original case)
                let raw_name = get_raw_attr_name(html_attr);

                if is_deprecated {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: format!("The \"{raw_name}\" attribute is deprecated"),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.name.raw.clone(),
                    reason: None,
            });
                } else if is_obsolete {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: format!("The \"{raw_name}\" attribute is obsolete"),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.name.raw.clone(),
                    reason: None,
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
