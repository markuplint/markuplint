//! `attr-value-quotes` rule: attribute values must use consistent quote style.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `attr-value-quotes` rule.
pub struct AttrValueQuotes;

impl Rule for AttrValueQuotes {
    fn id(&self) -> &'static str {
        "attr-value-quotes"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let quote_style = config.global().value.as_str().unwrap_or("double");

        let (expected_quote, message) = match quote_style {
            "single" => ("'", "Attribute value is must use single quotation mark"),
            _ => ("\"", "Attribute value is must use double quotation mark"),
        };

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

                // Skip boolean attributes (no value, no quotes)
                if html_attr.value.raw.is_empty() && html_attr.start_quote.raw.is_empty() {
                    continue;
                }

                if html_attr.start_quote.raw != expected_quote {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity.clone(),
                        message: message.to_string(),
                        line: html_attr.name.line,
                        col: html_attr.name.col,
                        raw: html_attr.raw.clone(),
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
    use markuplint_core::mlast::{ElementType, MLASTHTMLAttr, MLASTToken, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};
    use markuplint_types::spec::load_spec;
    use serde_json::Value;

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

    fn make_element_with_quote(
        tag: &str,
        attr_name: &str,
        attr_value: &str,
        start_quote: &str,
        end_quote: &str,
    ) -> DomArena {
        let attributes = vec![MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
            uuid: String::new(),
            raw: format!("{attr_name}={start_quote}{attr_value}{end_quote}"),
            offset: 0,
            line: 1,
            col: 1,
            node_name: attr_name.to_string(),
            spaces_before_name: empty_token(),
            name: MLASTToken {
                raw: attr_name.to_string(),
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
                raw: start_quote.to_string(),
                ..empty_token()
            },
            value: MLASTToken {
                raw: attr_value.to_string(),
                ..empty_token()
            },
            end_quote: MLASTToken {
                raw: end_quote.to_string(),
                ..empty_token()
            },
            is_dynamic_value: None,
            is_directive: None,
            potential_name: None,
            potential_value: None,
            value_type: None,
            candidate: None,
            is_duplicatable: false,
        }))];

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

    fn make_boolean_attr_element(tag: &str, attr_name: &str) -> DomArena {
        let attributes = vec![MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
            uuid: String::new(),
            raw: attr_name.to_string(),
            offset: 0,
            line: 1,
            col: 1,
            node_name: attr_name.to_string(),
            spaces_before_name: empty_token(),
            name: MLASTToken {
                raw: attr_name.to_string(),
                line: 1,
                col: 1,
                ..empty_token()
            },
            spaces_before_equal: empty_token(),
            equal: empty_token(),
            spaces_after_equal: empty_token(),
            start_quote: empty_token(),
            value: empty_token(),
            end_quote: empty_token(),
            is_dynamic_value: None,
            is_directive: None,
            potential_name: None,
            potential_value: None,
            value_type: None,
            candidate: None,
            is_duplicatable: false,
        }))];

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
    fn double_quotes_pass_with_default() {
        let arena = make_element_with_quote("div", "class", "foo", "\"", "\"");
        let s = spec();
        let rule = AttrValueQuotes;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn single_quotes_fail_with_default() {
        let arena = make_element_with_quote("div", "class", "foo", "'", "'");
        let s = spec();
        let rule = AttrValueQuotes;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(
            violations[0].message,
            "Attribute value is must use double quotation mark"
        );
    }

    #[test]
    fn single_quotes_pass_with_single_config() {
        let arena = make_element_with_quote("div", "class", "foo", "'", "'");
        let s = spec();
        let rule = AttrValueQuotes;
        let config = RuleConfig {
            value: Value::String("single".to_string()),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty());
    }

    #[test]
    fn no_quotes_always_reported() {
        let arena = make_element_with_quote("div", "class", "foo", "", "");
        let s = spec();
        let rule = AttrValueQuotes;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
    }

    #[test]
    fn boolean_attr_skipped() {
        let arena = make_boolean_attr_element("input", "disabled");
        let s = spec();
        let rule = AttrValueQuotes;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
