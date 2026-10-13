use std::sync::LazyLock;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::{find_element_by_id, get_attr_value, get_attr_value_from_el, has_attr};
use markuplint_dom::node::{DomNode, ElementData};

use crate::slot_content::slot_content;

static REGEX_LITERAL_RE: LazyLock<regex::Regex> = LazyLock::new(|| regex::Regex::new(r"^/(.+)/([gim]*)$").unwrap());

/// If the pattern is wrapped in `/` (e.g. `/^[a-z]+$/i`), it is treated
/// as a regular expression (with optional flags `g`, `i`, `m`).
/// Otherwise, the pattern is compared as an exact string match.
///
/// Uses `fancy-regex` to support lookahead/lookbehind assertions
/// (e.g., `/^(?!c-).+$/`), matching JavaScript regex behavior.
///
/// Mirrors the TS `match()` helper in `@markuplint/rules/src/helpers.ts`.
pub fn pattern_match(needle: &str, pattern: &str) -> bool {
    if let Some(re) = parse_regex_literal(pattern) {
        re.is_match(needle).unwrap_or(false)
    } else {
        needle == pattern
    }
}

fn parse_regex_literal(pattern: &str) -> Option<fancy_regex::Regex> {
    let caps = REGEX_LITERAL_RE.captures(pattern)?;
    let body = caps.get(1)?.as_str();
    let flags = caps.get(2).map_or("", |m| m.as_str());

    let mut regex_str = String::new();
    if flags.contains('i') {
        regex_str.push_str("(?i)");
    }
    if flags.contains('m') {
        regex_str.push_str("(?m)");
    }
    regex_str.push_str(body);

    fancy_regex::Regex::new(&regex_str).ok()
}

/// TS `accnameMayComeFromUnknownContent()`: whether the accessible name of `node_id` may be
/// rendered by content the pretender does not know — an unknown entry (`{ dynamic: true }`) in
/// the `contents` of the element, of a pretended descendant among the children the name
/// computation traverses, of an element `aria-labelledby` refers to, or of the owned label.
///
/// A component with an unknown entry and a static name (`aria-label`, static text) is still
/// decidable, so call this only once the static name has been computed and found empty.
pub fn accname_may_come_from_unknown_content(arena: &DomArena, node_id: NodeId) -> bool {
    if has_unknown_content(arena, node_id) {
        return true;
    }

    if let Some(labelledby) = get_attr_value(arena, node_id, "aria-labelledby")
        && labelledby
            .split_whitespace()
            .filter_map(|id| find_element_by_id(arena, id))
            .any(|target| has_unknown_content(arena, target))
    {
        return true;
    }

    get_owned_label(arena, node_id).is_some_and(|label| has_unknown_content(arena, label))
}

/// TS `hasUnknownContent()`: walks the same children the accname resolver does — for a
/// pretended element, the children the component renders, so that a nested component
/// contributes its own `contents`; otherwise the children as written. A hidden child is skipped
/// because the name computation never reads it.
fn has_unknown_content(arena: &DomArena, node_id: NodeId) -> bool {
    if slot_content(arena, node_id).is_some_and(|content| content.mutable) {
        return true;
    }
    let children = arena
        .pretender_rendered_children(node_id)
        .unwrap_or_else(|| arena.children_of(node_id).map(<[NodeId]>::to_vec).unwrap_or_default());
    children.into_iter().any(|child| {
        arena.get(child).and_then(DomNode::as_element).is_some()
            && get_attr_value(arena, child, "aria-hidden") != Some("true")
            && !has_attr(arena, child, "hidden")
            && has_unknown_content(arena, child)
    })
}

/// TS `labelable`: the selectors of the elements a `label` can be associated with.
fn is_labelable(el: &ElementData) -> bool {
    match el.base.node_name.to_ascii_lowercase().as_str() {
        "button" | "meter" | "output" | "progress" | "select" | "textarea" => true,
        "input" => !get_attr_value_from_el(el, "type").is_some_and(|t| t.eq_ignore_ascii_case("hidden")),
        _ => false,
    }
}

/// TS `getOwnedLabel()`: the `label` around a labelable element, else the first one whose `for`
/// names its `id`.
pub fn get_owned_label(arena: &DomArena, node_id: NodeId) -> Option<NodeId> {
    let el = arena.get(node_id)?.as_element()?;
    if !is_labelable(el) {
        return None;
    }
    let ancestor = arena.ancestors(node_id).find_map(|node| {
        node.as_element()
            .filter(|a| a.base.node_name.eq_ignore_ascii_case("label"))
            .map(|a| a.base.id)
    });
    if ancestor.is_some() {
        return ancestor;
    }
    let id = get_attr_value_from_el(el, "id").filter(|id| !id.is_empty())?;
    arena
        .elements()
        .find(|(_, label)| {
            label.base.node_name.eq_ignore_ascii_case("label") && get_attr_value_from_el(label, "for") == Some(id)
        })
        .map(|(label_id, _)| label_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn regex_pattern_matches() {
        assert!(pattern_match("foo", "/^[a-z]+$/"));
        assert!(!pattern_match("Foo", "/^[a-z]+$/"));
    }

    #[test]
    fn regex_pattern_with_flags() {
        assert!(pattern_match("FOO", "/^[a-z]+$/i"));
    }

    #[test]
    fn exact_match_without_slashes() {
        assert!(pattern_match("foo", "foo"));
        assert!(!pattern_match("foo", "bar"));
    }

    #[test]
    fn slash_only_pattern() {
        assert!(!pattern_match("foo", "/"));
    }

    #[test]
    fn negative_lookahead() {
        // /^(?!c-).+$/ matches strings NOT starting with "c-"
        assert!(pattern_match("hoge", "/^(?!c-).+$/"));
        assert!(!pattern_match("c-root", "/^(?!c-).+$/"));
    }

    #[test]
    fn positive_lookahead() {
        assert!(pattern_match("foobar", "/foo(?=bar)/"));
        assert!(!pattern_match("foobaz", "/foo(?=bar)/"));
    }
}
