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

use std::collections::{HashMap, HashSet};

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

/// How the computation reached an element (TS `AccnameVisit`, see [`AccnameResolver::on_visit`]).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[allow(clippy::struct_excessive_bools)] // the three facts of the TS `AccnameVisit`
pub struct AccnameVisit {
    /// Whether Step 2A found the element hidden, which ends the computation of it. Step 2A does not
    /// apply inside an `aria-labelledby` traversal whose directly referenced node is hidden, so no
    /// element is found hidden there.
    pub hidden: bool,
    /// Whether the element is an embedded control reached by name-from-content recursion
    /// (Step 2C), whose value is used and whose `aria-label` is ignored.
    pub embedded_control: bool,
    /// Whether the element is part of an ongoing `aria-labelledby` traversal, in which Step 2B is
    /// not applied.
    pub in_labelledby_traversal: bool,
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

    /// Whether the element is exposed with an explicit `none` or `presentation` role, so that
    /// Step 2E does not use its host language text alternative. No element is when absent.
    fn is_exposed_as_presentational(&self, _node_id: NodeId) -> bool {
        false
    }

    /// Called for every element the computation reaches, before Step 2A, so that a caller can tell
    /// which attributes of a descendant took part in a name. An element that the computation does
    /// not reach (the subtree of a hidden element, or of one named before content) is never
    /// reported.
    fn on_visit(&self, _node_id: NodeId, _visit: AccnameVisit) {}

    /// TS `getTreeParentElement`: the parent element in the tree of the element, which the closest
    /// `label` of a labelable element is looked for along. The parent node when it is an element
    /// unless the resolver knows the tree boundary (the content of a `template`).
    fn get_tree_parent_element(&self, arena: &DomArena, node_id: NodeId) -> Option<NodeId> {
        let parent = arena.get(node_id)?.parent_id()?;
        arena.get(parent)?.as_element()?;
        Some(parent)
    }

    /// For Pretender / framework components that supply a name directly.
    fn get_precomputed_name(&self, _node_id: NodeId) -> Option<String> {
        None
    }

    /// TS `getChildNodes`: the child nodes to traverse for `node_id` in place of
    /// the children as written. A pretended component renders its own elements
    /// (`contents`) around the children given at the usage site, or none of them
    /// (`slots: null`). `None` means the children as written.
    fn get_child_nodes(&self, _node_id: NodeId) -> Option<Vec<NodeId>> {
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

/// TS `computeReferencedTextAlternative`: the text alternative of an element as a node referenced by
/// `aria-labelledby` or `aria-describedby` (the `LabelledBy` Traversal of Step 2B, which the description
/// computation also uses).
///
/// @see <https://w3c.github.io/accname/#comp_labelledby_traversal>
pub fn compute_referenced_text_alternative(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
) -> AccnameResult {
    let mut visited = HashSet::new();
    if let Some(id) = markuplint_dom::helpers::get_attr_value(arena, node_id, "id")
        && !id.is_empty()
    {
        visited.insert(id.to_owned());
    }
    let mut computing = HashSet::new();
    aria_steps::compute_referenced(arena, node_id, resolver, &visited, &mut computing)
}

/// TS `computeHostLanguageLabel`: the host language text alternative of an element (Step 2E,
/// HTML-AAM §4.1), such as the `alt` of an image or the `title` of an SVG element, whether or not the
/// element is exposed as presentational.
///
/// Tells what an explicit `none` or `presentation` role drops from the name: every source the
/// HTML-AAM rules of Step 2E give. The sources that Step 2E shares with other steps (`content`, the
/// `title` attribute) are not dropped by the role, and give `None`.
///
/// @see <https://w3c.github.io/accname/#comp_host_language_label>
pub fn compute_host_language_label(
    arena: &DomArena,
    node_id: NodeId,
    resolver: &dyn AccnameResolver,
) -> Option<AccnameResult> {
    let mut computing = HashSet::new();
    let result =
        element_names::get_element_specific_name(arena, node_id, resolver, &HashSet::new(), false, &mut computing)?;
    match result.source {
        None | Some(AccnameSource::Content | AccnameSource::Title) => None,
        Some(_) => Some(result),
    }
}

pub fn get_accname(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> AccnameResult {
    let resolver = resolver::SpecAccnameResolver::new(spec, arena, version, node_id);
    compute_accname(arena, node_id, &resolver)
}

/// TS `getAccnameVisits`: the elements that the computation of the text alternative of `node_id`
/// reaches, with how it reaches each (see [`AccnameResolver::on_visit`]). With `as_referenced` it is
/// computed as a node referenced by `aria-labelledby` or `aria-describedby` instead of as its accessible
/// name. Where TS takes the computation to reach nothing on an error, nothing here can fail.
pub fn get_accname_visits(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    version: ARIAVersion,
    as_referenced: bool,
) -> HashMap<NodeId, Vec<AccnameVisit>> {
    let resolver = resolver::SpecAccnameResolver::new(spec, arena, version, node_id);
    if as_referenced {
        compute_referenced_text_alternative(arena, node_id, &resolver);
    } else {
        compute_accname(arena, node_id, &resolver);
    }
    resolver.into_visits()
}

/// TS `getReferencedTextAlternative`: the text alternative of the element as a node referenced by
/// `aria-labelledby` or `aria-describedby`.
pub fn get_referenced_text_alternative(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    version: ARIAVersion,
) -> String {
    let resolver = resolver::SpecAccnameResolver::new(spec, arena, version, node_id);
    compute_referenced_text_alternative(arena, node_id, &resolver).name
}

/// TS `getHostLanguageLabelSource`: the source of the host language text alternative of the element
/// (Step 2E), whether or not the element is exposed as presentational.
pub fn get_host_language_label_source(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    version: ARIAVersion,
) -> Option<AccnameSource> {
    let resolver = resolver::SpecAccnameResolver::new(spec, arena, version, node_id);
    compute_host_language_label(arena, node_id, &resolver)?.source
}

#[cfg(test)]
mod tests;
