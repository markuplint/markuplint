//! `no-empty-palpable-content` rule: palpable content elements should not be empty.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::lookup::is_palpable_element;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `no-empty-palpable-content` rule.
pub struct NoEmptyPalpableContent;

/// Elements that are not palpable content but are exposed to the accessibility tree.
/// These include list items, definition terms, table cells, etc.
const EXPOSABLE_ELEMENTS: &[&str] = &["li", "dt", "dd", "th", "td", "tr", "thead", "tbody", "tfoot", "caption"];

/// Check if an element is an "exposable" element (not palpable but exposed to a11y tree).
fn is_exposable_element(name: &str) -> bool {
    EXPOSABLE_ELEMENTS.iter().any(|e| e.eq_ignore_ascii_case(name))
}

impl Rule for NoEmptyPalpableContent {
    fn id(&self) -> &'static str {
        "no-empty-palpable-content"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let global = config.global();
        let ignore_if_aria_busy = global
            .options
            .get("ignoreIfAriaBusy")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true);

        let extends_exposable = global
            .options
            .get("extendsExposableElements")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true);

        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let is_palpable = is_palpable_element(spec, &el.base.node_name);
            let is_exposable = extends_exposable && is_exposable_element(&el.base.node_name);
            if !is_palpable && !is_exposable {
                continue;
            }

            // Skip if aria-busy="true" and option is enabled
            if ignore_if_aria_busy {
                let has_aria_busy = el.attributes.iter().any(|attr| {
                    if let MLASTAttr::HTMLAttr(html_attr) = attr {
                        html_attr.node_name.eq_ignore_ascii_case("aria-busy") && html_attr.value.raw == "true"
                    } else {
                        false
                    }
                });
                if has_aria_busy {
                    continue;
                }
            }

            // Check if element is empty: no child elements and all text is whitespace-only
            let is_empty = arena.descendants(node_id).all(|child| match child {
                DomNode::Text(t) => t.base.raw.trim().is_empty(),
                DomNode::Element(_) => false,
                _ => true, // comments, etc. don't count as content
            });

            if is_empty {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: "The element should not empty".to_string(),
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
    use crate::rules::attr_duplication::tests::make_element_with_attrs;
    use markuplint_core::mlast::{ElementType, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, ElementData, NodeBase, TextData};
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn empty_palpable_element_reported() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = NoEmptyPalpableContent;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "The element should not empty");
    }

    #[test]
    fn non_palpable_element_no_violation() {
        let arena = make_element_with_attrs("br", &[]);
        let s = spec();
        let rule = NoEmptyPalpableContent;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn palpable_element_with_text_no_violation() {
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
                raw: "<p>".to_string(),
                offset: 0,
                line: 1,
                col: 1,
                node_name: "p".to_string(),
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
        let text_id = builder.push(DomNode::Text(TextData {
            base: NodeBase {
                id: 0,
                uuid: "t".to_string(),
                raw: "Hello".to_string(),
                offset: 0,
                line: 1,
                col: 4,
                node_name: "#text".to_string(),
                parent: Some(el_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 2,
            },
            is_bogus: false,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(el_id) {
            e.base.id = el_id;
            e.base.children = vec![text_id];
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text_id) {
            t.base.id = text_id;
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![el_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NoEmptyPalpableContent;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn whitespace_only_text_reported() {
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
                raw: "<p>".to_string(),
                offset: 0,
                line: 1,
                col: 1,
                node_name: "p".to_string(),
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
        let text_id = builder.push(DomNode::Text(TextData {
            base: NodeBase {
                id: 0,
                uuid: "t".to_string(),
                raw: "   ".to_string(),
                offset: 0,
                line: 1,
                col: 4,
                node_name: "#text".to_string(),
                parent: Some(el_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 2,
            },
            is_bogus: false,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(el_id) {
            e.base.id = el_id;
            e.base.children = vec![text_id];
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text_id) {
            t.base.id = text_id;
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![el_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NoEmptyPalpableContent;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "The element should not empty");
    }

    #[test]
    fn element_with_child_element_no_violation() {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let div_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "div".to_string(),
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
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }));
        let span_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "span".to_string(),
                raw: "<span>".to_string(),
                offset: 0,
                line: 1,
                col: 6,
                node_name: "span".to_string(),
                parent: Some(div_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 2,
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
        if let Some(DomNode::Element(e)) = builder.get_mut(div_id) {
            e.base.id = div_id;
            e.base.children = vec![span_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(span_id) {
            e.base.id = span_id;
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![div_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NoEmptyPalpableContent;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        // div contains a child element (span), so div is NOT empty.
        // span is empty and palpable → 1 violation for span only.
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].raw, "<span>");
    }

    #[test]
    fn ignore_if_aria_busy_default_true() {
        // Default: ignoreIfAriaBusy=true, so aria-busy="true" element is skipped
        let arena = make_element_with_attrs("div", &[("aria-busy", "true")]);
        let s = spec();
        let rule = NoEmptyPalpableContent;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.is_empty(),
            "Default ignoreIfAriaBusy=true should skip aria-busy elements"
        );
    }

    #[test]
    fn ignore_if_aria_busy_false_reports() {
        // ignoreIfAriaBusy=false → empty div with aria-busy="true" IS reported
        let arena = make_element_with_attrs("div", &[("aria-busy", "true")]);
        let s = spec();
        let rule = NoEmptyPalpableContent;
        let config = RuleConfig {
            options: serde_json::json!({ "ignoreIfAriaBusy": false }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations.len(), 1, "ignoreIfAriaBusy=false should report");
    }

    #[test]
    fn extends_exposable_elements_default_true() {
        // Default: extendsExposableElements=true → empty <li> is reported
        let arena = make_element_with_attrs("li", &[]);
        let s = spec();
        let rule = NoEmptyPalpableContent;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(
            violations.len(),
            1,
            "extendsExposableElements=true should detect empty <li>"
        );
    }

    #[test]
    fn extends_exposable_elements_false_skips() {
        // extendsExposableElements=false → empty <li> is NOT reported (not palpable)
        let arena = make_element_with_attrs("li", &[]);
        let s = spec();
        let rule = NoEmptyPalpableContent;
        let config = RuleConfig {
            options: serde_json::json!({ "extendsExposableElements": false }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty(), "extendsExposableElements=false should skip <li>");
    }

    #[test]
    fn empty_td_reported_with_extends() {
        // Empty <td> should be reported when extendsExposableElements=true (default)
        let arena = make_element_with_attrs("td", &[]);
        let s = spec();
        let rule = NoEmptyPalpableContent;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(
            violations.len(),
            1,
            "Empty <td> should be reported with default options"
        );
    }
}
