//! Token types emitted by the tokenizer.

use crate::input::Span;

/// Carries a span for each sub-part to support MLAST decomposition.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RawAttribute {
    /// Whitespace before the attribute name.
    pub spaces_before: Span,
    /// The attribute name.
    pub name: Span,
    /// The raw attribute name string (lowercased for HTML).
    pub raw_name: String,
    /// Whitespace between the name and the `=` sign.
    pub spaces_before_eq: Span,
    /// The `=` sign (None for boolean attributes).
    pub equal: Option<Span>,
    /// Whitespace between the `=` sign and the value.
    pub spaces_after_eq: Span,
    /// The opening quote character (`"` or `'`), or None for unquoted.
    pub quote_start: Option<Span>,
    /// The attribute value span (None for boolean attributes).
    pub value: Option<Span>,
    /// The raw attribute value string.
    pub raw_value: String,
    /// The closing quote character, or None for unquoted.
    pub quote_end: Option<Span>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Token {
    Doctype {
        name: Option<String>,
        public_id: Option<String>,
        system_id: Option<String>,
        force_quirks: bool,
        span: Span,
    },
    StartTag {
        tag_name: String,
        self_closing: bool,
        attributes: Vec<RawAttribute>,
        span: Span,
    },
    EndTag {
        tag_name: String,
        self_closing: bool,
        attributes: Vec<RawAttribute>,
        span: Span,
    },
    Character {
        ch: char,
        offset: usize,
        line: u32,
        col: u32,
        /// Source position of this character in the original HTML.
        /// For character references (e.g., `&#9660;`), this points to `&`.
        /// For normal characters, this equals `(offset, line, col)`.
        source_offset: usize,
        source_line: u32,
        source_col: u32,
    },
    Comment {
        data: String,
        span: Span,
    },
    Eof,
}
