//! Corresponds to `@markuplint/ml-spec/src/types/permitted-structures.ts`.

use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct ContentModel {
    pub contents: ContentModelContents,
    #[serde(default, rename = "descendantOf")]
    pub descendant_of: Option<String>,
    #[serde(default)]
    pub conditional: Option<Vec<ConditionalContentModel>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum ContentModelContents {
    /// `false` means void (no content); `true` means any content.
    Boolean(bool),
    Patterns(Vec<PermittedContentPattern>),
}

#[derive(Debug, Clone, Deserialize)]
pub struct ConditionalContentModel {
    /// CSS selector.
    pub condition: String,
    pub contents: ContentModelContents,
}

/// Untagged: each variant is discriminated by its distinguishing JSON key.
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
