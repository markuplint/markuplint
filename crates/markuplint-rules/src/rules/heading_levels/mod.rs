//! `heading-levels` rule: reports heading level skips (e.g., h2 followed by h4).

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

/// The `heading-levels` rule.
pub struct HeadingLevels;

/// Extract heading level from a tag name (h1-h6). Returns None if not a heading.
fn heading_level(name: &str) -> Option<u8> {
    let lower = name.to_ascii_lowercase();
    match lower.as_str() {
        "h1" => Some(1),
        "h2" => Some(2),
        "h3" => Some(3),
        "h4" => Some(4),
        "h5" => Some(5),
        "h6" => Some(6),
        _ => None,
    }
}

impl Rule for HeadingLevels {
    fn id(&self) -> &'static str {
        "heading-levels"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let config = config.global();
        let mut violations = Vec::new();

        let mut headings: Vec<(u8, u32, u32, String)> = Vec::new();

        for i in 0..arena.len() {
            if let Some(DomNode::Element(el)) = arena.get(i)
                && let Some(level) = heading_level(&el.base.node_name)
            {
                headings.push((level, el.base.line, el.base.col, el.base.raw.clone()));
            }
        }

        let mut prev_level: Option<u8> = None;
        for &(level, line, col, ref raw) in &headings {
            if let Some(prev) = prev_level
                && level > prev + 1
            {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: config.severity,
                    message: "Heading levels must not be skipped".to_string(),
                    line,
                    col,
                    raw: raw.clone(),
            reason: None,
                });
            }
            prev_level = Some(level);
        }

        violations
    }
}
