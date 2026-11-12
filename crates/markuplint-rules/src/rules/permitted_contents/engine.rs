//! The evaluation of the children of an element against its content model: a port of `start.ts`,
//! `order.ts`, `choice.ts`, `complex-branch.ts`, `count-pattern.ts`, `recursive-branch.ts`,
//! `transparent.ts`, `represent-transparent-nodes.ts` and `matches-selector.ts` of
//! `@markuplint/rules/src/permitted-contents`, whose `JSDoc` carries the reasoning of each step.

use std::rc::Rc;

use markuplint_core::mlast::ElementType;
use markuplint_dom::arena::NodeId;
use markuplint_dom::node::DomNode;
use markuplint_selector::extended::content_model_first_child_base;
use markuplint_selector::matcher;
use markuplint_types::spec::content_model::{
    ChoicePattern, ContentModelContents, ModelOrPatterns, PermittedContentPattern,
};

use super::context::{Collection, ContentModelResult, Ctx, Hints, MatchResult, Mode, ResultType};

/// TS `contentModel`.
pub(super) fn content_model(ctx: &Ctx<'_>, el: NodeId) -> Vec<ContentModelResult> {
    // Several slot wrappers: which one a given child belongs to is unknown.
    if ctx.slot_content(el).is_some_and(|content| content.wrapper.is_none()) {
        return Vec::new();
    }
    let Some(model) = ctx.resolve_content_model(ctx.content_owner(el)) else {
        return Vec::new();
    };
    let ignore_unresolved_components = ctx.options.ignore_has_mutable_children && !ctx.has_user_tag_rule(el);
    start(ctx, &model, el, ignore_unresolved_components)
}

/// TS `start`.
fn start(
    ctx: &Ctx<'_>,
    contents: &ContentModelContents,
    el: NodeId,
    ignore_unresolved_components: bool,
) -> Vec<ContentModelResult> {
    let evaluate_conditional = ctx.options.evaluate_conditional_child_nodes;
    let given_patterns = if evaluate_conditional {
        ctx.arena.conditional_child_nodes(el)
    } else {
        vec![ctx.arena.child_nodes(el)]
    };
    // A model that is `false` does not allow a component either: what it renders may be anything
    let ignores_components = ignore_unresolved_components && matches!(contents, ContentModelContents::Patterns(_));
    let is_ignored_component =
        |child: NodeId| ignores_components && ctx.is_element(child) && ctx.is_unresolved_component(child);

    let mut results = Vec::new();
    for given in given_patterns {
        let expanded = ctx.expand_children(el, &given);
        // Per pattern: a conditional branch without a component is evaluated as it is written
        let has_ignored_components = expanded.iter().any(|&child| is_ignored_component(child));
        let child_nodes: Vec<NodeId> = expanded
            .into_iter()
            .filter(|&child| !ctx.is_comment(child) && !is_ignored_component(child))
            .filter(|&child| evaluate_conditional || !ctx.is_whitespace_text(child))
            .collect();
        let evaluated = evaluate(ctx, contents, el, &child_nodes);
        if has_ignored_components {
            results.extend(evaluated.into_iter().filter(|result| !result.ty.is_missing()));
        } else {
            results.extend(evaluated);
        }
    }
    results
}

fn evaluate(
    ctx: &Ctx<'_>,
    contents: &ContentModelContents,
    el: NodeId,
    child_nodes: &[NodeId],
) -> Vec<ContentModelResult> {
    let patterns = match contents {
        ContentModelContents::Boolean(false) => {
            if child_nodes.is_empty() {
                return Vec::new();
            }
            return vec![ContentModelResult {
                ty: ResultType::Nothing,
                scope: el,
                query: ":not(*)".to_string(),
                hint: Hints::default(),
            }];
        }
        ContentModelContents::Boolean(true) => return Vec::new(),
        ContentModelContents::Patterns(patterns) => patterns,
    };

    let mut results = Vec::new();
    for TransparentNode { nodes, errors } in represent_transparent_nodes(ctx, child_nodes) {
        let result = order(ctx, patterns, &nodes);
        let scope = if result.ty.is_missing() {
            el
        } else {
            result.unmatched.first().copied().unwrap_or(el)
        };
        results.push(ContentModelResult {
            ty: result.ty,
            scope,
            query: result.query,
            hint: result.hint,
        });
        for error in errors {
            results.push(ContentModelResult {
                ty: error.ty,
                scope: error.unmatched.first().copied().unwrap_or(el),
                query: error.query,
                hint: error.hint,
            });
        }
    }
    results
}

/// TS `order`.
pub(super) fn order(ctx: &Ctx<'_>, contents: &[PermittedContentPattern], child_nodes: &[NodeId]) -> MatchResult {
    let mut collection = Collection::new(child_nodes);
    let mut last: Option<MatchResult> = None;
    let mut backtrack_mode = false;
    let mut after_backtrack = false;
    let mut unmatched_results: Vec<MatchResult> = Vec::new();

    let mut index = 0;
    while let Some(pattern) = contents.get(index) {
        let result = complex_branch(ctx, pattern, &collection.unmatched());
        collection.add_matched(&result.matched);
        last = Some(result.clone());

        if !matches!(
            result.ty,
            ResultType::UnexpectedExtraNode | ResultType::Matched | ResultType::MatchedZero
        ) {
            unmatched_results.push(result);

            if backtrack_mode {
                collection.back();
                backtrack_mode = false;
                after_backtrack = true;
                continue;
            }

            // The first of those that matched the most
            let mut barely = &unmatched_results[0];
            for candidate in &unmatched_results[1..] {
                if candidate.matched.len() > barely.matched.len() {
                    barely = candidate;
                }
            }

            let matched = collection.matched();
            let hint = Hints::merge(&barely.hint, Hints::with_missing(matched.len()));
            return MatchResult {
                ty: barely.ty,
                matched,
                unmatched: collection.unmatched(),
                zero_match: barely.zero_match,
                query: barely.query.clone(),
                hint,
            };
        }

        if after_backtrack {
            collection.lock();
            after_backtrack = false;
        }

        backtrack_mode = result.zero_match;
        index += 1;
    }

    let (query, hint) = last.map_or_else(|| ("N/A".to_string(), Hints::default()), |r| (r.query, r.hint));
    let unmatched = collection.unmatched();
    let matched = collection.matched();
    let ty = if !unmatched.is_empty() {
        ResultType::UnexpectedExtraNode
    } else if matched.is_empty() {
        ResultType::MatchedZero
    } else {
        ResultType::Matched
    };
    MatchResult {
        ty,
        matched,
        unmatched,
        zero_match: false,
        query,
        hint,
    }
}

/// TS `complexBranch`.
fn complex_branch(ctx: &Ctx<'_>, pattern: &PermittedContentPattern, child_nodes: &[NodeId]) -> MatchResult {
    match pattern {
        PermittedContentPattern::Choice(choice_pattern) => choice(ctx, choice_pattern, child_nodes),
        PermittedContentPattern::Transparent(_) => transparent(child_nodes),
        _ => count_pattern(ctx, pattern, child_nodes),
    }
}

/// TS `choice`.
pub(super) fn choice(ctx: &Ctx<'_>, pattern: &ChoicePattern, child_nodes: &[NodeId]) -> MatchResult {
    let mut collection = Collection::new(child_nodes);
    let mut unmatched_results: Vec<MatchResult> = Vec::new();

    for some in &pattern.choice {
        let result = order(ctx, some, &collection.unmatched());
        if result.ty.is_matched() || (result.ty == ResultType::UnexpectedExtraNode && !result.matched.is_empty()) {
            return result;
        }
        collection.add_matched(&result.matched);
        unmatched_results.push(result);
    }

    // The unexpected node first, then the one that matched the most, then the one that came the
    // closest; the first of equals.
    let key = |r: &MatchResult| {
        (
            r.ty == ResultType::UnexpectedExtraNode,
            r.matched.len(),
            r.hint.barely_matched_elements(),
        )
    };
    let Some(mut barely) = unmatched_results.first() else {
        return MatchResult {
            ty: ResultType::MatchedZero,
            matched: Vec::new(),
            unmatched: collection.unmatched(),
            zero_match: true,
            query: "N/A".to_string(),
            hint: Hints::default(),
        };
    };
    for candidate in &unmatched_results[1..] {
        if key(candidate) > key(barely) {
            barely = candidate;
        }
    }

    MatchResult {
        ty: barely.ty,
        matched: collection.matched(),
        unmatched: collection.unmatched(),
        zero_match: barely.zero_match,
        query: barely.query.clone(),
        hint: barely.hint.clone(),
    }
}

/// TS `transparent`.
///
/// TS tells a transparent element nested in another from the root of a component only for its
/// debug log: both take every child.
fn transparent(child_nodes: &[NodeId]) -> MatchResult {
    let empty = child_nodes.is_empty();
    MatchResult {
        ty: if empty {
            ResultType::MatchedZero
        } else {
            ResultType::Matched
        },
        matched: child_nodes.to_vec(),
        unmatched: Vec::new(),
        zero_match: empty,
        query: "transparent".to_string(),
        hint: Hints::default(),
    }
}

/// TS `normalizeModel`.
struct Normalized<'p> {
    model: &'p ModelOrPatterns,
    min: usize,
    /// `None` for no limit.
    max: Option<usize>,
    missing_type: Option<ResultType>,
}

fn normalize_model(pattern: &PermittedContentPattern) -> Option<Normalized<'_>> {
    let to_usize = |n: u32| usize::try_from(n).unwrap_or(usize::MAX);
    Some(match pattern {
        PermittedContentPattern::Require(p) => {
            let min = p.min.map_or(1, to_usize);
            Normalized {
                model: &p.require,
                min,
                max: Some(p.max.map_or(1, to_usize).max(min)),
                missing_type: Some(ResultType::MissingNodeRequired),
            }
        }
        PermittedContentPattern::Optional(p) => Normalized {
            model: &p.optional,
            min: 0,
            max: Some(p.max.map_or(1, to_usize).max(1)),
            missing_type: None,
        },
        PermittedContentPattern::OneOrMore(p) => Normalized {
            model: &p.one_or_more,
            min: 1,
            max: p.max.map(|max| to_usize(max).max(1)),
            missing_type: Some(ResultType::MissingNodeOneOrMore),
        },
        PermittedContentPattern::ZeroOrMore(p) => Normalized {
            model: &p.zero_or_more,
            min: 0,
            max: p.max.map(|max| to_usize(max).max(1)),
            missing_type: None,
        },
        PermittedContentPattern::Choice(_) | PermittedContentPattern::Transparent(_) => return None,
    })
}

/// TS `countPattern`.
pub(super) fn count_pattern(ctx: &Ctx<'_>, pattern: &PermittedContentPattern, child_nodes: &[NodeId]) -> MatchResult {
    let Some(Normalized {
        model,
        min,
        max,
        missing_type,
    }) = normalize_model(pattern)
    else {
        return order(ctx, &[], child_nodes);
    };
    let mut collection = Collection::new(child_nodes);
    let mut prev_result: Option<MatchResult> = None;
    let mut barely_result: Option<MatchResult> = None;

    loop {
        let result = recursive_branch(ctx, model, &collection.unmatched());
        let added = collection.add_matched(&result.matched);

        let current = |collection: &Collection, ty: ResultType, zero_match: bool, hint: Hints| MatchResult {
            ty,
            matched: collection.matched(),
            unmatched: collection.unmatched(),
            zero_match,
            query: result.query.clone(),
            hint,
        };

        if result.ty == ResultType::UnmatchedSelectorButMayEmpty {
            return compare_result(
                current(&collection, ResultType::MatchedZero, true, result.hint.clone()),
                barely_result,
            );
        }

        if let Some(max) = max
            && max < collection.matched_count()
        {
            collection.max(max);
            let hint = Hints::merge(
                &result.hint,
                Hints {
                    max: Some(max),
                    ..Hints::default()
                },
            );
            return compare_result(
                current(&collection, ResultType::UnexpectedExtraNode, result.zero_match, hint),
                barely_result,
            );
        }

        if let Some(prev) = prev_result {
            if result.ty.is_missing_or_disallowed() {
                return compare_result(
                    current(&collection, result.ty, result.zero_match, result.hint.clone()),
                    barely_result,
                );
            }
            return compare_result(prev, barely_result);
        }

        if added && !collection.unmatched().is_empty() {
            if result.ty != ResultType::MissingNode && result.ty != ResultType::UnmatchedSelectors {
                barely_result = Some(current(&collection, result.ty, result.zero_match, result.hint.clone()));
            }
            continue;
        }

        let matched_len = collection.matched_count();
        if matched_len + usize::from(result.zero_match) < min {
            let ty = if result.ty.is_missing_or_disallowed() {
                result.ty
            } else {
                missing_type.unwrap_or(ResultType::MissingNodeRequired)
            };
            let hint = Hints::merge(&result.hint, Hints::with_missing(matched_len));
            return compare_result(current(&collection, ty, result.zero_match, hint), barely_result);
        }

        let ty = if matched_len == 0 {
            ResultType::MatchedZero
        } else {
            ResultType::Matched
        };
        let zero_match = result.zero_match || min == 0 || ty == ResultType::MatchedZero;
        let hint = Hints::merge(&result.hint, Hints::with_missing(matched_len));
        let matched_result = current(&collection, ty, zero_match, hint);

        if !collection.unmatched().is_empty() {
            prev_result = Some(matched_result);
            continue;
        }

        // When min=0 and no elements were consumed, the pattern matched zero times: the failure of
        // the inner sequence is not propagated (`zeroOrMore([oneOrMore dt, oneOrMore dd])` accepts
        // `<dl></dl>`, #3592).
        if (matched_len > 0 || min > 0) && result.ty.is_missing_or_disallowed() {
            return compare_result(
                current(&collection, result.ty, result.zero_match, result.hint.clone()),
                barely_result,
            );
        }

        return compare_result(matched_result, barely_result);
    }
}

/// TS `compereResult`.
fn compare_result(a: MatchResult, b: Option<MatchResult>) -> MatchResult {
    let Some(b) = b else {
        return a;
    };
    if matches!(
        a.ty,
        ResultType::Matched | ResultType::MatchedZero | ResultType::UnexpectedExtraNode
    ) {
        return a;
    }
    if b.hint.barely_matched_elements() > a.hint.barely_matched_elements() {
        b
    } else {
        a
    }
}

/// TS `recursiveBranch`.
pub(super) fn recursive_branch(ctx: &Ctx<'_>, model: &ModelOrPatterns, child_nodes: &[NodeId]) -> MatchResult {
    let queries = match model {
        ModelOrPatterns::Patterns(patterns) => return order(ctx, patterns, child_nodes),
        // `[]` is not a model (TS `isModel`) but an empty sequence of patterns
        ModelOrPatterns::MultipleStrings(queries) if queries.is_empty() => return order(ctx, &[], child_nodes),
        ModelOrPatterns::Single(query) => {
            return matches_selector(ctx, query, child_nodes.first().copied());
        }
        ModelOrPatterns::MultipleStrings(queries) => queries,
    };

    let mut collection = Collection::new(child_nodes);
    let mut last_unmatched: Option<MatchResult> = None;
    for query in queries {
        let result = matches_selector(ctx, query, collection.unmatched().first().copied());
        collection.add_matched(&result.matched);
        let combined = MatchResult {
            ty: result.ty,
            matched: collection.matched(),
            unmatched: collection.unmatched(),
            zero_match: result.zero_match,
            query: result.query,
            hint: result.hint,
        };
        if combined.ty.is_matched() {
            return combined;
        }
        last_unmatched = Some(combined);
    }
    last_unmatched.unwrap_or_else(|| order(ctx, &[], child_nodes))
}

// -------------------------------------------------------------------------------------------
// Transparent content models (TS `represent-transparent-nodes.ts`)
// -------------------------------------------------------------------------------------------

/// TS `TransparentNode`.
struct TransparentNode {
    nodes: Vec<NodeId>,
    errors: Vec<MatchResult>,
}

/// A node of a pattern of TS `representTransparentNodes`, or an error found on the way.
#[derive(Clone)]
enum Item {
    Node(NodeId),
    Error(MatchResult),
}

/// TS `MAX_PATTERNS`: beyond it, the children of every branch are merged into every pattern,
/// which may miss a violation but never reports one that is not there (#3249).
const MAX_PATTERNS: usize = 1024;

/// TS `representTransparentNodes`.
fn represent_transparent_nodes(ctx: &Ctx<'_>, child_nodes: &[NodeId]) -> Vec<TransparentNode> {
    let parent_results = match child_nodes.first().and_then(|&first| ctx.parent_element(first)) {
        Some(parent) => represent_transparent_nodes(ctx, &[parent]),
        None => vec![TransparentNode {
            nodes: Vec::new(),
            errors: Vec::new(),
        }],
    };

    let mut patterns: Vec<Vec<Item>> = vec![Vec::new()];

    for &child in child_nodes {
        if !ctx.is_element(child) {
            for pattern in &mut patterns {
                pattern.push(Item::Node(child));
            }
            continue;
        }
        let Some(branch_groups) = transparent_branch_groups(ctx, child) else {
            for pattern in &mut patterns {
                pattern.push(Item::Node(child));
            }
            continue;
        };

        // The transparent element itself is still a child of the parent and is evaluated
        // against the parent's content model, once per pattern (#3928).
        if branch_groups.len() == 1 {
            for pattern in &mut patterns {
                pattern.push(Item::Node(child));
                pattern.extend(branch_groups[0].iter().cloned());
            }
        } else if patterns.len() * branch_groups.len() <= MAX_PATTERNS {
            let mut next = Vec::with_capacity(patterns.len() * branch_groups.len());
            for pattern in &patterns {
                for group in &branch_groups {
                    let mut p = pattern.clone();
                    p.push(Item::Node(child));
                    p.extend(group.iter().cloned());
                    next.push(p);
                }
            }
            patterns = next;
        } else {
            for pattern in &mut patterns {
                pattern.push(Item::Node(child));
                pattern.extend(branch_groups.iter().flatten().cloned());
            }
        }
    }

    parent_results
        .into_iter()
        .flat_map(|parent_result| {
            if patterns.is_empty() {
                return vec![TransparentNode {
                    nodes: Vec::new(),
                    errors: parent_result.errors,
                }];
            }
            patterns
                .iter()
                .map(|pattern| {
                    let mut nodes = Vec::new();
                    let mut errors = parent_result.errors.clone();
                    for item in pattern {
                        match item {
                            Item::Node(node) => nodes.push(*node),
                            Item::Error(error) => errors.push(error.clone()),
                        }
                    }
                    TransparentNode { nodes, errors }
                })
                .collect()
        })
        .collect()
}

/// TS `transparentBranchGroups`.
fn transparent_branch_groups(ctx: &Ctx<'_>, child: NodeId) -> Option<Vec<Vec<Item>>> {
    // A component whose children sit inside an inner wrapper element (or one of several) is not
    // looked through: the children belong to the wrapper.
    if ctx
        .slot_content(child)
        .is_some_and(|content| content.wrapper.is_none() || ctx.content_owner(child) != child)
    {
        return None;
    }

    let ContentModelContents::Patterns(models) = ctx.resolve_content_model(child)? else {
        return None;
    };
    let transparent_query = models.iter().find_map(|m| match m {
        PermittedContentPattern::Transparent(t) => Some(t.transparent.clone()),
        _ => None,
    })?;
    let no_transparent_models: Vec<PermittedContentPattern> = models
        .iter()
        .filter(|m| !matches!(m, PermittedContentPattern::Transparent(_)))
        .cloned()
        .collect();

    let child_nodes_patterns: Vec<Vec<NodeId>> = if ctx.options.evaluate_conditional_child_nodes {
        ctx.arena
            .conditional_child_nodes(child)
            .into_iter()
            .map(|nodes| {
                ctx.expand_children(child, &nodes)
                    .into_iter()
                    .filter(|&n| !ctx.is_comment(n))
                    .collect()
            })
            .collect()
    } else {
        vec![
            ctx.expand_children(child, &ctx.arena.child_nodes(child))
                .into_iter()
                .filter(|&n| !ctx.is_comment(n) && !ctx.is_whitespace_text(n))
                .collect(),
        ]
    };

    let mut branch_groups = Vec::new();
    for branch_child_nodes in child_nodes_patterns {
        let unmatched = if no_transparent_models.is_empty() {
            Collection::new(&branch_child_nodes).unmatched()
        } else {
            order(ctx, &no_transparent_models, &branch_child_nodes).unmatched
        };

        let mut branch_children = Vec::new();
        for node in unmatched {
            if !ctx.transparent_mode.borrow_mut().insert(node) {
                continue;
            }
            if ctx.is_element(node) {
                let (matched, not) = matches(ctx, &transparent_query, node);
                if !matched {
                    branch_children.push(Item::Error(MatchResult {
                        ty: ResultType::TransparentModelDisallows,
                        matched: Vec::new(),
                        unmatched: vec![child],
                        zero_match: false,
                        query: transparent_query.clone(),
                        hint: Hints {
                            not,
                            transparent: Some(child),
                            ..Hints::default()
                        },
                    }));
                    continue;
                }
                branch_children.push(Item::Node(node));
                if let Some(nested) = transparent_branch_groups(ctx, node) {
                    branch_children.extend(nested.into_iter().flatten());
                }
                continue;
            }
            branch_children.push(Item::Node(node));
        }
        branch_groups.push(branch_children);
    }
    Some(branch_groups)
}

// -------------------------------------------------------------------------------------------
// Selectors (TS `matches-selector.ts` and `matches` of `utils.ts`)
// -------------------------------------------------------------------------------------------

/// TS `Condition`.
pub(super) struct Condition {
    selector: String,
    selector_as_first_child: Option<String>,
    has_custom: bool,
    has_text: bool,
    has_non_empty_text: bool,
}

/// TS `matches` of `utils.ts`: whether the node matches the selector as TS `search` reads it, and
/// what makes it fail when it does not. In `Origin` mode the pretender of the node is hidden.
pub(super) fn matches(ctx: &Ctx<'_>, selector: &str, node: NodeId) -> (bool, Option<NodeId>) {
    let Some(list) = ctx.selector(selector) else {
        return (false, None);
    };
    let original = ctx.mode == Mode::Origin;
    if matcher::matches_identity(&list, ctx.arena, node, Some(ctx.spec), original) {
        return (true, None);
    }
    (
        false,
        matcher::unmatched_not_node(&list, ctx.arena, node, Some(ctx.spec), original),
    )
}

/// TS `isTreatedAsCustom`.
fn is_treated_as_custom(ctx: &Ctx<'_>, node: NodeId) -> bool {
    let Some(el) = ctx.element(node) else {
        return false;
    };
    if ctx.mode == Mode::Pretended && el.pretended().is_some() {
        return matches!(el.element_type, ElementType::Authored) || el.base.node_name.contains('-');
    }
    !matches!(el.identity(true).element_type, ElementType::Html)
}

/// TS `optCondition`.
fn opt_condition(ctx: &Ctx<'_>, query: &str) -> Rc<Condition> {
    if let Some(cached) = ctx.caches.conditions.borrow().get(query) {
        return Rc::clone(cached);
    }
    let condition = Rc::new(build_condition(ctx, query));
    ctx.caches
        .conditions
        .borrow_mut()
        .insert(query.to_string(), Rc::clone(&condition));
    condition
}

fn build_condition(ctx: &Ctx<'_>, query: &str) -> Condition {
    match query {
        "#custom" | "#text" | "#nonEmptyText" => {
            return Condition {
                selector: query.to_string(),
                selector_as_first_child: None,
                has_custom: query == "#custom",
                has_text: query == "#text",
                has_non_empty_text: query == "#nonEmptyText",
            };
        }
        _ => {}
    }

    // TS `/^:model\(([^)]+)\)|^#([a-z-]+)/`
    let category = if let Some(rest) = query.strip_prefix(":model(") {
        rest.find(')')
            .filter(|&end| end > 0)
            .map(|end| (&rest[..end], ":model(".len() + end + 1))
    } else if let Some(rest) = query.strip_prefix('#') {
        let len = rest
            .bytes()
            .take_while(|b| b.is_ascii_lowercase() || *b == b'-')
            .count();
        (len > 0).then(|| (&rest[..len], 1 + len))
    } else {
        None
    };

    let mut condition = Condition {
        selector: query.to_string(),
        selector_as_first_child: None,
        has_custom: false,
        has_text: false,
        has_non_empty_text: false,
    };
    let Some((name, matched_len)) = category else {
        return condition;
    };
    let rest = &query[matched_len..];
    let tag = format!("#{name}");
    if tag == "#nonEmptyText" {
        condition.has_non_empty_text = true;
        condition.selector = rest.to_string();
        return condition;
    }

    let mut selectors = Vec::new();
    let mut first_child_bases = Vec::new();
    for entry in category_to_tag_names(ctx, &tag) {
        match entry.as_str() {
            "#custom" => condition.has_custom = true,
            "#text" => condition.has_text = true,
            _ => {
                if let Some(base) = content_model_first_child_base(&entry) {
                    first_child_bases.push(base.to_string());
                } else if markuplint_selector::parser::parse(&entry).is_ok() {
                    // An entry the selector parser rejects covers no element (as for `:model()`)
                    // rather than making the whole list unreadable.
                    selectors.push(entry);
                }
            }
        }
    }
    condition.selector = format!(":is({}){rest}", selectors.join(","));
    if !first_child_bases.is_empty() {
        condition.selector_as_first_child = Some(format!(":is({}){rest}", first_child_bases.join(",")));
    }
    condition
}

/// TS `contentModelCategoryToTagNames`: the entries of a category, sorted.
fn category_to_tag_names(ctx: &Ctx<'_>, tag: &str) -> Vec<String> {
    let models = &ctx.spec.def.content_models;
    let entries = models.get(tag).or_else(|| {
        models
            .iter()
            .find(|(key, _)| key.eq_ignore_ascii_case(tag))
            .map(|(_, entries)| entries)
    });
    let mut entries = entries.cloned().unwrap_or_default();
    entries.sort();
    entries
}

/// TS `matchesSelector`.
fn matches_selector(ctx: &Ctx<'_>, query: &str, child: Option<NodeId>) -> MatchResult {
    let condition = opt_condition(ctx, query);
    let result =
        |ty: ResultType, matched: Vec<NodeId>, unmatched: Vec<NodeId>, zero_match: bool, hint: Hints| MatchResult {
            ty,
            matched,
            unmatched,
            zero_match,
            query: query.to_string(),
            hint,
        };

    let Some(child) = child else {
        if condition.has_text {
            return result(ResultType::MatchedZero, Vec::new(), Vec::new(), true, Hints::default());
        }
        // #nonEmptyText requires actual non-empty text — a missing node is not acceptable
        return result(ResultType::MissingNode, Vec::new(), Vec::new(), false, Hints::default());
    };

    match ctx.arena.get(child) {
        Some(DomNode::Text(text)) => {
            let whitespace = matcher::is_inter_element_whitespace(&text.base.raw);
            if condition.has_non_empty_text {
                if whitespace {
                    return result(ResultType::MissingNode, Vec::new(), Vec::new(), false, Hints::default());
                }
                return result(ResultType::Matched, vec![child], Vec::new(), false, Hints::default());
            }
            if condition.has_text || whitespace {
                return result(ResultType::Matched, vec![child], Vec::new(), true, Hints::default());
            }
            // Disallows a text node
            result(
                ResultType::UnexpectedExtraNode,
                Vec::new(),
                vec![child],
                false,
                Hints::default(),
            )
        }
        Some(DomNode::PSBlock(_)) => result(
            ResultType::Matched,
            vec![child],
            Vec::new(),
            condition.has_text || condition.has_non_empty_text,
            Hints::default(),
        ),
        Some(DomNode::Element(_)) => {
            if condition.has_custom && is_treated_as_custom(ctx, child) {
                return result(
                    ResultType::Matched,
                    vec![child],
                    Vec::new(),
                    condition.has_text,
                    Hints::default(),
                );
            }
            let (mut matched, mut not) = matches(ctx, &condition.selector, child);
            // The siblings are looked at only for an element that the rest does not take.
            if !matched
                && let Some(as_first_child) = &condition.selector_as_first_child
                && matcher::is_content_model_first_child(ctx.arena, child)
            {
                (matched, not) = matches(ctx, as_first_child, child);
            }
            if matched {
                return result(
                    ResultType::Matched,
                    vec![child],
                    Vec::new(),
                    condition.has_text,
                    Hints::default(),
                );
            }
            let hint = Hints {
                not,
                ..Hints::default()
            };
            if condition.has_text {
                return result(
                    ResultType::UnmatchedSelectorButMayEmpty,
                    Vec::new(),
                    vec![child],
                    true,
                    hint,
                );
            }
            result(ResultType::UnmatchedSelectors, Vec::new(), vec![child], false, hint)
        }
        _ => result(
            ResultType::Matched,
            vec![child],
            Vec::new(),
            condition.has_text,
            Hints::default(),
        ),
    }
}
