//! `head-element-order` rule: the children of `<head>` follow a configured order.
//!
//! Ports `packages/@markuplint/rules/src/head-element-order/`. Each child of the first
//! `<head>` falls into the group of the first entry whose selector it matches (unmatched
//! children go last), and is ordered within its group by source order or, for an
//! `alphabetical` entry with an `attr`, by that attribute's value. Every child whose position
//! differs from the sorted order is reported. The order is a convention, not a requirement of
//! the HTML standard, so the default severity is `warning`. The first violation carries a fix
//! that rewrites the `<head>` content in sorted order (see [`reordered_head`]).

use std::cmp::Ordering;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::get_attr_value;
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_selector::{matcher, parser};
use markuplint_types::spec::types::MLMLSpec;
use serde_json::Value;

use crate::fix::Fix;
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
    /// Byte range of the element in the source, its end tag included.
    start: usize,
    end: usize,
    /// The element has content but no end tag (the end of the file closed it), so `end` is the end
    /// of its start tag and the range does not cover the whole element.
    open_ended: bool,
}

/// TS `getElementEndOffset`.
fn element_end(el: &ElementData) -> usize {
    el.close_tag
        .as_ref()
        .map_or(el.base.offset + el.base.raw.len(), |close| {
            close.offset + close.raw.len()
        })
}

/// TS `buildFixedContent` and the range it replaces: the content of `<head>` from the end of
/// its start tag to the start of its end tag (or the end of its last child, when it has no
/// end tag), with the children in `sorted` order. The text between the children stays where
/// it was, so each position keeps its indentation.
fn reordered_head(source: &str, head: &ElementData, blocks: &[Block<'_>], sorted: &[&Block<'_>]) -> Option<Fix> {
    // Moving a range that stops short of the element would leave its content behind.
    if blocks.iter().any(|block| block.open_ended) {
        return None;
    }
    let content_start = head.base.offset + head.base.raw.len();
    let content_end = head
        .close_tag
        .as_ref()
        .map_or_else(|| blocks.last().map(|last| last.end), |close| Some(close.offset))?;
    let original = source.get(content_start..content_end)?;
    let relative = |offset: usize| offset.checked_sub(content_start);

    let mut content = String::with_capacity(original.len());
    let mut previous_end = 0;
    for (block, moved) in blocks.iter().zip(sorted) {
        content.push_str(original.get(previous_end..relative(block.start)?)?);
        content.push_str(source.get(moved.start..moved.end)?);
        previous_end = relative(block.end)?;
    }
    content.push_str(original.get(previous_end..)?);

    Some(Fix::replace_range(content_start, content_end, content))
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
                    start: el.base.offset,
                    end: element_end(el),
                    open_ended: el.close_tag.is_none() && !el.base.children.is_empty(),
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
        // Only the first violation carries a fix: it replaces the whole content of `<head>`, so
        // every other one would conflict with it.
        let mut fix = arena
            .source()
            .zip(arena.get(head_id).and_then(DomNode::as_element))
            .and_then(|(source, head)| reordered_head(source, head, &blocks, &sorted));
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
                    fix: fix.take(),
                })
            })
            .collect()
    }
}
