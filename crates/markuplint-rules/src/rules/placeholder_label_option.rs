//! `placeholder-label-option` rule: required `<select>` must have placeholder label option.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `placeholder-label-option` rule.
pub struct PlaceholderLabelOption;

impl Rule for PlaceholderLabelOption {
    fn id(&self) -> &'static str {
        "placeholder-label-option"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if !el.base.node_name.eq_ignore_ascii_case("select") {
                continue;
            }

            // Check if select has required attribute
            let has_required = el.attributes.iter().any(|attr| {
                if let MLASTAttr::HTMLAttr(html_attr) = attr {
                    html_attr.node_name.eq_ignore_ascii_case("required")
                } else {
                    false
                }
            });

            if !has_required {
                continue;
            }

            // Check first <option> child has value=""
            let has_placeholder = if let Some(children) = arena.children_of(el.base.id) {
                // Find the first <option> child
                children
                    .iter()
                    .find_map(|&child_id| {
                        if let Some(DomNode::Element(child_el)) = arena.get(child_id)
                            && child_el.base.node_name.eq_ignore_ascii_case("option")
                        {
                            return Some(child_el);
                        }
                        None
                    })
                    .is_some_and(|first_option| {
                        // Check if it has value=""
                        first_option.attributes.iter().any(|attr| {
                            if let MLASTAttr::HTMLAttr(html_attr) = attr {
                                html_attr.node_name.eq_ignore_ascii_case("value") && html_attr.value.raw.is_empty()
                            } else {
                                false
                            }
                        })
                    })
            } else {
                false
            };

            if !has_placeholder {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity.clone(),
                    message: "Need the placeholder label option".to_string(),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
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
            raw: if value.is_empty() && name == "required" {
                name.to_string()
            } else {
                format!("{name}=\"{value}\"")
            },
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
    fn required_select_with_placeholder_no_violation() {
        // <select required><option value="">Choose</option></select>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let select_id = builder.push(DomNode::Element(make_element(
            "select",
            vec![make_attr("required", "")],
            1,
        )));
        let option_id = builder.push(DomNode::Element(make_element(
            "option",
            vec![make_attr("value", "")],
            2,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(select_id) {
            e.base.id = select_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![option_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(option_id) {
            e.base.id = option_id;
            e.base.parent = Some(select_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![select_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = PlaceholderLabelOption;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn required_select_without_placeholder_reported() {
        // <select required><option value="a">A</option></select>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let select_id = builder.push(DomNode::Element(make_element(
            "select",
            vec![make_attr("required", "")],
            1,
        )));
        let option_id = builder.push(DomNode::Element(make_element(
            "option",
            vec![make_attr("value", "a")],
            2,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(select_id) {
            e.base.id = select_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![option_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(option_id) {
            e.base.id = option_id;
            e.base.parent = Some(select_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![select_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = PlaceholderLabelOption;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Need the placeholder label option");
    }

    #[test]
    fn required_select_no_children_reported() {
        // <select required></select> with zero children → violation
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let select_id = builder.push(DomNode::Element(make_element(
            "select",
            vec![make_attr("required", "")],
            1,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(select_id) {
            e.base.id = select_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![];
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![select_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = PlaceholderLabelOption;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Need the placeholder label option");
    }

    #[test]
    fn required_select_option_without_value_reported() {
        // <select required><option>Choose</option></select> where option has no value attribute → violation
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let select_id = builder.push(DomNode::Element(make_element(
            "select",
            vec![make_attr("required", "")],
            1,
        )));
        let option_id = builder.push(DomNode::Element(make_element("option", vec![], 2)));

        if let Some(DomNode::Element(e)) = builder.get_mut(select_id) {
            e.base.id = select_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![option_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(option_id) {
            e.base.id = option_id;
            e.base.parent = Some(select_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![select_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = PlaceholderLabelOption;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Need the placeholder label option");
    }

    #[test]
    fn non_required_select_no_violation() {
        // <select><option value="a">A</option></select>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let select_id = builder.push(DomNode::Element(make_element("select", vec![], 1)));
        let option_id = builder.push(DomNode::Element(make_element(
            "option",
            vec![make_attr("value", "a")],
            2,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(select_id) {
            e.base.id = select_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![option_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(option_id) {
            e.base.id = option_id;
            e.base.parent = Some(select_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![select_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = PlaceholderLabelOption;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
