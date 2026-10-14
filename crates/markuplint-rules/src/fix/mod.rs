//! Auto-fix data a rule attaches to a [`crate::violation::Violation`] — the Rust
//! counterpart of `FixData` / `TextEdit` / `IRuleFixer`
//! (`packages/@markuplint/ml-config/src/types.ts`).
//!
//! A rule builds its edits in **byte offsets**, the unit every offset in the Rust
//! DOM uses. The TS side applies them to a JavaScript string, where `TextEdit.range`
//! is in UTF-16 code units, so `lint()` converts each fix once, on the way out
//! ([`Fix::convert_to_utf16`]). A `Fix` that has left `lint()` is therefore in UTF-16;
//! one inside a rule is in bytes. The two coincide for an ASCII source and part
//! ways at the first multi-byte character.

use markuplint_core::mlast::{MLASTHTMLAttr, MLASTToken};
use serde::Serialize;

#[cfg(test)]
mod tests;

/// TS `TextEdit`: replaces `range` (`[start, end)`) with `text`. An empty `text`
/// deletes; an empty range inserts.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct TextEdit {
    pub range: [usize; 2],
    pub text: String,
}

/// TS `FixData`: the edits that resolve one violation. They apply together or not
/// at all, and must not overlap one another.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct Fix {
    pub edits: Vec<TextEdit>,
}

impl Fix {
    #[must_use]
    pub fn new(edits: Vec<TextEdit>) -> Self {
        Self { edits }
    }

    /// TS `fixer.replaceRange` / `fixer.replaceText`.
    #[must_use]
    pub fn replace_range(start: usize, end: usize, text: impl Into<String>) -> Self {
        Self::new(vec![TextEdit {
            range: [start, end],
            text: text.into(),
        }])
    }

    /// TS `fixer.insertBefore`: a zero-width edit at `start`.
    #[must_use]
    pub fn insert_before(start: usize, text: impl Into<String>) -> Self {
        Self::replace_range(start, start, text)
    }

    /// TS `fixer.remove` / `fixer.removeRange`.
    #[must_use]
    pub fn remove(start: usize, end: usize) -> Self {
        Self::replace_range(start, end, "")
    }

    /// TS `removeAttr` (`packages/@markuplint/rules/src/helpers.ts`): removes the attribute
    /// together with the whitespace before its name, from the first token that has text to
    /// the last. `None` when no token has any (TS returns no edits, which means no fix).
    #[must_use]
    pub fn remove_attr(attr: &MLASTHTMLAttr) -> Option<Self> {
        token_range(&[
            &attr.spaces_before_name,
            &attr.name,
            &attr.spaces_before_equal,
            &attr.equal,
            &attr.spaces_after_equal,
            &attr.start_quote,
            &attr.value,
            &attr.end_quote,
        ])
        .map(|(start, end)| Self::remove(start, end))
    }

    /// TS `removeAttrValue`: removes what follows the attribute name — the equal sign, the
    /// quotes and the value, and the whitespace around them. `None` for an attribute
    /// without a value.
    #[must_use]
    pub fn remove_attr_value(attr: &MLASTHTMLAttr) -> Option<Self> {
        token_range(&[
            &attr.spaces_before_equal,
            &attr.equal,
            &attr.spaces_after_equal,
            &attr.start_quote,
            &attr.value,
            &attr.end_quote,
        ])
        .map(|(start, end)| Self::remove(start, end))
    }

    /// Rewrites every range from byte offsets into `source` to UTF-16 code unit offsets.
    pub fn convert_to_utf16(&mut self, source: &str) {
        self.convert_with(&Utf16Index::new(source));
    }

    /// [`Self::convert_to_utf16`] with an index built once for the source, for a caller
    /// that converts many fixes.
    pub fn convert_with(&mut self, index: &Utf16Index) {
        for edit in &mut self.edits {
            edit.range = [index.get(edit.range[0]), index.get(edit.range[1])];
        }
    }
}

/// TS `tokenRange`: from the start of the first token that has text to the end of the last.
fn token_range(tokens: &[&MLASTToken]) -> Option<(usize, usize)> {
    let first = tokens.iter().find(|token| !token.raw.is_empty())?;
    let last = tokens.iter().rfind(|token| !token.raw.is_empty())?;
    Some((first.offset, last.offset + last.raw.len()))
}

/// Maps a byte offset of a source to the UTF-16 code unit offset of the same position.
pub enum Utf16Index {
    /// Every byte is one code unit, so offsets are unchanged.
    Ascii,
    /// `table[byte]` is the code unit offset, for every byte of the source and its end.
    Table(Vec<usize>),
}

impl Utf16Index {
    #[must_use]
    pub fn new(source: &str) -> Self {
        if source.is_ascii() {
            return Self::Ascii;
        }
        let mut table = Vec::with_capacity(source.len() + 1);
        let mut units = 0;
        for ch in source.chars() {
            // A byte inside a character has no position of its own; it takes the
            // start of the character so a stray offset never lands past it.
            for _ in 0..ch.len_utf8() {
                table.push(units);
            }
            units += ch.len_utf16();
        }
        table.push(units);
        Self::Table(table)
    }

    /// An offset past the end of the source stays at the end.
    #[must_use]
    pub fn get(&self, byte: usize) -> usize {
        match self {
            Self::Ascii => byte,
            Self::Table(table) => table.get(byte).copied().unwrap_or_else(|| table[table.len() - 1]),
        }
    }
}
