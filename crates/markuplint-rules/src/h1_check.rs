//! The `<h1>` collection shared by the two rules `required-h1` was split into:
//! `require-h1` and `no-duplicate-h1`.
//!
//! Both TS rules run the same preamble before their one check: an empty document
//! (`document.nodeList.length === 0`) is never reported, a fragment is skipped unless the
//! `in-document-fragment` option is set, and every element whose lower-cased `nodeName` is
//! `h1` is collected in document order, whatever its namespace.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::{DomNode, ElementData};

use crate::rule::RuleConfig;

/// The `<h1>` elements in document order, or `None` when the rule does not
/// apply to this document (it is empty, or it is a fragment and `in-document-fragment` is off).
pub(crate) fn collect_h1s<'a>(arena: &'a DomArena, config: &RuleConfig) -> Option<Vec<&'a ElementData>> {
    let Some(DomNode::Document(doc)) = arena.document() else {
        return None;
    };
    if doc.children.is_empty() {
        return None;
    }
    let in_document_fragment = config
        .options
        .get("in-document-fragment")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);
    if doc.is_fragment && !in_document_fragment {
        return None;
    }
    let h1s: Vec<_> = arena
        .descendants(0)
        .filter_map(DomNode::as_element)
        .filter(|el| el.base.node_name.eq_ignore_ascii_case("h1"))
        .collect();
    Some(h1s)
}
