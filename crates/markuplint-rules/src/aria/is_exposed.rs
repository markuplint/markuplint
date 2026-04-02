//! Accessibility tree exposure check.
//!
//! Ports `packages/@markuplint/ml-spec/src/algorithm/aria/is-exposed.ts`.
//! Determines whether an element is included in the accessibility tree
//! per WAI-ARIA 1.2 §6.4.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers;
use markuplint_types::spec::aria::{self, ARIAVersion};
use markuplint_types::spec::lookup;
use markuplint_types::spec::types::MLMLSpec;

/// Check whether an element is exposed in the accessibility tree.
///
/// Applies WAI-ARIA exclusion/inclusion rules, SVG rendering rules,
/// and HTML metadata element filtering.
pub fn is_exposed(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> bool {
    // WAI-ARIA exclusion rules
    if is_excluding(spec, arena, node_id, version) {
        return false;
    }

    let Some(node) = arena.get(node_id) else {
        return true;
    };
    let Some(el) = node.as_element() else {
        return true;
    };

    let tag_name = &el.base.node_name;

    // Unknown, deprecated, or obsolete elements → exposed (conservative)
    let Some(el_spec) = lookup::get_spec(spec, tag_name) else {
        return true;
    };
    if el_spec.deprecated == Some(true) || el_spec.obsolete.is_some() {
        return true;
    }

    // HTML/SVG spec element check
    if !is_exposed_element(spec, arena, node_id, tag_name) {
        return false;
    }

    // WAI-ARIA inclusion rules
    if is_including(spec, arena, node_id, version) {
        return true;
    }

    // Default: exposed
    true
}

/// WAI-ARIA exclusion rules (§6.4.1).
fn is_excluding(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> bool {
    // 1. Elements with display:none, visibility:hidden, or hidden attribute
    //    (including ancestors)
    {
        let mut current = Some(node_id);
        while let Some(cid) = current {
            if has_display_none_or_visibility_hidden(arena, cid) || helpers::has_attr(arena, cid, "hidden") {
                return true;
            }
            current = arena.get(cid).and_then(markuplint_dom::node::DomNode::parent_id);
        }
    }

    // 2. Elements with presentation/none as first role
    if let Some(role_attr) = helpers::get_attr_value(arena, node_id, "role") {
        let first_role = role_attr.split_ascii_whitespace().next().unwrap_or("");
        if is_presentational(first_role) {
            return true;
        }
    }

    // 3. Elements with aria-hidden="true" (including ancestors)
    {
        let mut current = Some(node_id);
        while let Some(cid) = current {
            if helpers::get_attr_value(arena, cid, "aria-hidden") == Some("true") {
                return true;
            }
            current = arena.get(cid).and_then(markuplint_dom::node::DomNode::parent_id);
        }
    }

    // 4. Descendants of elements with childrenPresentational: true
    //    Use getComputedRole for the parent (which checks permitted roles),
    //    matching TS behavior where non-permitted explicit roles fall back
    //    to implicit role (e.g., <label role="button"> falls back to no
    //    childrenPresentational implicit role).
    {
        use crate::aria::computed_role::get_computed_role;
        let mut current = arena.get(node_id).and_then(markuplint_dom::node::DomNode::parent_id);
        while let Some(pid) = current {
            if arena.get(pid).and_then(|n| n.as_element()).is_some() {
                let parent_computed = get_computed_role(spec, arena, pid, version, false);
                if let Some(ref role) = parent_computed.role
                    && let Some(role_spec) = aria::get_role_spec(spec, &role.name, version)
                    && role_spec.children_presentational == Some(true)
                {
                    return true;
                }
            }
            current = arena.get(pid).and_then(markuplint_dom::node::DomNode::parent_id);
        }
    }

    false
}

/// WAI-ARIA inclusion rules (§6.4.2).
fn is_including(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId, version: ARIAVersion) -> bool {
    // Skip if aria-hidden="true"
    if helpers::get_attr_value(arena, node_id, "aria-hidden") == Some("true") {
        return false;
    }

    // Has explicit (non-implicit) role → included
    if let Some(role_attr) = helpers::get_attr_value(arena, node_id, "role") {
        let first_role = role_attr.split_ascii_whitespace().next().unwrap_or("");
        if !first_role.is_empty()
            && let Some(role_spec) = aria::get_role_spec(spec, first_role, version)
            && !role_spec.is_abstract.unwrap_or(false)
        {
            return true;
        }
    }

    // Has global WAI-ARIA attribute → included
    let aria_spec = aria::get_aria_spec(spec, version);
    if let Some(el) = arena.get(node_id).and_then(|n| n.as_element()) {
        for attr in &el.attributes {
            if let markuplint_core::mlast::MLASTAttr::HTMLAttr(html_attr) = attr {
                let attr_name = &html_attr.node_name;
                if aria_spec
                    .props
                    .iter()
                    .any(|p| p.is_global == Some(true) && p.name == *attr_name)
                {
                    return true;
                }
            }
        }
    }

    false
}

/// Check if element is exposed per HTML/SVG spec rules.
fn is_exposed_element(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId, tag_name: &str) -> bool {
    // SVG renderable check
    if let Some(svg_tags) = spec.def.content_models.get("#SVGRenderable")
        && svg_tags.iter().any(|t| t.eq_ignore_ascii_case(tag_name))
    {
        return true;
    }

    // Metadata elements are not exposed
    if let Some(metadata_tags) = spec.def.content_models.get("#metadata")
        && metadata_tags.iter().any(|t| t.eq_ignore_ascii_case(tag_name))
    {
        return false;
    }

    // input[type=hidden] is not exposed
    if tag_name.eq_ignore_ascii_case("input")
        && let Some(type_val) = helpers::get_attr_value(arena, node_id, "type")
        && type_val.eq_ignore_ascii_case("hidden")
    {
        return false;
    }

    true
}

/// Check if role name is presentational (none/presentation).
fn is_presentational(role: &str) -> bool {
    role.eq_ignore_ascii_case("presentation") || role.eq_ignore_ascii_case("none")
}

/// Check for inline style `display:none` or `visibility:hidden`.
fn has_display_none_or_visibility_hidden(arena: &DomArena, node_id: NodeId) -> bool {
    let Some(style) = helpers::get_attr_value(arena, node_id, "style") else {
        return false;
    };
    let lower = style.to_ascii_lowercase();
    (lower.contains("display") && lower.contains("none")) || (lower.contains("visibility") && lower.contains("hidden"))
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::aria::may_be_focusable::tests::make_arena;
    use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTHTMLAttr, MLASTToken, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    /// Build a simple parent > child arena for testing ancestor checks.
    pub(crate) fn make_nested(
        parent_tag: &str,
        parent_attrs: &[(&str, &str)],
        child_tag: &str,
        child_attrs: &[(&str, &str)],
    ) -> (DomArena, NodeId) {
        let empty_token = || MLASTToken {
            uuid: String::new(),
            raw: String::new(),
            offset: 0,
            line: 1,
            col: 1,
        };

        let make_attrs = |attrs: &[(&str, &str)]| -> Vec<MLASTAttr> {
            attrs
                .iter()
                .map(|(name, value)| {
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
                })
                .collect()
        };

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
                id: 1,
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
            attributes: make_attrs(parent_attrs),
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }));
        let child_id = builder.push(DomNode::Element(ElementData {
            base: NodeBase {
                id: 2,
                uuid: "child".to_string(),
                raw: format!("<{child_tag}>"),
                offset: 0,
                line: 1,
                col: 1,
                node_name: child_tag.to_string(),
                parent: Some(parent_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 2,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: make_attrs(child_attrs),
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }));
        if let Some(DomNode::Document(doc)) = builder.get_mut(doc_id) {
            doc.children.push(parent_id);
        }
        if let Some(DomNode::Element(p)) = builder.get_mut(parent_id) {
            p.base.children.push(child_id);
        }
        (builder.finish(), child_id)
    }

    #[test]
    fn basic_div_exposed() {
        let s = spec();
        let (arena, id) = make_arena("div", &[]);
        assert!(is_exposed(&s, &arena, id, ARIAVersion::V1_2));
    }

    #[test]
    fn aria_hidden_true_excluded() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("aria-hidden", "true")]);
        assert!(!is_exposed(&s, &arena, id, ARIAVersion::V1_2));
    }

    #[test]
    fn role_presentation_excluded() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "presentation")]);
        assert!(!is_exposed(&s, &arena, id, ARIAVersion::V1_2));
    }

    #[test]
    fn role_presentation_child_exposed() {
        let s = spec();
        let (arena, child) = make_nested("div", &[("role", "presentation")], "span", &[]);
        assert!(is_exposed(&s, &arena, child, ARIAVersion::V1_2));
    }

    #[test]
    fn aria_hidden_ancestor_excludes_child() {
        let s = spec();
        let (arena, child) = make_nested("div", &[("aria-hidden", "true")], "span", &[]);
        assert!(!is_exposed(&s, &arena, child, ARIAVersion::V1_2));
    }

    #[test]
    fn display_none_ancestor_excludes_child() {
        let s = spec();
        let (arena, child) = make_nested("div", &[("style", "display: none;")], "span", &[]);
        assert!(!is_exposed(&s, &arena, child, ARIAVersion::V1_2));
    }

    #[test]
    fn hidden_attr_ancestor_excludes_child() {
        let s = spec();
        let (arena, child) = make_nested("div", &[("hidden", "")], "span", &[]);
        assert!(!is_exposed(&s, &arena, child, ARIAVersion::V1_2));
    }

    #[test]
    fn hidden_until_found_excludes_child() {
        let s = spec();
        let (arena, child) = make_nested("div", &[("hidden", "until-found")], "span", &[]);
        assert!(!is_exposed(&s, &arena, child, ARIAVersion::V1_2));
    }

    #[test]
    fn children_presentational_button() {
        let s = spec();
        let (arena, child) = make_nested("button", &[], "span", &[]);
        assert!(!is_exposed(&s, &arena, child, ARIAVersion::V1_2));
    }

    #[test]
    fn hidden_button_child_excluded() {
        let s = spec();
        let (arena, _child) = make_nested("button", &[("hidden", "")], "span", &[]);
        let parent_id = 1; // button
        assert!(!is_exposed(&s, &arena, parent_id, ARIAVersion::V1_2));
    }

    #[test]
    fn input_text_exposed() {
        let s = spec();
        let (arena, id) = make_arena("input", &[("type", "text")]);
        assert!(is_exposed(&s, &arena, id, ARIAVersion::V1_2));
    }

    #[test]
    fn input_hidden_not_exposed() {
        let s = spec();
        let (arena, id) = make_arena("input", &[("type", "hidden")]);
        assert!(!is_exposed(&s, &arena, id, ARIAVersion::V1_2));
    }

    #[test]
    fn meta_not_exposed() {
        let s = spec();
        let (arena, id) = make_arena("meta", &[]);
        assert!(!is_exposed(&s, &arena, id, ARIAVersion::V1_2));
    }

    #[test]
    fn style_not_exposed() {
        let s = spec();
        let (arena, id) = make_arena("style", &[]);
        assert!(!is_exposed(&s, &arena, id, ARIAVersion::V1_2));
    }

    #[test]
    fn script_not_exposed() {
        let s = spec();
        let (arena, id) = make_arena("script", &[]);
        assert!(!is_exposed(&s, &arena, id, ARIAVersion::V1_2));
    }

    #[test]
    fn recent_elements_exposed() {
        let s = spec();
        for tag in &[
            "canvas", "dialog", "details", "summary", "meter", "progress", "picture", "ruby", "time",
        ] {
            let (arena, id) = make_arena(tag, &[]);
            assert!(is_exposed(&s, &arena, id, ARIAVersion::V1_2), "{tag} should be exposed");
        }
    }

    #[test]
    fn unknown_elements_exposed() {
        let s = spec();
        for tag in &["unknown", "font", "x-component"] {
            let (arena, id) = make_arena(tag, &[]);
            assert!(is_exposed(&s, &arena, id, ARIAVersion::V1_2), "{tag} should be exposed");
        }
    }

    // --- Edge case tests (from QA review) ---

    #[test]
    fn aria_hidden_false_does_not_override_parent_true() {
        // WAI-ARIA: aria-hidden="true" on parent overrides aria-hidden="false" on descendant
        let s = spec();
        let (arena, child) = make_nested("div", &[("aria-hidden", "true")], "span", &[("aria-hidden", "false")]);
        assert!(!is_exposed(&s, &arena, child, ARIAVersion::V1_2));
    }

    #[test]
    fn multiple_roles_uses_first() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "presentation link")]);
        // First role is "presentation" → excluded
        assert!(!is_exposed(&s, &arena, id, ARIAVersion::V1_2));
    }

    #[test]
    fn empty_role_is_exposed() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("role", "")]);
        assert!(is_exposed(&s, &arena, id, ARIAVersion::V1_2));
    }

    #[test]
    fn display_none_on_self() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("style", "display: none;")]);
        assert!(!is_exposed(&s, &arena, id, ARIAVersion::V1_2));
    }

    #[test]
    fn visibility_hidden_on_self() {
        let s = spec();
        let (arena, id) = make_arena("div", &[("style", "visibility: hidden;")]);
        assert!(!is_exposed(&s, &arena, id, ARIAVersion::V1_2));
    }

    #[test]
    fn invalid_node_id_returns_true() {
        let s = spec();
        let (arena, _) = make_arena("div", &[]);
        // NodeId 999 does not exist
        assert!(is_exposed(&s, &arena, 999, ARIAVersion::V1_2));
    }
}
