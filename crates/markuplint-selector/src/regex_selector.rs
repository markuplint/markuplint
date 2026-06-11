//! Regex-based selector matching: a system separate from CSS selectors.
//!
//! Corresponds to `@markuplint/selector/src/match-selector.ts` (regex path).

use std::collections::HashMap;
use std::sync::LazyLock;

use markuplint_core::mlast::{MLASTAttr, NamespaceURI};
use markuplint_dom::arena::{DomArena, NodeId};
use regex::Regex;
use serde::Deserialize;

static REGEX_LITERAL_PATTERN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^/(.+)/([gi]*)$").expect("regex literal pattern must compile"));

use crate::ast::Specificity;

// ============================================================
// Types (mirrors TS RegexSelector)
// ============================================================

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegexSelector {
    #[serde(default)]
    pub node_name: Option<String>,
    #[serde(default)]
    pub attr_name: Option<String>,
    #[serde(default)]
    pub attr_value: Option<String>,
    #[serde(default)]
    pub combination: Option<Box<RegexSelectorCombination>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegexSelectorCombination {
    pub combinator: String,
    #[serde(default)]
    pub node_name: Option<String>,
    #[serde(default)]
    pub attr_name: Option<String>,
    #[serde(default)]
    pub attr_value: Option<String>,
    #[serde(default)]
    pub combination: Option<Box<RegexSelectorCombination>>,
}

#[derive(Debug, Clone)]
pub struct RegexMatchResult {
    pub matched: bool,
    /// Reconstructed CSS-like selector string, e.g. `div[type="email"]`.
    pub selector: String,
    pub specificity: Specificity,
    /// Keyed `$0`, `$1`, … for numbered groups plus any named groups.
    pub data: HashMap<String, String>,
}

impl RegexMatchResult {
    fn unmatched() -> Self {
        Self {
            matched: false,
            selector: String::new(),
            specificity: [0, 0, 0],
            data: HashMap::new(),
        }
    }
}

// ============================================================
// Public API
// ============================================================

pub fn regex_select(arena: &DomArena, node_id: NodeId, selector: &RegexSelector) -> RegexMatchResult {
    let mut targets: Vec<RegexTarget> = Vec::new();
    targets.push(RegexTarget {
        node_name: selector.node_name.as_deref(),
        attr_name: selector.attr_name.as_deref(),
        attr_value: selector.attr_value.as_deref(),
        combined_from: None,
    });

    let mut current_combination = selector.combination.as_deref();
    while let Some(combo) = current_combination {
        let prev_idx = targets.len() - 1;
        targets.push(RegexTarget {
            node_name: combo.node_name.as_deref(),
            attr_name: combo.attr_name.as_deref(),
            attr_value: combo.attr_value.as_deref(),
            combined_from: Some((prev_idx, combo.combinator.as_str())),
        });
        current_combination = combo.combination.as_deref();
    }

    let last_idx = targets.len() - 1;
    match_target(arena, node_id, &targets, last_idx)
}

// ============================================================
// Internal matching
// ============================================================

struct RegexTarget<'a> {
    node_name: Option<&'a str>,
    attr_name: Option<&'a str>,
    attr_value: Option<&'a str>,
    combined_from: Option<(usize, &'a str)>,
}

fn match_target(arena: &DomArena, node_id: NodeId, targets: &[RegexTarget<'_>], target_idx: usize) -> RegexMatchResult {
    let target = &targets[target_idx];

    let unit_result = uncombined_match(arena, node_id, target);
    if !unit_result.matched {
        return unit_result;
    }

    let Some((from_idx, combinator)) = target.combined_from else {
        return unit_result;
    };

    match combinator {
        // Descendant combinator
        " " => {
            let mut ancestor_id = element_parent(arena, node_id);
            while let Some(aid) = ancestor_id {
                let result = match_target(arena, aid, targets, from_idx);
                if result.matched {
                    return merge_results(&result, &unit_result, " ");
                }
                ancestor_id = element_parent(arena, aid);
            }
            RegexMatchResult::unmatched()
        }
        // Child combinator
        ">" => {
            let Some(parent_id) = element_parent(arena, node_id) else {
                return RegexMatchResult::unmatched();
            };
            let result = match_target(arena, parent_id, targets, from_idx);
            if result.matched {
                merge_results(&result, &unit_result, " > ")
            } else {
                RegexMatchResult::unmatched()
            }
        }
        // Next-sibling combinator
        "+" => {
            let Some(prev_id) = prev_element_sibling(arena, node_id) else {
                return RegexMatchResult::unmatched();
            };
            let result = match_target(arena, prev_id, targets, from_idx);
            if result.matched {
                merge_results(&result, &unit_result, " + ")
            } else {
                RegexMatchResult::unmatched()
            }
        }
        // Subsequent-sibling combinator
        "~" => {
            let mut prev_id = prev_element_sibling(arena, node_id);
            while let Some(pid) = prev_id {
                let result = match_target(arena, pid, targets, from_idx);
                if result.matched {
                    return merge_results(&result, &unit_result, " ~ ");
                }
                prev_id = prev_element_sibling(arena, pid);
            }
            RegexMatchResult::unmatched()
        }
        // Previous-sibling combinator (via :has)
        ":has(+)" => {
            let Some(next_id) = next_element_sibling(arena, node_id) else {
                return RegexMatchResult::unmatched();
            };
            let result = match_target(arena, next_id, targets, from_idx);
            if result.matched {
                merge_results(&result, &unit_result, ":has(+ ")
            } else {
                RegexMatchResult::unmatched()
            }
        }
        // Subsequent-sibling forward combinator (via :has)
        ":has(~)" => {
            let mut next_id = next_element_sibling(arena, node_id);
            while let Some(nid) = next_id {
                let result = match_target(arena, nid, targets, from_idx);
                if result.matched {
                    return merge_results(&result, &unit_result, ":has(~ ");
                }
                next_id = next_element_sibling(arena, nid);
            }
            RegexMatchResult::unmatched()
        }
        _ => RegexMatchResult::unmatched(),
    }
}

fn uncombined_match(arena: &DomArena, node_id: NodeId, target: &RegexTarget<'_>) -> RegexMatchResult {
    let Some(node) = arena.get(node_id) else {
        return RegexMatchResult::unmatched();
    };
    let Some(el) = node.as_element() else {
        return RegexMatchResult::unmatched();
    };

    let is_html = el.namespace == NamespaceURI::XHTML;
    let mut matched = true;
    let mut data = HashMap::new();
    let mut tag_selector = String::new();
    let mut specificity: Specificity = [0, 0, 0];
    let mut specified_attrs: Vec<(String, String)> = Vec::new();

    if let Some(pattern) = target.node_name {
        if let Some(captures) = regex_match(pattern, &el.base.node_name, is_html) {
            // $0 is dropped for nodeName, matching TS behavior.
            for (key, value) in &captures {
                if key != "$0" {
                    data.insert(key.clone(), value.clone());
                }
            }
            tag_selector.clone_from(&el.base.node_name);
            specificity[2] = 1;
        } else {
            matched = false;
        }
    }

    if target.attr_name.is_some() || target.attr_value.is_some() {
        let mut any_attr_matched = false;

        for attr in &el.attributes {
            let (attr_name, attr_value) = get_attr_name_value(attr);

            if let Some(pattern) = target.attr_name {
                let Some(captures) = regex_match(pattern, &attr_name, is_html) else {
                    continue;
                };
                for (key, value) in &captures {
                    if key != "$0" {
                        data.insert(key.clone(), value.clone());
                    }
                }
            }

            if let Some(pattern) = target.attr_value {
                let Some(captures) = regex_match(pattern, &attr_value, is_html) else {
                    continue;
                };
                for (key, value) in &captures {
                    if key != "$0" {
                        data.insert(key.clone(), value.clone());
                    }
                }
                specified_attrs.push((attr_name.clone(), attr_value.clone()));
            } else {
                specified_attrs.push((attr_name.clone(), String::new()));
            }

            any_attr_matched = true;
        }

        if !any_attr_matched {
            matched = false;
        }
    }

    #[allow(clippy::cast_possible_truncation)]
    {
        specificity[1] += specified_attrs.len() as u32;
    }

    if matched {
        let attr_selector: String = specified_attrs
            .iter()
            .map(|(name, value)| {
                if value.is_empty() {
                    format!("[{name}]")
                } else {
                    format!("[{name}=\"{value}\"]")
                }
            })
            .collect();

        RegexMatchResult {
            matched: true,
            selector: format!("{tag_selector}{attr_selector}"),
            specificity,
            data,
        }
    } else {
        RegexMatchResult::unmatched()
    }
}

// ============================================================
// Pattern matching helper
// ============================================================

fn regex_match(pattern: &str, raw: &str, ignore_case: bool) -> Option<HashMap<String, String>> {
    let regex = to_regex(pattern, ignore_case)?;
    let caps = regex.captures(raw)?;

    let mut result = HashMap::new();
    for (i, m) in caps.iter().enumerate() {
        if let Some(m) = m {
            result.insert(format!("${i}"), m.as_str().to_string());
        }
    }
    for name in regex.capture_names().flatten() {
        if let Some(m) = caps.name(name) {
            result.insert(name.to_string(), m.as_str().to_string());
        }
    }
    Some(result)
}

fn to_regex(pattern: &str, ignore_case: bool) -> Option<Regex> {
    if let Some(caps) = REGEX_LITERAL_PATTERN.captures(pattern) {
        let inner = caps.get(1)?.as_str();
        let flags = caps.get(2).map_or("", |m| m.as_str());
        let case_insensitive = flags.contains('i') || ignore_case;
        let pat = if case_insensitive {
            format!("(?i){inner}")
        } else {
            inner.to_string()
        };
        Regex::new(&pat).ok()
    } else {
        // TS: new RegExp(pattern) — treated as raw regex, not escaped.
        // Patterns like "^(?<value>.+)$" must work as-is.
        let trimmed = pattern.trim();
        let pat = if ignore_case {
            format!("(?i){trimmed}")
        } else {
            trimmed.to_string()
        };
        Regex::new(&pat).ok()
    }
}

// ============================================================
// Tree navigation helpers
// ============================================================

fn element_parent(arena: &DomArena, node_id: NodeId) -> Option<NodeId> {
    let node = arena.get(node_id)?;
    let parent_id = node.parent_id()?;
    let parent = arena.get(parent_id)?;
    if parent.as_element().is_some() {
        Some(parent_id)
    } else {
        None
    }
}

fn prev_element_sibling(arena: &DomArena, node_id: NodeId) -> Option<NodeId> {
    let node = arena.get(node_id)?;
    let parent_id = node.parent_id()?;
    let parent = arena.get(parent_id)?;
    let children = parent.children();
    let pos = children.iter().position(|&id| id == node_id)?;
    for &sibling_id in children[..pos].iter().rev() {
        if arena.get(sibling_id)?.as_element().is_some() {
            return Some(sibling_id);
        }
    }
    None
}

fn next_element_sibling(arena: &DomArena, node_id: NodeId) -> Option<NodeId> {
    let node = arena.get(node_id)?;
    let parent_id = node.parent_id()?;
    let parent = arena.get(parent_id)?;
    let children = parent.children();
    let pos = children.iter().position(|&id| id == node_id)?;
    for &sibling_id in &children[pos + 1..] {
        if arena.get(sibling_id)?.as_element().is_some() {
            return Some(sibling_id);
        }
    }
    None
}

fn get_attr_name_value(attr: &MLASTAttr) -> (String, String) {
    match attr {
        MLASTAttr::HTMLAttr(a) => (a.node_name.clone(), a.value.raw.clone()),
        MLASTAttr::Spread(_) => (String::new(), String::new()),
    }
}

fn merge_results(a: &RegexMatchResult, b: &RegexMatchResult, sep: &str) -> RegexMatchResult {
    let mut data = a.data.clone();
    data.extend(b.data.clone());

    let close = sep.starts_with(":has(");
    let selector = if close {
        format!("{}{sep}{})", a.selector, b.selector)
    } else {
        format!("{}{sep}{}", a.selector, b.selector)
    };

    RegexMatchResult {
        matched: true,
        selector,
        specificity: [
            a.specificity[0] + b.specificity[0],
            a.specificity[1] + b.specificity[1],
            a.specificity[2] + b.specificity[2],
        ],
        data,
    }
}

// ============================================================
// Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use markuplint_core::mlast::{ElementType, MLASTHTMLAttr, MLASTToken};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};

    fn empty_token() -> MLASTToken {
        MLASTToken {
            uuid: String::new(),
            raw: String::new(),
            offset: 0,
            line: 1,
            col: 1,
        }
    }

    fn make_attr(name: &str, value: &str) -> MLASTAttr {
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
    }

    fn make_arena_with_element(tag: &str, attrs: &[(&str, &str)]) -> (DomArena, NodeId) {
        let attributes: Vec<MLASTAttr> = attrs.iter().map(|(n, v)| make_attr(n, v)).collect();
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

    // --- regex_match tests ---

    #[test]
    fn plain_string_exact_match() {
        let result = regex_match("div", "div", false);
        assert!(result.is_some());
        assert_eq!(result.as_ref().unwrap()["$0"], "div");
    }

    #[test]
    fn plain_string_no_match() {
        assert!(regex_match("div", "span", false).is_none());
    }

    #[test]
    fn plain_string_case_insensitive() {
        assert!(regex_match("DIV", "div", true).is_some());
    }

    #[test]
    fn regex_literal_with_captures() {
        let result = regex_match("/^h([1-6])$/", "h3", false);
        assert!(result.is_some());
        let data = result.unwrap();
        assert_eq!(data["$0"], "h3");
        assert_eq!(data["$1"], "3");
    }

    #[test]
    fn regex_literal_named_groups() {
        let result = regex_match("/^data-(?P<name>[a-z]+)$/", "data-hoge", false);
        assert!(result.is_some());
        let data = result.unwrap();
        assert_eq!(data["$1"], "hoge");
        assert_eq!(data["name"], "hoge");
    }

    #[test]
    fn regex_literal_no_match() {
        assert!(regex_match("/^h[1-6]$/", "div", false).is_none());
    }

    #[test]
    fn regex_literal_case_flag() {
        let result = regex_match("/^div$/i", "DIV", false);
        assert!(result.is_some());
    }

    #[test]
    fn regex_literal_js_named_groups() {
        // JS syntax (?<name>) should also work (regex crate v1.7+ supports it)
        let result = regex_match("/^data-(?<name>[a-z]+)$/", "data-hoge", false);
        assert!(result.is_some());
        let data = result.unwrap();
        assert_eq!(data["$1"], "hoge");
        assert_eq!(data["name"], "hoge");
    }

    #[test]
    fn empty_pattern_matches_everything() {
        // TS: new RegExp("") matches everything (like /(?:)/)
        assert!(regex_match("", "", false).is_some());
        assert!(regex_match("", "div", false).is_some());
    }

    // --- uncombined_match tests ---

    #[test]
    fn match_by_node_name() {
        let (arena, id) = make_arena_with_element("div", &[]);
        let target = RegexTarget {
            node_name: Some("div"),
            attr_name: None,
            attr_value: None,
            combined_from: None,
        };
        let result = uncombined_match(&arena, id, &target);
        assert!(result.matched);
        assert_eq!(result.specificity, [0, 0, 1]);
    }

    #[test]
    fn match_by_node_name_regex() {
        let (arena, id) = make_arena_with_element("h3", &[]);
        let target = RegexTarget {
            node_name: Some("/^h([1-6])$/"),
            attr_name: None,
            attr_value: None,
            combined_from: None,
        };
        let result = uncombined_match(&arena, id, &target);
        assert!(result.matched);
        assert_eq!(result.data["$1"], "3");
    }

    #[test]
    fn match_by_attr_name() {
        let (arena, id) = make_arena_with_element("div", &[("data-foo", "bar")]);
        let target = RegexTarget {
            node_name: None,
            attr_name: Some("/^data-/"),
            attr_value: None,
            combined_from: None,
        };
        let result = uncombined_match(&arena, id, &target);
        assert!(result.matched);
        assert_eq!(result.specificity[1], 1);
    }

    #[test]
    fn match_by_attr_value() {
        let (arena, id) = make_arena_with_element("input", &[("type", "text")]);
        let target = RegexTarget {
            node_name: None,
            attr_name: None,
            attr_value: Some("text"),
            combined_from: None,
        };
        let result = uncombined_match(&arena, id, &target);
        assert!(result.matched);
    }

    #[test]
    fn attr_name_matches_subset_of_attrs() {
        let (arena, id) = make_arena_with_element("div", &[("data-foo", "1"), ("class", "bar"), ("data-baz", "2")]);
        let target = RegexTarget {
            node_name: None,
            attr_name: Some("/^data-/"),
            attr_value: None,
            combined_from: None,
        };
        let result = uncombined_match(&arena, id, &target);
        assert!(result.matched);
        assert_eq!(result.specificity[1], 2); // 2 data- attrs matched
    }

    #[test]
    fn attr_name_and_value_both_must_match() {
        let (arena, id) = make_arena_with_element("input", &[("type", "text"), ("name", "foo")]);
        let target = RegexTarget {
            node_name: None,
            attr_name: Some("type"),
            attr_value: Some("email"),
            combined_from: None,
        };
        let result = uncombined_match(&arena, id, &target);
        // type matches attrName but "text" != "email" for attrValue, name doesn't match attrName
        assert!(!result.matched);
    }

    #[test]
    fn empty_selector_matches_any_element() {
        let (arena, id) = make_arena_with_element("div", &[]);
        let target = RegexTarget {
            node_name: None,
            attr_name: None,
            attr_value: None,
            combined_from: None,
        };
        let result = uncombined_match(&arena, id, &target);
        assert!(result.matched);
        assert_eq!(result.specificity, [0, 0, 0]);
    }

    #[test]
    fn no_match_wrong_node_name() {
        let (arena, id) = make_arena_with_element("span", &[]);
        let target = RegexTarget {
            node_name: Some("div"),
            attr_name: None,
            attr_value: None,
            combined_from: None,
        };
        let result = uncombined_match(&arena, id, &target);
        assert!(!result.matched);
    }

    #[test]
    fn match_node_name_and_attr() {
        let (arena, id) = make_arena_with_element("input", &[("type", "email")]);
        let target = RegexTarget {
            node_name: Some("input"),
            attr_name: Some("type"),
            attr_value: Some("email"),
            combined_from: None,
        };
        let result = uncombined_match(&arena, id, &target);
        assert!(result.matched);
        assert_eq!(result.specificity, [0, 1, 1]);
    }

    // --- regex_select integration ---

    #[test]
    fn regex_select_simple() {
        let (arena, id) = make_arena_with_element("div", &[("class", "foo")]);
        let selector = RegexSelector {
            node_name: Some("div".to_string()),
            attr_name: None,
            attr_value: None,
            combination: None,
        };
        let result = regex_select(&arena, id, &selector);
        assert!(result.matched);
        assert_eq!(result.selector, "div");
    }

    #[test]
    fn regex_select_with_attrs() {
        let (arena, id) = make_arena_with_element("input", &[("type", "email")]);
        let selector = RegexSelector {
            node_name: Some("input".to_string()),
            attr_name: Some("type".to_string()),
            attr_value: Some("email".to_string()),
            combination: None,
        };
        let result = regex_select(&arena, id, &selector);
        assert!(result.matched);
        assert_eq!(result.selector, "input[type=\"email\"]");
        assert_eq!(result.specificity, [0, 1, 1]);
    }

    #[test]
    fn regex_select_empty_matches_any() {
        let (arena, id) = make_arena_with_element("span", &[]);
        let selector = RegexSelector {
            node_name: None,
            attr_name: None,
            attr_value: None,
            combination: None,
        };
        let result = regex_select(&arena, id, &selector);
        assert!(result.matched);
        assert_eq!(result.specificity, [0, 0, 0]);
    }

    #[test]
    fn regex_select_no_match() {
        let (arena, id) = make_arena_with_element("span", &[]);
        let selector = RegexSelector {
            node_name: Some("div".to_string()),
            attr_name: None,
            attr_value: None,
            combination: None,
        };
        let result = regex_select(&arena, id, &selector);
        assert!(!result.matched);
    }

    // --- to_regex tests ---

    #[test]
    fn to_regex_plain_string() {
        // TS: new RegExp("foo") — substring match, not exact
        let re = to_regex("foo", false).unwrap();
        assert!(re.is_match("foo"));
        assert!(re.is_match("foobar")); // substring match
        assert!(re.is_match("barfoo")); // substring match
    }

    #[test]
    fn to_regex_literal() {
        let re = to_regex("/^data-/", false).unwrap();
        assert!(re.is_match("data-foo"));
        assert!(!re.is_match("foo-data"));
    }

    #[test]
    fn to_regex_case_insensitive_flag() {
        let re = to_regex("/^div$/i", false).unwrap();
        assert!(re.is_match("DIV"));
        assert!(re.is_match("div"));
    }

    #[test]
    fn to_regex_case_insensitive_param() {
        let re = to_regex("div", true).unwrap();
        assert!(re.is_match("DIV"));
    }

    // --- serde deserialization ---

    #[test]
    fn deserialize_simple_selector() {
        let json = r#"{"nodeName": "div"}"#;
        let sel: RegexSelector = serde_json::from_str(json).unwrap();
        assert_eq!(sel.node_name.as_deref(), Some("div"));
        assert!(sel.combination.is_none());
    }

    #[test]
    fn deserialize_with_combination() {
        let json = r#"{
            "nodeName": "/^h[1-6]$/",
            "combination": {
                "combinator": ">",
                "nodeName": "section"
            }
        }"#;
        let sel: RegexSelector = serde_json::from_str(json).unwrap();
        assert_eq!(sel.node_name.as_deref(), Some("/^h[1-6]$/"));
        let combo = sel.combination.as_ref().unwrap();
        assert_eq!(combo.combinator, ">");
        assert_eq!(combo.node_name.as_deref(), Some("section"));
    }
}
