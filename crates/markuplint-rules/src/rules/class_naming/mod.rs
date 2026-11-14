//! `class-naming` rule: validate class names against configured regex patterns.

use markuplint_core::i18n::Primitive as Kw;
use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::js_string::is_white_space;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::attr_name;
use crate::helpers::pattern_match;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct ClassNaming;

impl Rule for ClassNaming {
    fn id(&self) -> &'static str {
        "class-naming"
    }

    /// Matches TS `createRule({ defaultSeverity: 'warning' })`.
    fn default_severity(&self) -> crate::violation::Severity {
        crate::violation::Severity::Warning
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        let tr = config.translator();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }

            // As TS on `dev` (#4202; `v6` receives it with the `dev` → `v6` merge): a missing
            // pattern is an empty list, and the rule is a no-op for the element, since `null` is
            // documented as "disable".
            let pattern_strs: Vec<String> = match &rule_config.value {
                serde_json::Value::String(s) => vec![s.clone()],
                serde_json::Value::Array(arr) => arr.iter().filter_map(|v| v.as_str().map(String::from)).collect(),
                _ => Vec::new(),
            }
            .into_iter()
            .filter(|p| !p.is_empty())
            .collect();

            // No pattern disables the rule for the element.
            if pattern_strs.is_empty() {
                continue;
            }

            // TS format: `"a", "b"`.
            let display_pattern = format!("\"{}\"", pattern_strs.join("\", \""));

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                // TS reads the name the parser resolved, and leaves a template expression alone.
                if !attr_name(html_attr).eq_ignore_ascii_case("class") || html_attr.is_dynamic_value == Some(true) {
                    continue;
                }

                let value = markuplint_dom::helpers::attr_value(html_attr);

                for class_name in value.split(is_white_space).filter(|class_name| !class_name.is_empty()) {
                    let matches_any = pattern_strs.iter().any(|pattern| pattern_match(class_name, pattern));
                    if !matches_any {
                        // As TS: every class of the attribute is reported at the start of the
                        // attribute value, with the whole value as `raw` (#4248).
                        violations.push(Violation {
                            spec_conformance: None,
                            rule_id: self.id().to_string(),
                            name: None,
                            severity: rule_config.severity,
                            message: tr.finish(&tr.t(
                                "{0} is unmatched with the below patterns: {1}",
                                &[
                                    Kw::S(&tr.t("the \"{0*}\" {1}", &[Kw::S(class_name), Kw::S("class name")])),
                                    Kw::S(&display_pattern),
                                ],
                            )),
                            line: html_attr.value.line,
                            col: html_attr.value.col,
                            raw: html_attr.value.raw.clone(),
                            reason: rule_config.reason.clone(),
                            fix: None,
                        });
                    }
                }
            }
        }

        violations
    }
}
