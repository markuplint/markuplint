use crate::arena::{DomArena, NodeId};
use crate::node::{DomNode, ElementData};

impl DomArena {
    #[must_use]
    pub fn parent(&self, id: NodeId) -> Option<&DomNode> {
        self.get(id).and_then(DomNode::parent_id).and_then(|pid| self.get(pid))
    }

    #[must_use]
    pub fn children_of(&self, id: NodeId) -> Option<&[NodeId]> {
        self.get(id).map(DomNode::children)
    }

    /// Mirrors TS `getPureChildNodes()` which filters out `type === 'endtag'`
    /// and `type === 'invalid'` nodes. In Rust, this also filters Text/Comment/PSBlock
    /// nodes with `is_bogus = true`.
    #[must_use]
    pub fn pure_children_of(&self, id: NodeId) -> Vec<NodeId> {
        let Some(children) = self.children_of(id) else {
            return Vec::new();
        };
        children
            .iter()
            .copied()
            .filter(|&cid| !self.get(cid).is_some_and(DomNode::is_bogus))
            .collect()
    }

    #[must_use]
    pub fn next_sibling(&self, id: NodeId) -> Option<&DomNode> {
        self.get(id)
            .and_then(|n| n.base())
            .and_then(|b| b.next_sibling)
            .and_then(|sid| self.get(sid))
    }

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

    pub fn elements(&self) -> impl Iterator<Item = (NodeId, &ElementData)> {
        self.nodes.iter().filter_map(|n| {
            if let DomNode::Element(data) = n {
                Some((data.base.id, data))
            } else {
                None
            }
        })
    }

    /// The document root is always at index 0.
    #[must_use]
    pub fn document(&self) -> Option<&DomNode> {
        self.get(0)
    }

    /// A missing or non-`Document` root at index 0 is treated as a fragment.
    #[must_use]
    pub fn is_fragment(&self) -> bool {
        match self.get(0) {
            Some(DomNode::Document(doc)) => doc.is_fragment,
            _ => true,
        }
    }
}

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
