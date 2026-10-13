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
