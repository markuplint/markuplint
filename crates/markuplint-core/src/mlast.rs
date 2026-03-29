//! MLAST serde type definitions.
//!
//! These types mirror the TS definitions in `@markuplint/ml-ast/src/types.ts`.
//! The `type` field is used as serde tag for discriminated unions.
//! Unknown fields are silently ignored by serde (forward-compatibility).

use serde::{Deserialize, Serialize};

/// Root document node returned by a parser.
/// Corresponds to `MLASTDocument` in TS.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MLASTDocument {
    /// The full original source code.
    pub raw: String,
    /// Flat list of top-level AST nodes in document order.
    pub node_list: Vec<MLASTNode>,
    /// Whether the document is a fragment (no root element required).
    pub is_fragment: bool,
    /// A description of any unknown parse error that occurred, if any.
    #[serde(default)]
    pub unknown_parse_error: Option<String>,
}

/// Discriminated union of all AST node types.
/// Uses `type` field as the serde tag.
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type")]
pub enum MLASTNode {
    #[serde(rename = "starttag")]
    Element(MLASTElement),
    #[serde(rename = "endtag")]
    EndTag(MLASTElementCloseTag),
    #[serde(rename = "text")]
    Text(MLASTText),
    #[serde(rename = "comment")]
    Comment(MLASTComment),
    #[serde(rename = "doctype")]
    Doctype(MLASTDoctype),
    #[serde(rename = "psblock")]
    PSBlock(MLASTPSBlock),
    #[serde(rename = "omittedtag")]
    OmittedTag(MLASTOmittedTag),
    #[serde(rename = "invalid")]
    Invalid(MLASTInvalid),
}

/// An opening element tag (e.g. `<div class="foo">`).
/// Corresponds to `MLASTElement` in TS.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MLASTElement {
    pub uuid: String,
    pub raw: String,
    pub offset: usize,
    pub line: u32,
    pub col: u32,
    pub node_name: String,
    pub depth: u32,
    pub namespace: NamespaceURI,
    pub element_type: ElementType,
    pub is_fragment: bool,
    pub attributes: Vec<MLASTAttr>,
    #[serde(default)]
    pub has_spread_attr: Option<bool>,
    pub child_nodes: Vec<MLASTChildNode>,
    pub block_behavior: Option<MLASTBlockBehavior>,
    pub pair_node_uuid: Option<String>,
    pub tag_open_char: String,
    pub tag_close_char: String,
    pub is_ghost: bool,
    pub parent_node_uuid: Option<String>,
}

/// A closing element tag (e.g. `</div>`).
/// Corresponds to `MLASTElementCloseTag` in TS.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MLASTElementCloseTag {
    pub uuid: String,
    pub raw: String,
    pub offset: usize,
    pub line: u32,
    pub col: u32,
    pub node_name: String,
    pub depth: u32,
    pub pair_node_uuid: Option<String>,
    pub tag_open_char: String,
    pub tag_close_char: String,
    pub parent_node_uuid: Option<String>,
}

/// A preprocessor-specific block node (e.g. `{#if}` in Svelte).
/// Corresponds to `MLASTPreprocessorSpecificBlock` in TS.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MLASTPSBlock {
    pub uuid: String,
    pub raw: String,
    pub offset: usize,
    pub line: u32,
    pub col: u32,
    pub node_name: String,
    pub depth: u32,
    pub is_fragment: bool,
    pub child_nodes: Vec<MLASTChildNode>,
    pub block_behavior: Option<MLASTBlockBehavior>,
    pub is_bogus: bool,
    pub parent_node_uuid: Option<String>,
}

/// An omitted tag node (e.g. implicit `<tbody>`).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MLASTOmittedTag {
    pub uuid: String,
    pub raw: String,
    pub offset: usize,
    pub line: u32,
    pub col: u32,
    pub node_name: String,
    pub depth: u32,
    pub parent_node_uuid: Option<String>,
}

/// An HTML comment node (e.g. `<!-- ... -->`).
/// Corresponds to `MLASTComment` in TS.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MLASTComment {
    pub uuid: String,
    pub raw: String,
    pub offset: usize,
    pub line: u32,
    pub col: u32,
    pub node_name: String,
    pub depth: u32,
    pub is_bogus: bool,
    pub parent_node_uuid: Option<String>,
}

/// A text node containing character data between elements.
/// Corresponds to `MLASTText` in TS.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MLASTText {
    pub uuid: String,
    pub raw: String,
    pub offset: usize,
    pub line: u32,
    pub col: u32,
    pub node_name: String,
    pub depth: u32,
    pub parent_node_uuid: Option<String>,
}

/// A DOCTYPE declaration node (e.g. `<!DOCTYPE html>`).
/// Corresponds to `MLASTDoctype` in TS.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MLASTDoctype {
    pub uuid: String,
    pub raw: String,
    pub offset: usize,
    pub line: u32,
    pub col: u32,
    pub node_name: String,
    pub depth: u32,
    pub name: String,
    pub public_id: String,
    pub system_id: String,
    pub parent_node_uuid: Option<String>,
}

/// A node representing markup that could not be parsed correctly.
/// Corresponds to `MLASTInvalid` in TS.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MLASTInvalid {
    pub uuid: String,
    pub raw: String,
    pub offset: usize,
    pub line: u32,
    pub col: u32,
    pub node_name: String,
    pub depth: u32,
    /// The kind of node this was intended to be before parsing failed.
    #[serde(default)]
    pub kind: Option<String>,
    pub is_bogus: bool,
    pub parent_node_uuid: Option<String>,
}

/// Child node types (nodes that can appear inside an element or psblock).
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type")]
pub enum MLASTChildNode {
    #[serde(rename = "starttag")]
    Element(MLASTElement),
    #[serde(rename = "endtag")]
    EndTag(MLASTElementCloseTag),
    #[serde(rename = "text")]
    Text(MLASTText),
    #[serde(rename = "comment")]
    Comment(MLASTComment),
    #[serde(rename = "psblock")]
    PSBlock(MLASTPSBlock),
    #[serde(rename = "invalid")]
    Invalid(MLASTInvalid),
}

/// Describes the behavior of a preprocessor block or element.
#[derive(Debug, Clone, Deserialize)]
pub struct MLASTBlockBehavior {
    /// The kind of block behavior.
    #[serde(rename = "type")]
    pub behavior_type: MLASTBlockBehaviorType,
    /// The source expression associated with this block.
    pub expression: String,
}

/// The type of control-flow construct represented by a block behavior.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub enum MLASTBlockBehaviorType {
    #[serde(rename = "if")]
    If,
    #[serde(rename = "if:elseif")]
    IfElseIf,
    #[serde(rename = "if:else")]
    IfElse,
    #[serde(rename = "switch:case")]
    SwitchCase,
    #[serde(rename = "switch:default")]
    SwitchDefault,
    #[serde(rename = "each")]
    Each,
    #[serde(rename = "each:empty")]
    EachEmpty,
    #[serde(rename = "await")]
    Await,
    #[serde(rename = "await:then")]
    AwaitThen,
    #[serde(rename = "await:catch")]
    AwaitCatch,
    #[serde(rename = "end")]
    End,
}

/// Discriminated union of attribute types.
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type")]
pub enum MLASTAttr {
    #[serde(rename = "attr")]
    HTMLAttr(Box<MLASTHTMLAttr>),
    #[serde(rename = "spread")]
    Spread(MLASTSpreadAttr),
}

/// A regular HTML attribute, decomposed into tokens.
/// Corresponds to `MLASTHTMLAttr` in TS.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MLASTHTMLAttr {
    pub uuid: String,
    pub raw: String,
    pub offset: usize,
    pub line: u32,
    pub col: u32,
    pub node_name: String,
    pub spaces_before_name: MLASTToken,
    pub name: MLASTToken,
    pub spaces_before_equal: MLASTToken,
    pub equal: MLASTToken,
    pub spaces_after_equal: MLASTToken,
    pub start_quote: MLASTToken,
    pub value: MLASTToken,
    pub end_quote: MLASTToken,
    #[serde(default)]
    pub is_dynamic_value: Option<bool>,
    #[serde(default)]
    pub is_directive: Option<bool>,
    #[serde(default)]
    pub potential_name: Option<String>,
    #[serde(default)]
    pub potential_value: Option<String>,
    #[serde(default)]
    pub value_type: Option<String>,
    #[serde(default)]
    pub candidate: Option<String>,
    pub is_duplicatable: bool,
}

/// A spread attribute node (e.g. `{...props}` in JSX).
/// Corresponds to `MLASTSpreadAttr` in TS.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MLASTSpreadAttr {
    pub uuid: String,
    pub raw: String,
    pub offset: usize,
    pub line: u32,
    pub col: u32,
    pub node_name: String,
}

/// Base token with positional information.
/// Corresponds to `MLASTToken` in TS.
#[derive(Debug, Clone, Deserialize)]
pub struct MLASTToken {
    pub uuid: String,
    pub raw: String,
    pub offset: usize,
    pub line: u32,
    pub col: u32,
}

/// Element type classification.
/// Corresponds to `ElementType` in TS.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ElementType {
    Html,
    WebComponent,
    Authored,
}

/// Standard namespace URIs for HTML, SVG, `MathML`, and `XLink`.
/// Corresponds to `NamespaceURI` in TS.
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub enum NamespaceURI {
    #[serde(rename = "http://www.w3.org/1999/xhtml")]
    XHTML,
    #[serde(rename = "http://www.w3.org/2000/svg")]
    SVG,
    #[serde(rename = "http://www.w3.org/1998/Math/MathML")]
    MathML,
    #[serde(rename = "http://www.w3.org/1999/xlink")]
    XLink,
}

/// Short namespace identifiers used internally.
/// Corresponds to `Namespace` in TS.
#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Namespace {
    Html,
    Svg,
    Mml,
    Xlink,
}

/// Parse an MLAST JSON string into an `MLASTDocument`.
///
/// # Errors
///
/// Returns an error if the JSON string is not valid MLAST.
///
/// Note: `serde_json` has a default recursion limit of 128. For deeply nested
/// documents, consider using `parse_mlast_deep` instead.
pub fn parse_mlast(json: &str) -> Result<MLASTDocument, serde_json::Error> {
    serde_json::from_str(json)
}

/// Parse an MLAST JSON string with no recursion limit.
///
/// Uses `serde_json::Deserializer::disable_recursion_limit()` to handle
/// deeply nested documents that exceed the default 128-level limit.
///
/// # Errors
///
/// Returns an error if the JSON string is not valid MLAST.
pub fn parse_mlast_deep(json: &str) -> Result<MLASTDocument, serde_json::Error> {
    let mut deserializer = serde_json::Deserializer::from_str(json);
    deserializer.disable_recursion_limit();
    serde::Deserialize::deserialize(&mut deserializer)
}
