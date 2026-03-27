//! Adoption agency algorithm per WHATWG §13.2.6.4.7.
//!
//! Handles misnested formatting elements like `<b><i></b></i>`.

use crate::tables;
use crate::tree::node::{Namespace, NodeId};

use super::TreeBuilder;

impl TreeBuilder<'_> {
    /// Run the adoption agency algorithm for a formatting end tag.
    ///
    /// Returns `true` if the algorithm ran, `false` if it should fall
    /// through to the "any other end tag" logic.
    #[allow(clippy::too_many_lines, clippy::never_loop, unused_assignments)]
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

        // Step 2: outer loop (max 8 iterations).
        // Using a manual counter to satisfy clippy (no `for` with early return on all paths).
        let mut outer_iter = 0;
        while outer_iter < 8 {
            outer_iter += 1;

            // Step 3: Find the formatting element in active formatting.
            let Some(format_id) = self.active_formatting.find_last_element(tag_name, &self.arena) else {
                return false; // Fall through to "any other end tag".
            };

            // Step 4: If not in the open elements stack, remove from
            // active formatting and return.
            if !self.open_elements.contains(format_id) {
                self.active_formatting.remove(format_id);
                return true;
            }

            // Step 5: If in stack but not in scope, parse error, return.
            if !self.has_element_in_scope(tag_name) {
                return true;
            }

            // Step 7: Find the furthest block.
            let format_pos = self.open_elements.position(format_id).unwrap();
            let furthest_block = self.find_furthest_block(format_pos);

            // Step 8: If there's no furthest block, pop up to and including
            // the formatting element, remove from active formatting.
            let Some(furthest_block_id) = furthest_block else {
                while let Some(id) = self.open_elements.pop() {
                    if id == format_id {
                        break;
                    }
                }
                self.active_formatting.remove(format_id);
                return true;
            };

            // Step 9: Get the common ancestor.
            let common_ancestor = self.open_elements.get(format_pos.saturating_sub(1));

            // Steps 10–13: simplified inner loop.
            let mut node_idx = self.open_elements.position(furthest_block_id).unwrap();
            let mut last_node = furthest_block_id;

            for _ in 0..3 {
                if node_idx == 0 {
                    break;
                }
                node_idx -= 1;
                let Some(node_id) = self.open_elements.get(node_idx) else {
                    break;
                };

                if node_id == format_id {
                    break;
                }

                if !self.active_formatting.contains(node_id) {
                    self.open_elements.remove(node_id);
                    continue;
                }

                // Simplified reparenting.
                self.arena.remove_from_parent(last_node);
                self.arena.append_child(node_id, last_node);
                last_node = node_id;
            }

            // Step 14: Insert last_node into common ancestor.
            if let Some(ancestor) = common_ancestor {
                self.arena.remove_from_parent(last_node);
                self.arena.append_child(ancestor, last_node);
            }

            // Simplified cleanup: remove formatting element from both lists.
            self.open_elements.remove(format_id);
            self.active_formatting.remove(format_id);

            return true;
        }

        true
    }

    /// Find the furthest block: the topmost special element in the stack
    /// above the given position.
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
}
