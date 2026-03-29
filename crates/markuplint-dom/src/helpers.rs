//! Convenience helpers for querying DOM nodes in a `DomArena`.

use markuplint_core::mlast::MLASTAttr;

use crate::arena::{DomArena, NodeId};
use crate::node::ElementData;

/// Get the value of an attribute by name (case-insensitive).
///
/// Returns the raw value string from the attribute's value token.
/// Returns `None` if the node is not an element or the attribute is not found.
#[must_use]
pub fn get_attr_value<'a>(arena: &'a DomArena, node_id: NodeId, attr_name: &str) -> Option<&'a str> {
    let el = arena.get(node_id)?.as_element()?;
    get_attr_value_from_el(el, attr_name)
}

/// Get the value of an attribute from an `ElementData` (case-insensitive name match).
///
/// Returns the raw value token string. Only matches `HTMLAttr` variants (skips spread attrs).
#[must_use]
pub fn get_attr_value_from_el<'a>(el: &'a ElementData, attr_name: &str) -> Option<&'a str> {
    for attr in &el.attributes {
        if let MLASTAttr::HTMLAttr(html_attr) = attr
            && html_attr.node_name.eq_ignore_ascii_case(attr_name)
        {
            return Some(&html_attr.value.raw);
        }
    }
    None
}

/// Check if an element has an attribute (case-insensitive).
///
/// Returns `false` if the node is not an element.
#[must_use]
pub fn has_attr(arena: &DomArena, node_id: NodeId, attr_name: &str) -> bool {
    get_attr_value(arena, node_id, attr_name).is_some()
}
