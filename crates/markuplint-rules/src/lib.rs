//! Lint rules and execution engine for markuplint.
//!
//! This crate contains:
//! - **Rule trait and registry** (`rule.rs`, `rules/`)
//! - **Lint function** (`lint.rs`) — MLAST + config + spec → violations
//! - **ARIA algorithms** (`aria/`) — computed role, accname, isExposed
//! - **Content model matching** (`content_model/`)
//!
//! ```text
//! markuplint-types   (spec data)
//!       ↑
//! markuplint-selector (CSS selectors)
//!       ↑
//! markuplint-rules   (rules + lint engine)
//! ```

pub mod aria;
pub mod aria_resolver_impl;
pub mod content_model;
pub mod helpers;
pub mod lint;
pub mod rule;
pub mod rule_mapper;
pub mod rules;
pub mod violation;
