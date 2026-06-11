//! CSS selector engine for markuplint, with markuplint-specific extensions
//! (`:role()`, `:aria()`, `:model()`).
//!
//! Self-contained implementation — no external selector crate dependency.

pub mod aria_resolver;
pub mod ast;
pub mod extended;
pub mod matcher;
pub mod parser;
pub mod regex_selector;
