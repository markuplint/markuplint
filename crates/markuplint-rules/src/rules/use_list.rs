//! `use-list` rule: suggest using `<li>` elements instead of text with bullet characters.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `use-list` rule.
pub struct UseList;

/// Default bullet-like characters that suggest list semantics.
/// Matches the TS `defaultValue` in `use-list/index.ts`.
const DEFAULT_BULLETS: &[&str] = &[
    "\u{2022}", // • BULLET
    "\u{2023}", // ‣ TRIANGULAR BULLET
    "\u{2043}", // ⁃ HYPHEN BULLET
    "\u{204C}", // ⁌ BLACK LEFTWARDS BULLET
    "\u{204D}", // ⁍ BLACK RIGHTWARDS BULLET
    "\u{2219}", // ∙ BULLET OPERATOR
    "\u{25CB}", // ○ WHITE CIRCLE
    "\u{25CF}", // ● BLACK CIRCLE
    "\u{25D8}", // ◘ INVERSE BULLET
    "\u{25E6}", // ◦ WHITE BULLET
    "\u{2619}", // ☙ REVERSED ROTATED FLORAL HEART BULLET
    "\u{2765}", // ❥ ROTATED HEAVY BLACK HEART BULLET
    "\u{2767}", // ❧ ROTATED FLORAL HEART BULLET
    "\u{29BE}", // ⦾ CIRCLED WHITE BULLET
    "\u{29BF}", // ⦿ CIRCLED BULLET
    "\u{00B7}", // · MIDDLE DOT (Japanese)
    "\u{0387}", // · GREEK ANO TELIA
    "\u{22C5}", // ⋅ DOT OPERATOR
    "\u{30FB}", // ・ KATAKANA MIDDLE DOT
    "\u{FF65}", // ・ HALFWIDTH KATAKANA MIDDLE DOT
    "-", "*", "+",
];

/// Bullets that require a trailing space to be recognized as list markers.
/// Matches the TS `defaultOptions.spaceNeededBullets`.
const SPACE_NEEDED_BULLETS: &[&str] = &["-", "*", "+"];

impl Rule for UseList {
    fn id(&self) -> &'static str {
        "use-list"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let global = config.global();
        // Collect additional bullets from config value
        let mut bullets: Vec<&str> = DEFAULT_BULLETS.to_vec();
        let extra_owned: Vec<String>;
        if let serde_json::Value::Array(arr) = &global.value {
            extra_owned = arr.iter().filter_map(|v| v.as_str().map(String::from)).collect();
            for s in &extra_owned {
                bullets.push(s.as_str());
            }
        }

        // Read spaceNeededBullets from options (default: ["-", "*", "+"])
        let space_needed_owned: Vec<String> = global
            .options
            .get("spaceNeededBullets")
            .and_then(serde_json::Value::as_array)
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default();
        let space_needed: Vec<&str> = if space_needed_owned.is_empty() {
            SPACE_NEEDED_BULLETS.to_vec()
        } else {
            space_needed_owned.iter().map(String::as_str).collect()
        };

        // Read sibling-filter options
        let no_prev = global
            .options
            .get("noPrev")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true);
        let prev_element = global
            .options
            .get("prevElement")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true);
        let prev_comment = global
            .options
            .get("prevComment")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true);
        let prev_code_block = global
            .options
            .get("prevCodeBlock")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false);

        let mut violations = Vec::new();

        for node in arena.descendants(0) {
            let DomNode::Text(text) = node else {
                continue;
            };

            let trimmed = text.base.raw.trim();
            if trimmed.is_empty() {
                continue;
            }

            // Single character only → skip (TS: text.length === 1)
            let chars: Vec<char> = trimmed.chars().collect();
            if chars.len() == 1 {
                continue;
            }

            // Check previous sibling filters
            let text_node_id = text.base.id;
            let prev = arena.prev_sibling(text_node_id);
            if !no_prev && prev.is_none() {
                continue;
            }
            if let Some(prev_node) = prev {
                if !prev_element && prev_node.as_element().is_some() {
                    continue;
                }
                if !prev_comment && matches!(prev_node, DomNode::Comment(_)) {
                    continue;
                }
                if !prev_code_block && matches!(prev_node, DomNode::PSBlock(_)) {
                    continue;
                }
            }

            if !is_may_list_item(trimmed, &bullets, &space_needed) {
                continue;
            }

            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: global.severity,
                message: "Use the li element".to_string(),
                line: text.base.line,
                col: text.base.col,
                raw: text.base.raw.clone(),
            });
        }

        violations
    }
}

/// Determines whether a text string appears to be a list item.
///
/// Matches TS `isMayListItem()`:
/// - Consecutive identical chars (e.g., `--`) → not a list item
/// - Space-needed bullets (e.g., `-`, `*`, `+`) require whitespace after → `- item` yes, `-item` no
/// - Other bullets → always match
fn is_may_list_item(text: &str, bullets: &[&str], space_needed_bullets: &[&str]) -> bool {
    let matched_bullet = bullets.iter().find(|b| text.starts_with(**b));
    let Some(bullet) = matched_bullet else {
        return false;
    };

    let after_bullet = &text[bullet.len()..];
    let chars_after: Vec<char> = after_bullet.chars().collect();

    // Consecutive identical characters (e.g., `--`, `**`) → not a list item
    if let Some(first_after) = chars_after.first() {
        let bullet_chars: Vec<char> = bullet.chars().collect();
        if bullet_chars.last().is_some_and(|last| first_after == last) {
            return false;
        }
    }

    // Space-needed bullets require whitespace after
    if space_needed_bullets.contains(bullet) {
        return chars_after.first().is_some_and(|c| c.is_whitespace());
    }

    true
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
            close_tag: None,
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
        let arena = make_text_node("Hello world");
        let s = spec();
        let rule = UseList;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn bullet_text_reported() {
        let arena = make_text_node("\u{2022} Item one");
        let s = spec();
        let rule = UseList;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Use the li element");
    }

    #[test]
    fn dash_text_reported() {
        let arena = make_text_node("- Item");
        let s = spec();
        let rule = UseList;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Use the li element");
    }

    #[test]
    fn asterisk_bullet_reported() {
        let arena = make_text_node("* Item one");
        let s = spec();
        let rule = UseList;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Use the li element");
    }

    #[test]
    fn whitespace_only_text_no_violation() {
        // Text node containing only spaces → no violation (whitespace text is skipped)
        let arena = make_text_node("   ");
        let s = spec();
        let rule = UseList;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn space_needed_bullet_without_space_no_violation() {
        // TS: spaceNeededBullets ["-", "*", "+"] require whitespace after bullet
        // "*hello" → no violation (no space after *)
        let arena = make_text_node("*hello");
        let s = spec();
        let rule = UseList;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn consecutive_dashes_no_violation() {
        // TS: consecutive identical chars (e.g., "--") → not a list item
        let arena = make_text_node("-- separator");
        let s = spec();
        let rule = UseList;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn single_bullet_char_only_no_violation() {
        // TS: text.length === 1 → skip
        let arena = make_text_node("\u{2022}");
        let s = spec();
        let rule = UseList;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn custom_space_needed_bullets() {
        // With spaceNeededBullets: [">"], ">" should need space after it
        // "> item" should match, ">item" should not
        let arena = make_text_node("> item");
        let s = spec();
        let rule = UseList;
        let config = RuleConfig {
            value: serde_json::json!(["-", "*", "+", ">"]),
            options: serde_json::json!({ "spaceNeededBullets": [">"] }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations.len(), 1);

        // ">item" should NOT match (no space after >)
        let arena2 = make_text_node(">item");
        let config2 = RuleConfig {
            value: serde_json::json!(["-", "*", "+", ">"]),
            options: serde_json::json!({ "spaceNeededBullets": [">"] }),
            ..Default::default()
        };
        let violations2 = rule.verify(&arena2, &s, &RuleConfigSet::global_only(config2));
        assert!(violations2.is_empty());
    }

    #[test]
    fn no_prev_false_skips_no_prev_sibling() {
        // When noPrev=false, text with no prev sibling should be skipped
        let arena = make_text_node("- Item");
        let s = spec();
        let rule = UseList;
        let config = RuleConfig {
            options: serde_json::json!({ "noPrev": false }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        // The text node has no prev sibling, so it should be skipped
        assert!(
            violations.is_empty(),
            "noPrev=false should skip text nodes with no previous sibling"
        );
    }

    #[test]
    fn prev_element_false_skips_element_prev() {
        // When prevElement=false, text with element prev sibling should be skipped
        // Build: <div><span></span>- Item</div>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let div_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "div".to_string(),
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
            close_tag: None,
        }));
        let span_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "span".to_string(),
                raw: "<span>".to_string(),
                offset: 0,
                line: 1,
                col: 6,
                node_name: "span".to_string(),
                parent: Some(div_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 2,
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
                raw: "- Item".to_string(),
                offset: 0,
                line: 1,
                col: 13,
                node_name: "#text".to_string(),
                parent: Some(div_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: Some(span_id),
                depth: 2,
            },
            is_bogus: false,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(div_id) {
            e.base.id = div_id;
            e.base.children = vec![span_id, text_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(span_id) {
            e.base.id = span_id;
            e.base.next_sibling = Some(text_id);
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text_id) {
            t.base.id = text_id;
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![div_id];
        }
        let arena = builder.finish();
        let s = spec();
        let rule = UseList;

        // Default: prevElement=true → violation reported
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1, "Default should report violation");

        // prevElement=false → no violation
        let config = RuleConfig {
            options: serde_json::json!({ "prevElement": false }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(
            violations.is_empty(),
            "prevElement=false should skip text nodes whose previous sibling is an Element"
        );
    }

    #[test]
    fn prev_comment_false_skips_comment_prev() {
        // Build: <div><!-- comment -->- Item</div>
        use markuplint_dom::node::CommentData;

        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let div_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "div".to_string(),
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
            close_tag: None,
        }));
        let comment_id = builder.push(DomNode::Comment(CommentData {
            base: NodeBase {
                id: 0,
                uuid: "c".to_string(),
                raw: "<!-- comment -->".to_string(),
                offset: 0,
                line: 1,
                col: 6,
                node_name: "#comment".to_string(),
                parent: Some(div_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 2,
            },
            is_bogus: false,
        }));
        let text_id = builder.push(DomNode::Text(TextData {
            base: NodeBase {
                id: 0,
                uuid: "t".to_string(),
                raw: "- Item".to_string(),
                offset: 0,
                line: 1,
                col: 22,
                node_name: "#text".to_string(),
                parent: Some(div_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: Some(comment_id),
                depth: 2,
            },
            is_bogus: false,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(div_id) {
            e.base.id = div_id;
            e.base.children = vec![comment_id, text_id];
        }
        if let Some(DomNode::Comment(c)) = builder.get_mut(comment_id) {
            c.base.id = comment_id;
            c.base.next_sibling = Some(text_id);
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text_id) {
            t.base.id = text_id;
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![div_id];
        }
        let arena = builder.finish();
        let s = spec();
        let rule = UseList;

        // Default: prevComment=true → violation
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1, "Default should report violation after comment");

        // prevComment=false → no violation
        let config = RuleConfig {
            options: serde_json::json!({ "prevComment": false }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(
            violations.is_empty(),
            "prevComment=false should skip text nodes whose previous sibling is a Comment"
        );
    }

    #[test]
    fn prev_code_block_false_skips_psblock_prev() {
        // Build: <div>{block}- Item</div>
        use markuplint_dom::node::PSBlockData;

        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let div_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "div".to_string(),
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
            close_tag: None,
        }));
        let psblock_id = builder.push(DomNode::PSBlock(PSBlockData {
            base: NodeBase {
                id: 0,
                uuid: "ps".to_string(),
                raw: "{block}".to_string(),
                offset: 0,
                line: 1,
                col: 6,
                node_name: "#ps:block".to_string(),
                parent: Some(div_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 2,
            },
            is_fragment: false,
            block_behavior: None,
            is_bogus: false,
        }));
        let text_id = builder.push(DomNode::Text(TextData {
            base: NodeBase {
                id: 0,
                uuid: "t".to_string(),
                raw: "- Item".to_string(),
                offset: 0,
                line: 1,
                col: 13,
                node_name: "#text".to_string(),
                parent: Some(div_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: Some(psblock_id),
                depth: 2,
            },
            is_bogus: false,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(div_id) {
            e.base.id = div_id;
            e.base.children = vec![psblock_id, text_id];
        }
        if let Some(DomNode::PSBlock(p)) = builder.get_mut(psblock_id) {
            p.base.id = psblock_id;
            p.base.next_sibling = Some(text_id);
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text_id) {
            t.base.id = text_id;
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![div_id];
        }
        let arena = builder.finish();
        let s = spec();
        let rule = UseList;

        // Default: prevCodeBlock=false → no violation (PSBlock prev is skipped by default)
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.is_empty(),
            "Default prevCodeBlock=false should skip text after PSBlock"
        );

        // prevCodeBlock=true → violation
        let config = RuleConfig {
            options: serde_json::json!({ "prevCodeBlock": true }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(
            violations.len(),
            1,
            "prevCodeBlock=true should report violation after PSBlock"
        );
    }
}
