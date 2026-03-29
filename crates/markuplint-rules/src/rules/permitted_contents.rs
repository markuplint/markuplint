//! `permitted-contents` rule: validates element children against HTML spec content models.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
use markuplint_types::spec::content_model::{
    self, ContentModel, ContentModelContents, PermittedContentPattern, TransparentPattern,
};
use markuplint_types::spec::types::MLMLSpec;

use crate::content_model::child_node::{ChildNodeInfo, ChildNodeKind};
use crate::content_model::matching::{self, validate_content_model};
use crate::content_model::result::ResultType;
use crate::rule::{Rule, RuleConfig};
use crate::violation::Violation;

/// The `permitted-contents` rule.
pub struct PermittedContents;

impl Rule for PermittedContents {
    fn id(&self) -> &'static str {
        "permitted-contents"
    }

    #[allow(clippy::too_many_lines)]
    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let tag_name = &el.base.node_name;

            // Build namespace-prefixed spec lookup name
            let spec_name = spec_lookup_name(&el.namespace, tag_name);

            // Get content model from spec
            let Some(cm) = content_model::get_content_model(spec, &spec_name) else {
                continue; // Unknown element — skip
            };

            // Evaluate conditional content model overrides
            let resolved_contents = resolve_content_model(&cm, arena, node_id);

            match &resolved_contents {
                ContentModelContents::Boolean(false) => {
                    // Void element — no content permitted
                    let children = collect_child_nodes(arena, node_id);
                    let non_empty = children
                        .iter()
                        .any(|c| !matches!(c.kind, ChildNodeKind::Text { is_whitespace: true }));
                    if non_empty {
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            severity: config.severity.clone(),
                            message: format!("The \"{tag_name}\" element must not have contents"),
                            line: el.base.line,
                            col: el.base.col,
                            raw: el.base.raw.clone(),
                        });
                    }
                }
                ContentModelContents::Boolean(true) => {
                    // Any content allowed — no check needed
                }
                ContentModelContents::Patterns(patterns) => {
                    // Filter out whitespace-only text nodes before matching,
                    // same as TS: el.childNodes.filter(child => !(child.isTextNode && child.isWhitespace()))
                    let children: Vec<_> = collect_child_nodes(arena, node_id)
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
                        config,
                        self.id(),
                        &mut violations,
                    );

                    // 2. Resolve transparent child elements for parent content model.
                    let (resolved_children, transparent_errors) =
                        represent_transparent_nodes(arena, node_id, patterns, spec);

                    // Report transparent model violations
                    for te in transparent_errors {
                        violations.push(Violation {
                            rule_id: self.id().to_string(),
                            severity: config.severity.clone(),
                            message: te.message,
                            line: te.line,
                            col: te.col,
                            raw: te.raw,
                        });
                    }

                    // Filter whitespace from resolved children too
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
                            // Find the first unmatched child
                            if let Some(&idx) = result.unmatched.first() {
                                let child = &children_to_validate[idx];
                                // Check if this child was resolved from a transparent element
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
                                    severity: config.severity.clone(),
                                    message,
                                    line: if child.line > 0 { child.line } else { el.base.line },
                                    col: if child.col > 0 { child.col } else { el.base.col },
                                    raw: child.raw.clone(),
                                });
                            }
                        }
                        ResultType::MissingNodeRequired => {
                            violations.push(Violation {
                                rule_id: self.id().to_string(),
                                severity: config.severity.clone(),
                                message: format!(
                                    "Require an element. (Need \"{}\")",
                                    result.query,
                                ),
                                line: el.base.line,
                                col: el.base.col,
                                raw: el.base.raw.clone(),
                            });
                        }
                        ResultType::MissingNodeOneOrMore => {
                            // Scope: first unmatched child if available, else parent
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
                                severity: config.severity.clone(),
                                message: format!(
                                    "Require one or more elements. (Need \"{}\")",
                                    result.query,
                                ),
                                line,
                                col,
                                raw,
                            });
                        }
                        ResultType::Nothing => {
                            violations.push(Violation {
                                rule_id: self.id().to_string(),
                                severity: config.severity.clone(),
                                message: "The element disallows contents".to_string(),
                                line: el.base.line,
                                col: el.base.col,
                                raw: el.base.raw.clone(),
                            });
                        }
                        ResultType::TransparentModelDisallows => {
                            if let Some(&idx) = result.unmatched.first() {
                                let child = &children_to_validate[idx];
                                violations.push(Violation {
                                    rule_id: self.id().to_string(),
                                    severity: config.severity.clone(),
                                    message: format!(
                                        "The \"{tag_name}\" element has a transparent content model but disallows \"{}\" in this context",
                                        child_name(child),
                                    ),
                                    line: if child.line > 0 { child.line } else { el.base.line },
                                    col: if child.col > 0 { child.col } else { el.base.col },
                                    raw: child.raw.clone(),
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

/// Build the spec lookup name for an element, prefixing with namespace if needed.
///
/// - SVG: `svg:tagname` (e.g., `svg:a`, `svg:feBlend`)
/// - `MathML`: `math:tagname` (e.g., `math:mfrac`)
/// - HTML: `tagname` (no prefix)
fn spec_lookup_name(namespace: &markuplint_core::mlast::NamespaceURI, tag_name: &str) -> String {
    match namespace {
        markuplint_core::mlast::NamespaceURI::SVG => format!("svg:{tag_name}"),
        markuplint_core::mlast::NamespaceURI::MathML => format!("math:{tag_name}"),
        _ => tag_name.to_string(),
    }
}

/// Evaluate conditional content model overrides.
///
/// Checks each conditional's CSS selector condition against the element's
/// attributes and structural position. Returns the first matching condition's
/// contents, or falls back to the base content model.
///
/// Condition types:
/// - Attribute selectors: `[src]` — element has the attribute
/// - Structural selectors: `dl > div` — parent relationship
fn resolve_content_model(
    cm: &ContentModel,
    arena: &DomArena,
    node_id: NodeId,
) -> ContentModelContents {
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
/// - `parent > child` — direct parent name check
fn evaluate_condition(
    condition: &str,
    el: &markuplint_dom::node::ElementData,
    arena: &DomArena,
) -> bool {
    let condition = condition.trim();

    // Attribute selector: [attr] or [attr=value]
    if condition.starts_with('[') && condition.ends_with(']') {
        let inner = &condition[1..condition.len() - 1];
        // Simple presence check: [src]
        let attr_name = inner.split('=').next().unwrap_or(inner).trim();
        return el.attributes.iter().any(|a| match a {
            markuplint_core::mlast::MLASTAttr::HTMLAttr(html_attr) => {
                html_attr.name.raw.eq_ignore_ascii_case(attr_name)
            }
            markuplint_core::mlast::MLASTAttr::Spread(_) => false,
        });
    }

    // Structural selector: "parent > child" (direct child combinator)
    if let Some(pos) = condition.find('>') {
        let parent_sel = condition[..pos].trim();
        let _child_sel = condition[pos + 1..].trim();
        // Check if parent element matches parent_sel
        if let Some(parent_id) = el.base.parent
            && let Some(parent_node) = arena.get(parent_id)
            && let Some(parent_el) = parent_node.as_element()
        {
            return parent_el
                .base
                .node_name
                .eq_ignore_ascii_case(parent_sel);
        }
        return false;
    }

    false
}

/// Convert `DomArena` children of an element to `ChildNodeInfo` vec.
///
/// Recursively populates `child_nodes` for element children so that
/// `:has()` selectors in the content model can match descendants.
fn collect_child_nodes(arena: &DomArena, parent_id: NodeId) -> Vec<ChildNodeInfo> {
    let Some(children) = arena.children_of(parent_id) else {
        return vec![];
    };
    // Copy to avoid borrow conflicts during recursion
    let children: Vec<NodeId> = children.to_vec();

    let mut result = Vec::new();
    for child_id in children {
        let Some(child) = arena.get(child_id) else {
            continue;
        };
        match child {
            DomNode::Element(el) => {
                let kind = match el.element_type {
                    markuplint_core::mlast::ElementType::Html => ChildNodeKind::HtmlElement,
                    markuplint_core::mlast::ElementType::WebComponent => ChildNodeKind::WebComponent,
                    markuplint_core::mlast::ElementType::Authored => ChildNodeKind::AuthoredElement,
                };
                // Recursively collect descendants for :has() support
                let grandchildren = collect_child_nodes(arena, child_id);
                result.push(ChildNodeInfo {
                    kind,
                    node_name: el.base.node_name.to_ascii_lowercase(),
                    raw: el.base.raw.clone(),
                    line: el.base.line,
                    col: el.base.col,
                    child_nodes: grandchildren,
                    transparent_ancestor: None,
                });
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

/// Check if all patterns are optional (zeroOrMore, optional, or choice with all-optional branches).
fn all_optional(patterns: &[PermittedContentPattern]) -> bool {
    patterns.iter().all(|p| match p {
        PermittedContentPattern::ZeroOrMore(_) | PermittedContentPattern::Optional(_) => true,
        PermittedContentPattern::Choice(c) => c.choice.iter().all(|branch| all_optional(branch)),
        _ => false,
    })
}

/// Get a display name for a child node.
/// Format a child's name for violation messages, matching TS format.
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

    // Find which children are not consumed by non-transparent patterns
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
            // If constraint contains :has(), find the actual violating descendant
            if constraint.contains(":has(")
                && let Some(violator) = find_deep_violator(arena, node_id, &simple_constraint, spec)
            {
                violations.push(Violation {
                    rule_id: rule_id.to_string(),
                    severity: config.severity.clone(),
                    message: format!(
                        "The \"{tag_name}\" element is a transparent model but also disallows the \"{}\" element in this context",
                        violator.node_name,
                    ),
                    line: violator.line,
                    col: violator.col,
                    raw: violator.raw.clone(),
                });
                continue;
            }
            if let Some(parent_el) = arena.get(node_id).and_then(|n| n.as_element()) {
                violations.push(Violation {
                    rule_id: rule_id.to_string(),
                    severity: config.severity.clone(),
                    message: format!(
                        "The \"{tag_name}\" element is a transparent model but also disallows the \"{}\" element in this context",
                        child_name(child),
                    ),
                    line: if child.line > 0 { child.line } else { parent_el.base.line },
                    col: if child.col > 0 { child.col } else { parent_el.base.col },
                    raw: child.raw.clone(),
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
    // Find :has( and remove it along with its balanced parentheses
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
        // Remove ", :has(...)" or ":has(...), " or just ":has(...)"
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

/// Find the deepest descendant that fails the simple constraint (without `:has()`).
///
/// Walks all descendants of the transparent element and returns the first
/// element that directly violates the constraint.
fn find_deep_violator(
    arena: &DomArena,
    node_id: NodeId,
    simple_constraint: &str,
    spec: &MLMLSpec,
) -> Option<ChildNodeInfo> {
    let children_ids = arena.children_of(node_id)?.to_vec();
    for child_id in children_ids {
        let child_node = arena.get(child_id)?;
        if let Some(child_el) = child_node.as_element() {
            let info = element_to_child_info(child_el);
            if !matches_transparent_constraint(&info, simple_constraint, spec) {
                return Some(info);
            }
            // Recurse into descendants
            if let Some(violator) = find_deep_violator(arena, child_id, simple_constraint, spec) {
                return Some(violator);
            }
        }
    }
    None
}

/// A transparent model violation detected during resolution.
struct TransparentError {
    message: String,
    line: u32,
    col: u32,
    raw: String,
}

/// Check if a pattern is a `TransparentPattern`.
fn find_transparent(patterns: &[PermittedContentPattern]) -> Option<&TransparentPattern> {
    patterns.iter().find_map(|p| match p {
        PermittedContentPattern::Transparent(t) => Some(t),
        _ => None,
    })
}

/// Get the non-transparent patterns from a content model.
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
fn matches_transparent_constraint(
    child: &ChildNodeInfo,
    constraint: &str,
    spec: &MLMLSpec,
) -> bool {
    // Wildcard — everything is allowed
    if constraint == "*" {
        return true;
    }

    // For complex selectors, use the full selector engine
    if matching::needs_full_selector(constraint) || constraint.contains(":model(") {
        let expanded = matching::expand_model_refs(constraint, spec);
        let Ok(selector) = markuplint_selector::parser::parse(&expanded) else {
            return true; // Parse failure — be permissive
        };

        let bridge =
            crate::content_model::arena_bridge::build_arena("div", std::slice::from_ref(child));

        let Some(&node_id) = bridge.child_ids.first() else {
            return true;
        };

        return markuplint_selector::matcher::matches(
            &selector,
            &bridge.arena,
            node_id,
            None,
            None,
        );
    }

    // Simple selector: exact tag name or category
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
/// Returns `(flattened_children, transparent_errors)`.
#[allow(clippy::too_many_lines)]
fn represent_transparent_nodes(
    arena: &DomArena,
    parent_id: NodeId,
    _parent_patterns: &[PermittedContentPattern],
    spec: &MLMLSpec,
) -> (Vec<ChildNodeInfo>, Vec<TransparentError>) {
    let Some(children_ids) = arena.children_of(parent_id) else {
        return (vec![], vec![]);
    };
    let children_ids: Vec<NodeId> = children_ids.to_vec();

    if children_ids.is_empty() {
        return (vec![], vec![]);
    }

    // Check if any child has a transparent content model — early exit if none
    let has_any_transparent = children_ids.iter().any(|&cid| {
        let Some(child) = arena.get(cid) else {
            return false;
        };
        let Some(el) = child.as_element() else {
            return false;
        };
        let Some(cm) = content_model::get_content_model(spec, &el.base.node_name) else {
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
        return (collect_child_nodes(arena, parent_id), vec![]);
    }

    let mut result_children: Vec<ChildNodeInfo> = Vec::new();
    let errors: Vec<TransparentError> = Vec::new();

    for &child_id in &children_ids {
        let Some(child_node) = arena.get(child_id) else {
            continue;
        };

        // Non-element nodes pass through
        let Some(child_el) = child_node.as_element() else {
            // Convert non-element to ChildNodeInfo
            let info = node_to_child_info(child_node);
            if let Some(info) = info {
                result_children.push(info);
            }
            continue;
        };

        // Get the child element's content model (with conditional evaluation)
        let child_cm = content_model::get_content_model(spec, &child_el.base.node_name);
        let child_resolved = child_cm
            .as_ref()
            .map(|cm| resolve_content_model(cm, arena, child_id));

        let is_transparent = child_resolved.as_ref().is_some_and(|contents| {
            if let ContentModelContents::Patterns(patterns) = contents {
                find_transparent(patterns).is_some()
            } else {
                false
            }
        });

        if !is_transparent {
            result_children.push(element_to_child_info(child_el));
            continue;
        }

        // This child is transparent — resolve it using the resolved content model
        let ContentModelContents::Patterns(child_patterns) = child_resolved.unwrap() else {
            result_children.push(element_to_child_info(child_el));
            continue;
        };
        // constraint is checked by check_own_transparent_constraint, not here
        let _ = find_transparent(&child_patterns).unwrap();
        let non_transparent = non_transparent_patterns(&child_patterns);

        // Collect the transparent element's children (filter whitespace, like TS)
        let grandchildren: Vec<_> = collect_child_nodes(arena, child_id)
            .into_iter()
            .filter(|c| !matches!(c.kind, ChildNodeKind::Text { is_whitespace: true }))
            .collect();

        if grandchildren.is_empty() {
            // Transparent element with no children — effectively empty
            continue;
        }

        // Run non-transparent patterns against grandchildren to find what's consumed
        let unmatched = if non_transparent.is_empty() {
            grandchildren.clone()
        } else {
            let match_result =
                matching::validate_content_model(spec, &non_transparent, &grandchildren);
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
            resolved.transparent_ancestor =
                Some(child_el.base.node_name.to_ascii_lowercase());
            result_children.push(resolved);
        }
    }

    (result_children, errors)
}

/// Convert a `DomNode` (non-element) to a `ChildNodeInfo`, if applicable.
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

/// Convert an `ElementData` to a `ChildNodeInfo`.
fn element_to_child_info(el: &markuplint_dom::node::ElementData) -> ChildNodeInfo {
    let kind = match el.element_type {
        markuplint_core::mlast::ElementType::Html => ChildNodeKind::HtmlElement,
        markuplint_core::mlast::ElementType::WebComponent => ChildNodeKind::WebComponent,
        markuplint_core::mlast::ElementType::Authored => ChildNodeKind::AuthoredElement,
    };
    ChildNodeInfo {
        kind,
        node_name: el.base.node_name.to_ascii_lowercase(),
        raw: el.base.raw.clone(),
        line: el.base.line,
        col: el.base.col,
        child_nodes: vec![],
        transparent_ancestor: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rules::attr_duplication::tests::make_element_with_attrs;
    use markuplint_core::mlast::{ElementType, MLASTHTMLAttr, MLASTToken, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, ElementData, NodeBase, TextData};
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    fn make_parent_children(parent_tag: &str, children: &[(&str, &[(&str, &str)])]) -> (DomArena, NodeId) {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let parent_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "parent".to_string(),
                raw: format!("<{parent_tag}>"),
                offset: 0,
                line: 1,
                col: 1,
                node_name: parent_tag.to_string(),
                parent: Some(doc_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: vec![],
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(parent_id) {
            e.base.id = parent_id;
        }

        let mut child_ids = vec![];
        for (tag, _attrs) in children {
            let cid = builder.push(DomNode::Element(ElementData {
                base: NodeBase {
                    id: 0,
                    uuid: format!("child-{tag}"),
                    raw: format!("<{tag}>"),
                    offset: 0,
                    line: 1,
                    col: 1,
                    node_name: tag.to_string(),
                    parent: Some(parent_id),
                    children: vec![],
                    next_sibling: None,
                    prev_sibling: None,
                    depth: 2,
                },
                namespace: NamespaceURI::XHTML,
                element_type: ElementType::Html,
                is_fragment: false,
                attributes: vec![],
                has_spread_attr: false,
                block_behavior: None,
                pair_node_id: None,
                tag_open_char: "<".to_string(),
                tag_close_char: ">".to_string(),
                is_ghost: false,
            }));
            if let Some(DomNode::Element(e)) = builder.get_mut(cid) {
                e.base.id = cid;
            }
            child_ids.push(cid);
        }

        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![parent_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(parent_id) {
            e.base.children = child_ids;
        }
        (builder.finish(), parent_id)
    }

    #[test]
    fn ul_with_li_is_valid() {
        let s = spec();
        let (arena, _) = make_parent_children("ul", &[("li", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        // ul permits li — no violation on ul
        let ul_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<ul>")).collect();
        assert!(ul_violations.is_empty(), "ul > li should be valid");
    }

    #[test]
    fn ul_with_div_is_invalid() {
        let s = spec();
        let (arena, _) = make_parent_children("ul", &[("div", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let v: Vec<_> = violations
            .iter()
            .filter(|v| v.rule_id == "permitted-contents" && v.message.contains("ul"))
            .collect();
        assert!(!v.is_empty(), "ul > div should be invalid");
        assert!(v[0].raw.contains("<div>"), "raw should point to the invalid child");
    }

    #[test]
    fn head_requires_title() {
        let s = spec();
        let (arena, _) = make_parent_children("head", &[("meta", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let head_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<head>")).collect();
        assert!(!head_violations.is_empty(), "head without title should report missing");
    }

    #[test]
    fn head_with_title_is_valid() {
        let s = spec();
        let (arena, _) = make_parent_children("head", &[("title", &[]), ("meta", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let head_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<head>")).collect();
        assert!(head_violations.is_empty(), "head with title should be valid");
    }

    #[test]
    fn br_void_with_no_children() {
        let s = spec();
        let (arena, _) = make_parent_children("div", &[("br", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let br_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<br>")).collect();
        assert!(br_violations.is_empty(), "empty br should be valid");
    }

    #[test]
    fn select_with_option_valid() {
        let s = spec();
        let (arena, _) = make_parent_children("select", &[("option", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let select_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<select>")).collect();
        assert!(select_violations.is_empty(), "select > option should be valid");
    }

    #[test]
    fn table_with_tbody_valid() {
        let s = spec();
        let (arena, _) = make_parent_children("table", &[("tbody", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let table_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<table>")).collect();
        assert!(table_violations.is_empty(), "table > tbody should be valid");
    }

    #[test]
    fn ul_multiple_li_valid() {
        let s = spec();
        let (arena, _) = make_parent_children("ul", &[("li", &[]), ("li", &[]), ("li", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<ul>")).collect();
        assert!(v.is_empty(), "ul > li*3 should be valid");
    }

    #[test]
    fn ul_mixed_valid_invalid() {
        let s = spec();
        let (arena, _) = make_parent_children("ul", &[("li", &[]), ("div", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let v: Vec<_> = violations
            .iter()
            .filter(|v| v.rule_id == "permitted-contents" && v.message.contains("ul"))
            .collect();
        assert!(!v.is_empty(), "ul > li + div should report div as invalid");
    }

    #[test]
    fn dl_dt_dd_valid() {
        let s = spec();
        let (arena, _) = make_parent_children("dl", &[("dt", &[]), ("dd", &[]), ("dt", &[]), ("dd", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<dl>")).collect();
        assert!(v.is_empty(), "dl > dt+dd repeated should be valid");
    }

    #[test]
    fn details_requires_summary() {
        let s = spec();
        let (arena, _) = make_parent_children("details", &[("p", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<details>")).collect();
        assert!(!v.is_empty(), "details without summary should report missing");
    }

    // --- Boolean(true) path ---

    #[test]
    fn div_allows_any_content() {
        let s = spec();
        let (arena, _) = make_parent_children("div", &[("p", &[]), ("span", &[]), ("a", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<div>")).collect();
        assert!(v.is_empty(), "div allows any flow content");
    }

    // --- Violation message content ---

    #[test]
    fn violation_message_contains_element_names() {
        let s = spec();
        let (arena, _) = make_parent_children("ul", &[("div", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<div>")).collect();
        assert!(!v.is_empty(), "should have violation");
        assert!(
            v[0].message.contains("div"),
            "message should mention the invalid child: {}",
            v[0].message
        );
        assert!(
            v[0].message.contains("ul"),
            "message should mention the parent: {}",
            v[0].message
        );
    }

    #[test]
    fn missing_required_message_contains_query() {
        let s = spec();
        let (arena, _) = make_parent_children("head", &[("meta", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<head>")).collect();
        assert!(!v.is_empty(), "should have violation");
        assert!(
            v[0].message.contains("Require"),
            "message should indicate requirement: {}",
            v[0].message
        );
        assert!(
            v[0].message.contains("Need"),
            "message should contain Need: {}",
            v[0].message
        );
    }

    // --- Violation location accuracy ---

    #[test]
    fn unexpected_child_violation_points_to_child() {
        let s = spec();
        let (arena, _) = make_parent_children("ul", &[("div", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let v: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("not allowed"))
            .collect();
        assert!(!v.is_empty(), "should have violation");
        // raw should point to the child element, not the parent
        assert!(
            v[0].raw.contains("<div>"),
            "raw should be the invalid child, got: {}",
            v[0].raw
        );
    }

    #[test]
    fn missing_required_violation_points_to_parent() {
        let s = spec();
        let (arena, _) = make_parent_children("head", &[("meta", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let v: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("Require"))
            .collect();
        assert!(!v.is_empty(), "should have violation");
        // raw should point to the parent (where content is missing)
        assert!(
            v[0].raw.contains("<head>"),
            "raw should be the parent, got: {}",
            v[0].raw
        );
    }

    // --- Low-risk edge case verification ---

    /// all_optional with nested Choice: empty content should be valid
    /// when all branches are optional. (Covers recursive all_optional.)
    #[test]
    fn empty_select_with_optional_choice_valid() {
        // select has zeroOrMore(option|optgroup|hr|script-supporting) — all optional
        let s = spec();
        let (arena, _) = make_parent_children("select", &[]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let v: Vec<_> = violations
            .iter()
            .filter(|v| v.rule_id == "permitted-contents" && v.message.contains("select"))
            .collect();
        assert!(v.is_empty(), "empty select should be valid (all patterns optional)");
    }

    /// all_optional with required content: empty MUST fail.
    #[test]
    fn empty_details_requires_summary_fails() {
        // details requires summary + flow — not all optional
        let s = spec();
        let (arena, _) = make_parent_children("details", &[]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let v: Vec<_> = violations
            .iter()
            .filter(|v| v.rule_id == "permitted-contents" && v.message.contains("Require"))
            .collect();
        assert!(!v.is_empty(), "empty details should fail (summary required)");
    }

    /// SVG elements in #flow use namespace prefix "svg|svg" in spec data.
    /// matches_model_ref now handles namespace prefixes, so svg is recognized.
    #[test]
    fn svg_namespace_resolved() {
        let s = spec();
        let (arena, _) = make_parent_children("div", &[("svg", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let v: Vec<_> = violations
            .iter()
            .filter(|v| v.rule_id == "permitted-contents" && v.message.contains("div"))
            .collect();
        assert!(v.is_empty(), "svg should be recognized as flow content via namespace prefix");
    }

    /// SVG spec element (svg:svg): content model lookup uses prefixed name.
    #[test]
    fn svg_prefixed_name_has_content_model() {
        let s = spec();
        // Spec registers SVG as "svg:svg", not "svg"
        let cm = content_model::get_content_model(&s, "svg:svg");
        assert!(cm.is_some(), "svg:svg should have content model in spec");
    }

    /// Void element with whitespace-only text: should pass (no real content).
    #[test]
    fn void_element_whitespace_only_valid() {
        // br is void — whitespace-only text children should be ignored
        let s = spec();
        // Can't easily add text children with make_parent_children,
        // so test that br with no children passes (covered by br_void_with_no_children)
        // and verify the whitespace filter logic directly
        let children = vec![ChildNodeInfo::text("  \n  ")];
        let non_empty = children
            .iter()
            .any(|c| !matches!(c.kind, ChildNodeKind::Text { is_whitespace: true }));
        assert!(!non_empty, "whitespace-only text should not count as content");
    }

    /// Void element with real text content: should fail.
    #[test]
    fn void_element_with_text_is_non_empty() {
        let children = vec![ChildNodeInfo::text("hello")];
        let non_empty = children
            .iter()
            .any(|c| !matches!(c.kind, ChildNodeKind::Text { is_whitespace: true }));
        assert!(non_empty, "non-whitespace text should count as content");
    }

    /// Debug: transparent constraint matching for button against :not(:model(interactive), ...)
    #[test]
    fn debug_transparent_constraint_button() {
        let s = spec();
        let constraint =
            ":not(:model(interactive), a, [tabindex], :has(:model(interactive), a, [tabindex]))";

        // Expand :model refs
        let expanded = crate::content_model::matching::expand_model_refs(constraint, &s);
        eprintln!("Expanded: {expanded}");

        // Parse
        let selector = markuplint_selector::parser::parse(&expanded).unwrap();

        // Build a mini arena with button
        let child = ChildNodeInfo::element("button");
        let bridge =
            crate::content_model::arena_bridge::build_arena("div", std::slice::from_ref(&child));
        let node_id = bridge.child_ids[0];

        let result =
            markuplint_selector::matcher::matches(&selector, &bridge.arena, node_id, None, None);
        eprintln!("button matches constraint: {result}");
        // button is interactive → :not(interactive) should be false
        assert!(
            !result,
            "button should NOT match :not(:model(interactive), ...)"
        );
    }
}
