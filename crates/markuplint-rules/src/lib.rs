//! Rule implementations for markuplint.
//!
//! This crate exists to break a circular dependency: `markuplint-selector`
//! depends on `markuplint-types` for spec data, so `markuplint-types` cannot
//! depend on `markuplint-selector`. Content model matching needs both spec
//! data (from `markuplint-types`) and CSS selector evaluation (from
//! `markuplint-selector`), so it lives here — above both in the dependency
//! graph.
//!
//! ```text
//! markuplint-types   (spec data, no selector dep)
//!       ↑
//! markuplint-selector (CSS selectors, depends on types)
//!       ↑
//! markuplint-rules   (content model matching, depends on both)
//! ```

pub mod content_model;
