//! Tree traversal API for `DomArena`.

use crate::arena::{DomArena, NodeId};
use crate::node::{DomNode, ElementData};

impl DomArena {
    /// Get the parent node of a given node.
    #[must_use]
    pub fn parent(&self, id: NodeId) -> Option<&DomNode> {
        self.get(id).and_then(DomNode::parent_id).and_then(|pid| self.get(pid))
    }

    /// Get the children IDs of a given node.
    #[must_use]
    pub fn children_of(&self, id: NodeId) -> Option<&[NodeId]> {
        self.get(id).map(DomNode::children)
    }

    /// Get the next sibling of a given node.
    #[must_use]
    pub fn next_sibling(&self, id: NodeId) -> Option<&DomNode> {
        self.get(id)
            .and_then(|n| n.base())
            .and_then(|b| b.next_sibling)
            .and_then(|sid| self.get(sid))
    }

    /// Get the previous sibling of a given node.
    #[must_use]
    pub fn prev_sibling(&self, id: NodeId) -> Option<&DomNode> {
        self.get(id)
            .and_then(|n| n.base())
            .and_then(|b| b.prev_sibling)
            .and_then(|sid| self.get(sid))
    }

    /// Iterate over ancestors of a node (excluding the node itself), bottom-up.
    pub fn ancestors(&self, id: NodeId) -> AncestorIter<'_> {
        let first_parent = self.get(id).and_then(DomNode::parent_id);
        AncestorIter {
            arena: self,
            current: first_parent,
        }
    }

    /// Iterate over descendants of a node in document order (depth-first pre-order).
    pub fn descendants(&self, id: NodeId) -> DescendantIter<'_> {
        let children = self.get(id).map(|n| n.children().to_vec()).unwrap_or_default();
        DescendantIter {
            arena: self,
            stack: children.into_iter().rev().collect(),
        }
    }

    /// Iterate over all element nodes in the arena.
    pub fn elements(&self) -> impl Iterator<Item = (NodeId, &ElementData)> {
        self.nodes.iter().filter_map(|n| {
            if let DomNode::Element(data) = n {
                Some((data.base.id, data))
            } else {
                None
            }
        })
    }

    /// Get the document root node (always at index 0).
    #[must_use]
    pub fn document(&self) -> Option<&DomNode> {
        self.get(0)
    }
}

/// Iterator over ancestors of a node, bottom-up.
pub struct AncestorIter<'a> {
    arena: &'a DomArena,
    current: Option<NodeId>,
}

impl<'a> Iterator for AncestorIter<'a> {
    type Item = &'a DomNode;

    fn next(&mut self) -> Option<Self::Item> {
        let id = self.current?;
        let node = self.arena.get(id)?;
        self.current = node.parent_id();
        Some(node)
    }
}

/// Iterator over descendants in document order (depth-first pre-order).
pub struct DescendantIter<'a> {
    arena: &'a DomArena,
    stack: Vec<NodeId>,
}

impl<'a> Iterator for DescendantIter<'a> {
    type Item = &'a DomNode;

    fn next(&mut self) -> Option<Self::Item> {
        let id = self.stack.pop()?;
        let node = self.arena.get(id)?;
        // Push children in reverse order so leftmost is popped first.
        let children = node.children();
        for &child_id in children.iter().rev() {
            self.stack.push(child_id);
        }
        Some(node)
    }
}
