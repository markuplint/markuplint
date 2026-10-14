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
//! Path A reads the AST the way the TS `Document` does, because the rules are ports of the TS
//! rules and compare against what those see: an attribute's `node_name` is the name the parser
//! resolved (`potentialName`), an element knows its end tag as `close_tag` (an `endtag` is never a
//! node, even where a parser lists it among the children), and what the parser says about its
//! markup (`endTag`, `booleanish`, `tagNameCaseSensitive`) is kept as [`arena::DomArena::settings`].
//! `DomArena::child_nodes` is TS `childNodes`, which reads through fragments and `each` blocks.
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
pub mod pretender;
pub mod traversal;
