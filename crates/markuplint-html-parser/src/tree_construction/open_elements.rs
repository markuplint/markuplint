//! Stack of open elements per WHATWG §13.2.4.2.

use crate::tree::node::NodeId;

#[derive(Debug, Default)]
pub struct OpenElementsStack {
    elements: Vec<NodeId>,
}

impl OpenElementsStack {
    #[must_use]
    pub fn new() -> Self {
        Self { elements: Vec::new() }
    }

    pub fn push(&mut self, id: NodeId) {
        self.elements.push(id);
    }

    pub fn pop(&mut self) -> Option<NodeId> {
        self.elements.pop()
    }

    #[must_use]
    pub fn current_node(&self) -> Option<NodeId> {
        self.elements.last().copied()
    }

    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.elements.is_empty()
    }

    #[must_use]
    pub fn len(&self) -> usize {
        self.elements.len()
    }

    #[must_use]
    pub fn contains(&self, id: NodeId) -> bool {
        self.elements.contains(&id)
    }

    pub fn remove(&mut self, id: NodeId) {
        self.elements.retain(|&x| x != id);
    }

    /// Top is most recent.
    pub fn iter_top_to_bottom(&self) -> impl Iterator<Item = &NodeId> {
        self.elements.iter().rev()
    }

    pub fn iter_bottom_to_top(&self) -> impl Iterator<Item = &NodeId> {
        self.elements.iter()
    }

    /// Index 0 is the bottom of the stack.
    #[must_use]
    pub fn get(&self, index: usize) -> Option<NodeId> {
        self.elements.get(index).copied()
    }

    #[must_use]
    pub fn position(&self, id: NodeId) -> Option<usize> {
        self.elements.iter().position(|&x| x == id)
    }

    pub fn replace(&mut self, index: usize, new_id: NodeId) {
        if index < self.elements.len() {
            self.elements[index] = new_id;
        }
    }

    pub fn replace_id(&mut self, old_id: NodeId, new_id: NodeId) {
        if let Some(pos) = self.position(old_id) {
            self.elements[pos] = new_id;
        }
    }

    pub fn insert(&mut self, index: usize, id: NodeId) {
        self.elements.insert(index, id);
    }
}
