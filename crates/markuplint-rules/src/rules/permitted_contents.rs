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
                                    line: el.base.line,
                                    col: el.base.col,
                                    raw: el.base.raw.clone(),
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
                                message: format!("The \"{tag_name}\" element must not have contents",),
                                line: el.base.line,
                                col: el.base.col,
                                raw: el.base.raw.clone(),
                            });
                        }
                        // Internal types — not reported as violations
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
                    child_nodes: vec![], // No :has() needed for content model
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
                    result.push(ChildNodeInfo::text(raw));
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

/// Check if all patterns are optional (zeroOrMore or optional).
fn all_optional(patterns: &[PermittedContentPattern]) -> bool {
    patterns.iter().all(|p| {
        matches!(
            p,
            PermittedContentPattern::ZeroOrMore(_) | PermittedContentPattern::Optional(_)
        )
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
        let ul_violations: Vec<_> = violations.iter().filter(|v| v.raw.contains("<ul>")).collect();
        assert!(!ul_violations.is_empty(), "ul > div should be invalid");
        assert_eq!(ul_violations[0].rule_id, "permitted-contents");
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
}
