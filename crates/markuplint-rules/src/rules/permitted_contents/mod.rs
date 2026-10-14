//! `permitted-contents` rule: validates element children against HTML spec content models.
//!
//! Rust port of `@markuplint/rules/src/permitted-contents/`.
//!
//! ## TS → Rust correspondence
//!
//! | TS file | Rust function |
//! |---------|---------------|
//! | `start.ts` | [`PermittedContents::verify`] |
//! | `represent-transparent-nodes.ts` | [`represent_transparent_nodes`] |
//! | `order.ts` / matching engine | `matching::validate_content_model` (in `matching.rs`) |
//! | `utils.ts::matches()` | [`matches_transparent_constraint`] |
//! | `index.ts` (message formatting) | inline in `verify()` match arms |
//! | `getContentModel()` conditional eval | [`resolve_content_model`] / [`evaluate_condition`] |
//!
//! ## Known behavioral differences from TS
//!
//! - **`:has()` descent in non-transparent contexts**: When a content model
//!   uses `:has()` (e.g., `address`'s `:not(:has(address))`), the TS engine
//!   reports the deeply nested violator via selector `descendants()` traversal.
//!   Rust reports the intermediate container that fails `:has()`. Both detect
//!   the same violation count; the target element differs.
//! - **Per-element rule config**: TS supports `rule: [{ tag: 'x-container',
//!   contents: [...] }]` for custom element content models. Rust `lint()`
//!   does not yet accept per-element overrides. For the same reason the
//!   pretender `'origin'` mode of TS (issue #3739: a pretended element is also
//!   checked against a user tag rule keyed on its original name) never runs; only
//!   the `'pretended'` mode does.
//! - **`<image>` element**: on the full-Rust path the WHATWG parser rewrites
//!   `<image>` to `<img>`, whereas the MLAST/parse5 path preserves `image`, so
//!   the matched tag name can differ between paths for the same source (see the
//!   `image` arm in `markuplint-html-parser`'s tree construction).
//! - **Framework parser inputs**: the TS suite exercises content-model matching
//!   against JSX/Vue/Svelte/etc. parser output; the Rust suite skips those cases
//!   because only the HTML/MLAST paths are wired up here.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_dom::pretender::PretenderContext;

use crate::slot_content::{content_owner, expand_children, is_content_mutable, slot_content};
use markuplint_types::spec::content_model::{
    self, ContentModel, ContentModelContents, PermittedContentPattern, TransparentPattern,
};
use markuplint_types::spec::types::MLMLSpec;

use crate::content_model::child_node::{ChildNodeInfo, ChildNodeKind};
use crate::content_model::matching::{self, validate_content_model};
use crate::content_model::result::ResultType;
use crate::rule::{Rule, RuleConfig, RuleConfigSet};
use crate::violation::Violation;

pub struct PermittedContents;

impl Rule for PermittedContents {
    fn id(&self) -> &'static str {
        "permitted-contents"
    }

    #[allow(clippy::too_many_lines)]
    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        // `evaluateConditionalChildNodes` is acknowledged for config compat: an HTML
        // document has no conditional child nodes, so it changes nothing here.
        let _evaluate_conditional_child_nodes = config
            .global()
            .options
            .get("evaluateConditionalChildNodes")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false);

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            // TS `contentModel`: with several slot wrappers, which one a given child
            // belongs to is unknown, so the children are not validated.
            if slot_content(arena, node_id).is_some_and(|content| content.wrapper.is_none()) {
                continue;
            }
            // The content model is the content owner's: the single slot wrapper of a
            // pretender, or the element itself.
            let owner_id = content_owner(arena, node_id);
            let Some(owner) = arena.get(owner_id).and_then(DomNode::as_element) else {
                continue;
            };
            let tag_name = &owner.base.node_name;

            let spec_name = spec_lookup_name(&owner.namespace, tag_name);

            let Some(cm) = content_model::get_content_model(spec, &spec_name) else {
                continue; // Unknown element — skip
            };

            let resolved_contents = resolve_content_model(&cm, arena, owner_id);
            let child_ids = expand_children(arena, node_id, arena.child_nodes(node_id));
            // TS `ignoreHasMutableChildren` (default `true`): a required child may be
            // rendered by content the pretender does not know.
            let skip_missing = rule_config
                .options
                .get("ignoreHasMutableChildren")
                .and_then(serde_json::Value::as_bool)
                .unwrap_or(true)
                && is_content_mutable(arena, node_id);

            match &resolved_contents {
                ContentModelContents::Boolean(false) => {
                    // Void element — no content permitted
                    let children = collect_child_infos(arena, &child_ids);
                    let non_empty = children
                        .iter()
                        .any(|c| !matches!(c.kind, ChildNodeKind::Text { is_whitespace: true }));
                    if non_empty {
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            name: None,
                            severity: rule_config.severity,
                            message: "The element disallows contents".to_string(),
                            line: el.base.line,
                            col: el.base.col,
                            raw: el.base.raw.clone(),
                            reason: None,
                            fix: None,
                        });
                    }
                }
                ContentModelContents::Boolean(true) => {
                    // Any content allowed — no check needed
                }
                ContentModelContents::Patterns(patterns) => {
                    // Filter out whitespace-only text nodes before matching,
                    // same as TS: el.childNodes.filter(child => !(child.isTextNode && child.isWhitespace()))
                    let children: Vec<_> = collect_child_infos(arena, &child_ids)
                        .into_iter()
                        .filter(|c| !matches!(c.kind, ChildNodeKind::Text { is_whitespace: true }))
                        .collect();
                    if children.is_empty() && all_optional(patterns) {
                        continue; // Empty is OK when all patterns are optional
                    }

                    // 1. Check own transparent constraint: if THIS element has a
                    //    transparent pattern, verify its children satisfy the constraint.
                    check_own_transparent_constraint(
                        arena,
                        node_id,
                        tag_name,
                        patterns,
                        &children,
                        spec,
                        rule_config,
                        self.id(),
                        &mut violations,
                    );

                    // 2. Resolve transparent child elements for parent content model.
                    let resolved_children = represent_transparent_nodes(arena, &child_ids, spec);

                    let resolved_filtered: Vec<_> = resolved_children
                        .into_iter()
                        .filter(|c| !matches!(c.kind, ChildNodeKind::Text { is_whitespace: true }))
                        .collect();
                    let children_to_validate = if resolved_filtered.is_empty() {
                        &children
                    } else {
                        &resolved_filtered
                    };

                    let result = validate_content_model(spec, patterns, children_to_validate);

                    match result.result_type {
                        ResultType::UnexpectedExtraNode => {
                            if let Some(&idx) = result.unmatched.first() {
                                let child = &children_to_validate[idx];
                                let is_transparent_resolved = child.transparent_ancestor.is_some();
                                let message = if is_transparent_resolved {
                                    format!(
                                        "{} is not allowed in the \"{}\" element through the transparent model in this context",
                                        child_display_name(child),
                                        tag_name,
                                    )
                                } else {
                                    format!(
                                        "{} is not allowed in the \"{}\" element in this context",
                                        child_display_name(child),
                                        tag_name,
                                    )
                                };
                                violations.push(Violation {
                                    rule_id: self.id().to_string(),
                                    name: None,
                                    severity: rule_config.severity,
                                    message,
                                    line: if child.line > 0 { child.line } else { el.base.line },
                                    col: if child.col > 0 { child.col } else { el.base.col },
                                    raw: child.raw.clone(),
                                    reason: None,
                                    fix: None,
                                });
                            }
                        }
                        ResultType::MissingNodeRequired | ResultType::MissingNodeOneOrMore if skip_missing => {}
                        ResultType::MissingNodeRequired => {
                            violations.push(Violation {
                                rule_id: self.id().to_string(),
                                name: None,
                                severity: rule_config.severity,
                                message: format!("Require an element. (Need \"{}\")", result.query),
                                line: el.base.line,
                                col: el.base.col,
                                raw: el.base.raw.clone(),
                                reason: None,
                                fix: None,
                            });
                        }
                        ResultType::MissingNodeOneOrMore => {
                            // Report on the first unmatched child when there is one, else the parent.
                            let (line, col, raw) = if let Some(&idx) = result.unmatched.first() {
                                let child = &children_to_validate[idx];
                                (
                                    if child.line > 0 { child.line } else { el.base.line },
                                    if child.col > 0 { child.col } else { el.base.col },
                                    child.raw.clone(),
                                )
                            } else {
                                (el.base.line, el.base.col, el.base.raw.clone())
                            };
                            violations.push(Violation {
                                rule_id: self.id().to_string(),
                                name: None,
                                severity: rule_config.severity,
                                message: format!("Require one or more elements. (Need \"{}\")", result.query),
                                line,
                                col,
                                raw,
                                reason: None,
                                fix: None,
                            });
                        }
                        ResultType::Nothing => {
                            violations.push(Violation {
                                rule_id: self.id().to_string(),
                                name: None,
                                severity: rule_config.severity,
                                message: "The element disallows contents".to_string(),
                                line: el.base.line,
                                col: el.base.col,
                                raw: el.base.raw.clone(),
                                reason: None,
                                fix: None,
                            });
                        }
                        ResultType::TransparentModelDisallows => {
                            if let Some(&idx) = result.unmatched.first() {
                                let child = &children_to_validate[idx];
                                violations.push(Violation {
                                    rule_id: self.id().to_string(),
                    name: None,
                                    severity: rule_config.severity,
                                    message: format!(
                                        "The \"{tag_name}\" element has a transparent content model but disallows \"{}\" in this context",
                                        child_name(child),
                                    ),
                                    line: if child.line > 0 { child.line } else { el.base.line },
                                    col: if child.col > 0 { child.col } else { el.base.col },
                                    raw: child.raw.clone(),
                                reason: None,
                                fix: None,
                            });
                            }
                        }
                        // Matched/MatchedZero and internal intermediate types
                        _ => {}
                    }
                }
            }
        }

        violations
    }
}

/// - SVG: `svg:tagname` (e.g. `svg:a`, `svg:feBlend`)
/// - `MathML`: `mml:tagname` (e.g. `mml:mfrac`)
/// - HTML: `tagname` (no prefix)
fn spec_lookup_name(namespace: &markuplint_core::mlast::NamespaceURI, tag_name: &str) -> String {
    match namespace {
        markuplint_core::mlast::NamespaceURI::SVG => format!("svg:{tag_name}"),
        markuplint_core::mlast::NamespaceURI::MathML => format!("mml:{tag_name}"),
        _ => tag_name.to_string(),
    }
}

/// Returns the first matching conditional's contents, or the base content model.
///
/// Condition types:
/// - Attribute selectors: `[src]` — element has the attribute
/// - Structural selectors: `dl > div` — parent relationship
fn resolve_content_model(cm: &ContentModel, arena: &DomArena, node_id: NodeId) -> ContentModelContents {
    let Some(ref conditionals) = cm.conditional else {
        return cm.contents.clone();
    };

    let Some(node) = arena.get(node_id) else {
        return cm.contents.clone();
    };
    let Some(el) = node.as_element() else {
        return cm.contents.clone();
    };

    for cond in conditionals {
        if evaluate_condition(&cond.condition, el, arena) {
            return cond.contents.clone();
        }
    }

    cm.contents.clone()
}

/// Evaluate a conditional content model condition against an element.
///
/// Supports:
/// - `[attr]` — element has the attribute
/// - `[attr][attr2]` — element has both attributes
/// - `parent > child` — direct parent name check
/// - `svg|switch > svg|a` — namespace-prefixed parent check
/// - `datalist > [label]` — parent name + attribute check
/// - `label` — bare string (checked as parent name for `option`)
fn evaluate_condition(condition: &str, el: &markuplint_dom::node::ElementData, arena: &DomArena) -> bool {
    let condition = condition.trim();

    if condition.starts_with('[') {
        return check_attr_condition(condition, el);
    }

    // Structural selector of the form `parent > child`.
    if let Some(pos) = condition.find('>') {
        let ancestor_part = condition[..pos].trim();
        let descendant_part = condition[pos + 1..].trim();

        let Some(parent_id) = el.base.parent else {
            return false;
        };
        let Some(parent_node) = arena.get(parent_id) else {
            return false;
        };
        let Some(parent_el) = parent_node.as_element() else {
            return false;
        };

        // Strip any namespace prefix from the parent name (`svg|switch` → `switch`).
        let parent_name = ancestor_part.split('|').next_back().unwrap_or(ancestor_part);
        if !parent_el.base.node_name.eq_ignore_ascii_case(parent_name) {
            return false;
        }

        if descendant_part.starts_with('[') {
            return check_attr_condition(descendant_part, el);
        }

        return true;
    }

    // A bare string is treated as a parent-name check (e.g. `label` for `option`).
    if !condition.is_empty() && !condition.contains('[') {
        if let Some(parent_id) = el.base.parent
            && let Some(parent_node) = arena.get(parent_id)
            && let Some(parent_el) = parent_node.as_element()
        {
            return parent_el.base.node_name.eq_ignore_ascii_case(condition);
        }
        return false;
    }

    false
}

/// Checks attribute presence conditions like `[src]`, `[label][value]`.
fn check_attr_condition(condition: &str, el: &markuplint_dom::node::ElementData) -> bool {
    // Several selectors may be concatenated: `[label][value]` requires both.
    let mut remaining = condition;
    while let Some(start) = remaining.find('[') {
        let Some(end) = remaining[start..].find(']') else {
            break;
        };
        let attr_name = &remaining[start + 1..start + end];
        let attr_name = attr_name.split('=').next().unwrap_or(attr_name).trim();
        let has_attr = el.attributes.iter().any(|a| match a {
            markuplint_core::mlast::MLASTAttr::HTMLAttr(html_attr) => {
                html_attr.name.raw.eq_ignore_ascii_case(attr_name)
            }
            markuplint_core::mlast::MLASTAttr::Spread(_) => false,
        });
        if !has_attr {
            return false;
        }
        remaining = &remaining[start + end + 1..];
    }
    true
}

/// TS `getReportScope`: an element that only the pretender renders (`contents`, a
/// slot wrapper) does not exist in the source, so it is reported on the component
/// that renders it.
fn report_scope(arena: &DomArena, el: &ElementData) -> (u32, u32, String) {
    let scope = match el.pretender_context {
        Some(PretenderContext::Origin { origin }) => arena.get(origin).and_then(DomNode::as_element).unwrap_or(el),
        _ => el,
    };
    (scope.base.line, scope.base.col, scope.base.raw.clone())
}

/// Builds the matching input from `ids`. Element children carry their own
/// descendants (as written) so that `:has()` selectors in the content model can
/// match them.
fn collect_child_infos(arena: &DomArena, ids: &[NodeId]) -> Vec<ChildNodeInfo> {
    let mut result = Vec::new();
    for &child_id in ids {
        let Some(child) = arena.get(child_id) else {
            continue;
        };
        match child {
            DomNode::Element(el) => {
                // Mirrors TS `getPureChildNodes()`, which excludes invalid/bogus nodes
                // (EndTag, Invalid, bogus Text/Comment/PSBlock) from child iteration.
                let grandchildren = collect_child_infos(arena, &arena.pure_children_of(child_id));
                let mut info = element_to_child_info(arena, el);
                info.child_nodes = grandchildren;
                result.push(info);
            }
            DomNode::Text(t) => {
                let raw = &t.base.raw;
                if !raw.is_empty() {
                    let mut info = ChildNodeInfo::text(raw);
                    info.line = t.base.line;
                    info.col = t.base.col;
                    result.push(info);
                }
            }
            DomNode::PSBlock(_) => {
                result.push(ChildNodeInfo::preprocessor_block(
                    &child.base().map_or(String::new(), |b| b.raw.clone()),
                ));
            }
            _ => {} // Skip endtags, comments, doctypes, invalid
        }
    }
    result
}

fn all_optional(patterns: &[PermittedContentPattern]) -> bool {
    patterns.iter().all(|p| match p {
        PermittedContentPattern::ZeroOrMore(_)
        | PermittedContentPattern::Optional(_)
        | PermittedContentPattern::Transparent(_) => true,
        PermittedContentPattern::Choice(c) => c.choice.iter().all(|branch| all_optional(branch)),
        _ => false,
    })
}

/// Formats a child's name for violation messages, matching the TS format.
///
/// - Element: `The "div" element`
/// - Text: `The text node`
/// - Other: `The "name" element`
fn child_display_name(child: &ChildNodeInfo) -> String {
    if child.is_text() {
        "The text node".to_string()
    } else if child.node_name.is_empty() {
        "The node".to_string()
    } else {
        format!("The \"{}\" element", child.node_name)
    }
}

/// Kept for backward compat with transparent error messages (just the bare name).
fn child_name(child: &ChildNodeInfo) -> String {
    if child.is_text() {
        "text node".to_string()
    } else if child.node_name.is_empty() {
        "node".to_string()
    } else {
        child.node_name.clone()
    }
}

/// Check children of an element that has a transparent content model pattern.
///
/// If the element's own patterns include a `transparent` entry, its children
/// that are NOT consumed by non-transparent patterns must satisfy the
/// transparent constraint selector. This handles cases like:
/// - `<a><button></button></a>` — button is interactive, rejected by `<a>`'s constraint
/// - `<audio><audio></audio></audio>` — nested audio rejected by constraint
#[allow(clippy::too_many_arguments)]
fn check_own_transparent_constraint(
    arena: &DomArena,
    node_id: NodeId,
    tag_name: &str,
    patterns: &[PermittedContentPattern],
    children: &[ChildNodeInfo],
    spec: &MLMLSpec,
    config: &RuleConfig,
    rule_id: &str,
    violations: &mut Vec<Violation>,
) {
    let Some(transparent) = find_transparent(patterns) else {
        return;
    };
    let constraint = &transparent.transparent;
    let non_transparent = non_transparent_patterns(patterns);

    let unmatched_children = if non_transparent.is_empty() {
        children.to_vec()
    } else {
        let result = matching::validate_content_model(spec, &non_transparent, children);
        result
            .unmatched
            .iter()
            .filter_map(|&idx| children.get(idx))
            .cloned()
            .collect::<Vec<_>>()
    };

    // Check each unmatched child element against the constraint.
    // If the constraint has :has(), a container may fail because of a
    // descendant. In that case, find the actual violating descendant
    // (matching TS `descendants()` behavior in utils.ts).
    let simple_constraint = strip_has_from_constraint(constraint);

    for child in &unmatched_children {
        if !child.is_element() {
            continue;
        }
        if !matches_transparent_constraint(child, constraint, spec) {
            if constraint.contains(":has(")
                && let Some(violator) = find_deep_violator(arena, node_id, &simple_constraint, spec)
            {
                violations.push(Violation {
                    rule_id: rule_id.to_string(),
                    name: None,
                    severity: config.severity,
                    message: format!(
                        "The \"{tag_name}\" element is a transparent model but also disallows the \"{}\" element in this context",
                        violator.node_name,
                    ),
                    line: violator.line,
                    col: violator.col,
                    raw: violator.raw.clone(),
                reason: None,
                fix: None,
            });
                continue;
            }
            if let Some(parent_el) = arena.get(node_id).and_then(|n| n.as_element()) {
                violations.push(Violation {
                    rule_id: rule_id.to_string(),
                    name: None,
                    severity: config.severity,
                    message: format!(
                        "The \"{tag_name}\" element is a transparent model but also disallows the \"{}\" element in this context",
                        child_name(child),
                    ),
                    line: if child.line > 0 { child.line } else { parent_el.base.line },
                    col: if child.col > 0 { child.col } else { parent_el.base.col },
                    raw: child.raw.clone(),
                reason: None,
                fix: None,
            });
            }
        }
    }
}

/// Strip `:has(...)` from a constraint selector, leaving only the direct checks.
///
/// Example: `:not(:model(interactive), a, [tabindex], :has(:model(interactive), a, [tabindex]))`
/// → `:not(:model(interactive), a, [tabindex])`
fn strip_has_from_constraint(constraint: &str) -> String {
    let mut result = constraint.to_string();
    while let Some(start) = result.find(":has(") {
        let mut depth = 0;
        let mut end = start;
        for (i, ch) in result[start..].char_indices() {
            match ch {
                '(' => depth += 1,
                ')' => {
                    depth -= 1;
                    if depth == 0 {
                        end = start + i + 1;
                        break;
                    }
                }
                _ => {}
            }
        }
        // Also consume an adjacent separating `, ` so the remaining list stays valid.
        let before = if start > 0 && result[..start].ends_with(", ") {
            start - 2
        } else {
            start
        };
        let after = if end < result.len() && result[end..].starts_with(", ") {
            end + 2
        } else {
            end
        };
        result = format!("{}{}", &result[..before], &result[after..]);
    }
    result
}

/// Returns the first descendant that directly violates the constraint, evaluated
/// without `:has()`.
fn find_deep_violator(
    arena: &DomArena,
    node_id: NodeId,
    simple_constraint: &str,
    spec: &MLMLSpec,
) -> Option<ChildNodeInfo> {
    let children_ids = arena.children_of(node_id)?.to_vec();
    for child_id in children_ids {
        let Some(child_node) = arena.get(child_id) else {
            continue; // Skip missing nodes, don't abort sibling traversal
        };
        if let Some(child_el) = child_node.as_element() {
            let info = element_to_child_info(arena, child_el);
            if !matches_transparent_constraint(&info, simple_constraint, spec) {
                return Some(info);
            }
            if let Some(violator) = find_deep_violator(arena, child_id, simple_constraint, spec) {
                return Some(violator);
            }
        }
    }
    None
}

fn find_transparent(patterns: &[PermittedContentPattern]) -> Option<&TransparentPattern> {
    patterns.iter().find_map(|p| match p {
        PermittedContentPattern::Transparent(t) => Some(t),
        _ => None,
    })
}

fn non_transparent_patterns(patterns: &[PermittedContentPattern]) -> Vec<PermittedContentPattern> {
    patterns
        .iter()
        .filter(|p| !matches!(p, PermittedContentPattern::Transparent(_)))
        .cloned()
        .collect()
}

/// Check if a child element matches a transparent constraint selector.
///
/// The constraint is a CSS selector like `:not(:model(interactive), a, [tabindex])`.
/// For the wildcard `"*"`, everything matches.
/// For complex selectors containing `:not()`, `:has()`, or `:model()`, uses the
/// full CSS selector engine via `arena_bridge`.
fn matches_transparent_constraint(child: &ChildNodeInfo, constraint: &str, spec: &MLMLSpec) -> bool {
    if constraint == "*" {
        return true;
    }

    if matching::needs_full_selector(constraint) || constraint.contains(":model(") {
        let expanded = matching::expand_model_refs(constraint, spec);
        let Ok(selector) = markuplint_selector::parser::parse(&expanded) else {
            #[cfg(debug_assertions)]
            eprintln!(
                "[permitted-contents] selector parse failure for constraint: {constraint} (expanded: {expanded})"
            );
            return true; // Parse failure — be permissive
        };

        let bridge = crate::content_model::arena_bridge::build_arena("div", std::slice::from_ref(child));

        let Some(&node_id) = bridge.child_ids.first() else {
            return true;
        };

        return markuplint_selector::matcher::matches(&selector, &bridge.arena, node_id, None, None, None);
    }

    content_model::matches_model_ref(spec, &child.node_name, constraint)
}

/// Resolve transparent content model elements by replacing them with their children.
///
/// For each child of the parent element:
/// - If the child has a transparent content model, its children are checked against
///   the non-transparent patterns and the transparent constraint selector.
/// - Children that match non-transparent patterns are consumed (like `<source>` in `<audio>`).
/// - Remaining children are checked against the constraint; failures produce errors.
/// - The transparent element is replaced by its surviving children in the output.
///
/// Returns the flattened children with transparent elements expanded.
#[allow(clippy::too_many_lines)]
fn represent_transparent_nodes(arena: &DomArena, children_ids: &[NodeId], spec: &MLMLSpec) -> Vec<ChildNodeInfo> {
    if children_ids.is_empty() {
        return vec![];
    }

    // Check if any child has a transparent content model — early exit if none
    let has_any_transparent = children_ids.iter().any(|&cid| {
        let Some(child) = arena.get(cid) else {
            return false;
        };
        let Some(el) = child.as_element() else {
            return false;
        };
        let lookup = spec_lookup_name(&el.namespace, &el.base.node_name);
        let Some(cm) = content_model::get_content_model(spec, &lookup) else {
            return false;
        };
        let resolved = resolve_content_model(&cm, arena, cid);
        if let ContentModelContents::Patterns(patterns) = &resolved {
            find_transparent(patterns).is_some()
        } else {
            false
        }
    });

    if !has_any_transparent {
        return collect_child_infos(arena, children_ids);
    }

    let mut result_children: Vec<ChildNodeInfo> = Vec::new();

    for &child_id in children_ids {
        let Some(child_node) = arena.get(child_id) else {
            continue;
        };

        let Some(child_el) = child_node.as_element() else {
            let info = node_to_child_info(child_node);
            if let Some(info) = info {
                result_children.push(info);
            }
            continue;
        };

        let child_lookup = spec_lookup_name(&child_el.namespace, &child_el.base.node_name);
        let child_cm = content_model::get_content_model(spec, &child_lookup);
        let child_resolved = child_cm.as_ref().map(|cm| resolve_content_model(cm, arena, child_id));

        let is_transparent = child_resolved.as_ref().is_some_and(|contents| {
            if let ContentModelContents::Patterns(patterns) = contents {
                find_transparent(patterns).is_some()
            } else {
                false
            }
        });

        // TS `representTransparentNodes`: a component whose children sit in an inner
        // wrapper (or in one of several) is not looked through; only the wrapper
        // decides what the given children may be.
        let opaque_pretender = slot_content(arena, child_id)
            .is_some_and(|content| content.wrapper.is_none() || content_owner(arena, child_id) != child_id);
        if !is_transparent || opaque_pretender {
            result_children.push(element_to_child_info(arena, child_el));
            continue;
        }

        let ContentModelContents::Patterns(child_patterns) = child_resolved.unwrap() else {
            result_children.push(element_to_child_info(arena, child_el));
            continue;
        };
        let non_transparent = non_transparent_patterns(&child_patterns);

        // Whitespace is filtered out before matching, as in TS.
        let expanded = expand_children(arena, child_id, arena.child_nodes(child_id));
        let grandchildren: Vec<_> = collect_child_infos(arena, &expanded)
            .into_iter()
            .filter(|c| !matches!(c.kind, ChildNodeKind::Text { is_whitespace: true }))
            .collect();

        if grandchildren.is_empty() {
            // Transparent element with no children — effectively empty
            continue;
        }

        let unmatched = if non_transparent.is_empty() {
            grandchildren.clone()
        } else {
            let match_result = matching::validate_content_model(spec, &non_transparent, &grandchildren);
            match_result
                .unmatched
                .iter()
                .filter_map(|&idx| grandchildren.get(idx))
                .cloned()
                .collect::<Vec<_>>()
        };

        // Add unmatched children to the result (marked as transparent-resolved).
        // Constraint violations are detected by check_own_transparent_constraint
        // on the transparent element itself, NOT here — avoiding duplicate reports.
        for grandchild in &unmatched {
            let mut resolved = grandchild.clone();
            resolved.transparent_ancestor = Some(child_el.base.node_name.to_ascii_lowercase());
            result_children.push(resolved);
        }
    }

    result_children
}

fn node_to_child_info(node: &DomNode) -> Option<ChildNodeInfo> {
    match node {
        DomNode::Text(t) => {
            let raw = &t.base.raw;
            if raw.is_empty() {
                return None;
            }
            let mut info = ChildNodeInfo::text(raw);
            info.line = t.base.line;
            info.col = t.base.col;
            Some(info)
        }
        DomNode::PSBlock(_) => {
            let raw = node.base().map_or(String::new(), |b| b.raw.clone());
            Some(ChildNodeInfo::preprocessor_block(&raw))
        }
        _ => None, // Skip comments, doctypes, invalid
    }
}

/// The matching input for one element, positioned where it is reported
/// ([`report_scope`]).
fn element_to_child_info(arena: &DomArena, el: &ElementData) -> ChildNodeInfo {
    let kind = match el.element_type {
        markuplint_core::mlast::ElementType::Html => ChildNodeKind::HtmlElement,
        markuplint_core::mlast::ElementType::WebComponent => ChildNodeKind::WebComponent,
        markuplint_core::mlast::ElementType::Authored => ChildNodeKind::AuthoredElement,
    };
    let (line, col, raw) = report_scope(arena, el);
    ChildNodeInfo {
        kind,
        node_name: el.base.node_name.to_ascii_lowercase(),
        raw,
        line,
        col,
        child_nodes: vec![],
        attribute_names: extract_attribute_names(&el.attributes),
        transparent_ancestor: None,
    }
}

fn extract_attribute_names(attrs: &[markuplint_core::mlast::MLASTAttr]) -> Vec<String> {
    attrs
        .iter()
        .filter_map(|a| match a {
            markuplint_core::mlast::MLASTAttr::HTMLAttr(html_attr) => Some(html_attr.node_name.to_ascii_lowercase()),
            markuplint_core::mlast::MLASTAttr::Spread(_) => None,
        })
        .collect()
}

#[cfg(test)]
mod tests;
