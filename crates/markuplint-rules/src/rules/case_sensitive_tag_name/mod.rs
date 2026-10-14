//! `case-sensitive-tag-name` rule: checks tag name case (default: lowercase).

use markuplint_core::mlast::{ElementType, NamespaceURI};
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::{extract_tag_name_from_raw, get_raw_tag_name};
use markuplint_types::spec::types::MLMLSpec;

use crate::fix::Fix;
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

        if arena.settings().tag_name_case_sensitive {
            return violations;
        }

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            // TS `el.isForeignElement || el.elementType !== 'html'`: the namespace and the type of
            // the element as written, which a pretender does not change.
            let identity = el.identity(true);
            if *identity.namespace != NamespaceURI::XHTML || *identity.element_type != ElementType::Html {
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
                let name_start = el.base.offset + el.tag_open_char.len();
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: message.clone(),
                    line: el.base.line,
                    col: name_col,
                    raw: raw_name.to_string(),
                    reason: None,
                    fix: Some(Fix::replace_range(
                        name_start,
                        name_start + raw_name.len(),
                        convert_case(raw_name, case),
                    )),
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
                    // `</` precedes the name; the open tag's `<` is the same width as the `tag_open_char`.
                    let close_name_start = ct.offset + el.tag_open_char.len() + '/'.len_utf8();
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: message.clone(),
                        line: ct.line,
                        col: ct.col,
                        raw: ct.raw.clone(),
                        reason: None,
                        fix: Some(Fix::replace_range(
                            close_name_start,
                            close_name_start + close_raw_name.len(),
                            convert_case(close_raw_name, case),
                        )),
                    });
                }
            }
        }

        violations
    }
}

/// The check is ASCII-only, as the TS regex is, but the TS fix converts with
/// `toLowerCase()` / `toUpperCase()`, which are not.
fn convert_case(name: &str, case: &str) -> String {
    if case == "upper" {
        name.to_uppercase()
    } else {
        name.to_lowercase()
    }
}
