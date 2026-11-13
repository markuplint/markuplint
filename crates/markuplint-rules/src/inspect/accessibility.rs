//! The hover of the language server: TS `Document#searchNodeByLocation` and
//! `Document#getAccessibilityProp` (`ml-core/src/ml-dom/node/document.ts`).

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
use markuplint_dom::tree::element_local_name;
use markuplint_types::spec::aria::{self, ARIAVersion};
use markuplint_types::spec::types::MLMLSpec;
use serde::Serialize;

use super::debug_map::{end_col, end_line};
use super::{document_order, parsed};
use crate::aria::accname::get_accname;
use crate::aria::computed_props::get_computed_aria_props;
use crate::aria::computed_role::get_computed_role;
use crate::aria::is_exposed::is_exposed;
use crate::aria::may_be_focusable::may_be_focusable;
use crate::lint::{LintConfig, pretended_document};
use crate::slot_assignment::get_assigned_nodes;
use crate::tree_scope::{ShadowRootAttachment, TreeRoot, declarative_shadow_root_attachment, root_of};

/// The accessibility properties of the element at a position: TS `{ node: localName, aria }` of the
/// hover of the language server (`getAccessibilityByLocation`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectedAccessibility {
    /// TS `MLElement#localName`.
    pub node_name: String,
    pub aria: InspectedAria,
}

/// TS `AccessibilityProperties`: what is not known of the element has no field, as in TS.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
#[allow(clippy::struct_excessive_bools)]
pub struct InspectedAria {
    /// The element is a `slot`: what it shows depends on what is put in it.
    pub unknown: bool,
    /// Whether the element is in the accessibility tree; none for an unknown one.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exposed_to_tree: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    /// The computed role.
    pub role: Option<String>,
    /// The role requires an accessible name.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name_required: Option<bool>,
    /// The role prohibits an accessible name.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name_prohibited: Option<bool>,
    /// The accessible name.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<InspectedName>,
    /// Whether the element may be focused (`may_be_focusable`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub focusable: Option<bool>,
    /// In the order of the role's properties; JSON has no ordered record, and the order is what the
    /// hover shows.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub props: Option<Vec<InspectedProp>>,
}

/// TS `name?: string | { unknown: true }`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(untagged)]
pub enum InspectedName {
    /// The name, which may be empty.
    Text(String),
    /// A `slot` below the element may put its name there.
    Unknown { unknown: bool },
}

/// TS `AccessibilityProperty` with the name it is keyed by (without the `aria-` prefix).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct InspectedProp {
    /// The name of the property without `aria-`.
    pub name: String,
    /// The value it has: of the attribute, or of the spec's default.
    pub value: Option<String>,
    /// Whether the role requires it.
    pub required: bool,
}

/// TS `Document#searchNodeByLocation` and `Document#getAccessibilityProp`: the element at `line` and
/// `col` of the document that the rules run on, with what the accessibility tree has of it.
///
/// `None` where TS returns `null`: no node at the position (see [`search_node_at_location`]), the
/// node is not an element, or the document did not parse.
#[must_use]
pub fn accessibility_at(
    arena: &DomArena,
    spec: &MLMLSpec,
    config: &LintConfig,
    line: u32,
    col: u32,
    version: ARIAVersion,
) -> Option<InspectedAccessibility> {
    if !parsed(arena) {
        return None;
    }
    let arena = &*pretended_document(arena, spec, config);

    let id = search_node_at_location(arena, line, col)?;
    let DomNode::Element(element) = arena.get(id)? else {
        return None;
    };

    Some(InspectedAccessibility {
        node_name: element_local_name(element),
        aria: accessibility_of(arena, spec, id, version),
    })
}

/// TS `searchNodeAtLocation` of `@markuplint/ml-core` (`Document#searchNodeByLocation`): the node of
/// the document at the source location `line`:`col` (both 1-based).
///
/// The node is the one whose range holds the position, or whose end tag does. A range runs from its
/// start, included, to its end, excluded (the end is where the next token starts), the line and the
/// column compared together. A document's node list has no attribute nodes and no end tags, so a
/// position at an attribute, inside its value or in an end tag is the element that has it. Of several
/// such nodes the last in document order is taken: the innermost. A block holds the elements nested
/// in it, and an omitted element (`<tbody>` with an empty source) starts where its first child does.
///
/// The list is in document order, so the search stops at the first node that starts after the
/// position.
fn search_node_at_location(arena: &DomArena, line: u32, col: u32) -> Option<NodeId> {
    let mut found = None;
    for id in document_order(arena) {
        let Some(node) = arena.get(id) else {
            continue;
        };
        let Some(base) = node.base() else {
            continue;
        };
        if is_before(line, col, base.line, base.col) {
            break;
        }
        let in_start = holds_location(line, col, base.line, base.col, &base.raw);
        let in_close_tag = matches!(
            node,
            DomNode::Element(element) if element
                .close_tag
                .as_ref()
                .is_some_and(|close| holds_location(line, col, close.line, close.col, &close.raw))
        );
        if in_start || in_close_tag {
            found = Some(id);
        }
    }
    found
}

/// Whether `line`:`col` comes before the start `start_line`:`start_col` of a token.
fn is_before(line: u32, col: u32, start_line: u32, start_col: u32) -> bool {
    line < start_line || (line == start_line && col < start_col)
}

/// Whether `line`:`col` is the start of a token or in its range, which ends before the end that its
/// `raw` has when it starts at `start_line`:`start_col`.
fn holds_location(line: u32, col: u32, start_line: u32, start_col: u32, raw: &str) -> bool {
    if is_before(line, col, start_line, start_col) {
        return false;
    }
    if line == start_line && col == start_col {
        return true;
    }
    let last_line = end_line(raw, start_line);
    line < last_line || (line == last_line && col < end_col(raw, start_col))
}

/// TS `Document#getAccessibilityProp` of an element.
fn accessibility_of(arena: &DomArena, spec: &MLMLSpec, id: NodeId, version: ARIAVersion) -> InspectedAria {
    let is_slot = arena
        .get(id)
        .and_then(DomNode::as_element)
        .is_some_and(|el| element_local_name(el) == "slot");
    if is_slot {
        return InspectedAria {
            unknown: true,
            ..InspectedAria::default()
        };
    }

    if !is_exposed(spec, arena, id, version) {
        return InspectedAria {
            exposed_to_tree: Some(false),
            ..InspectedAria::default()
        };
    }

    let role = get_computed_role(spec, arena, id, version, false).role;
    let role_spec = role
        .as_ref()
        .and_then(|role| aria::get_role_spec(spec, &role.name, version));
    // JS `trim()`, which is not the `trim()` of Rust: U+FEFF is white space, U+0085 is not.
    let name = get_accname(spec, arena, id, version)
        .name
        .trim_matches(crate::aria_check::is_js_whitespace)
        .to_owned();

    let name = if name.is_empty() && has_unassigned_slot(arena, spec, id) {
        InspectedName::Unknown { unknown: true }
    } else {
        InspectedName::Text(name)
    };

    let props = get_computed_aria_props(spec, arena, id, version)
        .into_iter()
        // A property that nothing sets and the role does not require says nothing.
        .filter(|prop| prop.required || prop.from != crate::aria::computed_props::AriaPropSource::Default)
        .map(|prop| InspectedProp {
            name: prop.name.replacen("aria-", "", 1),
            value: prop.value,
            required: prop.required,
        })
        .collect::<Vec<_>>();

    InspectedAria {
        unknown: false,
        exposed_to_tree: Some(true),
        role: role.map(|role| role.name),
        name_required: Some(role_spec.is_some_and(|role| role.accessible_name_required.unwrap_or(false))),
        name_prohibited: Some(role_spec.is_some_and(|role| role.accessible_name_prohibited.unwrap_or(false))),
        name: Some(name),
        focusable: Some(may_be_focusable(spec, arena, id)),
        props: (!props.is_empty()).then_some(props),
    }
}

/// Whether a `slot` below the element places nothing that is known, so the name the element would
/// have from it is not known. The slot of a shadow root is in a tree of its own, so every tree is
/// searched, except the content of an ordinary `template` element, which is not rendered where it is
/// written (TS: `deepQuerySelectorAll('slot')`, `getAssignedNodes() === null`, and `getRootNode()`
/// a shadow root or not a fragment).
fn has_unassigned_slot(arena: &DomArena, spec: &MLMLSpec, id: NodeId) -> bool {
    let mut stack: Vec<NodeId> = arena
        .get(id)
        .map_or_default(|node| node.children().iter().rev().copied().collect());
    while let Some(current) = stack.pop() {
        let Some(node) = arena.get(current) else {
            continue;
        };
        if let DomNode::Element(el) = node
            && element_local_name(el) == "slot"
            && get_assigned_nodes(arena, spec, current).is_none()
            && !is_in_ordinary_template_content(arena, spec, current)
        {
            return true;
        }
        stack.extend(node.children().iter().rev().copied());
    }
    false
}

/// The root of the node is a `DocumentFragment` that is no shadow root: the content of an HTML `template`
/// element that has no declarative shadow root.
fn is_in_ordinary_template_content(arena: &DomArena, spec: &MLMLSpec, id: NodeId) -> bool {
    match root_of(arena, spec, id) {
        TreeRoot::Content(template) => {
            declarative_shadow_root_attachment(arena, spec, template) != ShadowRootAttachment::Attached
        }
        TreeRoot::Document | TreeRoot::NoTree(_) => false,
    }
}
