//! Type validation for markuplint.
//!
//! Rust implementation of `@markuplint/types` validators. Intended to be exposed
//! through `markuplint-builder` to replace the CSS-validation portion of the TS
//! `@markuplint/types` package (the css-tree-backed value matcher).

pub mod check;
pub mod css;
pub mod primitive;
pub mod rfc;
pub mod simple_patterns;
pub mod spec;
pub mod w3c;
pub mod whatwg;
