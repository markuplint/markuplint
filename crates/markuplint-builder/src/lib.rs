//! N-API bridge for markuplint Rust modules (`markuplint-builder`).
//!
//! This crate compiles to the platform-specific `.node` binary loaded by the
//! `@markuplint/core` TS package, which the `markuplint` package depends on. It is
//! the staging ground for replacing the TS MLDOM in `@markuplint/ml-core` and the
//! CSS-validation half of `@markuplint/types` with these Rust implementations. The
//! dual `new`/`from_html` and `lint`/`lint_html` entry points mirror the two
//! DOM-construction paths (MLAST-JSON vs. full-Rust); see the `markuplint-dom`
//! crate docs for why both exist.

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

#[napi]
pub struct NapiDom {
    arena: DomArena,
}

#[napi]
impl NapiDom {
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

    #[napi(getter)]
    pub fn node_count(&self) -> u32 {
        self.arena.len() as u32
    }

    #[napi]
    #[allow(clippy::needless_pass_by_value)]
    pub fn get_node_by_uuid(&self, uuid: String) -> Option<NapiNode> {
        let node = self.arena.get_by_uuid(&uuid)?;
        Some(to_napi_node(node))
    }

    #[napi]
    pub fn get_node(&self, id: u32) -> Option<NapiNode> {
        let node = self.arena.get(id as NodeId)?;
        Some(to_napi_node(node))
    }

    #[napi]
    pub fn get_elements(&self) -> Vec<NapiElement> {
        self.arena.elements().map(|(_, el)| to_napi_element(el)).collect()
    }

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

    #[napi]
    pub fn get_parent(&self, id: u32) -> Option<NapiNode> {
        let parent = self.arena.parent(id as NodeId)?;
        Some(to_napi_node(parent))
    }

    #[napi]
    pub fn get_next_sibling(&self, id: u32) -> Option<NapiNode> {
        let sibling = self.arena.next_sibling(id as NodeId)?;
        Some(to_napi_node(sibling))
    }

    #[napi]
    pub fn get_prev_sibling(&self, id: u32) -> Option<NapiNode> {
        let sibling = self.arena.prev_sibling(id as NodeId)?;
        Some(to_napi_node(sibling))
    }

    #[napi]
    pub fn get_ancestors(&self, id: u32) -> Vec<NapiNode> {
        self.arena.ancestors(id as NodeId).map(to_napi_node).collect()
    }

    #[napi]
    pub fn get_descendants(&self, id: u32) -> Vec<NapiNode> {
        self.arena.descendants(id as NodeId).map(to_napi_node).collect()
    }
}

#[napi(object)]
pub struct NapiNode {
    pub id: u32,
    pub node_type: String,
    pub uuid: String,
    pub raw: String,
    pub node_name: String,
    pub offset: u32,
    pub line: u32,
    pub col: u32,
    pub depth: u32,
}

#[napi(object)]
pub struct NapiElement {
    pub id: u32,
    pub uuid: String,
    pub raw: String,
    pub node_name: String,
    pub namespace: String,
    pub is_ghost: bool,
    pub attribute_count: u32,
    pub offset: u32,
    pub line: u32,
    pub col: u32,
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

#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn is_int(value: String) -> bool {
    primitive::is_int(&value)
}

#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn is_uint(value: String, gt: Option<i64>) -> bool {
    primitive::is_uint(&value, gt)
}

#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn is_float(value: String) -> bool {
    primitive::is_float(&value)
}

#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn is_non_zero_uint(value: String) -> bool {
    primitive::is_non_zero_uint(&value)
}

#[napi(object)]
pub struct SplitUnitResult {
    pub num: String,
    pub unit: String,
}

#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn split_unit(value: String) -> SplitUnitResult {
    let result = primitive::split_unit(&value);
    SplitUnitResult {
        num: result.num,
        unit: result.unit,
    }
}

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

#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn range(value: String, from: f64, to: f64) -> bool {
    primitive::range(&value, from, to)
}

// --- CSS value matching ---

#[napi(object)]
pub struct CssMatchResult {
    pub matched: bool,
    pub offset: Option<u32>,
    pub length: Option<u32>,
    pub expected: Option<Vec<String>>,
}

/// The Rust replacement for css-tree's `lexer.match()`.
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

#[napi(object)]
pub struct NapiViolation {
    pub rule_id: String,
    /// Used by TS to display the `NamedRuleGroup` name instead of the base rule ID.
    pub name: Option<String>,
    pub severity: String,
    pub message: String,
    pub line: u32,
    pub col: u32,
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
