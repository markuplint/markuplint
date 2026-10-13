//! `no-unescaped-char` rule: characters that must be written as character
//! references in text and attribute values.
//!
//! The unescaped-character half of the former `character-reference` rule; malformed
//! references are `no-malformed-character-reference`. HTML LS §13.1.2.3–4 prohibits
//! only a literal `<` and an ambiguous ampersand; recognizing the latter needs the
//! named-reference table, which is the parser's job (reported by the other rule). So
//! by default only `<` is checked, and `strict` restores the pre-split set (`<`, `>`,
//! `"`, any bare `&`), with entity-shaped sequences masked.

use std::sync::LazyLock;

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::node::{DomNode, NodeBase};
use markuplint_types::spec::types::MLMLSpec;
use regex::Regex;

use crate::rule::{Rule, RuleConfig, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

/// TS: `/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi`. Named references are letters only, so a
/// name with digits (`&x25BC;`) is not masked.
static ENTITY_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)&(?:[a-z]+|#[0-9]+|#x[0-9a-f]+);").unwrap());

/// Characters that must always be escaped.
const DEFAULT_CHARS: &[char] = &['<'];

/// Characters `strict: true` requires to be escaped.
const STRICT_CHARS: &[char] = &['"', '&', '<', '>'];

/// Parent elements whose text content is not parsed as HTML.
const IGNORE_PARENTS: &[&str] = &["script", "style"];

pub struct NoUnescapedChar;

impl Rule for NoUnescapedChar {
    fn id(&self) -> &'static str {
        "no-unescaped-char"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for node in arena.descendants(0) {
            let DomNode::Text(text) = node else {
                continue;
            };
            // Bogus text nodes (e.g. orphaned end tags) are not real text content.
            if text.is_bogus {
                continue;
            }
            if let Some(parent_id) = text.base.parent
                && let Some(DomNode::Element(parent_el)) = arena.get(parent_id)
                && IGNORE_PARENTS
                    .iter()
                    .any(|p| parent_el.base.node_name.eq_ignore_ascii_case(p))
            {
                continue;
            }
            let rule_config = config.get(text.base.id);
            if rule_config.disabled {
                continue;
            }

            // The parser decodes character references (`&lt;` → `<`), so `raw` may not
            // be the source text; read the unresolved text from the source instead.
            let raw = get_source_text_for_node(arena, &text.base).unwrap_or(&text.base.raw);
            check_chars(
                raw,
                text.base.line,
                text.base.col,
                self.id(),
                rule_config,
                &mut violations,
            );
        }

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };
                if html_attr.is_dynamic_value == Some(true) || html_attr.is_directive == Some(true) {
                    continue;
                }
                if html_attr.value.raw.is_empty() {
                    continue;
                }
                check_chars(
                    &html_attr.value.raw,
                    html_attr.value.line,
                    html_attr.value.col,
                    self.id(),
                    rule_config,
                    &mut violations,
                );
            }
        }

        violations
    }
}

fn check_chars(
    raw: &str,
    start_line: u32,
    start_col: u32,
    rule_id: &str,
    rule_config: &RuleConfig,
    violations: &mut Vec<Violation>,
) {
    let strict = rule_config
        .options
        .get("strict")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);
    let (chars, text) = if strict {
        (
            STRICT_CHARS,
            ENTITY_RE.replace_all(raw, |caps: &regex::Captures| "*".repeat(caps[0].len())),
        )
    } else {
        (DEFAULT_CHARS, std::borrow::Cow::Borrowed(raw))
    };
    let modal = if rule_config.severity == Severity::Error {
        "must"
    } else {
        "should"
    };
    let message = format!("Illegal characters {modal} escape in character reference");

    let mut line = start_line;
    let mut col = start_col;
    for ch in text.chars() {
        if chars.contains(&ch) {
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity: rule_config.severity,
                message: message.clone(),
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

/// The source text of a text node, from its offset to the next sibling's offset (or
/// the parent's close tag), which still holds the character references the parser
/// resolved.
fn get_source_text_for_node<'a>(arena: &'a DomArena, base: &NodeBase) -> Option<&'a str> {
    let source = arena.source()?;
    let start = base.offset;

    let end = base
        .next_sibling
        .and_then(|id| arena.get(id))
        .and_then(|n| n.base())
        .map(|b| b.offset)
        .or_else(|| {
            base.parent.and_then(|id| arena.get(id)).and_then(|n| {
                if let DomNode::Element(el) = n {
                    // `close_tag` carries line/col but no offset, so locate its raw
                    // text in the source instead.
                    el.close_tag
                        .as_ref()
                        .map(|ct| source[start..].find(&ct.raw).map_or(source.len(), |pos| start + pos))
                } else {
                    None
                }
            })
        })
        .unwrap_or(source.len());

    source.get(start..end)
}
