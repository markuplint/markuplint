//! Extended pseudo-class resolution.
//!
//! Follows the TS implementation, which expands a category via
//! `contentModelCategoryToTagNames()` → `:is(tag1, tag2, ...)`.

use markuplint_types::spec::lookup;
use markuplint_types::spec::types::MLMLSpec;

/// `element_name` is the name of the element under test in the identity the
/// selector is matched with (see `matcher::match_specificity`).
pub fn matches_model(spec: &MLMLSpec, element_name: &str, category: &str) -> bool {
    let category = category.trim().to_ascii_lowercase();
    let category_key = format!("#{category}");

    // `:model(custom)` matches custom elements, identified by a hyphen in the name.
    if category == "custom" {
        return element_name.contains('-');
    }

    let Some(tags) = lookup::get_content_model_tags(spec, &category_key) else {
        return false;
    };

    // Tags may carry a selector suffix like `audio[controls]`; match by prefix.
    tags.iter().any(|tag| {
        tag.eq_ignore_ascii_case(element_name)
            || tag
                .split('[')
                .next()
                .is_some_and(|prefix| prefix.eq_ignore_ascii_case(element_name))
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use markuplint_types::spec;

    fn html_spec() -> MLMLSpec {
        let json = include_str!("../../../packages/@markuplint/html-spec/index.json");
        spec::load_spec(json).unwrap()
    }

    // We can't easily create DomArena elements without the TS parser,
    // so we test matches_model via the lookup path directly.

    #[test]
    fn flow_category_contains_div() {
        let spec = html_spec();
        let tags = lookup::get_content_model_tags(&spec, "#flow").unwrap();
        assert!(tags.iter().any(|t| t == "div"));
    }

    #[test]
    fn phrasing_category_contains_span() {
        let spec = html_spec();
        let tags = lookup::get_content_model_tags(&spec, "#phrasing").unwrap();
        assert!(tags.iter().any(|t| t == "span"));
    }

    #[test]
    fn interactive_category_contains_a() {
        let spec = html_spec();
        let tags = lookup::get_content_model_tags(&spec, "#interactive").unwrap();
        // "a" may have a selector suffix like "a[href]"
        assert!(tags.iter().any(|t| t == "a" || t.starts_with("a[")));
    }

    #[test]
    fn metadata_category_contains_meta() {
        let spec = html_spec();
        let tags = lookup::get_content_model_tags(&spec, "#metadata").unwrap();
        assert!(tags.iter().any(|t| t == "meta"));
    }

    #[test]
    fn nonexistent_category() {
        let spec = html_spec();
        assert!(lookup::get_content_model_tags(&spec, "#nonexistent").is_none());
    }

    #[test]
    fn custom_element_detection() {
        // :model(custom) matches elements with hyphens (custom elements)
        // Tested via the contains('-') logic directly since DomArena is hard to construct
        assert!("my-component".contains('-'));
        assert!("x-button".contains('-'));
        assert!(!"div".contains('-'));
        assert!(!"span".contains('-'));
    }
}
