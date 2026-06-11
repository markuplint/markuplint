//! `disallowed-element` rule: report elements matching configured CSS selectors.
//!
//! TS implementation has two phases:
//! 1. Global rule value: querySelectorAll on document (check all elements)
//! 2. Per-element overrides (nodeRules): querySelectorAll on the matched
//!    element's descendants (the override selectors are checked against children)

use markuplint_dom::arena::DomArena;
use markuplint_selector::matcher;
use markuplint_selector::parser;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct DisallowedElement;

impl Rule for DisallowedElement {
    fn id(&self) -> &'static str {
        "disallowed-element"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        let global_selectors = parse_selectors(&config.global().value);
        for (node_id, el) in arena.elements() {
            for (selector_str, sel) in &global_selectors {
                if matcher::matches(sel, arena, node_id, Some(node_id), Some(spec), None) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: config.global().severity,
                        message: format!("The \"{selector_str}\" element is disallowed"),
                        line: el.base.line,
                        col: el.base.col,
                        raw: el.base.raw.clone(),
                        reason: None,
                    });
                }
            }
        }

        // Per-element overrides apply to the matched element's DESCENDANTS,
        // mirroring TS `el.querySelectorAll` on nodeRule-matched elements.
        for (node_id, _el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }

            // Same value as global means there is no override here.
            if rule_config.value == config.global().value {
                continue;
            }

            let override_selectors = parse_selectors(&rule_config.value);
            if override_selectors.is_empty() {
                continue;
            }

            for descendant in arena.descendants(node_id) {
                let Some(desc_el) = descendant.as_element() else {
                    continue;
                };
                let desc_id = desc_el.base.id;
                if desc_id == node_id {
                    continue; // The override applies to descendants, not the matched element itself.
                }
                for (selector_str, sel) in &override_selectors {
                    if matcher::matches(sel, arena, desc_id, Some(desc_id), Some(spec), None) {
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            name: None,
                            severity: rule_config.severity,
                            message: format!("The \"{selector_str}\" element is disallowed"),
                            line: desc_el.base.line,
                            col: desc_el.base.col,
                            raw: desc_el.base.raw.clone(),
                            reason: None,
                        });
                    }
                }
            }
        }

        violations
    }
}

fn parse_selectors(value: &serde_json::Value) -> Vec<(String, markuplint_selector::ast::SelectorList)> {
    let strs: Vec<String> = match value {
        serde_json::Value::Array(arr) => arr.iter().filter_map(|v| v.as_str().map(String::from)).collect(),
        serde_json::Value::String(s) => vec![s.clone()],
        _ => return vec![],
    };
    strs.into_iter()
        .filter_map(|s| parser::parse(&s).ok().map(|sel| (s, sel)))
        .collect()
}
