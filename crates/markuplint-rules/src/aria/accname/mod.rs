//! Accessible Name Computation (`AccName` 1.2 §4.3.2).
//!
//! Ports `packages/@markuplint/ml-spec/src/algorithm/aria/accname/`.
//! Computes the accessible name for an element per the W3C `AccName` 1.2 spec.
//!
//! The algorithm is decoupled from DOM/spec via the [`AccnameResolver`] trait,
//! mirroring the TS `AccnameResolver` interface. Production uses
//! [`SpecAccnameResolver`]; tests can use mocks.
//!
//! @see <https://www.w3.org/TR/accname-1.2/#computation-steps>

mod aria_steps;
mod compute;
mod element_names;
pub mod helpers;
mod label_steps;
pub mod resolver;

use std::collections::HashSet;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

// ============================================================
// Types
// ============================================================

/// Source of the computed accessible name.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AccnameSource {
    AriaLabelledby,
    AriaLabel,
    Label,
    Alt,
    Content,
    Title,
    Placeholder,
    Value,
    Legend,
    Caption,
    SvgTitle,
    Default,
}

/// Result of accessible name computation.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AccnameResult {
    /// The computed accessible name (trimmed, whitespace-collapsed).
    pub name: String,
    /// The source of the name, or `None` if no name was computed.
    pub source: Option<AccnameSource>,
}

impl AccnameResult {
    /// Create an empty result (no name computed).
    pub fn empty() -> Self {
        Self {
            name: String::new(),
            source: None,
        }
    }

    /// Create a result with a name and source. Empty names become `empty()`.
    pub fn new(name: impl Into<String>, source: AccnameSource) -> Self {
        let name = helpers::flatten_text(&name.into());
        if name.is_empty() {
            Self::empty()
        } else {
            Self {
                name,
                source: Some(source),
            }
        }
    }
}

// ============================================================
// AccnameResolver trait
// ============================================================

/// Abstraction for DOM/spec queries needed by the `AccName` algorithm.
///
/// Mirrors the TS `AccnameResolver` interface. Production uses
/// [`SpecAccnameResolver`]; tests can inject mocks.
pub trait AccnameResolver {
    /// Find an element by its HTML `id` attribute.
    fn get_element_by_id(&self, id: &str) -> Option<NodeId>;

    /// Find `<label>` elements associated with the given element's ID.
    fn get_labels_for_id(&self, id: &str) -> Vec<NodeId>;

    /// Whether the element's role allows accessible name from content.
    fn allows_name_from_content(&self, node_id: NodeId) -> bool;

    /// Whether the element is hidden from the accessibility tree.
    fn is_hidden(&self, node_id: NodeId) -> bool;

    /// Whether the element is an embedded control (textbox, combobox, etc.).
    fn is_embedded_control(&self, node_id: NodeId) -> bool;

    /// Get a precomputed name (for Pretender/framework components). Default: None.
    fn get_precomputed_name(&self, _node_id: NodeId) -> Option<String> {
        None
    }
}

// ============================================================
// Public API
// ============================================================

/// Compute the accessible name using the algorithm with a custom resolver.
///
/// This is the core function — all other entry points delegate here.
pub fn compute_accname(arena: &DomArena, node_id: NodeId, resolver: &dyn AccnameResolver) -> AccnameResult {
    let mut computing = HashSet::new();
    compute::compute_accessible_name(arena, node_id, resolver, &mut computing)
}

/// Compute the accessible name using real spec data.
///
/// Convenience wrapper that creates a [`SpecAccnameResolver`] and delegates
/// to [`compute_accname`].
pub fn get_accname(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> AccnameResult {
    let resolver = resolver::SpecAccnameResolver::new(spec, arena, version);
    compute_accname(arena, node_id, &resolver)
}

#[cfg(test)]
mod tests;
