//! `id-duplication` rule: reports duplicate `id` attribute values across all elements.

use std::collections::HashMap;

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `id-duplication` rule.
pub struct IdDuplication;

impl Rule for IdDuplication {
    fn id(&self) -> &'static str {
        "id-duplication"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        // Map from id value to list of (line, col, raw)
        let mut seen: HashMap<String, Vec<(u32, u32, String)>> = HashMap::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                if html_attr.is_dynamic_value == Some(true) || html_attr.is_directive == Some(true) {
                    continue;
                }

                if html_attr.node_name.eq_ignore_ascii_case("id") {
                    let value = html_attr.value.raw.clone();
                    if value.is_empty() {
                        continue;
                    }
                    seen.entry(value).or_default().push((
                        html_attr.name.line,
                        html_attr.name.col,
                        html_attr.raw.clone(),
                    ));
                }
            }
        }

        for (value, locations) in &seen {
            if locations.len() > 1 {
                // Report all occurrences after the first
                for &(line, col, ref raw) in &locations[1..] {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: config.global().severity.clone(),
                        message: format!("\"{value}\" is duplicated"),
                        line,
                        col,
                        raw: raw.clone(),
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

    fn make_multi_element_arena(elements: &[(&str, &[(&str, &str)])]) -> DomArena {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let mut child_ids = Vec::new();
        for (i, (tag, attrs)) in elements.iter().enumerate() {
            let attributes: Vec<MLASTAttr> = attrs
                .iter()
                .map(|(name, value)| {
                    MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                        uuid: String::new(),
                        raw: format!("{name}=\"{value}\""),
                        offset: 0,
                        line: (i as u32) + 1,
                        col: 1,
                        node_name: name.to_string(),
                        spaces_before_name: empty_token(),
                        name: MLASTToken {
                            raw: name.to_string(),
                            line: (i as u32) + 1,
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

            let el_id = builder.push(DomNode::Element(ElementData {
                base: NodeBase {
                    id: 0,
                    uuid: format!("el-{i}"),
                    raw: format!("<{tag}>"),
                    offset: 0,
                    line: (i as u32) + 1,
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
            child_ids.push(el_id);
        }

        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = child_ids;
        }
        builder.finish()
    }

    #[test]
    fn no_duplicate_ids() {
        let arena = make_multi_element_arena(&[("div", &[("id", "a")]), ("span", &[("id", "b")])]);
        let s = spec();
        let rule = IdDuplication;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn duplicate_ids_reported() {
        let arena = make_multi_element_arena(&[("div", &[("id", "same")]), ("span", &[("id", "same")])]);
        let s = spec();
        let rule = IdDuplication;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "\"same\" is duplicated");
    }

    #[test]
    fn no_violation_single_element() {
        let arena = make_element_with_attrs("div", &[("id", "unique")]);
        let s = spec();
        let rule = IdDuplication;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn triple_duplicate_ids_reported() {
        let arena = make_multi_element_arena(&[
            ("div", &[("id", "a")]),
            ("div", &[("id", "a")]),
            ("div", &[("id", "a")]),
        ]);
        let s = spec();
        let rule = IdDuplication;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 2);
        assert_eq!(violations[0].message, "\"a\" is duplicated");
        assert_eq!(violations[1].message, "\"a\" is duplicated");
    }

    #[test]
    fn severity_from_config() {
        let arena = make_multi_element_arena(&[("div", &[("id", "dup")]), ("span", &[("id", "dup")])]);
        let s = spec();
        let rule = IdDuplication;
        let config = RuleConfig {
            severity: Severity::Warning,
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations[0].severity, Severity::Warning);
    }

    #[test]
    fn empty_id_value_no_duplicate() {
        // Two elements with id="" — empty IDs are skipped per TS behavior
        let arena = make_multi_element_arena(&[("div", &[("id", "")]), ("span", &[("id", "")])]);
        let s = spec();
        let rule = IdDuplication;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    /// Build a multi-element arena where specific attributes can have dynamic/directive flags.
    fn make_multi_element_arena_with_flags(
        elements: &[(&str, &[(&str, &str, Option<bool>, Option<bool>)])],
    ) -> DomArena {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let mut child_ids = Vec::new();
        for (i, (tag, attrs)) in elements.iter().enumerate() {
            let attributes: Vec<MLASTAttr> = attrs
                .iter()
                .map(|(name, value, is_dynamic, is_directive)| {
                    MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                        uuid: String::new(),
                        raw: format!("{name}=\"{value}\""),
                        offset: 0,
                        line: (i as u32) + 1,
                        col: 1,
                        node_name: name.to_string(),
                        spaces_before_name: empty_token(),
                        name: MLASTToken {
                            raw: name.to_string(),
                            line: (i as u32) + 1,
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
                        is_dynamic_value: *is_dynamic,
                        is_directive: *is_directive,
                        potential_name: None,
                        potential_value: None,
                        value_type: None,
                        candidate: None,
                        is_duplicatable: false,
                    }))
                })
                .collect();

            let el_id = builder.push(DomNode::Element(ElementData {
                base: NodeBase {
                    id: 0,
                    uuid: format!("el-{i}"),
                    raw: format!("<{tag}>"),
                    offset: 0,
                    line: (i as u32) + 1,
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
            child_ids.push(el_id);
        }

        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = child_ids;
        }
        builder.finish()
    }

    #[test]
    fn dynamic_value_id_skipped() {
        // One static id and one dynamic id with the same value — should NOT report duplicate
        let arena = make_multi_element_arena_with_flags(&[
            ("div", &[("id", "same", None, None)]),
            ("span", &[("id", "same", Some(true), None)]),
        ]);
        let s = spec();
        let rule = IdDuplication;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn directive_id_skipped() {
        // One static id and one directive id with the same value — should NOT report duplicate
        let arena = make_multi_element_arena_with_flags(&[
            ("div", &[("id", "same", None, None)]),
            ("span", &[("id", "same", None, Some(true))]),
        ]);
        let s = spec();
        let rule = IdDuplication;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
