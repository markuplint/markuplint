//! Active formatting elements list per WHATWG §13.2.4.3.

use crate::tree::Arena;
use crate::tree::node::{NodeId, NodeKind};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FormatEntry {
    Element(NodeId),
    Marker,
}

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

    /// Push with Noah's Ark constraint: if there are already 3 elements
    /// after the last marker with the same tag/namespace/attributes,
    /// remove the earliest one before adding the new element.
    pub fn push_with_noahs_ark(&mut self, entry: FormatEntry, arena: &Arena) {
        if let FormatEntry::Element(new_id) = &entry
            && let NodeKind::Element {
                tag_name: ref new_tag,
                namespace: new_ns,
                attributes: ref new_attrs,
                ..
            } = arena.get(*new_id).kind
        {
            let mut matching = Vec::new();
            for (idx, e) in self.entries.iter().enumerate().rev() {
                match e {
                    FormatEntry::Marker => break,
                    FormatEntry::Element(id) => {
                        if let NodeKind::Element {
                            tag_name: ref t,
                            namespace: ns,
                            attributes: ref attrs,
                            ..
                        } = arena.get(*id).kind
                            && t == new_tag
                            && ns == new_ns
                            && attrs.len() == new_attrs.len()
                            && attrs
                                .iter()
                                .all(|a| new_attrs.iter().any(|na| na.name == a.name && na.value == a.value))
                        {
                            matching.push(idx);
                        }
                    }
                }
            }
            if matching.len() >= 3
                && let Some(&earliest) = matching.last()
            {
                self.entries.remove(earliest);
            }
        }
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

    #[must_use]
    pub fn contains(&self, id: NodeId) -> bool {
        self.entries
            .iter()
            .any(|e| matches!(e, FormatEntry::Element(eid) if *eid == id))
    }

    /// Find the last element with the given tag name, searching
    /// between the end of the list and the last marker (or start).
    #[must_use]
    pub fn find_last_element(&self, tag_name: &str, arena: &Arena) -> Option<NodeId> {
        for entry in self.entries.iter().rev() {
            match entry {
                FormatEntry::Marker => return None, // Stop at marker.
                FormatEntry::Element(id) => {
                    if arena.get(*id).is_html_element(tag_name) {
                        return Some(*id);
                    }
                }
            }
        }
        None
    }

    #[must_use]
    pub fn position(&self, id: NodeId) -> Option<usize> {
        self.entries
            .iter()
            .position(|e| matches!(e, FormatEntry::Element(eid) if *eid == id))
    }

    pub fn replace(&mut self, old_id: NodeId, new_id: NodeId) {
        for entry in &mut self.entries {
            if matches!(entry, FormatEntry::Element(eid) if *eid == old_id) {
                *entry = FormatEntry::Element(new_id);
                return;
            }
        }
    }

    pub fn insert_at(&mut self, index: usize, entry: FormatEntry) {
        let idx = index.min(self.entries.len());
        self.entries.insert(idx, entry);
    }

    /// Newest to oldest.
    pub fn iter_rev(&self) -> impl Iterator<Item = &FormatEntry> {
        self.entries.iter().rev()
    }

    pub fn entries(&self) -> &[FormatEntry] {
        &self.entries
    }
}
