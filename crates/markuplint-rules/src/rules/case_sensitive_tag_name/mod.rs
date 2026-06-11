//! `case-sensitive-tag-name` rule: checks tag name case (default: lowercase).

use markuplint_core::mlast::NamespaceURI;
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::{extract_tag_name_from_raw, get_raw_tag_name};
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct CaseSensitiveTagName;

impl Rule for CaseSensitiveTagName {
    fn id(&self) -> &'static str {
        "case-sensitive-tag-name"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let case = config.global().value.as_str().unwrap_or("lower");
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if el.namespace != NamespaceURI::XHTML {
                continue;
            }

            // TS uses "should" for warning, "must" for error
            let verb = if rule_config.severity == Severity::Warning {
                "should"
            } else {
                "must"
            };
            let message = format!("Tag names of HTML elements {verb} be {case}case");

            // Use the raw source name so original case is preserved for the comparison.
            let Some(raw_name) = get_raw_tag_name(el) else {
                continue;
            };

            let is_correct = match case {
                "upper" => raw_name == raw_name.to_ascii_uppercase(),
                _ => raw_name == raw_name.to_ascii_lowercase(),
            };

            if !is_correct {
                // Report at tag name position (after '<'), with raw = tag name only
                #[allow(clippy::cast_possible_truncation)]
                let name_col = el.base.col + el.tag_open_char.len() as u32;
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: message.clone(),
                    line: el.base.line,
                    col: name_col,
                    raw: raw_name.to_string(),
                    reason: None,
                });
            }

            if let Some(ct) = &el.close_tag {
                let Some(close_raw_name) = extract_tag_name_from_raw(&ct.raw) else {
                    continue;
                };
                let pair_correct = match case {
                    "upper" => close_raw_name == close_raw_name.to_ascii_uppercase(),
                    _ => close_raw_name == close_raw_name.to_ascii_lowercase(),
                };
                if !pair_correct {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: message.clone(),
                        line: ct.line,
                        col: ct.col,
                        raw: ct.raw.clone(),
                        reason: None,
                    });
                }
            }
        }

        violations
    }
}
