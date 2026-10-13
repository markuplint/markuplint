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
//! `markuplint-types` (spec data) and `markuplint-selector` (CSS matching) at once.
//! Selector evaluation needs ARIA computation (computed role, accessible name),
//! which lives here in the rule engine; `markuplint-selector` cannot depend on
//! `markuplint-rules` without a cycle, so the selector defines the `AriaResolver`
//! trait and this crate supplies the implementation back to it (see
//! `aria_resolver_impl`), keeping the lower crates acyclic.

pub mod aria;
pub mod aria_check;
pub mod aria_resolver_impl;
pub mod attr_check;
pub mod content_model;
pub(crate) mod feature_check;
pub(crate) mod h1_check;
pub mod helpers;
pub(crate) mod landmark_check;
pub(crate) mod lifecycle_check;
pub mod lint;
pub mod rule;
pub mod rule_mapper;
pub mod rules;
pub(crate) mod srcset_check;
pub(crate) mod table_grid;
pub mod violation;
