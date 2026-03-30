//! Trait for ARIA computation, used by `:role()` and `:aria()` pseudo-classes.
//!
//! This trait breaks the circular dependency between `markuplint-selector`
//! (which needs ARIA computation) and `markuplint-rules` (which provides it
//! but depends on `markuplint-selector` for CSS condition evaluation).

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_types::spec::aria::ARIAVersion;

/// Provides ARIA role and accessible name computation for selector matching.
///
/// Implemented by `markuplint-rules` and passed to the selector matcher
/// to resolve `:role()` and `:aria()` pseudo-classes.
pub trait AriaResolver {
    /// Returns the computed ARIA role name for an element, or `None` if no role.
    fn get_computed_role_name(&self, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> Option<String>;

    /// Returns the accessible name for an element (empty string if none).
    fn get_accessible_name(&self, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> String;
}
