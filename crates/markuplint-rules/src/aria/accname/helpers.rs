#![allow(clippy::implicit_hasher)]

use std::collections::HashSet;

use markuplint_core::mlast::NamespaceURI;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers as dom;
use markuplint_dom::node::DomNode;

use super::AccnameResolver;

pub fn flatten_text(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Collect name from content (Steps 2F/2C).
pub fn resolve_name_from_content(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    in_labelledby_traversal: bool,
    computing: &mut HashSet<NodeId>,
) -> String {
    let mut parts = Vec::new();

    for child_id in child_nodes(arena, node_id, resolver) {
        let Some(child) = arena.get(child_id) else {
            continue;
        };

        match child {
            DomNode::Text(text_data) => {
                let text = &text_data.base.raw;
                if !text.is_empty() {
                    parts.push(text.clone());
                }
            }
            DomNode::Element(_) => {
                // Hidden elements are excluded from content traversal
                if resolver.is_hidden(child_id) {
                    continue;
                }

                // Step 2C: Embedded control value
                if resolver.is_embedded_control(child_id) {
                    let value = get_embedded_control_value(arena, child_id, resolver);
                    if !value.is_empty() {
                        parts.push(value);
                    }
                    // Embedded controls are fully handled here — don't fall through
                    // to normal computation or transparent text collection.
                    continue;
                }

                let child_result = super::compute::compute_accessible_name_internal(
                    arena,
                    child_id,
                    resolver,
                    in_labelledby_traversal,
                    visited,
                    computing,
                );
                if child_result.name.is_empty() {
                    // Transparent traversal
                    let text = collect_transparent_text(
                        arena,
                        child_id,
                        resolver,
                        visited,
                        in_labelledby_traversal,
                        computing,
                    );
                    if !text.is_empty() {
                        parts.push(text);
                    }
                } else {
                    parts.push(child_result.name);
                }
            }
            _ => {}
        }
    }

    flatten_text(&parts.join(" "))
}

/// TS `collectTextContent` (an implementation-specific extension): when name from
/// content reaches an element with no name of its own, its descendants still
/// contribute — their text, the value of an embedded control, and the name each
/// descendant element computes (an `img` with `alt` inside a `span`). A hidden
/// element contributes nothing.
fn collect_transparent_text(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    in_labelledby_traversal: bool,
    computing: &mut HashSet<NodeId>,
) -> String {
    if resolver.is_hidden(node_id) {
        return String::new();
    }
    let mut parts = Vec::new();
    for child_id in child_nodes(arena, node_id, resolver) {
        match arena.get(child_id) {
            Some(DomNode::Text(t)) => parts.push(t.base.raw.clone()),
            Some(DomNode::Element(_)) => {
                if resolver.is_embedded_control(child_id) {
                    parts.push(get_embedded_control_value(arena, child_id, resolver));
                    continue;
                }
                let result = super::compute::compute_accessible_name_internal(
                    arena,
                    child_id,
                    resolver,
                    in_labelledby_traversal,
                    visited,
                    computing,
                );
                if result.name.is_empty() {
                    parts.push(collect_transparent_text(
                        arena,
                        child_id,
                        resolver,
                        visited,
                        in_labelledby_traversal,
                        computing,
                    ));
                } else {
                    parts.push(result.name);
                }
            }
            _ => {}
        }
    }
    parts.join(" ")
}

fn get_embedded_control_value(arena: &DomArena, node_id: NodeId, resolver: &dyn AccnameResolver) -> String {
    let Some(el) = arena.get(node_id).and_then(|n| n.as_element()) else {
        return String::new();
    };
    let tag = &el.base.node_name;

    let role_attr =
        dom::get_attr_value(arena, node_id, "role").and_then(|r| r.split_whitespace().next().map(String::from));

    let effective_role = role_attr.as_deref().unwrap_or_else(|| match tag.as_str() {
        "input" => {
            let t = dom::get_attr_value(arena, node_id, "type").unwrap_or("text");
            match t {
                "range" | "number" => "spinbutton",
                _ => "textbox",
            }
        }
        "textarea" => "textbox",
        "select" => "listbox",
        _ => "",
    });

    match effective_role {
        "slider" | "spinbutton" => {
            if let Some(vt) = dom::get_attr_value(arena, node_id, "aria-valuetext")
                && !vt.trim().is_empty()
            {
                return vt.to_string();
            }
            if let Some(vn) = dom::get_attr_value(arena, node_id, "aria-valuenow") {
                return vn.to_string();
            }
            dom::get_attr_value(arena, node_id, "value")
                .map(String::from)
                .unwrap_or_default()
        }
        "textbox" | "combobox" | "searchbox" => dom::get_attr_value(arena, node_id, "value")
            .map_or_else(|| text_content(arena, node_id, resolver), String::from),
        "listbox" => {
            // Only native <select> uses selected-option logic;
            // ARIA listbox (div[role=listbox]) uses textContent.
            if tag == "select" {
                get_selected_option_text(arena, node_id, resolver)
            } else {
                text_content(arena, node_id, resolver)
            }
        }
        _ => String::new(),
    }
}

/// The child nodes the name computation traverses for `node_id`: what the
/// resolver says it renders (TS `AccnameResolver.getChildNodes`), or the
/// children as written when it says nothing.
pub fn child_nodes(arena: &DomArena, node_id: NodeId, resolver: &dyn AccnameResolver) -> Vec<NodeId> {
    resolver
        .get_child_nodes(node_id)
        .unwrap_or_else(|| arena.children_of(node_id).map(<[NodeId]>::to_vec).unwrap_or_default())
}

/// `el.textContent` as written: the text of the descendants, comments excluded.
pub fn collect_text_content(arena: &DomArena, node_id: NodeId) -> String {
    text_content_of(arena, node_id, &|id| {
        arena.children_of(id).map(<[NodeId]>::to_vec).unwrap_or_default()
    })
}

/// TS `getTextContent`: the text content as the resolver sees the element — the
/// text of the nodes it says the element renders, at any depth. Text written
/// inside a pretended component that never renders its children is not part of it.
pub fn text_content(arena: &DomArena, node_id: NodeId, resolver: &dyn AccnameResolver) -> String {
    text_content_of(arena, node_id, &|id| child_nodes(arena, id, resolver))
}

fn text_content_of(arena: &DomArena, node_id: NodeId, children: &dyn Fn(NodeId) -> Vec<NodeId>) -> String {
    let mut parts = Vec::new();
    for child_id in children(node_id) {
        let Some(child) = arena.get(child_id) else {
            continue;
        };
        match child {
            DomNode::Text(t) => parts.push(t.base.raw.clone()),
            DomNode::Element(_) => {
                let text = text_content_of(arena, child_id, children);
                if !text.is_empty() {
                    parts.push(text);
                }
            }
            _ => {}
        }
    }
    parts.join("")
}

fn get_selected_option_text(arena: &DomArena, node_id: NodeId, resolver: &dyn AccnameResolver) -> String {
    let options = collect_options(arena, node_id, resolver);

    let selected: Vec<_> = options
        .iter()
        .filter(|&&opt_id| dom::has_attr(arena, opt_id, "selected"))
        .collect();
    if !selected.is_empty() {
        return selected
            .iter()
            .map(|&&id| text_content(arena, id, resolver).trim().to_string())
            .collect::<Vec<_>>()
            .join(" ");
    }

    // No explicit selected: first non-disabled option (HTML spec default)
    for opt_id in &options {
        if !dom::has_attr(arena, *opt_id, "disabled") {
            return text_content(arena, *opt_id, resolver);
        }
    }

    String::new()
}

fn collect_options(arena: &DomArena, node_id: NodeId, resolver: &dyn AccnameResolver) -> Vec<NodeId> {
    let mut options = Vec::new();
    for child_id in child_nodes(arena, node_id, resolver) {
        let Some(el) = arena.get(child_id).and_then(|n| n.as_element()) else {
            continue;
        };
        if el.base.node_name.eq_ignore_ascii_case("option") {
            options.push(child_id);
        } else if el.base.node_name.eq_ignore_ascii_case("optgroup") {
            options.extend(collect_options(arena, child_id, resolver));
        }
    }
    options
}

/// The first child element named `tag`, among the children as written.
pub fn find_child_by_local_name(arena: &DomArena, node_id: NodeId, tag: &str) -> Option<NodeId> {
    find_named(arena, arena.children_of(node_id)?, tag)
}

/// TS `findChildByLocalName` with a resolver: the first child element named `tag`
/// among the children the resolver says `node_id` renders.
pub fn find_rendered_child_by_local_name(
    arena: &DomArena,
    node_id: NodeId,
    tag: &str,
    resolver: &dyn AccnameResolver,
) -> Option<NodeId> {
    find_named(arena, &child_nodes(arena, node_id, resolver), tag)
}

fn find_named(arena: &DomArena, children: &[NodeId], tag: &str) -> Option<NodeId> {
    children
        .iter()
        .find(|&&cid| {
            arena
                .get(cid)
                .and_then(|n| n.as_element())
                .is_some_and(|el| el.base.node_name.eq_ignore_ascii_case(tag))
        })
        .copied()
}

pub fn is_svg_element(arena: &DomArena, node_id: NodeId) -> bool {
    arena
        .get(node_id)
        .and_then(|n| n.as_element())
        .is_some_and(|el| el.namespace == NamespaceURI::SVG)
}

/// Defaults to `text` when the attribute is absent.
pub fn get_input_type(arena: &DomArena, node_id: NodeId) -> String {
    dom::get_attr_value(arena, node_id, "type").map_or_else(|| "text".to_string(), str::to_ascii_lowercase)
}
