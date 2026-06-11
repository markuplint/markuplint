//! Ports `packages/@markuplint/ml-spec/src/algorithm/html/may-be-focusable.ts`.
//!
//! This is a static heuristic — it does NOT account for runtime state such as
//! `disabled`, `inert`, or CSS `display:none`. Those are checked separately by
//! the caller (e.g., `getComputedRole`).

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_types::spec::lookup;
use markuplint_types::spec::types::MLMLSpec;

pub fn may_be_focusable(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId) -> bool {
    let Some(node) = arena.get(node_id) else {
        return false;
    };
    let Some(el) = node.as_element() else {
        return false;
    };

    let tag_name = &el.base.node_name;

    if let Some(interactive_tags) = lookup::get_content_model_tags(spec, "#interactive") {
        for selector in interactive_tags {
            if matches_simple_selector(tag_name, selector, arena, node_id) {
                return true;
            }
        }
    }

    if helpers::has_attr(arena, node_id, "tabindex") {
        return true;
    }

    if let Some(val) = helpers::get_attr_value(arena, node_id, "contenteditable")
        && !val.eq_ignore_ascii_case("false")
    {
        return true;
    }

    false
}

/// For complex selectors, falls back to tag-name-only matching (conservative: may
/// over-report focusability, which is safe for a heuristic check).
fn matches_simple_selector(tag_name: &str, selector: &str, arena: &DomArena, node_id: NodeId) -> bool {
    let sel_tag = selector.find(['[', ':']).map_or(selector, |pos| &selector[..pos]);

    if !sel_tag.eq_ignore_ascii_case(tag_name) {
        return false;
    }

    if let Some(bracket_pos) = selector.find('[') {
        let rest = &selector[bracket_pos..];
        if selector[..bracket_pos].contains(":not(") {
            if let Some(inner) = extract_not_attr_condition(rest) {
                return !matches_attr_condition(arena, node_id, &inner);
            }
            // Complex :not() — conservatively return true (tag matches)
            return true;
        }
        if let Some(attr_name) = rest.strip_prefix('[').and_then(|s| s.strip_suffix(']')) {
            return helpers::has_attr(arena, node_id, attr_name);
        }
        // Complex attribute selector — tag matches, conservatively return true
        return true;
    }

    true
}

/// Accepts the `[attr='value' i])` / `[attr])` tail of a `:not(...)` selector.
fn extract_not_attr_condition(s: &str) -> Option<AttrCondition> {
    let inner = s.strip_prefix("[")?.strip_suffix("])")?;
    if let Some(eq_pos) = inner.find('=') {
        let attr_name = &inner[..eq_pos];
        let rest = &inner[eq_pos + 1..];
        let value = rest.trim_matches(|c: char| c == '\'' || c == '"' || c == ' ' || c == 'i');
        Some(AttrCondition {
            name: attr_name.to_string(),
            value: Some(value.to_string()),
        })
    } else {
        Some(AttrCondition {
            name: inner.to_string(),
            value: None,
        })
    }
}

struct AttrCondition {
    name: String,
    value: Option<String>,
}

fn matches_attr_condition(arena: &DomArena, node_id: NodeId, cond: &AttrCondition) -> bool {
    if let Some(expected) = &cond.value {
        helpers::get_attr_value(arena, node_id, &cond.name).is_some_and(|v| v.eq_ignore_ascii_case(expected))
    } else {
        helpers::has_attr(arena, node_id, &cond.name)
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    pub(crate) fn make_arena(tag: &str, attrs: &[(&str, &str)]) -> (DomArena, NodeId) {
        use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTHTMLAttr, MLASTToken, NamespaceURI};
        use markuplint_dom::arena::DomArenaBuilder;
        use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};

        let empty_token = || MLASTToken {
            uuid: String::new(),
            raw: String::new(),
            offset: 0,
            line: 1,
            col: 1,
        };

        let attributes: Vec<MLASTAttr> = attrs
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
                id: 1,
                uuid: "el-1".to_string(),
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
        if let Some(DomNode::Document(doc)) = builder.get_mut(doc_id) {
            doc.children.push(el_id);
        }
        (builder.finish(), el_id)
    }

    #[test]
    fn button_is_focusable() {
        let s = spec();
        let (arena, id) = make_arena("button", &[]);
        assert!(may_be_focusable(&s, &arena, id));
    }

    #[test]
    fn input_is_focusable() {
        let s = spec();
        let (arena, id) = make_arena("input", &[]);
        assert!(may_be_focusable(&s, &arena, id));
    }

    #[test]
    fn a_with_href_is_focusable() {
        let s = spec();
        let (arena, id) = make_arena("a", &[("href", "https://example.com")]);
        assert!(may_be_focusable(&s, &arena, id));
    }

    #[test]
    fn a_without_href_not_focusable() {
        let s = spec();
        let (arena, id) = make_arena("a", &[]);
        assert!(!may_be_focusable(&s, &arena, id));
    }

    #[test]
    fn div_not_focusable() {
        let s = spec();
        let (arena, id) = make_arena("div", &[]);
        assert!(!may_be_focusable(&s, &arena, id));
    }

    #[test]
    fn div_with_tabindex_is_focusable() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("tabindex", "0")]);
        assert!(may_be_focusable(&s, &arena, id));
    }

    #[test]
    fn div_with_negative_tabindex_is_focusable() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("tabindex", "-1")]);
        assert!(may_be_focusable(&s, &arena, id));
    }

    #[test]
    fn contenteditable_is_focusable() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("contenteditable", "true")]);
        assert!(may_be_focusable(&s, &arena, id));
    }

    #[test]
    fn contenteditable_false_not_focusable() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("contenteditable", "false")]);
        assert!(!may_be_focusable(&s, &arena, id));
    }

    #[test]
    fn select_is_focusable() {
        let s = spec();
        let (arena, id) = make_arena("select", &[]);
        assert!(may_be_focusable(&s, &arena, id));
    }

    #[test]
    fn textarea_is_focusable() {
        let s = spec();
        let (arena, id) = make_arena("textarea", &[]);
        assert!(may_be_focusable(&s, &arena, id));
    }

    #[test]
    fn contenteditable_empty_is_focusable() {
        // contenteditable="" is equivalent to contenteditable="true"
        let s = spec();
        let (arena, id) = make_arena("div", &[("contenteditable", "")]);
        assert!(may_be_focusable(&s, &arena, id));
    }
}
