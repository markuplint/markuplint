//! MLAST serde types for markuplint — the deserialization boundary between
//! any markuplint parser (TypeScript) and the Rust DOM layer.
//!
//! Rust counterpart of the TypeScript types in `@markuplint/ml-ast`. A parser
//! emits an MLAST document as JSON; this crate deserializes that JSON into Rust
//! structs so `markuplint-dom` can build a DOM without re-parsing the source.
//! This is "Path A" of the two DOM-construction paths: it lets the Rust engine
//! reuse the existing TS framework parsers (JSX/Vue/Svelte/etc.) for sources the
//! Rust HTML parser cannot handle, by accepting their MLAST output verbatim.

pub mod mlast;
pub mod violation;

pub type ParseError = serde_json::Error;
