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
//!   does not yet accept per-element overrides.
//! - **`<image>` element**: on the full-Rust path the WHATWG parser rewrites
//!   `<image>` to `<img>`, whereas the MLAST/parse5 path preserves `image`, so
//!   the matched tag name can differ between paths for the same source (see the
//!   `image` arm in `markuplint-html-parser`'s tree construction).
//! - **Framework parser inputs**: the TS suite exercises content-model matching
//!   against JSX/Vue/Svelte/etc. parser output; the Rust suite skips those cases
//!   because only the HTML/MLAST paths are wired up here.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
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

        // Read framework-only options (no-op for static HTML, but acknowledged for config compat)
        let _ignore_has_mutable_children = config
            .global()
            .options
            .get("ignoreHasMutableChildren")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false);
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
            let tag_name = &el.base.node_name;

            let spec_name = spec_lookup_name(&el.namespace, tag_name);

            let Some(cm) = content_model::get_content_model(spec, &spec_name) else {
                continue; // Unknown element — skip
            };

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
                            name: None,
                            severity: rule_config.severity,
                            message: "The element disallows contents".to_string(),
                            line: el.base.line,
                            col: el.base.col,
                            raw: el.base.raw.clone(),
                            reason: None,
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
                        rule_config,
                        self.id(),
                        &mut violations,
                    );

                    // 2. Resolve transparent child elements for parent content model.
                    let resolved_children = represent_transparent_nodes(arena, node_id, spec);

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
                                });
                            }
                        }
                        ResultType::MissingNodeRequired => {
                            violations.push(Violation {
                                rule_id: self.id().to_string(),
                                name: None,
                                severity: rule_config.severity,
                                message: format!("Require an element. (Need \"{}\")", result.query,),
                                line: el.base.line,
                                col: el.base.col,
                                raw: el.base.raw.clone(),
                                reason: None,
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
                                message: format!("Require one or more elements. (Need \"{}\")", result.query,),
                                line,
                                col,
                                raw,
                                reason: None,
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

/// Recursively populates `child_nodes` for element children so that
/// `:has()` selectors in the content model can match descendants.
fn collect_child_nodes(arena: &DomArena, parent_id: NodeId) -> Vec<ChildNodeInfo> {
    // Mirrors TS `getPureChildNodes()`, which excludes invalid/bogus nodes
    // (EndTag, Invalid, bogus Text/Comment/PSBlock) from child iteration.
    let children: Vec<NodeId> = arena.pure_children_of(parent_id);

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
                // Collect attribute names for attribute-qualified matching
                let attribute_names = extract_attribute_names(&el.attributes);
                result.push(ChildNodeInfo {
                    kind,
                    node_name: el.base.node_name.to_ascii_lowercase(),
                    raw: el.base.raw.clone(),
                    line: el.base.line,
                    col: el.base.col,
                    child_nodes: grandchildren,
                    attribute_names,
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
            let info = element_to_child_info(child_el);
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
fn represent_transparent_nodes(arena: &DomArena, parent_id: NodeId, spec: &MLMLSpec) -> Vec<ChildNodeInfo> {
    let Some(children_ids) = arena.children_of(parent_id) else {
        return vec![];
    };
    let children_ids: Vec<NodeId> = children_ids.to_vec();

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
        return collect_child_nodes(arena, parent_id);
    }

    let mut result_children: Vec<ChildNodeInfo> = Vec::new();

    for &child_id in &children_ids {
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

        if !is_transparent {
            result_children.push(element_to_child_info(child_el));
            continue;
        }

        let ContentModelContents::Patterns(child_patterns) = child_resolved.unwrap() else {
            result_children.push(element_to_child_info(child_el));
            continue;
        };
        let non_transparent = non_transparent_patterns(&child_patterns);

        // Whitespace is filtered out before matching, as in TS.
        let grandchildren: Vec<_> = collect_child_nodes(arena, child_id)
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
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
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
            close_tag: None,
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
                close_tag: None,
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
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        // ul permits li — no violation on ul
        let ul_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<ul>")).collect();
        assert!(ul_violations.is_empty(), "ul > li should be valid");
    }

    #[test]
    fn ul_with_div_is_invalid() {
        let s = spec();
        let (arena, _) = make_parent_children("ul", &[("div", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
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
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let head_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<head>")).collect();
        assert!(!head_violations.is_empty(), "head without title should report missing");
    }

    #[test]
    fn head_with_title_is_valid() {
        let s = spec();
        let (arena, _) = make_parent_children("head", &[("title", &[]), ("meta", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let head_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<head>")).collect();
        assert!(head_violations.is_empty(), "head with title should be valid");
    }

    #[test]
    fn br_void_with_no_children() {
        let s = spec();
        let (arena, _) = make_parent_children("div", &[("br", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let br_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<br>")).collect();
        assert!(br_violations.is_empty(), "empty br should be valid");
    }

    #[test]
    fn select_with_option_valid() {
        let s = spec();
        let (arena, _) = make_parent_children("select", &[("option", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let select_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<select>")).collect();
        assert!(select_violations.is_empty(), "select > option should be valid");
    }

    #[test]
    fn table_with_tbody_valid() {
        let s = spec();
        let (arena, _) = make_parent_children("table", &[("tbody", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let table_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<table>")).collect();
        assert!(table_violations.is_empty(), "table > tbody should be valid");
    }

    #[test]
    fn ul_multiple_li_valid() {
        let s = spec();
        let (arena, _) = make_parent_children("ul", &[("li", &[]), ("li", &[]), ("li", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<ul>")).collect();
        assert!(v.is_empty(), "ul > li*3 should be valid");
    }

    #[test]
    fn ul_mixed_valid_invalid() {
        let s = spec();
        let (arena, _) = make_parent_children("ul", &[("li", &[]), ("div", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
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
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<dl>")).collect();
        assert!(v.is_empty(), "dl > dt+dd repeated should be valid");
    }

    #[test]
    fn details_requires_summary() {
        let s = spec();
        let (arena, _) = make_parent_children("details", &[("p", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<details>")).collect();
        assert!(!v.is_empty(), "details without summary should report missing");
    }

    // --- Boolean(true) path ---

    #[test]
    fn div_allows_any_content() {
        let s = spec();
        let (arena, _) = make_parent_children("div", &[("p", &[]), ("span", &[]), ("a", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let v: Vec<_> = violations.iter().filter(|v| v.raw.contains("<div>")).collect();
        assert!(v.is_empty(), "div allows any flow content");
    }

    // --- Violation message content ---

    #[test]
    fn violation_message_contains_element_names() {
        let s = spec();
        let (arena, _) = make_parent_children("ul", &[("div", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
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
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
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
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
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
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let v: Vec<_> = violations.iter().filter(|v| v.message.contains("Require")).collect();
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
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
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
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
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
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let v: Vec<_> = violations
            .iter()
            .filter(|v| v.rule_id == "permitted-contents" && v.message.contains("div"))
            .collect();
        assert!(
            v.is_empty(),
            "svg should be recognized as flow content via namespace prefix"
        );
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
    /// Tests through verify() by building a DOM with a text child inside br.
    #[test]
    fn void_element_whitespace_only_valid() {
        let s = spec();
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let br_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "br".to_string(),
                raw: "<br>".to_string(),
                offset: 0,
                line: 1,
                col: 1,
                node_name: "br".to_string(),
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
            close_tag: None,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(br_id) {
            e.base.id = br_id;
        }
        let text_id = builder.push(DomNode::Text(TextData {
            base: NodeBase {
                id: 0,
                uuid: "ws".to_string(),
                raw: "  \n  ".to_string(),
                offset: 4,
                line: 1,
                col: 5,
                node_name: "#text".to_string(),
                parent: Some(br_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 2,
            },
            is_bogus: false,
        }));
        if let Some(DomNode::Text(t)) = builder.get_mut(text_id) {
            t.base.id = text_id;
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(br_id) {
            e.base.children = vec![text_id];
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![br_id];
        }
        let arena = builder.finish();
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        let br_v: Vec<_> = violations.iter().filter(|v| v.raw == "<br>").collect();
        assert!(br_v.is_empty(), "br with whitespace-only text should be valid");
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
    fn transparent_constraint_rejects_interactive() {
        let s = spec();
        let constraint = ":not(:model(interactive), a, [tabindex], :has(:model(interactive), a, [tabindex]))";

        let expanded = crate::content_model::matching::expand_model_refs(constraint, &s);
        let selector = markuplint_selector::parser::parse(&expanded).unwrap();

        let child = ChildNodeInfo::element("button");
        let bridge = crate::content_model::arena_bridge::build_arena("div", std::slice::from_ref(&child));
        let node_id = bridge.child_ids[0];

        let result = markuplint_selector::matcher::matches(&selector, &bridge.arena, node_id, None, None, None);
        // button is interactive → :not(interactive) should be false
        assert!(!result, "button should NOT match :not(:model(interactive), ...)");
    }

    // --- strip_has_from_constraint ---

    #[test]
    fn strip_has_basic() {
        assert_eq!(
            strip_has_from_constraint(
                ":not(:model(interactive), a, [tabindex], :has(:model(interactive), a, [tabindex]))"
            ),
            ":not(:model(interactive), a, [tabindex])"
        );
    }

    #[test]
    fn strip_has_no_has() {
        assert_eq!(
            strip_has_from_constraint(":not(:model(interactive), a)"),
            ":not(:model(interactive), a)"
        );
    }

    #[test]
    fn strip_has_wildcard() {
        assert_eq!(strip_has_from_constraint("*"), "*");
    }

    // --- spec_lookup_name ---

    #[test]
    fn spec_lookup_html() {
        assert_eq!(spec_lookup_name(&NamespaceURI::XHTML, "div"), "div");
    }

    #[test]
    fn spec_lookup_svg() {
        assert_eq!(spec_lookup_name(&NamespaceURI::SVG, "a"), "svg:a");
    }

    #[test]
    fn spec_lookup_mathml() {
        assert_eq!(
            spec_lookup_name(&markuplint_core::mlast::NamespaceURI::MathML, "mfrac"),
            "mml:mfrac"
        );
    }

    // --- all_optional with transparent ---

    #[test]
    fn all_optional_transparent_is_optional() {
        let patterns = vec![PermittedContentPattern::Transparent(TransparentPattern {
            transparent: "*".to_string(),
        })];
        assert!(all_optional(&patterns));
    }

    // --- matches_model_ref_with_attrs (via E2E for meta) ---

    #[test]
    fn meta_without_itemprop_not_flow() {
        let s = spec();
        let meta = ChildNodeInfo {
            kind: ChildNodeKind::HtmlElement,
            node_name: "meta".to_string(),
            raw: "<meta>".to_string(),
            line: 0,
            col: 0,
            child_nodes: vec![],
            attribute_names: vec!["content".to_string()],
            transparent_ancestor: None,
        };
        // meta without itemprop should NOT match :model(flow)
        let matched = crate::content_model::matching::matches_selector(":model(flow)", Some(&meta), 1, &s);
        assert!(
            !matched.result_type.is_matched(),
            "meta without itemprop should not match #flow"
        );
    }

    #[test]
    fn meta_with_itemprop_is_flow() {
        let s = spec();
        let meta = ChildNodeInfo {
            kind: ChildNodeKind::HtmlElement,
            node_name: "meta".to_string(),
            raw: "<meta>".to_string(),
            line: 0,
            col: 0,
            child_nodes: vec![],
            attribute_names: vec!["itemprop".to_string(), "content".to_string()],
            transparent_ancestor: None,
        };
        let matched = crate::content_model::matching::matches_selector(":model(flow)", Some(&meta), 1, &s);
        assert!(
            matched.result_type.is_matched(),
            "meta with itemprop should match #flow"
        );
    }

    // --- evaluate_condition ---

    #[test]
    fn evaluate_condition_attribute_presence() {
        assert_eq!(check_attr_condition("[src]", &make_el_with_attr("audio", "src")), true);
        assert_eq!(
            check_attr_condition("[src]", &make_el_with_attr("audio", "controls")),
            false
        );
    }

    #[test]
    fn evaluate_condition_multiple_attrs() {
        // [label][value] — both must be present
        let el = make_el_with_attrs("option", &["label", "value"]);
        assert!(check_attr_condition("[label][value]", &el));
        let el2 = make_el_with_attr("option", "label");
        assert!(!check_attr_condition("[label][value]", &el2));
    }

    #[test]
    fn evaluate_condition_structural_namespace() {
        // "svg|switch > svg|a" — parent must be "switch"
        let s = spec();
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let switch_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "sw".to_string(),
                raw: "<switch>".to_string(),
                offset: 0,
                line: 1,
                col: 1,
                node_name: "switch".to_string(),
                parent: Some(doc_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
            namespace: NamespaceURI::SVG,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: vec![],
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(switch_id) {
            e.base.id = switch_id;
        }
        let a_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "a".to_string(),
                raw: "<a>".to_string(),
                offset: 0,
                line: 1,
                col: 9,
                node_name: "a".to_string(),
                parent: Some(switch_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 2,
            },
            namespace: NamespaceURI::SVG,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: vec![],
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(a_id) {
            e.base.id = a_id;
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(switch_id) {
            e.base.children = vec![a_id];
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![switch_id];
        }
        let arena = builder.finish();

        let a_el = arena.get(a_id).unwrap().as_element().unwrap();
        assert!(
            evaluate_condition("svg|switch > svg|a", a_el, &arena),
            "svg|switch > svg|a should match when parent is switch"
        );
    }

    fn make_el_with_attr(tag: &str, attr: &str) -> markuplint_dom::node::ElementData {
        use markuplint_core::mlast::{MLASTAttr, MLASTHTMLAttr, MLASTToken};
        ElementData {
            base: NodeBase {
                id: 0,
                uuid: String::new(),
                raw: format!("<{tag}>"),
                offset: 0,
                line: 1,
                col: 1,
                node_name: tag.to_string(),
                parent: None,
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 0,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: vec![MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                uuid: String::new(),
                raw: attr.to_string(),
                offset: 0,
                line: 1,
                col: 1,
                node_name: attr.to_string(),
                spaces_before_name: MLASTToken {
                    uuid: String::new(),
                    raw: String::new(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                name: MLASTToken {
                    uuid: String::new(),
                    raw: attr.to_string(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                spaces_before_equal: MLASTToken {
                    uuid: String::new(),
                    raw: String::new(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                equal: MLASTToken {
                    uuid: String::new(),
                    raw: String::new(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                spaces_after_equal: MLASTToken {
                    uuid: String::new(),
                    raw: String::new(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                start_quote: MLASTToken {
                    uuid: String::new(),
                    raw: String::new(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                value: MLASTToken {
                    uuid: String::new(),
                    raw: String::new(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                end_quote: MLASTToken {
                    uuid: String::new(),
                    raw: String::new(),
                    offset: 0,
                    line: 1,
                    col: 1,
                },
                is_dynamic_value: None,
                is_directive: None,
                potential_name: None,
                potential_value: None,
                value_type: None,
                candidate: None,
                is_duplicatable: false,
            }))],
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }
    }

    fn make_el_with_attrs(tag: &str, attrs: &[&str]) -> markuplint_dom::node::ElementData {
        use markuplint_core::mlast::{MLASTAttr, MLASTHTMLAttr, MLASTToken};
        let attributes = attrs
            .iter()
            .map(|attr| {
                MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                    uuid: String::new(),
                    raw: attr.to_string(),
                    offset: 0,
                    line: 1,
                    col: 1,
                    node_name: attr.to_string(),
                    spaces_before_name: MLASTToken {
                        uuid: String::new(),
                        raw: String::new(),
                        offset: 0,
                        line: 1,
                        col: 1,
                    },
                    name: MLASTToken {
                        uuid: String::new(),
                        raw: attr.to_string(),
                        offset: 0,
                        line: 1,
                        col: 1,
                    },
                    spaces_before_equal: MLASTToken {
                        uuid: String::new(),
                        raw: String::new(),
                        offset: 0,
                        line: 1,
                        col: 1,
                    },
                    equal: MLASTToken {
                        uuid: String::new(),
                        raw: String::new(),
                        offset: 0,
                        line: 1,
                        col: 1,
                    },
                    spaces_after_equal: MLASTToken {
                        uuid: String::new(),
                        raw: String::new(),
                        offset: 0,
                        line: 1,
                        col: 1,
                    },
                    start_quote: MLASTToken {
                        uuid: String::new(),
                        raw: String::new(),
                        offset: 0,
                        line: 1,
                        col: 1,
                    },
                    value: MLASTToken {
                        uuid: String::new(),
                        raw: String::new(),
                        offset: 0,
                        line: 1,
                        col: 1,
                    },
                    end_quote: MLASTToken {
                        uuid: String::new(),
                        raw: String::new(),
                        offset: 0,
                        line: 1,
                        col: 1,
                    },
                    is_dynamic_value: None,
                    is_directive: None,
                    potential_name: None,
                    potential_value: None,
                    value_type: None,
                    candidate: None,
                    is_duplicatable: false,
                }))
            })
            .collect();
        ElementData {
            base: NodeBase {
                id: 0,
                uuid: String::new(),
                raw: format!("<{tag}>"),
                offset: 0,
                line: 1,
                col: 1,
                node_name: tag.to_string(),
                parent: None,
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 0,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes,
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }
    }

    #[test]
    fn framework_options_accepted() {
        // ignoreHasMutableChildren and evaluateConditionalChildNodes are no-op for static HTML
        // but should be accepted without error
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = PermittedContents;
        let config = RuleConfig {
            options: serde_json::json!({
                "ignoreHasMutableChildren": true,
                "evaluateConditionalChildNodes": true
            }),
            ..Default::default()
        };
        // Should not panic or error
        let _violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    }
}
