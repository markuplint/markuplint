//! Type validation for markuplint.
//!
//! Rust implementation of `@markuplint/types` validators, exposed through `markuplint-builder`.
//!
//! No validator compiles a regular expression of its own: a pattern that a specification defines
//! is a hand-written matcher, and its tests compare it with the regular expression it replaced
//! over every short string of the characters that tell them apart (the `test-support` feature
//! gives the crates that do the same the helper). A regular expression is compiled only for a
//! pattern that a user writes, with JavaScript semantics ([`check::js_regex`]). The value of a
//! `pattern` attribute needs a JavaScript engine, which the host registers
//! ([`check::pattern_syntax`]).

pub mod check;
pub mod css;
pub mod js_string;
pub mod primitive;
pub mod rfc;
pub mod simple_patterns;
pub mod spec;
pub mod token;
pub mod w3c;
pub mod whatwg;

#[cfg(any(test, feature = "test-support"))]
pub mod equivalence;
