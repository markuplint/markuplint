//! The trees of a document: the Rust counterpart of `tree-scope.ts` of `ml-core` and of the
//! tree-aware `getRootNode()`, `findElementById()`, `querySelectorAll()` / `deepQuerySelectorAll()`
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

use markuplint_core::mlast::MLASTHTMLAttr;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::{attr_value, get_attr_node_from_el};
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::decode::decode_entities;
use crate::helpers::is_html_template_element;

pub use markuplint_dom::tree::{
    ShadowRootAttachment, declarative_shadow_root_attachment, is_in_no_tree, is_transparent, shadow_host,
    templates_of_host,
};

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

/// The tree of every node of an arena, computed once per rule run.
pub struct Trees<'a> {
    arena: &'a DomArena,
    spec: &'a MLMLSpec,
    roots: HashMap<NodeId, TreeRoot>,
    /// The elements of each tree in the order of the markup (TS `querySelectorAll` of the root).
    elements: HashMap<TreeRoot, Vec<NodeId>>,
    /// The first element of each tree for each id, as the DOM has the id (TS `findElementById`).
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
                let own_root = if is_in_no_tree(self.arena, self.spec, child) {
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

    /// TS `findElementById` of the root: the first element of the tree whose id, as the DOM has it,
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
        markuplint_dom::tree::tree_parent_element(self.arena, Some(self.spec), id)
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
    if is_in_no_tree(arena, spec, node_id) {
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

/// TS `findElementById` of the tree `root`, for a caller without [`Trees`]: the first element of the
/// tree whose id, as the DOM has it, is `id`. `None` for [`TreeRoot::NoTree`].
///
/// The accessible name of every element may resolve `aria-labelledby` through here, so a scan of
/// the arena per call makes a rule quadratic in the size of the document. The elements are indexed
/// by id once per arena ([`ids_of`]); only the few that share an id are walked up to their root.
#[must_use]
pub fn element_by_id_of(arena: &DomArena, spec: &MLMLSpec, root: TreeRoot, id: &str) -> Option<NodeId> {
    if matches!(root, TreeRoot::NoTree(_)) {
        return None;
    }
    ids_of(arena)
        .get(id)?
        .iter()
        .copied()
        .find(|&node_id| root_of(arena, spec, node_id) == root)
}

/// The key of an answer of [`DomArena::memoize`] that is about the whole arena and not one node.
const WHOLE_ARENA: NodeId = 0;

/// The elements of the arena for each id, as the DOM has it, in the order of
/// [`DomArena::elements`], whatever tree they are in. Computed once per arena.
fn ids_of(arena: &DomArena) -> std::sync::Arc<HashMap<String, Vec<NodeId>>> {
    arena.memoize("element-ids", WHOLE_ARENA, || {
        let mut ids: HashMap<String, Vec<NodeId>> = HashMap::new();
        for (node_id, el) in arena.elements() {
            if let Some(id) = get_attr_node_from_el(el, "id").and_then(dom_value) {
                ids.entry(id).or_default().push(node_id);
            }
        }
        ids
    })
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

#[cfg(test)]
mod tests;
