//! CSS selector matcher.
//!
//! Matches parsed selector AST against DOM elements in a `DomArena`.
//! Corresponds to the matching logic in `@markuplint/selector/src/selector.ts`.

use markuplint_core::mlast::{MLASTAttr, NamespaceURI};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::ElementData;
use markuplint_types::spec::types::MLMLSpec;

use crate::ast::{
    AttrOperator, AttributeSelector, Combinator, ComplexSelector, CompoundSelector, PseudoClassSelector, SelectorList,
    SimpleSelector, Specificity,
};
use crate::extended;

/// Result of matching a selector against an element.
#[derive(Debug, Clone)]
pub struct MatchResult {
    pub matched: bool,
    pub specificity: Specificity,
}

impl MatchResult {
    fn matched(specificity: Specificity) -> Self {
        Self {
            matched: true,
            specificity,
        }
    }

    fn unmatched() -> Self {
        Self {
            matched: false,
            specificity: [0, 0, 0],
        }
    }
}

/// Match a selector list against an element.
///
/// Returns `true` if any selector in the comma-separated list matches.
/// `scope` is the element for `:scope` pseudo-class resolution.
/// `spec` provides spec data for extended pseudo-classes: `:model()` resolves
/// content model categories, `:role()` and `:aria()` are stubs (Phase 2-3).
pub fn matches(
    selector: &SelectorList,
    arena: &DomArena,
    node_id: NodeId,
    scope: Option<NodeId>,
    spec: Option<&MLMLSpec>,
) -> bool {
    let scope = scope.unwrap_or(node_id);
    selector
        .selectors
        .iter()
        .any(|sel| match_complex(sel, arena, node_id, scope, spec).matched)
}

/// Match a selector list and return the highest specificity, or `None` if no match.
/// See [`matches`] for parameter descriptions.
pub fn match_specificity(
    selector: &SelectorList,
    arena: &DomArena,
    node_id: NodeId,
    scope: Option<NodeId>,
    spec: Option<&MLMLSpec>,
) -> Option<Specificity> {
    let scope = scope.unwrap_or(node_id);
    let mut best: Option<Specificity> = None;
    for sel in &selector.selectors {
        let result = match_complex(sel, arena, node_id, scope, spec);
        if result.matched {
            match &best {
                None => best = Some(result.specificity),
                Some(current) => {
                    if result.specificity > *current {
                        best = Some(result.specificity);
                    }
                }
            }
        }
    }
    best
}

/// Match a complex selector (compound + combinator chain) against an element.
fn match_complex(
    selector: &ComplexSelector,
    arena: &DomArena,
    node_id: NodeId,
    scope: NodeId,
    spec: Option<&MLMLSpec>,
) -> MatchResult {
    let result = match_compound(&selector.subject, arena, node_id, scope, spec);
    if !result.matched {
        return result;
    }

    let mut specificity = result.specificity;
    let mut current_id = node_id;

    // Walk the combinator chain (stored reversed: parent is first)
    for (combinator, compound) in &selector.chain {
        match combinator {
            Combinator::Descendant => {
                let mut found = false;
                let mut ancestor_id = element_parent(arena, current_id);
                while let Some(aid) = ancestor_id {
                    let r = match_compound(compound, arena, aid, scope, spec);
                    if r.matched {
                        add_specificity(&mut specificity, &r.specificity);
                        current_id = aid;
                        found = true;
                        break;
                    }
                    ancestor_id = element_parent(arena, aid);
                }
                if !found {
                    return MatchResult::unmatched();
                }
            }
            Combinator::Child => {
                let Some(parent_id) = element_parent(arena, current_id) else {
                    return MatchResult::unmatched();
                };
                let r = match_compound(compound, arena, parent_id, scope, spec);
                if !r.matched {
                    return MatchResult::unmatched();
                }
                add_specificity(&mut specificity, &r.specificity);
                current_id = parent_id;
            }
            Combinator::NextSibling => {
                let Some(prev_id) = prev_element_sibling(arena, current_id) else {
                    return MatchResult::unmatched();
                };
                let r = match_compound(compound, arena, prev_id, scope, spec);
                if !r.matched {
                    return MatchResult::unmatched();
                }
                add_specificity(&mut specificity, &r.specificity);
                current_id = prev_id;
            }
            Combinator::SubsequentSibling => {
                let mut found = false;
                let mut prev_id = prev_element_sibling(arena, current_id);
                while let Some(pid) = prev_id {
                    let r = match_compound(compound, arena, pid, scope, spec);
                    if r.matched {
                        add_specificity(&mut specificity, &r.specificity);
                        current_id = pid;
                        found = true;
                        break;
                    }
                    prev_id = prev_element_sibling(arena, pid);
                }
                if !found {
                    return MatchResult::unmatched();
                }
            }
        }
    }

    MatchResult::matched(specificity)
}

/// Match a compound selector (all parts must match).
fn match_compound(
    compound: &CompoundSelector,
    arena: &DomArena,
    node_id: NodeId,
    scope: NodeId,
    spec: Option<&MLMLSpec>,
) -> MatchResult {
    let Some(node) = arena.get(node_id) else {
        return MatchResult::unmatched();
    };
    let Some(el) = node.as_element() else {
        return MatchResult::unmatched();
    };

    let mut specificity: Specificity = [0, 0, 0];

    for part in &compound.parts {
        match part {
            SimpleSelector::Universal => {
                // Universal matches everything — no specificity contribution
            }
            SimpleSelector::Type(name) => {
                if !el.base.node_name.eq_ignore_ascii_case(name) {
                    return MatchResult::unmatched();
                }
                specificity[2] += 1;
            }
            SimpleSelector::Id(id) => {
                if !has_attr_value(el, "id", id) {
                    return MatchResult::unmatched();
                }
                specificity[0] += 1;
            }
            SimpleSelector::Class(class) => {
                if !has_class(el, class) {
                    return MatchResult::unmatched();
                }
                specificity[1] += 1;
            }
            SimpleSelector::Attribute(attr_sel) => {
                if !match_attribute(el, attr_sel) {
                    return MatchResult::unmatched();
                }
                specificity[1] += 1;
            }
            SimpleSelector::PseudoClass(pseudo) => {
                let r = match_pseudo_class(pseudo, arena, node_id, scope, spec);
                if !r.matched {
                    return MatchResult::unmatched();
                }
                add_specificity(&mut specificity, &r.specificity);
            }
            SimpleSelector::Namespace(ns) => {
                let expected = match ns.to_ascii_lowercase().as_str() {
                    "svg" => NamespaceURI::SVG,
                    "mml" | "math" => NamespaceURI::MathML,
                    "*" => continue,
                    _ => return MatchResult::unmatched(),
                };
                if el.namespace != expected {
                    return MatchResult::unmatched();
                }
                // Namespace doesn't contribute to specificity
            }
        }
    }

    MatchResult::matched(specificity)
}

/// Match a pseudo-class.
fn match_pseudo_class(
    pseudo: &PseudoClassSelector,
    arena: &DomArena,
    node_id: NodeId,
    scope: NodeId,
    spec: Option<&MLMLSpec>,
) -> MatchResult {
    match pseudo {
        PseudoClassSelector::Not(inner) => {
            if matches(inner, arena, node_id, Some(scope), spec) {
                MatchResult::unmatched()
            } else {
                // :not() specificity = most specific selector in the list
                MatchResult::matched([0, 1, 0])
            }
        }
        PseudoClassSelector::Is(inner) => {
            if let Some(spec) = match_specificity(inner, arena, node_id, Some(scope), spec) {
                MatchResult::matched(spec)
            } else {
                MatchResult::unmatched()
            }
        }
        PseudoClassSelector::Has(inner) => {
            // :has() checks descendants only.
            // TODO: TS also checks siblings for :has(+ ...) and :has(~ ...)
            // via headCombinator detection. Relative selectors need parser support.
            let mut found = false;
            for desc in arena.descendants(node_id) {
                if let Some(desc_el_id) = desc.as_element().map(|e| e.base.id)
                    && matches(inner, arena, desc_el_id, Some(scope), spec)
                {
                    found = true;
                    break;
                }
            }
            if found {
                MatchResult::matched([0, 1, 0])
            } else {
                MatchResult::unmatched()
            }
        }
        PseudoClassSelector::Where(inner) => {
            // :where() = same as :is() but zero specificity
            if matches(inner, arena, node_id, Some(scope), spec) {
                MatchResult::matched([0, 0, 0])
            } else {
                MatchResult::unmatched()
            }
        }
        PseudoClassSelector::Scope => {
            // :scope matches the scope element, or root if no scope is set
            if node_id == scope {
                MatchResult::matched([0, 1, 0])
            } else {
                MatchResult::unmatched()
            }
        }
        PseudoClassSelector::Root => {
            // :root matches the html element (no parent element)
            if element_parent(arena, node_id).is_none() {
                MatchResult::matched([0, 1, 0])
            } else {
                MatchResult::unmatched()
            }
        }
        PseudoClassSelector::Closest(inner) => {
            // :closest() — markuplint-specific: matches if any ancestor matches
            let mut ancestor_id = element_parent(arena, node_id);
            while let Some(aid) = ancestor_id {
                if matches(inner, arena, aid, Some(scope), spec) {
                    return MatchResult::matched([0, 1, 0]);
                }
                ancestor_id = element_parent(arena, aid);
            }
            MatchResult::unmatched()
        }
        PseudoClassSelector::Model(category) => {
            if let Some(spec) = spec {
                if extended::matches_model(spec, arena, node_id, category) {
                    MatchResult::matched([0, 1, 0])
                } else {
                    MatchResult::unmatched()
                }
            } else {
                MatchResult::unmatched()
            }
        }
        PseudoClassSelector::Role(_) | PseudoClassSelector::Aria(_) => {
            // :role() requires getComputedRole (Phase 2-3b)
            // :aria() requires accessible name computation (Phase 2-3c)
            MatchResult::unmatched()
        }
    }
}

// ============================================================
// Attribute matching
// ============================================================

fn match_attribute(el: &ElementData, sel: &AttributeSelector) -> bool {
    let Some(value) = get_attr(el, &sel.name) else {
        // Attribute doesn't exist — never matches (even [attr] requires existence)
        return false;
    };

    let Some(op) = &sel.operator else {
        // [attr] — just check existence
        return true;
    };

    let Some(expected) = &sel.value else {
        return false;
    };

    let (actual, expected) = if sel.case_insensitive {
        (value.to_ascii_lowercase(), expected.to_ascii_lowercase())
    } else {
        (value.to_string(), expected.clone())
    };

    match op {
        AttrOperator::Equals => actual == expected,
        AttrOperator::Includes => actual.split_ascii_whitespace().any(|w| w == expected),
        AttrOperator::DashMatch => actual == expected || actual.starts_with(&format!("{expected}-")),
        AttrOperator::PrefixMatch => actual.starts_with(&expected),
        AttrOperator::SuffixMatch => actual.ends_with(&expected),
        AttrOperator::SubstringMatch => actual.contains(&expected),
    }
}

fn get_attr<'a>(el: &'a ElementData, name: &str) -> Option<&'a str> {
    for attr in &el.attributes {
        if let MLASTAttr::HTMLAttr(html_attr) = attr
            && html_attr.node_name.eq_ignore_ascii_case(name)
        {
            return Some(&html_attr.value.raw);
        }
    }
    None
}

fn has_attr_value(el: &ElementData, name: &str, value: &str) -> bool {
    get_attr(el, name).is_some_and(|v| v == value)
}

fn has_class(el: &ElementData, class_name: &str) -> bool {
    get_attr(el, "class").is_some_and(|classes| classes.split_ascii_whitespace().any(|c| c == class_name))
}

// ============================================================
// Tree navigation helpers
// ============================================================

/// Find the parent element (skipping non-element nodes).
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

/// Find the previous sibling that is an element.
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

fn add_specificity(a: &mut Specificity, b: &Specificity) {
    a[0] += b[0];
    a[1] += b[1];
    a[2] += b[2];
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser;
    use markuplint_core::mlast::MLASTHTMLAttr;
    use markuplint_dom::builder;

    fn build(html: &str) -> DomArena {
        let json = make_mlast_json(html);
        builder::build_from_json(&json).unwrap()
    }

    fn make_mlast_json(html: &str) -> String {
        // Minimal MLAST JSON for testing. Creates elements from simple HTML-like notation.
        // For proper testing we'd use the real parser, but for unit tests we build manually.
        // This is a simplified builder that creates a flat element list.
        format!(
            r#"{{"nodeList":[],"raw":"{}","isFragment":true}}"#,
            html.replace('"', "\\\"")
        )
    }

    // Since building a real MLAST from HTML requires the TS parser,
    // we test the individual matching functions directly.

    #[test]
    fn parse_and_check_structure() {
        // Verify the parser produces correct AST for the matcher
        let sel = parser::parse("div.foo#bar[type=text]").unwrap();
        assert_eq!(sel.selectors.len(), 1);
        assert_eq!(sel.selectors[0].subject.parts.len(), 4);
    }

    #[test]
    fn attribute_match_equals() {
        // Test attribute matching logic directly
        let sel = AttributeSelector {
            name: "type".to_string(),
            operator: Some(AttrOperator::Equals),
            value: Some("text".to_string()),
            case_insensitive: false,
        };
        // Create a minimal element with attributes
        let el = make_element("input", &[("type", "text")]);
        assert!(match_attribute(&el, &sel));
    }

    #[test]
    fn attribute_match_case_insensitive() {
        let sel = AttributeSelector {
            name: "type".to_string(),
            operator: Some(AttrOperator::Equals),
            value: Some("TEXT".to_string()),
            case_insensitive: true,
        };
        let el = make_element("input", &[("type", "text")]);
        assert!(match_attribute(&el, &sel));
    }

    #[test]
    fn attribute_match_includes() {
        let sel = AttributeSelector {
            name: "class".to_string(),
            operator: Some(AttrOperator::Includes),
            value: Some("foo".to_string()),
            case_insensitive: false,
        };
        let el = make_element("div", &[("class", "foo bar baz")]);
        assert!(match_attribute(&el, &sel));
    }

    #[test]
    fn attribute_match_prefix() {
        let sel = AttributeSelector {
            name: "href".to_string(),
            operator: Some(AttrOperator::PrefixMatch),
            value: Some("https".to_string()),
            case_insensitive: false,
        };
        let el = make_element("a", &[("href", "https://example.com")]);
        assert!(match_attribute(&el, &sel));
    }

    #[test]
    fn attribute_match_suffix() {
        let sel = AttributeSelector {
            name: "src".to_string(),
            operator: Some(AttrOperator::SuffixMatch),
            value: Some(".png".to_string()),
            case_insensitive: false,
        };
        let el = make_element("img", &[("src", "image.png")]);
        assert!(match_attribute(&el, &sel));
    }

    #[test]
    fn attribute_match_substring() {
        let sel = AttributeSelector {
            name: "href".to_string(),
            operator: Some(AttrOperator::SubstringMatch),
            value: Some("example".to_string()),
            case_insensitive: false,
        };
        let el = make_element("a", &[("href", "https://example.com/page")]);
        assert!(match_attribute(&el, &sel));
    }

    #[test]
    fn attribute_match_dash() {
        let sel = AttributeSelector {
            name: "lang".to_string(),
            operator: Some(AttrOperator::DashMatch),
            value: Some("en".to_string()),
            case_insensitive: false,
        };
        let el = make_element("html", &[("lang", "en-US")]);
        assert!(match_attribute(&el, &sel));

        let el2 = make_element("html", &[("lang", "en")]);
        assert!(match_attribute(&el2, &sel));

        let el3 = make_element("html", &[("lang", "fr")]);
        assert!(!match_attribute(&el3, &sel));
    }

    #[test]
    fn attribute_exists_only() {
        let sel = AttributeSelector {
            name: "href".to_string(),
            operator: None,
            value: None,
            case_insensitive: false,
        };
        let el = make_element("a", &[("href", "")]);
        assert!(match_attribute(&el, &sel));

        let el2 = make_element("a", &[]);
        assert!(!match_attribute(&el2, &sel));
    }

    #[test]
    fn class_matching() {
        let el = make_element("div", &[("class", "foo bar baz")]);
        assert!(has_class(&el, "foo"));
        assert!(has_class(&el, "bar"));
        assert!(has_class(&el, "baz"));
        assert!(!has_class(&el, "qux"));
    }

    #[test]
    fn id_matching() {
        let el = make_element("div", &[("id", "main")]);
        assert!(has_attr_value(&el, "id", "main"));
        assert!(!has_attr_value(&el, "id", "other"));
    }

    // Helper to create a minimal ElementData for testing
    fn make_element(tag_name: &str, attrs: &[(&str, &str)]) -> ElementData {
        use markuplint_core::mlast::MLASTToken;

        let empty_token = || MLASTToken {
            uuid: String::new(),
            raw: String::new(),
            offset: 0,
            line: 1,
            col: 1,
        };

        let attributes = attrs
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

        ElementData {
            base: markuplint_dom::node::NodeBase {
                id: 0,
                uuid: String::new(),
                raw: format!("<{tag_name}>"),
                offset: 0,
                line: 1,
                col: 1,
                node_name: tag_name.to_string(),
                parent: None,
                children: Vec::new(),
                next_sibling: None,
                prev_sibling: None,
                depth: 0,
            },
            namespace: NamespaceURI::XHTML,
            element_type: markuplint_core::mlast::ElementType::Html,
            is_fragment: false,
            attributes,
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
        }
    }
}
