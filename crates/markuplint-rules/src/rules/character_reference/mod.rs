//! `character-reference` rule: special characters should be escaped as character references.

use std::sync::LazyLock;

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;
use regex::Regex;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

// Must match TS: /&(?:[a-z]+|#\d+|#x[\da-f]+);/gi
// Note: named entities are alpha-only (no digits) — e.g. &amp; &lt; &gt;
// This correctly rejects &x25BC; (contains digits in name part)
static ENTITY_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)&(?:[a-z]+|#[0-9]+|#x[0-9a-f]+);").unwrap());

/// The `character-reference` rule.
pub struct CharacterReference;

/// Characters that must be escaped in HTML text and attribute values.
const DEFAULT_CHARS: &[char] = &['"', '&', '<', '>'];

/// Parent elements whose text content is exempt (raw text elements).
const IGNORE_PARENTS: &[&str] = &["script", "style"];

/// Check a raw string for illegal characters and push violations.
fn check_chars(
    raw: &str,
    start_line: u32,
    start_col: u32,
    rule_id: &str,
    severity: Severity,
    violations: &mut Vec<Violation>,
) {
    let escaped = ENTITY_RE.replace_all(raw, |caps: &regex::Captures| "*".repeat(caps[0].len()));

    let mut line = start_line;
    let mut col = start_col;

    for ch in escaped.chars() {
        if DEFAULT_CHARS.contains(&ch) {
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity,
                message: "Illegal characters must escape in character reference".to_string(),
                line,
                col,
                raw: ch.to_string(),
            reason: None,
            });
        }
        if ch == '\n' {
            line += 1;
            col = 1;
        } else {
            col += 1;
        }
    }
}

/// Get the source text for a node by slicing the original HTML source.
///
/// The WHATWG parser resolves character references (e.g., `&#9660;` → `▼`),
/// so `text.base.raw` contains the resolved text, not the original source.
/// This function slices the original source from the node's offset to the
/// next sibling's offset (or the parent's close tag offset) to get the
/// unresolved source text.
/// Get the original source text for a text node.
///
/// The WHATWG parser resolves character references (e.g., `&#9660;` → `▼`),
/// so `text.base.raw` may not match the original source. This function
/// slices the source from the text node's offset to the next sibling's
/// offset, giving the original unresolved source text.
fn get_source_text_for_node<'a>(arena: &'a DomArena, base: &markuplint_dom::node::NodeBase) -> Option<&'a str> {
    let source = arena.source()?;
    let start = base.offset;

    // End = next sibling's source offset, or parent element's close tag position
    let end = base
        .next_sibling
        .and_then(|id| arena.get(id))
        .and_then(|n| n.base())
        .map(|b| b.offset)
        .or_else(|| {
            // No next sibling: use parent's close tag position
            base.parent.and_then(|id| arena.get(id)).and_then(|n| {
                if let markuplint_dom::node::DomNode::Element(el) = n {
                    // Find close tag offset from source by searching from our end
                    // The close tag raw is like "</div>", search for "</" after our text
                    el.close_tag.as_ref().map(|ct| {
                        // close_tag has line/col but no offset; find it in source
                        // by searching for the raw text after our start
                        source[start..].find(&ct.raw).map_or(source.len(), |pos| start + pos)
                    })
                } else {
                    None
                }
            })
        })
        .unwrap_or(source.len());

    source.get(start..end)
}

impl Rule for CharacterReference {
    fn id(&self) -> &'static str {
        "character-reference"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let config = config.global();
        let mut violations = Vec::new();

        // Check text nodes
        for node in arena.descendants(0) {
            let DomNode::Text(text) = node else {
                continue;
            };

            // Skip bogus text nodes (e.g., orphaned end tags)
            if text.is_bogus {
                continue;
            }

            // Skip text inside script/style
            if let Some(parent_id) = text.base.parent
                && let Some(DomNode::Element(parent_el)) = arena.get(parent_id)
                && IGNORE_PARENTS
                    .iter()
                    .any(|p| parent_el.base.node_name.eq_ignore_ascii_case(p))
            {
                continue;
            }

            // Use source text instead of text.base.raw to preserve character
            // references that the WHATWG parser resolves (e.g., &#9660; → ▼).
            // The source range is from this text node's offset to the next
            // sibling's offset (or parent's close tag offset).
            let source_text = get_source_text_for_node(arena, &text.base);
            let raw = source_text.unwrap_or(&text.base.raw);

            check_chars(
                raw,
                text.base.line,
                text.base.col,
                self.id(),
                config.severity,
                &mut violations,
            );
        }

        // Check attribute values (matches TS: document.walkOn('Element'))
        for (_node_id, el) in arena.elements() {
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };
                // Skip dynamic values and directives
                if html_attr.is_dynamic_value == Some(true) || html_attr.is_directive == Some(true) {
                    continue;
                }
                // Skip attributes without a value
                if html_attr.value.raw.is_empty() {
                    continue;
                }
                check_chars(
                    &html_attr.value.raw,
                    html_attr.value.line,
                    html_attr.value.col,
                    self.id(),
                    config.severity,
                    &mut violations,
                );
            }
        }

        violations
    }
}
