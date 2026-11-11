//! `require-element` rule: require descendant elements matching CSS selectors.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_selector::ast::SelectorList;
use markuplint_selector::matcher;
use markuplint_types::spec::types::MLMLSpec;

use crate::diagnostic;
use crate::helpers::{has_mutable_children, is_unresolved_component, may_render_unknown_children};
use crate::rule::RuleConfig;
use crate::rule::{Rule, RuleConfigSet};
use crate::tree_scope::{TreeRoot, Trees};
use crate::violation::Violation;

pub struct RequireElement;

impl Rule for RequireElement {
    fn id(&self) -> &'static str {
        "require-element"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        let global = config.global();

        // The document: a required element anywhere in its tree, unless something may render
        // what is not known
        if !global.disabled {
            let has_mutable_content = option(global, "ignoreHasMutableContents")
                && arena
                    .elements()
                    .any(|(id, el)| has_mutable_children(arena, id, false) || is_unresolved_component(el));
            if !has_mutable_content {
                let trees = Trees::new(arena, spec);
                let document_elements = trees.elements_of(TreeRoot::Document);
                for (query, sel) in selectors(global, spec) {
                    let exists = document_elements.iter().any(|&id| {
                        arena.get(id).and_then(DomNode::as_element).is_some_and(|el| {
                            !(option(global, "ignoreOmittedElements") && el.is_ghost)
                                && matcher::matches(&sel, arena, id, Some(id), Some(spec), None)
                        })
                    });
                    if exists {
                        continue;
                    }
                    // TS `document.nodeList[0]?.raw.slice(0, 1)`
                    let raw = arena
                        .children_of(0)
                        .and_then(|children| children.first())
                        .and_then(|&first| arena.get(first))
                        .and_then(DomNode::base)
                        .and_then(|base| base.raw.chars().next())
                        .map(String::from)
                        .unwrap_or_default();
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: global.severity,
                        message: format!("Require the \"{query}\" element"),
                        line: 1,
                        col: 1,
                        raw,
                        reason: global.reason.clone(),
                        fix: None,
                    });
                }
            }
        }

        // An element a node rule configures: a required element among its children
        if config.has_overrides() {
            for (node_id, el) in arena.elements() {
                let node_config = config.get(node_id);
                if node_config.disabled || std::ptr::eq(node_config, global) || node_config.value == global.value {
                    continue;
                }
                if option(node_config, "ignoreHasMutableContents")
                    && arena
                        .pure_children_of(node_id)
                        .into_iter()
                        .any(|child| may_render_unknown_children(arena, child, true))
                {
                    continue;
                }
                for (query, sel) in selectors(node_config, spec) {
                    let exists = arena.child_nodes(node_id).into_iter().any(|child_id| {
                        arena.get(child_id).and_then(DomNode::as_element).is_some_and(|child| {
                            !(option(node_config, "ignoreOmittedElements") && child.is_ghost)
                                && matcher::matches(&sel, arena, child_id, Some(child_id), Some(spec), None)
                        })
                    });
                    if exists {
                        continue;
                    }
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: node_config.severity,
                        message: format!("Require the \"{query}\" element"),
                        line: el.base.line,
                        col: el.base.col,
                        raw: el.base.raw.clone(),
                        reason: node_config.reason.clone(),
                        fix: None,
                    });
                }
            }
        }

        violations
    }
}

/// A boolean option of the rule, `true` by default (TS `defaultOptions`).
fn option(config: &RuleConfig, name: &str) -> bool {
    config
        .options
        .get(name)
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(true)
}

/// The selectors of the rule value, with what they parse to.
fn selectors(config: &RuleConfig, spec: &MLMLSpec) -> Vec<(String, SelectorList)> {
    let queries: Vec<String> = match &config.value {
        serde_json::Value::Array(arr) => arr.iter().filter_map(|v| v.as_str().map(String::from)).collect(),
        serde_json::Value::String(s) => vec![s.clone()],
        _ => return Vec::new(),
    };
    queries
        .into_iter()
        .filter_map(|query| {
            diagnostic::parse_option_selector("config require-element selector", &query, spec).map(|sel| (query, sel))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::rules::no_duplicate_attr::tests::make_element_with_attrs;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn element_present_no_violation() {
        let arena = make_element_with_attrs("div", &[]);
        let s = spec();
        let rule = RequireElement;
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
        let rule = RequireElement;
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
            pretender_context: None,
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
        let rule = RequireElement;

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
        let rule = RequireElement;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    /// TS: `[require-element-invalid-008]` — The `as` attribute
    #[test]
    fn require_element_invalid_008() {
        const _ID: &str = "require-element-invalid-008";
        assert_eq!(
            crate::test_util::lint_brief(
                "require-element",
                r#"<x-div as="div"><span>Text</span></x-div>"#,
                serde_json::json!({ "rules": {}, "nodeRules": [{ "selector": "div", "rules": { "require-element": ["a"] } }] }),
            ),
            [crate::test_util::brief(
                crate::violation::Severity::Error,
                1,
                1,
                "Require the \"a\" element",
                r#"<x-div as="div">"#
            )]
        );
    }
}
