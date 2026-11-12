use std::collections::HashMap;

use markuplint_core::mlast::{ElementType, MLASTAttr, NamespaceURI};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_types::spec::types::MLMLSpec;
use serde::Serialize;

use super::{document_order, parsed};
use crate::lint::{LintConfig, pretended_document};

/// The TS `Node.nodeType` of an element.
const ELEMENT_NODE: u32 = 1;
/// The TS `Node.nodeType` of a text node (and of the invalid markup that TS reads as text).
const TEXT_NODE: u32 = 3;
/// The TS `Node.nodeType` of a comment.
const COMMENT_NODE: u32 = 8;
/// The TS `Node.nodeType` of a document type.
const DOCUMENT_TYPE_NODE: u32 = 10;
/// `MLNode#MARKUPLINT_PREPROCESSOR_BLOCK`.
const PREPROCESSOR_BLOCK_NODE: u32 = 101;

/// A node of the TS `nodeList`, as the scope of a suppression reads it (`PositionedNode` of
/// `packages/markuplint/src/suppressions/compute-scope.ts`). The references between nodes are
/// indexes into the list, which has the nodes in document order.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectedNode {
    pub node_type: u32,
    /// TS `MLElement#localName`; empty for a node that is not an element.
    pub local_name: String,
    /// TS `MLElement#id`.
    pub id: String,
    /// The tokens of TS `MLElement#classList`.
    pub class_list: Vec<String>,
    /// TS `MLElement#attributes`.
    pub attributes: Vec<InspectedAttr>,
    /// TS `MLNode#parentElement`: the nearest ancestor that is an element, which passes over the
    /// blocks of a template.
    pub parent_element: Option<usize>,
    /// TS `MLElement#children`: the child nodes that are elements.
    pub children: Vec<usize>,
    pub start_line: u32,
    pub start_col: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct InspectedAttr {
    pub name: String,
    pub value: String,
}

/// The `nodeList` of the document the rules run on, or `None` when the document did not parse.
#[must_use]
pub fn node_list(arena: &DomArena, spec: &MLMLSpec, config: &LintConfig) -> Option<Vec<InspectedNode>> {
    if !parsed(arena) {
        return None;
    }
    let arena = &*pretended_document(arena, spec, config);
    let order = document_order(arena);
    let index: HashMap<NodeId, usize> = order.iter().enumerate().map(|(i, &id)| (id, i)).collect();

    Some(
        order
            .iter()
            .filter_map(|&id| arena.get(id).map(|node| inspect(arena, &index, id, node)))
            .collect(),
    )
}

fn inspect(arena: &DomArena, index: &HashMap<NodeId, usize>, id: NodeId, node: &DomNode) -> InspectedNode {
    let (start_line, start_col) = node.base().map_or((0, 0), |base| (base.line, base.col));
    let mut inspected = InspectedNode {
        node_type: node_type(node),
        local_name: String::new(),
        id: String::new(),
        class_list: Vec::new(),
        attributes: Vec::new(),
        parent_element: parent_element(arena, id).and_then(|parent| index.get(&parent).copied()),
        children: Vec::new(),
        start_line,
        start_col,
    };
    if let DomNode::Element(el) = node {
        inspected.local_name = local_name(arena, el);
        helpers::get_attr_value_from_el(el, "id")
            .unwrap_or_default()
            .clone_into(&mut inspected.id);
        inspected.class_list = class_list(el);
        inspected.attributes = attributes(el);
        inspected.children = arena
            .child_nodes(id)
            .into_iter()
            .filter(|child| matches!(arena.get(*child), Some(DomNode::Element(_))))
            .filter_map(|child| index.get(&child).copied())
            .collect();
    }
    inspected
}

fn node_type(node: &DomNode) -> u32 {
    match node {
        DomNode::Element(_) => ELEMENT_NODE,
        DomNode::Comment(_) => COMMENT_NODE,
        DomNode::Doctype(_) => DOCUMENT_TYPE_NODE,
        DomNode::PSBlock(_) => PREPROCESSOR_BLOCK_NODE,
        // The invalid markup that is not a start tag is a text node to TS (`createNode`); the one
        // that is a start tag is an element (`x-invalid`), which the builder made one already.
        DomNode::Text(_) | DomNode::Invalid(_) | DomNode::Document(_) | DomNode::EndTag(_) => TEXT_NODE,
    }
}

/// TS `MLNode#parentElement`.
fn parent_element(arena: &DomArena, id: NodeId) -> Option<NodeId> {
    let mut current = arena.get(id)?.parent_id();
    while let Some(parent) = current {
        match arena.get(parent)? {
            DomNode::Element(_) => return Some(parent),
            DomNode::Document(_) => return None,
            other => current = other.parent_id(),
        }
    }
    None
}

/// TS `MLElement#localName`. The element carries the identity of the pretender when it pretends
/// (the pretending pass writes it in place), which is the element TS delegates to.
fn local_name(arena: &DomArena, el: &ElementData) -> String {
    // TS `resolveNamespace(nodeName).localName`: what follows the prefix (`svg:rect`).
    let mut parts = el.base.node_name.split(':');
    let first = parts.next().unwrap_or_default();
    let written = parts.next().unwrap_or(first);
    if el.namespace != NamespaceURI::XHTML || el.element_type != ElementType::Html {
        return written.to_owned();
    }
    if arena.settings().tag_name_case_sensitive {
        return written.to_owned();
    }
    written.to_ascii_lowercase()
}

/// The tokens of TS `MLElement#classList`: the values of every `class` attribute, split at white
/// space. TS does not drop a token that repeats (`class="a b a"` is three tokens).
fn class_list(el: &ElementData) -> Vec<String> {
    el.attributes
        .iter()
        .filter_map(|attr| match attr {
            MLASTAttr::HTMLAttr(attr) if !helpers::is_absent(attr) && helpers::is_named_by(el, attr, "class") => {
                Some(helpers::attr_value(attr))
            }
            _ => None,
        })
        .flat_map(str::split_ascii_whitespace)
        .map(str::to_owned)
        .collect()
}

/// TS `MLElement#attributes`: every attribute, also the one that the framework does not output
/// (its value is empty then) and the spread.
fn attributes(el: &ElementData) -> Vec<InspectedAttr> {
    el.attributes
        .iter()
        .map(|attr| match attr {
            MLASTAttr::HTMLAttr(attr) => InspectedAttr {
                name: helpers::attr_name(attr).to_owned(),
                value: if helpers::is_absent(attr) {
                    String::new()
                } else {
                    helpers::attr_value(attr).to_owned()
                },
            },
            MLASTAttr::Spread(spread) => InspectedAttr {
                name: "#spread".to_owned(),
                value: spread.raw.clone(),
            },
        })
        .collect()
}
