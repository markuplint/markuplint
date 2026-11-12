//! The trees of a document: the Rust counterpart of `tree-scope.ts` of `ml-core` and of the
//! tree-aware `getRootNode()`, `getElementById()`, `querySelectorAll()` / `deepQuerySelectorAll()`
//! and `treeParentElement` of its DOM, which the TS rules read through `getElementByIdInTree`,
//! `querySelectorAllInTree` and `getDOMValue` of `packages/@markuplint/rules/src/helpers.ts`.
//!
//! The tree of a node is the document, the content of an HTML `template` element
//! ([`is_html_template_element`]), or a declarative shadow root (the content of a `template` element
//! whose shadow root is attached to its parent). An id is unique in its tree, and an id reference is
//! resolved in its tree.
//!
//! The arena keeps the content of a `template` element as the children of the element, as the TS
//! syntax tree does, so the boundary is made here and not by the shape of the arena: the parent
//! links (`parent_id`) go on to the `template` element, since the content model of a `template`
//! is validated against what the arena puts in it.
//!
//! @see <https://dom.spec.whatwg.org/#concept-tree>
//! @see <https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute>
//! @see <https://html.spec.whatwg.org/multipage/scripting.html#the-template-element>

use std::collections::HashMap;

use markuplint_core::mlast::{ElementType, MLASTHTMLAttr, NamespaceURI};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::{attr_value, get_attr_node_from_el};
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_dom::pretender::PretenderContext;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::element_local_name;
use crate::decode::decode_entities;
use crate::helpers::{is_html_template_element, is_rendered_away};

/// The root of a tree (TS `getRootNode()`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum TreeRoot {
    /// The document (or the fragment the file is parsed as).
    Document,
    /// The content of the HTML `template` element with this id: a `DocumentFragment`, or the
    /// declarative shadow root when one is attached to the parent of the element.
    Content(NodeId),
    /// A `template` element that is in no tree ([`Trees::is_in_no_tree`]): it is its own root.
    NoTree(NodeId),
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

/// The tree of every node of an arena, computed once per rule run.
pub struct Trees<'a> {
    arena: &'a DomArena,
    spec: &'a MLMLSpec,
    roots: HashMap<NodeId, TreeRoot>,
    /// The elements of each tree in the order of the markup (TS `querySelectorAll` of the root).
    elements: HashMap<TreeRoot, Vec<NodeId>>,
    /// The first element of each tree for each id, as the DOM has the id (TS `getElementById`).
    ids: HashMap<TreeRoot, HashMap<String, NodeId>>,
}

impl<'a> Trees<'a> {
    #[must_use]
    pub fn new(arena: &'a DomArena, spec: &'a MLMLSpec) -> Self {
        let mut trees = Self {
            arena,
            spec,
            roots: HashMap::new(),
            elements: HashMap::new(),
            ids: HashMap::new(),
        };
        if let Some(doc) = arena.document() {
            let children = doc.children().to_vec();
            trees.walk(&children, TreeRoot::Document);
        }
        trees
    }

    fn walk(&mut self, children: &[NodeId], root: TreeRoot) {
        for &child in children {
            let Some(node) = self.arena.get(child) else {
                continue;
            };
            let mut children_root = root;
            if let DomNode::Element(el) = node {
                let own_root = if self.is_in_no_tree_uncached(child, el) {
                    TreeRoot::NoTree(child)
                } else {
                    root
                };
                self.roots.insert(child, own_root);
                if !matches!(own_root, TreeRoot::NoTree(_)) {
                    self.elements.entry(own_root).or_default().push(child);
                    if let Some(id) = get_attr_node_from_el(el, "id").and_then(dom_value)
                        && !id.is_empty()
                    {
                        self.ids.entry(own_root).or_default().entry(id).or_insert(child);
                    }
                }
                if is_html_template_element(el, self.spec) {
                    children_root = TreeRoot::Content(child);
                }
            } else {
                self.roots.insert(child, root);
            }
            let grand_children = node.children().to_vec();
            self.walk(&grand_children, children_root);
        }
    }

    fn is_in_no_tree_uncached(&self, id: NodeId, el: &ElementData) -> bool {
        is_html_template_element(el, self.spec)
            && declarative_shadow_root_attachment(self.arena, self.spec, id) != ShadowRootAttachment::NotAttached
    }

    /// TS `getRootNode()`. A node that is not in the document (a virtual element) is taken as in
    /// the document.
    #[must_use]
    pub fn root_of(&self, id: NodeId) -> TreeRoot {
        self.roots.get(&id).copied().unwrap_or(TreeRoot::Document)
    }

    /// TS `MLElement#isInNoTree`: an HTML `template` element that a declarative shadow root is
    /// attached to, or may be. The parser inserts it into no tree, so it is found by no query of a
    /// tree, and what it refers to is not resolved.
    #[must_use]
    pub fn is_in_no_tree(&self, id: NodeId) -> bool {
        matches!(self.root_of(id), TreeRoot::NoTree(_))
    }

    /// The elements of the tree in the order of the markup (TS `root.querySelectorAll('*')`); none
    /// for [`TreeRoot::NoTree`].
    #[must_use]
    pub fn elements_of(&self, root: TreeRoot) -> &[NodeId] {
        self.elements.get(&root).map_or(&[], Vec::as_slice)
    }

    /// TS `getElementById` of the root: the first element of the tree whose id, as the DOM has it,
    /// is `id`.
    #[must_use]
    pub fn element_by_id(&self, root: TreeRoot, id: &str) -> Option<NodeId> {
        self.ids.get(&root)?.get(id).copied()
    }

    /// TS `getElementByIdInTree` (`packages/@markuplint/rules/src/helpers.ts`): the element that a
    /// reference written in an attribute of `el` resolves to, in the tree of `el`. The reference is
    /// compared with its character references resolved, unless it is written as code
    /// (`is_expression`). `None` when `el` is in no tree.
    #[must_use]
    pub fn element_by_id_in_tree(&self, el: NodeId, reference: &str, is_expression: bool) -> Option<NodeId> {
        let root = self.root_of(el);
        if let TreeRoot::NoTree(_) = root {
            return None;
        }
        if is_expression {
            self.element_by_id(root, reference)
        } else {
            self.element_by_id(root, &decode_or_keep(reference))
        }
    }

    /// TS `querySelectorAllInTree`: the elements of the tree of `el`; none when `el` is in no tree.
    #[must_use]
    pub fn elements_in_tree_of(&self, el: NodeId) -> &[NodeId] {
        self.elements_of(self.root_of(el))
    }

    /// TS `treeParentElement`: the parent element in the tree of the node. `None` at the top of
    /// the content of an HTML `template` element (whose arena parent is the `template` element), for
    /// a `template` element that is in no tree, and at the top of the document.
    #[must_use]
    pub fn tree_parent_element(&self, id: NodeId) -> Option<NodeId> {
        if self.is_in_no_tree(id) {
            return None;
        }
        // A block of a template language is walked through, as TS `parentElement` does
        let mut current = self.arena.get(id)?.parent_id();
        let parent = loop {
            let node_id = current?;
            match self.arena.get(node_id)? {
                DomNode::Element(_) => break node_id,
                DomNode::PSBlock(block) => current = block.base.parent,
                _ => return None,
            }
        };
        let parent_el = self.arena.get(parent)?.as_element()?;
        if is_html_template_element(parent_el, self.spec) {
            return None;
        }
        Some(parent)
    }

    /// The ancestors of the node in its tree, nearest first (what TS `closest()` walks, without the
    /// node itself).
    pub fn tree_ancestor_elements(&self, id: NodeId) -> impl Iterator<Item = NodeId> + '_ {
        std::iter::successors(self.tree_parent_element(id), move |&parent| {
            self.tree_parent_element(parent)
        })
    }

    /// TS `contains()` of an element asked about another node: whether `other` is an inclusive
    /// descendant of `ancestor` in the tree of `ancestor`.
    #[must_use]
    pub fn contains(&self, ancestor: NodeId, other: NodeId) -> bool {
        ancestor == other
            || (self.root_of(ancestor) == self.root_of(other)
                && self.tree_ancestor_elements(other).any(|id| id == ancestor))
    }

    /// TS `el.querySelectorAll('*')`: the descendant elements of `ancestor` in its tree, in the order
    /// of the markup. An HTML `template` element has none (what it holds is its content, a tree of
    /// its own), and a `template` element that is in no tree is not one of them.
    #[must_use]
    pub fn descendant_elements_in_tree(&self, ancestor: NodeId) -> Vec<NodeId> {
        let mut out = Vec::new();
        let Some(el) = self.arena.get(ancestor) else {
            return out;
        };
        if el
            .as_element()
            .is_some_and(|el| is_html_template_element(el, self.spec))
        {
            return out;
        }
        self.collect_descendants(el.children(), &mut out);
        out
    }

    fn collect_descendants(&self, children: &[NodeId], out: &mut Vec<NodeId>) {
        for &child in children {
            let Some(node) = self.arena.get(child) else {
                continue;
            };
            match node {
                DomNode::Element(el) => {
                    if !self.is_in_no_tree(child) {
                        out.push(child);
                    }
                    if !is_html_template_element(el, self.spec) {
                        self.collect_descendants(node.children(), out);
                    }
                }
                DomNode::PSBlock(_) => self.collect_descendants(node.children(), out),
                _ => {}
            }
        }
    }
}

/// TS `getRootNode()` of one node, found by walking up from it (TS `#findTreeRoot`), for a caller
/// that asks about a few nodes and does not build [`Trees`]. It agrees with [`Trees::root_of`].
#[must_use]
pub fn root_of(arena: &DomArena, spec: &MLMLSpec, node_id: NodeId) -> TreeRoot {
    if arena
        .get(node_id)
        .and_then(DomNode::as_element)
        .is_some_and(|el| is_html_template_element(el, spec))
        && declarative_shadow_root_attachment(arena, spec, node_id) != ShadowRootAttachment::NotAttached
    {
        return TreeRoot::NoTree(node_id);
    }
    let mut current = arena.get(node_id).and_then(DomNode::parent_id);
    while let Some(id) = current {
        let Some(node) = arena.get(id) else {
            break;
        };
        if node.as_element().is_some_and(|el| is_html_template_element(el, spec)) {
            return TreeRoot::Content(id);
        }
        current = node.parent_id();
    }
    TreeRoot::Document
}

/// TS `getElementById` of the tree `root`, for a caller without [`Trees`]: the first element of the
/// tree whose id, as the DOM has it, is `id`. `None` for [`TreeRoot::NoTree`].
#[must_use]
pub fn element_by_id_of(arena: &DomArena, spec: &MLMLSpec, root: TreeRoot, id: &str) -> Option<NodeId> {
    if matches!(root, TreeRoot::NoTree(_)) {
        return None;
    }
    arena
        .elements()
        .filter(|(_, el)| {
            get_attr_node_from_el(el, "id")
                .and_then(dom_value)
                .is_some_and(|value| value == id)
        })
        .map(|(node_id, _)| node_id)
        .find(|&node_id| root_of(arena, spec, node_id) == root)
}

/// TS `MLAttr#isExpressionValue`: the value is written as code, a string with no character reference
/// in it.
#[must_use]
pub fn is_expression(attr: &MLASTHTMLAttr) -> bool {
    attr.is_expression_value == Some(true)
}

/// TS `getDOMValue` (`tree-scope.ts` of `ml-core`): the string that the DOM has for an attribute,
/// with the character references in the markup resolved (`a&#x62;` is `ab`). A value written as code
/// is a string already, with no character reference in it. `None` when the value is not known
/// until it is rendered (a dynamic value), or the attribute is a directive.
#[must_use]
pub fn dom_value(attr: &MLASTHTMLAttr) -> Option<String> {
    dom_value_of(attr, attr_value(attr))
}

/// [`dom_value`] of a part of the value as it is written (one token of a list).
#[must_use]
pub fn dom_value_of(attr: &MLASTHTMLAttr, written: &str) -> Option<String> {
    if attr.is_dynamic_value == Some(true) || attr.is_directive == Some(true) {
        return None;
    }
    if attr.is_expression_value == Some(true) {
        return Some(written.to_owned());
    }
    Some(decode_or_keep(written))
}

/// TS `decodeEntities`, which keeps an unpaired surrogate that a Rust `String` cannot hold: such
/// a value is kept as written.
pub fn decode_or_keep(written: &str) -> String {
    decode_entities(written).unwrap_or_else(|| written.to_owned())
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
pub(crate) fn is_transparent(node: &DomNode) -> bool {
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
pub(crate) fn shadow_host(arena: &DomArena, template: NodeId) -> Option<NodeId> {
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
pub(crate) fn templates_of_host(arena: &DomArena, spec: &MLMLSpec, host: NodeId, out: &mut Vec<NodeId>) {
    for child in arena.pure_children_of(host) {
        let Some(node) = arena.get(child) else {
            continue;
        };
        if is_transparent(node) {
            templates_of_host(arena, spec, child, out);
            continue;
        }
        if let DomNode::Element(el) = node
            && is_html_template_element(el, spec)
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
    if !is_html_template_element(el, spec) {
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
