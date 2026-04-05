//! `no-consecutive-br` rule: reports consecutive `<br>` elements.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `no-consecutive-br` rule.
pub struct NoConsecutiveBr;

impl Rule for NoConsecutiveBr {
    fn id(&self) -> &'static str {
        "no-consecutive-br"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if !el.base.node_name.eq_ignore_ascii_case("br") {
                continue;
            }

            // Walk next siblings, skipping whitespace-only text
            let mut next_id = el.base.next_sibling;
            while let Some(sid) = next_id {
                match arena.get(sid) {
                    Some(DomNode::Text(t)) if t.base.raw.trim().is_empty() => {
                        next_id = t.base.next_sibling;
                    }
                    _ => break,
                }
            }

            if let Some(sid) = next_id
                && let Some(DomNode::Element(next_el)) = arena.get(sid)
                && next_el.base.node_name.eq_ignore_ascii_case("br")
            {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: "Consecutive br elements detected".to_string(),
                    line: next_el.base.line,
                    col: next_el.base.col,
                    raw: next_el.base.raw.clone(),
                    reason: None,
                });
            }
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
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase, TextData};
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    fn make_br(id_placeholder: usize, line: u32, col: u32) -> ElementData {
        ElementData {
            base: NodeBase {
                id: id_placeholder,
                uuid: format!("br-{id_placeholder}"),
                raw: "<br>".to_string(),
                offset: 0,
                line,
                col,
                node_name: "br".to_string(),
                parent: None,
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
        }
    }

    #[test]
    fn no_consecutive_br() {
        // <div><br><span></span><br></div> — not consecutive
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let br1_id = builder.push(DomNode::Element(make_br(0, 1, 1)));
        let span_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "span".to_string(),
                raw: "<span>".to_string(),
                offset: 0,
                line: 1,
                col: 5,
                node_name: "span".to_string(),
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
        let br2_id = builder.push(DomNode::Element(make_br(0, 1, 20)));

        // Wire up siblings
        if let Some(DomNode::Element(e)) = builder.get_mut(br1_id) {
            e.base.id = br1_id;
            e.base.parent = Some(doc_id);
            e.base.next_sibling = Some(span_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(span_id) {
            e.base.id = span_id;
            e.base.prev_sibling = Some(br1_id);
            e.base.next_sibling = Some(br2_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(br2_id) {
            e.base.id = br2_id;
            e.base.parent = Some(doc_id);
            e.base.prev_sibling = Some(span_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![br1_id, span_id, br2_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NoConsecutiveBr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn consecutive_br_detected() {
        // <br><br> — consecutive
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let br1_id = builder.push(DomNode::Element(make_br(0, 1, 1)));
        let br2_id = builder.push(DomNode::Element(make_br(0, 1, 5)));

        if let Some(DomNode::Element(e)) = builder.get_mut(br1_id) {
            e.base.id = br1_id;
            e.base.parent = Some(doc_id);
            e.base.next_sibling = Some(br2_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(br2_id) {
            e.base.id = br2_id;
            e.base.parent = Some(doc_id);
            e.base.prev_sibling = Some(br1_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![br1_id, br2_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NoConsecutiveBr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Consecutive br elements detected");
    }

    #[test]
    fn consecutive_br_with_whitespace_between() {
        // <br>  \n  <br> — whitespace text between, still consecutive
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let br1_id = builder.push(DomNode::Element(make_br(0, 1, 1)));
        let text_id = builder.push(DomNode::Text(TextData {
            base: NodeBase {
                id: 0,
                uuid: "ws".to_string(),
                raw: "  \n  ".to_string(),
                offset: 0,
                line: 1,
                col: 5,
                node_name: "#text".to_string(),
                parent: Some(doc_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
            is_bogus: false,
        }));
        let br2_id = builder.push(DomNode::Element(make_br(0, 2, 3)));

        if let Some(DomNode::Element(e)) = builder.get_mut(br1_id) {
            e.base.id = br1_id;
            e.base.parent = Some(doc_id);
            e.base.next_sibling = Some(text_id);
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text_id) {
            t.base.id = text_id;
            t.base.prev_sibling = Some(br1_id);
            t.base.next_sibling = Some(br2_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(br2_id) {
            e.base.id = br2_id;
            e.base.parent = Some(doc_id);
            e.base.prev_sibling = Some(text_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![br1_id, text_id, br2_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NoConsecutiveBr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Consecutive br elements detected");
    }

    #[test]
    fn br_followed_by_non_br_element_no_violation() {
        // <p><br><span>text</span></p> — br followed by non-br element, no violation
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let p_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "p".to_string(),
                raw: "<p>".to_string(),
                offset: 0,
                line: 1,
                col: 1,
                node_name: "p".to_string(),
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
        let br_id = builder.push(DomNode::Element(make_br(0, 1, 4)));
        let span_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "span".to_string(),
                raw: "<span>".to_string(),
                offset: 0,
                line: 1,
                col: 8,
                node_name: "span".to_string(),
                parent: Some(p_id),
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

        // Wire up siblings: br -> span
        if let Some(DomNode::Element(e)) = builder.get_mut(p_id) {
            e.base.id = p_id;
            e.base.children = vec![br_id, span_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(br_id) {
            e.base.id = br_id;
            e.base.parent = Some(p_id);
            e.base.next_sibling = Some(span_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(span_id) {
            e.base.id = span_id;
            e.base.parent = Some(p_id);
            e.base.prev_sibling = Some(br_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![p_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NoConsecutiveBr;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
