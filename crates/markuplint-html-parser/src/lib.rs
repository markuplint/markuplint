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
