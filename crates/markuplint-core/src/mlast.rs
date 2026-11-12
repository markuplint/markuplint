//! These types mirror the TS definitions in `@markuplint/ml-ast/src/types.ts`.
//! Unknown fields are silently ignored by serde (forward-compatibility).

use serde::{Deserialize, Serialize};

/// How a parser expects end tags (TS `MLParser.endTag`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EndTagType {
    /// HTML: some end tags may be left out.
    #[default]
    Omittable,
    /// XML-like (JSX, Vue, Svelte, Astro): every element is closed, by an end tag or a `/`.
    Xml,
    /// Indentation-based (Pug): no element has an end tag.
    Never,
}

/// TS `AttrNameRoute`: how the name of an attribute gets into the DOM of the browser, which
/// decides whether another spelling of the name is the same attribute.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize)]
pub enum AttrNameRoute {
    /// The HTML parser of the browser reads the name: it lower-cases it and restores the case of
    /// the names of SVG and `MathML`. Absent means this.
    #[default]
    #[serde(rename = "html-parser")]
    HtmlParser,
    /// Code sets the name as written (`setAttribute`): JSX, MDX and Vue.
    #[serde(rename = "dom-api")]
    DomApi,
    /// A static attribute is in an HTML string and a dynamic one is set by code: Svelte.
    #[serde(rename = "dom-api-when-dynamic")]
    DomApiWhenDynamic,
}

/// TS `MLParser#slotElement`: what the `slot` element is in the language of the document.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize)]
pub enum SlotElement {
    /// The HTML `slot` element, which has a slot assignment when it is in a shadow root. Absent
    /// means this.
    #[default]
    #[serde(rename = "html")]
    Html,
    /// The placeholder of a framework's component (Vue, Svelte, Astro): replaced with what it is
    /// given, so no slot assignment is computed.
    #[serde(rename = "framework")]
    Framework,
}

/// What the TS `Document` takes from the parser besides its nodes (`MLParser.endTag`,
/// `booleanish`, `tagNameCaseSensitive`, `attrNameCaseSensitive`, `attrNameRoute`,
/// `componentNameVariants`, `slotElement`). The TS engine sends them next to the `MLASTDocument` fields in the
/// same JSON, and every field may be absent, as it is for the HTML parser.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(clippy::struct_excessive_bools)] // one flag per option of the TS `MLParser`, read as the JSON has them
pub struct DocumentSettings {
    #[serde(default)]
    pub end_tag: EndTagType,
    /// An attribute written without a value counts as `true` (`<Component aria-hidden />`).
    #[serde(default)]
    pub booleanish: bool,
    #[serde(default)]
    pub tag_name_case_sensitive: bool,
    /// JSX and MDX: `onClick` is a distinct prop, not the HTML attribute `onclick`.
    #[serde(default)]
    pub attr_name_case_sensitive: bool,
    /// How the name of an attribute gets into the DOM (TS `MLParser.attrNameRoute`).
    #[serde(default)]
    pub attr_name_route: AttrNameRoute,
    /// A component is referred to by any spelling of its name, and the attribute of its usage
    /// site is a prop that Vue camelizes (TS `MLParser.componentNameVariants`).
    #[serde(default)]
    pub component_name_variants: bool,
    /// What the `slot` element is (TS `MLParser.slotElement`).
    #[serde(default)]
    pub slot_element: SlotElement,
}

/// Corresponds to `MLASTDocument` in TS.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MLASTDocument {
    pub raw: String,
    pub node_list: Vec<MLASTNode>,
    pub is_fragment: bool,
    #[serde(default)]
    pub unknown_parse_error: Option<String>,
}

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

#[derive(Debug, Clone, Deserialize)]
pub struct MLASTBlockBehavior {
    #[serde(rename = "type")]
    pub behavior_type: MLASTBlockBehaviorType,
    pub expression: String,
}

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

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type")]
pub enum MLASTAttr {
    #[serde(rename = "attr")]
    HTMLAttr(Box<MLASTHTMLAttr>),
    #[serde(rename = "spread")]
    Spread(MLASTSpreadAttr),
}

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
    /// TS `MLAttr#isDynamicValue`: the value is not known (code that is not a literal, a literal
    /// the framework renders in a way that is not known, or an attribute that is not output). The
    /// TS side of the MLAST path renders the value of a framework attribute before it hands the AST
    /// over; the HTML parser never sets it.
    #[serde(default)]
    pub is_dynamic_value: Option<bool>,
    /// TS `MLAttr#isExpressionValue`: the value is written as code. A literal written as code
    /// (`aria-busy={true}`) is an expression whose value is known, so this is not
    /// [`Self::is_dynamic_value`]: a rule that asks how a value is written (its quotes, its escapes)
    /// reads this one.
    #[serde(default)]
    pub is_expression_value: Option<bool>,
    /// TS `MLAttr#isAbsent`: the framework does not output the attribute, as its value is a
    /// literal it drops (`disabled={false}`). It is still among the attributes of the element, so a
    /// rule that judges the name sees it, but a lookup by name does not find it, as the DOM does not.
    #[serde(default)]
    pub is_absent: Option<bool>,
    #[serde(default)]
    pub is_directive: Option<bool>,
    #[serde(default)]
    pub potential_name: Option<String>,
    #[serde(default)]
    pub potential_value: Option<String>,
    #[serde(default)]
    pub value_type: Option<String>,
    /// How the DOM keys the name of this attribute (TS `MLAttr#keyOf`). `DomArena::set_settings`
    /// decides it from the settings of the parser and the element; `None` is what the HTML parser
    /// does ([`AttrNameFold::of_parser`]).
    #[serde(skip)]
    pub name_fold: Option<AttrNameFold>,
    #[serde(default)]
    pub candidate: Option<String>,
    pub is_duplicatable: bool,
}

/// How two spellings of an attribute name are one attribute: the key that TS `MLAttr#keyOf`
/// gives a name. It is up to how the name gets into the DOM and to the element.
///
/// - <https://html.spec.whatwg.org/multipage/parsing.html#attribute-name-state>
/// - <https://html.spec.whatwg.org/multipage/parsing.html#adjust-svg-attributes>
/// - <https://dom.spec.whatwg.org/#dom-element-setattribute>
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AttrNameFold {
    /// An element of the HTML namespace that the HTML parser reads: the ASCII letters fold.
    Ascii,
    /// An element of the HTML namespace whose attributes code sets (`setAttribute`): the ASCII
    /// letters fold, but a name with a capital letter is a prop of the framework (`defaultValue` of
    /// React), which only its exact spelling names (TS `MLAttr#isFrameworkPropName`).
    DomApi,
    /// An element of SVG or `MathML` that the HTML parser reads: the ASCII letters fold, and the
    /// parser restores the case of the names of the specifications (`viewbox` is `viewBox`).
    Foreign,
    /// The name as written: an element of SVG or `MathML` whose attributes code sets, or the prop
    /// of a component.
    Exact,
    /// The prop of a Vue component: the camelCase of the name (`my-label` is `myLabel`).
    VueProp,
}

impl AttrNameFold {
    /// What the HTML parser does with the name of an attribute of an element in `namespace`.
    #[must_use]
    pub fn of_parser(namespace: &NamespaceURI) -> Self {
        match namespace {
            NamespaceURI::XHTML => Self::Ascii,
            _ => Self::Foreign,
        }
    }

    /// TS `MLAttr#keyOf`: how an attribute is keyed, by the settings of the parser, the element
    /// and whether the value of the attribute is written as code.
    #[must_use]
    pub fn of(
        settings: &DocumentSettings,
        element_type: &ElementType,
        namespace: &NamespaceURI,
        is_expression_value: bool,
    ) -> Self {
        if *element_type == ElementType::Authored {
            return if settings.component_name_variants {
                Self::VueProp
            } else {
                Self::Exact
            };
        }
        // TS `MLAttr#isSetThroughDOMAPI`
        let through_dom_api = match settings.attr_name_route {
            AttrNameRoute::HtmlParser => false,
            AttrNameRoute::DomApi => true,
            AttrNameRoute::DomApiWhenDynamic => is_expression_value,
        };
        match (namespace, through_dom_api) {
            (NamespaceURI::XHTML, false) => Self::Ascii,
            (NamespaceURI::XHTML, true) => Self::DomApi,
            (_, false) => Self::Foreign,
            (_, true) => Self::Exact,
        }
    }
}

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

/// Corresponds to `MLASTParseError` in TS: a non-fatal parse error the parser
/// reported, which does not abort linting but which rules can read.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MLASTParseError {
    /// The parse error code, kebab-case (parse5's `ERR` names).
    pub code: String,
    pub start_offset: usize,
    pub start_line: u32,
    pub start_col: u32,
    pub end_offset: usize,
    pub end_line: u32,
    pub end_col: u32,
    pub raw: String,
}

/// Corresponds to `MLASTToken` in TS.
#[derive(Debug, Clone, Deserialize)]
pub struct MLASTToken {
    pub uuid: String,
    pub raw: String,
    pub offset: usize,
    pub line: u32,
    pub col: u32,
}

/// Corresponds to `ElementType` in TS.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ElementType {
    Html,
    WebComponent,
    Authored,
}

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

/// Corresponds to `Namespace` in TS.
#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Namespace {
    Html,
    Svg,
    Mml,
    Xlink,
}

/// `serde_json` has a default recursion limit of 128. For deeply nested
/// documents, consider using `parse_mlast_deep` instead.
///
/// # Errors
///
/// Returns an error if the JSON string is not valid MLAST.
pub fn parse_mlast(json: &str) -> Result<MLASTDocument, serde_json::Error> {
    serde_json::from_str(json)
}

/// The settings the parser sent next to the nodes; see [`DocumentSettings`].
///
/// # Errors
///
/// Returns an error if the JSON string is not valid JSON or a setting has an unknown value.
pub fn parse_document_settings(json: &str) -> Result<DocumentSettings, serde_json::Error> {
    serde_json::from_str(json)
}

/// For deeply nested documents that exceed `serde_json`'s default 128-level
/// recursion limit.
///
/// # Errors
///
/// Returns an error if the JSON string is not valid MLAST.
pub fn parse_mlast_deep(json: &str) -> Result<MLASTDocument, serde_json::Error> {
    let mut deserializer = serde_json::Deserializer::from_str(json);
    deserializer.disable_recursion_limit();
    serde::Deserialize::deserialize(&mut deserializer)
}
