//! Result types and Collection for content model matching.
//!
//! Mirrors the TypeScript types in `permitted-contents/types.ts`
//! and the `Collection` class in `permitted-contents/utils.ts`.

use std::collections::BTreeSet;

use super::child_node::ChildNodeInfo;

/// The outcome of a content model pattern match attempt.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ResultType {
    /// One or more nodes matched the pattern.
    Matched,
    /// Zero nodes matched, but the pattern permits it (e.g., optional/zeroOrMore).
    MatchedZero,
    /// Element disallows any content (void element with children).
    Nothing,
    /// Extra nodes remain after all patterns are consumed.
    UnexpectedExtraNode,
    /// A transparent model disallows the node.
    TransparentModelDisallows,
    /// A required node is missing.
    MissingNodeRequired,
    /// A oneOrMore pattern found zero matches.
    MissingNodeOneOrMore,
    /// Selector didn't match but the pattern may still match empty (has `#text`).
    UnmatchedSelectorButMayEmpty,
    /// No node available to match against.
    MissingNode,
    /// Selector(s) did not match the provided node.
    UnmatchedSelectors,
}

impl ResultType {
    /// Whether this result represents a successful match.
    pub fn is_matched(&self) -> bool {
        matches!(self, Self::Matched | Self::MatchedZero)
    }

    /// Whether this result is a missing-node error type.
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

/// Diagnostic hints for error reporting.
#[derive(Debug, Clone, Default)]
pub struct Hints {
    /// Maximum allowed count (when exceeded).
    pub max: Option<usize>,
    /// Index of the unmatched node for diagnostics.
    pub not_index: Option<usize>,
    /// Missing-node diagnostic info.
    pub missing: Option<MissingHint>,
}

/// Missing-node hint info.
#[derive(Debug, Clone, Default)]
pub struct MissingHint {
    /// Number of elements that partially matched before failure.
    pub barely_matched_elements: Option<usize>,
    /// The query string of the needed element.
    pub need: Option<String>,
}

/// The result of a content model matching operation.
#[derive(Debug, Clone)]
pub struct MatchResult {
    /// The outcome type.
    pub result_type: ResultType,
    /// Indices into the original `child_nodes` slice that were matched.
    pub matched: Vec<usize>,
    /// Indices into the original `child_nodes` slice that were NOT matched.
    pub unmatched: Vec<usize>,
    /// Whether this result represents a zero-width match (backtrack candidate).
    pub zero_match: bool,
    /// The query string that was being matched.
    pub query: String,
    /// Diagnostic hints.
    pub hint: Hints,
}

impl MatchResult {
    /// Create a simple matched result for a single node at the given index.
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

    /// Create a zero-match result (pattern allows empty).
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

    /// Create an unmatched result.
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

    /// Create a missing-node result (no child available).
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

/// Merge two Hints, keeping the one with higher `barely_matched_elements`.
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

/// Tracks matched/unmatched child node indices during pattern matching.
///
/// Mirrors the TypeScript `Collection` class in `permitted-contents/utils.ts`.
pub struct Collection<'a> {
    nodes: &'a [ChildNodeInfo],
    matched: BTreeSet<usize>,
    locked: BTreeSet<usize>,
}

impl<'a> Collection<'a> {
    /// Create a new collection tracking the given child nodes.
    pub fn new(nodes: &'a [ChildNodeInfo]) -> Self {
        Self {
            nodes,
            matched: BTreeSet::new(),
            locked: BTreeSet::new(),
        }
    }

    /// The total number of nodes in the collection.
    pub fn len(&self) -> usize {
        self.nodes.len()
    }

    /// Whether the collection is empty.
    pub fn is_empty(&self) -> bool {
        self.nodes.is_empty()
    }

    /// Returns the indices of matched nodes in order.
    pub fn matched_indices(&self) -> Vec<usize> {
        self.matched.iter().copied().collect()
    }

    /// The number of matched nodes.
    pub fn matched_count(&self) -> usize {
        self.matched.len()
    }

    /// Returns the indices of unmatched nodes in order.
    pub fn unmatched_indices(&self) -> Vec<usize> {
        (0..self.nodes.len()).filter(|i| !self.matched.contains(i)).collect()
    }

    /// Returns references to unmatched child node infos.
    pub fn unmatched_nodes(&self) -> Vec<&ChildNodeInfo> {
        self.unmatched_indices().iter().map(|&i| &self.nodes[i]).collect()
    }

    /// Add indices to the matched set. Returns true if new indices were added.
    pub fn add_matched(&mut self, indices: &[usize]) -> bool {
        let before = self.matched.len();
        for &idx in indices {
            debug_assert!(idx < self.nodes.len(), "Index {idx} out of bounds");
            self.matched.insert(idx);
        }
        self.matched.len() > before
    }

    /// Revert matched set to the locked checkpoint (backtracking).
    pub fn back(&mut self) {
        self.matched = self.locked.clone();
    }

    /// Save current matched set as the locked checkpoint.
    pub fn lock(&mut self) {
        self.locked = self.matched.clone();
    }

    /// Trim matched set to at most `max` entries.
    pub fn cap(&mut self, max: usize) {
        while self.matched.len() > max {
            if let Some(&last) = self.matched.iter().next_back() {
                self.matched.remove(&last);
            }
        }
    }
}
