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
}

impl DomArena {
    /// Create a new empty arena.
    #[must_use]
    pub fn new() -> Self {
        Self {
            nodes: Vec::new(),
            uuid_to_id: HashMap::new(),
        }
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
