//! Arena-based DOM storage using `Vec<DomNode>` + `NodeId = usize`.
//!
//! All nodes are allocated in a single `Vec`. Cross-references use `NodeId`
//! indices instead of pointers, avoiding lifetime complexity.

use std::collections::HashMap;

use crate::node::DomNode;

/// Index into the arena's node vector.
pub type NodeId = usize;

/// Arena that owns all DOM nodes and provides safe access by `NodeId` or UUID.
#[derive(Debug)]
pub struct DomArena {
    pub(crate) nodes: Vec<DomNode>,
    pub(crate) uuid_to_id: HashMap<String, NodeId>,
    /// Original HTML source text (available when built from HTML parser).
    /// Used by rules that need to access source text at specific offsets
    /// (e.g., character-reference rule checking unresolved entity text).
    pub(crate) source: Option<String>,
}

impl DomArena {
    /// Create a new empty arena.
    #[must_use]
    pub fn new() -> Self {
        Self {
            nodes: Vec::new(),
            uuid_to_id: HashMap::new(),
            source: None,
        }
    }

    /// Get the original HTML source text, if available.
    #[must_use]
    pub fn source(&self) -> Option<&str> {
        self.source.as_deref()
    }

    /// Get a node by its `NodeId`. Returns `None` if out of range.
    #[must_use]
    pub fn get(&self, id: NodeId) -> Option<&DomNode> {
        self.nodes.get(id)
    }

    /// Get a node by its UUID string. Returns `None` if not found.
    #[must_use]
    pub fn get_by_uuid(&self, uuid: &str) -> Option<&DomNode> {
        self.uuid_to_id.get(uuid).and_then(|&id| self.get(id))
    }

    /// Get the `NodeId` for a UUID. Returns `None` if not found.
    #[must_use]
    pub fn id_by_uuid(&self, uuid: &str) -> Option<NodeId> {
        self.uuid_to_id.get(uuid).copied()
    }

    /// Total number of nodes in the arena.
    #[must_use]
    pub fn len(&self) -> usize {
        self.nodes.len()
    }

    /// Whether the arena is empty.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.nodes.is_empty()
    }

    /// Push a node into the arena, returning its `NodeId`.
    pub(crate) fn push(&mut self, node: DomNode) -> NodeId {
        let id = self.nodes.len();
        if let Some(uuid) = node.uuid() {
            self.uuid_to_id.insert(uuid.to_owned(), id);
        }
        self.nodes.push(node);
        id
    }

    /// Get a mutable reference to a node by its `NodeId`.
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
    /// Create a new empty builder.
    #[must_use]
    pub fn new() -> Self {
        Self { arena: DomArena::new() }
    }

    /// Push a node into the arena, returning its `NodeId`.
    pub fn push(&mut self, node: DomNode) -> NodeId {
        self.arena.push(node)
    }

    /// Get a mutable reference to a node for wiring parent/child/sibling links.
    pub fn get_mut(&mut self, id: NodeId) -> Option<&mut DomNode> {
        self.arena.get_mut(id)
    }

    /// Set the original HTML source text on the arena.
    pub fn set_source(&mut self, source: String) {
        self.arena.source = Some(source);
    }

    /// Consume the builder and return the finished arena.
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
