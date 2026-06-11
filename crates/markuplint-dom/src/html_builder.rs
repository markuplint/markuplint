//! Path B: builds the arena straight from the HTML parser's internal tree (see crate
//! root). Bypasses MLAST JSON entirely to minimize String allocation. Gated on the
//! `html-parser` feature.

use markuplint_core::mlast::{ElementType, NamespaceURI};
use markuplint_html_parser::tree::Arena as ParserArena;
use markuplint_html_parser::tree::node::{Namespace, NodeId as ParserNodeId, NodeKind};

use crate::arena::{DomArena, NodeId};
use crate::node::{CommentData, DoctypeData, DocumentData, DomNode, ElementData, NodeBase, TextData};

#[must_use]
pub fn build_from_html_arena(source: &str, parser_arena: &ParserArena, is_fragment: bool) -> DomArena {
    let mut dom = DomArena::new();
    dom.source = Some(source.to_owned());

    // Document root is always id=0.
    // If the parser encountered tree construction parse errors (e.g., unclosed
    // formatting elements causing "Broke mapping nodes" in TS), propagate the
    // first one as unknown_parse_error so the lint pipeline can replicate TS
    // behavior of returning only parse-error for such documents.
    let unknown_parse_error = parser_arena.parse_errors.first().map(|(_, msg, _)| msg.clone());
    let doc_id = dom.push(DomNode::Document(DocumentData {
        id: 0,
        raw: source.to_owned(),
        is_fragment,
        unknown_parse_error,
        children: Vec::new(),
    }));
    debug_assert_eq!(doc_id, 0);

    let parser_doc = parser_arena.get(parser_arena.document_id());
    let mut top_level_ids = Vec::new();

    for &child_id in &parser_doc.children {
        let converted = convert_parser_node(source, parser_arena, child_id, &mut dom, 0);
        top_level_ids.push(converted);
    }

    if let Some(DomNode::Document(doc_data)) = dom.get_mut(0) {
        doc_data.children.clone_from(&top_level_ids);
    }

    resolve_links(&mut dom, &top_level_ids, 0);

    // Add orphaned end tags as bogus Text nodes (matching TS behavior where
    // orphaned end tags become text nodes with isBogus=true)
    for (tag_name, span) in &parser_arena.orphaned_end_tags {
        let bogus_id = dom.len();
        let raw = slice_span(source, span.start.offset, span.end.offset);
        dom.push(DomNode::Text(TextData {
            base: NodeBase {
                id: bogus_id,
                uuid: bogus_id.to_string(),
                raw,
                offset: span.start.offset,
                line: span.start.line,
                col: span.start.col,
                node_name: format!("</{tag_name}>"),
                parent: None,
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 0,
            },
            is_bogus: true,
        }));
    }

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
            self_closing,
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

            let mlast_attrs = attributes
                .iter()
                .map(|attr| {
                    let attr_uuid = (dom.len() + 1).to_string(); // placeholder
                    markuplint_core::mlast::MLASTAttr::HTMLAttr(Box::new(markuplint_core::mlast::MLASTHTMLAttr {
                        uuid: attr_uuid,
                        raw: slice_span(
                            source,
                            attr.name_span.start.offset,
                            attr.quote_end_span.map_or(
                                attr.value_span.map_or(attr.name_span.end.offset, |v| v.end.offset),
                                |q| q.end.offset,
                            ),
                        ),
                        offset: attr.name_span.start.offset,
                        line: attr.name_span.start.line,
                        col: attr.name_span.start.col,
                        // WHATWG §13.2.6.5 adjusts foreign attributes:
                        // "xlink:href" → "xlink href" (space-separated for
                        // namespace handling). Restore the colon form to match
                        // TS parser behavior where node_name = "xlink:href".
                        // Only restore for WHATWG-defined foreign attr prefixes.
                        node_name: restore_foreign_attr_colon(&attr.name),
                        spaces_before_name: make_token(source, attr.spaces_before_span),
                        name: make_token(source, attr.name_span),
                        spaces_before_equal: make_token(source, attr.spaces_before_eq_span),
                        equal: make_token(
                            source,
                            attr.equal_span
                                .unwrap_or(markuplint_html_parser::input::Span::empty(attr.name_span.end)),
                        ),
                        spaces_after_equal: make_token(source, attr.spaces_after_eq_span),
                        start_quote: make_token(
                            source,
                            attr.quote_start_span
                                .unwrap_or(markuplint_html_parser::input::Span::empty(
                                    attr.equal_span.map_or(attr.name_span.end, |e| e.end),
                                )),
                        ),
                        value: make_token(
                            source,
                            attr.value_span.unwrap_or(markuplint_html_parser::input::Span::empty(
                                attr.quote_start_span
                                    .map_or(attr.equal_span.map_or(attr.name_span.end, |e| e.end), |q| q.end),
                            )),
                        ),
                        end_quote: make_token(
                            source,
                            attr.quote_end_span
                                .unwrap_or(markuplint_html_parser::input::Span::empty(
                                    attr.value_span.map_or(attr.name_span.end, |v| v.end),
                                )),
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
                tag_close_char: if *self_closing { "/>".to_owned() } else { ">".to_owned() },
                is_ghost: node.is_implicit,
                close_tag: node.end_tag_span.map(|s| crate::node::CloseTagInfo {
                    raw: slice_span(source, s.start.offset, s.end.offset),
                    line: s.start.line,
                    col: s.start.col,
                }),
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
            let mut base = make_base(dom_id, &uuid, source, node, depth);
            // Strip orphaned end tag text from the raw content.
            // WHATWG parser correctly appends characters before and after an
            // orphaned end tag into the same Text node, so the span covers
            // source text that includes the end tag. TS separates orphaned
            // end tags into MLASTInvalid nodes, so text nodes never contain
            // them. We replicate that by removing orphaned spans from raw.
            base.raw = strip_orphaned_end_tags(&base.raw, node.span.start.offset, &parser_arena.orphaned_end_tags);
            dom.push(DomNode::Text(TextData { base, is_bogus: false }))
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

/// Restore colon form for WHATWG §13.2.6.5 foreign attributes.
///
/// Only converts the specific prefixes defined in the spec:
/// `xlink`, `xml`, `xmlns`. Other attributes with spaces are left as-is.
fn restore_foreign_attr_colon(name: &str) -> String {
    if name.starts_with("xlink ") || name.starts_with("xml ") || name.starts_with("xmlns ") {
        name.replacen(' ', ":", 1)
    } else {
        name.to_string()
    }
}

/// Remove orphaned end tag text from a text node's raw content.
///
/// WHATWG-compliant parsers merge character data before and after an orphaned
/// end tag into a single Text node. TS parser-utils separates orphaned end
/// tags into `MLASTInvalid` nodes so text nodes never contain them.
/// This function replicates TS behavior by stripping orphaned spans from raw.
fn strip_orphaned_end_tags(
    raw: &str,
    text_start_offset: usize,
    orphaned: &[(String, markuplint_html_parser::input::Span)],
) -> String {
    let text_end_offset = text_start_offset + raw.len();
    let mut to_remove: Vec<(usize, usize)> = Vec::new();
    for (_tag, span) in orphaned {
        let s = span.start.offset;
        let e = span.end.offset;
        if s >= text_start_offset && e <= text_end_offset {
            to_remove.push((s - text_start_offset, e - text_start_offset));
        }
    }
    if to_remove.is_empty() {
        return raw.to_owned();
    }
    to_remove.sort_by_key(|&(s, _)| s);
    let mut result = String::with_capacity(raw.len());
    let mut pos = 0;
    for (s, e) in &to_remove {
        if *s > pos {
            result.push_str(&raw[pos..*s]);
        }
        pos = *e;
    }
    if pos < raw.len() {
        result.push_str(&raw[pos..]);
    }
    result
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
                DomNode::EndTag(d) => Some(&mut d.base),
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

#[cfg(test)]
mod tests {
    use super::*;
    use markuplint_core::mlast::MLASTAttr;

    #[test]
    fn restore_foreign_attr_colon_xlink_href() {
        assert_eq!(restore_foreign_attr_colon("xlink href"), "xlink:href");
    }

    #[test]
    fn restore_foreign_attr_colon_xml_lang() {
        assert_eq!(restore_foreign_attr_colon("xml lang"), "xml:lang");
    }

    #[test]
    fn restore_foreign_attr_colon_xmlns_xlink() {
        assert_eq!(restore_foreign_attr_colon("xmlns xlink"), "xmlns:xlink");
    }

    #[test]
    fn restore_foreign_attr_colon_non_foreign_unchanged() {
        // Non-foreign attributes with spaces should not be converted
        assert_eq!(restore_foreign_attr_colon("foo bar"), "foo bar");
    }

    #[test]
    fn restore_foreign_attr_colon_regular_attr_unchanged() {
        assert_eq!(restore_foreign_attr_colon("class"), "class");
    }

    #[test]
    fn unquoted_attribute_value_preserved() {
        let html = "<meta charset=UTF-8>";
        let arena = markuplint_html_parser::parse_fragment(html);
        let dom = build_from_html_arena(html, &arena, true);

        // Find the meta element
        let meta = dom.elements().find(|(_, el)| el.base.node_name == "meta");
        assert!(meta.is_some(), "meta element should exist");
        let (_, meta_el) = meta.unwrap();

        // Check charset attribute value
        let charset_attr = meta_el
            .attributes
            .iter()
            .find(|a| matches!(a, MLASTAttr::HTMLAttr(h) if h.node_name == "charset"));
        assert!(charset_attr.is_some(), "charset attribute should exist");
        if let Some(MLASTAttr::HTMLAttr(h)) = charset_attr {
            assert_eq!(
                h.value.raw, "UTF-8",
                "Unquoted attribute value should be 'UTF-8', got '{}'",
                h.value.raw
            );
        }
    }
}
