//! N-API bridge for markuplint Rust modules (`markuplint-builder`).
//!
//! Exposes the Rust MLDOM, HTML parser, and type validators to Node.js via napi-rs.

#![allow(clippy::cast_possible_truncation)]

use markuplint_core::mlast::NamespaceURI;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::builder;
use markuplint_dom::html_builder;
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_types::css::value_match;
use markuplint_types::primitive;
use napi::bindgen_prelude::*;
use napi_derive::napi;

/// A DOM tree built from MLAST JSON or an HTML string.
///
/// Two construction paths:
/// - `new(mlast_json)` — from MLAST JSON (TS parser output)
/// - `from_html(html)` — direct HTML parsing via Rust parser
///
/// Then query nodes by UUID or traverse the tree.
#[napi]
pub struct NapiDom {
    arena: DomArena,
}

#[napi]
impl NapiDom {
    /// Build a DOM from an MLAST JSON string.
    ///
    /// # Errors
    ///
    /// Returns an error if the JSON cannot be parsed as a valid MLAST document.
    #[napi(constructor)]
    #[allow(clippy::needless_pass_by_value)]
    pub fn new(mlast_json: String) -> Result<Self> {
        let arena = builder::build_from_json(&mlast_json)
            .map_err(|e| Error::from_reason(format!("Failed to parse MLAST JSON: {e}")))?;
        Ok(Self { arena })
    }

    /// Build a DOM by parsing an HTML string directly (no MLAST JSON).
    ///
    /// Uses the Rust WHATWG-conformant HTML parser. Automatically detects
    /// whether the input is a full document or a fragment.
    #[napi(factory)]
    #[allow(clippy::needless_pass_by_value)]
    pub fn from_html(html: String) -> Self {
        let is_fragment = markuplint_html_parser::is_document_fragment(&html);
        let parser_arena = if is_fragment {
            markuplint_html_parser::parse_fragment(&html)
        } else {
            markuplint_html_parser::parse_document(&html)
        };
        let arena = html_builder::build_from_html_arena(&html, &parser_arena, is_fragment);
        Self { arena }
    }

    /// Total number of nodes in the DOM.
    #[napi(getter)]
    pub fn node_count(&self) -> u32 {
        self.arena.len() as u32
    }

    /// Get a node by its UUID string. Returns null if not found.
    #[napi]
    #[allow(clippy::needless_pass_by_value)]
    pub fn get_node_by_uuid(&self, uuid: String) -> Option<NapiNode> {
        let node = self.arena.get_by_uuid(&uuid)?;
        Some(to_napi_node(node))
    }

    /// Get a node by its internal ID. Returns null if not found.
    #[napi]
    pub fn get_node(&self, id: u32) -> Option<NapiNode> {
        let node = self.arena.get(id as NodeId)?;
        Some(to_napi_node(node))
    }

    /// Get all element nodes in the DOM.
    #[napi]
    pub fn get_elements(&self) -> Vec<NapiElement> {
        self.arena.elements().map(|(_, el)| to_napi_element(el)).collect()
    }

    /// Get the children of a node by its ID.
    #[napi]
    pub fn get_children(&self, id: u32) -> Vec<NapiNode> {
        self.arena
            .children_of(id as NodeId)
            .map(|ids| {
                ids.iter()
                    .filter_map(|&child_id| self.arena.get(child_id).map(to_napi_node))
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Get the parent of a node by its ID. Returns null if root.
    #[napi]
    pub fn get_parent(&self, id: u32) -> Option<NapiNode> {
        let parent = self.arena.parent(id as NodeId)?;
        Some(to_napi_node(parent))
    }

    /// Get the next sibling of a node. Returns null if last child.
    #[napi]
    pub fn get_next_sibling(&self, id: u32) -> Option<NapiNode> {
        let sibling = self.arena.next_sibling(id as NodeId)?;
        Some(to_napi_node(sibling))
    }

    /// Get the previous sibling of a node. Returns null if first child.
    #[napi]
    pub fn get_prev_sibling(&self, id: u32) -> Option<NapiNode> {
        let sibling = self.arena.prev_sibling(id as NodeId)?;
        Some(to_napi_node(sibling))
    }

    /// Get all ancestor nodes of a node (bottom-up, excluding the node itself).
    #[napi]
    pub fn get_ancestors(&self, id: u32) -> Vec<NapiNode> {
        self.arena.ancestors(id as NodeId).map(to_napi_node).collect()
    }

    /// Get all descendant nodes of a node in document order.
    #[napi]
    pub fn get_descendants(&self, id: u32) -> Vec<NapiNode> {
        self.arena.descendants(id as NodeId).map(to_napi_node).collect()
    }
}

/// A serializable DOM node returned to JS.
#[napi(object)]
pub struct NapiNode {
    /// Internal node ID.
    pub id: u32,
    /// Node type: "document", "element", "text", "comment", "doctype", "psblock", "invalid".
    pub node_type: String,
    /// UUID of the node (empty for document).
    pub uuid: String,
    /// Raw source text.
    pub raw: String,
    /// Node name (tag name for elements, "#text" for text, etc.).
    pub node_name: String,
    /// Source offset.
    pub offset: u32,
    /// Source line (1-based).
    pub line: u32,
    /// Source column (1-based).
    pub col: u32,
    /// Nesting depth.
    pub depth: u32,
}

/// A serializable element node with additional element-specific properties.
#[napi(object)]
pub struct NapiElement {
    /// Internal node ID.
    pub id: u32,
    /// UUID of the element.
    pub uuid: String,
    /// Raw source text of the opening tag.
    pub raw: String,
    /// Tag name.
    pub node_name: String,
    /// Namespace URI.
    pub namespace: String,
    /// Whether this is a ghost (omitted) element.
    pub is_ghost: bool,
    /// Number of attributes.
    pub attribute_count: u32,
    /// Source offset.
    pub offset: u32,
    /// Source line.
    pub line: u32,
    /// Source column.
    pub col: u32,
    /// Nesting depth.
    pub depth: u32,
}

fn to_napi_node(node: &DomNode) -> NapiNode {
    if let DomNode::Document(d) = node {
        return NapiNode {
            id: d.id as u32,
            node_type: "document".to_owned(),
            uuid: String::new(),
            raw: d.raw.clone(),
            node_name: "#document".to_owned(),
            offset: 0,
            line: 0,
            col: 0,
            depth: 0,
        };
    }

    let base = node.base().expect("non-document node must have base");
    NapiNode {
        id: base.id as u32,
        node_type: node_type_str(node).to_owned(),
        uuid: base.uuid.clone(),
        raw: base.raw.clone(),
        node_name: base.node_name.clone(),
        offset: base.offset as u32,
        line: base.line,
        col: base.col,
        depth: base.depth,
    }
}

fn to_napi_element(el: &ElementData) -> NapiElement {
    let namespace = match el.namespace {
        NamespaceURI::XHTML => "http://www.w3.org/1999/xhtml",
        NamespaceURI::SVG => "http://www.w3.org/2000/svg",
        NamespaceURI::MathML => "http://www.w3.org/1998/Math/MathML",
        NamespaceURI::XLink => "http://www.w3.org/1999/xlink",
    }
    .to_owned();
    NapiElement {
        id: el.base.id as u32,
        uuid: el.base.uuid.clone(),
        raw: el.base.raw.clone(),
        node_name: el.base.node_name.clone(),
        namespace,
        is_ghost: el.is_ghost,
        attribute_count: el.attributes.len() as u32,
        offset: el.base.offset as u32,
        line: el.base.line,
        col: el.base.col,
        depth: el.base.depth,
    }
}

fn node_type_str(node: &DomNode) -> &'static str {
    match node {
        DomNode::Document(_) => "document",
        DomNode::Element(_) => "element",
        DomNode::Text(_) => "text",
        DomNode::Comment(_) => "comment",
        DomNode::Doctype(_) => "doctype",
        DomNode::PSBlock(_) => "psblock",
        DomNode::Invalid(_) => "invalid",
        DomNode::EndTag(_) => "endtag",
    }
}

// --- Primitive type validators ---

/// Checks whether a string is a valid signed integer.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn is_int(value: String) -> bool {
    primitive::is_int(&value)
}

/// Checks whether a string is a valid non-negative integer.
/// Optionally requires the value to be greater than `gt`.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn is_uint(value: String, gt: Option<i64>) -> bool {
    primitive::is_uint(&value, gt)
}

/// Checks whether a string is a valid floating-point number.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn is_float(value: String) -> bool {
    primitive::is_float(&value)
}

/// Checks whether a string is a valid non-zero unsigned integer.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn is_non_zero_uint(value: String) -> bool {
    primitive::is_non_zero_uint(&value)
}

/// Splits a value string into its numeric and unit parts.
#[napi(object)]
pub struct SplitUnitResult {
    pub num: String,
    pub unit: String,
}

/// Splits a value string into its numeric and unit parts.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn split_unit(value: String) -> SplitUnitResult {
    let result = primitive::split_unit(&value);
    SplitUnitResult {
        num: result.num,
        unit: result.unit,
    }
}

/// Checks whether a string is a valid number with one of the allowed unit suffixes.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn is_quantity(value: String, units: Vec<String>, number_type: Option<String>) -> bool {
    let nt = match number_type.as_deref() {
        Some("int") => primitive::NumberType::Int,
        Some("uint") => primitive::NumberType::Uint,
        _ => primitive::NumberType::Float,
    };
    let unit_refs: Vec<&str> = units.iter().map(String::as_str).collect();
    primitive::is_quantity(&value, &unit_refs, nt)
}

/// Checks whether a numeric string value falls within an inclusive range.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn range(value: String, from: f64, to: f64) -> bool {
    primitive::range(&value, from, to)
}

// --- CSS value matching ---

/// Result of a CSS value match attempt.
#[napi(object)]
pub struct CssMatchResult {
    /// Whether the value matched the syntax.
    pub matched: bool,
    /// Byte offset of the mismatch (only present when matched is false).
    pub offset: Option<u32>,
    /// Length of the mismatched segment (only present when matched is false).
    pub length: Option<u32>,
    /// Expected values at the mismatch point.
    pub expected: Option<Vec<String>>,
}

/// Match a CSS value against a CSS Value Definition Syntax string.
///
/// This is the Rust replacement for css-tree's `lexer.match()`.
///
/// # Errors
///
/// Returns a napi error if the syntax string is invalid.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn match_css_syntax(syntax: String, value: String) -> CssMatchResult {
    match value_match::match_syntax(&syntax, &value) {
        Ok(()) => CssMatchResult {
            matched: true,
            offset: None,
            length: None,
            expected: None,
        },
        Err(info) => CssMatchResult {
            matched: false,
            offset: Some(info.offset as u32),
            length: Some(info.length as u32),
            expected: Some(info.expected),
        },
    }
}

/// Match a CSS property value, including CSS-wide keywords.
///
/// Checks CSS-wide keywords (inherit, initial, unset, revert, revert-layer)
/// before matching against the syntax definition.
///
/// # Errors
///
/// Returns a napi error if the syntax string is invalid.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn match_css_property(syntax: String, value: String) -> CssMatchResult {
    match value_match::match_property(&syntax, &value) {
        Ok(()) => CssMatchResult {
            matched: true,
            offset: None,
            length: None,
            expected: None,
        },
        Err(info) => CssMatchResult {
            matched: false,
            offset: Some(info.offset as u32),
            length: Some(info.length as u32),
            expected: Some(info.expected),
        },
    }
}

// ============================================================
// Lint pipeline
// ============================================================

/// A lint violation reported by a Rust rule.
#[napi(object)]
pub struct NapiViolation {
    /// Rule identifier (e.g., `"attr-duplication"`).
    pub rule_id: String,
    /// Alias name for virtual rules (e.g., `"a11y/html-lang"`).
    /// Used by TS to display the `NamedRuleGroup` name instead of the base rule ID.
    pub name: Option<String>,
    /// Severity: `"error"`, `"warning"`, or `"info"`.
    pub severity: String,
    /// Human-readable message.
    pub message: String,
    /// 1-based line number.
    pub line: u32,
    /// 1-based column number.
    pub col: u32,
    /// Raw source text at the violation location.
    pub raw: String,
}

fn to_napi_violations(result: markuplint_rules::lint::LintResult) -> Vec<NapiViolation> {
    result
        .violations
        .into_iter()
        .map(|v| NapiViolation {
            rule_id: v.rule_id,
            name: v.name,
            severity: match v.severity {
                markuplint_rules::violation::Severity::Error => "error".to_string(),
                markuplint_rules::violation::Severity::Warning => "warning".to_string(),
                markuplint_rules::violation::Severity::Info => "info".to_string(),
            },
            message: v.message,
            line: v.line,
            col: v.col,
            raw: v.raw,
        })
        .collect()
}

fn parse_config(
    config_json: &str,
    spec_json: &str,
) -> napi::Result<(
    markuplint_types::spec::types::MLMLSpec,
    markuplint_rules::lint::LintConfig,
)> {
    let spec = markuplint_types::spec::load_spec(spec_json)
        .map_err(|e| napi::Error::from_reason(format!("Spec parse error: {e}")))?;
    let config = serde_json::from_str::<markuplint_rules::lint::LintConfig>(config_json)
        .map_err(|e| napi::Error::from_reason(format!("Config parse error: {e}")))?;
    Ok((spec, config))
}

/// Run Rust-native lint rules on an MLAST document.
///
/// Takes MLAST JSON (from any markuplint parser), a rule config JSON, and
/// spec JSON (html-spec). Returns an array of violations.
///
/// Config format: `{ "rules": { "attr-duplication": true, ... } }`
///
/// # Errors
///
/// Throws a napi error if MLAST, spec, or config JSON fails to parse.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn lint(mlast_json: String, config_json: String, spec_json: String) -> napi::Result<Vec<NapiViolation>> {
    let arena = builder::build_from_json(&mlast_json)
        .map_err(|e| napi::Error::from_reason(format!("MLAST parse error: {e}")))?;
    let (spec, config) = parse_config(&config_json, &spec_json)?;
    let result = markuplint_rules::lint::lint(&arena, &spec, &config);
    Ok(to_napi_violations(result))
}

/// Run Rust-native lint rules on raw HTML (full Rust path).
///
/// Parses HTML via the Rust WHATWG-conformant parser, builds a DOM,
/// then runs all enabled rules. No MLAST JSON intermediate.
///
/// # Errors
///
/// Throws a napi error if spec or config JSON fails to parse.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn lint_html(html: String, config_json: String, spec_json: String) -> napi::Result<Vec<NapiViolation>> {
    // Use the lint-aware heuristic: <body>/<head> are also treated as documents
    // to preserve parent context for rules like permitted-contents.
    let as_document = markuplint_html_parser::should_parse_as_document(&html);
    let is_fragment = !as_document;
    let parser_arena = if is_fragment {
        markuplint_html_parser::parse_fragment(&html)
    } else {
        markuplint_html_parser::parse_document(&html)
    };
    let arena = html_builder::build_from_html_arena(&html, &parser_arena, is_fragment);
    let (spec, config) = parse_config(&config_json, &spec_json)?;
    let result = markuplint_rules::lint::lint(&arena, &spec, &config);
    Ok(to_napi_violations(result))
}
