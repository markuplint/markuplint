//! Bridge between `ChildNodeInfo` and `DomArena` for CSS selector matching.
//!
//! Builds a minimal DOM arena from a flat list of child nodes so the
//! `markuplint-selector` crate's matcher can evaluate `:not()`, `:has()`,
//! and other CSS pseudo-classes that require tree traversal.

use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTHTMLAttr, MLASTToken, NamespaceURI};
use markuplint_dom::arena::{DomArenaBuilder, NodeId};
use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase, PSBlockData, TextData};

use super::child_node::{ChildNodeInfo, ChildNodeKind};

/// Result of building a minimal arena from child nodes.
pub struct ArenaBridge {
    /// The constructed arena.
    pub arena: markuplint_dom::arena::DomArena,
    /// `NodeId` of the parent element.
    pub parent_id: NodeId,
    /// `NodeId`s corresponding to each child in the input slice (same order).
    pub child_ids: Vec<NodeId>,
}

/// Build a minimal `DomArena` from a list of child nodes.
///
/// Creates a document root, a parent element (for context), and child
/// element/text nodes with proper parent/child/sibling links.
/// Recursively builds `ChildNodeInfo.children` for `:has()` support.
pub fn build_arena(parent_tag: &str, children: &[ChildNodeInfo]) -> ArenaBridge {
    let mut builder = DomArenaBuilder::new();
    let mut next_id: usize = 0;

    // Document root (id=0)
    let doc_id = builder.push(DomNode::Document(DocumentData {
        id: 0,
        raw: String::new(),
        is_fragment: true,
        unknown_parse_error: None,
        children: Vec::new(),
    }));
    next_id += 1;

    // Parent element (id=1)
    let parent_id = builder.push(DomNode::Element(ElementData {
        base: make_base(next_id, parent_tag, Some(doc_id), 0),
        namespace: NamespaceURI::XHTML,
        element_type: ElementType::Html,
        is_fragment: false,
        attributes: Vec::new(),
        has_spread_attr: false,
        block_behavior: None,
        pair_node_id: None,
        tag_open_char: "<".to_string(),
        tag_close_char: ">".to_string(),
        is_ghost: false,
        close_tag: None,
    }));
    next_id += 1;

    // Build child nodes recursively
    let child_ids = build_children(&mut builder, &mut next_id, children, parent_id, 1);

    // Wire parent's children list
    if let Some(DomNode::Element(data)) = builder.get_mut(parent_id) {
        data.base.children.clone_from(&child_ids);
    }
    // Wire document → parent
    if let Some(DomNode::Document(data)) = builder.get_mut(doc_id) {
        data.children = vec![parent_id];
    }

    // Wire sibling links for children
    wire_siblings(&mut builder, &child_ids);

    ArenaBridge {
        arena: builder.finish(),
        parent_id,
        child_ids,
    }
}

fn build_children(
    builder: &mut DomArenaBuilder,
    next_id: &mut usize,
    children: &[ChildNodeInfo],
    parent_id: NodeId,
    depth: u32,
) -> Vec<NodeId> {
    let mut ids = Vec::with_capacity(children.len());

    for child in children {
        let id = if child.is_element() {
            let elem_type = match child.kind {
                ChildNodeKind::HtmlElement => ElementType::Html,
                ChildNodeKind::WebComponent => ElementType::WebComponent,
                ChildNodeKind::AuthoredElement => ElementType::Authored,
                _ => unreachable!("is_element() was true"),
            };
            let attributes = child
                .attribute_names
                .iter()
                .map(|name| {
                    MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                        uuid: String::new(),
                        raw: name.clone(),
                        offset: 0,
                        line: 0,
                        col: 0,
                        node_name: name.clone(),
                        spaces_before_name: empty_token(),
                        name: MLASTToken {
                            uuid: String::new(),
                            raw: name.clone(),
                            offset: 0,
                            line: 0,
                            col: 0,
                        },
                        spaces_before_equal: empty_token(),
                        equal: empty_token(),
                        spaces_after_equal: empty_token(),
                        start_quote: empty_token(),
                        value: empty_token(),
                        end_quote: empty_token(),
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
            let eid = builder.push(DomNode::Element(ElementData {
                base: make_base(*next_id, &child.node_name, Some(parent_id), depth),
                namespace: NamespaceURI::XHTML,
                element_type: elem_type,
                is_fragment: false,
                attributes,
                has_spread_attr: false,
                block_behavior: None,
                pair_node_id: None,
                tag_open_char: "<".to_string(),
                tag_close_char: ">".to_string(),
                is_ghost: false,
                close_tag: None,
            }));
            *next_id += 1;

            // Recurse for :has() descendants
            if !child.child_nodes.is_empty() {
                let grandchild_ids = build_children(builder, next_id, &child.child_nodes, eid, depth + 1);
                wire_siblings(builder, &grandchild_ids);
                if let Some(DomNode::Element(data)) = builder.get_mut(eid) {
                    data.base.children = grandchild_ids;
                }
            }
            eid
        } else if child.is_text() {
            let tid = builder.push(DomNode::Text(TextData {
                base: make_base(*next_id, "#text", Some(parent_id), depth),
                is_bogus: false,
            }));
            *next_id += 1;
            tid
        } else {
            // PreprocessorBlock
            let pid = builder.push(DomNode::PSBlock(PSBlockData {
                base: make_base(*next_id, "#ps:block", Some(parent_id), depth),
                is_fragment: false,
                block_behavior: None,
                is_bogus: false,
            }));
            *next_id += 1;
            pid
        };
        ids.push(id);
    }

    ids
}

fn wire_siblings(builder: &mut DomArenaBuilder, ids: &[NodeId]) {
    for (i, &id) in ids.iter().enumerate() {
        if let Some(node) = builder.get_mut(id)
            && let Some(base) = node_base_mut(node)
        {
            base.prev_sibling = if i > 0 { Some(ids[i - 1]) } else { None };
            base.next_sibling = ids.get(i + 1).copied();
        }
    }
}

fn make_base(id: NodeId, node_name: &str, parent: Option<NodeId>, depth: u32) -> NodeBase {
    NodeBase {
        id,
        uuid: format!("arena-bridge-{id}"),
        raw: String::new(),
        offset: 0,
        line: 0,
        col: 0,
        node_name: node_name.to_string(),
        parent,
        children: Vec::new(),
        next_sibling: None,
        prev_sibling: None,
        depth,
    }
}

fn empty_token() -> MLASTToken {
    MLASTToken {
        uuid: String::new(),
        raw: String::new(),
        offset: 0,
        line: 0,
        col: 0,
    }
}

fn node_base_mut(node: &mut DomNode) -> Option<&mut NodeBase> {
    match node {
        DomNode::Element(d) => Some(&mut d.base),
        DomNode::Text(d) => Some(&mut d.base),
        DomNode::Comment(d) => Some(&mut d.base),
        DomNode::Doctype(d) => Some(&mut d.base),
        DomNode::PSBlock(d) => Some(&mut d.base),
        DomNode::Invalid(d) => Some(&mut d.base),
        DomNode::EndTag(d) => Some(&mut d.base),
        DomNode::Document(_) => None,
    }
}
