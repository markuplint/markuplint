//! Direct HTML parser Arena → `DomArena` builder.
//!
//! Bypasses MLAST JSON entirely: converts the internal parser tree
//! into a `DomArena` in a single pass with minimal String allocation.
//! Only available when the `html-parser` feature is enabled.

use markuplint_core::mlast::{ElementType, NamespaceURI};
use markuplint_html_parser::tree::node::{Namespace, NodeId as ParserNodeId, NodeKind};
use markuplint_html_parser::tree::Arena as ParserArena;

use crate::arena::{DomArena, NodeId};
use crate::node::{
    CommentData, DoctypeData, DocumentData, DomNode, ElementData, NodeBase, TextData,
};

/// Build a `DomArena` directly from the HTML parser's internal arena.
///
/// This is the zero-copy fast path for HTML: no JSON serialization,
/// no MLAST intermediate, no String cloning for `raw` (source slicing).
#[must_use]
pub fn build_from_html_arena(source: &str, parser_arena: &ParserArena, is_fragment: bool) -> DomArena {
    let mut dom = DomArena::new();

    // Document root (always id=0).
    let doc_id = dom.push(DomNode::Document(DocumentData {
        id: 0,
        raw: source.to_owned(),
        is_fragment,
        unknown_parse_error: None,
        children: Vec::new(),
    }));
    debug_assert_eq!(doc_id, 0);

    let parser_doc = parser_arena.get(parser_arena.document_id());
    let mut top_level_ids = Vec::new();

    for &child_id in &parser_doc.children {
        let converted = convert_parser_node(source, parser_arena, child_id, &mut dom, 0);
        top_level_ids.push(converted);
    }

    // Set document children.
    if let Some(DomNode::Document(doc_data)) = dom.get_mut(0) {
        doc_data.children.clone_from(&top_level_ids);
    }

    // Resolve parent/sibling links.
    resolve_links(&mut dom, &top_level_ids, 0);

    dom
}

#[allow(clippy::too_many_lines)]
fn convert_parser_node(
    source: &str,
    parser_arena: &ParserArena,
    parser_id: ParserNodeId,
    dom: &mut DomArena,
    depth: u32,
) -> NodeId {
    let node = parser_arena.get(parser_id);

    match &node.kind {
        NodeKind::Document => {
            // Should not happen in children.
            unreachable!("Document node should not appear as child")
        }
        NodeKind::Doctype {
            name,
            public_id,
            system_id,
        } => {
            let dom_id = dom.len();
            let uuid = dom_id.to_string();
            dom.push(DomNode::Doctype(DoctypeData {
                base: make_base(dom_id, &uuid, source, node, depth),
                name: name.clone(),
                public_id: public_id.clone(),
                system_id: system_id.clone(),
            }))
        }
        NodeKind::Element {
            tag_name,
            namespace,
            attributes,
            ..
        } => {
            let dom_id = dom.len();
            let uuid = dom_id.to_string();

            let ns_uri = match namespace {
                Namespace::Html => NamespaceURI::XHTML,
                Namespace::Svg => NamespaceURI::SVG,
                Namespace::MathML => NamespaceURI::MathML,
            };
            let element_type = if tag_name.contains('-') {
                ElementType::WebComponent
            } else {
                ElementType::Html
            };

            // Convert attributes: use source slicing, not MLAST tokens.
            let mlast_attrs = attributes
                .iter()
                .map(|attr| {
                    // Build minimal MLAST attribute from parser attribute spans.
                    let attr_uuid = (dom.len() + 1).to_string(); // placeholder
                    markuplint_core::mlast::MLASTAttr::HTMLAttr(Box::new(
                        markuplint_core::mlast::MLASTHTMLAttr {
                            uuid: attr_uuid,
                            raw: slice_span(source, attr.name_span.start.offset, attr.quote_end_span.map_or(
                                attr.value_span.map_or(attr.name_span.end.offset, |v| v.end.offset),
                                |q| q.end.offset,
                            )),
                            offset: attr.name_span.start.offset,
                            line: attr.name_span.start.line,
                            col: attr.name_span.start.col,
                            node_name: attr.name.clone(),
                            spaces_before_name: make_token(source, attr.spaces_before_span),
                            name: make_token(source, attr.name_span),
                            spaces_before_equal: make_token(source, attr.spaces_before_eq_span),
                            equal: make_token(source, attr.equal_span.unwrap_or(
                                markuplint_html_parser::input::Span::empty(attr.name_span.end),
                            )),
                            spaces_after_equal: make_token(source, attr.spaces_after_eq_span),
                            start_quote: make_token(source, attr.quote_start_span.unwrap_or(
                                markuplint_html_parser::input::Span::empty(
                                    attr.equal_span.map_or(attr.name_span.end, |e| e.end),
                                ),
                            )),
                            value: make_token(source, attr.value_span.unwrap_or(
                                markuplint_html_parser::input::Span::empty(
                                    attr.quote_start_span.map_or(
                                        attr.equal_span.map_or(attr.name_span.end, |e| e.end),
                                        |q| q.end,
                                    ),
                                ),
                            )),
                            end_quote: make_token(source, attr.quote_end_span.unwrap_or(
                                markuplint_html_parser::input::Span::empty(
                                    attr.value_span.map_or(attr.name_span.end, |v| v.end),
                                ),
                            )),
                            is_dynamic_value: None,
                            is_directive: None,
                            potential_name: None,
                            potential_value: None,
                            value_type: None,
                            candidate: None,
                            is_duplicatable: false,
                        },
                    ))
                })
                .collect();

            let pushed_id = dom.push(DomNode::Element(ElementData {
                base: make_base(dom_id, &uuid, source, node, depth),
                namespace: ns_uri,
                element_type,
                is_fragment: false,
                attributes: mlast_attrs,
                has_spread_attr: false,
                block_behavior: None,
                pair_node_id: None,
                tag_open_char: "<".to_owned(),
                tag_close_char: ">".to_owned(),
                is_ghost: node.is_implicit,
            }));
            debug_assert_eq!(pushed_id, dom_id);

            // Recursively convert children.
            let child_ids: Vec<NodeId> = node
                .children
                .iter()
                .map(|&child_id| convert_parser_node(source, parser_arena, child_id, dom, depth + 1))
                .collect();

            if let Some(DomNode::Element(data)) = dom.get_mut(dom_id) {
                data.base.children = child_ids;
            }

            dom_id
        }
        NodeKind::Text { .. } => {
            let dom_id = dom.len();
            let uuid = dom_id.to_string();
            dom.push(DomNode::Text(TextData {
                base: make_base(dom_id, &uuid, source, node, depth),
            }))
        }
        NodeKind::Comment { .. } => {
            let dom_id = dom.len();
            let uuid = dom_id.to_string();
            dom.push(DomNode::Comment(CommentData {
                base: make_base(dom_id, &uuid, source, node, depth),
                is_bogus: false,
            }))
        }
    }
}

fn make_base(
    id: NodeId,
    uuid: &str,
    source: &str,
    node: &markuplint_html_parser::tree::node::TreeNode,
    depth: u32,
) -> NodeBase {
    let raw = slice_span(source, node.span.start.offset, node.span.end.offset);
    let node_name = match &node.kind {
        NodeKind::Document => "#document".to_owned(),
        NodeKind::Doctype { .. } => "#doctype".to_owned(),
        NodeKind::Element { tag_name, .. } => tag_name.clone(),
        NodeKind::Text { .. } => "#text".to_owned(),
        NodeKind::Comment { .. } => "#comment".to_owned(),
    };

    NodeBase {
        id,
        uuid: uuid.to_owned(),
        raw,
        offset: node.span.start.offset,
        line: node.span.start.line,
        col: node.span.start.col,
        node_name,
        parent: None,
        children: Vec::new(),
        next_sibling: None,
        prev_sibling: None,
        depth,
    }
}

fn make_token(source: &str, span: markuplint_html_parser::input::Span) -> markuplint_core::mlast::MLASTToken {
    static COUNTER: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(1_000_000);
    let id = COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    markuplint_core::mlast::MLASTToken {
        uuid: id.to_string(),
        raw: slice_span(source, span.start.offset, span.end.offset),
        offset: span.start.offset,
        line: span.start.line,
        col: span.start.col,
    }
}

fn slice_span(source: &str, start: usize, end: usize) -> String {
    let end = end.min(source.len());
    let start = start.min(end);
    source[start..end].to_owned()
}

fn resolve_links(dom: &mut DomArena, child_ids: &[NodeId], parent_id: NodeId) {
    for (i, &child_id) in child_ids.iter().enumerate() {
        let prev = if i > 0 { Some(child_ids[i - 1]) } else { None };
        let next = child_ids.get(i + 1).copied();

        let grandchild_ids: Vec<NodeId> = dom.get(child_id).map(|n| n.children().to_vec()).unwrap_or_default();

        if let Some(node) = dom.get_mut(child_id)
            && let Some(base) = match node {
                DomNode::Document(_) => None,
                DomNode::Element(d) => Some(&mut d.base),
                DomNode::Text(d) => Some(&mut d.base),
                DomNode::Comment(d) => Some(&mut d.base),
                DomNode::Doctype(d) => Some(&mut d.base),
                DomNode::PSBlock(d) => Some(&mut d.base),
                DomNode::Invalid(d) => Some(&mut d.base),
            }
        {
            base.parent = Some(parent_id);
            base.prev_sibling = prev;
            base.next_sibling = next;
        }

        if !grandchild_ids.is_empty() {
            resolve_links(dom, &grandchild_ids, child_id);
        }
    }
}
