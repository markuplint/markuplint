//! `required-h1` rule: require exactly one `<h1>` element.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `required-h1` rule.
pub struct RequiredH1;

impl Rule for RequiredH1 {
    fn id(&self) -> &'static str {
        "required-h1"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let config = config.global();
        // Check options for in-document-fragment
        let in_document_fragment = config
            .options
            .get("in-document-fragment")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false);

        // Check if document is fragment
        let is_fragment = match arena.document() {
            Some(DomNode::Document(doc)) => doc.is_fragment,
            _ => return vec![],
        };

        if is_fragment && !in_document_fragment {
            return vec![];
        }

        // Check expected-once option (default true)
        let expected_once = config
            .options
            .get("expected-once")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true);

        // Collect all h1 elements
        let h1_elements: Vec<_> = arena
            .elements()
            .filter(|(_id, el)| el.base.node_name.eq_ignore_ascii_case("h1"))
            .collect();

        let mut violations = Vec::new();

        if h1_elements.is_empty() {
            // Report on document root
            if let Some(DomNode::Document(doc)) = arena.document() {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: config.severity,
                    message: "Require the h1 element".to_string(),
                    line: 1,
                    col: 1,
                    raw: doc.raw.clone(),
                    reason: None,
                });
            }
        } else if expected_once && h1_elements.len() > 1 {
            // Report on each extra h1 (2nd onwards)
            for (_id, el) in &h1_elements[1..] {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: config.severity,
                    message: "The h1 element is duplicated".to_string(),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                    reason: None,
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
    use markuplint_core::mlast::{ElementType, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};
    use markuplint_types::spec::load_spec;
    use markuplint_types::spec::types::MLMLSpec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    fn make_element(tag: &str, line: u32) -> ElementData {
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
            attributes: vec![],
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
    fn single_h1_no_violation() {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: false,
            unknown_parse_error: None,
            children: vec![],
        }));

        let h1_id = builder.push(DomNode::Element(make_element("h1", 1)));
        if let Some(DomNode::Element(e)) = builder.get_mut(h1_id) {
            e.base.id = h1_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![h1_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = RequiredH1;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn no_h1_reported() {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: false,
            unknown_parse_error: None,
            children: vec![],
        }));

        let div_id = builder.push(DomNode::Element(make_element("div", 1)));
        if let Some(DomNode::Element(e)) = builder.get_mut(div_id) {
            e.base.id = div_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![div_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = RequiredH1;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Require the h1 element");
    }

    #[test]
    fn multiple_h1_duplicated() {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: false,
            unknown_parse_error: None,
            children: vec![],
        }));

        let h1_first_id = builder.push(DomNode::Element(make_element("h1", 1)));
        let h1_second_id = builder.push(DomNode::Element(make_element("h1", 2)));

        if let Some(DomNode::Element(e)) = builder.get_mut(h1_first_id) {
            e.base.id = h1_first_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(h1_second_id) {
            e.base.id = h1_second_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![h1_first_id, h1_second_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = RequiredH1;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "The h1 element is duplicated");
        assert_eq!(violations[0].line, 2);
    }

    #[test]
    fn fragment_skipped_by_default() {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let div_id = builder.push(DomNode::Element(make_element("div", 1)));
        if let Some(DomNode::Element(e)) = builder.get_mut(div_id) {
            e.base.id = div_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![div_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = RequiredH1;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn fragment_checked_with_option() {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let div_id = builder.push(DomNode::Element(make_element("div", 1)));
        if let Some(DomNode::Element(e)) = builder.get_mut(div_id) {
            e.base.id = div_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![div_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = RequiredH1;
        let config = RuleConfig {
            options: serde_json::json!({"in-document-fragment": true}),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Require the h1 element");
    }

    #[test]
    fn expected_once_false_allows_duplicates() {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: false,
            unknown_parse_error: None,
            children: vec![],
        }));

        let h1_first_id = builder.push(DomNode::Element(make_element("h1", 1)));
        let h1_second_id = builder.push(DomNode::Element(make_element("h1", 2)));

        if let Some(DomNode::Element(e)) = builder.get_mut(h1_first_id) {
            e.base.id = h1_first_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(h1_second_id) {
            e.base.id = h1_second_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![h1_first_id, h1_second_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = RequiredH1;
        let config = RuleConfig {
            options: serde_json::json!({"expected-once": false}),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty());
    }

    #[test]
    fn empty_document_reports_missing_h1() {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: false,
            unknown_parse_error: None,
            children: vec![],
        }));
        // Set document id
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.id = doc_id;
        }

        let arena = builder.finish();
        let s = spec();
        let rule = RequiredH1;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Require the h1 element");
    }
}
