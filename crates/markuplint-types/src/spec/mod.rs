//! Corresponds to the TypeScript types in `@markuplint/ml-spec/src/types/`
//! and utilities in `@markuplint/ml-spec/src/utils/`.
//! Deserializes the compiled spec JSON (e.g., `@markuplint/html-spec/index.json`).

pub mod aria;
pub mod content_model;
pub mod lookup;
pub mod types;

use types::MLMLSpec;

/// # Errors
///
/// Returns an error if the JSON cannot be parsed as a valid `MLMLSpec`.
pub fn load_spec(json: &str) -> Result<MLMLSpec, serde_json::Error> {
    serde_json::from_str(json)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn html_spec_json() -> &'static str {
        include_str!("../../../../packages/@markuplint/html-spec/index.json")
    }

    #[test]
    fn load_html_spec() {
        let spec = load_spec(html_spec_json()).expect("Failed to deserialize html-spec");
        assert!(!spec.cites.is_empty(), "cites should not be empty");
        assert!(!spec.specs.is_empty(), "specs should not be empty");
    }

    #[test]
    fn html_spec_has_div() {
        let spec = load_spec(html_spec_json()).unwrap();
        let div = spec.specs.iter().find(|s| s.name == "div");
        assert!(div.is_some(), "<div> should be in the spec");
    }

    #[test]
    fn html_spec_has_input() {
        let spec = load_spec(html_spec_json()).unwrap();
        let input = spec.specs.iter().find(|s| s.name == "input");
        assert!(input.is_some(), "<input> should be in the spec");
        let input = input.unwrap();
        assert!(!input.attributes.is_empty(), "<input> should have attributes");
        assert!(
            input.attributes.contains_key("type"),
            "<input> should have 'type' attribute"
        );
    }

    #[test]
    fn html_spec_has_svg() {
        let spec = load_spec(html_spec_json()).unwrap();
        // SVG elements are prefixed with "svg:" in the spec
        let svg = spec.specs.iter().find(|s| s.name == "svg:svg");
        assert!(svg.is_some(), "<svg:svg> should be in the spec");
    }

    #[test]
    fn html_spec_def_has_aria() {
        let spec = load_spec(html_spec_json()).unwrap();
        assert!(
            !spec.def.aria.v1_3.roles.is_empty(),
            "ARIA 1.3 roles should not be empty"
        );
    }

    #[test]
    fn html_spec_def_has_global_attrs() {
        let spec = load_spec(html_spec_json()).unwrap();
        assert!(!spec.def.global_attrs.is_empty(), "global attrs should not be empty");
    }

    #[test]
    fn html_spec_element_aria() {
        let spec = load_spec(html_spec_json()).unwrap();
        let a = spec.specs.iter().find(|s| s.name == "a").unwrap();
        // <a> has an implicit role
        assert!(a.aria.implicit_role.is_some(), "<a> should have an implicit role");
    }

    #[test]
    fn html_spec_element_categories() {
        let spec = load_spec(html_spec_json()).unwrap();
        let div = spec.specs.iter().find(|s| s.name == "div").unwrap();
        assert!(!div.categories.is_empty(), "<div> should have categories");
    }

    #[test]
    fn html_spec_element_count() {
        let spec = load_spec(html_spec_json()).unwrap();
        // html-spec has ~237 elements
        assert!(
            spec.specs.len() > 200,
            "should have >200 element specs, got {}",
            spec.specs.len()
        );
    }

    // --- Concrete value verification ---

    #[test]
    fn input_type_attr_has_enum_values() {
        let spec = load_spec(html_spec_json()).unwrap();
        let input = spec.specs.iter().find(|s| s.name == "input").unwrap();
        let type_attr = &input.attributes["type"];
        // attr_type should be an object with "enum" array
        let type_obj = type_attr.attr_type.as_object().expect("type attr should be object");
        let enum_values = type_obj["enum"].as_array().expect("should have enum array");
        let values: Vec<&str> = enum_values.iter().filter_map(|v| v.as_str()).collect();
        assert!(values.contains(&"text"), "should contain 'text'");
        assert!(values.contains(&"checkbox"), "should contain 'checkbox'");
        assert!(values.contains(&"hidden"), "should contain 'hidden'");
    }

    #[test]
    fn a_element_implicit_role_is_link() {
        let spec = load_spec(html_spec_json()).unwrap();
        let a = spec.specs.iter().find(|s| s.name == "a").unwrap();
        let role = a.aria.implicit_role.as_ref().unwrap();
        assert!(
            matches!(role, types::ImplicitRole::Role(r) if r == "link"),
            "<a> implicit role should be 'link'"
        );
    }

    #[test]
    fn aria_roles_contain_known_roles() {
        let spec = load_spec(html_spec_json()).unwrap();
        let role_names: Vec<&str> = spec.def.aria.v1_3.roles.iter().map(|r| r.name.as_str()).collect();
        assert!(role_names.contains(&"alert"), "should contain 'alert'");
        assert!(role_names.contains(&"button"), "should contain 'button'");
        assert!(role_names.contains(&"dialog"), "should contain 'dialog'");
        assert!(role_names.contains(&"navigation"), "should contain 'navigation'");
    }

    #[test]
    fn aria_role_has_owned_properties() {
        let spec = load_spec(html_spec_json()).unwrap();
        let button = spec
            .def
            .aria
            .v1_3
            .roles
            .iter()
            .find(|r| r.name == "button")
            .expect("button role should exist");
        // button should have owned properties (aria-expanded, aria-pressed, etc.)
        assert!(
            !button.owned_properties.is_empty(),
            "button role should have owned properties"
        );
    }

    #[test]
    fn aria_properties_contain_aria_label() {
        let spec = load_spec(html_spec_json()).unwrap();
        let props: Vec<&str> = spec.def.aria.v1_3.props.iter().map(|p| p.name.as_str()).collect();
        assert!(props.contains(&"aria-label"), "should contain 'aria-label'");
        assert!(props.contains(&"aria-hidden"), "should contain 'aria-hidden'");
    }

    #[test]
    fn global_attrs_has_html_global_attrs() {
        let spec = load_spec(html_spec_json()).unwrap();
        assert!(
            spec.def.global_attrs.contains_key("#HTMLGlobalAttrs"),
            "should have #HTMLGlobalAttrs category"
        );
        let html_globals = &spec.def.global_attrs["#HTMLGlobalAttrs"];
        assert!(html_globals.contains_key("id"), "#HTMLGlobalAttrs should contain 'id'");
        assert!(
            html_globals.contains_key("class"),
            "#HTMLGlobalAttrs should contain 'class'"
        );
    }

    #[test]
    fn div_categories_include_flow() {
        let spec = load_spec(html_spec_json()).unwrap();
        let div = spec.specs.iter().find(|s| s.name == "div").unwrap();
        assert!(
            div.categories.contains(&"#flow".to_string()),
            "<div> should be in #flow category"
        );
    }

    #[test]
    fn content_models_has_metadata() {
        let spec = load_spec(html_spec_json()).unwrap();
        assert!(
            spec.def.content_models.contains_key("#metadata"),
            "should have #metadata content model"
        );
        let metadata = &spec.def.content_models["#metadata"];
        assert!(
            metadata.contains(&"link".to_string()),
            "#metadata should contain 'link'"
        );
    }

    // Note: Framework specs (react-spec, vue-spec, svelte-spec) use ExtendedSpec
    // (a partial overlay format), not the full MLMLSpec. They are TypeScript modules
    // that don't produce standalone JSON files. Framework spec deserialization will
    // be tested when ExtendedSpec types are added.

    // --- Error handling ---

    #[test]
    fn malformed_json_returns_error() {
        let result = load_spec("not valid json");
        assert!(result.is_err());
    }

    #[test]
    fn empty_json_returns_error() {
        let result = load_spec("{}");
        assert!(result.is_err(), "empty object should fail (missing required fields)");
    }

    #[test]
    fn valid_json_wrong_structure_returns_error() {
        let result = load_spec(r#"{"foo": "bar"}"#);
        assert!(result.is_err());
    }
}
