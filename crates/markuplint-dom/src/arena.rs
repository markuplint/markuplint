//! Cross-references use `NodeId` indices instead of pointers, avoiding lifetime complexity.

use std::collections::HashMap;

use crate::node::DomNode;

pub type NodeId = usize;

#[derive(Debug)]
pub struct DomArena {
    pub(crate) nodes: Vec<DomNode>,
    pub(crate) uuid_to_id: HashMap<String, NodeId>,
    /// Populated only when built from the HTML parser path (Path B), so rules can
    /// read source text at specific offsets (e.g. character-reference rule checking
    /// unresolved entity text); the MLAST path leaves it `None`.
    pub(crate) source: Option<String>,
}

impl DomArena {
    #[must_use]
    pub fn new() -> Self {
        Self {
            nodes: Vec::new(),
            uuid_to_id: HashMap::new(),
            source: None,
        }
    }

    #[must_use]
    pub fn source(&self) -> Option<&str> {
        self.source.as_deref()
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
