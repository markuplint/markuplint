//! Cross-references use `NodeId` indices instead of pointers, avoiding lifetime complexity.

use std::collections::HashMap;

use markuplint_core::mlast::{DocumentSettings, MLASTParseError};

use crate::node::{DomNode, ElementData};

pub type NodeId = usize;

#[derive(Debug, Clone)]
pub struct DomArena {
    pub(crate) nodes: Vec<DomNode>,
    pub(crate) uuid_to_id: HashMap<String, NodeId>,
    /// Populated only when built from the HTML parser path (Path B), so rules can
    /// read source text at specific offsets (e.g. `no-unescaped-char` checking
    /// unresolved entity text); the MLAST path leaves it `None`.
    pub(crate) source: Option<String>,
    /// Non-fatal parse errors (TS `document.parseErrors`), in source order. Populated
    /// only on the HTML parser path (Path B), which records the character-reference
    /// errors; the MLAST path leaves it empty.
    pub(crate) parse_errors: Vec<MLASTParseError>,
    /// What the parser says about its markup (TS `Document.endTag` and the like). Only the MLAST
    /// path (Path A) can carry anything but the HTML defaults, as only there is the parser not
    /// the Rust HTML one.
    pub(crate) settings: DocumentSettings,
}

impl DomArena {
    #[must_use]
    pub fn new() -> Self {
        Self {
            nodes: Vec::new(),
            uuid_to_id: HashMap::new(),
            source: None,
            parse_errors: Vec::new(),
            settings: DocumentSettings::default(),
        }
    }

    #[must_use]
    pub fn settings(&self) -> DocumentSettings {
        self.settings
    }

    pub fn set_settings(&mut self, settings: DocumentSettings) {
        self.settings = settings;
    }

    #[must_use]
    pub fn source(&self) -> Option<&str> {
        self.source.as_deref()
    }

    #[must_use]
    pub fn parse_errors(&self) -> &[MLASTParseError] {
        &self.parse_errors
    }

    #[must_use]
    pub fn get(&self, id: NodeId) -> Option<&DomNode> {
        self.nodes.get(id)
    }

    #[must_use]
    pub fn get_by_uuid(&self, uuid: &str) -> Option<&DomNode> {
        self.uuid_to_id.get(uuid).and_then(|&id| self.get(id))
    }

    #[must_use]
    pub fn id_by_uuid(&self, uuid: &str) -> Option<NodeId> {
        self.uuid_to_id.get(uuid).copied()
    }

    #[must_use]
    pub fn len(&self) -> usize {
        self.nodes.len()
    }

    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.nodes.is_empty()
    }

    /// Mutable access to an element, for passes that run after construction
    /// (the pretending pass rewrites the identity of matched elements).
    pub fn element_mut(&mut self, id: NodeId) -> Option<&mut ElementData> {
        match self.nodes.get_mut(id) {
            Some(DomNode::Element(data)) => Some(data),
            _ => None,
        }
    }

    /// Adds a virtual element (a slot wrapper or a `contents` entry of a
    /// pretender). It gets its `NodeId` here and is linked into no child list, so
    /// tree traversals and [`Self::elements`] do not reach it.
    ///
    /// # Panics
    ///
    /// Panics when `data` is not virtual (its `pretender_context` is not
    /// [`PretenderContext::Origin`](crate::pretender::PretenderContext::Origin)).
    pub fn push_virtual_element(&mut self, mut data: ElementData) -> NodeId {
        assert!(data.is_virtual(), "a virtual element must have an origin");
        data.base.id = self.nodes.len();
        self.push(DomNode::Element(data))
    }

    pub(crate) fn push(&mut self, node: DomNode) -> NodeId {
        let id = self.nodes.len();
        if let Some(uuid) = node.uuid() {
            self.uuid_to_id.insert(uuid.to_owned(), id);
        }
        self.nodes.push(node);
        id
    }

    pub(crate) fn get_mut(&mut self, id: NodeId) -> Option<&mut DomNode> {
        self.nodes.get_mut(id)
    }
}

impl Default for DomArena {
    fn default() -> Self {
        Self::new()
    }
}

/// Builder for constructing a `DomArena` programmatically from external crates.
///
/// The arena's `push` and `get_mut` methods are `pub(crate)`, so external crates
/// must use this builder to construct arenas (e.g., for content model matching).
pub struct DomArenaBuilder {
    arena: DomArena,
}

impl DomArenaBuilder {
    #[must_use]
    pub fn new() -> Self {
        Self { arena: DomArena::new() }
    }

    pub fn push(&mut self, node: DomNode) -> NodeId {
        self.arena.push(node)
    }

    pub fn get_mut(&mut self, id: NodeId) -> Option<&mut DomNode> {
        self.arena.get_mut(id)
    }

    pub fn set_source(&mut self, source: String) {
        self.arena.source = Some(source);
    }

    #[must_use]
    pub fn finish(self) -> DomArena {
        self.arena
    }
}

impl Default for DomArenaBuilder {
    fn default() -> Self {
        Self::new()
    }
}
