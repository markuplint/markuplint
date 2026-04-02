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

/// Extract the raw (original-case) tag name from an element's `raw` source.
///
/// The `raw` field contains the opening tag text (e.g., `<DIV class="foo">`).
/// This extracts the tag name portion preserving the original case.
/// Returns `None` if the raw text doesn't look like a tag.
#[must_use]
pub fn get_raw_tag_name(el: &ElementData) -> Option<&str> {
    extract_tag_name_from_raw(&el.base.raw)
}

/// Extract tag name from a raw tag string (opening or closing).
///
/// Handles both `<DIV ...>` and `</DIV>` formats.
#[must_use]
pub fn extract_tag_name_from_raw(raw: &str) -> Option<&str> {
    let rest = raw.strip_prefix('<')?;
    let rest = rest.strip_prefix('/').unwrap_or(rest);
    let end = rest
        .find(|c: char| c.is_ascii_whitespace() || c == '>' || c == '/')
        .unwrap_or(rest.len());
    if end == 0 {
        return None;
    }
    Some(&rest[..end])
}

/// Extract the raw (original-case) attribute name from an HTML attribute.
///
/// Uses the `name` token's `raw` field which preserves the original case,
/// unlike `node_name` which is normalized to lowercase by the HTML parser.
/// Trims whitespace because the name span may include trailing spaces when
/// there is whitespace before `=` (e.g., `name  =viewport`).
#[must_use]
pub fn get_raw_attr_name(attr: &markuplint_core::mlast::MLASTHTMLAttr) -> &str {
    attr.name.raw.trim()
}
