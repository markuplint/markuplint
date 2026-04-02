//! `attr-duplication` rule: reports duplicate attributes on elements.
//!
//! Ports `packages/@markuplint/rules/src/attr-duplication/`.

use std::collections::HashMap;

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `attr-duplication` rule.
pub struct AttrDuplication;

impl Rule for AttrDuplication {
    fn id(&self) -> &'static str {
        "attr-duplication"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let mut seen: HashMap<String, usize> = HashMap::new();

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                let name_lower = html_attr.node_name.to_ascii_lowercase();
                let count = seen.entry(name_lower.clone()).or_insert(0);
                *count += 1;

                if *count > 1 {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity.clone(),
                        message: format!("The attribute \"{}\" is duplicated", html_attr.node_name),
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
pub(crate) mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::violation::Severity;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    /// Build a test arena with one element having specific attributes.
    pub(crate) fn make_element_with_attrs(tag: &str, attrs: &[(&str, &str)]) -> DomArena {
        use markuplint_core::mlast::{ElementType, MLASTHTMLAttr, MLASTToken, NamespaceURI};
        use markuplint_dom::arena::DomArenaBuilder;
        use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};

        let empty_token = || MLASTToken {
            uuid: String::new(),
            raw: String::new(),
            offset: 0,
            line: 1,
            col: 1,
        };

        let mut col = 1u32 + tag.len() as u32 + 1; // after "<tag "
        let attributes: Vec<MLASTAttr> = attrs
            .iter()
            .map(|(name, value)| {
                let attr_col = col;
                col += name.len() as u32 + 2 + value.len() as u32 + 1; // name="value" + space
                MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                    uuid: String::new(),
                    raw: format!("{name}=\"{value}\""),
                    offset: 0,
                    line: 1,
                    col: attr_col,
                    node_name: name.to_string(),
                    spaces_before_name: empty_token(),
                    name: MLASTToken {
                        raw: name.to_string(),
                        line: 1,
                        col: attr_col,
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
    fn no_duplicate_attrs() {
        let arena = make_element_with_attrs("div", &[("class", "a"), ("id", "b")]);
        let s = spec();
        let rule = AttrDuplication;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn duplicate_class_attr() {
        let arena = make_element_with_attrs("div", &[("class", "a"), ("class", "b")]);
        let s = spec();
        let rule = AttrDuplication;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].rule_id, "attr-duplication");
        assert_eq!(violations[0].message, "The attribute \"class\" is duplicated");
    }

    #[test]
    fn duplicate_case_insensitive() {
        let arena = make_element_with_attrs("div", &[("Class", "a"), ("class", "b")]);
        let s = spec();
        let rule = AttrDuplication;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
    }

    #[test]
    fn triple_duplicate() {
        let arena = make_element_with_attrs("div", &[("id", "a"), ("id", "b"), ("id", "c")]);
        let s = spec();
        let rule = AttrDuplication;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 2); // 2nd and 3rd are duplicates
    }

    #[test]
    fn no_attrs_no_violation() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = AttrDuplication;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn severity_from_config() {
        let arena = make_element_with_attrs("div", &[("id", "a"), ("id", "b")]);
        let s = spec();
        let rule = AttrDuplication;
        let config = RuleConfig {
            severity: Severity::Warning,
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations[0].severity, Severity::Warning);
    }

    #[test]
    fn violation_location_is_accurate() {
        // <div class="a" class="b"> → second class starts at col after first attr
        let arena = make_element_with_attrs("div", &[("class", "a"), ("class", "b")]);
        let s = spec();
        let rule = AttrDuplication;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].line, 1);
        // col should be > 1 (after <div and first class="a")
        assert!(violations[0].col > 1, "col should be after first attribute");
        assert!(!violations[0].raw.is_empty(), "raw should contain the attribute text");
    }
}
