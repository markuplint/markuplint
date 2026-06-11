//! These types mirror the TypeScript definitions in `@markuplint/ml-spec/src/types/`.
//! Fields marked with `serde_json::Value` are intentionally untyped — see the inline
//! comments for each field explaining when they will be typed (tracked in #3521).

use std::collections::HashMap;

use serde::Deserialize;
use serde_json::Value;

// ============================================================
// Typed enums
// ============================================================

/// TS: `true | { alt: string }`
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum Obsolete {
    Flag(bool),
    Info { alt: String },
}

/// TS: `false | string` — implicit ARIA role.
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum ImplicitRole {
    None(bool),
    Role(String),
}

/// TS: `AttributeCondition = string | [string, ...string[]]`
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum AttributeCondition {
    Single(String),
    Multiple(Vec<String>),
}

/// TS: `bool | AttributeCondition`
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum AttributeRequired {
    Flag(bool),
    Conditional(AttributeCondition),
}

/// TS: `'property' | 'state'`
#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ARIAPropertyType {
    Property,
    State,
}

/// TS: `ARIAAttributeValue` — 10 literal string union.
#[derive(Debug, Deserialize)]
pub enum ARIAAttributeValue {
    #[serde(rename = "true/false")]
    TrueFalse,
    #[serde(rename = "tristate")]
    Tristate,
    #[serde(rename = "true/false/undefined")]
    TrueFalseUndefined,
    #[serde(rename = "ID reference")]
    IdReference,
    #[serde(rename = "ID reference list")]
    IdReferenceList,
    #[serde(rename = "integer")]
    Integer,
    #[serde(rename = "number")]
    Number,
    #[serde(rename = "string")]
    StringValue,
    #[serde(rename = "token")]
    Token,
    #[serde(rename = "token list")]
    TokenList,
    #[serde(rename = "URI")]
    Uri,
}

/// TS: `'idl' | 'both'`
#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AcceptedAttrNames {
    Idl,
    Both,
}

/// TS: `'string' | 'number' | 'boolean' | 'code'`
#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DirectiveValueType {
    String,
    Number,
    Boolean,
    Code,
}

/// TS: `true | readonly string[]`
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum IsDuplicatable {
    All(bool),
    Specific(Vec<String>),
}

// ============================================================
// Top-level spec
// ============================================================

#[derive(Debug, Deserialize)]
pub struct MLMLSpec {
    pub cites: Vec<String>,
    pub def: SpecDefs,
    pub specs: Vec<ElementSpec>,
    #[serde(default, rename = "directivePatterns")]
    pub directive_patterns: Vec<DirectivePattern>,
    #[serde(default, rename = "acceptedAttrNames")]
    pub accepted_attr_names: Option<AcceptedAttrNames>,
}

#[derive(Debug, Deserialize)]
pub struct SpecDefs {
    /// Value remains `Value` — complex nested structure with 15+ known keys.
    /// Will be typed when global attr merging is implemented (#3521).
    #[serde(rename = "#globalAttrs")]
    pub global_attrs: HashMap<String, HashMap<String, Value>>,
    #[serde(rename = "#aria")]
    pub aria: ARIAVersions,
    #[serde(rename = "#contentModels")]
    pub content_models: HashMap<String, Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct ARIAVersions {
    #[serde(rename = "1.3")]
    pub v1_3: ARIASpec,
    #[serde(rename = "1.2")]
    pub v1_2: ARIASpec,
    #[serde(rename = "1.1")]
    pub v1_1: ARIASpec,
}

#[derive(Debug, Deserialize)]
pub struct ARIASpec {
    pub roles: Vec<ARIARoleInSchema>,
    /// WAI-ARIA Graphics Module roles.
    #[serde(default, rename = "graphicsRoles")]
    pub graphics_roles: Vec<ARIARoleInSchema>,
    /// DPUB-ARIA (Digital Publishing) roles.
    #[serde(default, rename = "dpubRoles")]
    pub dpub_roles: Vec<ARIARoleInSchema>,
    pub props: Vec<ARIAProperty>,
}

// ============================================================
// Element spec
// ============================================================

#[derive(Debug, Deserialize)]
pub struct ElementSpec {
    pub name: String,
    #[serde(default)]
    pub namespace: Option<String>,
    #[serde(default)]
    pub cite: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub experimental: Option<bool>,
    /// TS: `true | { alt: string }`
    #[serde(default)]
    pub obsolete: Option<Obsolete>,
    #[serde(default)]
    pub deprecated: Option<bool>,
    #[serde(default, rename = "nonStandard")]
    pub non_standard: Option<bool>,
    #[serde(default)]
    pub categories: Vec<String>,
    /// Remains `Value` — deserialized on demand via `get_content_model()`.
    #[serde(default, rename = "contentModel")]
    pub content_model: Value,
    /// Remains `Value` — complex conditional structure, typed when omission rules are implemented.
    #[serde(default)]
    pub omission: Value,
    /// Remains `Value` — 15+ known keys + pattern properties (#3521).
    #[serde(default, rename = "globalAttrs")]
    pub global_attrs: HashMap<String, Value>,
    #[serde(default)]
    pub attributes: HashMap<String, Attribute>,
    #[serde(default)]
    pub aria: ElementARIA,
    #[serde(default, rename = "possibleToAddProperties")]
    pub possible_to_add_properties: Option<bool>,
}

// ============================================================
// Attribute
// ============================================================

#[derive(Debug, Deserialize)]
pub struct Attribute {
    /// Populated during resolution, not always present in the source JSON.
    #[serde(default)]
    pub name: Option<String>,
    /// Remains `Value` — 900+ CSS property keyword types as discriminated union.
    /// Will be typed in Phase 8-9 (invalid-attr rule implementation).
    #[serde(default, rename = "type")]
    pub attr_type: Value,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default, rename = "caseSensitive")]
    pub case_sensitive: Option<bool>,
    #[serde(default)]
    pub experimental: Option<bool>,
    #[serde(default)]
    pub obsolete: Option<bool>,
    #[serde(default)]
    pub deprecated: Option<bool>,
    #[serde(default, rename = "nonStandard")]
    pub non_standard: Option<bool>,
    #[serde(default, rename = "defaultValue")]
    pub default_value: Option<String>,
    /// TS: `bool | AttributeCondition`
    #[serde(default)]
    pub required: Option<AttributeRequired>,
    /// At least one of these attributes must be present.
    /// E.g., `img[src]` has `requiredEither: ["srcset"]` — either `src` or `srcset` is required.
    #[serde(default, rename = "requiredEither")]
    pub required_either: Option<Vec<String>>,
    /// TS: `AttributeCondition` (CSS selector string or array of selector strings).
    #[serde(default)]
    pub condition: Option<AttributeCondition>,
    /// Remains `Value` — open dictionary `{[k: string]: unknown}`.
    #[serde(default, rename = "sameStates")]
    pub same_states: Option<Value>,
    /// TS: `AttributeCondition`
    #[serde(default)]
    pub ineffective: Option<AttributeCondition>,
    #[serde(default, rename = "animationType")]
    pub animation_type: Option<String>,
    #[serde(default, rename = "noUse")]
    pub no_use: Option<bool>,
}

// ============================================================
// ARIA types
// ============================================================

#[derive(Debug, Default, Deserialize)]
pub struct ElementARIA {
    /// TS: `false | string`
    #[serde(default, rename = "implicitRole")]
    pub implicit_role: Option<ImplicitRole>,
    /// Remains `Value` — complex 3-way union: `bool | (string | {name, deprecated})[] | AAMInfo`.
    /// Will be typed in Phase 2-3 (ARIA computation).
    #[serde(default, rename = "permittedRoles")]
    pub permitted_roles: Option<Value>,
    /// Remains `Value` — complex object with optional fields.
    /// Will be typed in Phase 2-3 (ARIA computation).
    #[serde(default)]
    pub properties: Option<Value>,
    #[serde(default, rename = "namingProhibited")]
    pub naming_prohibited: Option<bool>,
    /// Values remain `Value` — recursive ARIA override structure.
    /// Will be typed in Phase 2-3 (ARIA computation).
    #[serde(default)]
    pub conditions: Option<HashMap<String, Value>>,
    /// Remains `Value` — same shape as `ElementARIA` but version-specific.
    /// Will be typed in Phase 2-3 (ARIA computation).
    #[serde(default, rename = "1.1")]
    pub v1_1: Option<Value>,
    /// Remains `Value` — same shape as `ElementARIA` but version-specific.
    /// Will be typed in Phase 2-3 (ARIA computation).
    #[serde(default, rename = "1.2")]
    pub v1_2: Option<Value>,
}

#[derive(Debug, Deserialize, PartialEq)]
pub struct ARIARoleInSchema {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default, rename = "isAbstract")]
    pub is_abstract: Option<bool>,
    #[serde(default)]
    pub deprecated: Option<bool>,
    #[serde(default)]
    pub generalization: Vec<String>,
    #[serde(default, rename = "requiredAccessibilityParentRole")]
    pub required_accessibility_parent_role: Vec<String>,
    #[serde(default, rename = "allowedAccessibilityChildRoles")]
    pub allowed_accessibility_child_roles: Vec<String>,
    /// ARIA 1.2 compatibility field.
    #[serde(default, rename = "requiredContextRole")]
    pub required_context_role: Vec<String>,
    /// ARIA 1.2 compatibility field.
    #[serde(default, rename = "requiredOwnedElements")]
    pub required_owned_elements: Vec<String>,
    #[serde(default, rename = "accessibleNameRequired")]
    pub accessible_name_required: Option<bool>,
    #[serde(default, rename = "accessibleNameFromAuthor")]
    pub accessible_name_from_author: Option<bool>,
    #[serde(default, rename = "accessibleNameFromContent")]
    pub accessible_name_from_content: Option<bool>,
    #[serde(default, rename = "accessibleNameProhibited")]
    pub accessible_name_prohibited: Option<bool>,
    #[serde(default, rename = "childrenPresentational")]
    pub children_presentational: Option<bool>,
    #[serde(default, rename = "ownedProperties")]
    pub owned_properties: Vec<ARIARoleOwnedProperty>,
    #[serde(default, rename = "prohibitedProperties")]
    pub prohibited_properties: Vec<String>,
}

#[derive(Debug, Deserialize, PartialEq)]
pub struct ARIARoleOwnedProperty {
    pub name: String,
    #[serde(default)]
    pub inherited: Option<bool>,
    #[serde(default)]
    pub required: Option<bool>,
    #[serde(default)]
    pub deprecated: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ARIAProperty {
    pub name: String,
    #[serde(rename = "type")]
    pub prop_type: ARIAPropertyType,
    #[serde(default)]
    pub deprecated: Option<bool>,
    #[serde(default, rename = "isGlobal")]
    pub is_global: Option<bool>,
    pub value: ARIAAttributeValue,
    #[serde(default, rename = "conditionalValue")]
    pub conditional_value: Option<Vec<ConditionalARIAValue>>,
    #[serde(default, rename = "enum")]
    pub enum_values: Vec<String>,
    #[serde(default, rename = "defaultValue")]
    pub default_value: Option<String>,
    #[serde(default, rename = "equivalentHtmlAttrs")]
    pub equivalent_html_attrs: Option<Vec<EquivalentHtmlAttr>>,
    #[serde(default, rename = "valueDescriptions")]
    pub value_descriptions: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
pub struct ConditionalARIAValue {
    pub role: Vec<String>,
    pub value: ARIAAttributeValue,
}

#[derive(Debug, Deserialize)]
pub struct EquivalentHtmlAttr {
    #[serde(rename = "htmlAttrName")]
    pub html_attr_name: String,
    #[serde(default, rename = "isNotStrictEquivalent")]
    pub is_not_strict_equivalent: Option<bool>,
    /// `None` matches any value.
    pub value: Option<String>,
}

// ============================================================
// Directive pattern
// ============================================================

#[derive(Debug, Deserialize)]
pub struct DirectivePattern {
    pub pattern: String,
    #[serde(default)]
    pub flags: Option<String>,
    /// Template for the resolved name; uses `$1`, `$2` capture-group references.
    #[serde(default, rename = "potentialName")]
    pub potential_name: Option<String>,
    #[serde(default, rename = "isDirective")]
    pub is_directive: Option<bool>,
    #[serde(default, rename = "isDynamicValue")]
    pub is_dynamic_value: Option<bool>,
    #[serde(default, rename = "valueType")]
    pub value_type: Option<DirectiveValueType>,
    /// TS: `true | readonly string[]`
    #[serde(default, rename = "isDuplicatable")]
    pub is_duplicatable: Option<IsDuplicatable>,
}
