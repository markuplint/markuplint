//! `landmark-roles` rule: landmark roles should be top-level and have unique accessible names
//! when duplicated.

use std::collections::HashMap;

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::computed_role::get_computed_role;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct LandmarkRoles;

/// Matches the TS implementation which does NOT include "search".
/// The TS rule identifies landmarks via CSS selectors for specific elements,
/// and "search" is not in that list (even though ARIA defines it as a landmark role).
const LANDMARK_ROLES: &[&str] = &[
    "banner",
    "complementary",
    "contentinfo",
    "form",
    "main",
    "navigation",
    "region",
];

fn is_landmark_role(role_name: &str) -> bool {
    LANDMARK_ROLES.iter().any(|r| r.eq_ignore_ascii_case(role_name))
}

impl Rule for LandmarkRoles {
    fn id(&self) -> &'static str {
        "landmark-roles"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        // TS: if (document.isFragment) { return; }
        if arena.is_fragment() {
            return vec![];
        }

        let mut violations = Vec::new();
        let version = ARIAVersion::RECOMMENDED;

        let global = config.global();
        let ignore_roles: Vec<String> = global
            .options
            .get("ignoreRoles")
            .and_then(serde_json::Value::as_array)
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default();
        let label_each_area = global
            .options
            .get("labelEachArea")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true);

        let mut landmarks: Vec<(NodeId, String, u32, u32, String)> = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if el.is_ghost {
                continue;
            }

            let computed = get_computed_role(spec, arena, node_id, version, false);

            if let Some(role) = &computed.role
                && is_landmark_role(&role.name)
            {
                if ignore_roles.iter().any(|r| r.eq_ignore_ascii_case(&role.name)) {
                    continue;
                }

                if has_landmark_ancestor(arena, spec, node_id, version) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: format!("The \"{}\" landmark should be top level", role.name),
                        line: el.base.line,
                        col: el.base.col,
                        raw: el.base.raw.clone(),
                        reason: None,
                    });
                }

                landmarks.push((
                    node_id,
                    role.name.clone(),
                    el.base.line,
                    el.base.col,
                    el.base.raw.clone(),
                ));
            }
        }

        if !label_each_area {
            return violations;
        }

        let mut role_groups: HashMap<String, Vec<(NodeId, u32, u32, String)>> = HashMap::new();
        for (node_id, role_name, line, col, raw) in &landmarks {
            role_groups
                .entry(role_name.clone())
                .or_default()
                .push((*node_id, *line, *col, raw.clone()));
        }

        for group in role_groups.values() {
            if group.len() < 2 {
                continue;
            }

            for &(node_id, line, col, ref raw) in group {
                let label = helpers::get_attr_value(arena, node_id, "aria-label");
                let labelledby = helpers::get_attr_value(arena, node_id, "aria-labelledby");

                if label.is_none_or(str::is_empty) && labelledby.is_none_or(str::is_empty) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: config.get(node_id).severity,
                        message: "Require unique accessible name".to_string(),
                        line,
                        col,
                        raw: raw.clone(),
                        reason: None,
                    });
                }
            }
        }

        violations
    }
}

fn has_landmark_ancestor(arena: &DomArena, spec: &MLMLSpec, node_id: NodeId, version: ARIAVersion) -> bool {
    for ancestor in arena.ancestors(node_id) {
        if let Some(el) = ancestor.as_element() {
            let ancestor_id = el.base.id;
            let computed = get_computed_role(spec, arena, ancestor_id, version, false);
            if let Some(role) = &computed.role
                && is_landmark_role(&role.name)
            {
                return true;
            }
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTHTMLAttr, MLASTToken, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    fn empty_token() -> MLASTToken {
        MLASTToken {
            uuid: String::new(),
            raw: String::new(),
            offset: 0,
            line: 1,
            col: 1,
        }
    }

    fn make_attr(name: &str, value: &str) -> MLASTAttr {
        MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
            uuid: String::new(),
            raw: format!("{name}=\"{value}\""),
            offset: 0,
            line: 1,
            col: 1,
            node_name: name.to_string(),
            spaces_before_name: empty_token(),
            name: MLASTToken {
                raw: name.to_string(),
                ..empty_token()
            },
            spaces_before_equal: empty_token(),
            equal: MLASTToken {
                raw: "=".to_string(),
                ..empty_token()
            },
            spaces_after_equal: empty_token(),
            start_quote: MLASTToken {
                raw: "\"".to_string(),
                ..empty_token()
            },
            value: MLASTToken {
                raw: value.to_string(),
                ..empty_token()
            },
            end_quote: MLASTToken {
                raw: "\"".to_string(),
                ..empty_token()
            },
            is_dynamic_value: None,
            is_directive: None,
            potential_name: None,
            potential_value: None,
            value_type: None,
            candidate: None,
            is_duplicatable: false,
        }))
    }

    fn make_element_data(tag: &str, attrs: Vec<MLASTAttr>, line: u32) -> ElementData {
        ElementData {
            base: NodeBase {
                id: 0,
                uuid: String::new(),
                raw: format!("<{tag}>"),
                offset: 0,
                line,
                col: 1,
                node_name: tag.to_string(),
                parent: None,
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: attrs,
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
    fn nested_landmark_violation() {
        // <nav> inside <nav> → nested landmark violation
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: false,
            unknown_parse_error: None,
            children: vec![],
        }));
        let nav1_id = builder.push(DomNode::Element(make_element_data("nav", vec![], 1)));
        let nav2_id = builder.push(DomNode::Element(make_element_data("nav", vec![], 2)));

        // Set up parent/child relationships
        if let Some(DomNode::Element(e)) = builder.get_mut(nav1_id) {
            e.base.id = nav1_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![nav2_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(nav2_id) {
            e.base.id = nav2_id;
            e.base.parent = Some(nav1_id);
            e.base.depth = 2;
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![nav1_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = LandmarkRoles;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));

        // nav2 should have "should be top level" violation
        // Both navs should have "Require unique accessible name" (2 navs, no labels)
        let top_level_violations: Vec<_> = violations.iter().filter(|v| v.message.contains("top level")).collect();
        assert_eq!(top_level_violations.len(), 1);
        assert_eq!(top_level_violations[0].line, 2);
    }

    #[test]
    fn duplicate_landmarks_without_labels() {
        // Two <nav> without aria-label → unique name required
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: false,
            unknown_parse_error: None,
            children: vec![],
        }));
        let nav1_id = builder.push(DomNode::Element(make_element_data("nav", vec![], 1)));
        let nav2_id = builder.push(DomNode::Element(make_element_data("nav", vec![], 2)));

        if let Some(DomNode::Element(e)) = builder.get_mut(nav1_id) {
            e.base.id = nav1_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(nav2_id) {
            e.base.id = nav2_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![nav1_id, nav2_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = LandmarkRoles;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));

        let unique_name_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("unique accessible name"))
            .collect();
        assert_eq!(unique_name_violations.len(), 2);
    }

    #[test]
    fn duplicate_landmarks_with_labels_no_violation() {
        // Two <nav> with distinct aria-labels → no unique name violation
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: false,
            unknown_parse_error: None,
            children: vec![],
        }));
        let nav1_id = builder.push(DomNode::Element(make_element_data(
            "nav",
            vec![make_attr("aria-label", "Main")],
            1,
        )));
        let nav2_id = builder.push(DomNode::Element(make_element_data(
            "nav",
            vec![make_attr("aria-label", "Footer")],
            2,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(nav1_id) {
            e.base.id = nav1_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(nav2_id) {
            e.base.id = nav2_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![nav1_id, nav2_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = LandmarkRoles;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));

        let unique_name_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("unique accessible name"))
            .collect();
        assert!(unique_name_violations.is_empty());
    }

    #[test]
    fn single_landmark_no_violation() {
        // Single <nav> → no violations at all
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: false,
            unknown_parse_error: None,
            children: vec![],
        }));
        let nav_id = builder.push(DomNode::Element(make_element_data("nav", vec![], 1)));

        if let Some(DomNode::Element(e)) = builder.get_mut(nav_id) {
            e.base.id = nav_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![nav_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = LandmarkRoles;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn duplicate_landmarks_with_aria_labelledby_no_violation() {
        // Two <nav> elements each with distinct aria-labelledby → no "Require unique accessible name" violation
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: false,
            unknown_parse_error: None,
            children: vec![],
        }));
        let nav1_id = builder.push(DomNode::Element(make_element_data(
            "nav",
            vec![make_attr("aria-labelledby", "heading1")],
            1,
        )));
        let nav2_id = builder.push(DomNode::Element(make_element_data(
            "nav",
            vec![make_attr("aria-labelledby", "heading2")],
            2,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(nav1_id) {
            e.base.id = nav1_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(nav2_id) {
            e.base.id = nav2_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![nav1_id, nav2_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = LandmarkRoles;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));

        let unique_name_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("unique accessible name"))
            .collect();
        assert!(
            unique_name_violations.is_empty(),
            "Two navs with distinct aria-labelledby should not require unique accessible name, got: {unique_name_violations:?}"
        );
    }

    #[test]
    fn ignore_roles_option() {
        // Two <nav> without labels → normally 2 "unique name" violations
        // With ignoreRoles: ["navigation"], navs should be completely skipped
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: false,
            unknown_parse_error: None,
            children: vec![],
        }));
        let nav1_id = builder.push(DomNode::Element(make_element_data("nav", vec![], 1)));
        let nav2_id = builder.push(DomNode::Element(make_element_data("nav", vec![], 2)));

        if let Some(DomNode::Element(e)) = builder.get_mut(nav1_id) {
            e.base.id = nav1_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(nav2_id) {
            e.base.id = nav2_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![nav1_id, nav2_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = LandmarkRoles;
        let config = RuleConfig {
            options: serde_json::json!({ "ignoreRoles": ["navigation"] }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(
            violations.is_empty(),
            "ignoreRoles should skip navigation roles entirely, got: {violations:?}"
        );
    }

    #[test]
    fn label_each_area_false_skips_label_check() {
        // Two <nav> without labels, labelEachArea=false → no "unique name" violations
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: false,
            unknown_parse_error: None,
            children: vec![],
        }));
        let nav1_id = builder.push(DomNode::Element(make_element_data("nav", vec![], 1)));
        let nav2_id = builder.push(DomNode::Element(make_element_data("nav", vec![], 2)));

        if let Some(DomNode::Element(e)) = builder.get_mut(nav1_id) {
            e.base.id = nav1_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(nav2_id) {
            e.base.id = nav2_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![nav1_id, nav2_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = LandmarkRoles;
        let config = RuleConfig {
            options: serde_json::json!({ "labelEachArea": false }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        let unique_name_violations: Vec<_> = violations
            .iter()
            .filter(|v| v.message.contains("unique accessible name"))
            .collect();
        assert!(
            unique_name_violations.is_empty(),
            "labelEachArea=false should skip unique name check, got: {unique_name_violations:?}"
        );
    }

    #[test]
    fn single_main_top_level_no_violation() {
        // Single <main> at top level → no violation
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: false,
            unknown_parse_error: None,
            children: vec![],
        }));
        let main_id = builder.push(DomNode::Element(make_element_data("main", vec![], 1)));

        if let Some(DomNode::Element(e)) = builder.get_mut(main_id) {
            e.base.id = main_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![main_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = LandmarkRoles;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.is_empty(),
            "Single <main> at top level should have no violations, got: {violations:?}"
        );
    }

    #[test]
    fn fragment_document_skipped() {
        // TS: if (document.isFragment) { return; }
        // Fragment documents should produce zero violations.
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true, // fragment
            unknown_parse_error: None,
            children: vec![],
        }));
        let nav1_id = builder.push(DomNode::Element(make_element_data("nav", vec![], 1)));
        let nav2_id = builder.push(DomNode::Element(make_element_data("nav", vec![], 2)));

        if let Some(DomNode::Element(e)) = builder.get_mut(nav1_id) {
            e.base.id = nav1_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(nav2_id) {
            e.base.id = nav2_id;
            e.base.parent = Some(doc_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![nav1_id, nav2_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = LandmarkRoles;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.is_empty(),
            "Fragment documents should be skipped entirely, got: {violations:?}"
        );
    }
}
