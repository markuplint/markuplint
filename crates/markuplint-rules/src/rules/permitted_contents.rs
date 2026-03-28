//! `permitted-contents` rule: validates element children against HTML spec content models.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
use markuplint_types::spec::content_model::{self, ContentModelContents, PermittedContentPattern};
use markuplint_types::spec::types::MLMLSpec;

use crate::content_model::child_node::{ChildNodeInfo, ChildNodeKind};
use crate::content_model::matching::validate_content_model;
use crate::content_model::result::ResultType;
use crate::rule::{Rule, RuleConfig};
use crate::violation::Violation;

/// The `permitted-contents` rule.
pub struct PermittedContents;

impl Rule for PermittedContents {
    fn id(&self) -> &'static str {
        "permitted-contents"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfig) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let tag_name = &el.base.node_name;

            // Get content model from spec
            let Some(cm) = content_model::get_content_model(spec, tag_name) else {
                continue; // Unknown element — skip
            };

            match &cm.contents {
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
                    let children = collect_child_nodes(arena, node_id);
                    if children.is_empty() && all_optional(patterns) {
                        continue; // Empty is OK when all patterns are optional
                    }

                    let result = validate_content_model(spec, patterns, &children);

                    match result.result_type {
                        ResultType::UnexpectedExtraNode => {
                            // Find the first unmatched child
                            if let Some(&idx) = result.unmatched.first() {
                                let child = &children[idx];
                                violations.push(Violation {
                                    rule_id: self.id().to_string(),
                                    severity: config.severity.clone(),
                                    message: format!(
                                        "The \"{}\" element is not permitted as content of \"{}\"",
                                        child_name(child),
                                        tag_name,
                                    ),
                                    line: if child.line > 0 { child.line } else { el.base.line },
                                    col: if child.col > 0 { child.col } else { el.base.col },
                                    raw: child.raw.clone(),
                                });
                            }
                        }
                        ResultType::MissingNodeRequired | ResultType::MissingNodeOneOrMore => {
                            violations.push(Violation {
                                rule_id: self.id().to_string(),
                                severity: config.severity.clone(),
                                message: format!(
                                    "The \"{}\" element requires \"{}\" as content",
                                    tag_name, result.query,
                                ),
                                line: el.base.line,
                                col: el.base.col,
                                raw: el.base.raw.clone(),
                            });
                        }
                        ResultType::Nothing => {
                            violations.push(Violation {
                                rule_id: self.id().to_string(),
                                severity: config.severity.clone(),
                                message: format!("The \"{tag_name}\" element must not have contents"),
                                line: el.base.line,
                                col: el.base.col,
                                raw: el.base.raw.clone(),
                            });
                        }
                        ResultType::TransparentModelDisallows => {
                            if let Some(&idx) = result.unmatched.first() {
                                let child = &children[idx];
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

/// Convert `DomArena` children of an element to `ChildNodeInfo` vec.
fn collect_child_nodes(arena: &DomArena, parent_id: NodeId) -> Vec<ChildNodeInfo> {
    let Some(children) = arena.children_of(parent_id) else {
        return vec![];
    };

    let mut result = Vec::new();
    for &child_id in children {
        let Some(child) = arena.get(child_id) else {
            continue;
        };
        match child {
            DomNode::Element(el) => {
                let kind = if el.base.node_name.contains('-') {
                    ChildNodeKind::WebComponent
                } else {
                    match el.element_type {
                        markuplint_core::mlast::ElementType::Html => ChildNodeKind::HtmlElement,
                        markuplint_core::mlast::ElementType::WebComponent => ChildNodeKind::WebComponent,
                        markuplint_core::mlast::ElementType::Authored => ChildNodeKind::AuthoredElement,
                    }
                };
                result.push(ChildNodeInfo {
                    kind,
                    node_name: el.base.node_name.to_ascii_lowercase(),
                    raw: el.base.raw.clone(),
                    line: el.base.line,
                    col: el.base.col,
                    child_nodes: vec![],
                });
            }
            DomNode::Text(t) => {
                let raw = &t.base.raw;
                // Skip endtag nodes that the DOM builder stores as TextData.
                // EndTags have raw like "</li>". They must remain in the DOM
                // for rules like no-orphaned-end-tag, but content model
                // validation should ignore them.
                // TODO: Give endtags a proper DomNode variant instead of
                // misusing TextData. Tracked in builder.rs convert_end_tag().
                if raw.starts_with("</") {
                    continue;
                }
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
            _ => {} // Skip comments, doctypes, invalid
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
fn child_name(child: &ChildNodeInfo) -> String {
    if child.is_text() {
        "#text".to_string()
    } else if child.node_name.is_empty() {
        "#unknown".to_string()
    } else {
        child.node_name.clone()
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
            v[0].message.contains("head"),
            "message should mention parent: {}",
            v[0].message
        );
        assert!(
            v[0].message.contains("requires"),
            "message should indicate requirement: {}",
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
            .filter(|v| v.message.contains("not permitted"))
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
            .filter(|v| v.message.contains("requires"))
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
            .filter(|v| v.rule_id == "permitted-contents" && v.message.contains("details"))
            .collect();
        assert!(!v.is_empty(), "empty details should fail (summary required)");
    }

    /// SVG elements in #flow use namespace prefix "svg|svg" in spec data.
    /// The content model engine does not yet handle namespace prefixes,
    /// so svg is NOT recognized as flow content. This is a known limitation.
    /// When namespace support is added, this test should be updated to expect
    /// no violation for div > svg.
    #[test]
    fn svg_namespace_known_limitation() {
        let s = spec();
        let (arena, _) = make_parent_children("div", &[("svg", &[])]);
        let rule = PermittedContents;
        let violations = rule.verify(&arena, &s, &RuleConfig::default());
        let v: Vec<_> = violations
            .iter()
            .filter(|v| v.rule_id == "permitted-contents" && v.message.contains("div"))
            .collect();
        // Known limitation: svg is registered as "svg|svg" in #flow, not "svg"
        // TODO: Add namespace prefix handling to matches_model_ref
        assert!(!v.is_empty(), "svg not recognized as flow content (namespace prefix limitation)");
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
}
