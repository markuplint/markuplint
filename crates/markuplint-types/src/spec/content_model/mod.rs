//! Content model types and validation.
//!
//! Defines the permitted content patterns for HTML elements and provides
//! functions to check whether a child element name conforms to the content model.
//!
//! Corresponds to `@markuplint/ml-spec/src/types/permitted-structures.ts`
//! and `@markuplint/rules/src/permitted-contents/`.

pub mod serde_types;

use super::lookup;
use super::types::MLMLSpec;

pub use serde_types::*;

// ============================================================
// Content model access
// ============================================================

/// Get the typed content model for an element.
pub fn get_content_model(spec: &MLMLSpec, element_name: &str) -> Option<ContentModel> {
    // Use exact match only (no SVG/MathML prefix fallback).
    // The caller (permitted_contents) already provides namespace-prefixed
    // names like "svg:g". Using get_spec's prefix fallback would cause
    // HTML-namespace elements like <g> inside <foreignObject> to incorrectly
    // resolve to svg:g's content model.
    let el = spec.specs.iter().find(|s| s.name.eq_ignore_ascii_case(element_name))?;
    serde_json::from_value(el.content_model.clone()).ok()
}

/// Check if the content model is void (no content permitted).
pub fn is_void(cm: &ContentModel) -> bool {
    matches!(cm.contents, ContentModelContents::Boolean(false))
}

/// Check if a tag name matches a model reference string.
///
/// Handles:
/// - Exact tag name: `"li"`, `"div"`
/// - Category: `:model(flow)` → look up in content models
/// - Category shorthand: `"#script-supporting"`
/// - Selector suffix: `":not(title)"` is stripped for category lookup
///   (full CSS pseudo-class selectors are not yet supported; see [#3515])
pub fn matches_model_ref(spec: &MLMLSpec, child_name: &str, model_ref: &str) -> bool {
    // Exact tag name match
    if model_ref.eq_ignore_ascii_case(child_name) {
        return true;
    }

    // Handle namespace prefix in model_ref: "svg|svg" → match "svg"
    if let Some((_ns, local)) = model_ref.split_once('|')
        && local.eq_ignore_ascii_case(child_name)
    {
        return true;
    }

    // Category reference: `:model(category)` or `#category`
    // `:model(phrasing):not(ruby)` → find first `)` to extract "phrasing"
    let category = if let Some(rest) = model_ref.strip_prefix(":model(") {
        rest.find(')').map(|pos| format!("#{}", &rest[..pos]))
    } else if model_ref.starts_with('#') {
        // Strip selector suffixes like `:not(title)`
        Some(model_ref.split(':').next().unwrap_or(model_ref).to_string())
    } else {
        None
    };

    if let Some(cat) = category
        && let Some(tags) = lookup::get_content_model_tags(spec, &cat)
    {
        return tags.iter().any(|t| {
            // Direct match
            t.eq_ignore_ascii_case(child_name)
                // Attribute selector prefix: "meta[itemprop]" matches "meta"
                || t.split('[')
                    .next()
                    .is_some_and(|prefix| prefix.eq_ignore_ascii_case(child_name))
                // Namespace prefix: "svg|svg" matches "svg"
                || t.split('|')
                    .nth(1)
                    .is_some_and(|local| {
                        local.eq_ignore_ascii_case(child_name)
                            || local
                                .split('[')
                                .next()
                                .is_some_and(|lp| lp.eq_ignore_ascii_case(child_name))
                    })
        });
    }

    false
}

/// Check if a child name matches a `ModelOrPatterns`.
pub fn matches_model(spec: &MLMLSpec, child_name: &str, model: &ModelOrPatterns) -> bool {
    match model {
        ModelOrPatterns::Single(s) => matches_model_ref(spec, child_name, s),
        ModelOrPatterns::MultipleStrings(arr) => arr.iter().any(|s| matches_model_ref(spec, child_name, s)),
        ModelOrPatterns::Patterns(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::spec::load_spec;

    fn html_spec() -> MLMLSpec {
        let json = include_str!("../../../../../packages/@markuplint/html-spec/index.json");
        load_spec(json).unwrap()
    }

    // --- Deserialization ---

    #[test]
    fn void_element_br() {
        let spec = html_spec();
        let cm = get_content_model(&spec, "br").unwrap();
        assert!(is_void(&cm));
    }

    #[test]
    fn div_has_patterns() {
        let spec = html_spec();
        let cm = get_content_model(&spec, "div").unwrap();
        assert!(!is_void(&cm));
        assert!(matches!(cm.contents, ContentModelContents::Patterns(_)));
    }

    #[test]
    fn table_has_choice() {
        let spec = html_spec();
        let cm = get_content_model(&spec, "table").unwrap();
        if let ContentModelContents::Patterns(patterns) = &cm.contents {
            assert!(patterns.iter().any(|p| matches!(p, PermittedContentPattern::Choice(_))));
        } else {
            panic!("table should have patterns");
        }
    }

    #[test]
    fn details_has_require() {
        let spec = html_spec();
        let cm = get_content_model(&spec, "details").unwrap();
        if let ContentModelContents::Patterns(patterns) = &cm.contents {
            assert!(
                patterns
                    .iter()
                    .any(|p| matches!(p, PermittedContentPattern::Require(_)))
            );
        } else {
            panic!("details should have patterns");
        }
    }

    #[test]
    fn a_has_transparent() {
        let spec = html_spec();
        let cm = get_content_model(&spec, "a").unwrap();
        if let ContentModelContents::Patterns(patterns) = &cm.contents {
            assert!(
                patterns
                    .iter()
                    .any(|p| matches!(p, PermittedContentPattern::Transparent(_)))
            );
        } else {
            panic!("<a> should have patterns");
        }
    }

    #[test]
    fn all_content_models_deserialize() {
        let spec = html_spec();
        let mut failures = Vec::new();
        for el in &spec.specs {
            if serde_json::from_value::<ContentModel>(el.content_model.clone()).is_err() {
                failures.push(el.name.clone());
            }
        }
        assert!(failures.is_empty(), "Failed: {failures:?}");
    }

    // --- Model reference matching ---

    #[test]
    fn exact_tag_match() {
        let spec = html_spec();
        assert!(matches_model_ref(&spec, "li", "li"));
        assert!(!matches_model_ref(&spec, "li", "div"));
    }

    #[test]
    fn category_model_match() {
        let spec = html_spec();
        assert!(matches_model_ref(&spec, "div", ":model(flow)"));
        assert!(matches_model_ref(&spec, "p", ":model(flow)"));
        // "meta" is conditionally in #flow (as "meta[itemprop]"), so prefix match succeeds
        assert!(matches_model_ref(&spec, "meta", ":model(flow)"));
    }

    #[test]
    fn category_shorthand_match() {
        let spec = html_spec();
        assert!(matches_model_ref(&spec, "div", "#flow"));
    }

    #[test]
    fn category_with_selector_suffix() {
        let spec = html_spec();
        // #script-supporting includes "script" and "template"
        assert!(matches_model_ref(&spec, "script", "#script-supporting"));
    }

    #[test]
    fn model_or_patterns_single() {
        let spec = html_spec();
        let m = ModelOrPatterns::Single("li".to_string());
        assert!(matches_model(&spec, "li", &m));
        assert!(!matches_model(&spec, "div", &m));
    }

    #[test]
    fn model_or_patterns_multiple() {
        let spec = html_spec();
        let m = ModelOrPatterns::MultipleStrings(vec!["option".to_string(), "optgroup".to_string()]);
        assert!(matches_model(&spec, "option", &m));
        assert!(matches_model(&spec, "optgroup", &m));
        assert!(!matches_model(&spec, "div", &m));
    }

    // --- Conditional content model ---

    #[test]
    fn head_content_model_structure() {
        let spec = html_spec();
        let cm = get_content_model(&spec, "head").unwrap();
        if let ContentModelContents::Patterns(patterns) = &cm.contents {
            assert!(patterns.len() >= 2, "head should have multiple patterns");
            // Should have require(title) and zeroOrMore(metadata)
            let has_require = patterns
                .iter()
                .any(|p| matches!(p, PermittedContentPattern::Require(_)));
            assert!(has_require, "head should require title");
        } else {
            panic!("head should have patterns");
        }
    }
}
