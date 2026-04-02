//! Spec lookup functions.
//!
//! Query element and attribute specifications from the loaded spec data.
//! Corresponds to `@markuplint/ml-spec/src/utils/`.

use super::types::{Attribute, ElementSpec, MLMLSpec};
use std::collections::HashMap;

/// Find an element spec by tag name.
///
/// Handles namespace-prefixed names (e.g., `"svg:svg"` matches an element
/// with `name == "svg:svg"`). Falls back to plain name match.
pub fn get_spec<'a>(spec: &'a MLMLSpec, name: &str) -> Option<&'a ElementSpec> {
    // Try exact match first
    if let Some(el) = spec.specs.iter().find(|s| s.name.eq_ignore_ascii_case(name)) {
        return Some(el);
    }
    // Try with namespace prefixes (svg:, math:) for elements that may
    // appear without prefix in the DOM but are stored with prefix in spec
    for prefix in &["svg", "math"] {
        let prefixed = format!("{prefix}:{name}");
        if let Some(el) = spec.specs.iter().find(|s| s.name.eq_ignore_ascii_case(&prefixed)) {
            return Some(el);
        }
    }
    None
}

/// Find an element spec by tag name and namespace.
///
/// If namespace is provided and non-empty, tries `"{namespace_prefix}:{name}"` first.
pub fn get_spec_by_tag_name<'a>(spec: &'a MLMLSpec, name: &str, namespace: Option<&str>) -> Option<&'a ElementSpec> {
    if let Some(ns) = namespace {
        let prefix = namespace_to_prefix(ns);
        if !prefix.is_empty() {
            let prefixed = format!("{prefix}:{name}");
            if let Some(el) = get_spec(spec, &prefixed) {
                return Some(el);
            }
        }
    }
    get_spec(spec, name)
}

/// Check if an element is a void element (no permitted content).
///
/// Void elements have `contentModel.contents === false` in the spec data.
pub fn is_void_element(spec: &MLMLSpec, name: &str) -> bool {
    get_spec(spec, name).is_some_and(|el| {
        el.content_model
            .get("contents")
            .is_some_and(|v| v.as_bool() == Some(false))
    })
}

/// Check if an element is palpable (appears in the `#palpable` content model category).
///
/// Note: Some entries include selectors (e.g., `"audio[controls]"`), so this
/// checks by prefix match on the tag name.
pub fn is_palpable_element(spec: &MLMLSpec, name: &str) -> bool {
    spec.def
        .content_models
        .get("#palpable")
        .is_some_and(|tags| tags.iter().any(|t| t == name || t.starts_with(&format!("{name}["))))
}

/// Get the tag names belonging to a content model category.
///
/// Categories are prefixed with `#` (e.g., `"#flow"`, `"#phrasing"`, `"#metadata"`).
pub fn get_content_model_tags<'a>(spec: &'a MLMLSpec, category: &str) -> Option<&'a [String]> {
    spec.def.content_models.get(category).map(std::vec::Vec::as_slice)
}

/// Resolve all attribute specs for an element, including global attributes.
///
/// Returns element-specific attributes merged with applicable global attribute
/// categories. Global attributes are resolved from the element's `globalAttrs`
/// configuration.
pub fn get_attr_specs<'a>(spec: &'a MLMLSpec, element_name: &str) -> HashMap<&'a str, &'a Attribute> {
    let mut result: HashMap<&str, &Attribute> = HashMap::new();

    let Some(el) = get_spec(spec, element_name) else {
        return result;
    };

    // Add element-specific attributes
    for (name, attr) in &el.attributes {
        result.insert(name.as_str(), attr);
    }

    // TODO: Merge global attributes from enabled categories.
    // Blocked: `SpecDefs.global_attrs` inner values are `serde_json::Value`, not `Attribute`.
    // The JSON structure for global attrs differs from element-specific attrs (uses partial
    // attribute definitions), so typing requires a `PartialAttribute` or flexible deserializer.
    // Tracked in #3521. Needed when ARIA rules or `invalid-attr` access global attrs.

    result
}

/// Convert a namespace URI to its conventional prefix.
fn namespace_to_prefix(namespace: &str) -> &str {
    match namespace {
        "http://www.w3.org/2000/svg" => "svg",
        "http://www.w3.org/1998/Math/MathML" => "math",
        _ => "",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::spec::load_spec;

    fn html_spec() -> MLMLSpec {
        let json = include_str!("../../../../packages/@markuplint/html-spec/index.json");
        load_spec(json).unwrap()
    }

    // --- get_spec ---

    #[test]
    fn get_spec_finds_div() {
        let spec = html_spec();
        let div = get_spec(&spec, "div");
        assert!(div.is_some());
        assert_eq!(div.unwrap().name, "div");
    }

    #[test]
    fn get_spec_case_insensitive() {
        let spec = html_spec();
        assert!(get_spec(&spec, "DIV").is_some());
        assert!(get_spec(&spec, "Div").is_some());
    }

    #[test]
    fn get_spec_finds_svg_prefixed() {
        let spec = html_spec();
        let svg = get_spec(&spec, "svg:svg");
        assert!(svg.is_some());
    }

    #[test]
    fn get_spec_nonexistent() {
        let spec = html_spec();
        assert!(get_spec(&spec, "nonexistent-element").is_none());
    }

    // --- get_spec_by_tag_name ---

    #[test]
    fn get_spec_by_tag_name_with_svg_namespace() {
        let spec = html_spec();
        let svg = get_spec_by_tag_name(&spec, "svg", Some("http://www.w3.org/2000/svg"));
        assert!(svg.is_some());
        assert_eq!(svg.unwrap().name, "svg:svg");
    }

    #[test]
    fn get_spec_by_tag_name_without_namespace() {
        let spec = html_spec();
        let div = get_spec_by_tag_name(&spec, "div", None);
        assert!(div.is_some());
        assert_eq!(div.unwrap().name, "div");
    }

    // --- is_void_element ---

    #[test]
    fn void_elements() {
        let spec = html_spec();
        assert!(is_void_element(&spec, "br"), "br should be void");
        assert!(is_void_element(&spec, "img"), "img should be void");
        assert!(is_void_element(&spec, "hr"), "hr should be void");
        assert!(is_void_element(&spec, "input"), "input should be void");
        assert!(is_void_element(&spec, "meta"), "meta should be void");
        assert!(is_void_element(&spec, "link"), "link should be void");
    }

    #[test]
    fn non_void_elements() {
        let spec = html_spec();
        assert!(!is_void_element(&spec, "div"), "div should not be void");
        assert!(!is_void_element(&spec, "p"), "p should not be void");
        assert!(!is_void_element(&spec, "a"), "a should not be void");
        assert!(!is_void_element(&spec, "span"), "span should not be void");
    }

    // --- is_palpable_element ---

    #[test]
    fn palpable_elements() {
        let spec = html_spec();
        assert!(is_palpable_element(&spec, "a"), "a should be palpable");
        assert!(is_palpable_element(&spec, "div"), "div should be palpable");
        assert!(is_palpable_element(&spec, "span"), "span should be palpable");
        assert!(is_palpable_element(&spec, "p"), "p should be palpable");
    }

    #[test]
    fn non_palpable_elements() {
        let spec = html_spec();
        assert!(!is_palpable_element(&spec, "link"), "link should not be palpable");
        assert!(!is_palpable_element(&spec, "meta"), "meta should not be palpable");
        assert!(!is_palpable_element(&spec, "br"), "br should not be palpable");
    }

    // --- get_content_model_tags ---

    #[test]
    fn content_model_flow() {
        let spec = html_spec();
        let flow = get_content_model_tags(&spec, "#flow");
        assert!(flow.is_some());
        let tags = flow.unwrap();
        assert!(tags.contains(&"div".to_string()));
        assert!(tags.contains(&"p".to_string()));
    }

    #[test]
    fn content_model_metadata() {
        let spec = html_spec();
        let metadata = get_content_model_tags(&spec, "#metadata");
        assert!(metadata.is_some());
        let tags = metadata.unwrap();
        assert!(tags.contains(&"link".to_string()));
        assert!(tags.contains(&"meta".to_string()));
    }

    #[test]
    fn content_model_nonexistent() {
        let spec = html_spec();
        assert!(get_content_model_tags(&spec, "#nonexistent").is_none());
    }

    // --- get_attr_specs ---

    #[test]
    fn attr_specs_for_input() {
        let spec = html_spec();
        let attrs = get_attr_specs(&spec, "input");
        assert!(attrs.contains_key("type"), "input should have 'type' attr");
        assert!(attrs.contains_key("name"), "input should have 'name' attr");
        assert!(attrs.contains_key("value"), "input should have 'value' attr");
    }

    #[test]
    fn attr_specs_for_a() {
        let spec = html_spec();
        let attrs = get_attr_specs(&spec, "a");
        assert!(attrs.contains_key("href"), "a should have 'href' attr");
        assert!(attrs.contains_key("target"), "a should have 'target' attr");
    }

    #[test]
    fn attr_specs_for_nonexistent() {
        let spec = html_spec();
        let attrs = get_attr_specs(&spec, "nonexistent");
        assert!(attrs.is_empty());
    }

    // --- Edge cases ---

    #[test]
    fn empty_name_returns_none() {
        let spec = html_spec();
        assert!(get_spec(&spec, "").is_none());
        assert!(!is_void_element(&spec, ""));
        assert!(!is_palpable_element(&spec, ""));
        assert!(get_attr_specs(&spec, "").is_empty());
    }

    #[test]
    fn void_element_nonexistent_returns_false() {
        let spec = html_spec();
        assert!(!is_void_element(&spec, "nonexistent"));
    }
}
