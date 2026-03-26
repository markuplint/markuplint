//! CSS selector engine for markuplint.
//!
//! Provides CSS selector parsing and matching with markuplint-specific
//! extensions (`:role()`, `:aria()`, `:model()`).
//!
//! The parser and matcher are self-contained (no external selector crate).
//! Only `postcss-selector-parser` equivalent: parse CSS selector strings
//! into an AST, then match against DOM elements.

pub mod ast;
pub mod parser;
