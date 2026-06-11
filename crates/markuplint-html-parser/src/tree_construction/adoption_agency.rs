//! Adoption agency algorithm per WHATWG §13.2.6.4.7.
//!
//! Handles misnested formatting elements like `<b><i></b></i>`.

use crate::tables;
use crate::tree::node::{Namespace, NodeId, NodeKind};

use super::TreeBuilder;
use super::active_formatting::FormatEntry;

impl TreeBuilder<'_> {
    /// Run the adoption agency algorithm for a formatting end tag.
    ///
    /// Returns `true` if the algorithm ran, `false` if it should fall
    /// through to the "any other end tag" logic.
    #[allow(clippy::too_many_lines)]
    pub(super) fn run_adoption_agency(&mut self, tag_name: &str) -> bool {
        // Step 1: If current node is an HTML element with the same tag name,
        // and it's not in the active formatting elements list, just pop.
        if let Some(current) = self.current_node()
            && self.arena.get(current).is_html_element(tag_name)
            && !self.active_formatting.contains(current)
        {
            self.open_elements.pop();
            return true;
        }

        // Step 2: outer loop counter.
        let mut outer_loop_counter = 0;

        // Step 3: outer loop.
        loop {
            // Step 4: check counter.
            if outer_loop_counter >= 8 {
                return true;
            }
            outer_loop_counter += 1;

            // Step 5: Find formatting element in active formatting.
            let Some(format_id) = self.active_formatting.find_last_element(tag_name, &self.arena) else {
                return false;
            };

            // Step 6: If not in open elements stack, remove and return.
            if !self.open_elements.contains(format_id) {
                self.active_formatting.remove(format_id);
                return true;
            }

            // Step 7: If not in scope, parse error, return.
            if !self.has_element_in_scope(tag_name) {
                return true;
            }

            // Step 8: (parse error if format element != current node)

            // Step 9: Let furthest block be the topmost special element
            // in the stack above the formatting element.
            let format_pos = self.open_elements.position(format_id).unwrap();
            let furthest_block = self.find_furthest_block(format_pos);

            // Step 10: If no furthest block, pop up to and including
            // formatting element, remove from active formatting.
            let Some(furthest_block_id) = furthest_block else {
                while let Some(id) = self.open_elements.pop() {
                    if id == format_id {
                        break;
                    }
                }
                self.active_formatting.remove(format_id);
                return true;
            };

            // Step 11: common ancestor = element below formatting element in stack.
            let common_ancestor = if format_pos > 0 {
                self.open_elements.get(format_pos - 1)
            } else {
                None
            };

            // Step 12: bookmark = position of formatting element in active formatting.
            let mut bookmark = self.active_formatting.position(format_id).unwrap_or(0);

            // Step 13: inner loop — use position-based tracking per WHATWG.
            // "Let node be the element immediately above node in the stack,
            //  or if node is no longer in the stack (because it was removed),
            //  the element that was immediately above node before removal."
            let mut node_above_pos = self.open_elements.position(furthest_block_id).unwrap_or(0);
            let mut last_node = furthest_block_id;
            let mut inner_loop_counter = 0;

            loop {
                inner_loop_counter += 1;

                // Step 13.3: Move up in the stack.
                if node_above_pos == 0 {
                    break;
                }
                node_above_pos -= 1;

                let Some(mut node_id) = self.open_elements.get(node_above_pos) else {
                    break;
                };

                // Step 13.4: If node is the formatting element, break.
                if node_id == format_id {
                    break;
                }

                // Step 13.5: If inner loop counter > 3 and node is in active
                // formatting, remove it from active formatting.
                if inner_loop_counter > 3 && self.active_formatting.contains(node_id) {
                    self.active_formatting.remove(node_id);
                }

                // Step 13.6: If node is not in active formatting, remove from
                // stack and continue. After removal, elements above shift
                // down, so node_above_pos stays the same — the next
                // iteration's decrement will land on the correct element.
                if !self.active_formatting.contains(node_id) {
                    self.open_elements.remove(node_id);
                    continue;
                }

                // Step 13.7: Create a new element with same tag/ns/attrs.
                let new_element = self.clone_element(node_id);

                // Replace node in active formatting and open elements.
                self.active_formatting.replace(node_id, new_element);
                self.open_elements.replace_id(node_id, new_element);
                node_id = new_element;

                // Step 13.8: If last node is furthest block, set bookmark
                // to one past new element in active formatting.
                if last_node == furthest_block_id {
                    bookmark = self.active_formatting.position(new_element).map_or(bookmark, |p| p + 1);
                }

                // Step 13.9: Reparent last_node under node.
                self.arena.remove_from_parent(last_node);
                self.arena.append_child(node_id, last_node);

                // Step 13.10: Set last node to node.
                last_node = node_id;
            }

            // Step 14: Insert last node at the appropriate place for inserting
            // a node under common ancestor. Per WHATWG: if foster parenting
            // would be required (i.e. common ancestor is table/tbody/tfoot/
            // thead/tr), foster parent; otherwise append to common ancestor.
            if let Some(ancestor) = common_ancestor {
                self.arena.remove_from_parent(last_node);
                let needs_foster = self
                    .arena
                    .get(ancestor)
                    .tag_name()
                    .is_some_and(|n| matches!(n, "table" | "tbody" | "tfoot" | "thead" | "tr"));
                if needs_foster {
                    // Foster parent: insert before the table-like ancestor
                    // in its parent.
                    if let Some(parent) = self.arena.get(ancestor).parent {
                        self.arena.insert_before(parent, last_node, ancestor);
                    } else {
                        self.arena.append_child(ancestor, last_node);
                    }
                } else {
                    self.arena.append_child(ancestor, last_node);
                }
            }

            // Step 15: Create new element for formatting element.
            let new_format = self.clone_element(format_id);

            // Step 16: Move all children of furthest block to new element.
            let fb_children: Vec<NodeId> = self.arena.get(furthest_block_id).children.clone();
            for &child in &fb_children {
                self.arena.remove_from_parent(child);
                self.arena.append_child(new_format, child);
            }

            // Step 17: Append new element to furthest block.
            self.arena.append_child(furthest_block_id, new_format);

            // Step 18: Remove formatting element from active formatting,
            // insert new element at bookmark position.
            self.active_formatting.remove(format_id);
            self.active_formatting.insert_at(
                bookmark.min(self.active_formatting.entries().len()),
                FormatEntry::Element(new_format),
            );

            // Step 19: Remove formatting element from open elements,
            // insert new element after furthest block.
            self.open_elements.remove(format_id);
            let fb_pos = self.open_elements.position(furthest_block_id).unwrap_or(0);
            self.open_elements.insert(fb_pos + 1, new_format);

            // Outer loop continues to step 4.
        }
    }

    fn find_furthest_block(&self, format_pos: usize) -> Option<NodeId> {
        let stack_len = self.open_elements.len();
        for i in (format_pos + 1)..stack_len {
            if let Some(id) = self.open_elements.get(i) {
                let node = self.arena.get(id);
                if let Some(name) = node.tag_name()
                    && node.namespace() == Some(Namespace::Html)
                    && tables::is_special_element_html(name)
                {
                    return Some(id);
                }
            }
        }
        None
    }

    fn clone_element(&mut self, node_id: NodeId) -> NodeId {
        let node = self.arena.get(node_id);
        let span = node.span;
        match &node.kind {
            NodeKind::Element {
                tag_name,
                namespace,
                attributes,
                self_closing,
            } => self.arena.create_element(
                tag_name.clone(),
                *namespace,
                attributes.clone(),
                *self_closing,
                span,
                node.is_implicit,
            ),
            _ => {
                // Should not happen — adoption agency only deals with elements.
                node_id
            }
        }
    }
}
