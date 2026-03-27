//! Active formatting elements list per WHATWG §13.2.4.3.

use crate::tree::Arena;
use crate::tree::node::NodeId;

/// An entry in the active formatting elements list.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FormatEntry {
    Element(NodeId),
    Marker,
}

/// The list of active formatting elements.
#[derive(Debug, Default)]
pub struct ActiveFormattingElements {
    entries: Vec<FormatEntry>,
}

impl ActiveFormattingElements {
    #[must_use]
    pub fn new() -> Self {
        Self { entries: Vec::new() }
    }

    pub fn push(&mut self, entry: FormatEntry) {
        self.entries.push(entry);
    }

    pub fn push_marker(&mut self) {
        self.entries.push(FormatEntry::Marker);
    }

    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    pub fn clear_up_to_last_marker(&mut self) {
        while let Some(entry) = self.entries.pop() {
            if entry == FormatEntry::Marker {
                break;
            }
        }
    }

    pub fn remove(&mut self, id: NodeId) {
        self.entries
            .retain(|e| !matches!(e, FormatEntry::Element(eid) if *eid == id));
    }

    /// Check if a node ID is in the list.
    #[must_use]
    pub fn contains(&self, id: NodeId) -> bool {
        self.entries
            .iter()
            .any(|e| matches!(e, FormatEntry::Element(eid) if *eid == id))
    }

    /// Find the last element with the given tag name.
    #[must_use]
    pub fn find_last_element(&self, tag_name: &str, arena: &Arena) -> Option<NodeId> {
        for entry in self.entries.iter().rev() {
            if let FormatEntry::Element(id) = entry
                && arena.get(*id).is_html_element(tag_name)
            {
                return Some(*id);
            }
        }
        None
    }

    /// Get the position of a node in the list.
    #[must_use]
    pub fn position(&self, id: NodeId) -> Option<usize> {
        self.entries
            .iter()
            .position(|e| matches!(e, FormatEntry::Element(eid) if *eid == id))
    }

    /// Iterate entries from newest to oldest.
    pub fn iter_rev(&self) -> impl Iterator<Item = &FormatEntry> {
        self.entries.iter().rev()
    }

    pub fn entries(&self) -> &[FormatEntry] {
        &self.entries
    }
}
