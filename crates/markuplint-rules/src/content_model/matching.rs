//! Content model pattern matching engine.
//!
//! Ports the TypeScript implementation from
//! `packages/@markuplint/rules/src/permitted-contents/`.
//!
//! Supports full CSS pseudo-class selectors (`:not()`, `:has()`, `:is()`) by
//! expanding `:model(category)` to `:is(tag1, tag2, ...)` and delegating to
//! `markuplint-selector` via a minimal DOM arena (see [`super::arena_bridge`]).
//! Simple queries without pseudo-classes use fast tag-name matching as a fast path.

use super::child_node::ChildNodeInfo;
use super::result::{Collection, Hints, MatchResult, MissingHint, ResultType, merge_hints};
use markuplint_types::spec::content_model::{ChoicePattern, ModelOrPatterns, PermittedContentPattern};
use markuplint_types::spec::lookup;
use markuplint_types::spec::types::MLMLSpec;

// ============================================================
// Public API
// ============================================================

/// Validate a sequence of child nodes against content model patterns.
pub fn validate_content_model(
    spec: &MLMLSpec,
    patterns: &[PermittedContentPattern],
    child_nodes: &[ChildNodeInfo],
) -> MatchResult {
    order(patterns, child_nodes, spec, 0)
}

// ============================================================
// Core matching functions
// ============================================================

/// Sequential pattern matching with backtracking.
///
/// Matches each pattern in `contents` against the remaining unmatched child nodes.
/// When a pattern matches zero nodes (`zero_match`), `backtrack_mode` is activated.
/// If the next pattern fails while in backtrack mode, the collection reverts to the
/// last checkpoint (`back()`), and the failing pattern is retried. After a successful
/// recovery, the state is locked (`lock()`) as a new checkpoint. This allows optional
/// patterns (e.g., `zeroOrMore`) to "give back" their zero-width match so subsequent
/// required patterns can attempt to match.
pub(crate) fn order(
    contents: &[PermittedContentPattern],
    child_nodes: &[ChildNodeInfo],
    spec: &MLMLSpec,
    depth: usize,
) -> MatchResult {
    let mut collection = Collection::new(child_nodes);

    let mut result: Option<MatchResult> = None;
    let mut backtrack_mode = false;
    let mut after_backtrack = false;
    let mut unmatched_results: Vec<MatchResult> = Vec::new();
    let mut pattern_idx = 0;

    while pattern_idx < contents.len() {
        let unmatched = collect_unmatched(&collection);
        let unmatched_indices = collection.unmatched_indices();
        let r = complex_branch(&contents[pattern_idx], &unmatched, spec, depth);

        // Remap: complex_branch receives a sub-slice of unmatched nodes, so its
        // returned indices are local to that sub-slice. Map them back to indices
        // in the original child_nodes array via unmatched_indices lookup.
        let original_matched: Vec<usize> = r
            .matched
            .iter()
            .filter_map(|&local_idx| unmatched_indices.get(local_idx).copied())
            .collect();
        collection.add_matched(&original_matched);

        let is_success = r.result_type == ResultType::UnexpectedExtraNode
            || r.result_type == ResultType::Matched
            || r.result_type == ResultType::MatchedZero;

        if !is_success {
            unmatched_results.push(r.clone());

            if backtrack_mode {
                collection.back();
                backtrack_mode = false;
                after_backtrack = true;
                continue;
            }

            let barely = unmatched_results.iter().max_by_key(|r| r.matched.len()).unwrap();

            return MatchResult {
                result_type: barely.result_type.clone(),
                matched: collection.matched_indices(),
                unmatched: collection.unmatched_indices(),
                zero_match: barely.zero_match,
                query: barely.query.clone(),
                hint: merge_hints(
                    &barely.hint,
                    &Hints {
                        missing: Some(MissingHint {
                            barely_matched_elements: Some(collection.matched_count()),
                            need: Some(barely.query.clone()),
                        }),
                        ..Default::default()
                    },
                ),
            };
        }

        if after_backtrack {
            collection.lock();
            after_backtrack = false;
        }

        backtrack_mode = r.zero_match;
        result = Some(r);
        pattern_idx += 1;
    }

    if !collection.unmatched_indices().is_empty() {
        return MatchResult {
            result_type: ResultType::UnexpectedExtraNode,
            matched: collection.matched_indices(),
            unmatched: collection.unmatched_indices(),
            zero_match: false,
            query: result.as_ref().map_or("N/A".to_string(), |r| r.query.clone()),
            hint: result.as_ref().map_or(Hints::default(), |r| r.hint.clone()),
        };
    }

    let result_type = if collection.matched_count() > 0 {
        ResultType::Matched
    } else {
        ResultType::MatchedZero
    };

    MatchResult {
        result_type,
        matched: collection.matched_indices(),
        unmatched: collection.unmatched_indices(),
        zero_match: false,
        query: result.as_ref().map_or("N/A".to_string(), |r| r.query.clone()),
        hint: result.as_ref().map_or(Hints::default(), |r| r.hint.clone()),
    }
}

/// Choice (alternation) pattern matching.
///
/// Matches TS `choice.ts`: uses a Collection to track consumed nodes across
/// branches. Each branch receives only unmatched nodes. If a branch partially
/// matches, its consumed nodes are removed before trying the next branch.
pub(crate) fn choice(
    pattern: &ChoicePattern,
    child_nodes: &[ChildNodeInfo],
    spec: &MLMLSpec,
    depth: usize,
) -> MatchResult {
    let mut collection = Collection::new(child_nodes);
    let mut unmatched_results: Vec<MatchResult> = Vec::new();

    for branch in &pattern.choice {
        let unmatched = collect_unmatched(&collection);
        let unmatched_indices = collection.unmatched_indices();

        let r = order(branch, &unmatched, spec, depth + 1);

        // Remap matched indices from sub-slice back to original
        let original_matched: Vec<usize> = r
            .matched
            .iter()
            .filter_map(|&local_idx| unmatched_indices.get(local_idx).copied())
            .collect();

        if r.result_type == ResultType::Matched
            || r.result_type == ResultType::MatchedZero
            || (r.result_type == ResultType::UnexpectedExtraNode && !r.matched.is_empty())
        {
            return MatchResult {
                result_type: r.result_type,
                matched: original_matched,
                unmatched: r.unmatched,
                zero_match: r.zero_match,
                query: r.query,
                hint: r.hint,
            };
        }

        // TS: collection.addMatched(result.matched) — consume matched nodes
        collection.add_matched(&original_matched);
        unmatched_results.push(r);
    }

    // Fallback: return best barely-matched result with collection's matched/unmatched
    unmatched_results.sort_by(|a, b| {
        if a.result_type != b.result_type {
            if a.result_type == ResultType::UnexpectedExtraNode {
                return std::cmp::Ordering::Less;
            }
            if b.result_type == ResultType::UnexpectedExtraNode {
                return std::cmp::Ordering::Greater;
            }
        }
        let by_matched = b.matched.len().cmp(&a.matched.len());
        if by_matched != std::cmp::Ordering::Equal {
            return by_matched;
        }
        let a_barely = a
            .hint
            .missing
            .as_ref()
            .and_then(|m| m.barely_matched_elements)
            .unwrap_or(0);
        let b_barely = b
            .hint
            .missing
            .as_ref()
            .and_then(|m| m.barely_matched_elements)
            .unwrap_or(0);
        b_barely.cmp(&a_barely)
    });

    let barely = unmatched_results.into_iter().next().expect("Unreachable: no results");

    // TS returns collection.matched/unmatched, not the branch's
    MatchResult {
        result_type: barely.result_type,
        matched: collection.matched_indices(),
        unmatched: collection.unmatched_indices(),
        zero_match: barely.zero_match,
        query: barely.query,
        hint: barely.hint,
    }
}

/// Quantified pattern matching (require/optional/oneOrMore/zeroOrMore).
#[allow(clippy::too_many_lines)]
pub(crate) fn count_pattern(
    pattern: &PermittedContentPattern,
    child_nodes: &[ChildNodeInfo],
    spec: &MLMLSpec,
    depth: usize,
) -> MatchResult {
    let norm = normalize_model(pattern);
    let mut collection = Collection::new(child_nodes);
    let mut prev_result: Option<MatchResult> = None;
    let mut barely_result: Option<MatchResult> = None;

    loop {
        let unmatched = collect_unmatched(&collection);
        let unmatched_indices = collection.unmatched_indices();
        let r = recursive_branch(&norm.model, &unmatched, spec, depth);

        let original_matched: Vec<usize> = r
            .matched
            .iter()
            .filter_map(|&local_idx| unmatched_indices.get(local_idx).copied())
            .collect();
        let added = collection.add_matched(&original_matched);

        // UNMATCHED_SELECTOR_BUT_MAY_EMPTY → MATCHED_ZERO
        if r.result_type == ResultType::UnmatchedSelectorButMayEmpty {
            return compare_result(
                MatchResult {
                    result_type: ResultType::MatchedZero,
                    matched: collection.matched_indices(),
                    unmatched: collection.unmatched_indices(),
                    zero_match: true,
                    query: r.query,
                    hint: r.hint,
                },
                barely_result,
            );
        }

        // Max exceeded
        if collection.matched_count() > norm.max {
            collection.cap(norm.max);
            return compare_result(
                MatchResult {
                    result_type: ResultType::UnexpectedExtraNode,
                    matched: collection.matched_indices(),
                    unmatched: collection.unmatched_indices(),
                    zero_match: r.zero_match,
                    query: r.query,
                    hint: merge_hints(
                        &r.hint,
                        &Hints {
                            max: Some(norm.max),
                            ..Default::default()
                        },
                    ),
                },
                barely_result,
            );
        }

        // Check prev_result continuation
        if let Some(ref prev) = prev_result {
            if r.result_type == ResultType::MissingNodeOneOrMore
                || r.result_type == ResultType::MissingNodeRequired
                || r.result_type == ResultType::TransparentModelDisallows
            {
                return compare_result(
                    MatchResult {
                        result_type: r.result_type,
                        matched: collection.matched_indices(),
                        unmatched: collection.unmatched_indices(),
                        zero_match: r.zero_match,
                        query: r.query,
                        hint: r.hint,
                    },
                    barely_result,
                );
            }

            return compare_result(
                MatchResult {
                    result_type: prev.result_type.clone(),
                    matched: collection.matched_indices(),
                    unmatched: collection.unmatched_indices(),
                    zero_match: prev.zero_match,
                    query: prev.query.clone(),
                    hint: prev.hint.clone(),
                },
                barely_result,
            );
        }

        // Continue if we added nodes and there are more unmatched
        if added && !collection.unmatched_indices().is_empty() {
            if r.result_type != ResultType::MissingNode && r.result_type != ResultType::UnmatchedSelectors {
                barely_result = Some(MatchResult {
                    result_type: r.result_type.clone(),
                    matched: collection.matched_indices(),
                    unmatched: collection.unmatched_indices(),
                    zero_match: r.zero_match,
                    query: r.query.clone(),
                    hint: r.hint.clone(),
                });
            }
            continue;
        }

        // Check minimum
        let zero_adj = usize::from(r.zero_match);
        if (collection.matched_count() + zero_adj) < norm.min {
            let result_type = if r.result_type == ResultType::MissingNodeRequired
                || r.result_type == ResultType::MissingNodeOneOrMore
                || r.result_type == ResultType::TransparentModelDisallows
            {
                r.result_type.clone()
            } else {
                norm.missing_type.clone().unwrap_or(ResultType::MissingNodeRequired)
            };

            return compare_result(
                MatchResult {
                    result_type,
                    matched: collection.matched_indices(),
                    unmatched: collection.unmatched_indices(),
                    zero_match: r.zero_match,
                    query: r.query.clone(),
                    hint: merge_hints(
                        &r.hint,
                        &Hints {
                            missing: Some(MissingHint {
                                barely_matched_elements: Some(collection.matched_count()),
                                need: Some(r.query),
                            }),
                            ..Default::default()
                        },
                    ),
                },
                barely_result,
            );
        }

        // Build success result
        let result_type = if collection.matched_count() == 0 {
            ResultType::MatchedZero
        } else {
            ResultType::Matched
        };
        let zero_match = r.zero_match || norm.min == 0 || result_type == ResultType::MatchedZero;

        let matched_result = MatchResult {
            result_type,
            matched: collection.matched_indices(),
            unmatched: collection.unmatched_indices(),
            zero_match,
            query: r.query.clone(),
            hint: merge_hints(
                &r.hint,
                &Hints {
                    missing: Some(MissingHint {
                        barely_matched_elements: Some(collection.matched_count()),
                        need: Some(r.query.clone()),
                    }),
                    ..Default::default()
                },
            ),
        };

        if !collection.unmatched_indices().is_empty() {
            prev_result = Some(matched_result);
            continue;
        }

        if r.result_type == ResultType::MissingNodeRequired
            || r.result_type == ResultType::MissingNodeOneOrMore
            || r.result_type == ResultType::TransparentModelDisallows
        {
            return compare_result(
                MatchResult {
                    result_type: r.result_type,
                    matched: collection.matched_indices(),
                    unmatched: collection.unmatched_indices(),
                    zero_match: r.zero_match,
                    query: r.query,
                    hint: r.hint,
                },
                barely_result,
            );
        }

        return compare_result(matched_result, barely_result);
    }
}

/// Compare two results and return the best diagnostic outcome.
fn compare_result(a: MatchResult, b: Option<MatchResult>) -> MatchResult {
    let Some(b) = b else { return a };

    if a.result_type == ResultType::Matched
        || a.result_type == ResultType::MatchedZero
        || a.result_type == ResultType::UnexpectedExtraNode
    {
        return a;
    }

    let a_barely = a
        .hint
        .missing
        .as_ref()
        .and_then(|m| m.barely_matched_elements)
        .unwrap_or(0);
    let b_barely = b
        .hint
        .missing
        .as_ref()
        .and_then(|m| m.barely_matched_elements)
        .unwrap_or(0);
    if b_barely > a_barely { b } else { a }
}

/// Leaf-level pattern matching.
pub(crate) fn recursive_branch(
    model: &ModelOrPatterns,
    child_nodes: &[ChildNodeInfo],
    spec: &MLMLSpec,
    depth: usize,
) -> MatchResult {
    match model {
        ModelOrPatterns::Patterns(patterns) => order(patterns, child_nodes, spec, depth + 1),
        ModelOrPatterns::Single(query) => matches_selector(query, child_nodes.first(), child_nodes.len(), spec),
        ModelOrPatterns::MultipleStrings(queries) => {
            let mut last_unmatched: Option<MatchResult> = None;
            for query in queries {
                let r = matches_selector(query, child_nodes.first(), child_nodes.len(), spec);
                if r.result_type == ResultType::Matched || r.result_type == ResultType::MatchedZero {
                    return r;
                }
                last_unmatched = Some(r);
            }
            last_unmatched.expect("Unreachable: no queries")
        }
    }
}

/// Dispatch a pattern to the appropriate handler.
fn complex_branch(
    pattern: &PermittedContentPattern,
    child_nodes: &[ChildNodeInfo],
    spec: &MLMLSpec,
    depth: usize,
) -> MatchResult {
    match pattern {
        PermittedContentPattern::Choice(p) => choice(p, child_nodes, spec, depth),
        PermittedContentPattern::Transparent(_) => transparent(child_nodes),
        _ => count_pattern(pattern, child_nodes, spec, depth),
    }
}

/// Stub for transparent patterns — matches all children.
fn transparent(child_nodes: &[ChildNodeInfo]) -> MatchResult {
    if child_nodes.is_empty() {
        MatchResult {
            result_type: ResultType::MatchedZero,
            matched: vec![],
            unmatched: vec![],
            zero_match: true,
            query: "transparent".to_string(),
            hint: Hints::default(),
        }
    } else {
        MatchResult {
            result_type: ResultType::Matched,
            matched: (0..child_nodes.len()).collect(),
            unmatched: vec![],
            zero_match: false,
            query: "transparent".to_string(),
            hint: Hints::default(),
        }
    }
}

// ============================================================
// Selector matching
// ============================================================

/// Test whether a single child node matches a content model query.
///
/// `child_node` is `None` when no node is available (e.g., empty child list).
/// `total_count` is the number of nodes in the parent context, used for
/// building `MatchResult.unmatched` index lists.
pub(crate) fn matches_selector(
    query: &str,
    child_node: Option<&ChildNodeInfo>,
    total_count: usize,
    spec: &MLMLSpec,
) -> MatchResult {
    let cond = opt_condition(query, spec);

    let Some(node) = child_node else {
        if cond.has_text {
            return MatchResult::matched_zero(0, query);
        }
        return MatchResult::missing(query);
    };

    if node.is_text() {
        if cond.has_text {
            return MatchResult::matched_single(0, total_count, query, true);
        }
        if node.is_whitespace() {
            return MatchResult::matched_single(0, total_count, query, true);
        }
        return MatchResult {
            result_type: ResultType::UnexpectedExtraNode,
            matched: vec![],
            unmatched: (0..total_count).collect(),
            zero_match: false,
            query: query.to_string(),
            hint: Hints::default(),
        };
    }

    if matches!(node.kind, super::child_node::ChildNodeKind::PreprocessorBlock) {
        return MatchResult::matched_single(0, total_count, query, cond.has_text);
    }

    if node.is_custom() {
        if cond.has_custom {
            return MatchResult::matched_single(0, total_count, query, cond.has_text);
        }
        return match_element_tag(node, query, total_count, spec, &cond);
    }

    // HtmlElement
    match_element_tag(node, query, total_count, spec, &cond)
}

/// Match an element by tag name against a resolved query.
///
/// For simple queries (no `:not()` / `:has()`), uses fast tag-name matching.
/// For complex queries, builds a minimal DOM arena and uses the full CSS selector engine.
fn match_element_tag(
    node: &ChildNodeInfo,
    query: &str,
    total_count: usize,
    spec: &MLMLSpec,
    cond: &Condition,
) -> MatchResult {
    let matched = if cond.resolved_selector.is_empty() {
        false
    } else if needs_full_selector(query) {
        full_selector_match(node, query, spec, cond)
    } else {
        matches_model_ref_with_attrs(spec, node, &cond.resolved_selector)
    };

    if matched {
        MatchResult::matched_single(0, total_count, query, cond.has_text)
    } else if cond.has_text {
        MatchResult {
            result_type: ResultType::UnmatchedSelectorButMayEmpty,
            matched: vec![],
            unmatched: (0..total_count).collect(),
            zero_match: true,
            query: query.to_string(),
            hint: Hints::default(),
        }
    } else {
        MatchResult {
            result_type: ResultType::UnmatchedSelectors,
            matched: vec![],
            unmatched: (0..total_count).collect(),
            zero_match: false,
            query: query.to_string(),
            hint: Hints::default(),
        }
    }
}

/// Like `matches_model_ref` but also checks attribute selectors.
///
/// When a category entry has an attribute selector (e.g., `meta[itemprop]`),
/// the child must have that attribute to match. Without this, `meta` without
/// `itemprop` would incorrectly match `#flow` which includes `meta[itemprop]`.
fn matches_model_ref_with_attrs(spec: &MLMLSpec, child: &ChildNodeInfo, model_ref: &str) -> bool {
    use markuplint_types::spec::content_model;

    // Exact tag match (no category lookup needed)
    if model_ref.eq_ignore_ascii_case(&child.node_name) {
        return true;
    }

    // Namespace prefix: "svg|svg" → "svg"
    if let Some((_ns, local)) = model_ref.split_once('|')
        && local.eq_ignore_ascii_case(&child.node_name)
    {
        return true;
    }

    // Category reference: `:model(category)` or `#category`
    let category = if let Some(rest) = model_ref.strip_prefix(":model(") {
        rest.find(')').map(|pos| format!("#{}", &rest[..pos]))
    } else if model_ref.starts_with('#') {
        Some(model_ref.split(':').next().unwrap_or(model_ref).to_string())
    } else {
        None
    };

    if let Some(cat) = category
        && let Some(tags) = markuplint_types::spec::lookup::get_content_model_tags(spec, &cat)
    {
        return tags.iter().any(|t| {
            // Simple attribute selector: "meta[itemprop]", "a[href]"
            // Pattern: tag_name followed by ONE [attr] without pseudo-classes
            if let Some(bracket_pos) = t.find('[') {
                let tag_part = &t[..bracket_pos];
                // Skip complex selectors like "input:not([type='hidden' i])"
                // — these contain pseudo-classes before `[` and need
                // full selector matching, not simple attribute checks.
                if tag_part.contains(':') {
                    return content_model::matches_model_ref(spec, &child.node_name, t);
                }
                // Handle namespace prefix: "svg|rect[...]" → "rect"
                let tag_name = tag_part.split('|').next_back().unwrap_or(tag_part);
                if !tag_name.eq_ignore_ascii_case(&child.node_name) {
                    return false;
                }
                // Find balanced `]` for the attribute selector
                let close = t[bracket_pos..].find(']').map(|p| bracket_pos + p);
                let Some(close_pos) = close else {
                    return false;
                };
                let attr_part = &t[bracket_pos + 1..close_pos];
                let required_attr = attr_part
                    .split('=')
                    .next()
                    .unwrap_or(attr_part)
                    .trim()
                    .to_ascii_lowercase();
                child.attribute_names.iter().any(|a| a == &required_attr)
            } else {
                // No attribute selector — simple tag match
                content_model::matches_model_ref(spec, &child.node_name, t)
            }
        });
    }

    // Fall back to simple match
    content_model::matches_model_ref(spec, &child.node_name, model_ref)
}

/// Check if a query requires the full CSS selector engine (`:not()`, `:has()`, `:is()`).
///
/// Returns `false` for simple tag names and category references, which use
/// the fast `matches_model_ref()` path instead.
pub(crate) fn needs_full_selector(query: &str) -> bool {
    // Only engage the full engine for queries containing pseudo-class modifiers
    // that can't be handled by simple tag matching.
    query.contains(":not(") || query.contains(":has(") || query.contains(":is(")
}

/// Perform full CSS selector matching by building a minimal arena.
///
/// Expands `:model(category)` to `:is(tag1, tag2, ...)` so the standard
/// CSS selector engine can process it, then matches against a temporary DOM.
fn full_selector_match(node: &ChildNodeInfo, query: &str, spec: &MLMLSpec, cond: &Condition) -> bool {
    // 1. Expand :model(category) references to :is(tag1, tag2, ...)
    let expanded = expand_model_refs(query, spec);

    // 2. Parse the expanded selector
    let Ok(selector) = markuplint_selector::parser::parse(&expanded) else {
        // Parse failure: fall back to simple tag matching
        return markuplint_types::spec::content_model::matches_model_ref(
            spec,
            &node.node_name,
            &cond.resolved_selector,
        );
    };

    // 3. Build a minimal arena with just the node and its children
    let bridge = super::arena_bridge::build_arena("div", std::slice::from_ref(node));

    // 4. The node is the first (and only) child.
    // This should always succeed since we pass exactly one node to build_arena.
    // The else branch is a defensive guard against internal errors.
    let Some(&node_id) = bridge.child_ids.first() else {
        return false;
    };

    // 5. Match using the full selector engine
    markuplint_selector::matcher::matches(&selector, &bridge.arena, node_id, None, None, None)
}

/// Expand `:model(category)` references to `:is(tag1, tag2, ...)`.
///
/// Handles patterns like `:model(phrasing):not(ruby, :has(ruby))` by
/// replacing the `:model(phrasing)` part with the concrete tag list while
/// preserving the rest of the selector. Unknown categories are replaced with
/// `:is(x-never-match)` to ensure they never match instead of panicking.
pub(crate) fn expand_model_refs(query: &str, spec: &MLMLSpec) -> String {
    let mut result = query.to_string();

    // Find and replace all :model(category) occurrences.
    // ":model(" is 7 chars; we find the first ")" to extract the category name.
    // Example: ":model(phrasing):not(ruby)" → category="phrasing", rest=":not(ruby)"
    while let Some(start) = result.find(":model(") {
        let after = &result[start + 7..]; // skip ":model("
        let Some(end) = after.find(')') else { break };
        let category = &after[..end];
        let category_key = format!("#{category}");

        let replacement =
            if let Some(tags) = markuplint_types::spec::lookup::get_content_model_tags(spec, &category_key) {
                let tag_list: Vec<&str> = tags
                    .iter()
                    // Category lists include "#text" and "#custom" pseudo-entries;
                    // these are handled separately by opt_condition's has_text/has_custom flags.
                    .filter(|t| !t.starts_with('#'))
                    // Preserve attribute selectors and pseudo-classes so that
                    // conditional entries like "audio[controls]" or
                    // "input:not([type='hidden' i])" are matched correctly.
                    // Only strip namespace prefixes (e.g., "svg|svg" → "svg").
                    .map(|t| t.split('|').next_back().unwrap_or(t))
                    .filter(|t| !t.is_empty())
                    .collect();
                if tag_list.is_empty() {
                    // Category resolved but contained only #text/#custom — no concrete tags.
                    // Use a tag name that can never match any real element.
                    ":is(x-never-match)".to_string()
                } else {
                    format!(":is({})", tag_list.join(","))
                }
            } else {
                // Unknown category — ensure it never matches.
                ":is(x-never-match)".to_string()
            };

        // Replace ":model(category)" (7 + category.len() + 1 = start+8+end chars) with :is(...)
        let before = &result[..start];
        let after_close = &result[start + 8 + end..];
        result = format!("{before}{replacement}{after_close}");
    }

    result
}

// ============================================================
// Helpers
// ============================================================

/// Collect unmatched nodes from a Collection into an owned Vec.
fn collect_unmatched(collection: &Collection<'_>) -> Vec<ChildNodeInfo> {
    collection.unmatched_nodes().into_iter().cloned().collect()
}

struct Condition {
    resolved_selector: String,
    has_custom: bool,
    has_text: bool,
}

fn opt_condition(query: &str, spec: &MLMLSpec) -> Condition {
    if query == "#custom" {
        return Condition {
            resolved_selector: "#custom".to_string(),
            has_custom: true,
            has_text: false,
        };
    }
    if query == "#text" {
        return Condition {
            resolved_selector: "#text".to_string(),
            has_custom: false,
            has_text: true,
        };
    }

    // `:model(phrasing):not(ruby)` → find first `)` to extract "phrasing"
    let category = if let Some(rest) = query.strip_prefix(":model(") {
        rest.find(')').map(|pos| format!("#{}", &rest[..pos]))
    } else if query.starts_with('#') {
        Some(query.split(':').next().unwrap_or(query).to_string())
    } else {
        None
    };

    let Some(cat) = category else {
        return Condition {
            resolved_selector: query.to_string(),
            has_custom: false,
            has_text: false,
        };
    };

    let tags = lookup::get_content_model_tags(spec, &cat);
    let mut has_custom = false;
    let mut has_text = false;

    if let Some(tags) = tags {
        for tag in tags {
            if tag == "#custom" {
                has_custom = true;
            } else if tag == "#text" {
                has_text = true;
            }
        }
    }

    Condition {
        resolved_selector: query.to_string(),
        has_custom,
        has_text,
    }
}

struct NormalizedModel {
    model: ModelOrPatterns,
    min: usize,
    max: usize,
    missing_type: Option<ResultType>,
}

fn normalize_model(pattern: &PermittedContentPattern) -> NormalizedModel {
    match pattern {
        PermittedContentPattern::Require(p) => {
            let min = p.min.unwrap_or(1) as usize;
            let max = (p.max.unwrap_or(1) as usize).max(min);
            NormalizedModel {
                model: p.require.clone(),
                min,
                max,
                missing_type: Some(ResultType::MissingNodeRequired),
            }
        }
        PermittedContentPattern::Optional(p) => {
            let max = (p.max.unwrap_or(1) as usize).max(1);
            NormalizedModel {
                model: p.optional.clone(),
                min: 0,
                max,
                missing_type: None,
            }
        }
        PermittedContentPattern::OneOrMore(p) => {
            let max = (p.max.unwrap_or(u32::MAX) as usize).max(1);
            NormalizedModel {
                model: p.one_or_more.clone(),
                min: 1,
                max,
                missing_type: Some(ResultType::MissingNodeOneOrMore),
            }
        }
        PermittedContentPattern::ZeroOrMore(p) => {
            let max = (p.max.unwrap_or(u32::MAX) as usize).max(1);
            NormalizedModel {
                model: p.zero_or_more.clone(),
                min: 0,
                max,
                missing_type: None,
            }
        }
        // SAFETY: complex_branch dispatches Choice and Transparent patterns to their
        // own handlers before reaching count_pattern. Only quantified variants arrive here.
        // If a new PermittedContentPattern variant is added, complex_branch must be updated.
        _ => unreachable!("non-quantified pattern reached count_pattern"),
    }
}
