//! What the arena keeps about pretenders — the Rust counterpart of
//! `PretenderContext` and `PretenderSlotContent` in
//! `packages/@markuplint/ml-core/src/ml-dom/node/types.ts`.
//!
//! ## In-place identity
//!
//! TS builds a separate `as` element and makes the matched element delegate
//! `localName`, `nodeName` and `attributes` to it. The Rust rules read
//! `base.node_name`, `namespace`, `element_type` and `attributes` of
//! [`ElementData`] directly, so the pretending pass writes the `as` identity into
//! those fields of the matched element and keeps what it replaced in
//! [`Pretended::original`]. Positions and `raw` are not touched: a report on a
//! pretended element points at what the user wrote, as TS reports on the origin.
//!
//! Known difference: TS delegates only `localName`/`nodeName`/`attributes`; the
//! element's own `namespaceURI` and `elementType` stay the original's, while the
//! attributes' `ownerElement` is the `as` element (`elementType: 'html'`, the
//! pretender namespace). The in-place identity has one owner for both, so it takes
//! the `as` element's. Rules ported later that read the element's own
//! `elementType` / `namespaceURI` in TS read [`OriginalIdentity`] instead.
//!
//! ## Virtual elements
//!
//! A slot wrapper and the static entries of `contents` are elements that exist
//! only in the pretender definition. They live in the arena (so they have a
//! [`NodeId`] and can be inspected like any element) with
//! [`PretenderContext::Origin`], but no element lists them as a child and
//! [`DomArena::elements`](crate::arena::DomArena::elements) skips them, as TS
//! keeps them out of the document's `nodeList`.

use markuplint_core::mlast::{ElementType, MLASTAttr, NamespaceURI};
use markuplint_core::pretender::PretenderAria;

use crate::arena::NodeId;
use crate::node::ElementData;

/// TS `PretenderContext`.
#[derive(Debug, Clone)]
pub enum PretenderContext {
    /// The element pretends to be another (TS `type: 'pretender'`).
    Pretender(Box<Pretended>),
    /// A virtual element that stands for `origin` (TS `type: 'origin'`), so that a
    /// report on it can be moved to where the user wrote the component.
    Origin { origin: NodeId },
}

/// TS `PretenderContextPretender`, minus the `as` element (which is the element itself).
#[derive(Debug, Clone)]
pub struct Pretended {
    /// The identity the element had before the pass replaced it.
    pub original: OriginalIdentity,
    /// The `aria` of an object pretender.
    pub aria: Option<PretenderAria>,
    /// TS `slotContent`; `None` when the pretender says nothing about what
    /// surrounds the children (the children are the whole content).
    pub slot_content: Option<SlotContent>,
    /// `false` for `slots: null`: the component renders none of the children given
    /// at the usage site (TS resets the children of the `as` element to empty).
    pub renders_children: bool,
}

/// The identity a pretended element had in the source.
#[derive(Debug, Clone)]
pub struct OriginalIdentity {
    pub node_name: String,
    pub namespace: NamespaceURI,
    pub element_type: ElementType,
    pub attributes: Vec<MLASTAttr>,
}

/// The identity selectors and rules read: the effective one, or for a pretended
/// element on request its [`OriginalIdentity`].
#[derive(Debug, Clone, Copy)]
pub struct ElementIdentity<'a> {
    pub node_name: &'a str,
    pub namespace: &'a NamespaceURI,
    pub element_type: &'a ElementType,
    pub attributes: &'a [MLASTAttr],
}

/// TS `PretenderSlotContent`.
#[derive(Debug, Clone)]
pub struct SlotContent {
    /// The element whose content model governs the children: the pretended
    /// element itself or the virtual single slot wrapper. `None` when there are
    /// several wrappers, so the children must not be validated.
    pub wrapper: Option<NodeId>,
    /// `true` when some `contents` entry (of any slot when there are several) is
    /// `{ dynamic: true }`: a required child, or a name, may be rendered there.
    pub mutable: bool,
    /// The `contents` entries, virtual elements already created.
    pub entries: Vec<SlotEntry>,
}

/// One entry of `contents`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SlotEntry {
    /// A virtual element.
    Element(NodeId),
    /// `{ slot: true }`.
    Slot,
    /// `{ dynamic: true }`: adds no node.
    Dynamic,
}

impl SlotContent {
    /// TS `fill`: the children of [`Self::wrapper`] built from the nodes given at
    /// the usage site — the virtual elements of `contents` with `given` at the
    /// first slot position, or appended when there is none.
    #[must_use]
    pub fn fill(&self, given: &[NodeId]) -> Vec<NodeId> {
        let mut filled = Vec::with_capacity(self.entries.len() + given.len());
        let mut placed = false;
        for entry in &self.entries {
            match entry {
                SlotEntry::Element(id) => filled.push(*id),
                SlotEntry::Slot if !placed => {
                    filled.extend_from_slice(given);
                    placed = true;
                }
                SlotEntry::Slot | SlotEntry::Dynamic => {}
            }
        }
        if !placed {
            filled.extend_from_slice(given);
        }
        filled
    }
}

impl ElementData {
    /// The pretender data when this element pretends to be another.
    #[must_use]
    pub fn pretended(&self) -> Option<&Pretended> {
        match &self.pretender_context {
            Some(PretenderContext::Pretender(p)) => Some(p),
            _ => None,
        }
    }

    /// `true` for a slot wrapper or `contents` element created from a pretender.
    #[must_use]
    pub fn is_virtual(&self) -> bool {
        matches!(self.pretender_context, Some(PretenderContext::Origin { .. }))
    }

    /// The effective identity, or with `original` the identity this element had
    /// before it pretended (the same thing for an element that does not pretend).
    #[must_use]
    pub fn identity(&self, original: bool) -> ElementIdentity<'_> {
        if original && let Some(p) = self.pretended() {
            return ElementIdentity {
                node_name: &p.original.node_name,
                namespace: &p.original.namespace,
                element_type: &p.original.element_type,
                attributes: &p.original.attributes,
            };
        }
        ElementIdentity {
            node_name: &self.base.node_name,
            namespace: &self.namespace,
            element_type: &self.element_type,
            attributes: &self.attributes,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::arena::{DomArena, DomArenaBuilder};
    use crate::node::{DocumentData, DomNode, NodeBase};

    fn element(name: &str, context: Option<PretenderContext>) -> ElementData {
        ElementData {
            base: NodeBase {
                id: 0,
                uuid: format!("uuid-{name}"),
                raw: format!("<{name}>"),
                offset: 0,
                line: 1,
                col: 1,
                node_name: name.to_owned(),
                parent: Some(0),
                children: Vec::new(),
                next_sibling: None,
                prev_sibling: None,
                depth: 0,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::WebComponent,
            is_fragment: false,
            attributes: Vec::new(),
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_owned(),
            tag_close_char: ">".to_owned(),
            is_ghost: false,
            close_tag: None,
            pretender_context: context,
        }
    }

    /// A document with one `x-btn` element (id 1).
    fn arena() -> DomArena {
        let mut builder = DomArenaBuilder::new();
        builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![1],
        }));
        let mut el = element("x-btn", None);
        el.base.id = 1;
        builder.push(DomNode::Element(el));
        builder.finish()
    }

    fn pretend(el: &mut ElementData) {
        let original = OriginalIdentity {
            node_name: std::mem::replace(&mut el.base.node_name, "button".to_owned()),
            namespace: el.namespace.clone(),
            element_type: std::mem::replace(&mut el.element_type, ElementType::Html),
            attributes: Vec::new(),
        };
        el.pretender_context = Some(PretenderContext::Pretender(Box::new(Pretended {
            original,
            aria: None,
            slot_content: None,
            renders_children: true,
        })));
    }

    #[test]
    fn v6_virtual_elements_are_not_document_elements() {
        let mut arena = arena();
        let id = arena.push_virtual_element(element("p", Some(PretenderContext::Origin { origin: 1 })));
        assert_eq!(id, 2);
        assert_eq!(arena.get(id).and_then(DomNode::as_element).unwrap().base.id, 2);
        assert_eq!(arena.id_by_uuid("uuid-p"), Some(2));
        assert_eq!(arena.elements().map(|(id, _)| id).collect::<Vec<_>>(), [1]);
        assert_eq!(
            arena.elements_including_virtual().map(|(id, _)| id).collect::<Vec<_>>(),
            [1, 2]
        );
        assert!(arena.descendants(0).all(|n| n.id() != id));
    }

    #[test]
    #[should_panic(expected = "a virtual element must have an origin")]
    fn v6_push_virtual_element_requires_an_origin() {
        let mut arena = arena();
        arena.push_virtual_element(element("p", None));
    }

    #[test]
    fn v6_identity_effective_and_original() {
        let mut arena = arena();
        assert!(arena.element_mut(0).is_none());
        let el = arena.element_mut(1).unwrap();
        assert!(el.pretended().is_none());
        assert_eq!(el.identity(true).node_name, "x-btn");

        pretend(el);
        assert!(el.pretended().is_some());
        assert!(!el.is_virtual());
        let effective = el.identity(false);
        assert_eq!(effective.node_name, "button");
        assert_eq!(*effective.element_type, ElementType::Html);
        let original = el.identity(true);
        assert_eq!(original.node_name, "x-btn");
        assert_eq!(*original.element_type, ElementType::WebComponent);
    }

    #[test]
    fn v6_arena_clone_keeps_pretender_context() {
        let mut arena = arena();
        pretend(arena.element_mut(1).unwrap());
        let copy = arena.clone();
        let el = copy.get(1).and_then(DomNode::as_element).unwrap();
        assert_eq!(el.pretended().unwrap().original.node_name, "x-btn");
    }

    fn content(entries: Vec<SlotEntry>) -> SlotContent {
        SlotContent {
            wrapper: Some(1),
            mutable: false,
            entries,
        }
    }

    #[test]
    fn v6_fill_without_slot_entry_appends_given() {
        let c = content(vec![SlotEntry::Element(10)]);
        assert_eq!(c.fill(&[3, 4]), vec![10, 3, 4]);
    }

    #[test]
    fn v6_fill_places_given_at_slot() {
        let c = content(vec![SlotEntry::Slot, SlotEntry::Element(10)]);
        assert_eq!(c.fill(&[3]), vec![3, 10]);
    }

    #[test]
    fn v6_fill_uses_first_slot_only() {
        let c = content(vec![SlotEntry::Slot, SlotEntry::Slot]);
        assert_eq!(c.fill(&[3]), vec![3]);
    }

    #[test]
    fn v6_fill_dynamic_adds_nothing() {
        let c = content(vec![SlotEntry::Dynamic, SlotEntry::Slot]);
        assert_eq!(c.fill(&[]), Vec::<NodeId>::new());
    }

    #[test]
    fn v6_fill_empty_entries_is_identity() {
        let c = content(vec![]);
        assert_eq!(c.fill(&[5, 6]), vec![5, 6]);
    }
}
