//! `no-hard-code-id` rule: reports hard-coded `id` attributes in fragment documents.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct NoHardCodeId;

impl Rule for NoHardCodeId {
    fn id(&self) -> &'static str {
        "no-hard-code-id"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let is_fragment = match arena.document() {
            Some(DomNode::Document(doc)) => doc.is_fragment,
            _ => return vec![],
        };
        if !is_fragment {
            return vec![];
        }

        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                if html_attr.is_dynamic_value == Some(true) {
                    continue;
                }

                if html_attr.node_name.eq_ignore_ascii_case("id") {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: "It is hard-coded".to_string(),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.raw.clone(),
                        reason: None,
                    });
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
    use crate::rules::attr_duplication::tests::make_element_with_attrs;
    use crate::violation::Severity;
    use markuplint_core::mlast::{ElementType, MLASTHTMLAttr, MLASTToken, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};
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

    fn make_non_fragment_arena(tag: &str, attrs: &[(&str, &str)]) -> DomArena {
        let attributes: Vec<markuplint_core::mlast::MLASTAttr> = attrs
            .iter()
            .map(|(name, value)| {
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
            })
            .collect();

        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: false, // NOT a fragment
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
            attributes,
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
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![el_id];
        }
        builder.finish()
    }

    #[test]
    fn fragment_with_hard_coded_id() {
        // make_element_with_attrs creates fragment documents
        let arena = make_element_with_attrs("div", &[("id", "my-id")]);
        let s = spec();
        let rule = NoHardCodeId;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "It is hard-coded");
    }

    #[test]
    fn non_fragment_no_violation() {
        let arena = make_non_fragment_arena("div", &[("id", "my-id")]);
        let s = spec();
        let rule = NoHardCodeId;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn fragment_without_id_no_violation() {
        let arena = make_element_with_attrs("div", &[("class", "foo")]);
        let s = spec();
        let rule = NoHardCodeId;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn fragment_with_dynamic_id_no_violation() {
        // A fragment document with id="foo" but is_dynamic_value=true — should NOT report
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
            attributes: vec![MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                uuid: String::new(),
                raw: "id=\"foo\"".to_string(),
                offset: 0,
                line: 1,
                col: 1,
                node_name: "id".to_string(),
                spaces_before_name: empty_token(),
                name: MLASTToken {
                    raw: "id".to_string(),
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
                    raw: "foo".to_string(),
                    ..empty_token()
                },
                end_quote: MLASTToken {
                    raw: "\"".to_string(),
                    ..empty_token()
                },
                is_dynamic_value: Some(true),
                is_directive: None,
                potential_name: None,
                potential_value: None,
                value_type: None,
                candidate: None,
                is_duplicatable: false,
            }))],
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
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![el_id];
        }
        let arena = builder.finish();
        let s = spec();
        let rule = NoHardCodeId;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
