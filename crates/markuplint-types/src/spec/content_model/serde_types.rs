//! Serde types for content model patterns.
//!
//! Corresponds to `@markuplint/ml-spec/src/types/permitted-structures.ts`.

use serde::Deserialize;

/// Content model for an element.
#[derive(Debug, Clone, Deserialize)]
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
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum ContentModelContents {
    /// Void element — no content permitted (`false`), or any content (`true`).
    Boolean(bool),
    /// Permitted content patterns.
    Patterns(Vec<PermittedContentPattern>),
}

/// A conditional content model override.
#[derive(Debug, Clone, Deserialize)]
pub struct ConditionalContentModel {
    /// CSS selector condition.
    pub condition: String,
    /// Content patterns when condition matches.
    pub contents: ContentModelContents,
}

/// A single permitted content pattern (discriminated by key).
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum PermittedContentPattern {
    Require(RequirePattern),
    Optional(OptionalPattern),
    OneOrMore(OneOrMorePattern),
    ZeroOrMore(ZeroOrMorePattern),
    Choice(ChoicePattern),
    Transparent(TransparentPattern),
}

#[derive(Debug, Clone, Deserialize)]
pub struct RequirePattern {
    pub require: ModelOrPatterns,
    #[serde(default)]
    pub max: Option<u32>,
    #[serde(default)]
    pub min: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OptionalPattern {
    pub optional: ModelOrPatterns,
    #[serde(default)]
    pub max: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OneOrMorePattern {
    #[serde(rename = "oneOrMore")]
    pub one_or_more: ModelOrPatterns,
    #[serde(default)]
    pub max: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ZeroOrMorePattern {
    #[serde(rename = "zeroOrMore")]
    pub zero_or_more: ModelOrPatterns,
    #[serde(default)]
    pub max: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChoicePattern {
    pub choice: Vec<Vec<PermittedContentPattern>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TransparentPattern {
    pub transparent: String,
}

/// Model reference: string, array of strings, or nested patterns.
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum ModelOrPatterns {
    /// Single tag name or `:model(category)` reference.
    Single(String),
    /// Multiple tag names or category references (alternative selectors).
    MultipleStrings(Vec<String>),
    /// Nested pattern array (for recursive structure).
    Patterns(Vec<PermittedContentPattern>),
}
