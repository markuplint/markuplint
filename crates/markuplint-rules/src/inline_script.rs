//! The inline JSON body of a `<script>` of a given `type`, as `valid-importmap` and
//! `valid-speculation-rules` read it.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::get_attr_value_from_el;
use markuplint_dom::node::ElementData;

use crate::aria_check::element_local_name;
use crate::js::{self, JsonObject, JsonValue};

/// What the body of a matching `<script>` holds.
pub enum ScriptJson {
    /// Nothing but whitespace.
    Empty,
    /// Not JSON.
    Invalid,
    /// JSON, but not an object.
    NotObject,
    Object(JsonObject),
}

/// The body of `el` when it is a `<script>` whose `type` is `script_type` (ASCII
/// lower-case), `None` when the element is not one or its body cannot be read.
///
/// Mirrors the TS rules: the type is `getAttribute('type')?.toLowerCase()`; a pretender
/// is skipped unless an `as` attribute says what it is; the body is the source between
/// the start tag and the close tag (TS `document.raw.slice(el.endOffset,
/// el.closeTag.startOffset)` — markuplint's AST keeps no text child for a script), so an
/// element without a close tag is skipped; and it is `trim()`med before `JSON.parse`.
pub fn script_json(arena: &DomArena, node_id: NodeId, el: &ElementData, script_type: &str) -> Option<ScriptJson> {
    if element_local_name(el) != "script" {
        return None;
    }
    if get_attr_value_from_el(el, "type")?.to_lowercase() != script_type {
        return None;
    }
    if el.pretended().is_some() && get_attr_value_from_el(el, "as").is_none() {
        return None;
    }
    let body = js::trim(arena.element_inner_source(node_id)?);
    if body.is_empty() {
        return Some(ScriptJson::Empty);
    }
    Some(match js::json_parse(body) {
        None => ScriptJson::Invalid,
        Some(JsonValue::Object(object)) => ScriptJson::Object(object),
        Some(_) => ScriptJson::NotObject,
    })
}
