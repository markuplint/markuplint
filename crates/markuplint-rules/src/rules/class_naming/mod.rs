//! `class-naming` rule: validate class names against configured regex patterns.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;
use regex::Regex;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

/// The `class-naming` rule.
pub struct ClassNaming;

impl Rule for ClassNaming {
    fn id(&self) -> &'static str {
        "class-naming"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }

            // Parse pattern(s) from config value
            let pattern_strs: Vec<String> = match &rule_config.value {
                serde_json::Value::String(s) if !s.is_empty() => vec![s.clone()],
                serde_json::Value::Array(arr) => arr.iter().filter_map(|v| v.as_str().map(String::from)).collect(),
                _ => continue, // null, empty, or non-string → skip this node
            };

            if pattern_strs.is_empty() {
                continue;
            }

            // Compile all patterns
            let regexes: Vec<(String, Regex)> = pattern_strs
                .iter()
                .filter_map(|ps| {
                    let regex_str = strip_regex_delimiters(ps);
                    Regex::new(&regex_str).ok().map(|re| (ps.clone(), re))
                })
                .collect();

            if regexes.is_empty() {
                continue;
            }

            // TS format: quoted patterns joined by ", "
            let display_pattern = pattern_strs
                .iter()
                .map(|p| format!("\"{p}\""))
                .collect::<Vec<_>>()
                .join(", ");

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                if !html_attr.node_name.eq_ignore_ascii_case("class") {
                    continue;
                }

                let value = &html_attr.value.raw;
                // Track position within the value string to compute per-class col
                let value_start_line = html_attr.value.line;
                let value_start_col = html_attr.value.col;
                let mut search_from = 0;

                for class_name in value.split_whitespace() {
                    // Find position of this class name within the value string
                    let pos_in_value = value[search_from..].find(class_name).unwrap_or(0) + search_from;
                    search_from = pos_in_value + class_name.len();

                    // Compute col (assumes single-line class attribute value)
                    #[allow(clippy::cast_possible_truncation)]
                    let class_col = value_start_col + pos_in_value as u32;

                    // Class must match at least one pattern
                    let matches_any = regexes.iter().any(|(_, re)| re.is_match(class_name));
                    if !matches_any {
                        // TS reports at the class name position with raw = class name
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            name: None,
                            severity: rule_config.severity,
                            message: format!(
                                "The \"{class_name}\" class name is unmatched with the below patterns: {display_pattern}"
                            ),
                            line: value_start_line,
                            col: class_col,
                            raw: class_name.to_string(),
                        });
                    }
                }
            }
        }

        violations
    }
}

/// Strip regex delimiters /pattern/flags and return the inner pattern.
fn strip_regex_delimiters(pattern: &str) -> String {
    if let Some(rest) = pattern.strip_prefix('/') {
        if let Some(last_slash) = rest.rfind('/') {
            rest[..last_slash].to_string()
        } else {
            pattern.to_string()
        }
    } else {
        pattern.to_string()
    }
}
