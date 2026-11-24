use std::collections::HashMap;

use markuplint_core::mlast::{MLASTAttr, SlotTarget};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::{get_attr_node_from_el, get_attr_value, get_attr_value_from_el, has_attr};
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_types::check::js_regex::{JsRegex, split_literal};
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::accname::resolver::rendered_child_nodes;
use crate::aria::computed_role::{get_computed_role, is_transparent_for_ownership, split_context_chain};
use crate::aria::owns::get_owning_parent_element;
use crate::aria_check::element_local_name;
use crate::conditional_block::expand_conditional_blocks;
use crate::slot_assignment::{get_assigned_nodes, shadow_root_template};
use crate::slot_content::slot_content;
use crate::tree_scope::{
    ShadowRootAttachment, TreeRoot, declarative_shadow_root_attachment, decode_or_keep, dom_value, element_by_id_of,
    has_element_of_unknown_id, is_expression, root_of,
};

/// If the pattern is wrapped in `/` (e.g. `/^[a-z]+$/i`), it is treated
/// as a regular expression (with optional flags `g`, `i`, `m`).
/// Otherwise, the pattern is compared as an exact string match.
///
/// The expression is read as JavaScript reads it ([`JsRegex`]: lookaround, a lookbehind of any
/// length), and of the flags only the last counts, as the capture of TS `/^\/(.*)\/([gim])*$/` keeps.
///
/// Mirrors the TS `match()` helper in `@markuplint/rules/src/helpers.ts`.
pub fn pattern_match(needle: &str, pattern: &str) -> bool {
    if let Some((body, flags)) = split_literal(pattern, "gim").filter(|(body, _)| !body.is_empty()) {
        let last_flag: String = flags.chars().last().map_or_default(String::from);
        // TS `new RegExp` throws for a pattern it cannot read
        return JsRegex::cached(body, &last_flag).is_some_and(|re| re.is_match(needle));
    }
    needle == pattern
}

/// TS `el.pretenderContext?.type === 'pretender' && !el.hasAttr('as')`: an element
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

/// TS `isRoleUnknown` (`packages/@markuplint/rules/src/helpers.ts`): the role of the element is not known until it is rendered. Its `role` attribute has a
/// value that code gives (`role={props.role}`), a spread attribute (`{...props}`, `v-bind="obj"`, [`MLASTAttr::is_spread`])
/// comes after its `role` attribute, or it has no `role` attribute but a spread attribute: the spread may carry or
/// override one.
///
/// The computed role takes the code of such a value for a role that does not exist and falls back to the implicit
/// role, so a rule that judges what the role supports, deprecates or allows would judge the element by a role that it
/// may not have. That the role is not known is a decision of markuplint, as it does not decide what it cannot know,
/// and not text of a specification. The same premise is at [`crate::tree_scope::has_element_of_unknown_id`]: a
/// change to the criterion belongs to both.
///
/// An element that has a `role` attribute written in the markup is judged by it when no spread attribute comes
/// after it: an attribute that a spread brings overrides the one written before it (the later one wins for every
/// language that has a spread attribute, the order is assumed and is not checked for each language), so
/// `<div role="button" {...props}>` may have another role, while in `<div {...props} role="button">` the written
/// role is what the element has. A `role` that the framework does not output (`role={undefined}`,
/// `MLAttr#isAbsent`) is not found by [`get_attr_node_from_el`], so the element has no role attribute and is
/// judged by its implicit role. The first `role` attribute is the one that is read, so a second one is not looked
/// at.
///
/// The spread is read from the effective attributes of the element, as the role is, so that both follow a
/// pretender (`has_spread_attr` of [`ElementData`] reads the attributes that are written on the element itself
/// and does not, which is why it is not used here).
#[must_use]
pub fn is_role_unknown(el: &ElementData) -> bool {
    let role_index = el.attributes.iter().position(|attr| match attr {
        MLASTAttr::HTMLAttr(html_attr) => {
            !markuplint_dom::helpers::is_absent(html_attr)
                && markuplint_dom::helpers::is_named_by(el, html_attr, "role")
        }
        MLASTAttr::Spread(_) => false,
    });
    if let Some(MLASTAttr::HTMLAttr(role_attr)) = role_index.map(|index| &el.attributes[index])
        && role_attr.is_dynamic_value == Some(true)
    {
        return true;
    }
    el.attributes.iter().enumerate().any(|(index, attr)| {
        attr.is_spread() && (role_index.is_none_or(|role| index > role) || attr.spread_overrides_written())
    })
}

/// TS `mayMatchContextRole` (`packages/@markuplint/rules/src/helpers.ts`): whether the ancestors of the element may satisfy a "Required Accessibility Parent
/// Role" when the role of an ancestor is not known ([`is_role_unknown`]): that ancestor may be an element that only
/// passes the context through (`presentation`, `none`, and `generic` in ARIA 1.3), or the role that the condition
/// asks for next, and both are tried. An ancestor whose role the markup tells is compared as `matches_context_role`
/// of the computed role compares it, and a condition is a chain (`"menu > group"`), so an unknown ancestor above a
/// `group` may still be the `menu`.
///
/// It mirrors `matches_context_role` (the chain and the owner that `aria-owns` resolves, else the parent of the
/// accessibility tree), which cannot take an element that is not known: a change to one belongs to the other. With
/// no ancestor of an unknown role it returns what `matches_context_role` returns.
///
/// `conditions` are the required parent roles, each a chain separated by ` > ` (`requiredContextRole`).
#[must_use]
pub fn may_match_context_role(
    arena: &DomArena,
    spec: &MLMLSpec,
    node_id: NodeId,
    conditions: &[String],
    version: ARIAVersion,
) -> bool {
    let parent = get_owning_parent_element(arena, spec, node_id, version);
    conditions.iter().any(|condition| {
        let mut chain = split_context_chain(condition);
        chain.reverse();
        may_match_chain(arena, spec, &chain, parent, version)
    })
}

fn may_match_chain(
    arena: &DomArena,
    spec: &MLMLSpec,
    chain: &[&str],
    parent: Option<NodeId>,
    version: ARIAVersion,
) -> bool {
    // An unknown ancestor branches in two (it passes the context through, or it is the next role of the chain), and
    // branches that meet at the same element with the same entries left give the same answer: each pair is answered
    // once, so a run of unknown ancestors costs the length of the run times the chain.
    let mut branched: HashMap<(NodeId, usize), bool> = HashMap::new();
    walk_context_chain(arena, spec, chain, 0, parent, version, &mut branched)
}

fn walk_context_chain(
    arena: &DomArena,
    spec: &MLMLSpec,
    chain: &[&str],
    next: usize,
    from: Option<NodeId>,
    version: ARIAVersion,
    branched: &mut HashMap<(NodeId, usize), bool>,
) -> bool {
    let mut index = next;
    let mut current = from;
    while index < chain.len() {
        let Some(id) = current else {
            return false;
        };
        let above = get_owning_parent_element(arena, spec, id, version);
        if arena.get(id).and_then(DomNode::as_element).is_some_and(is_role_unknown) {
            if let Some(&known) = branched.get(&(id, index)) {
                return known;
            }
            let answer = walk_context_chain(arena, spec, chain, index, above, version, branched)
                || walk_context_chain(arena, spec, chain, index + 1, above, version, branched);
            branched.insert((id, index), answer);
            return answer;
        }
        // `matches_context_role` computes the role of an ancestor as a single node, in every version
        let role = get_computed_role(spec, arena, id, version, true).role;
        let role_name = role.as_ref().map(|role| role.name.as_str());
        if !role_name.is_some_and(|name| is_transparent_for_ownership(name, version)) {
            if Some(chain[index]) != role_name {
                return false;
            }
            index += 1;
        }
        current = above;
    }
    true
}

/// TS `el.hasMutableChildren(attr)`: below the element there is a preprocessor block without a
/// behavior (its branches cannot be enumerated), a `<slot>`, or — with `attr` — an element with a
/// mutable attribute or a component whose output is not known. The branches of a block that has a
/// behavior are read as if they were written outside of it.
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
            // A block that carries a behavior is not mutable itself, but what is written in its branches is as
            // unknown as what is written outside of it (TS `hasMutableNodes`)
            Some(DomNode::PSBlock(block)) => {
                block.block_behavior.is_none() || has_mutable_children_with(arena, child_id, attr, is_mutable_slot)
            }
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
/// a preprocessor block without a behavior (`{value}`, an `include`), a `slot`, a `<template v-slot>`
/// for a slot other than the default one, or, with `components`, a component whose output is not known.
pub fn may_render_unknown_children(arena: &DomArena, node_id: NodeId, components: bool) -> bool {
    match arena.get(node_id) {
        Some(DomNode::PSBlock(block)) => block.block_behavior.is_none(),
        Some(DomNode::Element(el)) => {
            element_local_name(el) == "slot"
                || is_slot_template_of_other_slot(el)
                || (components && is_unresolved_component(el))
        }
        _ => false,
    }
}

/// TS `isSlotTemplateOfOtherSlot`: whether the element is a `<template v-slot>` for a slot other than the
/// default one, or for one whose name is written as code. The component renders it where it places that slot,
/// which is not known from the markup.
fn is_slot_template_of_other_slot(el: &ElementData) -> bool {
    is_rendered_away(el)
        && el
            .slot_target
            .as_ref()
            .is_some_and(|target| *target != SlotTarget::Default)
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
/// TS `accnameMayComeFromUnknownContent` (`packages/@markuplint/rules/src/helpers.ts`).
///
/// A token of `aria-labelledby` that refers to no element may refer to one whose `id` is not known until it is
/// rendered (`<h2 id={x}>`, [`has_element_of_unknown_id`]); `no-refer-to-non-existent-id` reports no reference in such
/// a tree for the same reason. An element whose attribute the framework does not output (`id={undefined}`) has no id
/// to be referred to.
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
        let value = markuplint_dom::helpers::attr_value(labelledby);
        // JS `value.split(/\s+/).filter(Boolean)`: a value of nothing but white space has no token, so it refers to
        // no element and is not a reference that an element whose id is not known may satisfy
        let referenced: Vec<Option<NodeId>> = value
            .split_whitespace()
            .map(|id| {
                let id = if is_expression(labelledby) {
                    id.to_owned()
                } else {
                    decode_or_keep(id)
                };
                element_by_id_of(arena, spec, root, &id)
            })
            .collect();
        if referenced
            .iter()
            .flatten()
            .any(|&target| has_unknown_content(arena, spec, target))
        {
            return true;
        }
        // A token that refers to no element may refer to one whose `id` is not known until it is rendered
        // (`<h2 id={x}>`): such an element is not found by its id, and what it renders is not known either
        if referenced.iter().any(Option::is_none) && has_element_of_unknown_id(arena, spec, node_id) {
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
    // The branches of the conditional blocks are read as one (`everyBranch`): which branch is rendered is not
    // known, so an element in any of them may be the one whose content is unknown
    let nodes = rendered_child_nodes(spec, arena, node_id).unwrap_or_else(|| arena.child_nodes(node_id));
    let children = expand_conditional_blocks(arena, &nodes);
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

/// Tests of the helpers that read what is not known until it is rendered: [`is_role_unknown`] and
/// [`may_match_context_role`]. They port the unit tests of `helpers.spec.ts` (`isRoleUnknown`, `mayMatchContextRole`),
/// which have no ID, as the DOM of TS is built there by a framework parser and here by the MLAST that the parser sends.
#[cfg(test)]
mod unknown_tests {
    use markuplint_dom::arena::DomArena;
    use markuplint_types::spec::aria::ARIAVersion;

    use super::*;

    /// One attribute of the element of [`div_of`].
    enum Attr {
        /// `name="value"` with what the TS engine worked out about it (`isDynamicValue`, `isSpread`, `isAbsent`).
        Html(&'static str, &'static str, serde_json::Value),
        /// A spread of the syntax tree (`{...props}`).
        Spread,
    }

    /// The `div` that a framework parser sends, with `attrs` in this order.
    fn div_of(attrs: &[Attr]) -> DomArena {
        let html_attrs: Vec<(&str, &str, serde_json::Value)> = attrs
            .iter()
            .filter_map(|attr| match attr {
                Attr::Html(name, value, resolved) => Some((*name, *value, resolved.clone())),
                Attr::Spread => None,
            })
            .collect();
        let mut mlast: serde_json::Value = serde_json::from_str(&crate::test_util::mlast_element(
            "div",
            &html_attrs,
            &serde_json::json!({}),
        ))
        .unwrap();
        let mut written = mlast["nodeList"][0]["attributes"]
            .as_array()
            .unwrap()
            .clone()
            .into_iter();
        let ordered: Vec<serde_json::Value> = attrs
            .iter()
            .map(|attr| match attr {
                Attr::Html(..) => written.next().unwrap(),
                Attr::Spread => serde_json::json!({
                    "type": "spread", "uuid": "spread", "raw": "{...props}", "offset": 5, "line": 1, "col": 6,
                    "nodeName": "#spread"
                }),
            })
            .collect();
        mlast["nodeList"][0]["attributes"] = ordered.into();
        markuplint_dom::builder::build_from_json(&mlast.to_string()).unwrap()
    }

    fn role_unknown(attrs: &[Attr]) -> bool {
        let arena = div_of(attrs);
        let (_, el) = arena.elements().next().unwrap();
        is_role_unknown(el)
    }

    fn none() -> serde_json::Value {
        serde_json::json!({})
    }

    fn absent() -> serde_json::Value {
        serde_json::json!({ "isDynamicValue": true, "isAbsent": true })
    }

    /// TS `isRoleUnknown` is true for a role that code gives, and for a spread attribute without a role.
    #[test]
    fn is_role_unknown_for_code_and_for_a_spread_without_a_role() {
        let code = serde_json::json!({ "isDynamicValue": true });
        assert!(role_unknown(&[Attr::Html("role", "props.role", code)]));
        assert!(role_unknown(&[Attr::Spread]));
    }

    /// TS `isRoleUnknown` is false for a role that the markup tells, and for a role that the framework does not
    /// output.
    #[test]
    fn is_not_role_unknown_for_a_role_the_markup_tells() {
        assert!(!role_unknown(&[]));
        assert!(!role_unknown(&[Attr::Html("role", "button", none())]));
        assert!(!role_unknown(&[Attr::Spread, Attr::Html("role", "button", none())]));
        assert!(!role_unknown(&[Attr::Html("role", "undefined", absent())]));
    }

    /// TS `isRoleUnknown` is true for a spread attribute after the role attribute, and false before it.
    #[test]
    fn is_role_unknown_for_a_spread_after_the_role_only() {
        assert!(role_unknown(&[Attr::Html("role", "button", none()), Attr::Spread]));
        assert!(!role_unknown(&[Attr::Spread, Attr::Html("role", "button", none())]));
    }

    /// TS `isRoleUnknown` scans the whole attribute list where the role is not output: that attribute does not stand
    /// for the `role` attribute.
    #[test]
    fn is_role_unknown_scans_the_whole_list_where_the_role_is_not_output() {
        assert!(role_unknown(&[Attr::Html("role", "undefined", absent()), Attr::Spread]));
        assert!(role_unknown(&[Attr::Spread, Attr::Html("role", "undefined", absent())]));
    }

    /// TS `isRoleUnknown` reads a binding and an object that Vue binds: a directive that the spec says is a spread
    /// (`v-bind="obj"`, `isSpread`) is one.
    #[test]
    fn is_role_unknown_reads_a_directive_that_is_a_spread() {
        let spread = || serde_json::json!({ "isDirective": true, "isSpread": true, "isDynamicValue": true });
        let bound = serde_json::json!({ "isDirective": true, "potentialName": "role", "isDynamicValue": true });
        assert!(role_unknown(&[Attr::Html(":role", "r", bound)]));
        assert!(role_unknown(&[Attr::Html("v-bind", "props", spread())]));
        assert!(role_unknown(&[
            Attr::Html("role", "button", none()),
            Attr::Html("v-bind", "props", spread())
        ]));
        assert!(!role_unknown(&[
            Attr::Html("v-bind", "props", spread()),
            Attr::Html("role", "button", none())
        ]));
        let id = serde_json::json!({ "isDirective": true, "potentialName": "id", "isDynamicValue": true });
        assert!(!role_unknown(&[
            Attr::Html("role", "button", none()),
            Attr::Html(":id", "a", id)
        ]));
    }

    /// The element has a spread attribute as TS `MLElement#hasSpreadAttr` has it: a directive that the spec says is
    /// one is among them.
    #[test]
    fn v6_has_spread_attr_reads_a_directive_that_is_a_spread() {
        let arena = div_of(&[Attr::Html(
            "v-bind",
            "props",
            serde_json::json!({ "isDirective": true, "isSpread": true }),
        )]);
        assert!(arena.elements().next().unwrap().1.has_spread_attr);
        let arena = div_of(&[Attr::Html("role", "button", none())]);
        assert!(!arena.elements().next().unwrap().1.has_spread_attr);
    }

    fn element_with_role(arena: &DomArena, role: &str) -> markuplint_dom::arena::NodeId {
        crate::test_util::element_with_attr(arena, "role", role)
    }

    /// TS `mayMatchContextRole` agrees with `getComputedRole` where no ancestor has a role that is not known.
    #[test]
    fn may_match_context_role_agrees_with_the_computed_role_where_no_role_is_unknown() {
        let sources = [
            r#"<div><div role="listitem"></div></div>"#,
            r#"<div role="list"><div role="listitem"></div></div>"#,
            r#"<div role="list"><div role="presentation"><div role="listitem"></div></div></div>"#,
            r#"<div role="list"><div><div role="listitem"></div></div></div>"#,
            r#"<div role="group"><div role="menuitem"></div></div>"#,
            r#"<div role="menu"><div role="group"><div role="menuitem"></div></div></div>"#,
            r#"<div role="menubar"><div role="menuitem"></div></div>"#,
            r#"<div role="list"><div role="group"><div role="menuitem"></div></div></div>"#,
            r#"<div role="listbox"><div role="group"><div role="option"></div></div></div>"#,
            r#"<div role="tree"><div role="treeitem"></div></div>"#,
        ];
        let spec = crate::test_util::spec();
        for version in [ARIAVersion::V1_1, ARIAVersion::V1_2, ARIAVersion::V1_3] {
            let roles = &markuplint_types::spec::aria::get_aria_spec(&spec, version).roles;
            let mut answers = std::collections::HashSet::new();
            for source in sources {
                let arena = crate::test_util::html_arena(source);
                for (id, el) in arena.elements() {
                    let Some(role) = get_attr_value_from_el(el, "role") else {
                        continue;
                    };
                    let required = roles
                        .iter()
                        .find(|r| r.name == role)
                        .map_or(&[][..], |r| r.required_accessibility_parent_role.as_slice());
                    if required.is_empty() {
                        continue;
                    }
                    let accepted = get_computed_role(&spec, &arena, id, version, false).role.is_some();
                    assert_eq!(
                        may_match_context_role(&arena, &spec, id, required, version),
                        accepted,
                        "{source} at ARIA {version:?}"
                    );
                    answers.insert(accepted);
                }
            }
            // The trees give both answers, so that all-true or all-false cannot pass
            assert_eq!(answers.len(), 2, "ARIA {version:?}");
        }
    }

    /// TS `[require-parent-role-017]`: an unknown ancestor above a `group` may be the `menu` of the chain
    /// `menu > group`, and it is one only where its role is not known.
    #[test]
    fn v6_may_match_context_role_walks_a_chain_past_an_unknown_ancestor() {
        let spec = crate::test_util::spec();
        let conditions = vec!["menu > group".to_owned()];
        let mut arena = crate::test_util::html_arena(
            r#"<div role="button"><div id="u"><div role="group"><div role="menuitem"></div></div></div></div>"#,
        );
        let item = element_with_role(&arena, "menuitem");
        assert!(!may_match_context_role(
            &arena,
            &spec,
            item,
            &conditions,
            ARIAVersion::V1_3
        ));
        let unknown = crate::test_util::element_with_attr(&arena, "id", "u");
        let last = arena.element_mut(unknown).unwrap().attributes.len();
        crate::test_util::insert_spread_attr(&mut arena, unknown, last);
        // The `group` has no `menu` above it, but the element above the `group` may be one
        assert!(may_match_context_role(
            &arena,
            &spec,
            item,
            &conditions,
            ARIAVersion::V1_3
        ));
        // Where the unknown element and the `button` above it are both in the way, the `menu` is missing
        let arena = crate::test_util::html_arena(
            r#"<div role="button"><div role="group"><div role="menuitem"></div></div></div>"#,
        );
        let item = element_with_role(&arena, "menuitem");
        assert!(!may_match_context_role(
            &arena,
            &spec,
            item,
            &conditions,
            ARIAVersion::V1_3
        ));
    }
}
