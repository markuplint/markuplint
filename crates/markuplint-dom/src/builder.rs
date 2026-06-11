//! Path A: builds the arena from an `MLASTDocument` (the MLAST JSON path; see crate root).

use markuplint_core::mlast::{self, MLASTChildNode, MLASTDocument, MLASTNode, NamespaceURI};

use crate::arena::{DomArena, NodeId};
use crate::node::{
    CommentData, DoctypeData, DocumentData, DomNode, ElementData, EndTagData, InvalidData, NodeBase, PSBlockData,
    TextData,
};

#[must_use]
pub fn build(doc: &MLASTDocument) -> DomArena {
    let mut arena = DomArena::new();

    // The document root is always id=0.
    let doc_id = arena.push(DomNode::Document(DocumentData {
        id: 0,
        raw: doc.raw.clone(),
        is_fragment: doc.is_fragment,
        unknown_parse_error: doc.unknown_parse_error.clone(),
        children: Vec::new(),
    }));
    debug_assert_eq!(doc_id, 0);

    // `nodeList` is a flat list of ALL nodes — children already appear inside
    // their parent's `childNodes`. We skip nodes that were already inserted
    // (by UUID) when their parent element was converted, and also skip
    // EndTag entries which are structural markers, not real DOM nodes.
    let mut top_level_ids = Vec::new();
    for ast_node in &doc.node_list {
        if matches!(ast_node, MLASTNode::EndTag(_)) {
            continue;
        }

        let uuid = ast_node_uuid(ast_node);
        if arena.id_by_uuid(uuid).is_some() {
            continue;
        }

        let id = convert_node(ast_node, &mut arena);
        top_level_ids.push(id);
    }

    if let Some(DomNode::Document(doc_data)) = arena.get_mut(0) {
        doc_data.children.clone_from(&top_level_ids);
    }

    resolve_parents_and_siblings(&mut arena, &top_level_ids, 0);

    arena
}

fn convert_node(ast_node: &MLASTNode, arena: &mut DomArena) -> NodeId {
    match ast_node {
        MLASTNode::Element(el) => convert_element(el, arena),
        MLASTNode::EndTag(et) => convert_end_tag(et, arena),
        MLASTNode::Text(t) => convert_text_node(t, arena),
        MLASTNode::Comment(c) => convert_comment_node(c, arena),
        MLASTNode::Doctype(dt) => convert_doctype(dt, arena),
        MLASTNode::PSBlock(ps) => convert_psblock(ps, arena),
        MLASTNode::OmittedTag(ot) => convert_omitted_tag(ot, arena),
        MLASTNode::Invalid(inv) => convert_invalid(inv, arena),
    }
}

/// Convert a child node (same as top-level but uses `MLASTChildNode` enum).
fn convert_child_node(child: &MLASTChildNode, arena: &mut DomArena) -> NodeId {
    match child {
        MLASTChildNode::Element(el) => convert_element(el, arena),
        MLASTChildNode::EndTag(et) => convert_end_tag(et, arena),
        MLASTChildNode::Text(t) => convert_text_node(t, arena),
        MLASTChildNode::Comment(c) => convert_comment_node(c, arena),
        MLASTChildNode::PSBlock(ps) => convert_psblock(ps, arena),
        MLASTChildNode::Invalid(inv) => convert_invalid(inv, arena),
    }
}

#[allow(clippy::too_many_arguments)]
fn make_base(
    id: NodeId,
    uuid: &str,
    raw: &str,
    offset: usize,
    line: u32,
    col: u32,
    node_name: &str,
    depth: u32,
) -> NodeBase {
    NodeBase {
        id,
        uuid: uuid.to_owned(),
        raw: raw.to_owned(),
        offset,
        line,
        col,
        node_name: node_name.to_owned(),
        parent: None,
        children: Vec::new(),
        next_sibling: None,
        prev_sibling: None,
        depth,
    }
}

fn convert_element(el: &mlast::MLASTElement, arena: &mut DomArena) -> NodeId {
    let id = arena.len();
    let node = DomNode::Element(ElementData {
        base: make_base(
            id,
            &el.uuid,
            &el.raw,
            el.offset,
            el.line,
            el.col,
            &el.node_name,
            el.depth,
        ),
        namespace: el.namespace.clone(),
        element_type: el.element_type.clone(),
        is_fragment: el.is_fragment,
        attributes: el.attributes.clone(),
        has_spread_attr: el.has_spread_attr.unwrap_or(false),
        block_behavior: el.block_behavior.clone(),
        pair_node_id: None,
        tag_open_char: el.tag_open_char.clone(),
        tag_close_char: el.tag_close_char.clone(),
        is_ghost: el.is_ghost,
        close_tag: None,
    });
    let pushed_id = arena.push(node);
    debug_assert_eq!(pushed_id, id);

    let child_ids: Vec<NodeId> = el.child_nodes.iter().map(|c| convert_child_node(c, arena)).collect();

    if let Some(DomNode::Element(data)) = arena.get_mut(id) {
        data.base.children = child_ids;
    }

    id
}

fn convert_end_tag(et: &mlast::MLASTElementCloseTag, arena: &mut DomArena) -> NodeId {
    let id = arena.len();
    let node = DomNode::EndTag(EndTagData {
        base: make_base(
            id,
            &et.uuid,
            &et.raw,
            et.offset,
            et.line,
            et.col,
            &et.node_name,
            et.depth,
        ),
    });
    arena.push(node)
}

fn convert_text_node(t: &mlast::MLASTText, arena: &mut DomArena) -> NodeId {
    let id = arena.len();
    let node = DomNode::Text(TextData {
        base: make_base(id, &t.uuid, &t.raw, t.offset, t.line, t.col, &t.node_name, t.depth),
        is_bogus: false,
    });
    arena.push(node)
}

fn convert_comment_node(c: &mlast::MLASTComment, arena: &mut DomArena) -> NodeId {
    let id = arena.len();
    let node = DomNode::Comment(CommentData {
        base: make_base(id, &c.uuid, &c.raw, c.offset, c.line, c.col, &c.node_name, c.depth),
        is_bogus: c.is_bogus,
    });
    arena.push(node)
}

fn convert_doctype(dt: &mlast::MLASTDoctype, arena: &mut DomArena) -> NodeId {
    let id = arena.len();
    let node = DomNode::Doctype(DoctypeData {
        base: make_base(
            id,
            &dt.uuid,
            &dt.raw,
            dt.offset,
            dt.line,
            dt.col,
            &dt.node_name,
            dt.depth,
        ),
        name: dt.name.clone(),
        public_id: dt.public_id.clone(),
        system_id: dt.system_id.clone(),
    });
    arena.push(node)
}

fn convert_psblock(ps: &mlast::MLASTPSBlock, arena: &mut DomArena) -> NodeId {
    let id = arena.len();
    let node = DomNode::PSBlock(PSBlockData {
        base: make_base(
            id,
            &ps.uuid,
            &ps.raw,
            ps.offset,
            ps.line,
            ps.col,
            &ps.node_name,
            ps.depth,
        ),
        is_fragment: ps.is_fragment,
        block_behavior: ps.block_behavior.clone(),
        is_bogus: ps.is_bogus,
    });
    let pushed_id = arena.push(node);
    debug_assert_eq!(pushed_id, id);

    let child_ids: Vec<NodeId> = ps.child_nodes.iter().map(|c| convert_child_node(c, arena)).collect();

    if let Some(DomNode::PSBlock(data)) = arena.get_mut(id) {
        data.base.children = child_ids;
    }

    id
}

fn convert_omitted_tag(ot: &mlast::MLASTOmittedTag, arena: &mut DomArena) -> NodeId {
    let id = arena.len();
    let node = DomNode::Element(ElementData {
        base: make_base(
            id,
            &ot.uuid,
            &ot.raw,
            ot.offset,
            ot.line,
            ot.col,
            &ot.node_name,
            ot.depth,
        ),
        namespace: NamespaceURI::XHTML,
        element_type: markuplint_core::mlast::ElementType::Html,
        is_fragment: false,
        attributes: Vec::new(),
        has_spread_attr: false,
        block_behavior: None,
        pair_node_id: None,
        tag_open_char: String::new(),
        tag_close_char: String::new(),
        is_ghost: true,
        close_tag: None,
    });
    arena.push(node)
}

fn convert_invalid(inv: &mlast::MLASTInvalid, arena: &mut DomArena) -> NodeId {
    // Following TS create-node.ts logic:
    // kind === 'starttag' → Element (x-invalid, web-component)
    // otherwise → Invalid node
    if inv.kind.as_deref() == Some("starttag") {
        let id = arena.len();
        let node = DomNode::Element(ElementData {
            base: make_base(
                id,
                &inv.uuid,
                &inv.raw,
                inv.offset,
                inv.line,
                inv.col,
                "x-invalid",
                inv.depth,
            ),
            namespace: NamespaceURI::XHTML,
            element_type: markuplint_core::mlast::ElementType::WebComponent,
            is_fragment: false,
            attributes: Vec::new(),
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: String::new(),
            tag_close_char: String::new(),
            is_ghost: false,
            close_tag: None,
        });
        arena.push(node)
    } else {
        let id = arena.len();
        let node = DomNode::Invalid(InvalidData {
            base: make_base(
                id, &inv.uuid, &inv.raw, inv.offset, inv.line, inv.col, "#invalid", inv.depth,
            ),
            kind: inv.kind.clone(),
            is_bogus: inv.is_bogus,
        });
        arena.push(node)
    }
}

fn ast_node_uuid(node: &MLASTNode) -> &str {
    match node {
        MLASTNode::Element(el) => &el.uuid,
        MLASTNode::EndTag(et) => &et.uuid,
        MLASTNode::Text(t) => &t.uuid,
        MLASTNode::Comment(c) => &c.uuid,
        MLASTNode::Doctype(dt) => &dt.uuid,
        MLASTNode::PSBlock(ps) => &ps.uuid,
        MLASTNode::OmittedTag(ot) => &ot.uuid,
        MLASTNode::Invalid(inv) => &inv.uuid,
    }
}

fn resolve_parents_and_siblings(arena: &mut DomArena, child_ids: &[NodeId], parent_id: NodeId) {
    for (i, &child_id) in child_ids.iter().enumerate() {
        let prev = if i > 0 { Some(child_ids[i - 1]) } else { None };
        let next = child_ids.get(i + 1).copied();

        // Collect grandchild IDs before mutating.
        let grandchild_ids: Vec<NodeId> = arena.get(child_id).map(|n| n.children().to_vec()).unwrap_or_default();

        if let Some(node) = arena.get_mut(child_id)
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
            resolve_parents_and_siblings(arena, &grandchild_ids, child_id);
        }
    }
}

/// # Errors
///
/// Returns an error if the JSON cannot be parsed as an `MLASTDocument`.
pub fn build_from_json(json: &str) -> Result<DomArena, markuplint_core::ParseError> {
    let doc = markuplint_core::mlast::parse_mlast(json)?;
    Ok(build(&doc))
}
