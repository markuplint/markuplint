//! `no-skipped-heading-level` rule: reports heading level skips (e.g., h2 followed by h4).

use std::collections::HashMap;

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::create_message::Kw;
use crate::rule::{Rule, RuleConfigSet};
use crate::tree_scope::{TreeRoot, Trees};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoSkippedHeadingLevel;

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

impl Rule for NoSkippedHeadingLevel {
    fn id(&self) -> &'static str {
        "no-skipped-heading-level"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let tr = config.translator();
        let config = config.global();
        let mut violations = Vec::new();

        // The content of a `template` element and a declarative shadow root are trees of their own,
        // and where they are inserted is not known from the markup: the headings of each tree are
        // the sequence that the heading lead is judged in, as the headings of the document are.
        let trees = Trees::new(arena, spec);
        let mut headings: Vec<(TreeRoot, u8, u32, u32, String)> = Vec::new();

        for (node_id, el) in arena.elements() {
            if let Some(level) = heading_level(&el.base.node_name) {
                headings.push((
                    trees.root_of(node_id),
                    level,
                    el.base.line,
                    el.base.col,
                    el.base.raw.clone(),
                ));
            }
        }

        let mut prev_level_of_tree: HashMap<TreeRoot, u8> = HashMap::new();
        for &(root, level, line, col, ref raw) in &headings {
            let prev_level = prev_level_of_tree.insert(root, level);
            if let Some(prev) = prev_level
                && level > prev + 1
            {
                violations.push(Violation {
                    spec_conformance: None,
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: config.severity,
                    message: tr.finish(&tr.t("{0} must not be skipped", &[Kw::S(&tr.t("Heading levels", &[]))])),
                    line,
                    col,
                    raw: raw.clone(),
                    reason: None,
                    fix: None,
                });
            }
        }

        violations
    }
}
