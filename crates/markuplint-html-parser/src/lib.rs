//! WHATWG-conformant HTML parser for markuplint.
//!
//! This crate implements the HTML parsing algorithm defined in
//! [WHATWG HTML §13.2](https://html.spec.whatwg.org/multipage/parsing.html),
//! producing an arena-based tree that can be converted directly into
//! a `DomArena` via `markuplint-dom`'s `html_builder` module.
//!
//! ## Architecture
//!
//! - **Tokenizer** (`tokenizer`): State machine per §13.2.5
//! - **Tree Construction** (`tree_construction`): Tree builder per §13.2.6
//! - **Internal Tree** (`tree`): Arena-based tree used during construction
//! - **Tables** (`tables`): Element category tables (void, formatting, special)

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

/// Detect whether the input should be parsed as a document for linting.
///
/// More aggressive than `is_document_fragment`: also treats `<head>` and
/// `<body>` as document-level inputs. In fragment mode, the WHATWG parser
/// drops these tags (they are absorbed into the implicit body context),
/// which loses parent context that rules like `permitted-contents` depend on.
#[must_use]
pub fn should_parse_as_document(html: &str) -> bool {
    let trimmed = html.trim_start();
    let lower = trimmed.to_ascii_lowercase();

    lower.starts_with("<!doctype")
        || lower.starts_with("<html")
        || lower.starts_with("<head")
        || lower.starts_with("<body")
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

/// Parse an HTML string as a document fragment with body context.
#[must_use]
pub fn parse_fragment(html: &str) -> Arena {
    parse_fragment_with_context(html, "body")
}

/// Parse an HTML string as a fragment with a specific context element.
///
/// The context element determines the initial insertion mode and
/// tokenizer state per WHATWG §13.2.6.5. Examples:
/// - `"body"` — default, parses as body content
/// - `"table"` — parses as table content (`InTable` mode)
/// - `"select"` — parses as select content (`InSelect` mode)
/// - `"td"` / `"th"` — parses as table cell content
/// - `"head"` — parses as head content
/// - `"script"` — parses with script data tokenizer state
#[must_use]
pub fn parse_fragment_with_context(html: &str, context: &str) -> Arena {
    let mut builder = TreeBuilder::with_context(html, true, Some(context), tree::node::Namespace::Html);
    builder.run();
    builder.arena
}

/// Parse an HTML string as a fragment with a specific context element
/// and namespace (for SVG/MathML fragments).
#[must_use]
pub fn parse_fragment_with_context_ns(html: &str, context: &str, ns: tree::node::Namespace) -> Arena {
    let mut builder = TreeBuilder::with_context(html, true, Some(context), ns);
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
