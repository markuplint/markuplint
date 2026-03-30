//! CSS selector engine for markuplint.
//!
//! Provides CSS selector parsing and matching with markuplint-specific
//! extensions (`:role()`, `:aria()`, `:model()`).
//!
//! Self-contained implementation — no external selector crate dependency.
//! Same approach as the css-tree replacement in Phase 1B.

pub mod aria_resolver;
pub mod ast;
pub mod extended;
pub mod matcher;
pub mod parser;
pub mod regex_selector;
