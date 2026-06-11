//! Trait for ARIA computation, used by `:role()` and `:aria()` pseudo-classes.
//!
//! This trait breaks the circular dependency between `markuplint-selector`
//! (which needs ARIA computation) and `markuplint-rules` (which provides it
//! but depends on `markuplint-selector` for CSS condition evaluation).

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_types::spec::aria::ARIAVersion;

/// Implemented by `markuplint-rules` and passed to the matcher to resolve
/// `:role()` and `:aria()` pseudo-classes.
pub trait AriaResolver {
    /// `None` when the element has no role.
    fn get_computed_role_name(&self, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> Option<String>;

    /// Empty string when the element has no accessible name.
    fn get_accessible_name(&self, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> String;
}
