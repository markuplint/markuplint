//! Accessible Name Computation, `AccName` 1.2 §4.3.2.
//! @see <https://www.w3.org/TR/accname-1.2/#computation-steps>
//!
//! Ports `packages/@markuplint/ml-spec/src/algorithm/aria/accname/`.
//!
//! The algorithm is decoupled from DOM/spec via the [`AccnameResolver`] trait,
//! mirroring the TS `AccnameResolver` interface. Production uses
//! [`SpecAccnameResolver`]; tests can use mocks.

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

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AccnameResult {
    /// Trimmed and whitespace-collapsed.
    pub name: String,
    pub source: Option<AccnameSource>,
}

impl AccnameResult {
    pub fn empty() -> Self {
        Self {
            name: String::new(),
            source: None,
        }
    }

    /// Empty names collapse to `empty()` (source dropped).
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

/// Mirrors the TS `AccnameResolver` interface. Production uses
/// [`SpecAccnameResolver`]; tests can inject mocks.
pub trait AccnameResolver {
    fn get_element_by_id(&self, id: &str) -> Option<NodeId>;

    fn get_labels_for_id(&self, id: &str) -> Vec<NodeId>;

    fn allows_name_from_content(&self, node_id: NodeId) -> bool;

    fn is_hidden(&self, node_id: NodeId) -> bool;

    fn is_embedded_control(&self, node_id: NodeId) -> bool;

    /// For Pretender / framework components that supply a name directly.
    fn get_precomputed_name(&self, _node_id: NodeId) -> Option<String> {
        None
    }
}

// ============================================================
// Public API
// ============================================================

/// The core entry point; all other entry points delegate here.
pub fn compute_accname(arena: &DomArena, node_id: NodeId, resolver: &dyn AccnameResolver) -> AccnameResult {
    let mut computing = HashSet::new();
    compute::compute_accessible_name(arena, node_id, resolver, &mut computing)
}

pub fn get_accname(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> AccnameResult {
    let resolver = resolver::SpecAccnameResolver::new(spec, arena, version);
    compute_accname(arena, node_id, &resolver)
}

#[cfg(test)]
mod tests;
