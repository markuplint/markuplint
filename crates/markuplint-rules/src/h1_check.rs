//! The `<h1>` collection shared by the two rules `required-h1` was split into:
//! `require-h1` and `no-duplicate-h1`.
//!
//! Both TS rules run the same preamble before their one check: an empty document
//! (`document.nodeList.length === 0`) is never reported, a fragment is skipped unless the
//! `in-document-fragment` option is set, and every element whose lower-cased `nodeName` is
//! `h1` is collected in document order, whatever its namespace, with the tree it is in
//! ([`Trees::root_of`]): the content of a `template` element and a declarative shadow root are
//! trees of their own, where it is not known from the markup where they are inserted.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::{DomNode, ElementData};

use crate::rule::RuleConfig;
use crate::tree_scope::{TreeRoot, Trees};

/// The `<h1>` elements in document order, or `None` when the rule does not
/// apply to this document (it is empty, or it is a fragment and `in-document-fragment` is off).
pub(crate) fn collect_h1s<'a>(
    arena: &'a DomArena,
    trees: &Trees<'_>,
    config: &RuleConfig,
) -> Option<Vec<(TreeRoot, &'a ElementData)>> {
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
        .map(|el| (trees.root_of(el.base.id), el))
        .collect();
    Some(h1s)
}
