//! `require-adjacent-popover` rule: no perceptible node between a popover trigger and its target.
//!
//! The target is looked for in the tree of the trigger ([`Trees`]), so the triggers of every tree
//! are checked, and what is in another tree (the content of a `template` element) is not between
//! the trigger and the target (TS `findSubsequentNodes`).

use markuplint_core::i18n::Primitive as Kw;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::accname::get_accname;
use crate::aria::may_be_focusable::may_be_focusable;
use crate::aria_check::{is_js_whitespace, resolve_aria_version};
use crate::rule::{Rule, RuleConfigSet};
use crate::tree_scope::{Trees, is_expression};
use crate::violation::Violation;

/// Command values from the Invoker Commands API that relate to popover behavior. Comparison is
/// case-insensitive per the HTML spec.
const POPOVER_COMMANDS: [&str; 3] = ["toggle-popover", "show-popover", "hide-popover"];

pub struct RequireAdjacentPopover;

impl Rule for RequireAdjacentPopover {
    fn id(&self) -> &'static str {
        "require-adjacent-popover"
    }

    fn default_severity(&self) -> crate::violation::Severity {
        crate::violation::Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        let tr = config.translator();
        let version = resolve_aria_version(&serde_json::Value::Null, config.common_settings());
        let trees = Trees::new(arena, spec);
        let mut document_order = Vec::new();
        dfs_collect(arena, 0, &mut document_order);

        for (node_id, el) in arena.elements() {
            if el.is_ghost {
                continue;
            }

            let popovertarget = helpers::get_attr_node_from_el(el, "popovertarget")
                .filter(|attr| !helpers::attr_value(attr).is_empty());
            let target_attr = popovertarget.or_else(|| {
                let command = helpers::get_attr_value_from_el(el, "command")?;
                if POPOVER_COMMANDS.contains(&command.to_ascii_lowercase().as_str()) {
                    helpers::get_attr_node_from_el(el, "commandfor")
                } else {
                    None
                }
            });
            let Some(target_attr) = target_attr else {
                continue;
            };
            let target_id = helpers::attr_value(target_attr);
            if target_id.is_empty() {
                continue;
            }
            let Some(target) = trees.element_by_id_in_tree(node_id, target_id, is_expression(target_attr)) else {
                continue;
            };
            if !helpers::has_attr(arena, target, "popover") {
                continue;
            }

            // TS `trigger.findSubsequentNodes()`: what follows the trigger in the markup, in its
            // tree, and is not in it
            let Some(index) = document_order.iter().position(|&id| id == node_id) else {
                continue;
            };
            let root = trees.root_of(node_id);
            for &sub_id in &document_order[index + 1..] {
                if trees.root_of(sub_id) != root || trees.contains(node_id, sub_id) {
                    continue;
                }
                if sub_id == target {
                    break;
                }
                if !is_perceptible(arena, spec, sub_id, version) {
                    continue;
                }
                let Some(base) = arena.get(sub_id).and_then(DomNode::base) else {
                    break;
                };
                let rule_config = config.get(sub_id);
                if !rule_config.disabled {
                    violations.push(Violation {
                        spec_conformance: None,
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: tr.finish(&tr.t(
                            "Detected {0} between {1} and {2}",
                            &[
                                Kw::S(&tr.t("perceptible nodes", &[])),
                                Kw::S(&tr.t("the {0}", &[Kw::S("trigger")])),
                                Kw::S(&tr.t("corresponding {0}", &[Kw::S("target")])),
                            ],
                        )),
                        line: base.line,
                        col: base.col,
                        raw: base.raw.clone(),
                        reason: rule_config.reason.clone(),
                        fix: None,
                    });
                }
                break;
            }
        }

        violations
    }
}

/// The nodes under `node_id` in the order of the markup, `node_id` first.
fn dfs_collect(arena: &DomArena, node_id: NodeId, order: &mut Vec<NodeId>) {
    order.push(node_id);
    if let Some(children) = arena.children_of(node_id) {
        for &child_id in children {
            dfs_collect(arena, child_id, order);
        }
    }
}

/// An element that has an accessible name or may be focusable, or a text node that has a character
/// other than whitespace.
fn is_perceptible(arena: &DomArena, spec: &MLMLSpec, node_id: NodeId, version: ARIAVersion) -> bool {
    match arena.get(node_id) {
        Some(DomNode::Element(_)) => {
            !get_accname(spec, arena, node_id, version).name.is_empty() || may_be_focusable(spec, arena, node_id)
        }
        Some(DomNode::Text(text)) => !text.base.raw.trim_matches(is_js_whitespace).is_empty(),
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
            is_expression_value: None,
            is_absent: None,
            literal_expression: None,
            is_directive: None,
            potential_name: None,
            potential_value: None,
            value_type: None,
            candidate: None,
            is_duplicatable: false,
            name_fold: None,
            directive_key: None,
        }))
    }

    fn make_element_data(tag: &str, attrs: Vec<MLASTAttr>, line: u32) -> ElementData {
        ElementData {
            pretender_context: None,
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
        let rule = RequireAdjacentPopover;
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
        let rule = RequireAdjacentPopover;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Detected perceptible nodes between the trigger and corresponding target"
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
        let rule = RequireAdjacentPopover;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Detected perceptible nodes between the trigger and corresponding target"
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
        let rule = RequireAdjacentPopover;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
