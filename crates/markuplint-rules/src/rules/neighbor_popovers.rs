//! `neighbor-popovers` rule: no focusable or perceptible content between popover trigger and target.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::may_be_focusable::may_be_focusable;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `neighbor-popovers` rule.
pub struct NeighborPopovers;

impl Rule for NeighborPopovers {
    fn id(&self) -> &'static str {
        "neighbor-popovers"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if el.is_ghost {
                continue;
            }

            // Check if element is a popover trigger (popovertarget or commandfor with popover command)
            let target_id_str = helpers::get_attr_value(arena, node_id, "popovertarget").or_else(|| {
                let cmd = helpers::get_attr_value(arena, node_id, "command")?;
                let cmd_lower = cmd.to_ascii_lowercase();
                if matches!(cmd_lower.as_str(), "toggle-popover" | "show-popover" | "hide-popover") {
                    helpers::get_attr_value(arena, node_id, "commandfor")
                } else {
                    None
                }
            });

            let Some(target_id_str) = target_id_str else {
                continue;
            };

            if target_id_str.is_empty() {
                continue;
            }

            // Find the target element by id
            let target_node_id = find_element_by_id(arena, target_id_str);
            let Some(target_node_id) = target_node_id else {
                continue;
            };

            // Walk subsequent nodes in document order between trigger and target.
            // Build flat document-order list by DFS from document root, then
            // find nodes between trigger and target positions.
            let doc_order = build_document_order(arena);
            let trigger_idx = doc_order.iter().position(|&id| id == node_id);
            let target_idx = doc_order.iter().position(|&id| id == target_node_id);

            let (Some(t_idx), Some(tgt_idx)) = (trigger_idx, target_idx) else {
                continue;
            };

            if t_idx >= tgt_idx {
                continue;
            }

            for &sub_id in &doc_order[t_idx + 1..tgt_idx] {
                if has_perceptible_content(arena, spec, sub_id) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: "Detected perceptible content between trigger and target".to_string(),
                        line: el.base.line,
                        col: el.base.col,
                        raw: el.base.raw.clone(),
                        reason: None,
                    });
                    break; // One violation per trigger
                }
            }
        }

        violations
    }
}

/// Build a flat list of node IDs in document order (DFS pre-order).
fn build_document_order(arena: &DomArena) -> Vec<NodeId> {
    let mut order = Vec::new();
    if let Some(doc) = arena.document() {
        let doc_id = match doc {
            DomNode::Document(d) => d.id,
            _ => return order,
        };
        dfs_collect(arena, doc_id, &mut order);
    }
    order
}

fn dfs_collect(arena: &DomArena, node_id: NodeId, order: &mut Vec<NodeId>) {
    order.push(node_id);
    if let Some(children) = arena.children_of(node_id) {
        for &child_id in children {
            dfs_collect(arena, child_id, order);
        }
    }
}

/// Find an element by its `id` attribute value.
fn find_element_by_id(arena: &DomArena, id: &str) -> Option<NodeId> {
    arena.elements().find_map(|(node_id, el)| {
        if helpers::get_attr_value_from_el(el, "id").is_some_and(|v| v == id) {
            Some(node_id)
        } else {
            None
        }
    })
}

/// Check if a node (or its descendants) has perceptible content:
/// focusable elements or non-whitespace text.
fn has_perceptible_content(arena: &DomArena, spec: &MLMLSpec, node_id: NodeId) -> bool {
    let Some(node) = arena.get(node_id) else {
        return false;
    };

    match node {
        DomNode::Text(text) => {
            // Non-whitespace text is perceptible
            !text.base.raw.trim().is_empty()
        }
        DomNode::Element(el) => {
            // Focusable elements are perceptible
            if may_be_focusable(spec, arena, node_id) {
                return true;
            }
            // Check if element itself has non-empty text content in children
            if let Some(children) = arena.children_of(node_id) {
                for &child_id in children {
                    if has_perceptible_content(arena, spec, child_id) {
                        return true;
                    }
                }
            }
            // Element with visible content (e.g., <img>)
            let tag = el.base.node_name.to_ascii_lowercase();
            matches!(tag.as_str(), "img" | "svg" | "video" | "audio" | "canvas" | "iframe")
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTHTMLAttr, MLASTToken, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, ElementData, NodeBase, TextData};
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    fn empty_token() -> MLASTToken {
        MLASTToken {
            uuid: String::new(),
            raw: String::new(),
            offset: 0,
            line: 1,
            col: 1,
        }
    }

    fn make_attr(name: &str, value: &str) -> MLASTAttr {
        MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
            uuid: String::new(),
            raw: format!("{name}=\"{value}\""),
            offset: 0,
            line: 1,
            col: 1,
            node_name: name.to_string(),
            spaces_before_name: empty_token(),
            name: MLASTToken {
                raw: name.to_string(),
                ..empty_token()
            },
            spaces_before_equal: empty_token(),
            equal: MLASTToken {
                raw: "=".to_string(),
                ..empty_token()
            },
            spaces_after_equal: empty_token(),
            start_quote: MLASTToken {
                raw: "\"".to_string(),
                ..empty_token()
            },
            value: MLASTToken {
                raw: value.to_string(),
                ..empty_token()
            },
            end_quote: MLASTToken {
                raw: "\"".to_string(),
                ..empty_token()
            },
            is_dynamic_value: None,
            is_directive: None,
            potential_name: None,
            potential_value: None,
            value_type: None,
            candidate: None,
            is_duplicatable: false,
        }))
    }

    fn make_element_data(tag: &str, attrs: Vec<MLASTAttr>, line: u32) -> ElementData {
        ElementData {
            base: NodeBase {
                id: 0,
                uuid: String::new(),
                raw: format!("<{tag}>"),
                offset: 0,
                line,
                col: 1,
                node_name: tag.to_string(),
                parent: None,
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: attrs,
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
    fn no_content_between_trigger_and_target() {
        // <button popovertarget="pop">Trigger</button><div id="pop" popover>Content</div>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let btn_id = builder.push(DomNode::Element(make_element_data(
            "button",
            vec![make_attr("popovertarget", "pop")],
            1,
        )));
        let div_id = builder.push(DomNode::Element(make_element_data(
            "div",
            vec![make_attr("id", "pop"), make_attr("popover", "")],
            2,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(btn_id) {
            e.base.id = btn_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(div_id) {
            e.base.id = div_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![btn_id, div_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NeighborPopovers;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn text_between_trigger_and_target_violation() {
        // <button popovertarget="pop">Trigger</button>Some text<div id="pop" popover>Content</div>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let btn_id = builder.push(DomNode::Element(make_element_data(
            "button",
            vec![make_attr("popovertarget", "pop")],
            1,
        )));
        let text_id = builder.push(DomNode::Text(TextData {
            base: NodeBase {
                id: 0,
                uuid: "text-1".to_string(),
                raw: "Some text".to_string(),
                offset: 0,
                line: 1,
                col: 40,
                node_name: "#text".to_string(),
                parent: Some(doc_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
            is_bogus: false,
        }));
        let div_id = builder.push(DomNode::Element(make_element_data(
            "div",
            vec![make_attr("id", "pop"), make_attr("popover", "")],
            2,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(btn_id) {
            e.base.id = btn_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text_id) {
            t.base.id = text_id;
            t.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(div_id) {
            e.base.id = div_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![btn_id, text_id, div_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NeighborPopovers;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Detected perceptible content between trigger and target"
        );
    }

    #[test]
    fn focusable_element_between_trigger_and_target_violation() {
        // <button popovertarget="pop">Trigger</button><a href="/">Link</a><div id="pop" popover>Content</div>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let btn_id = builder.push(DomNode::Element(make_element_data(
            "button",
            vec![make_attr("popovertarget", "pop")],
            1,
        )));
        let link_id = builder.push(DomNode::Element(make_element_data(
            "a",
            vec![make_attr("href", "/")],
            1,
        )));
        let div_id = builder.push(DomNode::Element(make_element_data(
            "div",
            vec![make_attr("id", "pop"), make_attr("popover", "")],
            2,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(btn_id) {
            e.base.id = btn_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(link_id) {
            e.base.id = link_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(div_id) {
            e.base.id = div_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![btn_id, link_id, div_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NeighborPopovers;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Detected perceptible content between trigger and target"
        );
    }

    #[test]
    fn whitespace_between_trigger_and_target_no_violation() {
        // <button popovertarget="pop">Trigger</button>   <div id="pop" popover>Content</div>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let btn_id = builder.push(DomNode::Element(make_element_data(
            "button",
            vec![make_attr("popovertarget", "pop")],
            1,
        )));
        let text_id = builder.push(DomNode::Text(TextData {
            base: NodeBase {
                id: 0,
                uuid: "ws-1".to_string(),
                raw: "   ".to_string(),
                offset: 0,
                line: 1,
                col: 40,
                node_name: "#text".to_string(),
                parent: Some(doc_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
            is_bogus: false,
        }));
        let div_id = builder.push(DomNode::Element(make_element_data(
            "div",
            vec![make_attr("id", "pop"), make_attr("popover", "")],
            2,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(btn_id) {
            e.base.id = btn_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text_id) {
            t.base.id = text_id;
            t.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(div_id) {
            e.base.id = div_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![btn_id, text_id, div_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NeighborPopovers;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
