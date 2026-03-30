//! `no-refer-to-non-existent-id` rule: report ID references that point to non-existent IDs.

use std::collections::HashSet;

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfig};
use crate::violation::Violation;

/// The `no-refer-to-non-existent-id` rule.
pub struct NoReferToNonExistentId;

/// ARIA attributes that take space-separated ID reference lists.
const ARIA_ID_LIST_ATTRS: &[&str] = &[
    "aria-labelledby",
    "aria-describedby",
    "aria-controls",
    "aria-owns",
    "aria-flowto",
    "aria-activedescendant",
    "aria-errormessage",
    "aria-details",
];

/// Single-ID reference attributes: (attribute name, element name or empty for any).
const SINGLE_ID_ATTRS: &[(&str, &str)] = &[
    ("for", "label"),
    ("form", "button"),
    ("form", "fieldset"),
    ("form", "input"),
    ("form", "object"),
    ("form", "output"),
    ("form", "select"),
    ("form", "textarea"),
    ("list", "input"),
];

/// Space-separated ID list attributes: (attribute name, element name).
const SPACE_ID_LIST_ATTRS: &[(&str, &str)] = &[("headers", "td"), ("headers", "th")];

impl Rule for NoReferToNonExistentId {
    fn id(&self) -> &'static str {
        "no-refer-to-non-existent-id"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation> {
        let mut violations = Vec::new();

        // Step 1: Collect all IDs in the document
        let mut id_set = HashSet::new();
        let mut has_dynamic_id = false;

        for (_node_id, el) in arena.elements() {
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                if !html_attr.node_name.eq_ignore_ascii_case("id") {
                    continue;
                }

                if html_attr.is_dynamic_value == Some(true) || html_attr.is_directive == Some(true)
                {
                    has_dynamic_id = true;
                    continue;
                }

                let value = html_attr.value.raw.clone();
                if !value.is_empty() {
                    id_set.insert(value);
                }
            }
        }

        // If any dynamic IDs exist, skip all checks (can't statically verify)
        if has_dynamic_id {
            return violations;
        }

        // Step 2: Check ID references
        for (_node_id, el) in arena.elements() {
            let el_name_lower = el.base.node_name.to_ascii_lowercase();

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                if html_attr.is_dynamic_value == Some(true)
                    || html_attr.is_directive == Some(true)
                {
                    continue;
                }

                let attr_name_lower = html_attr.node_name.to_ascii_lowercase();
                let value = &html_attr.value.raw;

                if value.is_empty() {
                    continue;
                }

                // Check ARIA ID list attributes (apply to any element)
                if ARIA_ID_LIST_ATTRS
                    .iter()
                    .any(|a| attr_name_lower == *a)
                {
                    check_space_separated_ids(
                        value,
                        &id_set,
                        html_attr,
                        self.id(),
                        config,
                        &mut violations,
                    );
                    continue;
                }

                // Check single-ID reference attributes
                if SINGLE_ID_ATTRS
                    .iter()
                    .any(|(a, e)| attr_name_lower == *a && el_name_lower == *e)
                {
                    if !id_set.contains(value.as_str()) {
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            severity: config.severity.clone(),
                            message: format!("Missing \"{value}\" ID"),
                            line: html_attr.value.line,
                            col: html_attr.value.col,
                            raw: html_attr.value.raw.clone(),
                        });
                    }
                    continue;
                }

                // Check space-separated ID list attributes
                if SPACE_ID_LIST_ATTRS
                    .iter()
                    .any(|(a, e)| attr_name_lower == *a && el_name_lower == *e)
                {
                    check_space_separated_ids(
                        value,
                        &id_set,
                        html_attr,
                        self.id(),
                        config,
                        &mut violations,
                    );
                }
            }
        }

        violations
    }
}

/// Check each ID in a space-separated list and report missing ones.
fn check_space_separated_ids(
    value: &str,
    id_set: &HashSet<String>,
    html_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    rule_id: &str,
    config: &RuleConfig,
    violations: &mut Vec<Violation>,
) {
    let refs: Vec<&str> = value.split_whitespace().filter(|s| !s.is_empty()).collect();
    for id_ref in refs {
        if !id_set.contains(id_ref) {
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                severity: config.severity.clone(),
                message: format!("Missing \"{id_ref}\" ID"),
                line: html_attr.value.line,
                col: html_attr.value.col,
                raw: html_attr.value.raw.clone(),
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::RuleConfig;
    use markuplint_core::mlast::{ElementType, MLASTHTMLAttr, MLASTToken, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};
    use markuplint_types::spec::load_spec;
    use markuplint_types::spec::types::MLMLSpec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!(
            "../../../../packages/@markuplint/html-spec/index.json"
        ))
        .unwrap()
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
                            line: (i as u32) + 1,
                            col: 1,
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
    fn label_for_missing_id() {
        // <label for="foo"> with no element having id="foo"
        let arena = make_multi_element_arena(&[("label", &[("for", "foo")])]);
        let s = spec();
        let rule = NoReferToNonExistentId;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Missing \"foo\" ID");
    }

    #[test]
    fn label_for_existing_id() {
        // <label for="foo"> with <input id="foo">
        let arena = make_multi_element_arena(&[
            ("label", &[("for", "foo")]),
            ("input", &[("id", "foo")]),
        ]);
        let s = spec();
        let rule = NoReferToNonExistentId;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(violations.is_empty());
    }

    #[test]
    fn aria_describedby_missing_id() {
        // <section aria-describedby="foo"> with no element having id="foo"
        let arena = make_multi_element_arena(&[("section", &[("aria-describedby", "foo")])]);
        let s = spec();
        let rule = NoReferToNonExistentId;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Missing \"foo\" ID");
    }

    #[test]
    fn aria_labelledby_space_separated_partial_missing() {
        // <div aria-labelledby="a b"> with only id="a" existing
        let arena = make_multi_element_arena(&[
            ("div", &[("aria-labelledby", "a b")]),
            ("span", &[("id", "a")]),
        ]);
        let s = spec();
        let rule = NoReferToNonExistentId;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Missing \"b\" ID");
    }

    #[test]
    fn dynamic_id_skips_all_checks() {
        // One element has a dynamic id (is_dynamic_value: Some(true)),
        // another element references a nonexistent id via aria-labelledby.
        // When dynamic IDs exist, all checks should be skipped.
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        // Element 1: <div id="dynamic-id"> with is_dynamic_value: Some(true)
        let dynamic_id_attr = MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
            uuid: String::new(),
            raw: "id=\"dynamic-id\"".to_string(),
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
                raw: "dynamic-id".to_string(),
                line: 1,
                col: 1,
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
        }));

        let el1_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "el-0".to_string(),
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
            attributes: vec![dynamic_id_attr],
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(el1_id) {
            e.base.id = el1_id;
        }

        // Element 2: <section aria-labelledby="nonexistent">
        let labelledby_attr = MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
            uuid: String::new(),
            raw: "aria-labelledby=\"nonexistent\"".to_string(),
            offset: 0,
            line: 2,
            col: 1,
            node_name: "aria-labelledby".to_string(),
            spaces_before_name: empty_token(),
            name: MLASTToken {
                raw: "aria-labelledby".to_string(),
                line: 2,
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
                raw: "nonexistent".to_string(),
                line: 2,
                col: 1,
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
        }));

        let el2_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "el-1".to_string(),
                raw: "<section>".to_string(),
                offset: 0,
                line: 2,
                col: 1,
                node_name: "section".to_string(),
                parent: Some(doc_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: vec![labelledby_attr],
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(el2_id) {
            e.base.id = el2_id;
        }

        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![el1_id, el2_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NoReferToNonExistentId;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(
            violations.is_empty(),
            "When dynamic IDs exist, all checks should be skipped, got: {violations:?}"
        );
    }

    #[test]
    fn all_ids_exist_no_violation() {
        // <label for="name"><input id="name"> → no violation (all referenced IDs exist)
        let arena = make_multi_element_arena(&[
            ("label", &[("for", "name")]),
            ("input", &[("id", "name")]),
        ]);
        let s = spec();
        let rule = NoReferToNonExistentId;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        assert!(
            violations.is_empty(),
            "Expected no violations when all referenced IDs exist, got: {violations:?}"
        );
    }
}
