//! `required-element` rule: require descendant elements matching CSS selectors.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_selector::matcher;
use markuplint_selector::parser;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `required-element` rule.
pub struct RequiredElement;

impl Rule for RequiredElement {
    fn id(&self) -> &'static str {
        "required-element"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        let global = config.global();

        // Document-level check: global config requires elements to exist anywhere
        if !global.disabled {
            check_required_elements(self.id(), arena, spec, global, None, &mut violations);
        }

        // Per-node check: nodeRule config requires elements among children
        if config.has_overrides() {
            for (node_id, el) in arena.elements() {
                let node_config = config.get(node_id);
                if node_config.disabled {
                    continue;
                }
                // Skip if same as global config (already checked above)
                if std::ptr::eq(node_config, global) {
                    continue;
                }
                check_required_elements(
                    self.id(),
                    arena,
                    spec,
                    node_config,
                    Some((node_id, el)),
                    &mut violations,
                );
            }
        }

        violations
    }
}

use crate::rule::RuleConfig;
use markuplint_dom::arena::NodeId;
use markuplint_dom::node::ElementData;

/// Check required elements either at document level or within a specific parent element.
fn check_required_elements(
    rule_id: &str,
    arena: &DomArena,
    spec: &MLMLSpec,
    config: &RuleConfig,
    scope: Option<(NodeId, &ElementData)>,
    violations: &mut Vec<Violation>,
) {
    let selectors: Vec<String> = match &config.value {
        serde_json::Value::Array(arr) => arr.iter().filter_map(|v| v.as_str().map(String::from)).collect(),
        serde_json::Value::String(s) => vec![s.clone()],
        _ => return,
    };

    if selectors.is_empty() {
        return;
    }

    let ignore_omitted = config
        .options
        .get("ignoreOmittedElements")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(true);

    for selector_str in &selectors {
        let Ok(sel) = parser::parse(selector_str) else {
            continue;
        };

        let found = if let Some((parent_id, _)) = scope {
            // Per-node: check children of the parent element
            arena.children_of(parent_id).is_some_and(|children| {
                children.iter().any(|&child_id| {
                    let Some(child_el) = arena.get(child_id).and_then(|n| n.as_element()) else {
                        return false;
                    };
                    if ignore_omitted && child_el.is_ghost {
                        return false;
                    }
                    matcher::matches(&sel, arena, child_id, Some(child_id), Some(spec), None)
                })
            })
        } else {
            // Document-level: check all elements in document
            arena.elements().any(|(node_id, el)| {
                if ignore_omitted && el.is_ghost {
                    return false;
                }
                matcher::matches(&sel, arena, node_id, Some(node_id), Some(spec), None)
            })
        };

        if !found {
            let (line, col, raw) = if let Some((_, el)) = scope {
                (el.base.line, el.base.col, el.base.raw.clone())
            } else {
                match arena.document() {
                    Some(DomNode::Document(doc)) => (1u32, 1u32, doc.raw.clone()),
                    _ => (1, 1, String::new()),
                }
            };

            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity: config.severity.clone(),
                message: format!("Require the \"{selector_str}\" element"),
                line,
                col,
                raw,
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::rules::attr_duplication::tests::make_element_with_attrs;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn element_present_no_violation() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = RequiredElement;
        let config = RuleConfig {
            value: serde_json::json!(["div"]),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty());
    }

    #[test]
    fn missing_element_reported() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = RequiredElement;
        let config = RuleConfig {
            value: serde_json::json!(["nav"]),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Require the \"nav\" element");
    }

    #[test]
    fn ignore_omitted_elements_true() {
        // Build an arena with a ghost element "nav"
        use markuplint_core::mlast::{ElementType, NamespaceURI};
        use markuplint_dom::arena::DomArenaBuilder;
        use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};

        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let nav_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "nav".to_string(),
                raw: "<nav>".to_string(),
                offset: 0,
                line: 1,
                col: 1,
                node_name: "nav".to_string(),
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
            is_ghost: true,
            close_tag: None,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(nav_id) {
            e.base.id = nav_id;
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![nav_id];
        }
        let arena = builder.finish();
        let s = spec();
        let rule = RequiredElement;

        // Default (ignoreOmittedElements=true): ghost nav is excluded
        let config_default = RuleConfig {
            value: serde_json::json!(["nav"]),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config_default));
        assert_eq!(
            violations.len(),
            1,
            "Default ignoreOmittedElements=true should exclude ghost elements"
        );

        // With ignoreOmittedElements=false, ghost nav IS found
        let config_include = RuleConfig {
            value: serde_json::json!(["nav"]),
            options: serde_json::json!({ "ignoreOmittedElements": false }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config_include));
        assert!(
            violations.is_empty(),
            "ignoreOmittedElements=false should include ghost elements"
        );
    }

    #[test]
    fn no_config_no_violation() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = RequiredElement;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
