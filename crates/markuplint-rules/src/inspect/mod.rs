//! What the TS `Document` shows of the nodes that the engine lints, without building it.
//!
//! The TS engine hands a consumer the `MLDocument` it linted: the CLI reads its `nodeList` to find
//! the node of a violation (scoped suppressions) and `deepQuerySelectorAll` for `--search`, and the
//! language server prints its `debugMap()` and reads what the accessibility tree has of the element
//! under the cursor (`searchNodeByLocation`, `getAccessibilityProp`). The Rust engine never builds
//! that document, so these views are computed from the arena the rules ran on:
//!
//! - [`node_list`] and [`debug_map`]: the nodes and their tokens;
//! - [`search`]: the elements a selector matches;
//! - [`accessibility_at`]: the element at a position, with its role, name and ARIA properties.
//!
//! They describe the same document as [`crate::lint::lint`]: the arena after the pretenders were
//! applied ([`crate::lint::pretended_document`]), and nothing at all when the document did not parse,
//! as TS has no document then either.
//!
//! The TS `nodeList` is the AST's `nodeList` without the end tags, in document order. A
//! pre-order walk of the arena from its root is that order: the arena keeps the end tags and the
//! virtual elements of a pretender (which TS keeps out of `nodeList`) out of the child lists the
//! walk follows, or the walk skips them.

mod accessibility;
mod debug_map;
mod node_list;
mod search;

pub use accessibility::{InspectedAccessibility, InspectedAria, InspectedName, InspectedProp, accessibility_at};
pub use debug_map::debug_map;
pub use node_list::{InspectedAttr, InspectedNode, node_list};
pub use search::{SearchHit, search};

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;

/// The nodes of the TS `nodeList`, in document order.
fn document_order(arena: &DomArena) -> Vec<NodeId> {
    let mut order = Vec::with_capacity(arena.len());
    let mut stack: Vec<NodeId> = arena
        .document()
        .map(|document| document.children().iter().rev().copied().collect())
        .unwrap_or_default();
    while let Some(id) = stack.pop() {
        let Some(node) = arena.get(id) else {
            continue;
        };
        match node {
            DomNode::EndTag(_) | DomNode::Document(_) => continue,
            DomNode::Element(element) if element.is_virtual() => continue,
            _ => {}
        }
        order.push(id);
        stack.extend(node.children().iter().rev().copied());
    }
    order
}

/// `None` when the document did not parse: TS has no document then.
fn parsed(arena: &DomArena) -> bool {
    crate::lint::get_parse_error(arena).is_none()
}

#[cfg(test)]
mod accessibility_tests;
#[cfg(test)]
mod tests;
