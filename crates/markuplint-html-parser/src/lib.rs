//! WHATWG-conformant HTML parser for markuplint.
//!
//! This crate implements the HTML parsing algorithm defined in
//! [WHATWG HTML §13.2](https://html.spec.whatwg.org/multipage/parsing.html),
//! producing an `MLASTDocument` that can be consumed by markuplint's
//! linting engine.
//!
//! ## Architecture
//!
//! - **Tokenizer** (`tokenizer`): State machine per §13.2.5
//! - **Tree Construction** (`tree_construction`): Tree builder per §13.2.6
//! - **Internal Tree** (`tree`): Arena-based tree used during construction
//! - **Emitter** (`emitter`): Converts internal tree → `MLASTDocument`

pub mod emitter;
pub mod input;
pub mod tables;
pub mod tokenizer;
pub mod tree;
pub mod tree_construction;

use tree::Arena;
use tree_construction::TreeBuilder;

/// Detect whether the input is a document fragment (no `<!doctype>` or `<html>`).
///
/// Mirrors the TypeScript `isDocumentFragment()` logic from
/// `@markuplint/html-parser/src/is-document-fragment.ts`.
#[must_use]
pub fn is_document_fragment(html: &str) -> bool {
    let trimmed = html.trim_start();
    let lower = trimmed.to_ascii_lowercase();

    // Not a fragment if it starts with <!doctype or <html
    if lower.starts_with("<!doctype") || lower.starts_with("<html") {
        return false;
    }

    true
}

/// Parse an HTML string into an internal tree.
///
/// Automatically detects whether the input is a full document or a fragment.
#[must_use]
pub fn parse(html: &str) -> Arena {
    let is_fragment = is_document_fragment(html);
    let mut builder = TreeBuilder::new(html, is_fragment);
    builder.run();
    builder.arena
}

/// Parse an HTML string as a document fragment.
#[must_use]
pub fn parse_fragment(html: &str) -> Arena {
    let mut builder = TreeBuilder::new(html, true);
    builder.run();
    builder.arena
}

/// Parse an HTML string as a full document.
#[must_use]
pub fn parse_document(html: &str) -> Arena {
    let mut builder = TreeBuilder::new(html, false);
    builder.run();
    builder.arena
}
