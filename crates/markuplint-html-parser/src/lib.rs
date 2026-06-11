//! HTML parsing algorithm defined in
//! [WHATWG HTML §13.2](https://html.spec.whatwg.org/multipage/parsing.html).
//!
//! - Tokenizer (`tokenizer`): §13.2.5
//! - Tree Construction (`tree_construction`): §13.2.6

pub mod input;
pub mod tables;
pub mod tokenizer;
pub mod tree;
pub mod tree_construction;

use tree::Arena;
use tree_construction::TreeBuilder;

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

#[must_use]
pub fn parse(html: &str) -> Arena {
    let is_fragment = is_document_fragment(html);
    let mut builder = TreeBuilder::new(html, is_fragment);
    builder.run();
    builder.arena
}

#[must_use]
pub fn parse_fragment(html: &str) -> Arena {
    parse_fragment_with_context(html, "body")
}

/// The context element determines the initial insertion mode and
/// tokenizer state per WHATWG §13.2.6.5.
#[must_use]
pub fn parse_fragment_with_context(html: &str, context: &str) -> Arena {
    let mut builder = TreeBuilder::with_context(html, true, Some(context), tree::node::Namespace::Html);
    builder.run();
    builder.arena
}

#[must_use]
pub fn parse_fragment_with_context_ns(html: &str, context: &str, ns: tree::node::Namespace) -> Arena {
    let mut builder = TreeBuilder::with_context(html, true, Some(context), ns);
    builder.run();
    builder.arena
}

#[must_use]
pub fn parse_document(html: &str) -> Arena {
    let mut builder = TreeBuilder::new(html, false);
    builder.run();
    builder.arena
}
