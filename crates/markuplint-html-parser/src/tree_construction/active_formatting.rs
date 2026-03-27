//! Active formatting elements list per WHATWG §13.2.4.3.
//!
//! Stub — will be implemented in Phase 6.

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

    /// Iterate entries from newest to oldest.
    pub fn iter_rev(&self) -> impl Iterator<Item = &FormatEntry> {
        self.entries.iter().rev()
    }

    pub fn entries(&self) -> &[FormatEntry] {
        &self.entries
    }
}
