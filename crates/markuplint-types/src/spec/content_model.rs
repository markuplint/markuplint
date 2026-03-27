//! Content model types and validation.
//!
//! Defines the permitted content patterns for HTML elements and provides
//! functions to check whether a child element name conforms to the content model.
//!
//! Corresponds to `@markuplint/ml-spec/src/types/permitted-structures.ts`
//! and `@markuplint/rules/src/permitted-contents/`.

use super::lookup;
use super::types::MLMLSpec;
use serde::Deserialize;
use serde_json::Value;

// ============================================================
// Serde types for content model patterns
// ============================================================

/// Content model for an element.
#[derive(Debug, Deserialize)]
pub struct ContentModel {
    /// Permitted content patterns, or `false` for void elements.
    pub contents: ContentModelContents,
    /// Required ancestor element.
    #[serde(default, rename = "descendantOf")]
    pub descendant_of: Option<String>,
    /// Conditional content models (selector → alternative contents).
    #[serde(default)]
    pub conditional: Option<Vec<ConditionalContentModel>>,
}

/// The `contents` field: either `false` (void) or a list of patterns.
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum ContentModelContents {
    /// Void element — no content permitted (`false`), or any content (`true`).
    Boolean(bool),
    /// Permitted content patterns.
    Patterns(Vec<PermittedContentPattern>),
}

/// A conditional content model override.
#[derive(Debug, Deserialize)]
pub struct ConditionalContentModel {
    /// CSS selector condition.
    pub condition: String,
    /// Content patterns when condition matches.
    pub contents: ContentModelContents,
}

/// A single permitted content pattern (discriminated by key).
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum PermittedContentPattern {
    Require(RequirePattern),
    Optional(OptionalPattern),
    OneOrMore(OneOrMorePattern),
    ZeroOrMore(ZeroOrMorePattern),
    Choice(ChoicePattern),
    Transparent(TransparentPattern),
}

#[derive(Debug, Deserialize)]
pub struct RequirePattern {
    pub require: ModelOrPatterns,
    #[serde(default)]
    pub max: Option<u32>,
    #[serde(default)]
    pub min: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct OptionalPattern {
    pub optional: ModelOrPatterns,
    #[serde(default)]
    pub max: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct OneOrMorePattern {
    #[serde(rename = "oneOrMore")]
    pub one_or_more: ModelOrPatterns,
    #[serde(default)]
    pub max: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ZeroOrMorePattern {
    #[serde(rename = "zeroOrMore")]
    pub zero_or_more: ModelOrPatterns,
    #[serde(default)]
    pub max: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ChoicePattern {
    pub choice: Vec<Vec<PermittedContentPattern>>,
}

#[derive(Debug, Deserialize)]
pub struct TransparentPattern {
    pub transparent: String,
}

/// Model reference: string, array of strings/patterns, or nested patterns.
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum ModelOrPatterns {
    /// Single tag name or `:model(category)` reference.
    Single(String),
    /// Multiple tag names or category references.
    Multiple(Vec<Value>),
}

// ============================================================
// Content model access
// ============================================================

/// Get the typed content model for an element.
pub fn get_content_model(spec: &MLMLSpec, element_name: &str) -> Option<ContentModel> {
    let el = lookup::get_spec(spec, element_name)?;
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
pub fn matches_model_ref(spec: &MLMLSpec, child_name: &str, model_ref: &str) -> bool {
    // Exact tag name match
    if model_ref.eq_ignore_ascii_case(child_name) {
        return true;
    }

    // Category reference: `:model(category)` or `#category`
    let category = if let Some(cat) = model_ref.strip_prefix(":model(") {
        cat.strip_suffix(')').map(|c| format!("#{c}"))
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
            t.eq_ignore_ascii_case(child_name)
                || t.split('[')
                    .next()
                    .is_some_and(|prefix| prefix.eq_ignore_ascii_case(child_name))
        });
    }

    false
}

/// Check if a child name matches a `ModelOrPatterns`.
pub fn matches_model(spec: &MLMLSpec, child_name: &str, model: &ModelOrPatterns) -> bool {
    match model {
        ModelOrPatterns::Single(s) => matches_model_ref(spec, child_name, s),
        ModelOrPatterns::Multiple(arr) => arr
            .iter()
            .filter_map(|v| v.as_str())
            .any(|s| matches_model_ref(spec, child_name, s)),
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
        let m = ModelOrPatterns::Multiple(vec![
            Value::String("option".to_string()),
            Value::String("optgroup".to_string()),
        ]);
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
