//! Converts the internal tree into `MLASTDocument`.
//!
//! Walks the arena tree and produces the flat `node_list` with nested
//! `child_nodes`, assigning incrementing string IDs to all nodes and tokens.

use markuplint_core::mlast::{
    self, MLASTAttr, MLASTChildNode, MLASTComment, MLASTDoctype, MLASTDocument, MLASTElement, MLASTElementCloseTag,
    MLASTHTMLAttr, MLASTNode, MLASTText, MLASTToken, NamespaceURI,
};

use crate::input::Span;
use crate::tree::Arena;
use crate::tree::node::{Namespace, NodeId, NodeKind, TreeNode};

/// Emitter: converts an arena tree into an `MLASTDocument`.
pub struct Emitter<'a> {
    source: &'a str,
    arena: &'a Arena,
    id_counter: usize,
    is_fragment: bool,
}

impl<'a> Emitter<'a> {
    #[must_use]
    pub fn new(source: &'a str, arena: &'a Arena, is_fragment: bool) -> Self {
        Self {
            source,
            arena,
            id_counter: 0,
            is_fragment,
        }
    }

    /// Emit the full `MLASTDocument`.
    #[must_use]
    pub fn emit(mut self) -> MLASTDocument {
        let doc = self.arena.get(self.arena.document_id());
        let mut node_list = Vec::new();

        for &child_id in &doc.children {
            self.emit_node(child_id, None, 0, &mut node_list);
        }

        MLASTDocument {
            raw: self.source.to_owned(),
            node_list,
            is_fragment: self.is_fragment,
            unknown_parse_error: None,
        }
    }

    fn next_id(&mut self) -> String {
        self.id_counter += 1;
        self.id_counter.to_string()
    }

    #[allow(clippy::too_many_lines)]
    fn emit_node(&mut self, node_id: NodeId, parent_uuid: Option<&str>, depth: u32, flat_list: &mut Vec<MLASTNode>) {
        let node = self.arena.get(node_id);

        match &node.kind {
            NodeKind::Document => {
                // Should not be emitted directly.
            }
            NodeKind::Doctype {
                name,
                public_id,
                system_id,
            } => {
                let uuid = self.next_id();
                let doctype = MLASTDoctype {
                    uuid: uuid.clone(),
                    raw: self.slice_span(node.span),
                    offset: node.span.start.offset,
                    line: node.span.start.line,
                    col: node.span.start.col,
                    node_name: "#doctype".to_owned(),
                    depth,
                    name: name.clone(),
                    public_id: public_id.clone(),
                    system_id: system_id.clone(),
                    parent_node_uuid: parent_uuid.map(str::to_owned),
                };
                flat_list.push(MLASTNode::Doctype(doctype));
            }
            NodeKind::Element {
                tag_name,
                namespace,
                attributes,
                ..
            } => {
                let uuid = self.next_id();
                let ns_uri = namespace_to_uri(*namespace);
                let element_type = if tag_name.contains('-') {
                    mlast::ElementType::WebComponent
                } else {
                    mlast::ElementType::Html
                };

                // Build child nodes recursively.
                let mut child_nodes = Vec::new();
                let mut child_flat = Vec::new();
                for &child_id in &node.children {
                    self.emit_child_node(child_id, Some(&uuid), depth + 1, &mut child_nodes, &mut child_flat);
                }

                // Create end tag if there's an end_tag_span.
                let pair_uuid = if node.end_tag_span.is_some() {
                    Some(self.next_id())
                } else {
                    None
                };

                // Build attributes.
                let mlast_attrs: Vec<MLASTAttr> = attributes
                    .iter()
                    .map(|attr| {
                        let attr_uuid = self.next_id();
                        MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                            uuid: attr_uuid,
                            raw: self.slice_span(Span::new(
                                attr.name_span.start,
                                attr.quote_end_span
                                    .map_or(attr.value_span.map_or(attr.name_span.end, |v| v.end), |q| q.end),
                            )),
                            offset: attr.name_span.start.offset,
                            line: attr.name_span.start.line,
                            col: attr.name_span.start.col,
                            node_name: attr.name.clone(),
                            spaces_before_name: self.emit_token(attr.spaces_before_span),
                            name: self.emit_token(attr.name_span),
                            spaces_before_equal: self.emit_token(attr.spaces_before_eq_span),
                            equal: self.emit_token(attr.equal_span.unwrap_or(Span::empty(attr.name_span.end))),
                            spaces_after_equal: self.emit_token(attr.spaces_after_eq_span),
                            start_quote: self.emit_token(
                                attr.quote_start_span
                                    .unwrap_or(Span::empty(attr.equal_span.map_or(attr.name_span.end, |e| e.end))),
                            ),
                            value: self.emit_token(
                                attr.value_span.unwrap_or(Span::empty(
                                    attr.quote_start_span
                                        .map_or(attr.equal_span.map_or(attr.name_span.end, |e| e.end), |q| q.end),
                                )),
                            ),
                            end_quote: self.emit_token(
                                attr.quote_end_span
                                    .unwrap_or(Span::empty(attr.value_span.map_or(attr.name_span.end, |v| v.end))),
                            ),
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

                let element = MLASTElement {
                    uuid: uuid.clone(),
                    raw: self.slice_span(node.span),
                    offset: node.span.start.offset,
                    line: node.span.start.line,
                    col: node.span.start.col,
                    node_name: tag_name.clone(),
                    depth,
                    namespace: ns_uri,
                    element_type,
                    is_fragment: false,
                    attributes: mlast_attrs,
                    has_spread_attr: None,
                    child_nodes,
                    block_behavior: None,
                    pair_node_uuid: pair_uuid.clone(),
                    tag_open_char: "<".to_owned(),
                    tag_close_char: ">".to_owned(),
                    is_ghost: node.is_implicit,
                    parent_node_uuid: parent_uuid.map(str::to_owned),
                };

                flat_list.push(MLASTNode::Element(element));

                // Add child nodes to flat list.
                flat_list.extend(child_flat);

                // Add end tag if present.
                if let Some(end_span) = node.end_tag_span
                    && let Some(ref pair_id) = pair_uuid
                {
                    let end_tag = MLASTElementCloseTag {
                        uuid: pair_id.clone(),
                        raw: self.slice_span(end_span),
                        offset: end_span.start.offset,
                        line: end_span.start.line,
                        col: end_span.start.col,
                        node_name: tag_name.clone(),
                        depth,
                        pair_node_uuid: Some(uuid),
                        tag_open_char: "</".to_owned(),
                        tag_close_char: ">".to_owned(),
                        parent_node_uuid: parent_uuid.map(str::to_owned),
                    };
                    flat_list.push(MLASTNode::EndTag(end_tag));
                }
            }
            NodeKind::Text { .. } => {
                let uuid = self.next_id();
                let text = self.make_text_node(&uuid, node, parent_uuid, depth);
                flat_list.push(MLASTNode::Text(text));
            }
            NodeKind::Comment { .. } => {
                let uuid = self.next_id();
                let comment = self.make_comment_node(&uuid, node, parent_uuid, depth);
                flat_list.push(MLASTNode::Comment(comment));
            }
        }
    }

    fn emit_child_node(
        &mut self,
        node_id: NodeId,
        parent_uuid: Option<&str>,
        depth: u32,
        child_nodes: &mut Vec<MLASTChildNode>,
        flat_list: &mut Vec<MLASTNode>,
    ) {
        let node = self.arena.get(node_id);

        match &node.kind {
            NodeKind::Document | NodeKind::Doctype { .. } => {
                // Document root and doctypes don't appear as child nodes.
            }
            NodeKind::Element {
                tag_name,
                namespace,
                attributes,
                ..
            } => {
                let uuid = self.next_id();
                let ns_uri = namespace_to_uri(*namespace);
                let element_type = if tag_name.contains('-') {
                    mlast::ElementType::WebComponent
                } else {
                    mlast::ElementType::Html
                };

                // Recurse into children.
                let mut inner_children = Vec::new();
                let mut inner_flat = Vec::new();
                for &child_id in &node.children {
                    self.emit_child_node(child_id, Some(&uuid), depth + 1, &mut inner_children, &mut inner_flat);
                }

                let pair_uuid = if node.end_tag_span.is_some() {
                    Some(self.next_id())
                } else {
                    None
                };

                let mlast_attrs: Vec<MLASTAttr> = attributes
                    .iter()
                    .map(|attr| {
                        let attr_uuid = self.next_id();
                        MLASTAttr::HTMLAttr(Box::new(self.make_html_attr(attr, attr_uuid)))
                    })
                    .collect();

                let element = MLASTElement {
                    uuid: uuid.clone(),
                    raw: self.slice_span(node.span),
                    offset: node.span.start.offset,
                    line: node.span.start.line,
                    col: node.span.start.col,
                    node_name: tag_name.clone(),
                    depth,
                    namespace: ns_uri,
                    element_type,
                    is_fragment: false,
                    attributes: mlast_attrs,
                    has_spread_attr: None,
                    child_nodes: inner_children,
                    block_behavior: None,
                    pair_node_uuid: pair_uuid.clone(),
                    tag_open_char: "<".to_owned(),
                    tag_close_char: ">".to_owned(),
                    is_ghost: node.is_implicit,
                    parent_node_uuid: parent_uuid.map(str::to_owned),
                };

                child_nodes.push(MLASTChildNode::Element(element.clone()));
                flat_list.push(MLASTNode::Element(element));

                // Add inner children's flat nodes.
                flat_list.extend(inner_flat);

                // End tag.
                if let Some(end_span) = node.end_tag_span
                    && let Some(ref pair_id) = pair_uuid
                {
                    let end_tag = MLASTElementCloseTag {
                        uuid: pair_id.clone(),
                        raw: self.slice_span(end_span),
                        offset: end_span.start.offset,
                        line: end_span.start.line,
                        col: end_span.start.col,
                        node_name: tag_name.clone(),
                        depth,
                        pair_node_uuid: Some(uuid),
                        tag_open_char: "</".to_owned(),
                        tag_close_char: ">".to_owned(),
                        parent_node_uuid: parent_uuid.map(str::to_owned),
                    };
                    child_nodes.push(MLASTChildNode::EndTag(end_tag.clone()));
                    flat_list.push(MLASTNode::EndTag(end_tag));
                }
            }
            NodeKind::Text { .. } => {
                let uuid = self.next_id();
                let text = self.make_text_node(&uuid, node, parent_uuid, depth);
                child_nodes.push(MLASTChildNode::Text(text.clone()));
                flat_list.push(MLASTNode::Text(text));
            }
            NodeKind::Comment { .. } => {
                let uuid = self.next_id();
                let comment = self.make_comment_node(&uuid, node, parent_uuid, depth);
                child_nodes.push(MLASTChildNode::Comment(comment.clone()));
                flat_list.push(MLASTNode::Comment(comment));
            }
        }
    }

    fn make_text_node(&self, uuid: &str, node: &TreeNode, parent_uuid: Option<&str>, depth: u32) -> MLASTText {
        MLASTText {
            uuid: uuid.to_owned(),
            raw: self.slice_span(node.span),
            offset: node.span.start.offset,
            line: node.span.start.line,
            col: node.span.start.col,
            node_name: "#text".to_owned(),
            depth,
            parent_node_uuid: parent_uuid.map(str::to_owned),
        }
    }

    fn make_comment_node(&self, uuid: &str, node: &TreeNode, parent_uuid: Option<&str>, depth: u32) -> MLASTComment {
        MLASTComment {
            uuid: uuid.to_owned(),
            raw: self.slice_span(node.span),
            offset: node.span.start.offset,
            line: node.span.start.line,
            col: node.span.start.col,
            node_name: "#comment".to_owned(),
            depth,
            is_bogus: false,
            parent_node_uuid: parent_uuid.map(str::to_owned),
        }
    }

    fn make_html_attr(&mut self, attr: &crate::tree::node::Attribute, uuid: String) -> MLASTHTMLAttr {
        MLASTHTMLAttr {
            uuid,
            raw: self.slice_span(Span::new(
                attr.name_span.start,
                attr.quote_end_span
                    .map_or(attr.value_span.map_or(attr.name_span.end, |v| v.end), |q| q.end),
            )),
            offset: attr.name_span.start.offset,
            line: attr.name_span.start.line,
            col: attr.name_span.start.col,
            node_name: attr.name.clone(),
            spaces_before_name: self.emit_token(attr.spaces_before_span),
            name: self.emit_token(attr.name_span),
            spaces_before_equal: self.emit_token(attr.spaces_before_eq_span),
            equal: self.emit_token(attr.equal_span.unwrap_or(Span::empty(attr.name_span.end))),
            spaces_after_equal: self.emit_token(attr.spaces_after_eq_span),
            start_quote: self.emit_token(
                attr.quote_start_span
                    .unwrap_or(Span::empty(attr.equal_span.map_or(attr.name_span.end, |e| e.end))),
            ),
            value: self.emit_token(
                attr.value_span.unwrap_or(Span::empty(
                    attr.quote_start_span
                        .map_or(attr.equal_span.map_or(attr.name_span.end, |e| e.end), |q| q.end),
                )),
            ),
            end_quote: self.emit_token(
                attr.quote_end_span
                    .unwrap_or(Span::empty(attr.value_span.map_or(attr.name_span.end, |v| v.end))),
            ),
            is_dynamic_value: None,
            is_directive: None,
            potential_name: None,
            potential_value: None,
            value_type: None,
            candidate: None,
            is_duplicatable: false,
        }
    }

    fn emit_token(&mut self, span: Span) -> MLASTToken {
        MLASTToken {
            uuid: self.next_id(),
            raw: self.slice_span(span),
            offset: span.start.offset,
            line: span.start.line,
            col: span.start.col,
        }
    }

    fn slice_span(&self, span: Span) -> String {
        if span.is_empty() {
            return String::new();
        }
        let end = span.end.offset.min(self.source.len());
        let start = span.start.offset.min(end);
        self.source[start..end].to_owned()
    }
}

fn namespace_to_uri(ns: Namespace) -> NamespaceURI {
    match ns {
        Namespace::Html => NamespaceURI::XHTML,
        Namespace::Svg => NamespaceURI::SVG,
        Namespace::MathML => NamespaceURI::MathML,
    }
}
