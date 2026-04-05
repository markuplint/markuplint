//! `no-duplicate-dt` rule: no duplicate `<dt>` text within a `<dl>`.

use std::collections::HashMap;

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `no-duplicate-dt` rule.
pub struct NoDuplicateDt;

impl Rule for NoDuplicateDt {
    fn id(&self) -> &'static str {
        "no-duplicate-dt"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if !el.base.node_name.eq_ignore_ascii_case("dl") {
                continue;
            }

            // Collect direct child <dt> elements with their text
            let mut dt_texts: HashMap<String, Vec<(u32, u32, String)>> = HashMap::new();

            if let Some(children) = arena.children_of(el.base.id) {
                for &child_id in children {
                    if let Some(DomNode::Element(child_el)) = arena.get(child_id)
                        && child_el.base.node_name.eq_ignore_ascii_case("dt")
                    {
                        let text = collect_text_content(arena, child_id);
                        let trimmed = text.trim().to_string();
                        if !trimmed.is_empty() {
                            dt_texts.entry(trimmed).or_default().push((
                                child_el.base.line,
                                child_el.base.col,
                                child_el.base.raw.clone(),
                            ));
                        }
                    }
                }
            }

            for locations in dt_texts.values() {
                if locations.len() > 1 {
                    for &(line, col, ref raw) in &locations[1..] {
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            name: None,
                            severity: rule_config.severity,
                            message: "The name duplicated".to_string(),
                            line,
                            col,
                            raw: raw.clone(),
            reason: None,
                        });
                    }
                }
            }
        }

        violations
    }
}

/// Recursively collect text content from all Text node descendants.
fn collect_text_content(arena: &DomArena, node_id: usize) -> String {
    let mut result = String::new();
    if let Some(children) = arena.children_of(node_id) {
        for &child_id in children {
            match arena.get(child_id) {
                Some(DomNode::Text(t)) => {
                    result.push_str(&t.base.raw);
                }
                Some(DomNode::Element(_)) => {
                    result.push_str(&collect_text_content(arena, child_id));
                }
                _ => {}
            }
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use markuplint_core::mlast::{ElementType, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase, TextData};
    use markuplint_types::spec::load_spec;
    use markuplint_types::spec::types::MLMLSpec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    fn make_element(tag: &str, line: u32, col: u32) -> ElementData {
        ElementData {
            base: NodeBase {
                id: 0,
                uuid: String::new(),
                raw: format!("<{tag}>"),
                offset: 0,
                line,
                col,
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

    fn make_text(content: &str, line: u32) -> TextData {
        TextData {
            base: NodeBase {
                id: 0,
                uuid: String::new(),
                raw: content.to_string(),
                offset: 0,
                line,
                col: 1,
                node_name: "#text".to_string(),
                parent: None,
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 2,
            },
            is_bogus: false,
        }
    }

    #[test]
    fn no_duplicate_dt_text() {
        // <dl><dt>Apple</dt><dt>Banana</dt></dl>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let dl_id = builder.push(DomNode::Element(make_element("dl", 1, 1)));
        let dt1_id = builder.push(DomNode::Element(make_element("dt", 1, 5)));
        let text1_id = builder.push(DomNode::Text(make_text("Apple", 1)));
        let dt2_id = builder.push(DomNode::Element(make_element("dt", 2, 1)));
        let text2_id = builder.push(DomNode::Text(make_text("Banana", 2)));

        if let Some(DomNode::Element(e)) = builder.get_mut(dl_id) {
            e.base.id = dl_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![dt1_id, dt2_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(dt1_id) {
            e.base.id = dt1_id;
            e.base.parent = Some(dl_id);
            e.base.children = vec![text1_id];
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text1_id) {
            t.base.id = text1_id;
            t.base.parent = Some(dt1_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(dt2_id) {
            e.base.id = dt2_id;
            e.base.parent = Some(dl_id);
            e.base.children = vec![text2_id];
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text2_id) {
            t.base.id = text2_id;
            t.base.parent = Some(dt2_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![dl_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NoDuplicateDt;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn duplicate_dt_text_reported() {
        // <dl><dt>Apple</dt><dt>Apple</dt></dl>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let dl_id = builder.push(DomNode::Element(make_element("dl", 1, 1)));
        let dt1_id = builder.push(DomNode::Element(make_element("dt", 1, 5)));
        let text1_id = builder.push(DomNode::Text(make_text("Apple", 1)));
        let dt2_id = builder.push(DomNode::Element(make_element("dt", 2, 1)));
        let text2_id = builder.push(DomNode::Text(make_text("Apple", 2)));

        if let Some(DomNode::Element(e)) = builder.get_mut(dl_id) {
            e.base.id = dl_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![dt1_id, dt2_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(dt1_id) {
            e.base.id = dt1_id;
            e.base.parent = Some(dl_id);
            e.base.children = vec![text1_id];
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text1_id) {
            t.base.id = text1_id;
            t.base.parent = Some(dt1_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(dt2_id) {
            e.base.id = dt2_id;
            e.base.parent = Some(dl_id);
            e.base.children = vec![text2_id];
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text2_id) {
            t.base.id = text2_id;
            t.base.parent = Some(dt2_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![dl_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NoDuplicateDt;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "The name duplicated");
    }

    #[test]
    fn empty_dl_no_violation() {
        // <dl></dl> with no children → no violation
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let dl_id = builder.push(DomNode::Element(make_element("dl", 1, 1)));

        if let Some(DomNode::Element(e)) = builder.get_mut(dl_id) {
            e.base.id = dl_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![];
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![dl_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NoDuplicateDt;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn non_dl_element_ignored() {
        // <div><dt>Apple</dt><dt>Apple</dt></div> — not a dl, so ignored
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let div_id = builder.push(DomNode::Element(make_element("div", 1, 1)));
        let dt1_id = builder.push(DomNode::Element(make_element("dt", 1, 5)));
        let text1_id = builder.push(DomNode::Text(make_text("Apple", 1)));
        let dt2_id = builder.push(DomNode::Element(make_element("dt", 2, 1)));
        let text2_id = builder.push(DomNode::Text(make_text("Apple", 2)));

        if let Some(DomNode::Element(e)) = builder.get_mut(div_id) {
            e.base.id = div_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![dt1_id, dt2_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(dt1_id) {
            e.base.id = dt1_id;
            e.base.parent = Some(div_id);
            e.base.children = vec![text1_id];
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text1_id) {
            t.base.id = text1_id;
            t.base.parent = Some(dt1_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(dt2_id) {
            e.base.id = dt2_id;
            e.base.parent = Some(div_id);
            e.base.children = vec![text2_id];
        }
        if let Some(DomNode::Text(t)) = builder.get_mut(text2_id) {
            t.base.id = text2_id;
            t.base.parent = Some(dt2_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![div_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NoDuplicateDt;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
