//! TS `Document#debugMap()` (`nodeListToDebugMaps(nodeList, true)` of
//! `packages/@markuplint/ml-core/src/ml-dom/helper/debug.ts`): one line per node of the
//! `nodeList`, and for an element the lines that tell what it is and the tokens of each of its
//! attributes. Language servers print it to trace how the source was mapped onto nodes.
//!
//! TS wraps the tokens of the AST and takes the end of each from its `raw`; the arena has no end
//! position, so it is computed from `raw` the same way (`getEndLine` / `getEndCol` of
//! `@markuplint/parser-utils`). Everything TS measures is in UTF-16 code units; the offsets of an
//! arena built from the source are bytes, so they are converted.

use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTHTMLAttr, MLASTToken, NamespaceURI};
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers;
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_types::spec::types::MLMLSpec;

use super::{document_order, parsed};
use crate::fix::Utf16Index;
use crate::lint::{LintConfig, pretended_document};

/// The `debugMap()` of the document the rules run on, or `None` when the document did not parse.
#[must_use]
pub fn debug_map(arena: &DomArena, spec: &MLMLSpec, config: &LintConfig) -> Option<Vec<String>> {
    if !parsed(arena) {
        return None;
    }
    let arena = &*pretended_document(arena, spec, config);
    let offsets = arena.source().map_or(Utf16Index::Ascii, Utf16Index::new);
    let mut lines = Vec::new();
    for id in document_order(arena) {
        let Some(node) = arena.get(id) else {
            continue;
        };
        match node {
            DomNode::Element(el) => element_lines(arena, &offsets, el, &mut lines),
            other => {
                let Some(base) = other.base() else {
                    continue;
                };
                lines.push(token_line(
                    &offsets,
                    &Token {
                        label: &non_element_name(other),
                        raw: &base.raw,
                        offset: base.offset,
                        line: base.line,
                        col: base.col,
                    },
                ));
            }
        }
    }
    Some(lines)
}

/// What TS `tokenDebug` reads of a node or a token.
struct Token<'a> {
    label: &'a str,
    raw: &'a str,
    offset: usize,
    line: u32,
    col: u32,
}

fn non_element_name(node: &DomNode) -> String {
    match node {
        DomNode::Comment(_) => "#comment".to_owned(),
        DomNode::Doctype(doctype) => doctype.name.clone(),
        DomNode::PSBlock(_) => "#ml-block".to_owned(),
        // The invalid markup that is not a start tag is a text node to TS.
        _ => "#text".to_owned(),
    }
}

fn element_lines(arena: &DomArena, offsets: &Utf16Index, el: &ElementData, lines: &mut Vec<String>) {
    let name = element_node_name(el);
    if el.is_ghost {
        lines.push(format!("[N/A]>[N/A](N/A){name}: {}", visible_white_space(&el.base.raw)));
        return;
    }
    lines.push(token_line(
        offsets,
        &Token {
            label: &name,
            raw: &el.base.raw,
            offset: el.base.offset,
            line: el.base.line,
            col: el.base.col,
        },
    ));
    // The element's own identity, which a pretender does not change (TS reads it off the origin).
    let own = el.identity(true);
    lines.push("  namespaceURI: true".to_owned());
    lines.push(format!("  elementType: {}", element_type_name(own.element_type)));
    lines.push(format!("  isInFragmentDocument: {}", arena.is_fragment()));
    lines.push(format!("  isForeignElement: {}", *own.namespace != NamespaceURI::XHTML));
    for attr in &el.attributes {
        for line in attribute_lines(offsets, attr) {
            lines.push(format!("  {line}"));
        }
    }
}

/// TS `MLElement#nodeName`: the name an HTML element is written in capitals, the name of any other
/// as it was written.
fn element_node_name(el: &ElementData) -> String {
    if el.namespace == NamespaceURI::XHTML && el.element_type == ElementType::Html {
        return el.base.node_name.to_ascii_uppercase();
    }
    // The HTML parser folds the case of a name it reads; the tag still has the case it was written in.
    if el.pretended().is_none()
        && let Some(raw) = helpers::get_raw_tag_name(el)
        && raw.eq_ignore_ascii_case(&el.base.node_name)
    {
        return raw.to_owned();
    }
    el.base.node_name.clone()
}

fn element_type_name(element_type: &ElementType) -> &'static str {
    match element_type {
        ElementType::Html => "html",
        ElementType::WebComponent => "web-component",
        ElementType::Authored => "authored",
    }
}

fn attribute_lines(offsets: &Utf16Index, attr: &MLASTAttr) -> Vec<String> {
    match attr {
        MLASTAttr::Spread(spread) => vec![token_line(
            offsets,
            &Token {
                label: "#spread",
                raw: &spread.raw,
                offset: spread.offset,
                line: spread.line,
                col: spread.col,
            },
        )],
        MLASTAttr::HTMLAttr(attr) => html_attribute_lines(offsets, attr),
    }
}

fn html_attribute_lines(offsets: &Utf16Index, attr: &MLASTHTMLAttr) -> Vec<String> {
    let mut lines = vec![token_line(
        offsets,
        &Token {
            label: helpers::attr_name(attr),
            raw: &attr.raw,
            offset: attr.offset,
            line: attr.line,
            col: attr.col,
        },
    )];
    let tokens: [(&str, &MLASTToken); 8] = [
        ("bN", &attr.spaces_before_name),
        ("name", &attr.name),
        ("bE", &attr.spaces_before_equal),
        ("equal", &attr.equal),
        ("aE", &attr.spaces_after_equal),
        ("sQ", &attr.start_quote),
        ("value", &attr.value),
        ("eQ", &attr.end_quote),
    ];
    for (label, token) in tokens {
        lines.push(format!(
            "  {}",
            token_line(
                offsets,
                &Token {
                    label,
                    raw: &token.raw,
                    offset: token.offset,
                    line: token.line,
                    col: token.col,
                },
            )
        ));
    }
    lines.push(format!("  isDirective: {}", attr.is_directive == Some(true)));
    lines.push(format!(
        "  isExpressionValue: {}",
        attr.is_expression_value == Some(true)
    ));
    lines.push(format!("  isDynamicValue: {}", attr.is_dynamic_value == Some(true)));
    lines.push(format!("  isAbsent: {}", attr.is_absent == Some(true)));
    if let Some(candidate) = attr.candidate.as_deref().filter(|candidate| !candidate.is_empty()) {
        lines.push(format!("  candidate: {}", visible_white_space(candidate)));
    }
    lines
}

/// TS `tokenDebug`.
fn token_line(offsets: &Utf16Index, token: &Token<'_>) -> String {
    let start = offsets.get(token.offset);
    let end = start + utf16_len(token.raw);
    format!(
        "[{}:{}]>[{}:{}]({start},{end}){}: {}",
        token.line,
        token.col,
        end_line(token.raw, token.line),
        end_col(token.raw, token.col),
        token.label,
        visible_white_space(token.raw),
    )
}

fn utf16_len(text: &str) -> usize {
    text.encode_utf16().count()
}

fn to_u32(value: usize) -> u32 {
    u32::try_from(value).unwrap_or(u32::MAX)
}

/// `getEndLine` of `@markuplint/parser-utils`.
pub(super) fn end_line(raw: &str, start_line: u32) -> u32 {
    start_line.saturating_add(to_u32(raw.matches('\n').count()))
}

/// `getEndCol` of `@markuplint/parser-utils`.
pub(super) fn end_col(raw: &str, start_col: u32) -> u32 {
    match raw.rfind('\n') {
        Some(last_break) => to_u32(utf16_len(&raw[last_break + 1..])).saturating_add(1),
        None => start_col.saturating_add(to_u32(utf16_len(raw))),
    }
}

/// TS `visibleWhiteSpace`: `\n` is `⏎`, `\t` is `→`, any other whitespace of a JavaScript regular
/// expression's `\s` is `␣`.
fn visible_white_space(chars: &str) -> String {
    chars
        .chars()
        .map(|c| match c {
            '\n' => '⏎',
            '\t' => '→',
            c if is_js_white_space(c) => '␣',
            c => c,
        })
        .collect()
}

/// A character of the JavaScript `\s` class, which is not the one of `char::is_whitespace`
/// (U+0085 is not in it, and U+FEFF is).
fn is_js_white_space(c: char) -> bool {
    matches!(
        c,
        '\t' | '\n' | '\u{000B}' | '\u{000C}' | '\r' | ' ' | '\u{00A0}' | '\u{1680}' | '\u{2000}'
            ..='\u{200A}' | '\u{2028}' | '\u{2029}' | '\u{202F}' | '\u{205F}' | '\u{3000}' | '\u{FEFF}'
    )
}
