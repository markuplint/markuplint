//! Ports `packages/@markuplint/ml-core/src/ml-dom/helper/conditional-block.ts`: the conditional blocks
//! of a template language, and what a render may leave out.
//!
//! A conditional block is a preprocessor block that has a `blockBehavior` other than `each` and `end`.
//! [`DomArena::child_nodes`] keeps such a block as a node, of which at most one branch is rendered, as
//! against a loop body, which it flattens into the parent. Which branch is rendered is not known from
//! the markup, so a caller that must not report on what it cannot know reads them all
//! ([`expand_conditional_blocks`]).

use markuplint_core::mlast::{MLASTAttr, MLASTBlockBehaviorType};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_dom::tree::element_local_name;

/// The key of an answer of [`DomArena::memoize`] that is about the whole arena and not one node.
const WHOLE_ARENA: NodeId = 0;

/// The `blockBehavior` type of a block or an element, if it has one.
fn behavior_of(node: &DomNode) -> Option<MLASTBlockBehaviorType> {
    match node {
        DomNode::PSBlock(block) => block.block_behavior.as_ref().map(|b| b.behavior_type.clone()),
        DomNode::Element(el) => el.block_behavior.as_ref().map(|b| b.behavior_type.clone()),
        _ => None,
    }
}

/// TS `isConditionalBlock`: whether the node is a conditional block: a preprocessor block that has a
/// `blockBehavior` other than `each` and `end`.
#[must_use]
pub fn is_conditional_block(arena: &DomArena, id: NodeId) -> bool {
    let Some(node @ DomNode::PSBlock(_)) = arena.get(id) else {
        return false;
    };
    behavior_of(node)
        .is_some_and(|behavior| !matches!(behavior, MLASTBlockBehaviorType::Each | MLASTBlockBehaviorType::End))
}

/// TS `hasDirectiveTemplate`: whether the element is a `template` that has a directive of a template
/// engine (Vue's `v-if`, `v-for`, `v-slot`). The engine renders its children in place of it and drops
/// it, so it is not an HTML `template` element. A spread attribute sets attributes of the element,
/// which stays.
#[must_use]
pub fn has_directive_template(el: &ElementData) -> bool {
    element_local_name(el) == "template"
        && el
            .attributes
            .iter()
            .any(|attr| matches!(attr, MLASTAttr::HTMLAttr(html_attr) if html_attr.is_directive == Some(true)))
}

/// TS `isRenderedAwayTemplate`: a `template` of a framework that renders it away: one with a directive of a
/// template engine, or one that the parser marks with a behavior (`v-if`, `v-for`), which it does without
/// the spec.
fn is_rendered_away_template(arena: &DomArena, id: NodeId) -> bool {
    arena.get(id).and_then(DomNode::as_element).is_some_and(|el| {
        element_local_name(el) == "template" && (has_directive_template(el) || el.block_behavior.is_some())
    })
}

/// TS `expandConditionalBlocks`: the nodes with every conditional block, and every `template` that has a
/// directive, replaced by the nodes of its branches or of its content, recursively, as if every branch
/// were rendered at once. A `template` with a directive (Vue's `<template v-if>`) is rendered away: its
/// children are children of the element that holds it. A block that has no behavior stays: it is unknown
/// by itself ([`crate::helpers::has_mutable_children`]).
#[must_use]
pub fn expand_conditional_blocks(arena: &DomArena, nodes: &[NodeId]) -> Vec<NodeId> {
    let mut expanded = Vec::new();
    for &node in nodes {
        if is_conditional_block(arena, node) || is_rendered_away_template(arena, node) {
            expanded.extend(expand_conditional_blocks(arena, &arena.child_nodes(node)));
        } else {
            expanded.push(node);
        }
    }
    expanded
}

/// TS `mayBeLeftOut`: whether a conditional render may leave the node out: a block or an element that
/// carries a `blockBehavior` other than `end`. A loop (`each`) is one as well: it may render nothing, and
/// [`DomArena::child_nodes`] flattens its body, so the body is in the parent as if it were always there.
/// An element carries a behavior when its language marks it by an attribute (`v-if` and `v-for` of Vue).
#[must_use]
pub fn may_be_left_out(arena: &DomArena, id: NodeId) -> bool {
    arena
        .get(id)
        .and_then(behavior_of)
        .is_some_and(|behavior| behavior != MLASTBlockBehaviorType::End)
}

/// TS `mayBeAbsentWith`: whether `absent` may not be rendered while `rendered` is: it may be left out
/// itself, or something it is in may be left out and does not hold `rendered` (they are in different
/// branches, or `rendered` is outside of it).
#[must_use]
pub fn may_be_absent_with(arena: &DomArena, absent: NodeId, rendered: NodeId) -> bool {
    if absent != rendered && may_be_left_out(arena, absent) {
        return true;
    }
    let above_rendered = left_out_ancestors(arena, rendered);
    left_out_ancestors(arena, absent)
        .into_iter()
        .any(|ancestor| !above_rendered.contains(&ancestor))
}

/// TS `leftOutAncestors`: the ancestors in the syntax tree that a render may leave out, nearest first.
fn left_out_ancestors(arena: &DomArena, id: NodeId) -> Vec<NodeId> {
    let mut ancestors = Vec::new();
    let mut current = id;
    while !matches!(arena.get(current), Some(DomNode::Document(_)) | None) {
        let Some(parent) = arena.get(current).and_then(DomNode::parent_id) else {
            break;
        };
        if parent == current {
            break;
        }
        if may_be_left_out(arena, parent) {
            ancestors.push(parent);
        }
        current = parent;
    }
    ancestors
}

/// TS `MLDocument#hasConditionalNode`: whether the document has a node that a conditional render may
/// leave out ([`may_be_left_out`]): a conditional block, a loop, or an element that carries such a
/// behavior (Vue's `v-if`). Without one, every node is rendered, and what depends on reading every branch
/// ([`crate::aria::accname::may_have_accessible_name`]) is what the markup as written says. The arena does
/// not change once the rules run.
#[must_use]
pub fn has_conditional_node(arena: &DomArena) -> bool {
    *arena.memoize("has-conditional-node", WHOLE_ARENA, || {
        (0..arena.len()).any(|id| may_be_left_out(arena, id))
    })
}

/// TS `textContentOfEveryBranch`: the text of an element as `Element#textContent` has it, with the
/// branches of the conditional blocks read as one ([`expand_conditional_blocks`]): which branch is rendered
/// is not known from the markup, so a rule that must not report on what it cannot know reads every one of
/// them. The text of every branch, concatenated.
#[must_use]
pub fn text_content_of_every_branch(arena: &DomArena, id: NodeId) -> String {
    let mut text = String::new();
    for child in expand_conditional_blocks(arena, &arena.child_nodes(id)) {
        match arena.get(child) {
            Some(DomNode::Element(_)) => text.push_str(&text_content_of_every_branch(arena, child)),
            Some(DomNode::Text(t)) => text.push_str(&t.base.raw),
            // A block that stays (it has no behavior) has the text of its own child nodes, as `MLNode#textContent`
            Some(DomNode::PSBlock(_)) => text.push_str(&text_content_of_node(arena, child)),
            _ => {}
        }
    }
    text
}

/// TS `MLNode#textContent` of a node that is no element, text or comment: the text of every child node,
/// comments excluded.
fn text_content_of_node(arena: &DomArena, id: NodeId) -> String {
    let mut text = String::new();
    for child in arena.child_nodes(id) {
        match arena.get(child) {
            Some(DomNode::Text(t)) => text.push_str(&t.base.raw),
            Some(DomNode::Element(_) | DomNode::PSBlock(_)) => text.push_str(&text_content_of_node(arena, child)),
            _ => {}
        }
    }
    text
}
