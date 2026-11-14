//! N-API bridge for markuplint Rust modules (`markuplint-builder`).
//!
//! This crate compiles to the platform-specific `.node` binary loaded by the
//! `@markuplint/core` TS package, which the `markuplint` package depends on. It is
//! the staging ground for replacing the TS MLDOM in `@markuplint/ml-core` and the
//! CSS-validation half of `@markuplint/types` with these Rust implementations. The
//! dual `new`/`from_html` and `lint`/`lint_html` entry points mirror the two
//! DOM-construction paths (MLAST-JSON vs. full-Rust); see the `markuplint-dom`
//! crate docs for why both exist.
//!
//! One behavior differs by design from the TypeScript engine unless the host acts: the value of a
//! `pattern` attribute is validated by a JavaScript function that `set_pattern_validator`
//! registers on the thread of the lint, and by an approximation when there is none.

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
        self.arena.children_of(id as NodeId).map_or_default(|ids| {
            ids.iter()
                .filter_map(|&child_id| self.arena.get(child_id).map(to_napi_node))
                .collect()
        })
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
    /// The `reason` of the rule config, unless `reasonOnly` made it the message.
    pub reason: Option<String>,
    /// TS `Violation#specConformance`: what the named rule the violation came from declares.
    pub spec_conformance: Option<String>,
    /// TS `FixData`; the ranges are UTF-16 code unit offsets.
    pub fix: Option<NapiFixData>,
}

#[napi(object)]
pub struct NapiFixData {
    pub edits: Vec<NapiTextEdit>,
}

#[napi(object)]
pub struct NapiTextEdit {
    /// `[start, end)`; napi objects have no tuple type.
    pub range: Vec<u32>,
    pub text: String,
}

fn to_napi_fix(fix: markuplint_rules::fix::Fix) -> NapiFixData {
    NapiFixData {
        edits: fix
            .edits
            .into_iter()
            .map(|edit| NapiTextEdit {
                range: edit.range.iter().map(|&offset| offset as u32).collect(),
                text: edit.text,
            })
            .collect(),
    }
}

/// The violations of `result`, or an error when a selector of a rule's options could not be read,
/// which fails the whole file as the TS engine does.
fn to_napi_violations(result: markuplint_rules::lint::LintResult) -> napi::Result<Vec<NapiViolation>> {
    if let Some(message) = result.fatal_error() {
        return Err(napi::Error::from_reason(message));
    }
    Ok(result
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
            reason: v.reason,
            spec_conformance: v.spec_conformance,
            fix: v.fix.map(to_napi_fix),
        })
        .collect())
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

/// Registers the function `(value: string) => boolean` that decides whether the value of a
/// `pattern` attribute is a regular expression, or removes it (`undefined`).
///
/// The HTML Standard compiles that value as a JavaScript regular expression with the `v` flag,
/// which only a JavaScript engine reads exactly. A lint asks the function registered on its own
/// thread (each thread registers its own). Without one, or when it throws or answers with
/// anything but a boolean, the lint falls back to an approximation that reads what Rust's
/// `fancy-regex` reads: it disagrees with the `v` flag for some patterns, such as `[(]`, `a{` and
/// `\-`, which the `v` flag rejects. `MLEngine` of `markuplint` registers it when it loads the
/// addon, so a direct user of the addon registers one too to get the answers of the TypeScript
/// engine.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn set_pattern_validator(env: Env, validator: Option<FunctionRef<String, bool>>) {
    let validator = validator.map(|function| {
        // Never released: a release at the exit of the thread would reach a JavaScript
        // environment that is already gone, and the process ends with it.
        let function = std::mem::ManuallyDrop::new(function);
        Box::new(move |value: &str| {
            let callable = function.borrow_back(&env).ok()?;
            callable.call(value.to_owned()).ok()
        }) as Box<dyn Fn(&str) -> Option<bool>>
    });
    markuplint_types::check::pattern_syntax::set_validator(validator);
}

/// Whether a function is registered by `setPatternValidator` on the calling thread: when it is
/// not, a lint of a `pattern` attribute answers with the approximation.
#[napi]
#[must_use]
pub fn pattern_validator_registered() -> bool {
    markuplint_types::check::pattern_syntax::is_registered()
}

/// # Errors
///
/// Throws a napi error if MLAST, spec, or config JSON fails to parse, or a selector of a rule's
/// options cannot be read.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn lint(mlast_json: String, config_json: String, spec_json: String) -> napi::Result<Vec<NapiViolation>> {
    let arena = builder::build_from_json(&mlast_json)
        .map_err(|e| napi::Error::from_reason(format!("MLAST parse error: {e}")))?;
    let (spec, config) = parse_config(&config_json, &spec_json)?;
    let result = markuplint_rules::lint::lint(&arena, &spec, &config);
    to_napi_violations(result)
}

/// # Errors
///
/// Throws a napi error if spec or config JSON fails to parse, or a selector of a rule's options
/// cannot be read.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn lint_html(html: String, config_json: String, spec_json: String) -> napi::Result<Vec<NapiViolation>> {
    let arena = arena_from_html(&html);
    let (spec, config) = parse_config(&config_json, &spec_json)?;
    let result = markuplint_rules::lint::lint(&arena, &spec, &config);
    to_napi_violations(result)
}

/// The arena `lint_html` lints, and the ones below describe.
fn arena_from_html(html: &str) -> DomArena {
    // Use the lint-aware heuristic: <body>/<head> are also treated as documents
    // to preserve parent context for rules like permitted-contents.
    let as_document = markuplint_html_parser::should_parse_as_document(html);
    let is_fragment = !as_document;
    let parser_arena = if is_fragment {
        markuplint_html_parser::parse_fragment(html)
    } else {
        markuplint_html_parser::parse_document(html)
    };
    html_builder::build_from_html_arena(html, &parser_arena, is_fragment)
}

/// The nodes of the document `lint_html` lints, as the scope of a suppression reads them (the TS
/// `nodeList`; see `markuplint_rules::inspect`), as a JSON array. `None` when the document did
/// not parse.
///
/// # Errors
///
/// Throws a napi error if spec or config JSON fails to parse.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn node_list_html(html: String, config_json: String, spec_json: String) -> napi::Result<Option<String>> {
    let arena = arena_from_html(&html);
    let (spec, config) = parse_config(&config_json, &spec_json)?;
    markuplint_rules::inspect::node_list(&arena, &spec, &config)
        .map(|nodes| serde_json::to_string(&nodes).map_err(|e| napi::Error::from_reason(e.to_string())))
        .transpose()
}

/// The TS `debugMap()` of the document `lint_html` lints. `None` when the document did not parse.
///
/// # Errors
///
/// Throws a napi error if spec or config JSON fails to parse.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn debug_map_html(html: String, config_json: String, spec_json: String) -> napi::Result<Option<Vec<String>>> {
    let arena = arena_from_html(&html);
    let (spec, config) = parse_config(&config_json, &spec_json)?;
    Ok(markuplint_rules::inspect::debug_map(&arena, &spec, &config))
}

/// Where an element starts (TS `MLElement#startLine` / `startCol`).
#[napi(object)]
pub struct NapiPosition {
    pub line: u32,
    pub col: u32,
}

/// The elements of the document `lint_html` lints that a selector matches, in every tree of it and
/// in the order of the markup (TS `Document#deepQuerySelectorAll`, which `markuplint --search`
/// reads). None when the document did not parse.
///
/// # Errors
///
/// Throws a napi error if spec or config JSON fails to parse, or the selector cannot be read.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn search_html(
    html: String,
    selector: String,
    config_json: String,
    spec_json: String,
) -> napi::Result<Vec<NapiPosition>> {
    let arena = arena_from_html(&html);
    let (spec, config) = parse_config(&config_json, &spec_json)?;
    markuplint_rules::inspect::search(&arena, &spec, &config, &selector)
        .map(|hits| {
            hits.into_iter()
                .map(|hit| NapiPosition {
                    line: hit.line,
                    col: hit.col,
                })
                .collect()
        })
        .map_err(napi::Error::from_reason)
}

/// The element of the document `lint_html` lints at a position, with the accessibility properties
/// the hover of the language server shows (TS `Document#searchNodeByLocation` and
/// `Document#getAccessibilityProp`), as JSON. None where TS returns `null` (no node there, the node is
/// not an element, or the document did not parse).
///
/// `aria_version` is `"1.1"`, `"1.2"` or `"1.3"`.
///
/// # Errors
///
/// Throws a napi error if spec or config JSON fails to parse, or `aria_version` is not a version.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn accessibility_html(
    html: String,
    line: u32,
    col: u32,
    aria_version: String,
    config_json: String,
    spec_json: String,
) -> napi::Result<Option<String>> {
    let version = markuplint_types::spec::aria::ARIAVersion::parse(&aria_version)
        .ok_or_else(|| napi::Error::from_reason(format!("Unknown ARIA version: {aria_version}")))?;
    let arena = arena_from_html(&html);
    let (spec, config) = parse_config(&config_json, &spec_json)?;
    markuplint_rules::inspect::accessibility_at(&arena, &spec, &config, line, col, version)
        .map(|found| serde_json::to_string(&found).map_err(|e| napi::Error::from_reason(e.to_string())))
        .transpose()
}
