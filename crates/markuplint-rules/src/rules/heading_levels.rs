//! `heading-levels` rule: reports heading level skips (e.g., h2 followed by h4).

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

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

        // Collect headings in document order (arena order IS document order for elements)
        let mut headings: Vec<(u8, u32, u32, String)> = Vec::new();

        // Walk all nodes in arena order to get document order
        for i in 0..arena.len() {
            if let Some(DomNode::Element(el)) = arena.get(i)
                && let Some(level) = heading_level(&el.base.node_name)
            {
                headings.push((level, el.base.line, el.base.col, el.base.raw.clone()));
            }
        }

        // Check for level skips
        let mut prev_level: Option<u8> = None;
        for &(level, line, col, ref raw) in &headings {
            if let Some(prev) = prev_level
                && level > prev + 1
            {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: config.severity.clone(),
                    message: "Heading levels must not be skipped".to_string(),
                    line,
                    col,
                    raw: raw.clone(),
                });
            }
            prev_level = Some(level);
        }

        violations
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::violation::Severity;
    use markuplint_core::mlast::{ElementType, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    fn make_heading_arena(tags: &[&str]) -> DomArena {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let mut child_ids = Vec::new();
        for (i, tag) in tags.iter().enumerate() {
            let el_id = builder.push(DomNode::Element(ElementData {
                base: NodeBase {
                    id: 0,
                    uuid: format!("h-{i}"),
                    raw: format!("<{tag}>"),
                    offset: 0,
                    line: (i as u32) + 1,
                    col: 1,
                    node_name: tag.to_string(),
                    parent: Some(doc_id),
                    children: vec![],
                    next_sibling: None,
                    prev_sibling: None,
                    depth: 1,
                },
                namespace: NamespaceURI::XHTML,
                element_type: ElementType::Html,
                is_fragment: false,
                attributes: vec![],
                has_spread_attr: false,
                block_behavior: None,
                pair_node_id: None,
                tag_open_char: "<".to_string(),
                tag_close_char: ">".to_string(),
                is_ghost: false,
                close_tag: None,
            }));
            if let Some(DomNode::Element(e)) = builder.get_mut(el_id) {
                e.base.id = el_id;
            }
            child_ids.push(el_id);
        }

        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = child_ids;
        }
        builder.finish()
    }

    #[test]
    fn sequential_headings_no_violation() {
        let arena = make_heading_arena(&["h1", "h2", "h3"]);
        let s = spec();
        let rule = HeadingLevels;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn skipped_heading_level() {
        let arena = make_heading_arena(&["h1", "h3"]);
        let s = spec();
        let rule = HeadingLevels;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Heading levels must not be skipped");
        assert_eq!(violations[0].line, 2); // h3 is on line 2
    }

    #[test]
    fn going_down_levels_is_ok() {
        // h1 → h2 → h3 → h1 is OK (going back up)
        let arena = make_heading_arena(&["h1", "h2", "h3", "h1"]);
        let s = spec();
        let rule = HeadingLevels;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn multiple_skips() {
        let arena = make_heading_arena(&["h1", "h4", "h6"]);
        let s = spec();
        let rule = HeadingLevels;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 2);
    }
}
