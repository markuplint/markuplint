//! Type definitions for markuplint spec data.
//!
//! These types mirror the TypeScript definitions in `@markuplint/ml-spec/src/types/`.
//! Fields marked with `serde_json::Value` are intentionally untyped — see the inline
//! comments for each field explaining when they will be typed (tracked in #3521).

use std::collections::HashMap;

use serde::Deserialize;
use serde_json::Value;

// ============================================================
// Typed enums (replacing former Value escape hatches)
// ============================================================

/// TS: `true | { alt: string }`
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum Obsolete {
    /// Simply obsolete.
    Flag(bool),
    /// Obsolete with an alternative element/approach.
    Info {
        /// Suggested alternative.
        alt: String,
    },
}

/// TS: `false | string` — implicit ARIA role.
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum ImplicitRole {
    /// No implicit role (`false`).
    None(bool),
    /// A specific implicit role name (e.g., `"button"`, `"link"`).
    Role(String),
}

/// TS: `AttributeCondition = string | [string, ...string[]]`
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum AttributeCondition {
    /// Single CSS selector condition.
    Single(String),
    /// Multiple CSS selector conditions (any must match).
    Multiple(Vec<String>),
}

/// TS: `bool | AttributeCondition`
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum AttributeRequired {
    /// Always required or never required.
    Flag(bool),
    /// Required under specific conditions.
    Conditional(AttributeCondition),
}

/// TS: `'property' | 'state'`
#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ARIAPropertyType {
    /// An ARIA property.
    Property,
    /// An ARIA state.
    State,
}

/// TS: `ARIAAttributeValue` — 10 literal string union.
#[derive(Debug, Deserialize)]
pub enum ARIAAttributeValue {
    /// `"true/false"`
    #[serde(rename = "true/false")]
    TrueFalse,
    /// `"tristate"`
    #[serde(rename = "tristate")]
    Tristate,
    /// `"true/false/undefined"`
    #[serde(rename = "true/false/undefined")]
    TrueFalseUndefined,
    /// `"ID reference"`
    #[serde(rename = "ID reference")]
    IdReference,
    /// `"ID reference list"`
    #[serde(rename = "ID reference list")]
    IdReferenceList,
    /// `"integer"`
    #[serde(rename = "integer")]
    Integer,
    /// `"number"`
    #[serde(rename = "number")]
    Number,
    /// `"string"`
    #[serde(rename = "string")]
    StringValue,
    /// `"token"`
    #[serde(rename = "token")]
    Token,
    /// `"token list"`
    #[serde(rename = "token list")]
    TokenList,
    /// `"URI"`
    #[serde(rename = "URI")]
    Uri,
}

/// TS: `'idl' | 'both'`
#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AcceptedAttrNames {
    /// IDL attribute names only.
    Idl,
    /// Both IDL and content attribute names.
    Both,
}

/// TS: `'string' | 'number' | 'boolean' | 'code'`
#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DirectiveValueType {
    /// String value.
    String,
    /// Numeric value.
    Number,
    /// Boolean value.
    Boolean,
    /// Code expression value.
    Code,
}

/// TS: `true | readonly string[]`
#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum IsDuplicatable {
    /// Duplicatable for all cases.
    All(bool),
    /// Duplicatable only for specific attribute names.
    Specific(Vec<String>),
}

// ============================================================
// Top-level spec
// ============================================================

/// Root type for a markuplint spec (html-spec, react-spec, etc.).
#[derive(Debug, Deserialize)]
pub struct MLMLSpec {
    /// Reference URLs.
    pub cites: Vec<String>,
    /// Internal definitions (global attrs, ARIA, content models).
    pub def: SpecDefs,
    /// Element specifications.
    pub specs: Vec<ElementSpec>,
    /// Framework-specific directive patterns.
    #[serde(default, rename = "directivePatterns")]
    pub directive_patterns: Vec<DirectivePattern>,
    /// Accepted attribute name format.
    #[serde(default, rename = "acceptedAttrNames")]
    pub accepted_attr_names: Option<AcceptedAttrNames>,
}

/// Internal definition data.
#[derive(Debug, Deserialize)]
pub struct SpecDefs {
    /// Global attribute categories.
    /// Value remains `Value` — complex nested structure with 15+ known keys.
    /// Will be typed when global attr merging is implemented (#3521).
    #[serde(rename = "#globalAttrs")]
    pub global_attrs: HashMap<String, HashMap<String, Value>>,
    /// ARIA specs by version.
    #[serde(rename = "#aria")]
    pub aria: ARIAVersions,
    /// Content model category → tag name mappings.
    #[serde(rename = "#contentModels")]
    pub content_models: HashMap<String, Vec<String>>,
}

/// ARIA specs for each supported version.
#[derive(Debug, Deserialize)]
pub struct ARIAVersions {
    /// ARIA 1.3
    #[serde(rename = "1.3")]
    pub v1_3: ARIASpec,
    /// ARIA 1.2
    #[serde(rename = "1.2")]
    pub v1_2: ARIASpec,
    /// ARIA 1.1
    #[serde(rename = "1.1")]
    pub v1_1: ARIASpec,
}

/// ARIA role and property definitions for a specific version.
#[derive(Debug, Deserialize)]
pub struct ARIASpec {
    /// Standard roles.
    pub roles: Vec<ARIARoleInSchema>,
    /// Graphics roles (WAI-ARIA Graphics Module).
    #[serde(default, rename = "graphicsRoles")]
    pub graphics_roles: Vec<ARIARoleInSchema>,
    /// Digital Publishing roles (DPUB-ARIA).
    #[serde(default, rename = "dpubRoles")]
    pub dpub_roles: Vec<ARIARoleInSchema>,
    /// ARIA properties and states.
    pub props: Vec<ARIAProperty>,
}

// ============================================================
// Element spec
// ============================================================

/// A single element specification.
#[derive(Debug, Deserialize)]
pub struct ElementSpec {
    /// Tag name (e.g., "div", "input", "svg").
    pub name: String,
    /// Namespace URI.
    #[serde(default)]
    pub namespace: Option<String>,
    /// Reference URL.
    #[serde(default)]
    pub cite: String,
    /// Description.
    #[serde(default)]
    pub description: Option<String>,
    /// Experimental technology flag.
    #[serde(default)]
    pub experimental: Option<bool>,
    /// Obsolete flag or alternative info.
    /// TS: `true | { alt: string }`
    #[serde(default)]
    pub obsolete: Option<Obsolete>,
    /// Deprecated flag.
    #[serde(default)]
    pub deprecated: Option<bool>,
    /// Non-standard flag.
    #[serde(default, rename = "nonStandard")]
    pub non_standard: Option<bool>,
    /// Element categories (e.g., "#flow", "#phrasing").
    #[serde(default)]
    pub categories: Vec<String>,
    /// Permitted contents and parents.
    /// Remains `Value` — deserialized on demand via `get_content_model()`.
    #[serde(default, rename = "contentModel")]
    pub content_model: Value,
    /// Tag omission rules.
    /// Remains `Value` — complex conditional structure, typed when omission rules are implemented.
    #[serde(default)]
    pub omission: Value,
    /// Global attribute categories enabled for this element.
    /// Remains `Value` — 15+ known keys + pattern properties (#3521).
    #[serde(default, rename = "globalAttrs")]
    pub global_attrs: HashMap<String, Value>,
    /// Element-specific attributes.
    #[serde(default)]
    pub attributes: HashMap<String, Attribute>,
    /// WAI-ARIA configuration.
    #[serde(default)]
    pub aria: ElementARIA,
    /// Whether properties can be added (for framework components).
    #[serde(default, rename = "possibleToAddProperties")]
    pub possible_to_add_properties: Option<bool>,
}

// ============================================================
// Attribute
// ============================================================

/// An HTML/SVG attribute specification.
#[derive(Debug, Deserialize)]
pub struct Attribute {
    /// Attribute name (populated during resolution, not always in JSON).
    #[serde(default)]
    pub name: Option<String>,
    /// Attribute type — string (keyword type) or object (enum, token, number, etc.).
    /// Remains `Value` — 900+ CSS property keyword types as discriminated union.
    /// Will be typed in Phase 8-9 (invalid-attr rule implementation).
    #[serde(default, rename = "type")]
    pub attr_type: Value,
    /// Description.
    #[serde(default)]
    pub description: Option<String>,
    /// Whether the attribute value is case-sensitive.
    #[serde(default, rename = "caseSensitive")]
    pub case_sensitive: Option<bool>,
    /// Experimental flag.
    #[serde(default)]
    pub experimental: Option<bool>,
    /// Obsolete flag.
    #[serde(default)]
    pub obsolete: Option<bool>,
    /// Deprecated flag.
    #[serde(default)]
    pub deprecated: Option<bool>,
    /// Non-standard flag.
    #[serde(default, rename = "nonStandard")]
    pub non_standard: Option<bool>,
    /// Default value.
    #[serde(default, rename = "defaultValue")]
    pub default_value: Option<String>,
    /// Required flag or condition.
    /// TS: `bool | AttributeCondition`
    #[serde(default)]
    pub required: Option<AttributeRequired>,
    /// Alternative attributes: at least one of these must be present.
    /// E.g., `img[src]` has `requiredEither: ["srcset"]` — either `src` or `srcset` is required.
    #[serde(default, rename = "requiredEither")]
    pub required_either: Option<Vec<String>>,
    /// Condition under which this attribute applies.
    /// TS: `AttributeCondition` (CSS selector string or array of selector strings).
    #[serde(default)]
    pub condition: Option<AttributeCondition>,
    /// Equivalent states or properties.
    /// Remains `Value` — open dictionary `{[k: string]: unknown}`.
    #[serde(default, rename = "sameStates")]
    pub same_states: Option<Value>,
    /// Ineffective condition.
    /// TS: `AttributeCondition`
    #[serde(default)]
    pub ineffective: Option<AttributeCondition>,
    /// Animation type.
    #[serde(default, rename = "animationType")]
    pub animation_type: Option<String>,
    /// Whether this attribute should not be used (deprecated/disallowed in spec).
    #[serde(default, rename = "noUse")]
    pub no_use: Option<bool>,
}

// ============================================================
// ARIA types
// ============================================================

/// ARIA configuration for an element.
#[derive(Debug, Default, Deserialize)]
pub struct ElementARIA {
    /// Implicit (native) ARIA role.
    /// TS: `false | string`
    #[serde(default, rename = "implicitRole")]
    pub implicit_role: Option<ImplicitRole>,
    /// Permitted ARIA roles.
    /// Remains `Value` — complex 3-way union: `bool | (string | {name, deprecated})[] | AAMInfo`.
    /// Will be typed in Phase 2-3 (ARIA computation).
    #[serde(default, rename = "permittedRoles")]
    pub permitted_roles: Option<Value>,
    /// ARIA properties configuration.
    /// Remains `Value` — complex object with optional fields.
    /// Will be typed in Phase 2-3 (ARIA computation).
    #[serde(default)]
    pub properties: Option<Value>,
    /// Naming prohibited flag.
    #[serde(default, rename = "namingProhibited")]
    pub naming_prohibited: Option<bool>,
    /// Conditional ARIA overrides by selector.
    /// Values remain `Value` — recursive ARIA override structure.
    /// Will be typed in Phase 2-3 (ARIA computation).
    #[serde(default)]
    pub conditions: Option<HashMap<String, Value>>,
    /// ARIA 1.1 version-specific overrides.
    /// Remains `Value` — same shape as `ElementARIA` but version-specific.
    /// Will be typed in Phase 2-3 (ARIA computation).
    #[serde(default, rename = "1.1")]
    pub v1_1: Option<Value>,
    /// ARIA 1.2 version-specific overrides.
    /// Remains `Value` — same shape as `ElementARIA` but version-specific.
    /// Will be typed in Phase 2-3 (ARIA computation).
    #[serde(default, rename = "1.2")]
    pub v1_2: Option<Value>,
}

/// An ARIA role as defined in schema data.
#[derive(Debug, Deserialize, PartialEq)]
pub struct ARIARoleInSchema {
    /// Role name.
    pub name: String,
    /// Description.
    #[serde(default)]
    pub description: Option<String>,
    /// Whether this is an abstract role.
    #[serde(default, rename = "isAbstract")]
    pub is_abstract: Option<bool>,
    /// Deprecated flag.
    #[serde(default)]
    pub deprecated: Option<bool>,
    /// Generalization chain (parent roles).
    #[serde(default)]
    pub generalization: Vec<String>,
    /// Required accessibility parent roles.
    #[serde(default, rename = "requiredAccessibilityParentRole")]
    pub required_accessibility_parent_role: Vec<String>,
    /// Allowed accessibility child roles.
    #[serde(default, rename = "allowedAccessibilityChildRoles")]
    pub allowed_accessibility_child_roles: Vec<String>,
    /// Required context roles (ARIA 1.2 compat).
    #[serde(default, rename = "requiredContextRole")]
    pub required_context_role: Vec<String>,
    /// Required owned elements (ARIA 1.2 compat).
    #[serde(default, rename = "requiredOwnedElements")]
    pub required_owned_elements: Vec<String>,
    /// Whether accessible name is required.
    #[serde(default, rename = "accessibleNameRequired")]
    pub accessible_name_required: Option<bool>,
    /// Whether name can come from author.
    #[serde(default, rename = "accessibleNameFromAuthor")]
    pub accessible_name_from_author: Option<bool>,
    /// Whether name can come from content.
    #[serde(default, rename = "accessibleNameFromContent")]
    pub accessible_name_from_content: Option<bool>,
    /// Whether naming is prohibited.
    #[serde(default, rename = "accessibleNameProhibited")]
    pub accessible_name_prohibited: Option<bool>,
    /// Whether children are presentational.
    #[serde(default, rename = "childrenPresentational")]
    pub children_presentational: Option<bool>,
    /// Owned properties.
    #[serde(default, rename = "ownedProperties")]
    pub owned_properties: Vec<ARIARoleOwnedProperty>,
    /// Prohibited properties.
    #[serde(default, rename = "prohibitedProperties")]
    pub prohibited_properties: Vec<String>,
}

/// A property owned by an ARIA role.
#[derive(Debug, Deserialize, PartialEq)]
pub struct ARIARoleOwnedProperty {
    /// Property name.
    pub name: String,
    /// Whether inherited from a parent role.
    #[serde(default)]
    pub inherited: Option<bool>,
    /// Whether required for this role.
    #[serde(default)]
    pub required: Option<bool>,
    /// Whether deprecated.
    #[serde(default)]
    pub deprecated: Option<bool>,
}

/// An ARIA property or state definition.
#[derive(Debug, Deserialize)]
pub struct ARIAProperty {
    /// Property name (e.g., "aria-label", "aria-hidden").
    pub name: String,
    /// Whether this is a "property" or "state".
    #[serde(rename = "type")]
    pub prop_type: ARIAPropertyType,
    /// Deprecated flag.
    #[serde(default)]
    pub deprecated: Option<bool>,
    /// Whether this is a global ARIA property.
    #[serde(default, rename = "isGlobal")]
    pub is_global: Option<bool>,
    /// Value type.
    pub value: ARIAAttributeValue,
    /// Conditional values per role.
    #[serde(default, rename = "conditionalValue")]
    pub conditional_value: Option<Vec<ConditionalARIAValue>>,
    /// Allowed enum values.
    #[serde(default, rename = "enum")]
    pub enum_values: Vec<String>,
    /// Default value.
    #[serde(default, rename = "defaultValue")]
    pub default_value: Option<String>,
    /// Equivalent HTML attributes.
    #[serde(default, rename = "equivalentHtmlAttrs")]
    pub equivalent_html_attrs: Option<Vec<EquivalentHtmlAttr>>,
    /// Value descriptions.
    #[serde(default, rename = "valueDescriptions")]
    pub value_descriptions: Option<HashMap<String, String>>,
}

/// Conditional ARIA value override per role.
#[derive(Debug, Deserialize)]
pub struct ConditionalARIAValue {
    /// Roles to which this conditional value applies.
    pub role: Vec<String>,
    /// The value type for these roles.
    pub value: ARIAAttributeValue,
}

/// An HTML attribute equivalent to an ARIA property.
#[derive(Debug, Deserialize)]
pub struct EquivalentHtmlAttr {
    /// HTML attribute name.
    #[serde(rename = "htmlAttrName")]
    pub html_attr_name: String,
    /// Whether this is not a strict equivalent.
    #[serde(default, rename = "isNotStrictEquivalent")]
    pub is_not_strict_equivalent: Option<bool>,
    /// The mapped value (null means any value).
    pub value: Option<String>,
}

// ============================================================
// Directive pattern
// ============================================================

/// A pattern for resolving framework-specific directive attributes.
#[derive(Debug, Deserialize)]
pub struct DirectivePattern {
    /// Regex pattern matched against attribute names.
    pub pattern: String,
    /// Regex flags.
    #[serde(default)]
    pub flags: Option<String>,
    /// Template for resolved name (uses $1, $2 capture groups).
    #[serde(default, rename = "potentialName")]
    pub potential_name: Option<String>,
    /// Whether this is a directive.
    #[serde(default, rename = "isDirective")]
    pub is_directive: Option<bool>,
    /// Whether the value is dynamic.
    #[serde(default, rename = "isDynamicValue")]
    pub is_dynamic_value: Option<bool>,
    /// Semantic value type.
    #[serde(default, rename = "valueType")]
    pub value_type: Option<DirectiveValueType>,
    /// Whether duplicatable.
    /// TS: `true | readonly string[]`
    #[serde(default, rename = "isDuplicatable")]
    pub is_duplicatable: Option<IsDuplicatable>,
}
