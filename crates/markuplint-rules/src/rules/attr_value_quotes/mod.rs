//! `attr-value-quotes` rule: attribute values must use consistent quote style.

use markuplint_core::i18n::Primitive as Kw;
use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::fix::{Fix, TextEdit};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct AttrValueQuotes;

impl Rule for AttrValueQuotes {
    fn id(&self) -> &'static str {
        "attr-value-quotes"
    }

    fn default_severity(&self) -> crate::violation::Severity {
        crate::violation::Severity::Warning
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let quote_style = config.global().value.as_str().unwrap_or("double");

        let (expected_quote, kind) = match quote_style {
            "single" => ("'", "single"),
            _ => ("\"", "double"),
        };
        let tr = config.translator();
        let message = tr.finish(&tr.t(
            "{0} is must {1} on {2}",
            &[
                Kw::S("Attribute value"),
                Kw::S("quote"),
                Kw::S(&format!("{kind} quotation mark")),
            ],
        ));

        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                // Boolean attributes have neither value nor quotes, so there is nothing to check.
                if html_attr.value.raw.is_empty() && html_attr.start_quote.raw.is_empty() {
                    continue;
                }

                // A value the framework evaluates, or a directive, is not a quoted string.
                if html_attr.is_expression_value == Some(true) || html_attr.is_directive == Some(true) {
                    continue;
                }

                if html_attr.start_quote.raw != expected_quote {
                    violations.push(Violation {
                        spec_conformance: None,
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: message.clone(),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.raw.clone(),
                        reason: rule_config.reason.clone(),
                        // An unquoted value has quote tokens of no width, which the edits
                        // turn into insertions on either side of the value.
                        fix: Some(Fix::new(
                            [&html_attr.start_quote, &html_attr.end_quote]
                                .into_iter()
                                .map(|quote| TextEdit {
                                    range: [quote.offset, quote.offset + quote.raw.len()],
                                    text: expected_quote.to_string(),
                                })
                                .collect(),
                        )),
                    });
                }
            }
        }

        violations
    }
}
