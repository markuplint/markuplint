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

    /// Whether the resolver reads the branches of the conditional blocks as one
    /// ([`Self::may_be_absent_with`] is TS `AccnameResolver#mayBeAbsentWith`, which is absent when this is
    /// `false`).
    fn reads_every_branch(&self) -> bool {
        false
    }

    /// TS `mayBeAbsentWith`: whether `absent` may not be rendered while `rendered` is, as when the children
    /// `get_child_nodes` returns are the branches of a conditional block, of which one is rendered. A lookup
    /// that takes the first child of a name (`legend`, `caption`, the SVG `title`) then also takes a later
    /// child (`rendered`) that every earlier one (`absent`) may be absent with, as that child may be the
    /// first that is rendered. Without it ([`Self::reads_every_branch`] is `false`), the first child is the
    /// only one.
    fn may_be_absent_with(&self, _absent: NodeId, _rendered: NodeId) -> bool {
        false
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

/// TS `getAccnameOfEveryBranch`: the accessible name of the element with the branches of the conditional
/// blocks read as one ([`resolver::SpecAccnameResolver::every_branch`]).
///
/// The text is the concatenation of the branches, of which only one is rendered, so it is not a name that
/// the element has. Only whether it is empty means something: it is not empty when some branch gives a
/// name, because the name from content is the concatenation of what every child gives on its own, and a
/// lookup of a name that takes one child (`legend`, `caption`, the SVG `title`) reads each of them that a
/// branch may leave out ([`AccnameResolver::may_be_absent_with`]).
pub fn get_accname_of_every_branch(
    spec: &MLMLSpec,
    arena: &DomArena,
    node_id: NodeId,
    version: ARIAVersion,
) -> AccnameResult {
    let resolver = resolver::SpecAccnameResolver::new(spec, arena, version, node_id).every_branch();
    compute_accname(arena, node_id, &resolver)
}

/// The state of [`may_have_accessible_name`] of one arena: the answers that are final, the elements whose
/// answer is being worked out, and how many times a call answered with the name as written because its
/// element was being worked out (TS `#mayHaveAccessibleNameCache`, `#computingEveryBranch` and the module
/// level `everyBranchFallbacks`; the last is about a computation, which does not leave its arena).
#[derive(Default)]
struct MayHaveNameState {
    cache: std::sync::Mutex<HashMap<(NodeId, u8), bool>>,
    computing: std::sync::Mutex<HashSet<(NodeId, u8)>>,
    fallbacks: std::sync::atomic::AtomicUsize,
}

/// TS `MLElement#mayHaveAccessibleName`: whether the element has an accessible name, or may have one
/// when a branch of a conditional block (`if`, `switch`, `await` and their clauses) is rendered, or when an
/// element that a conditional directive may leave out (Vue's `v-if`) is. What the directive changes is
/// which `legend`, `caption` or SVG `title` is the first that gives the name: the text of the element is in
/// the name as written either way.
///
/// [`get_accname`] reads the markup as written, in which a conditional block is a node that the computation
/// does not go into. Which branch is rendered is not known, so an element whose name is in a branch is not
/// unnamed: the caller that reports an element without a name, or one that counts on the name it has, asks
/// this instead.
///
/// The text of the branches is read as one, so only whether it is empty is used: the name from content is
/// the concatenation of what each child gives on its own, and the lookups of a name that takes one child
/// read each that a branch may leave out ([`AccnameResolver::may_be_absent_with`]).
///
/// The role of an element depends on its name (`:aria(has name)` in the spec) and its name on its role, so
/// this is called from inside the computation it makes. Invariants: a call for an element that is being
/// computed answers from the name as written and counts itself in `fallbacks`; a name found is final and is
/// cached, and that no branch has one is cached only when no such call happened during the computation, as
/// the answer is partial then. A document without a conditional block is answered by the name as written.
///
/// # Panics
///
/// Panics if a lock of the state is poisoned, which only a panic while holding it does.
///
/// @see <https://w3c.github.io/accname/#comp_name_from_content>
#[must_use]
pub fn may_have_accessible_name(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> bool {
    use std::sync::atomic::Ordering;

    let state = arena.memoize("may-have-accessible-name", 0, MayHaveNameState::default);
    let key = (
        node_id,
        match version {
            ARIAVersion::V1_1 => 0,
            ARIAVersion::V1_2 => 1,
            ARIAVersion::V1_3 => 2,
        },
    );
    let cached = state
        .cache
        .lock()
        .expect("may-have-accessible-name cache")
        .get(&key)
        .copied();
    if let Some(cached) = cached {
        return cached;
    }
    let as_written = || !get_accname(spec, arena, node_id, version).name.trim().is_empty();
    // The role of an element depends on its name (`:aria(has name)` of the spec), and its name on its role,
    // so a call that the computation itself makes sees only the name as written
    let working = state
        .computing
        .lock()
        .expect("may-have-accessible-name computing")
        .contains(&key);
    if working {
        state.fallbacks.fetch_add(1, Ordering::SeqCst);
        return as_written();
    }
    state
        .computing
        .lock()
        .expect("may-have-accessible-name computing")
        .insert(key);
    let fallbacks_before = state.fallbacks.load(Ordering::SeqCst);
    let conditional = crate::conditional_block::has_conditional_node(arena);
    // Only a name found is final: that no branch has one is not known when the computation used the name as
    // written of an element that is being computed
    let found = as_written()
        || (conditional
            && !get_accname_of_every_branch(spec, arena, node_id, version)
                .name
                .trim()
                .is_empty());
    if found || (conditional && fallbacks_before == state.fallbacks.load(Ordering::SeqCst)) {
        state
            .cache
            .lock()
            .expect("may-have-accessible-name cache")
            .insert(key, found);
    }
    state
        .computing
        .lock()
        .expect("may-have-accessible-name computing")
        .remove(&key);
    found
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
