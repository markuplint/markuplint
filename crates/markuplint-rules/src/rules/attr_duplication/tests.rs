//! Tests for `attr-duplication` rule.
//!
//! Test ID mapping (TS → Rust):
//!   attr-duplication-invalid-001  → attr_duplication_invalid_001
//!   attr-duplication-invalid-002  → attr_duplication_invalid_002
//!   attr-duplication-invalid-003  — SKIP: i18n (ja locale) not supported in Rust
//!   attr-duplication-invalid-004  → attr_duplication_invalid_004
//!   attr-duplication-parser-*     — SKIP: framework parsers not available in Rust
//!   attr-duplication-fix-*        — SKIP: auto-fix not implemented in Rust
//!   v6_attr_duplication_001       — Rust-only: no duplicate attrs (valid)
//!   v6_attr_duplication_002       — Rust-only: case-insensitive duplicate
//!   v6_attr_duplication_003       — Rust-only: triple duplicate
//!   v6_attr_duplication_004       — Rust-only: no attrs, no violation
//!   v6_attr_duplication_005       — Rust-only: severity from config

use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTHTMLAttr, MLASTToken, NamespaceURI};
use markuplint_dom::arena::{DomArena, DomArenaBuilder};
use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};

use crate::lint::{LintConfig, lint};
use crate::violation::Severity;
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

fn html_arena(html: &str) -> DomArena {
    let as_doc = markuplint_html_parser::should_parse_as_document(html);
    let is_fragment = !as_doc;
    let parser_arena = if is_fragment {
        markuplint_html_parser::parse_fragment(html)
    } else {
        markuplint_html_parser::parse_document(html)
    };
    html_builder::build_from_html_arena(html, &parser_arena, is_fragment)
}

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

/// TS: `[attr-duplication-invalid-001]`
/// Same HTML as TS template literal (with leading newline + tab indentation)
#[test]
fn attr_duplication_invalid_001() {
    const _ID: &str = "attr-duplication-invalid-001";
    // Exact TS template literal bytes: \n\t\t<div ...>\n\t\t\tlorem\n\t\t\t<p>ipsam</p>\n\t\t</div>\n\t\t
    let arena = html_arena(
        "\n\t\t<div data-attr=\"value\" data-Attr='db' data-attR=tr>\n\t\t\tlorem\n\t\t\t<p>ipsam</p>\n\t\t</div>\n\t\t",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "attr-duplication": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 2);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].message, "The attribute name is duplicated");
    assert_eq!(result.violations[0].line, 2);
    assert_eq!(result.violations[0].col, 26);
    assert_eq!(result.violations[0].raw, "data-Attr");
    assert_eq!(result.violations[1].severity, Severity::Error);
    assert_eq!(result.violations[1].message, "The attribute name is duplicated");
    assert_eq!(result.violations[1].line, 2);
    assert_eq!(result.violations[1].col, 41);
    assert_eq!(result.violations[1].raw, "data-attR");
}

/// TS: `[attr-duplication-invalid-002]`
/// Same HTML as TS template literal (multi-line with tab indentation)
#[test]
fn attr_duplication_invalid_002() {
    const _ID: &str = "attr-duplication-invalid-002";
    // Exact TS template literal bytes: \n\t\t<div\n\t\t\tdata-attr="value"\n\t\t\tdata-Attr='db'\n\t\t\tdata-attR=tr>\n\t\t\tlorem\n\t\t\t<p>ipsam</p>\n\t\t</div>\n\t\t
    let arena = html_arena(
        "\n\t\t<div\n\t\t\tdata-attr=\"value\"\n\t\t\tdata-Attr='db'\n\t\t\tdata-attR=tr>\n\t\t\tlorem\n\t\t\t<p>ipsam</p>\n\t\t</div>\n\t\t",
    );
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "attr-duplication": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 2);
    assert_eq!(result.violations[0].severity, Severity::Error);
    assert_eq!(result.violations[0].message, "The attribute name is duplicated");
    assert_eq!(result.violations[0].line, 4);
    assert_eq!(result.violations[0].col, 4);
    assert_eq!(result.violations[0].raw, "data-Attr");
    assert_eq!(result.violations[1].severity, Severity::Error);
    assert_eq!(result.violations[1].message, "The attribute name is duplicated");
    assert_eq!(result.violations[1].line, 5);
    assert_eq!(result.violations[1].col, 4);
    assert_eq!(result.violations[1].raw, "data-attR");
}

/// TS: `[attr-duplication-invalid-004]` — nodeRules disable
/// Input: `<div><span attr attr></span></div>` with nodeRule disabling span
/// Expect: 0 violations
#[test]
fn attr_duplication_invalid_004() {
    const _ID: &str = "attr-duplication-invalid-004";
    let arena = html_arena("<div><span attr attr></span></div>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "attr-duplication": true },
        "nodeRules": [
            {
                "selector": "span",
                "rules": { "attr-duplication": false }
            }
        ]
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

// --- Rust-only tests (v6_) ---

// Legacy test helper used by lint.rs tests — kept for backward compatibility
pub(crate) fn make_element_with_attrs(tag: &str, attrs: &[(&str, &str)]) -> DomArena {
    let empty_token = || MLASTToken {
        uuid: String::new(),
        raw: String::new(),
        offset: 0,
        line: 1,
        col: 1,
    };

    let mut col = 1u32 + tag.len() as u32 + 1; // after "<tag "
    let attributes: Vec<MLASTAttr> = attrs
        .iter()
        .map(|(name, value)| {
            let attr_col = col;
            col += name.len() as u32 + 2 + value.len() as u32 + 1; // name="value" + space
            MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
                uuid: String::new(),
                raw: format!("{name}=\"{value}\""),
                offset: 0,
                line: 1,
                col: attr_col,
                node_name: name.to_string(),
                spaces_before_name: empty_token(),
                name: MLASTToken {
                    raw: name.to_string(),
                    line: 1,
                    col: attr_col,
                    ..empty_token()
                },
                spaces_before_equal: empty_token(),
                equal: MLASTToken {
                    raw: "=".to_string(),
                    ..empty_token()
                },
                spaces_after_equal: empty_token(),
                start_quote: MLASTToken {
                    raw: "\"".to_string(),
                    ..empty_token()
                },
                value: MLASTToken {
                    raw: value.to_string(),
                    ..empty_token()
                },
                end_quote: MLASTToken {
                    raw: "\"".to_string(),
                    ..empty_token()
                },
                is_dynamic_value: None,
                is_directive: None,
                potential_name: None,
                potential_value: None,
                value_type: None,
                candidate: None,
                is_duplicatable: false,
            }))
        })
        .collect();

    let mut builder = DomArenaBuilder::new();
    let doc_id = builder.push(DomNode::Document(DocumentData {
        id: 0,
        raw: String::new(),
        is_fragment: true,
        unknown_parse_error: None,
        children: vec![],
    }));
    let el_id = builder.push(DomNode::Element(ElementData {
        base: NodeBase {
            id: 0,
            uuid: "el".to_string(),
            raw: format!("<{tag}>"),
            offset: 0,
            line: 1,
            col: 1,
            node_name: tag.to_string(),
            parent: Some(doc_id),
            children: vec![],
            next_sibling: None,
            prev_sibling: None,
            depth: 1,
        },
        namespace: NamespaceURI::XHTML,
        element_type: ElementType::Html,
        is_fragment: false,
        attributes,
        has_spread_attr: false,
        block_behavior: None,
        pair_node_id: None,
        tag_open_char: "<".to_string(),
        tag_close_char: ">".to_string(),
        is_ghost: false,
        close_tag: None,
    }));
    if let Some(DomNode::Element(e)) = builder.get_mut(el_id) {
        e.base.id = el_id;
    }
    if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
        d.children = vec![el_id];
    }
    builder.finish()
}

/// Rust-only: no duplicate attrs
#[test]
fn v6_attr_duplication_001() {
    let arena = html_arena(r#"<div class="a" id="b"></div>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "attr-duplication": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// Rust-only: case-insensitive duplicate
#[test]
fn v6_attr_duplication_002() {
    let arena = html_arena(r#"<div Class="a" class="b"></div>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "attr-duplication": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
}

/// Rust-only: triple duplicate reports 2 violations
#[test]
fn v6_attr_duplication_003() {
    let arena = html_arena(r#"<div id="a" id="b" id="c"></div>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "attr-duplication": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 2);
}

/// Rust-only: no attrs, no violation
#[test]
fn v6_attr_duplication_004() {
    let arena = html_arena("<div></div>");
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "attr-duplication": true }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 0);
}

/// Rust-only: severity from config
#[test]
fn v6_attr_duplication_005() {
    let arena = html_arena(r#"<div id="a" id="b"></div>"#);
    let spec = spec();
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": {
            "attr-duplication": { "severity": "warning" }
        }
    }))
    .unwrap();
    let result = lint(&arena, &spec, &config);
    assert_eq!(result.violations.len(), 1);
    assert_eq!(result.violations[0].severity, Severity::Warning);
}
