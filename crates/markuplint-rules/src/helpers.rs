use std::sync::LazyLock;

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::{get_attr_node_from_el, get_attr_value, get_attr_value_from_el, has_attr};
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::accname::resolver::rendered_child_nodes;
use crate::aria_check::element_local_name;
use crate::slot_assignment::{get_assigned_nodes, shadow_root_template};
use crate::slot_content::slot_content;
use crate::tree_scope::{
    ShadowRootAttachment, TreeRoot, declarative_shadow_root_attachment, decode_or_keep, dom_value, element_by_id_of,
    is_expression, root_of,
};

static REGEX_LITERAL_RE: LazyLock<regex::Regex> = LazyLock::new(|| regex::Regex::new(r"^/(.*)/([gim]*)$").unwrap());

/// If the pattern is wrapped in `/` (e.g. `/^[a-z]+$/i`), it is treated
/// as a regular expression (with optional flags `g`, `i`, `m`).
/// Otherwise, the pattern is compared as an exact string match.
///
/// The expression is read as JavaScript reads it ([`JsRegex`]: lookaround, a lookbehind of any
/// length), and of the flags only the last counts, as the capture of TS `/^\/(.*)\/([gim])*$/` keeps.
///
/// Mirrors the TS `match()` helper in `@markuplint/rules/src/helpers.ts`.
///
/// [`JsRegex`]: markuplint_types::check::js_regex::JsRegex
pub fn pattern_match(needle: &str, pattern: &str) -> bool {
    if let Some(caps) = REGEX_LITERAL_RE.captures(pattern)
        && let Some(body) = caps.get(1).map(|m| m.as_str()).filter(|b| !b.is_empty())
    {
        let flags = caps.get(2).map_or("", |m| m.as_str());
        let last_flag: String = flags.chars().last().map(String::from).unwrap_or_default();
        // TS `new RegExp` throws for a pattern it cannot read
        return markuplint_types::check::js_regex::JsRegex::new(body, &last_flag).is_some_and(|re| re.is_match(needle));
    }
    needle == pattern
}

/// TS `el.pretenderContext?.type === 'pretender' && !el.hasAttribute('as')`: an element
/// a pretender makes pretend, without the `as` attribute that would say its type at the
/// usage site. The reference rules skip such an element, whose attributes and
/// descendants are those of the component's usage, not of what it renders.
///
/// TS reads `as` through the pretender, which inherits it, so the effective attributes
/// are read here too.
#[must_use]
pub fn is_pretender_without_as_attr(el: &ElementData) -> bool {
    el.pretended().is_some() && get_attr_value_from_el(el, "as").is_none()
}

/// TS `el.hasMutableAttributes()`: an attribute is a spread or has a value that is not known, so
/// what the element renders may differ from what is written. An attribute that is known not to be
/// output (`is_absent`) does not change.
pub fn has_mutable_attributes(el: &ElementData) -> bool {
    el.attributes.iter().any(|attr| match attr {
        MLASTAttr::Spread(_) => true,
        MLASTAttr::HTMLAttr(attr) => attr.is_dynamic_value == Some(true) && attr.is_absent != Some(true),
    })
}

/// TS `el.hasMutableChildren(attr)`: below the element there is a preprocessor block without a
/// behavior (its branches cannot be enumerated), a `<slot>`, or — with `attr` — an element with a
/// mutable attribute or a component whose output is not known.
pub fn has_mutable_children(arena: &DomArena, node_id: NodeId, attr: bool) -> bool {
    has_mutable_children_with(arena, node_id, attr, &|_| true)
}

/// [`has_mutable_children`] that asks `is_mutable_slot` which `slot` among the descendants may render
/// what is not known (TS `hasMutableChildren(attr, isMutableSlot)`). Every `slot` is mutable by default,
/// as a `slot` that is not in a declarative shadow root renders what is given to it; a rule that reads
/// what a slot of a shadow root renders by [`get_assigned_nodes`] says which slots are.
pub fn has_mutable_children_with(
    arena: &DomArena,
    node_id: NodeId,
    attr: bool,
    is_mutable_slot: &dyn Fn(NodeId) -> bool,
) -> bool {
    arena
        .pure_children_of(node_id)
        .into_iter()
        .any(|child_id| match arena.get(child_id) {
            Some(DomNode::PSBlock(block)) => block.block_behavior.is_none(),
            Some(DomNode::Element(el)) => {
                (attr && (has_mutable_attributes(el) || is_unresolved_component(el)))
                    || has_mutable_children_with(arena, child_id, attr, is_mutable_slot)
                    || (element_local_name(el) == "slot" && is_mutable_slot(child_id))
            }
            _ => false,
        })
}

/// TS `isSlotOfUnknownAssignment`: whether a `slot` renders what the markup does not tell: the nodes
/// assigned to it, or its children, are not known ([`get_assigned_nodes`] is `None`). A slot whose
/// assignment is known renders them, which the rule reads itself.
pub fn is_slot_of_unknown_assignment(arena: &DomArena, spec: &MLMLSpec, slot: NodeId) -> bool {
    get_assigned_nodes(arena, spec, slot).is_none()
}

/// TS `MLElement#isUnresolvedComponent()`: a component whose output is not known, one that no
/// pretender resolved to an element (or that a pretender resolved to another component).
pub fn is_unresolved_component(el: &ElementData) -> bool {
    el.element_type == markuplint_core::mlast::ElementType::Authored
}

/// TS `mayRenderUnknownChildren`: a child node that may stand for children that are not known —
/// a preprocessor block without a behavior (`{value}`, an `include`), a `slot`, or, with
/// `components`, a component whose output is not known.
pub fn may_render_unknown_children(arena: &DomArena, node_id: NodeId, components: bool) -> bool {
    match arena.get(node_id) {
        Some(DomNode::PSBlock(block)) => block.block_behavior.is_none(),
        Some(DomNode::Element(el)) => element_local_name(el) == "slot" || (components && is_unresolved_component(el)),
        _ => false,
    }
}

/// TS `accnameMayBeMutable()`: the element, or the label it owns, has an attribute or a child
/// that may change what the accessible name is at runtime, so a static scan cannot judge it.
pub fn accname_may_be_mutable(arena: &DomArena, spec: &MLMLSpec, node_id: NodeId) -> bool {
    let is_mutable = |id: NodeId| {
        arena
            .get(id)
            .and_then(DomNode::as_element)
            .is_some_and(has_mutable_attributes)
            || has_mutable_children_with(arena, id, true, &|slot| {
                is_slot_of_unknown_assignment(arena, spec, slot)
            })
    };
    is_mutable(node_id) || get_owned_label(arena, spec, node_id).is_some_and(is_mutable)
}

/// TS `accnameMayComeFromUnknownContent()`: whether the accessible name of `node_id` may be
/// rendered by content the pretender does not know — an unknown entry (`{ dynamic: true }`) in
/// the `contents` of the element, of a pretended descendant among the children the name
/// computation traverses, of an element `aria-labelledby` refers to, or of the owned label.
///
/// A component with an unknown entry and a static name (`aria-label`, static text) is still
/// decidable, so call this only once the static name has been computed and found empty.
pub fn accname_may_come_from_unknown_content(arena: &DomArena, spec: &MLMLSpec, node_id: NodeId) -> bool {
    if has_unknown_content(arena, spec, node_id) {
        return true;
    }

    // The ids are resolved in the tree of the element
    if let Some(labelledby) = arena
        .get(node_id)
        .and_then(DomNode::as_element)
        .and_then(|el| get_attr_node_from_el(el, "aria-labelledby"))
    {
        let root = root_of(arena, spec, node_id);
        let found = markuplint_dom::helpers::attr_value(labelledby)
            .split_whitespace()
            .filter_map(|id| {
                let id = if is_expression(labelledby) {
                    id.to_owned()
                } else {
                    decode_or_keep(id)
                };
                element_by_id_of(arena, spec, root, &id)
            })
            .any(|target| has_unknown_content(arena, spec, target));
        if found {
            return true;
        }
    }

    get_owned_label(arena, spec, node_id).is_some_and(|label| has_unknown_content(arena, spec, label))
}

/// TS `hasUnknownContent()`: walks the same children the accname resolver does
/// ([`rendered_child_nodes`]) — for a pretended element, the children the component renders, so
/// that a nested component contributes its own `contents`; the child nodes of a declarative shadow
/// root; otherwise the children as written. A hidden child is skipped because the name computation
/// never reads it.
///
/// A `template` whose shadow root is only maybe attached returns `true` before that walk. Its
/// content is omitted from the computed name, so an ancestor whose computed name is empty is not
/// reported: the rule calls this only after the computed name is empty.
///
/// Unknown `contents` of a pretended component count only when no declarative shadow root is
/// attached to it: the shadow root is rendered in their place.
fn has_unknown_content(arena: &DomArena, spec: &MLMLSpec, node_id: NodeId) -> bool {
    let el = arena.get(node_id).and_then(DomNode::as_element);
    let pretended = el.is_some_and(|el| el.pretended().is_some());
    if pretended
        && slot_content(arena, node_id).is_some_and(|content| content.mutable)
        && shadow_root_template(arena, spec, node_id).is_none()
    {
        return true;
    }
    if !pretended
        && el.is_some_and(|el| is_html_template_element(el, spec))
        && declarative_shadow_root_attachment(arena, spec, node_id) == ShadowRootAttachment::Unknown
    {
        return true;
    }
    let children = rendered_child_nodes(spec, arena, node_id)
        .unwrap_or_else(|| arena.children_of(node_id).map(<[NodeId]>::to_vec).unwrap_or_default());
    children.into_iter().any(|child| {
        arena.get(child).and_then(DomNode::as_element).is_some()
            && get_attr_value(arena, child, "aria-hidden") != Some("true")
            && !has_attr(arena, child, "hidden")
            && has_unknown_content(arena, spec, child)
    })
}

/// TS `labelable`: the selectors of the elements a `label` can be associated with.
pub(crate) fn is_labelable(el: &ElementData) -> bool {
    match el.base.node_name.to_ascii_lowercase().as_str() {
        "button" | "meter" | "output" | "progress" | "select" | "textarea" => true,
        "input" => !get_attr_value_from_el(el, "type").is_some_and(|t| t.eq_ignore_ascii_case("hidden")),
        _ => false,
    }
}

/// TS `getOwnedLabel()`: the `label` around a labelable element, else the first one whose `for`
/// names its `id`. Both are looked for in the tree of the element, and the two values are compared
/// as the DOM has them.
pub fn get_owned_label(arena: &DomArena, spec: &MLMLSpec, node_id: NodeId) -> Option<NodeId> {
    let el = arena.get(node_id)?.as_element()?;
    if !is_labelable(el) {
        return None;
    }
    let root = root_of(arena, spec, node_id);
    if matches!(root, TreeRoot::NoTree(_)) {
        return None;
    }
    // TS `el.closest('label')`: the ancestors in the tree of the element
    for ancestor in arena.ancestors(node_id) {
        if let DomNode::Element(a) = ancestor {
            if is_html_template_element(a, spec) {
                break;
            }
            if a.base.node_name.eq_ignore_ascii_case("label") {
                return Some(a.base.id);
            }
        }
    }
    let id = get_attr_node_from_el(el, "id").and_then(dom_value)?;
    arena
        .elements()
        .find(|&(label_id, label)| {
            label.base.node_name.eq_ignore_ascii_case("label")
                && get_attr_node_from_el(label, "for")
                    .and_then(dom_value)
                    .is_some_and(|value| value == id)
                && root_of(arena, spec, label_id) == root
        })
        .map(|(label_id, _)| label_id)
}

/// JS `Number(value)` for a string (ECMAScript `StringToNumber`): the whole string, trimmed of
/// JS whitespace, must be a decimal literal, `Infinity`, or an unsigned `0x`/`0o`/`0b` integer;
/// anything else is `NaN`. An empty (or all-whitespace) string is `0`.
///
/// Unlike `Number.parseFloat`, no trailing garbage is allowed (`"1px"` is `NaN`) and the
/// non-decimal prefixes are accepted (`"0x10"` is `16`, but `"-0x10"` is `NaN`).
pub fn js_string_to_number(value: &str) -> f64 {
    let s = value.trim_matches(crate::aria_check::is_js_whitespace);
    if s.is_empty() {
        return 0.0;
    }

    let bytes = s.as_bytes();
    if bytes.len() > 2 && bytes[0] == b'0' {
        let radix = match bytes[1] {
            b'x' | b'X' => Some(16),
            b'o' | b'O' => Some(8),
            b'b' | b'B' => Some(2),
            _ => None,
        };
        if let Some(radix) = radix {
            let digits = &s[2..];
            if !digits.chars().all(|c| c.is_digit(radix)) {
                return f64::NAN;
            }
            return u128::from_str_radix(digits, radix).map_or_else(
                // Too many digits for u128: accumulate in f64 instead.
                |_| {
                    digits
                        .chars()
                        .filter_map(|c| c.to_digit(radix))
                        .fold(0.0, |acc, d| acc * f64::from(radix) + f64::from(d))
                },
                // `as` rounds to the nearest f64, as JS does.
                #[allow(clippy::cast_precision_loss)]
                |n| n as f64,
            );
        }
    }

    match s {
        "Infinity" | "+Infinity" => return f64::INFINITY,
        "-Infinity" => return f64::NEG_INFINITY,
        _ => {}
    }

    // Rust's float grammar is the JS decimal literal grammar plus `inf`/`infinity`/`nan`, which
    // the character check rules out.
    if !bytes
        .iter()
        .all(|b| b.is_ascii_digit() || matches!(b, b'+' | b'-' | b'.' | b'e' | b'E'))
    {
        return f64::NAN;
    }
    s.parse::<f64>().unwrap_or(f64::NAN)
}

/// The `parseFloatAttr()` of the TS `meter-value-bounds` / `progress-value-bounds` rules: the
/// attribute value as a finite JS `Number`, or `None` when it is absent, blank, or not a finite
/// number.
pub fn finite_number_attr(raw: Option<&str>) -> Option<f64> {
    let trimmed = raw?.trim_matches(crate::aria_check::is_js_whitespace);
    if trimmed.is_empty() {
        return None;
    }
    Some(js_string_to_number(trimmed)).filter(|n| n.is_finite())
}

/// TS `document.specs.specs.find(s => s.name === el.localName)?.contentModel?.[key]`: a field of
/// the content model of the spec named exactly `local_name`.
pub fn content_model_field<'a>(
    spec: &'a markuplint_types::spec::types::MLMLSpec,
    local_name: &str,
    key: &str,
) -> Option<&'a serde_json::Value> {
    spec.specs
        .iter()
        .find(|s| s.name == local_name)
        .and_then(|s| s.content_model.get(key))
}

/// TS `isRenderedAway`: see [`markuplint_dom::tree::is_rendered_away`], which lives beside the
/// boundary of a tree it shares its element checks with.
pub use markuplint_dom::tree::is_rendered_away;

/// TS `MLElement#isHTMLTemplateElement`: see [`markuplint_dom::tree::is_html_template_element`], which
/// the selector engine reads the boundary of a tree through. The spec is always at hand here.
#[must_use]
pub fn is_html_template_element(el: &ElementData, spec: &markuplint_types::spec::types::MLMLSpec) -> bool {
    markuplint_dom::tree::is_html_template_element(el, Some(spec))
}

/// TS `el.parentElement`, followed up while it is an element: the ancestors of `node_id`,
/// nearest first.
pub fn ancestor_elements(arena: &DomArena, node_id: NodeId) -> impl Iterator<Item = NodeId> + '_ {
    std::iter::successors(arena.get(node_id).and_then(DomNode::parent_id), move |&id| {
        arena.get(id).and_then(DomNode::parent_id)
    })
    .take_while(move |&id| arena.get(id).and_then(DomNode::as_element).is_some())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn js_string_to_number_decimal() {
        assert!((js_string_to_number("1.5") - 1.5).abs() < f64::EPSILON);
        assert!((js_string_to_number(" +3 ") - 3.0).abs() < f64::EPSILON);
        assert!((js_string_to_number("-.5") + 0.5).abs() < f64::EPSILON);
        assert!((js_string_to_number("5.") - 5.0).abs() < f64::EPSILON);
        assert!((js_string_to_number("1.e1") - 10.0).abs() < f64::EPSILON);
        assert!((js_string_to_number("1E+2") - 100.0).abs() < f64::EPSILON);
        assert!(js_string_to_number("").abs() < f64::EPSILON);
        assert!(js_string_to_number("\u{a0}\u{feff}").abs() < f64::EPSILON);
    }

    #[test]
    fn js_string_to_number_non_decimal() {
        assert!((js_string_to_number("0x1F") - 31.0).abs() < f64::EPSILON);
        assert!((js_string_to_number("0o17") - 15.0).abs() < f64::EPSILON);
        assert!((js_string_to_number("0B11") - 3.0).abs() < f64::EPSILON);
        assert!(js_string_to_number("-0x10").is_nan());
        assert!(js_string_to_number("0x").is_nan());
        assert!(js_string_to_number("0b12").is_nan());
    }

    #[test]
    fn js_string_to_number_rejects_what_js_rejects() {
        for s in [
            "1px", "abc", ".", "e5", "1e", "inf", "infinity", "NaN", "1_000", "--1", "\u{85}1",
        ] {
            assert!(js_string_to_number(s).is_nan(), "{s}");
        }
        assert!(js_string_to_number("Infinity").is_infinite());
        assert!(js_string_to_number("-Infinity").is_infinite());
    }

    #[test]
    fn finite_number_attr_matches_parse_float_attr() {
        assert_eq!(finite_number_attr(None), None);
        assert_eq!(finite_number_attr(Some("  ")), None);
        assert_eq!(finite_number_attr(Some("Infinity")), None);
        assert_eq!(finite_number_attr(Some("abc")), None);
        assert_eq!(finite_number_attr(Some(" 2 ")), Some(2.0));
    }

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
