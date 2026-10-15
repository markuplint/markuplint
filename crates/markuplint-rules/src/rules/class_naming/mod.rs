//! `class-naming` rule: validate class names against configured regex patterns.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;
use regex::Regex;

use crate::aria_check::attr_name;
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

            let regexes: Vec<(String, Regex)> = pattern_strs
                .iter()
                .filter_map(|ps| {
                    let regex_str = strip_regex_delimiters(ps);
                    Regex::new(&regex_str).ok().map(|re| (ps.clone(), re))
                })
                .collect();

            // Having no pattern disables the rule. Patterns that all fail to parse as a regex skip
            // the element too; that is a separate case that happens to end the same way.
            if regexes.is_empty() {
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

                let value = &html_attr.value.raw;
                // Track the offset within the value so each class gets its own column.
                let value_start_line = html_attr.value.line;
                let value_start_col = html_attr.value.col;
                let mut search_from = 0;

                for class_name in value.split_whitespace() {
                    let pos_in_value = value[search_from..].find(class_name).unwrap_or(0) + search_from;
                    search_from = pos_in_value + class_name.len();

                    // Assumes a single-line class attribute value.
                    #[allow(clippy::cast_possible_truncation)]
                    let class_col = value_start_col + pos_in_value as u32;

                    let matches_any = regexes.iter().any(|(_, re)| re.is_match(class_name));
                    if !matches_any {
                        // TS reports at the class name position with raw = class name.
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
