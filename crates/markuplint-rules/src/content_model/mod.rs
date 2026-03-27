//! Content model pattern matching engine.
//!
//! Validates child node sequences against HTML content model patterns using
//! sequential matching, choice alternation, quantifiers, and backtracking.
//!
//! Ported from `packages/@markuplint/rules/src/permitted-contents/`.

pub mod arena_bridge;
pub mod child_node;
pub mod matching;
#[cfg(test)]
mod matching_tests;
pub mod result;
