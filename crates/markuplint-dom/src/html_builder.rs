//! Path B: builds the arena straight from the HTML parser's internal tree (see crate
//! root). Bypasses MLAST JSON entirely to minimize String allocation. Gated on the
//! `html-parser` feature.

use markuplint_core::mlast::{ElementType, MLASTParseError, NamespaceURI};
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
    let mut text_tags = TextTags::new(parser_arena);

    for &child_id in &parser_doc.children {
        let converted = convert_parser_node(source, parser_arena, child_id, &mut dom, 0, &mut text_tags);
        top_level_ids.push(converted);
    }

    if let Some(DomNode::Document(doc_data)) = dom.get_mut(0) {
        doc_data.children.clone_from(&top_level_ids);
    }

    resolve_links(&mut dom, &top_level_ids, 0);

    // Add orphaned end tags as bogus Text nodes (matching TS behavior where
    // orphaned end tags become text nodes with isBogus=true). An orphaned end tag
    // inside a text node kept whole stays part of that text, as in TS.
    for (tag_name, span) in &parser_arena.orphaned_end_tags {
        if text_tags.is_kept_in_text(span.start.offset, span.end.offset) {
            continue;
        }
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

    dom.parse_errors = parser_arena
        .tokenizer_errors
        .iter()
        .map(|e| MLASTParseError {
            code: e.code.to_owned(),
            start_offset: e.position.offset,
            start_line: e.position.line,
            start_col: e.position.col,
            end_offset: e.position.offset,
            end_line: e.position.line,
            end_col: e.position.col,
            raw: extract_raw_for_parse_error(source, e.position.offset, e.position.offset),
        })
        .collect();

    dom
}

/// Port of TS `extractRawForParseError` (`@markuplint/html-parser`). parse5 reports
/// most errors as a point, which would leave `raw` empty, so a point is widened to the
/// surrounding run of characters up to a delimiter (whitespace, `<>"'/=&`), looking at
/// most 32 characters ahead.
fn extract_raw_for_parse_error(source: &str, start: usize, end: usize) -> String {
    let is_delimiter = |c: char| c.is_whitespace() || matches!(c, '<' | '>' | '"' | '\'' | '/' | '=' | '&');
    if end > start {
        return slice_span(source, start, end);
    }
    let start = start.min(source.len());
    let begin = source[..start]
        .char_indices()
        .rev()
        .find(|&(_, c)| is_delimiter(c))
        .map_or(0, |(i, c)| i + c.len_utf8());
    let end = source[start..]
        .char_indices()
        .take(32)
        .find(|&(_, c)| is_delimiter(c))
        .map_or_else(
            || {
                source[start..]
                    .char_indices()
                    .nth(32)
                    .map_or(source.len(), |(i, _)| start + i)
            },
            |(i, _)| start + i,
        );
    source[begin..end].to_owned()
}

#[allow(clippy::too_many_lines)]
fn convert_parser_node(
    source: &str,
    parser_arena: &ParserArena,
    parser_id: ParserNodeId,
    dom: &mut DomArena,
    depth: u32,
    text_tags: &mut TextTags,
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
                        // Without a quote the token has no width; it sits where the value starts,
                        // after any whitespace that follows the equal sign.
                        start_quote: make_token(
                            source,
                            attr.quote_start_span
                                .unwrap_or(markuplint_html_parser::input::Span::empty(attr.value_span.map_or_else(
                                    || attr.equal_span.map_or(attr.name_span.end, |e| e.end),
                                    |v| v.start,
                                ))),
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
                pretender_context: None,
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
                    offset: s.start.offset,
                    line: s.start.line,
                    col: s.start.col,
                }),
            }));
            debug_assert_eq!(pushed_id, dom_id);

            // Recursively convert children.
            let child_ids: Vec<NodeId> = node
                .children
                .iter()
                .map(|&child_id| convert_parser_node(source, parser_arena, child_id, dom, depth + 1, text_tags))
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
            base.raw = text_tags.text_raw(&base.raw, node.span.start.offset);
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

/// The tags a text node's source span can contain, and what TS makes of them.
///
/// The WHATWG tree builder appends the characters before and after a tag it consumes
/// without creating a node — an orphaned end tag, an end tag of an element whose end
/// was already handled (`</html>` after `</body>`, say), an ignored start tag such as a
/// second `<body>` — to the same text node, so the text node's span covers that tag.
/// TS (`@markuplint/parser-utils` `visitText` with `researchTags` and
/// `invalidTagAsText`) re-tokenizes such a span: when it contains a start tag the text
/// node is kept whole, tags included; otherwise the end tags are split out of it. The
/// raw of a text node here follows that: kept whole when it contains a start tag, and
/// otherwise without the end tags the parser consumed.
struct TextTags {
    /// `(start, end)` byte offsets of every end tag the parser consumed (the end tag
    /// of an element or an orphaned one), sorted.
    end_tags: Vec<(usize, usize)>,
    /// `(start, end)` byte offsets of the text nodes kept whole.
    kept_whole: Vec<(usize, usize)>,
}

impl TextTags {
    fn new(parser_arena: &ParserArena) -> Self {
        let mut end_tags: Vec<(usize, usize)> = parser_arena
            .orphaned_end_tags
            .iter()
            .map(|(_, span)| span)
            .chain(parser_arena.iter().filter_map(|(_, node)| node.end_tag_span.as_ref()))
            .map(|span| (span.start.offset, span.end.offset))
            .collect();
        end_tags.sort_unstable();
        end_tags.dedup();
        Self {
            end_tags,
            kept_whole: Vec::new(),
        }
    }

    /// The raw of the text node whose source span is `raw`, starting at `start`.
    fn text_raw(&mut self, raw: &str, start: usize) -> String {
        let end = start + raw.len();
        // The tokenizer reads `<` followed by an ASCII letter as a tag open, so in the
        // span of a text node it is a start tag the tree builder consumed — or the
        // content of a raw text or RCDATA element, which has no end tag to remove.
        let has_start_tag = raw
            .as_bytes()
            .windows(2)
            .any(|w| w[0] == b'<' && w[1].is_ascii_alphabetic());
        if has_start_tag {
            self.kept_whole.push((start, end));
            return raw.to_owned();
        }
        let first = self.end_tags.partition_point(|&(s, _)| s < start);
        let mut result = String::with_capacity(raw.len());
        let mut pos = start;
        for &(s, e) in &self.end_tags[first..] {
            if e > end {
                break;
            }
            if s < pos {
                continue;
            }
            result.push_str(&raw[pos - start..s - start]);
            pos = e;
        }
        result.push_str(&raw[pos - start..]);
        result
    }

    /// Whether the tag at `start..end` lies in a text node kept whole.
    fn is_kept_in_text(&self, start: usize, end: usize) -> bool {
        self.kept_whole.iter().any(|&(s, e)| s <= start && end <= e)
    }
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

    fn build(html: &str) -> DomArena {
        let parser_arena = markuplint_html_parser::parse_fragment(html);
        build_from_html_arena(html, &parser_arena, true)
    }

    #[test]
    fn parse_errors_carry_the_tokenizer_errors() {
        let arena = build("<p>\n  a &xyz; b &amp c</p>");
        let errors = arena.parse_errors();
        assert_eq!(errors.len(), 2);
        assert_eq!(errors[0].code, "unknown-named-character-reference");
        assert_eq!(
            (errors[0].start_line, errors[0].start_col, errors[0].start_offset),
            (2, 9, 12)
        );
        assert_eq!(
            (errors[0].end_line, errors[0].end_col, errors[0].end_offset),
            (2, 9, 12)
        );
        assert_eq!(errors[0].raw, "xyz;");
        assert_eq!(errors[1].code, "missing-semicolon-after-character-reference");
        assert_eq!(errors[1].raw, "amp");
    }

    /// Port of TS `extractRawForParseError` (`@markuplint/html-parser`).
    #[test]
    fn extract_raw_for_parse_error_expands_a_point() {
        assert_eq!(extract_raw_for_parse_error("<p>&xyz;</p>", 7, 7), "xyz;");
        assert_eq!(extract_raw_for_parse_error("<p>&amp text</p>", 7, 7), "amp");
        assert_eq!(extract_raw_for_parse_error("<p>&#x110000</p>", 12, 12), "#x110000");
        assert_eq!(extract_raw_for_parse_error("abcdef", 1, 4), "bcd");
        // The forward scan stops 32 characters after the point.
        let long = format!("&{}", "a".repeat(40));
        assert_eq!(extract_raw_for_parse_error(&long, 1, 1), "a".repeat(32));
    }

    fn build_document(html: &str) -> DomArena {
        let parser_arena = markuplint_html_parser::parse_document(html);
        build_from_html_arena(html, &parser_arena, false)
    }

    fn texts(dom: &DomArena) -> Vec<(&str, bool)> {
        (0..dom.len())
            .filter_map(|id| match dom.get(id) {
                Some(DomNode::Text(text)) => Some((text.base.raw.as_str(), text.is_bogus)),
                _ => None,
            })
            .collect()
    }

    /// `</html>` after `</body>` is consumed by the tree builder; the whitespace around it
    /// is one text node in `<body>`, without the end tag.
    #[test]
    fn text_raw_leaves_out_a_consumed_end_tag() {
        let dom = build_document("<!doctype html><body><p>x</p></body>\n</html>\n");
        assert_eq!(texts(&dom), [("x", false), ("\n\n", false)]);
    }

    /// The text after `</math>` spans a stray `</head>` (orphaned) and an ignored second
    /// `<body>`. It contains a start tag, so it is kept whole and the orphaned end tag is
    /// not a bogus node of its own.
    #[test]
    fn text_raw_is_kept_whole_when_it_contains_a_start_tag() {
        let dom = build_document("<!doctype html><head><math></math>\n</head>\n<body></body>\n");
        assert_eq!(texts(&dom), [("\n</head>\n<body></body>\n", false)]);
    }

    /// An orphaned end tag in a text without a start tag is left out of the text and becomes
    /// a bogus node.
    #[test]
    fn text_raw_leaves_out_an_orphaned_end_tag() {
        let dom = build("<p>a</span>b</p>");
        assert_eq!(texts(&dom), [("ab", false), ("</span>", true)]);
    }

    #[test]
    fn element_inner_source_is_the_text_between_the_tags() {
        let html = "<p>x</p><script type=\"importmap\">\n {\"a\": \"<b>\"} </script><br><i></i><em>";
        let dom = build(html);
        let inner = |name: &str| {
            let (id, _) = dom.elements().find(|(_, el)| el.base.node_name == name).unwrap();
            dom.element_inner_source(id)
        };
        assert_eq!(inner("script"), Some("\n {\"a\": \"<b>\"} "));
        assert_eq!(inner("p"), Some("x"));
        assert_eq!(inner("i"), Some(""));
        // No close tag.
        assert_eq!(inner("br"), None);
        assert_eq!(inner("em"), None);
    }

    #[test]
    fn close_tag_carries_its_byte_offset() {
        let dom = build("<p>é</p>");
        let (_, p) = dom.elements().find(|(_, el)| el.base.node_name == "p").unwrap();
        let close_tag = p.close_tag.as_ref().unwrap();
        assert_eq!(close_tag.raw, "</p>");
        // `é` is two bytes in UTF-8.
        assert_eq!(close_tag.offset, 5);
        assert_eq!((close_tag.line, close_tag.col), (1, 5));
    }

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
