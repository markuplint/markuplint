//! `case-sensitive-tag-name` rule: checks tag name case (default: lowercase).

use markuplint_core::mlast::NamespaceURI;
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::{extract_tag_name_from_raw, get_raw_tag_name};
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `case-sensitive-tag-name` rule.
pub struct CaseSensitiveTagName;

impl Rule for CaseSensitiveTagName {
    fn id(&self) -> &'static str {
        "case-sensitive-tag-name"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let case = config.global().value.as_str().unwrap_or("lower");
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            // Only check HTML namespace
            if el.namespace != NamespaceURI::XHTML {
                continue;
            }

            let message = format!("Tag names of HTML elements must be {case}case");

            // Use raw tag name from source to preserve original case
            let Some(raw_name) = get_raw_tag_name(el) else {
                continue;
            };

            let is_correct = match case {
                "upper" => raw_name == raw_name.to_ascii_uppercase(),
                _ => raw_name == raw_name.to_ascii_lowercase(),
            };

            if !is_correct {
                // Report at tag name position (after '<'), with raw = tag name only
                #[allow(clippy::cast_possible_truncation)]
                let name_col = el.base.col + el.tag_open_char.len() as u32;
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: message.clone(),
                    line: el.base.line,
                    col: name_col,
                    raw: raw_name.to_string(),
                });
            }

            // Check closing tag
            if let Some(ct) = &el.close_tag {
                let Some(close_raw_name) = extract_tag_name_from_raw(&ct.raw) else {
                    continue;
                };
                let pair_correct = match case {
                    "upper" => close_raw_name == close_raw_name.to_ascii_uppercase(),
                    _ => close_raw_name == close_raw_name.to_ascii_lowercase(),
                };
                if !pair_correct {
                    // Report at closing tag start ('<' position), raw = entire closing tag
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: message.clone(),
                        line: ct.line,
                        col: ct.col,
                        raw: ct.raw.clone(),
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
    use markuplint_core::mlast::{ElementType, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, EndTagData, NodeBase};
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn lowercase_tag_no_violation() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = CaseSensitiveTagName;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn uppercase_tag_violation() {
        let arena = make_element_with_attrs("DIV", &[]);
        let s = spec();
        let rule = CaseSensitiveTagName;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Tag names of HTML elements must be lowercase");
    }

    #[test]
    fn uppercase_mode_lowercase_tag_violation() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = CaseSensitiveTagName;
        let config = RuleConfig {
            value: serde_json::json!("upper"),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Tag names of HTML elements must be uppercase");
    }

    #[test]
    fn closing_tag_case_check() {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let end_id = builder.push(DomNode::EndTag(EndTagData {
            base: NodeBase {
                id: 0,
                uuid: "end".to_string(),
                raw: "</DIV>".to_string(),
                offset: 0,
                line: 1,
                col: 6,
                node_name: "DIV".to_string(),
                parent: Some(doc_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
        }));
        if let Some(DomNode::EndTag(e)) = builder.get_mut(end_id) {
            e.base.id = end_id;
        }
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
            pair_node_id: Some(end_id),
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: Some(markuplint_dom::node::CloseTagInfo {
                raw: "</DIV>".to_string(),
                line: 1,
                col: 6,
            }),
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(el_id) {
            e.base.id = el_id;
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![el_id, end_id];
        }
        let arena = builder.finish();
        let s = spec();
        let rule = CaseSensitiveTagName;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        // Opening tag "div" is lowercase (OK), closing tag "DIV" is uppercase (violation)
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].raw, "</DIV>");
        // col should be at closing tag start ('<' position)
        assert_eq!(violations[0].col, 6);
    }

    #[test]
    fn svg_namespace_skipped() {
        // SVG elements like textPath have mixed case — should not trigger violations
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
                raw: "<textPath>".to_string(),
                offset: 0,
                line: 1,
                col: 1,
                node_name: "textPath".to_string(),
                parent: Some(doc_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
            namespace: NamespaceURI::SVG,
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
        if let Some(DomNode::Element(e)) = builder.get_mut(el_id) {
            e.base.id = el_id;
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![el_id];
        }
        let arena = builder.finish();
        let s = spec();
        let rule = CaseSensitiveTagName;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn custom_element_lowercase_no_violation() {
        let arena = make_element_with_attrs("xxx-hoge", &[]);
        let s = spec();
        let rule = CaseSensitiveTagName;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn uppercase_mode_uppercase_tag_no_violation() {
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
                raw: "<DIV>".to_string(),
                offset: 0,
                line: 1,
                col: 1,
                node_name: "DIV".to_string(),
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
        if let Some(DomNode::Element(e)) = builder.get_mut(el_id) {
            e.base.id = el_id;
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![el_id];
        }
        let arena = builder.finish();
        let s = spec();
        let rule = CaseSensitiveTagName;
        let config = RuleConfig {
            value: serde_json::json!("upper"),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty());
    }

    #[test]
    fn element_without_closing_tag_only_opening_checked() {
        // Element without pair_node_id (None) — only opening tag checked, no crash
        let arena = make_element_with_attrs("DIV", &[]);
        let s = spec();
        let rule = CaseSensitiveTagName;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        // Only the opening tag "DIV" is uppercase → 1 violation, no crash from missing closing tag
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Tag names of HTML elements must be lowercase");
    }
}
