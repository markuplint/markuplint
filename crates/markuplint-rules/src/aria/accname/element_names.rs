//! `AccName` Step 2E: Element-specific name computation (HTML-AAM §4.1).

#![allow(clippy::too_many_arguments)]

use std::collections::HashSet;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers as dom;

use super::helpers::{
    collect_text_content, find_child_by_local_name, get_input_type, is_svg_element, resolve_name_from_content,
};
use super::label_steps::resolve_label_text;
use super::{AccnameResolver, AccnameResult, AccnameSource};

const TEXT_INPUT_TYPES: &[&str] = &["text", "search", "tel", "url", "email", "password", "number"];

/// Step 2E: Get element-specific accessible name.
pub fn get_element_specific_name(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    in_labelledby_traversal: bool,
    computing: &mut HashSet<NodeId>,
) -> Option<AccnameResult> {
    let el = arena.get(node_id)?.as_element()?;
    let tag = el.base.node_name.as_str();

    if is_svg_element(arena, node_id) {
        return handle_svg_element(arena, node_id);
    }

    match tag {
        "input" => handle_input(arena, node_id, resolver, visited, in_labelledby_traversal, computing),
        "textarea" | "select" | "meter" | "progress" | "output" => {
            handle_labelable_with_title(arena, node_id, resolver, visited, in_labelledby_traversal, computing)
        }
        "button" => handle_button(arena, node_id, resolver, visited, in_labelledby_traversal, computing),
        "fieldset" => handle_fieldset(arena, node_id, resolver, visited, in_labelledby_traversal, computing),
        "table" => handle_table(arena, node_id, resolver, visited, in_labelledby_traversal, computing),
        "img" => handle_img(arena, node_id),
        "area" => handle_area(arena, node_id),
        "figure" | "iframe" => handle_title_only(arena, node_id),
        "summary" => handle_summary(arena, node_id, resolver, visited, in_labelledby_traversal, computing),
        "a" => {
            if dom::has_attr(arena, node_id, "href") {
                handle_anchor(arena, node_id, resolver, visited, in_labelledby_traversal, computing)
            } else {
                None
            }
        }
        _ => None,
    }
}

fn handle_input(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    in_labelledby: bool,
    computing: &mut HashSet<NodeId>,
) -> Option<AccnameResult> {
    let input_type = get_input_type(arena, node_id);

    if input_type == "hidden" {
        return Some(AccnameResult::empty());
    }

    if TEXT_INPUT_TYPES.contains(&input_type.as_str()) {
        return handle_labelable_with_title(arena, node_id, resolver, visited, in_labelledby, computing);
    }

    match input_type.as_str() {
        "button" | "submit" | "reset" => {
            handle_input_button(arena, node_id, &input_type, resolver, visited, in_labelledby, computing)
        }
        "image" => handle_input_image(arena, node_id, resolver, visited, in_labelledby, computing),
        _ => {
            if let Some(r) = resolve_label_text(arena, node_id, resolver, visited, in_labelledby, computing) {
                return Some(r);
            }
            title_attr(arena, node_id)
        }
    }
}

fn handle_input_button(
    arena: &DomArena,
    node_id: NodeId,
    input_type: &str,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    in_labelledby: bool,
    computing: &mut HashSet<NodeId>,
) -> Option<AccnameResult> {
    if let Some(r) = resolve_label_text(arena, node_id, resolver, visited, in_labelledby, computing) {
        return Some(r);
    }
    if let Some(v) = dom::get_attr_value(arena, node_id, "value")
        && !v.is_empty()
    {
        return Some(AccnameResult::new(v, AccnameSource::Value));
    }
    if let Some(r) = title_attr(arena, node_id) {
        return Some(r);
    }
    let default = match input_type {
        "submit" => "Submit",
        "reset" => "Reset",
        _ => "",
    };
    if default.is_empty() {
        None
    } else {
        Some(AccnameResult::new(default, AccnameSource::Default))
    }
}

#[allow(clippy::unnecessary_wraps)]
fn handle_input_image(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    in_labelledby: bool,
    computing: &mut HashSet<NodeId>,
) -> Option<AccnameResult> {
    if let Some(r) = resolve_label_text(arena, node_id, resolver, visited, in_labelledby, computing) {
        return Some(r);
    }
    if let Some(alt) = dom::get_attr_value(arena, node_id, "alt")
        && !alt.is_empty()
    {
        return Some(AccnameResult::new(alt, AccnameSource::Alt));
    }
    if let Some(r) = title_attr(arena, node_id) {
        return Some(r);
    }
    Some(AccnameResult::new("Submit Query", AccnameSource::Default))
}

fn handle_labelable_with_title(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    in_labelledby: bool,
    computing: &mut HashSet<NodeId>,
) -> Option<AccnameResult> {
    if let Some(r) = resolve_label_text(arena, node_id, resolver, visited, in_labelledby, computing) {
        return Some(r);
    }
    if let Some(r) = title_attr(arena, node_id) {
        return Some(r);
    }
    placeholder_attr(arena, node_id)
}

fn handle_button(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    in_labelledby: bool,
    computing: &mut HashSet<NodeId>,
) -> Option<AccnameResult> {
    if let Some(r) = resolve_label_text(arena, node_id, resolver, visited, in_labelledby, computing) {
        return Some(r);
    }
    let content = resolve_name_from_content(arena, node_id, resolver, visited, in_labelledby, computing);
    if !content.is_empty() {
        return Some(AccnameResult::new(content, AccnameSource::Content));
    }
    title_attr(arena, node_id)
}

fn handle_fieldset(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    in_labelledby: bool,
    computing: &mut HashSet<NodeId>,
) -> Option<AccnameResult> {
    if let Some(legend_id) = find_child_by_local_name(arena, node_id, "legend") {
        let content = resolve_name_from_content(arena, legend_id, resolver, visited, in_labelledby, computing);
        if !content.is_empty() {
            return Some(AccnameResult::new(content, AccnameSource::Legend));
        }
    }
    title_attr(arena, node_id)
}

fn handle_table(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    in_labelledby: bool,
    computing: &mut HashSet<NodeId>,
) -> Option<AccnameResult> {
    if let Some(caption_id) = find_child_by_local_name(arena, node_id, "caption") {
        let content = resolve_name_from_content(arena, caption_id, resolver, visited, in_labelledby, computing);
        if !content.is_empty() {
            return Some(AccnameResult::new(content, AccnameSource::Caption));
        }
    }
    title_attr(arena, node_id)
}

fn handle_img(arena: &DomArena, node_id: NodeId) -> Option<AccnameResult> {
    if dom::has_attr(arena, node_id, "alt") {
        let alt = dom::get_attr_value(arena, node_id, "alt").unwrap_or("");
        return Some(AccnameResult {
            name: super::helpers::flatten_text(alt),
            source: Some(AccnameSource::Alt),
        });
    }
    title_attr(arena, node_id)
}

fn handle_area(arena: &DomArena, node_id: NodeId) -> Option<AccnameResult> {
    if let Some(alt) = dom::get_attr_value(arena, node_id, "alt")
        && !alt.is_empty()
    {
        return Some(AccnameResult::new(alt, AccnameSource::Alt));
    }
    title_attr(arena, node_id)
}

fn handle_summary(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    in_labelledby: bool,
    computing: &mut HashSet<NodeId>,
) -> Option<AccnameResult> {
    let content = resolve_name_from_content(arena, node_id, resolver, visited, in_labelledby, computing);
    if !content.is_empty() {
        return Some(AccnameResult::new(content, AccnameSource::Content));
    }
    title_attr(arena, node_id)
}

fn handle_anchor(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
    visited: &HashSet<String>,
    in_labelledby: bool,
    computing: &mut HashSet<NodeId>,
) -> Option<AccnameResult> {
    let content = resolve_name_from_content(arena, node_id, resolver, visited, in_labelledby, computing);
    if !content.is_empty() {
        return Some(AccnameResult::new(content, AccnameSource::Content));
    }
    title_attr(arena, node_id)
}

fn handle_svg_element(arena: &DomArena, node_id: NodeId) -> Option<AccnameResult> {
    if let Some(title_id) = find_child_by_local_name(arena, node_id, "title") {
        let text = collect_text_content(arena, title_id);
        if !text.is_empty() {
            return Some(AccnameResult::new(text, AccnameSource::SvgTitle));
        }
    }
    None
}

fn handle_title_only(arena: &DomArena, node_id: NodeId) -> Option<AccnameResult> {
    title_attr(arena, node_id)
}

fn title_attr(arena: &DomArena, node_id: NodeId) -> Option<AccnameResult> {
    let title = dom::get_attr_value(arena, node_id, "title")?;
    if title.trim().is_empty() {
        return None;
    }
    Some(AccnameResult::new(title, AccnameSource::Title))
}

fn placeholder_attr(arena: &DomArena, node_id: NodeId) -> Option<AccnameResult> {
    let placeholder = dom::get_attr_value(arena, node_id, "placeholder")?;
    if placeholder.trim().is_empty() {
        return None;
    }
    Some(AccnameResult::new(placeholder, AccnameSource::Placeholder))
}
