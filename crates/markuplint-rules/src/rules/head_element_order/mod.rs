//! `head-element-order` rule: the children of `<head>` follow a configured order.
//!
//! Ports `packages/@markuplint/rules/src/head-element-order/`. Each child of the first
//! `<head>` falls into the group of the first entry whose selector it matches (unmatched
//! children go last), and is ordered within its group by source order or, for an
//! `alphabetical` entry with an `attr`, by that attribute's value. Every child whose position
//! differs from the sorted order is reported. The order is a convention, not a requirement of
//! the HTML standard, so the default severity is `warning`. TS also offers a fix that rewrites
//! the `<head>` content; auto-fix is not implemented in Rust.

use std::cmp::Ordering;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::get_attr_value;
use markuplint_dom::node::DomNode;
use markuplint_selector::{matcher, parser};
use markuplint_types::spec::types::MLMLSpec;
use serde_json::Value;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct HeadElementOrder;

/// TS `DEFAULT_VALUE`.
const DEFAULT_SELECTORS: [&str; 8] = [
    "meta[charset]",
    "meta[http-equiv]",
    "meta[name=\"viewport\"]",
    "title",
    "meta",
    "link",
    "style",
    "script",
];

/// The index of the `{ selector: 'meta', order: 'alphabetical', attr: 'name' }` entry of
/// [`DEFAULT_SELECTORS`].
const DEFAULT_ALPHABETICAL_INDEX: usize = 4;

/// TS `NormalizedEntry`. `alphabetical_attr` is the `attr` of an `alphabetical` entry; an
/// `alphabetical` entry without `attr` sorts by source order, as `source-order` does.
struct Entry {
    selector: String,
    alphabetical_attr: Option<String>,
}

fn default_entries() -> Vec<Entry> {
    DEFAULT_SELECTORS
        .iter()
        .enumerate()
        .map(|(i, selector)| Entry {
            selector: (*selector).to_owned(),
            alphabetical_attr: (i == DEFAULT_ALPHABETICAL_INDEX).then(|| "name".to_owned()),
        })
        .collect()
}

/// TS `normalizeEntries()`. A value that is not an array (`true`) means the default order.
fn entries_from(value: &Value) -> Vec<Entry> {
    let Value::Array(items) = value else {
        return default_entries();
    };
    items
        .iter()
        .filter_map(|item| match item {
            Value::String(selector) => Some(Entry {
                selector: selector.clone(),
                alphabetical_attr: None,
            }),
            Value::Object(obj) => {
                let selector = obj.get("selector")?.as_str()?.to_owned();
                let alphabetical = obj.get("order").and_then(Value::as_str) == Some("alphabetical");
                let attr = obj.get("attr").and_then(Value::as_str).map(str::to_owned);
                Some(Entry {
                    selector,
                    alphabetical_attr: if alphabetical { attr } else { None },
                })
            }
            _ => None,
        })
        .collect()
}

/// TS `ElementInfo`: the sort key of one child of `<head>`.
struct Block<'a> {
    node_id: NodeId,
    group: usize,
    /// The attribute value of an `alphabetical` group (TS `subKey` as a string).
    sub_key: Option<&'a str>,
    source_index: usize,
    local_name: &'a str,
}

impl Rule for HeadElementOrder {
    fn id(&self) -> &'static str {
        "head-element-order"
    }

    fn default_severity(&self) -> Severity {
        Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        // TS `document.querySelector('head')`: the first `<head>` in document order.
        let Some((head_id, _)) = arena
            .elements()
            .find(|(_, el)| el.base.node_name.eq_ignore_ascii_case("head"))
        else {
            return vec![];
        };
        let head_config = config.get(head_id);
        if head_config.disabled {
            return vec![];
        }

        let children: Vec<NodeId> = arena
            .children_of(head_id)
            .unwrap_or_default()
            .iter()
            .copied()
            .filter(|&id| arena.get(id).and_then(DomNode::as_element).is_some())
            .collect();
        if children.len() <= 1 {
            return vec![];
        }

        let entries = entries_from(&head_config.value);
        let selectors: Vec<_> = entries.iter().map(|e| parser::parse(&e.selector).ok()).collect();

        let blocks: Vec<Block<'_>> = children
            .iter()
            .enumerate()
            .filter_map(|(source_index, &node_id)| {
                let el = arena.get(node_id)?.as_element()?;
                let group = selectors
                    .iter()
                    .position(|sel| {
                        sel.as_ref()
                            .is_some_and(|sel| matcher::matches(sel, arena, node_id, None, Some(spec), None))
                    })
                    .unwrap_or(entries.len());
                let sub_key = entries
                    .get(group)
                    .and_then(|e| e.alphabetical_attr.as_deref())
                    .map(|attr| get_attr_value(arena, node_id, attr).unwrap_or(""));
                Some(Block {
                    node_id,
                    group,
                    sub_key,
                    source_index,
                    local_name: &el.base.node_name,
                })
            })
            .collect();

        let mut sorted: Vec<&Block<'_>> = blocks.iter().collect();
        sorted.sort_by(|a, b| {
            a.group.cmp(&b.group).then_with(|| match (a.sub_key, b.sub_key) {
                // TS compares the strings with `<`/`>`, i.e. by UTF-16 code units.
                (Some(x), Some(y)) => x.encode_utf16().cmp(y.encode_utf16()),
                _ => Ordering::Equal,
            })
        });
        // `sort_by` is stable and the blocks are in source order, which is TS's final
        // `a.sourceIndex - b.sourceIndex` tie-break.

        let ms = if head_config.severity == Severity::Error {
            "must"
        } else {
            "should"
        };
        blocks
            .iter()
            .zip(&sorted)
            .filter(|(current, expected)| current.source_index != expected.source_index)
            .filter_map(|(current, expected)| {
                let el = arena.get(current.node_id)?.as_element()?;
                Some(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: head_config.severity,
                    message: format!(
                        "The \"{}\" element {ms} be before the \"{}\" element",
                        expected.local_name, current.local_name
                    ),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                    reason: head_config.reason.clone(),
                })
            })
            .collect()
    }
}
