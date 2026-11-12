//! Where the tree of an element ends: the Rust counterpart of `treeParentElement` of the TS DOM
//! (`MLNode#treeParentElement` of `ml-core`) and of `isHTMLTemplateElement` / `getDeclarativeShadowRootAttachment`
//! of its `tree-scope.ts`.
//!
//! The arena keeps the content of an HTML `template` element as the children of the element, as the
//! TS syntax tree does, so its `parent_id` goes on to the `template` element: the content model of a
//! `template` is validated against what is in it. The tree is what the DOM calls a node tree, and
//! its boundary is made here, not by the shape of the arena. The selector engine reads it through
//! [`tree_parent_element`] (so that `section p` does not match a `p` in the content of a `template`
//! in a `section`), and `markuplint-rules` builds the trees of a document on it (`tree_scope`).
//!
//! It lives in this crate, below the selector engine, because the engine cannot see `markuplint-rules`
//! and every selector evaluation of a lint run needs the boundary.
//!
//! @see <https://dom.spec.whatwg.org/#concept-tree>
//! @see <https://html.spec.whatwg.org/multipage/scripting.html#the-template-element>

use markuplint_core::mlast::{ElementType, MLASTAttr, NamespaceURI};
use markuplint_types::spec::types::{MLMLSpec, TemplateContent};

use crate::arena::{DomArena, NodeId};
use crate::helpers::{attr_value, get_attr_node_from_el};
use crate::node::{DomNode, ElementData};
use crate::pretender::PretenderContext;

/// TS `el.localName`: an HTML element's name is lower-cased, a foreign (SVG, `MathML`) or
/// authored/web-component element keeps the case it was written in.
#[must_use]
pub fn element_local_name(el: &ElementData) -> String {
    if el.element_type == ElementType::Html && el.namespace == NamespaceURI::XHTML {
        el.base.node_name.to_ascii_lowercase()
    } else {
        el.base.node_name.clone()
    }
}

/// Whether [`element_local_name`] is `name`, without making the string: the selector engine asks
/// it of every ancestor it passes.
fn has_local_name(el: &ElementData, name: &str) -> bool {
    if el.element_type == ElementType::Html && el.namespace == NamespaceURI::XHTML {
        el.base.node_name.eq_ignore_ascii_case(name)
    } else {
        el.base.node_name == name
    }
}

/// Whether the element has a directive of a template engine (Vue's `v-if`); a spread attribute is
/// not one.
fn has_directive(el: &ElementData) -> bool {
    el.attributes
        .iter()
        .any(|attr| matches!(attr, MLASTAttr::HTMLAttr(a) if a.is_directive == Some(true)))
}

/// TS `isRenderedAway` (`packages/@markuplint/rules/src/helpers.ts`): the element is not an
/// element of the output, so what is written in it is rendered in place of it. A fragment (`<>` of
/// JSX), or a `template` element with a directive of a template engine (Vue's `<template v-if>`);
/// a spread attribute is not such a directive.
#[must_use]
pub fn is_rendered_away(el: &ElementData) -> bool {
    el.is_fragment || (has_local_name(el, "template") && has_directive(el))
}

/// TS `MLElement#isHTMLTemplateElement` (`isHTMLTemplateElement` of `ml-core`'s `tree-scope.ts`):
/// an HTML `template` element, whose children are the content of the template, a tree of its own
/// with no ancestors in the document. A fragment, a `template` of a framework that keeps the
/// children in the element itself (`templateContent: "in-place"`: React, Vue) and a `template`
/// with a directive of a template engine are not.
///
/// Without a `spec` it is taken that the template keeps its content apart (the HTML default).
///
/// @see <https://html.spec.whatwg.org/multipage/scripting.html#the-template-element>
#[must_use]
pub fn is_html_template_element(el: &ElementData, spec: Option<&MLMLSpec>) -> bool {
    !el.is_fragment
        && el.namespace == NamespaceURI::XHTML
        && has_local_name(el, "template")
        && spec.is_none_or(|spec| spec.template_content != Some(TemplateContent::InPlace))
        && !has_directive(el)
}

/// TS `MLElement#isInNoTree`: an HTML `template` element that a declarative shadow root is
/// attached to, or may be ([`ShadowRootAttachment`]). The parser inserts it into no tree, so it is
/// found by no query of a tree, and what it refers to is not resolved.
#[must_use]
pub fn is_in_no_tree(arena: &DomArena, spec: &MLMLSpec, id: NodeId) -> bool {
    arena
        .get(id)
        .and_then(DomNode::as_element)
        .is_some_and(|el| is_html_template_element(el, Some(spec)))
        && declarative_shadow_root_attachment(arena, spec, id) != ShadowRootAttachment::NotAttached
}

/// TS `treeParentElement`: the parent element in the tree of the node. `None` at the top of the
/// content of an HTML `template` element (whose arena parent is the `template` element), for a
/// `template` element that is in no tree, and at the top of the document.
///
/// A block of a template language is walked through, as TS `parentElement` does. Without a `spec`
/// a `template` element cannot be told to be in no tree, so it keeps its parent.
#[must_use]
pub fn tree_parent_element(arena: &DomArena, spec: Option<&MLMLSpec>, id: NodeId) -> Option<NodeId> {
    let node = arena.get(id)?;
    if spec.is_some_and(|spec| is_in_no_tree(arena, spec, id)) {
        return None;
    }
    let mut current = node.parent_id();
    let parent = loop {
        let node_id = current?;
        match arena.get(node_id)? {
            DomNode::Element(_) => break node_id,
            DomNode::PSBlock(block) => current = block.base.parent,
            _ => return None,
        }
    };
    let parent_el = arena.get(parent)?.as_element()?;
    if is_html_template_element(parent_el, spec) {
        return None;
    }
    Some(parent)
}

/// TS `DeclarativeShadowRootAttachment`: whether a declarative shadow root is attached to the
/// parent element of a `template` element.
///
/// - `Attached`: it is. The `template` element is in no tree, and its content is the shadow root.
/// - `NotAttached`: it is not. The `template` element is an ordinary one of the tree it is in.
/// - `Unknown`: the markup alone does not tell (the parent is not in the file, is a component whose
///   output is not known, or `shadowrootmode` is a dynamic value). It is treated as in no tree, as
///   markuplint does not count what it cannot tell.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShadowRootAttachment {
    Attached,
    NotAttached,
    Unknown,
}

/// The names that the DOM accepts as a shadow host, besides a valid custom element name.
///
/// @see <https://dom.spec.whatwg.org/#valid-shadow-host-name>
const SHADOW_HOST_NAMES: &[&str] = &[
    "article",
    "aside",
    "blockquote",
    "body",
    "div",
    "footer",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "main",
    "nav",
    "p",
    "section",
    "span",
];

/// TS `isTransparent`: what the template engine or the framework renders away (a block of a
/// template language, a fragment of JSX, a `template` with a directive), leaving its children to
/// the next element above.
pub fn is_transparent(node: &DomNode) -> bool {
    match node {
        DomNode::PSBlock(_) => true,
        DomNode::Element(el) => is_rendered_away(el),
        _ => false,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ShadowRootModeState {
    Open,
    Closed,
    None,
    Dynamic,
}

/// TS `getShadowRootModeState`: the state of the `shadowrootmode` attribute.
///
/// @see <https://html.spec.whatwg.org/multipage/scripting.html#attr-template-shadowrootmode>
fn shadow_root_mode_state(el: &ElementData) -> ShadowRootModeState {
    let Some(attr) = get_attr_node_from_el(el, "shadowrootmode") else {
        return ShadowRootModeState::None;
    };
    if attr.is_dynamic_value == Some(true) {
        return ShadowRootModeState::Dynamic;
    }
    match attr_value(attr).to_lowercase().as_str() {
        "open" => ShadowRootModeState::Open,
        "closed" => ShadowRootModeState::Closed,
        _ => ShadowRootModeState::None,
    }
}

/// TS `getShadowHost`: the parent of the `template` element in the output, where what the engine
/// renders away is skipped.
pub fn shadow_host(arena: &DomArena, template: NodeId) -> Option<NodeId> {
    let mut current = arena.get(template)?.parent_id();
    while let Some(id) = current {
        let node = arena.get(id)?;
        if let DomNode::Document(_) = node {
            return None;
        }
        if !is_transparent(node) && node.as_element().is_some() {
            return Some(id);
        }
        current = node.parent_id();
    }
    None
}

/// TS `canBeShadowHost`: `None` for an element that is not what it is written as (a component whose
/// output is not known).
///
/// @see <https://dom.spec.whatwg.org/#concept-attach-a-shadow-root>
fn can_be_shadow_host(host: &ElementData) -> Option<bool> {
    let is_pretender = matches!(host.pretender_context, Some(PretenderContext::Pretender(_)));
    if host.element_type == ElementType::Authored && !is_pretender {
        return None;
    }
    if host.namespace != NamespaceURI::XHTML {
        return Some(false);
    }
    let name = element_local_name(host);
    Some(
        SHADOW_HOST_NAMES.contains(&name.as_str())
            || markuplint_types::whatwg::custom_element_name::is_custom_element_name(&name),
    )
}

/// TS `rendersChildrenInItself`: whether the children written in `host` are its children in the
/// output. A pretended component renders them in the element it pretends to be only when it
/// neither drops them nor puts them in a slot wrapper; a custom element keeps them in its light DOM.
fn renders_children_in_itself(host_id: NodeId, host: &ElementData) -> bool {
    let Some(PretenderContext::Pretender(pretended)) = &host.pretender_context else {
        return true;
    };
    if pretended.original.element_type == ElementType::WebComponent {
        return true;
    }
    if !pretended.renders_children {
        return false;
    }
    pretended
        .slot_content
        .as_ref()
        .is_none_or(|slot| slot.wrapper == Some(host_id))
}

/// TS `getTemplatesOfHost`: the HTML `template` elements that sit in the output under the host, in
/// the order of the markup, seen through what the engine renders away.
pub fn templates_of_host(arena: &DomArena, spec: &MLMLSpec, host: NodeId, out: &mut Vec<NodeId>) {
    for child in arena.pure_children_of(host) {
        let Some(node) = arena.get(child) else {
            continue;
        };
        if is_transparent(node) {
            templates_of_host(arena, spec, child, out);
            continue;
        }
        if let DomNode::Element(el) = node
            && is_html_template_element(el, Some(spec))
        {
            out.push(child);
        }
    }
}

/// TS `getDeclarativeShadowRootAttachment`: whether a declarative shadow root is attached to the
/// parent of a `template` element, by what the HTML parser does with the start tag of `template`
/// and what the DOM does to attach a shadow root. An element that is not an HTML `template`
/// element is `NotAttached`.
///
/// Known limitation (as TS): a custom element definition may disable the shadow root, which only
/// the script that defines the element tells. It is taken as not disabled.
///
/// @see <https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inhead>
/// @see <https://dom.spec.whatwg.org/#concept-attach-a-shadow-root>
#[must_use]
pub fn declarative_shadow_root_attachment(arena: &DomArena, spec: &MLMLSpec, template: NodeId) -> ShadowRootAttachment {
    *arena.memoize("shadow-root-attachment", template, || {
        compute_declarative_shadow_root_attachment(arena, spec, template)
    })
}

fn compute_declarative_shadow_root_attachment(
    arena: &DomArena,
    spec: &MLMLSpec,
    template: NodeId,
) -> ShadowRootAttachment {
    let Some(el) = arena.get(template).and_then(DomNode::as_element) else {
        return ShadowRootAttachment::NotAttached;
    };
    if !is_html_template_element(el, Some(spec)) {
        return ShadowRootAttachment::NotAttached;
    }
    let mode = shadow_root_mode_state(el);
    if mode == ShadowRootModeState::None {
        return ShadowRootAttachment::NotAttached;
    }
    let Some(host_id) = shadow_host(arena, template) else {
        return ShadowRootAttachment::Unknown;
    };
    let Some(host) = arena.get(host_id).and_then(DomNode::as_element) else {
        return ShadowRootAttachment::Unknown;
    };
    if !renders_children_in_itself(host_id, host) {
        return ShadowRootAttachment::Unknown;
    }
    match can_be_shadow_host(host) {
        Some(false) => return ShadowRootAttachment::NotAttached,
        None => return ShadowRootAttachment::Unknown,
        Some(true) if mode == ShadowRootModeState::Dynamic => return ShadowRootAttachment::Unknown,
        Some(true) => {}
    }

    // The first `template` that asks for a shadow root and can have one takes the host.
    let mut templates = Vec::new();
    templates_of_host(arena, spec, host_id, &mut templates);
    let mut undecided = false;
    for earlier in templates {
        if earlier == template {
            break;
        }
        let Some(earlier_el) = arena.get(earlier).and_then(DomNode::as_element) else {
            continue;
        };
        match shadow_root_mode_state(earlier_el) {
            ShadowRootModeState::None => {}
            ShadowRootModeState::Dynamic => undecided = true,
            ShadowRootModeState::Open | ShadowRootModeState::Closed => return ShadowRootAttachment::NotAttached,
        }
    }
    if undecided {
        ShadowRootAttachment::Unknown
    } else {
        ShadowRootAttachment::Attached
    }
}

/// The elements below a node in the order of the markup, as `getDescendants` of the TS selector
/// engine reads them (a `:has()` is tried against them): what is in the content of an HTML
/// `template` element is not below the `template`, which is a tree of its own, so an HTML
/// `template` element has no descendants and one met on the way is not entered. A block of a template
/// language is walked through.
#[must_use]
pub fn descendant_elements(arena: &DomArena, spec: Option<&MLMLSpec>, id: NodeId) -> Vec<NodeId> {
    let mut out = Vec::new();
    let Some(node) = arena.get(id) else {
        return out;
    };
    if node.as_element().is_some_and(|el| is_html_template_element(el, spec)) {
        return out;
    }
    let mut stack: Vec<NodeId> = node.children().iter().rev().copied().collect();
    while let Some(child) = stack.pop() {
        let Some(node) = arena.get(child) else {
            continue;
        };
        if let DomNode::Element(el) = node {
            out.push(child);
            if is_html_template_element(el, spec) {
                continue;
            }
        }
        stack.extend(node.children().iter().rev().copied());
    }
    out
}
