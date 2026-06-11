//! Lint rules and execution engine for markuplint.
//!
//! ```text
//! markuplint-types   (spec data)
//!       ↑
//! markuplint-selector (CSS selectors)
//!       ↑
//! markuplint-rules   (rules + lint engine)
//! ```
//!
//! This crate is deliberately separate so it can depend on *both*
//! `markuplint-types` (spec data) and `markuplint-selector` (CSS matching) at
//! once: selector evaluation needs ARIA/spec data, but `markuplint-selector`
//! cannot depend on the spec layer without a cycle. The rule engine sits on top
//! of both and supplies the `AriaResolver` implementation back to the selector
//! matcher (see `aria_resolver_impl`), keeping the lower crates acyclic.

pub mod aria;
pub mod aria_resolver_impl;
pub mod content_model;
pub mod helpers;
pub mod lint;
pub mod rule;
pub mod rule_mapper;
pub mod rules;
pub mod violation;
