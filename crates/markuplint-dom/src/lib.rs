//! Arena-based DOM tree for markuplint — the Rust counterpart of the TS MLDOM
//! in `packages/@markuplint/ml-core/src/ml-dom/`. The long-term goal is for this
//! crate to replace that TS MLDOM layer.
//!
//! ## Why an arena
//!
//! All nodes live in a single `Vec<DomNode>` and reference each other by index
//! (`NodeId = usize`) rather than by `Rc`/`&` pointers. A DOM is a graph with
//! parent/child/sibling back-references, which a borrow-checked tree of owned
//! references cannot express without pervasive `Rc<RefCell<…>>`. Indices sidestep
//! the lifetime and aliasing complexity entirely and avoid per-node heap allocation
//! (though depth-first traversal helpers still allocate a working `Vec`).
//!
//! ## Two construction paths feed this arena
//!
//! - **Path A** (`builder`): from MLAST JSON produced by a TS parser
//!   (`markuplint-core` deserializes → this builder converts). Reuses the existing
//!   framework parsers for inputs the Rust HTML parser does not cover.
//! - **Path B** (`html_builder`): straight from an HTML string parsed by the Rust
//!   WHATWG parser (`markuplint-html-parser`), with no MLAST JSON intermediate —
//!   the full-Rust lint path.
//!
//! Both paths exist on purpose: Path B is faster and dependency-free for plain
//! HTML, while Path A is the only way to lint framework templates until those
//! parsers are themselves ported. Downstream rules consume the identical
//! `DomArena` regardless of which path built it.

pub mod arena;
pub mod builder;
pub mod helpers;
#[cfg(feature = "html-parser")]
pub mod html_builder;
pub mod node;
pub mod traversal;
