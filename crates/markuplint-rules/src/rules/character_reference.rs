//! `character-reference` rule: special characters should be escaped as character references.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;
use regex::Regex;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `character-reference` rule.
pub struct CharacterReference;

/// Characters that must be escaped in HTML text and attribute values.
const DEFAULT_CHARS: &[char] = &['"', '&', '<', '>'];

/// Parent elements whose text content is exempt (raw text elements).
const IGNORE_PARENTS: &[&str] = &["script", "style"];

impl Rule for CharacterReference {
    fn id(&self) -> &'static str {
        "character-reference"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let config = config.global();
        let mut violations = Vec::new();

        // Regex to match valid character references: &name; or &#digits; or &#xhex;
        let entity_re = Regex::new(r"&(?:[a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#x[0-9a-fA-F]+);").expect("valid regex");

        for node in arena.descendants(0) {
            let DomNode::Text(text) = node else {
                continue;
            };

            // Skip text inside script/style
            if let Some(parent_id) = text.base.parent
                && let Some(DomNode::Element(parent_el)) = arena.get(parent_id)
                && IGNORE_PARENTS
                    .iter()
                    .any(|p| parent_el.base.node_name.eq_ignore_ascii_case(p))
            {
                continue;
            }

            let raw = &text.base.raw;

            // Replace valid entity references with placeholder characters
            let escaped = entity_re.replace_all(raw, |caps: &regex::Captures| "*".repeat(caps[0].len()));

            // Check each character position for illegal characters
            let mut line = text.base.line;
            let mut col = text.base.col;

            for ch in escaped.chars() {
                if DEFAULT_CHARS.contains(&ch) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: config.severity.clone(),
                        message: "Illegal characters must escape in character reference".to_string(),
                        line,
                        col,
                        raw: ch.to_string(),
                    });
                }
                if ch == '\n' {
                    line += 1;
                    col = 1;
                } else {
                    col += 1;
                }
            }
        }

        violations
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use markuplint_core::mlast::{ElementType, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase, TextData};
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    fn make_text_in_element(tag: &str, text: &str) -> DomArena {
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
                raw: format!("<{tag}>"),
                offset: 0,
                line: 1,
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
        let text_id = builder.push(DomNode::Text(TextData {
            base: NodeBase {
                id: 0,
                uuid: "t".to_string(),
                raw: text.to_string(),
                offset: 0,
                line: 1,
                col: tag.len() as u32 + 3, // after <tag>
                node_name: "#text".to_string(),
                parent: Some(el_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 2,
            },
            is_bogus: false,
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
        let arena = make_text_in_element("p", "Hello world");
        let s = spec();
        let rule = CharacterReference;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn unescaped_ampersand_reported() {
        let arena = make_text_in_element("p", "A & B");
        let s = spec();
        let rule = CharacterReference;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert!(violations[0].message.contains("Illegal characters must escape"));
    }

    #[test]
    fn valid_entity_no_violation() {
        let arena = make_text_in_element("p", "A &amp; B");
        let s = spec();
        let rule = CharacterReference;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn script_text_ignored() {
        let arena = make_text_in_element("script", "if (a < b && c > d) {}");
        let s = spec();
        let rule = CharacterReference;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn multiple_illegal_chars() {
        let arena = make_text_in_element("p", "a < b");
        let s = spec();
        let rule = CharacterReference;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert!(violations[0].message.contains("Illegal characters must escape"));
    }

    #[test]
    fn greater_than_in_text_reported() {
        // Text containing `>` → violation
        let arena = make_text_in_element("p", "a > b");
        let s = spec();
        let rule = CharacterReference;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert!(violations[0].message.contains("Illegal characters must escape"));
        assert_eq!(violations[0].raw, ">");
    }

    #[test]
    fn numeric_character_reference_no_violation() {
        let arena = make_text_in_element("p", "&#9660;");
        let s = spec();
        let rule = CharacterReference;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
