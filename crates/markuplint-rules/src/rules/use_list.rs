//! `use-list` rule: suggest using `<li>` elements instead of text with bullet characters.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfig};
use crate::violation::Violation;

/// The `use-list` rule.
pub struct UseList;

/// Default bullet-like characters that suggest list semantics.
const DEFAULT_BULLETS: &[&str] = &[
    "\u{2022}", // •
    "\u{25E6}", // ◦
    "\u{2023}", // ‣
    "\u{2043}", // ⁃
    "\u{204C}", // ⁌
    "\u{204D}", // ⁍
    "\u{2219}", // ∙
    "\u{25C9}", // ◉
    "\u{25CE}", // ◎
    "\u{25CF}", // ●
    "\u{25CB}", // ○
    "\u{25A0}", // ■
    "\u{25A1}", // □
    "\u{25AA}", // ▪
    "\u{25AB}", // ▫
    "\u{2605}", // ★
    "\u{2606}", // ☆
    "\u{2713}", // ✓
    "\u{2714}", // ✔
    "\u{2715}", // ✕
    "\u{2716}", // ✖
    "\u{2717}", // ✗
    "\u{2718}", // ✘
    "-",
    "*",
    ">",
    "\u{203A}", // ›
    "\u{2192}", // →
];

impl Rule for UseList {
    fn id(&self) -> &'static str {
        "use-list"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation> {
        // Collect additional bullets from config value
        let mut bullets: Vec<&str> = DEFAULT_BULLETS.to_vec();
        let extra_owned: Vec<String>;
        if let serde_json::Value::Array(arr) = &config.value {
            extra_owned = arr
                .iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect();
            for s in &extra_owned {
                bullets.push(s.as_str());
            }
        }

        let mut violations = Vec::new();

        for node in arena.descendants(0) {
            let DomNode::Text(text) = node else {
                continue;
            };

            let trimmed = text.base.raw.trim_start();
            if trimmed.is_empty() {
                continue;
            }

            let starts_with_bullet = bullets.iter().any(|b| trimmed.starts_with(b));

            if starts_with_bullet {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    severity: config.severity.clone(),
                    message: "Use the li element".to_string(),
                    line: text.base.line,
                    col: text.base.col,
                    raw: text.base.raw.clone(),
                });
            }
        }

        violations
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use markuplint_core::mlast::{ElementType, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase, TextData};
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!(
            "../../../../packages/@markuplint/html-spec/index.json"
        ))
        .unwrap()
    }

    fn make_text_node(text: &str) -> DomArena {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let el_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "el".to_string(),
                raw: "<div>".to_string(),
                offset: 0,
                line: 1,
                col: 1,
                node_name: "div".to_string(),
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
        }));
        let text_id = builder.push(DomNode::Text(TextData {
            base: NodeBase {
                id: 0,
                uuid: "t".to_string(),
                raw: text.to_string(),
                offset: 0,
                line: 1,
                col: 6,
                node_name: "#text".to_string(),
                parent: Some(el_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 2,
            },
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(el_id) {
            e.base.id = el_id;
            e.base.children = vec![text_id];
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text_id) {
            t.base.id = text_id;
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![el_id];
        }
        builder.finish()
    }

    #[test]
    fn normal_text_no_violation() {
        let arena = make_text_node("Hello world");
        let s = spec();
        let rule = UseList;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }

    #[test]
    fn bullet_text_reported() {
        let arena = make_text_node("\u{2022} Item one");
        let s = spec();
        let rule = UseList;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Use the li element");
    }

    #[test]
    fn dash_text_reported() {
        let arena = make_text_node("- Item");
        let s = spec();
        let rule = UseList;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Use the li element");
    }

    #[test]
    fn asterisk_bullet_reported() {
        let arena = make_text_node("* Item one");
        let s = spec();
        let rule = UseList;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Use the li element");
    }

    #[test]
    fn whitespace_only_text_no_violation() {
        // Text node containing only spaces → no violation (whitespace text is skipped)
        let arena = make_text_node("   ");
        let s = spec();
        let rule = UseList;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }

    #[test]
    fn text_without_space_after_bullet_still_reported() {
        // Note: The TS implementation has spaceNeededBullets logic that skips "*hello"
        // (requires a space after *, -, +). The Rust implementation does not yet
        // differentiate, so "*hello" is still reported as a violation.
        let arena = make_text_node("*hello");
        let s = spec();
        let rule = UseList;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
    }
}
