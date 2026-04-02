//! `label-has-control` rule: `<label>` elements must be associated with form controls.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `label-has-control` rule.
pub struct LabelHasControl;

/// Form control element names that can be associated with a label.
const FORM_CONTROLS: &[&str] = &["input", "select", "textarea", "button", "output", "meter", "progress"];

impl Rule for LabelHasControl {
    fn id(&self) -> &'static str {
        "label-has-control"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if !el.base.node_name.eq_ignore_ascii_case("label") {
                continue;
            }

            // Check for `for` attribute
            let for_value = el.attributes.iter().find_map(|attr| {
                if let MLASTAttr::HTMLAttr(html_attr) = attr
                    && html_attr.node_name.eq_ignore_ascii_case("for")
                {
                    return Some(html_attr.value.raw.clone());
                }
                None
            });

            if let Some(for_id) = for_value {
                // Check if an element with that id exists
                if !for_id.is_empty() && id_exists_in_document(arena, &for_id) {
                    continue; // associated via for attribute
                }
            } else {
                // No `for` attribute — check if label contains a form control
                if contains_form_control(arena, el.base.id) {
                    continue;
                }
            }

            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity.clone(),
                message: "The label element should associate with a control".to_string(),
                line: el.base.line,
                col: el.base.col,
                raw: el.base.raw.clone(),
            });
        }

        violations
    }
}

/// Check if any element in the document has the given id.
fn id_exists_in_document(arena: &DomArena, target_id: &str) -> bool {
    arena.elements().any(|(_node_id, el)| {
        el.attributes.iter().any(|attr| {
            if let MLASTAttr::HTMLAttr(html_attr) = attr {
                html_attr.node_name.eq_ignore_ascii_case("id") && html_attr.value.raw == target_id
            } else {
                false
            }
        })
    })
}

/// Recursively check if a node contains a form control descendant.
fn contains_form_control(arena: &DomArena, node_id: usize) -> bool {
    if let Some(children) = arena.children_of(node_id) {
        for &child_id in children {
            if let Some(DomNode::Element(child_el)) = arena.get(child_id) {
                if FORM_CONTROLS
                    .iter()
                    .any(|c| child_el.base.node_name.eq_ignore_ascii_case(c))
                {
                    return true;
                }
                if contains_form_control(arena, child_id) {
                    return true;
                }
            }
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use markuplint_core::mlast::{ElementType, MLASTHTMLAttr, MLASTToken, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};
    use markuplint_types::spec::load_spec;
    use markuplint_types::spec::types::MLMLSpec;

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

    fn make_attr(name: &str, value: &str) -> markuplint_core::mlast::MLASTAttr {
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
                line: 1,
                col: 1,
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

    fn make_element(tag: &str, attrs: Vec<markuplint_core::mlast::MLASTAttr>, line: u32) -> ElementData {
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
    fn label_with_for_and_matching_id() {
        // <label for="name">Name</label><input id="name">
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let label_id = builder.push(DomNode::Element(make_element(
            "label",
            vec![make_attr("for", "name")],
            1,
        )));
        let input_id = builder.push(DomNode::Element(make_element(
            "input",
            vec![make_attr("id", "name")],
            2,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(label_id) {
            e.base.id = label_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(input_id) {
            e.base.id = input_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![label_id, input_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = LabelHasControl;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn label_with_for_no_matching_id() {
        // <label for="name">Name</label>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let label_id = builder.push(DomNode::Element(make_element(
            "label",
            vec![make_attr("for", "name")],
            1,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(label_id) {
            e.base.id = label_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![label_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = LabelHasControl;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "The label element should associate with a control"
        );
    }

    #[test]
    fn label_wrapping_input() {
        // <label><input></label>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let label_id = builder.push(DomNode::Element(make_element("label", vec![], 1)));
        let input_id = builder.push(DomNode::Element(make_element("input", vec![], 1)));

        if let Some(DomNode::Element(e)) = builder.get_mut(label_id) {
            e.base.id = label_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![input_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(input_id) {
            e.base.id = input_id;
            e.base.parent = Some(label_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![label_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = LabelHasControl;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn label_with_empty_for_violation() {
        // <label for=""></label> → violation (empty for doesn't match anything)
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let label_id = builder.push(DomNode::Element(make_element("label", vec![make_attr("for", "")], 1)));

        if let Some(DomNode::Element(e)) = builder.get_mut(label_id) {
            e.base.id = label_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![label_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = LabelHasControl;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "The label element should associate with a control"
        );
    }

    #[test]
    fn label_without_control_or_for() {
        // <label>No control here</label>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let label_id = builder.push(DomNode::Element(make_element("label", vec![], 1)));

        if let Some(DomNode::Element(e)) = builder.get_mut(label_id) {
            e.base.id = label_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![label_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = LabelHasControl;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "The label element should associate with a control"
        );
    }
}
