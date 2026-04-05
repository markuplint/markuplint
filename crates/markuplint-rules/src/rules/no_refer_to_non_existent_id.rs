//! `no-refer-to-non-existent-id` rule: report ID references that point to non-existent IDs.

use std::collections::HashSet;

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria::{self, ARIAVersion};
use markuplint_types::spec::types::{ARIAAttributeValue, MLMLSpec};

use crate::rule::{Rule, RuleConfig, RuleConfigSet};
use crate::violation::Violation;

/// The `no-refer-to-non-existent-id` rule.
pub struct NoReferToNonExistentId;

use markuplint_types::spec::lookup::{get_attr_specs, get_spec};

impl Rule for NoReferToNonExistentId {
    fn id(&self) -> &'static str {
        "no-refer-to-non-existent-id"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        let global = config.global();

        // Read ariaVersion option (default: RECOMMENDED = 1.3)
        let version = match global.options.get("ariaVersion").and_then(|v| v.as_str()) {
            Some("1.1") => ARIAVersion::V1_1,
            Some("1.2") => ARIAVersion::V1_2,
            Some("1.3") => ARIAVersion::V1_3,
            _ => ARIAVersion::RECOMMENDED,
        };

        // Build ARIA ID-referencing attribute set dynamically from spec
        let aria_spec = aria::get_aria_spec(spec, version);
        let aria_id_attrs: HashSet<String> = aria_spec
            .props
            .iter()
            .filter(|p| {
                matches!(
                    p.value,
                    ARIAAttributeValue::IdReference | ARIAAttributeValue::IdReferenceList
                )
            })
            .map(|p| p.name.clone())
            .collect();

        // Read fragmentRefersNameAttr option (default: false)
        let fragment_refers_name = global
            .options
            .get("fragmentRefersNameAttr")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false);

        // Step 1: Collect all IDs (and optionally name attrs) in the document
        let (id_set, has_dynamic_id) = collect_ids(arena, config, fragment_refers_name);

        // If any dynamic IDs exist, skip all checks (can't statically verify)
        if has_dynamic_id {
            return violations;
        }

        // Step 2: Check ID references
        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let el_name_lower = el.base.node_name.to_ascii_lowercase();
            let attr_specs = get_attr_specs(spec, &el_name_lower);

            for attr in &el.attributes {
                let MLASTAttr::HTMLAttr(html_attr) = attr else {
                    continue;
                };

                if html_attr.is_dynamic_value == Some(true) || html_attr.is_directive == Some(true) {
                    continue;
                }

                let attr_name_lower = html_attr.node_name.to_ascii_lowercase();
                let value = &html_attr.value.raw;

                if value.is_empty() || attr_name_lower == "id" {
                    continue;
                }

                // Check ARIA ID reference attributes (dynamically from spec)
                if aria_id_attrs.contains(&attr_name_lower) {
                    check_space_separated_ids(value, &id_set, html_attr, self.id(), rule_config, &mut violations);
                    continue;
                }

                // Check HTML spec attribute types dynamically:
                // - type === "DOMID" → single ID reference
                // - type.token === "DOMID" with separator → ID reference list
                let id_ref_type = get_domid_type(&attr_specs, &attr_name_lower, spec, &el.base.node_name);
                match id_ref_type {
                    DomIdType::Single => {
                        if !id_set.contains(value.as_str()) {
                            violations.push(Violation {
                                rule_id: self.id().to_string(),
                                name: None,
                                severity: rule_config.severity,
                                message: format!("Missing \"{value}\" ID"),
                                line: html_attr.value.line,
                                col: html_attr.value.col,
                                raw: html_attr.value.raw.clone(),
                            reason: None,
            });
                        }
                    }
                    DomIdType::SpaceList => {
                        check_space_separated_ids(value, &id_set, html_attr, self.id(), rule_config, &mut violations);
                    }
                    DomIdType::None => {}
                }

                // Check href="#fragment" references
                if attr_name_lower == "href"
                    && let Some(fragment) = value.strip_prefix('#')
                    && !fragment.is_empty()
                    && !id_set.contains(fragment)
                {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: format!("Missing \"{fragment}\" ID"),
                        line: html_attr.value.line,
                        col: html_attr.value.col,
                        raw: html_attr.value.raw.clone(),
                    reason: None,
            });
                }
            }
        }

        violations
    }
}

/// Whether a spec attribute type is a DOMID reference.
enum DomIdType {
    /// Not an ID reference.
    None,
    /// Single DOMID (e.g., `for`, `popovertarget`).
    Single,
    /// Space-separated DOMID list (e.g., `headers`).
    SpaceList,
}

/// Check if an attribute has a DOMID type in the spec (element-specific or global).
fn get_domid_type(
    attr_specs: &std::collections::HashMap<&str, &markuplint_types::spec::types::Attribute>,
    attr_name: &str,
    spec: &MLMLSpec,
    el_name: &str,
) -> DomIdType {
    // Check element-specific attribute spec
    if let Some(attr_spec) = attr_specs.get(attr_name) {
        return classify_domid_type(&attr_spec.attr_type);
    }
    // Check global attribute spec
    if let Some(el) = get_spec(spec, el_name) {
        for category in el.global_attrs.keys() {
            if let Some(attrs_map) = spec.def.global_attrs.get(category)
                && let Some(attr_val) = attrs_map.get(attr_name)
                && let Some(type_val) = attr_val.get("type")
            {
                return classify_domid_type(type_val);
            }
        }
    }
    DomIdType::None
}

/// Classify a JSON type value as DOMID, DOMID list, or neither.
fn classify_domid_type(type_val: &serde_json::Value) -> DomIdType {
    // Array of type alternatives — check if any is DOMID
    if let serde_json::Value::Array(arr) = type_val {
        for t in arr {
            let result = classify_domid_type(t);
            if !matches!(result, DomIdType::None) {
                return result;
            }
        }
        return DomIdType::None;
    }
    // String "DOMID" → single reference
    if type_val.as_str() == Some("DOMID") {
        return DomIdType::Single;
    }
    // Object with token: "DOMID" and separator → list
    if let serde_json::Value::Object(obj) = type_val
        && obj.get("token").and_then(serde_json::Value::as_str) == Some("DOMID")
    {
        return if obj.get("separator").and_then(serde_json::Value::as_str) == Some("space") {
            DomIdType::SpaceList
        } else {
            DomIdType::Single
        };
    }
    DomIdType::None
}

/// Collect all IDs (and optionally `name` attribute values) from the document.
///
/// Returns `(id_set, has_dynamic_id)`.
fn collect_ids(arena: &DomArena, config: &RuleConfigSet, fragment_refers_name: bool) -> (HashSet<String>, bool) {
    let mut id_set = HashSet::new();
    let mut has_dynamic_id = false;

    for (node_id, el) in arena.elements() {
        let rule_config = config.get(node_id);
        if rule_config.disabled {
            continue;
        }
        for attr in &el.attributes {
            let MLASTAttr::HTMLAttr(html_attr) = attr else {
                continue;
            };

            if !html_attr.node_name.eq_ignore_ascii_case("id") {
                if fragment_refers_name
                    && html_attr.node_name.eq_ignore_ascii_case("name")
                    && html_attr.is_dynamic_value != Some(true)
                    && html_attr.is_directive != Some(true)
                {
                    let value = html_attr.value.raw.clone();
                    if !value.is_empty() {
                        id_set.insert(value);
                    }
                }
                continue;
            }

            if html_attr.is_dynamic_value == Some(true) || html_attr.is_directive == Some(true) {
                has_dynamic_id = true;
                continue;
            }

            let value = html_attr.value.raw.clone();
            if !value.is_empty() {
                id_set.insert(value);
            }
        }
    }

    (id_set, has_dynamic_id)
}

/// Check each ID in a space-separated list and report missing ones.
fn check_space_separated_ids(
    value: &str,
    id_set: &HashSet<String>,
    html_attr: &markuplint_core::mlast::MLASTHTMLAttr,
    rule_id: &str,
    config: &RuleConfig,
    violations: &mut Vec<Violation>,
) {
    let refs: Vec<&str> = value.split_whitespace().filter(|s| !s.is_empty()).collect();
    for id_ref in refs {
        if !id_set.contains(id_ref) {
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity: config.severity,
                message: format!("Missing \"{id_ref}\" ID"),
                line: html_attr.value.line,
                col: html_attr.value.col,
                raw: html_attr.value.raw.clone(),
            reason: None,
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use markuplint_core::mlast::{ElementType, MLASTHTMLAttr, MLASTToken, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};
    use markuplint_types::spec::load_spec;
    use markuplint_types::spec::types::MLMLSpec;

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

    fn make_multi_element_arena(elements: &[(&str, &[(&str, &str)])]) -> DomArena {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let mut child_ids = Vec::new();
        for (i, (tag, attrs)) in elements.iter().enumerate() {
            let attributes: Vec<MLASTAttr> = attrs
                .iter()
                .map(|(name, value)| {
                    MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                        uuid: String::new(),
                        raw: format!("{name}=\"{value}\""),
                        offset: 0,
                        line: (i as u32) + 1,
                        col: 1,
                        node_name: name.to_string(),
                        spaces_before_name: empty_token(),
                        name: MLASTToken {
                            raw: name.to_string(),
                            line: (i as u32) + 1,
                            col: 1,
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
                            line: (i as u32) + 1,
                            col: 1,
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
                })
                .collect();

            let el_id = builder.push(DomNode::Element(ElementData {
                base: NodeBase {
                    id: 0,
                    uuid: format!("el-{i}"),
                    raw: format!("<{tag}>"),
                    offset: 0,
                    line: (i as u32) + 1,
                    col: 1,
                    node_name: tag.to_string(),
                    parent: Some(doc_id),
                    children: vec![],
                    next_sibling: None,
                    prev_sibling: None,
                    depth: 1,
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
            }));
            if let Some(DomNode::Element(e)) = builder.get_mut(el_id) {
                e.base.id = el_id;
            }
            child_ids.push(el_id);
        }

        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = child_ids;
        }
        builder.finish()
    }

    #[test]
    fn label_for_missing_id() {
        // <label for="foo"> with no element having id="foo"
        let arena = make_multi_element_arena(&[("label", &[("for", "foo")])]);
        let s = spec();
        let rule = NoReferToNonExistentId;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Missing \"foo\" ID");
    }

    #[test]
    fn label_for_existing_id() {
        // <label for="foo"> with <input id="foo">
        let arena = make_multi_element_arena(&[("label", &[("for", "foo")]), ("input", &[("id", "foo")])]);
        let s = spec();
        let rule = NoReferToNonExistentId;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn aria_describedby_missing_id() {
        // <section aria-describedby="foo"> with no element having id="foo"
        let arena = make_multi_element_arena(&[("section", &[("aria-describedby", "foo")])]);
        let s = spec();
        let rule = NoReferToNonExistentId;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Missing \"foo\" ID");
    }

    #[test]
    fn aria_labelledby_space_separated_partial_missing() {
        // <div aria-labelledby="a b"> with only id="a" existing
        let arena = make_multi_element_arena(&[("div", &[("aria-labelledby", "a b")]), ("span", &[("id", "a")])]);
        let s = spec();
        let rule = NoReferToNonExistentId;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Missing \"b\" ID");
    }

    #[test]
    fn dynamic_id_skips_all_checks() {
        // One element has a dynamic id (is_dynamic_value: Some(true)),
        // another element references a nonexistent id via aria-labelledby.
        // When dynamic IDs exist, all checks should be skipped.
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        // Element 1: <div id="dynamic-id"> with is_dynamic_value: Some(true)
        let dynamic_id_attr = MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
            uuid: String::new(),
            raw: "id=\"dynamic-id\"".to_string(),
            offset: 0,
            line: 1,
            col: 1,
            node_name: "id".to_string(),
            spaces_before_name: empty_token(),
            name: MLASTToken {
                raw: "id".to_string(),
                line: 1,
                col: 1,
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
                raw: "dynamic-id".to_string(),
                line: 1,
                col: 1,
                ..empty_token()
            },
            end_quote: MLASTToken {
                raw: "\"".to_string(),
                ..empty_token()
            },
            is_dynamic_value: Some(true),
            is_directive: None,
            potential_name: None,
            potential_value: None,
            value_type: None,
            candidate: None,
            is_duplicatable: false,
        }));

        let el1_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "el-0".to_string(),
                raw: "<div>".to_string(),
                offset: 0,
                line: 1,
                col: 1,
                node_name: "div".to_string(),
                parent: Some(doc_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: vec![dynamic_id_attr],
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(el1_id) {
            e.base.id = el1_id;
        }

        // Element 2: <section aria-labelledby="nonexistent">
        let labelledby_attr = MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
            uuid: String::new(),
            raw: "aria-labelledby=\"nonexistent\"".to_string(),
            offset: 0,
            line: 2,
            col: 1,
            node_name: "aria-labelledby".to_string(),
            spaces_before_name: empty_token(),
            name: MLASTToken {
                raw: "aria-labelledby".to_string(),
                line: 2,
                col: 1,
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
                raw: "nonexistent".to_string(),
                line: 2,
                col: 1,
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
        }));

        let el2_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 0,
                uuid: "el-1".to_string(),
                raw: "<section>".to_string(),
                offset: 0,
                line: 2,
                col: 1,
                node_name: "section".to_string(),
                parent: Some(doc_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: vec![labelledby_attr],
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }));
        if let Some(DomNode::Element(e)) = builder.get_mut(el2_id) {
            e.base.id = el2_id;
        }

        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![el1_id, el2_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = NoReferToNonExistentId;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.is_empty(),
            "When dynamic IDs exist, all checks should be skipped, got: {violations:?}"
        );
    }

    #[test]
    fn fragment_refers_name_attr() {
        // <a href="#foo"> with <div name="foo"> → no violation when fragmentRefersNameAttr=true
        let arena = make_multi_element_arena(&[("a", &[("href", "#foo")]), ("div", &[("name", "foo")])]);
        let s = spec();
        let rule = NoReferToNonExistentId;
        let config = RuleConfig {
            options: serde_json::json!({ "fragmentRefersNameAttr": true }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(
            violations.is_empty(),
            "fragmentRefersNameAttr=true should find name attrs, got: {violations:?}"
        );

        // Without the option, it should report violation
        let violations_default = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(
            violations_default.len(),
            1,
            "Without fragmentRefersNameAttr, href=#foo should report missing ID"
        );
    }

    #[test]
    fn href_fragment_missing_id() {
        // <a href="#missing"> with no id="missing" → violation
        let arena = make_multi_element_arena(&[("a", &[("href", "#missing")])]);
        let s = spec();
        let rule = NoReferToNonExistentId;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Missing \"missing\" ID");
    }

    #[test]
    fn href_fragment_existing_id() {
        // <a href="#exists"> with <div id="exists"> → no violation
        let arena = make_multi_element_arena(&[("a", &[("href", "#exists")]), ("div", &[("id", "exists")])]);
        let s = spec();
        let rule = NoReferToNonExistentId;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn all_ids_exist_no_violation() {
        // <label for="name"><input id="name"> → no violation (all referenced IDs exist)
        let arena = make_multi_element_arena(&[("label", &[("for", "name")]), ("input", &[("id", "name")])]);
        let s = spec();
        let rule = NoReferToNonExistentId;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(
            violations.is_empty(),
            "Expected no violations when all referenced IDs exist, got: {violations:?}"
        );
    }

    #[test]
    fn aria_version_option_is_read() {
        // Verify ariaVersion option is read and used (all versions have the same
        // ID-referencing attrs in practice, but the dynamic lookup path is exercised).
        // aria-labelledby="missing" → violation regardless of version
        let arena = make_multi_element_arena(&[("div", &[("aria-labelledby", "missing")])]);
        let s = spec();
        let rule = NoReferToNonExistentId;

        // Default version
        let v_default = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(v_default.len(), 1, "Default should check aria-labelledby");

        // Explicit version 1.1
        let config_11 = RuleConfig {
            options: serde_json::json!({ "ariaVersion": "1.1" }),
            ..Default::default()
        };
        let v_11 = rule.verify(&arena, &s, &RuleConfigSet::global_only(config_11));
        assert_eq!(v_11.len(), 1, "ARIA 1.1 should also check aria-labelledby");

        // Explicit version 1.2
        let config_12 = RuleConfig {
            options: serde_json::json!({ "ariaVersion": "1.2" }),
            ..Default::default()
        };
        let v_12 = rule.verify(&arena, &s, &RuleConfigSet::global_only(config_12));
        assert_eq!(v_12.len(), 1, "ARIA 1.2 should also check aria-labelledby");
    }
}
