//! Result types and Collection for content model matching.
//!
//! Mirrors the TypeScript types in `permitted-contents/types.ts`
//! and the `Collection` class in `permitted-contents/utils.ts`.

use std::collections::BTreeSet;

use super::child_node::ChildNodeInfo;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ResultType {
    Matched,
    /// Zero nodes matched, but the pattern permits it (e.g. optional/zeroOrMore).
    MatchedZero,
    /// Element disallows any content (void element with children).
    Nothing,
    /// Extra nodes remain after all patterns are consumed.
    UnexpectedExtraNode,
    TransparentModelDisallows,
    MissingNodeRequired,
    /// A `oneOrMore` pattern found zero matches.
    MissingNodeOneOrMore,
    /// Selector didn't match but the pattern may still match empty (has `#text`).
    UnmatchedSelectorButMayEmpty,
    /// No node available to match against.
    MissingNode,
    UnmatchedSelectors,
}

impl ResultType {
    pub fn is_matched(&self) -> bool {
        matches!(self, Self::Matched | Self::MatchedZero)
    }

    pub fn is_missing(&self) -> bool {
        matches!(
            self,
            Self::MissingNodeRequired
                | Self::MissingNodeOneOrMore
                | Self::MissingNode
                | Self::TransparentModelDisallows
        )
    }
}

#[derive(Debug, Clone, Default)]
pub struct Hints {
    /// Maximum allowed count, when exceeded.
    pub max: Option<usize>,
    pub not_index: Option<usize>,
    pub missing: Option<MissingHint>,
}

#[derive(Debug, Clone, Default)]
pub struct MissingHint {
    /// Number of elements that partially matched before failure.
    pub barely_matched_elements: Option<usize>,
    pub need: Option<String>,
}

#[derive(Debug, Clone)]
pub struct MatchResult {
    pub result_type: ResultType,
    /// Indices into the original `child_nodes` slice that were matched.
    pub matched: Vec<usize>,
    /// Indices into the original `child_nodes` slice that were not matched.
    pub unmatched: Vec<usize>,
    /// A zero-width match, i.e. a backtrack candidate.
    pub zero_match: bool,
    pub query: String,
    pub hint: Hints,
}

impl MatchResult {
    pub fn matched_single(index: usize, total: usize, query: &str, zero_match: bool) -> Self {
        Self {
            result_type: ResultType::Matched,
            matched: vec![index],
            unmatched: (0..total).filter(|&i| i != index).collect(),
            zero_match,
            query: query.to_string(),
            hint: Hints::default(),
        }
    }

    pub fn matched_zero(child_count: usize, query: &str) -> Self {
        Self {
            result_type: ResultType::MatchedZero,
            matched: vec![],
            unmatched: (0..child_count).collect(),
            zero_match: true,
            query: query.to_string(),
            hint: Hints::default(),
        }
    }

    pub fn unmatched(result_type: ResultType, index: usize, total: usize, query: &str) -> Self {
        Self {
            result_type,
            matched: vec![],
            unmatched: (0..total).collect(),
            zero_match: false,
            query: query.to_string(),
            hint: if index < total {
                Hints {
                    not_index: Some(index),
                    ..Default::default()
                }
            } else {
                Hints::default()
            },
        }
    }

    pub fn missing(query: &str) -> Self {
        Self {
            result_type: ResultType::MissingNode,
            matched: vec![],
            unmatched: vec![],
            zero_match: false,
            query: query.to_string(),
            hint: Hints::default(),
        }
    }
}

/// Keeps the hint with the higher `barely_matched_elements` so the closest
/// partial match drives the diagnostic.
pub fn merge_hints(a: &Hints, b: &Hints) -> Hints {
    let missing = match (&a.missing, &b.missing) {
        (Some(am), Some(bm)) => {
            let a_count = am.barely_matched_elements.unwrap_or(0);
            let b_count = bm.barely_matched_elements.unwrap_or(0);
            if b_count > a_count {
                Some(bm.clone())
            } else {
                Some(am.clone())
            }
        }
        (Some(m), None) | (None, Some(m)) => Some(m.clone()),
        (None, None) => None,
    };
    Hints {
        max: b.max.or(a.max),
        not_index: b.not_index.or(a.not_index),
        missing,
    }
}

/// Mirrors the TypeScript `Collection` class in `permitted-contents/utils.ts`.
pub struct Collection<'a> {
    nodes: &'a [ChildNodeInfo],
    matched: BTreeSet<usize>,
    locked: BTreeSet<usize>,
}

impl<'a> Collection<'a> {
    pub fn new(nodes: &'a [ChildNodeInfo]) -> Self {
        Self {
            nodes,
            matched: BTreeSet::new(),
            locked: BTreeSet::new(),
        }
    }

    pub fn len(&self) -> usize {
        self.nodes.len()
    }

    pub fn is_empty(&self) -> bool {
        self.nodes.is_empty()
    }

    pub fn matched_indices(&self) -> Vec<usize> {
        self.matched.iter().copied().collect()
    }

    pub fn matched_count(&self) -> usize {
        self.matched.len()
    }

    pub fn unmatched_indices(&self) -> Vec<usize> {
        (0..self.nodes.len()).filter(|i| !self.matched.contains(i)).collect()
    }

    pub fn unmatched_nodes(&self) -> Vec<&ChildNodeInfo> {
        self.unmatched_indices().iter().map(|&i| &self.nodes[i]).collect()
    }

    /// Returns true if new indices were added.
    pub fn add_matched(&mut self, indices: &[usize]) -> bool {
        let before = self.matched.len();
        for &idx in indices {
            debug_assert!(idx < self.nodes.len(), "Index {idx} out of bounds");
            self.matched.insert(idx);
        }
        self.matched.len() > before
    }

    /// Reverts the matched set to the locked checkpoint, undoing a speculative
    /// match so the engine can backtrack.
    pub fn back(&mut self) {
        self.matched = self.locked.clone();
    }

    /// Saves the current matched set as the checkpoint `back()` reverts to.
    pub fn lock(&mut self) {
        self.locked = self.matched.clone();
    }

    pub fn cap(&mut self, max: usize) {
        while self.matched.len() > max {
            if let Some(&last) = self.matched.iter().next_back() {
                self.matched.remove(&last);
            }
        }
    }
}
