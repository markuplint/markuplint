//! Tests for `no-empty-palpable-content` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-empty-palpable-content-valid-001    → no_empty_palpable_content_valid_001
//!   no-empty-palpable-content-invalid-001  → no_empty_palpable_content_invalid_001
//!   no-empty-palpable-content-valid-002    → no_empty_palpable_content_valid_002
//!   no-empty-palpable-content-valid-003    → no_empty_palpable_content_valid_003
//!   no-empty-palpable-content-valid-004    → no_empty_palpable_content_valid_004
//!   no-empty-palpable-content-valid-005    → no_empty_palpable_content_valid_005
//!   no-empty-palpable-content-issue-593    → no_empty_palpable_content_issue_593
//!   no-empty-palpable-content-issue-775    → no_empty_palpable_content_issue_775
//!   no-empty-palpable-content-issue-1948   → no_empty_palpable_content_issue_1948
//!   v6_no_empty_palpable_content_001       — Rust-only: `img` and the other self-palpable elements are exempt
//!   v6_no_empty_palpable_content_002       — Rust-only: elements of the "nothing" content model are exempt
//!   v6_no_empty_palpable_content_003       — Rust-only: a comment is content; only direct children decide
//!   v6_no_empty_palpable_content_004       — Rust-only: the exemptions ignore the case of the tag name
//!   v6_no_empty_palpable_content_005       — Rust-only: whitespace is what a JS `\s` matches
//!   v6_no_empty_palpable_content_006       — Rust-only: `sup ` (trailing space) in `#palpable` still matches
//!   v6_no_empty_palpable_content_007       — Rust-only: the exposable elements TS has and Rust lacked
//!   v6_no_empty_palpable_content_008       — Rust-only: `caption` is not exposable
//!   v6_no_empty_palpable_content_009       — Rust-only: `ul:has(>li)` and the like need their condition
//!   v6_no_empty_palpable_content_010       — Rust-only: `extendsExposableElements: false` drops the whole list
//!   v6_no_empty_palpable_content_011       — Rust-only: namespaced and conditional entries are evaluated
//!   v6_no_empty_palpable_content_012       — Rust-only: the implicit `body` is exposable
//!   v6_no_empty_palpable_content_013       — Rust-only: the exposable list has the same members as the TS one
//!   v6_no_empty_palpable_content_014       — Rust-only: every `#palpable` entry of the spec parses as a selector
//!   v6_no_empty_palpable_content_015       — Rust-only: a fragment block is transparent, so its `li` is empty
//!   v6_no_empty_palpable_content_016       — Rust-only: a non-fragment block without `each`/`end` is content
//!   v6_no_empty_palpable_content_017       — Rust-only: an `each` block is replaced by its children

use super::*;
use crate::rule::{RuleConfig, RuleConfigSet};
use crate::rules::no_duplicate_attr::tests::make_element_with_attrs;
use crate::test_util::{Brief, brief, lint_brief};
use crate::violation::Severity;
use markuplint_core::mlast::{ElementType, MLASTBlockBehavior, MLASTBlockBehaviorType, NamespaceURI};
use markuplint_dom::arena::DomArenaBuilder;
use markuplint_dom::node::{DocumentData, ElementData, NodeBase, TextData};
use markuplint_types::spec::load_spec;

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

#[test]
fn empty_palpable_element_reported() {
    let arena = make_element_with_attrs("div", &[]);
    let s = spec();
    let rule = NoEmptyPalpableContent;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].message, "The element should not empty");
}

#[test]
fn non_palpable_element_no_violation() {
    let arena = make_element_with_attrs("br", &[]);
    let s = spec();
    let rule = NoEmptyPalpableContent;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty());
}

#[test]
fn palpable_element_with_text_no_violation() {
    let mut builder = DomArenaBuilder::new();
    let doc_id = builder.push(DomNode::Document(DocumentData {
        id: 0,
        raw: String::new(),
        is_fragment: true,
        unknown_parse_error: None,
        children: vec![],
    }));
    let el_id = builder.push(DomNode::Element(ElementData {
        pretender_context: None,
        base: NodeBase {
            id: 0,
            uuid: "el".to_string(),
            raw: "<p>".to_string(),
            offset: 0,
            line: 1,
            col: 1,
            node_name: "p".to_string(),
            parent: Some(doc_id),
            children: vec![],
            next_sibling: None,
            prev_sibling: None,
            depth: 1,
        },
        namespace: NamespaceURI::XHTML,
        element_type: ElementType::Html,
        is_fragment: false,
        attributes: vec![],
        has_spread_attr: false,
        block_behavior: None,
        pair_node_id: None,
        tag_open_char: "<".to_string(),
        tag_close_char: ">".to_string(),
        is_ghost: false,
        close_tag: None,
    }));
    let text_id = builder.push(DomNode::Text(TextData {
        base: NodeBase {
            id: 0,
            uuid: "t".to_string(),
            raw: "Hello".to_string(),
            offset: 0,
            line: 1,
            col: 4,
            node_name: "#text".to_string(),
            parent: Some(el_id),
            children: vec![],
            next_sibling: None,
            prev_sibling: None,
            depth: 2,
        },
        is_bogus: false,
    }));
    if let Some(DomNode::Element(e)) = builder.get_mut(el_id) {
        e.base.id = el_id;
        e.base.children = vec![text_id];
    }
    if let Some(DomNode::Text(t)) = builder.get_mut(text_id) {
        t.base.id = text_id;
    }
    if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
        d.children = vec![el_id];
    }

    let arena = builder.finish();
    let s = spec();
    let rule = NoEmptyPalpableContent;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(violations.is_empty());
}

#[test]
fn whitespace_only_text_reported() {
    let mut builder = DomArenaBuilder::new();
    let doc_id = builder.push(DomNode::Document(DocumentData {
        id: 0,
        raw: String::new(),
        is_fragment: true,
        unknown_parse_error: None,
        children: vec![],
    }));
    let el_id = builder.push(DomNode::Element(ElementData {
        pretender_context: None,
        base: NodeBase {
            id: 0,
            uuid: "el".to_string(),
            raw: "<p>".to_string(),
            offset: 0,
            line: 1,
            col: 1,
            node_name: "p".to_string(),
            parent: Some(doc_id),
            children: vec![],
            next_sibling: None,
            prev_sibling: None,
            depth: 1,
        },
        namespace: NamespaceURI::XHTML,
        element_type: ElementType::Html,
        is_fragment: false,
        attributes: vec![],
        has_spread_attr: false,
        block_behavior: None,
        pair_node_id: None,
        tag_open_char: "<".to_string(),
        tag_close_char: ">".to_string(),
        is_ghost: false,
        close_tag: None,
    }));
    let text_id = builder.push(DomNode::Text(TextData {
        base: NodeBase {
            id: 0,
            uuid: "t".to_string(),
            raw: "   ".to_string(),
            offset: 0,
            line: 1,
            col: 4,
            node_name: "#text".to_string(),
            parent: Some(el_id),
            children: vec![],
            next_sibling: None,
            prev_sibling: None,
            depth: 2,
        },
        is_bogus: false,
    }));
    if let Some(DomNode::Element(e)) = builder.get_mut(el_id) {
        e.base.id = el_id;
        e.base.children = vec![text_id];
    }
    if let Some(DomNode::Text(t)) = builder.get_mut(text_id) {
        t.base.id = text_id;
    }
    if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
        d.children = vec![el_id];
    }

    let arena = builder.finish();
    let s = spec();
    let rule = NoEmptyPalpableContent;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].message, "The element should not empty");
}

#[test]
fn element_with_child_element_no_violation() {
    let mut builder = DomArenaBuilder::new();
    let doc_id = builder.push(DomNode::Document(DocumentData {
        id: 0,
        raw: String::new(),
        is_fragment: true,
        unknown_parse_error: None,
        children: vec![],
    }));
    let div_id = builder.push(DomNode::Element(ElementData {
        pretender_context: None,
        base: NodeBase {
            id: 0,
            uuid: "div".to_string(),
            raw: "<div>".to_string(),
            offset: 0,
            line: 1,
            col: 1,
            node_name: "div".to_string(),
            parent: Some(doc_id),
            children: vec![],
            next_sibling: None,
            prev_sibling: None,
            depth: 1,
        },
        namespace: NamespaceURI::XHTML,
        element_type: ElementType::Html,
        is_fragment: false,
        attributes: vec![],
        has_spread_attr: false,
        block_behavior: None,
        pair_node_id: None,
        tag_open_char: "<".to_string(),
        tag_close_char: ">".to_string(),
        is_ghost: false,
        close_tag: None,
    }));
    let span_id = builder.push(DomNode::Element(ElementData {
        pretender_context: None,
        base: NodeBase {
            id: 0,
            uuid: "span".to_string(),
            raw: "<span>".to_string(),
            offset: 0,
            line: 1,
            col: 6,
            node_name: "span".to_string(),
            parent: Some(div_id),
            children: vec![],
            next_sibling: None,
            prev_sibling: None,
            depth: 2,
        },
        namespace: NamespaceURI::XHTML,
        element_type: ElementType::Html,
        is_fragment: false,
        attributes: vec![],
        has_spread_attr: false,
        block_behavior: None,
        pair_node_id: None,
        tag_open_char: "<".to_string(),
        tag_close_char: ">".to_string(),
        is_ghost: false,
        close_tag: None,
    }));
    if let Some(DomNode::Element(e)) = builder.get_mut(div_id) {
        e.base.id = div_id;
        e.base.children = vec![span_id];
    }
    if let Some(DomNode::Element(e)) = builder.get_mut(span_id) {
        e.base.id = span_id;
    }
    if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
        d.children = vec![div_id];
    }

    let arena = builder.finish();
    let s = spec();
    let rule = NoEmptyPalpableContent;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    // div contains a child element (span), so div is NOT empty.
    // span is empty and palpable → 1 violation for span only.
    assert_eq!(violations.len(), 1);
    assert_eq!(violations[0].raw, "<span>");
}

#[test]
fn ignore_if_aria_busy_default_true() {
    // Default: ignoreIfAriaBusy=true, so aria-busy="true" element is skipped
    let arena = make_element_with_attrs("div", &[("aria-busy", "true")]);
    let s = spec();
    let rule = NoEmptyPalpableContent;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert!(
        violations.is_empty(),
        "Default ignoreIfAriaBusy=true should skip aria-busy elements"
    );
}

#[test]
fn ignore_if_aria_busy_false_reports() {
    // ignoreIfAriaBusy=false → empty div with aria-busy="true" IS reported
    let arena = make_element_with_attrs("div", &[("aria-busy", "true")]);
    let s = spec();
    let rule = NoEmptyPalpableContent;
    let config = RuleConfig {
        options: serde_json::json!({ "ignoreIfAriaBusy": false }),
        ..Default::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert_eq!(violations.len(), 1, "ignoreIfAriaBusy=false should report");
}

#[test]
fn extends_exposable_elements_default_true() {
    // Default: extendsExposableElements=true → empty <li> is reported
    let arena = make_element_with_attrs("li", &[]);
    let s = spec();
    let rule = NoEmptyPalpableContent;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert_eq!(
        violations.len(),
        1,
        "extendsExposableElements=true should detect empty <li>"
    );
}

#[test]
fn extends_exposable_elements_false_skips() {
    // extendsExposableElements=false → empty <li> is NOT reported (not palpable)
    let arena = make_element_with_attrs("li", &[]);
    let s = spec();
    let rule = NoEmptyPalpableContent;
    let config = RuleConfig {
        options: serde_json::json!({ "extendsExposableElements": false }),
        ..Default::default()
    };
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
    assert!(violations.is_empty(), "extendsExposableElements=false should skip <li>");
}

#[test]
fn empty_td_reported_with_extends() {
    // Empty <td> should be reported when extendsExposableElements=true (default)
    let arena = make_element_with_attrs("td", &[]);
    let s = spec();
    let rule = NoEmptyPalpableContent;
    let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
    assert_eq!(
        violations.len(),
        1,
        "Empty <td> should be reported with default options"
    );
}

const RULE: &str = "no-empty-palpable-content";
const MESSAGE: &str = "The element should not empty";

fn run(html: &str) -> Vec<Brief> {
    lint_brief(RULE, html, serde_json::json!({ "rules": { RULE: true } }))
}

fn run_with_options(html: &str, options: serde_json::Value) -> Vec<Brief> {
    lint_brief(
        RULE,
        html,
        serde_json::json!({ "rules": { RULE: { "value": true, "options": options } } }),
    )
}

fn warning(raw: &str) -> Brief {
    brief(Severity::Warning, 1, 1, MESSAGE, raw)
}

/// TS: `[no-empty-palpable-content-valid-001]` no space
#[test]
fn no_empty_palpable_content_valid_001() {
    const _ID: &str = "no-empty-palpable-content-valid-001";
    assert_eq!(run("<div></div>"), [warning("<div>")]);
    assert_eq!(run("<p></p>"), [warning("<p>")]);
    assert_eq!(run("<span></span>"), [warning("<span>")]);
    assert_eq!(run("<li></li>"), [warning("<li>")]);
    assert_eq!(run("<svg><rect /></svg>"), []);
}

/// TS: `[no-empty-palpable-content-invalid-001]` white space
#[test]
fn no_empty_palpable_content_invalid_001() {
    const _ID: &str = "no-empty-palpable-content-invalid-001";
    assert_eq!(run("<div> </div>"), [warning("<div>")]);
    assert_eq!(run("<div>\n\t   \n\n</div>"), [warning("<div>")]);
}

/// TS: `[no-empty-palpable-content-valid-002]` has content
#[test]
fn no_empty_palpable_content_valid_002() {
    const _ID: &str = "no-empty-palpable-content-valid-002";
    assert_eq!(run("<div>\n\ttext\n\n</div>"), []);
    assert_eq!(run("<div><img /></div>"), []);
}

/// TS: `[no-empty-palpable-content-valid-003]` has content
#[test]
fn no_empty_palpable_content_valid_003() {
    const _ID: &str = "no-empty-palpable-content-valid-003";
    assert_eq!(run("<div>\n\ttext\n\n</div>"), []);
    assert_eq!(run("<div><img /></div>"), []);
}

/// TS: `[no-empty-palpable-content-valid-004]` element exception
#[test]
fn no_empty_palpable_content_valid_004() {
    const _ID: &str = "no-empty-palpable-content-valid-004";
    assert_eq!(run("<textarea></textarea>"), []);
}

/// TS: `[no-empty-palpable-content-valid-005]` ignore aria-busy
#[test]
fn no_empty_palpable_content_valid_005() {
    const _ID: &str = "no-empty-palpable-content-valid-005";
    assert_eq!(run(r#"<div aria-busy="true"></div>"#), []);
    assert_eq!(run("<div aria-busy=\"true\">\n\t\n\n</div>"), []);
    assert_eq!(
        run_with_options(
            "<div aria-busy=\"true\">\n\t\n\n</div>",
            serde_json::json!({ "ignoreIfAriaBusy": false })
        ),
        [warning(r#"<div aria-busy="true">"#)]
    );
}

/// TS: `[no-empty-palpable-content-issue-593]` `iframe` is of the "nothing" content model
#[test]
fn no_empty_palpable_content_issue_593() {
    const _ID: &str = "no-empty-palpable-content-issue-593";
    assert_eq!(run("<iframe></iframe>"), []);
}

/// TS: `[no-empty-palpable-content-issue-775]` text in `pre`
#[test]
fn no_empty_palpable_content_issue_775() {
    const _ID: &str = "no-empty-palpable-content-issue-775";
    assert_eq!(run("<pre>text</pre>"), []);
    assert_eq!(run("<pre>\n\ttext</pre>"), []);
    assert_eq!(run("<pre>text\ntext</pre>"), []);
    assert_eq!(run("<pre>\ntext</pre>"), []);
}

/// TS: `[no-empty-palpable-content-issue-1948]` elements filled by interaction or palpable by themselves
#[test]
fn no_empty_palpable_content_issue_1948() {
    const _ID: &str = "no-empty-palpable-content-issue-1948";
    assert_eq!(run("<audio></audio>"), []);
    assert_eq!(run("<canvas></canvas>"), []);
    assert_eq!(run("<video></video>"), []);
    assert_eq!(run("<textarea></textarea>"), []);
    assert_eq!(run("<output></output>"), []);
}

/// `<img src alt>` is the reproduction of the Rust engine reporting what the TS rule exempts.
/// Expected values (`[]`) are the TS output on the same input.
#[test]
fn v6_no_empty_palpable_content_001() {
    assert_eq!(run(r#"<img src="a.png" alt="x">"#), []);
    assert_eq!(run("<audio controls></audio>"), []);
    assert_eq!(run("<video controls></video>"), []);
}

/// Void elements, `iframe` and `template` use the "nothing" content model, so they are never
/// empty. Expected values (`[]`) are the TS output on the same input.
#[test]
fn v6_no_empty_palpable_content_002() {
    assert_eq!(run("<template></template>"), []);
    assert_eq!(run(r#"<input type="text">"#), []);
    assert_eq!(run(r#"<embed src="a.swf">"#), []);
}

/// A comment is a child node that is not whitespace text, so it is content; only direct children
/// decide, so a wrapper holding an empty element is not empty. Expected values are the TS output
/// on the same input.
#[test]
fn v6_no_empty_palpable_content_003() {
    assert_eq!(run("<div><!-- c --></div>"), []);
    assert_eq!(run("<div> <!-- c --> </div>"), []);
    assert_eq!(
        run("<div><span></span></div>"),
        [brief(Severity::Warning, 1, 6, MESSAGE, "<span>")]
    );
}

/// The exemptions do not depend on the case of the tag name.
#[test]
fn v6_no_empty_palpable_content_004() {
    assert_eq!(run("<TEXTAREA></TEXTAREA>"), []);
    assert_eq!(run("<IMG>"), []);
}

/// Whitespace is what a JS `\s` matches: U+FEFF counts, U+0085 does not. Expected values are the
/// TS output on the same input.
#[test]
fn v6_no_empty_palpable_content_005() {
    assert_eq!(run("<div>\u{feff}</div>"), [warning("<div>")]);
    assert_eq!(run("<div>\u{85}</div>"), []);
}

/// The spec writes `sup ` (trailing space) in `#palpable`; evaluated as a selector it still matches.
/// Expected values are the TS output on the same input.
#[test]
fn v6_no_empty_palpable_content_006() {
    assert_eq!(run("<sup></sup>"), [warning("<sup>")]);
}

/// Exposable elements that belong to no content model: the TS list, not a hand-picked subset.
/// Expected values are the TS output on the same input.
#[test]
fn v6_no_empty_palpable_content_007() {
    assert_eq!(run("<legend></legend>"), [warning("<legend>")]);
    assert_eq!(run("<figcaption></figcaption>"), [warning("<figcaption>")]);
    assert_eq!(run("<summary></summary>"), [warning("<summary>")]);
    assert_eq!(run("<option></option>"), [warning("<option>")]);
    assert_eq!(run("<optgroup></optgroup>"), [warning("<optgroup>")]);
    assert_eq!(run("<body></body>"), [warning("<body>")]);
    assert_eq!(
        run("<ruby>a<rp></rp><rt></rt></ruby>"),
        [
            brief(Severity::Warning, 1, 8, MESSAGE, "<rp>"),
            brief(Severity::Warning, 1, 17, MESSAGE, "<rt>"),
        ]
    );
}

/// `caption` is in neither the `#palpable` selectors nor the TS exposable list. Expected values
/// are the TS output on the same input.
#[test]
fn v6_no_empty_palpable_content_008() {
    assert_eq!(run("<table><caption></caption><tr><td>a</td></tr></table>"), []);
}

/// A `#palpable` entry may carry a condition (`ul:has(>li)`); an empty list does not satisfy it,
/// and these elements are not in the exposable list. Expected values are the TS output on the same input.
#[test]
fn v6_no_empty_palpable_content_009() {
    assert_eq!(run("<ul></ul>"), []);
    assert_eq!(run("<dl></dl>"), []);
    assert_eq!(run("<menu></menu>"), []);
}

/// `extendsExposableElements: false` drops the whole TS exposable list, not only `li` and `td`.
#[test]
fn v6_no_empty_palpable_content_010() {
    let off = serde_json::json!({ "extendsExposableElements": false });
    assert_eq!(run_with_options("<legend></legend>", off.clone()), []);
    assert_eq!(run_with_options("<body></body>", off), []);
}

/// The `#palpable` entries with a namespace (`mml|math`) or a condition (`ul:has(>li)`,
/// `input:not([type='hidden' i])`) are evaluated, not reduced to a tag name. Expected values are
/// the TS output on the same input.
#[test]
fn v6_no_empty_palpable_content_011() {
    assert_eq!(run("<math></math>"), [warning("<math>")]);
    assert_eq!(run("<ul><li>a</li></ul>"), []);
    assert_eq!(
        run("<ul><li></li></ul>"),
        [brief(Severity::Warning, 1, 5, MESSAGE, "<li>")]
    );
}

/// The implicit `body` of `<html></html>` is exposable and empty. Expected values are the TS
/// output on the same input.
#[test]
fn v6_no_empty_palpable_content_012() {
    assert_eq!(run("<html></html>"), [brief(Severity::Warning, 1, 7, MESSAGE, "")]);
}

/// The exposable list is a copy of `exposableElementsThatAreNoBelongingAModel` in
/// `@markuplint/ml-spec`; fails when the TS list changes and this one does not.
#[test]
fn v6_no_empty_palpable_content_013() {
    const TS_SOURCE: &str =
        include_str!("../../../../../packages/@markuplint/ml-spec/src/algorithm/html/is-palpable-elements.ts");
    let list = TS_SOURCE
        .split_once("exposableElementsThatAreNoBelongingAModel: string[] = [")
        .and_then(|(_, rest)| rest.split_once("];"))
        .map(|(body, _)| body)
        .expect("the TS exposable list is declared in is-palpable-elements.ts");
    let mut ts_names: Vec<&str> = list.split('\'').skip(1).step_by(2).collect();
    let mut rust_names = EXPOSABLE_ELEMENTS.to_vec();
    ts_names.sort_unstable();
    rust_names.sort_unstable();
    assert_eq!(ts_names, rust_names);
}

/// `verify` drops an entry the Rust selector parser rejects, so that element would silently stop
/// being palpable; this fails first.
#[test]
fn v6_no_empty_palpable_content_014() {
    let s = spec();
    for entry in get_content_model_tags(&s, "#palpable").unwrap() {
        assert!(
            markuplint_selector::parser::parse(entry).is_ok(),
            "`{entry}` does not parse"
        );
    }
}

/// `<li>` holding one block child, which holds `text` when given. Built by hand: no parser in this
/// crate produces blocks.
fn li_with_block(
    is_fragment: bool,
    behavior: Option<MLASTBlockBehaviorType>,
    text: Option<&str>,
) -> markuplint_dom::arena::DomArena {
    use markuplint_dom::node::PSBlockData;

    let node_base = |uuid: &str, raw: &str, name: &str, parent: usize, depth: u32| NodeBase {
        id: 0,
        uuid: uuid.to_string(),
        raw: raw.to_string(),
        offset: 0,
        line: 1,
        col: 1,
        node_name: name.to_string(),
        parent: Some(parent),
        children: vec![],
        next_sibling: None,
        prev_sibling: None,
        depth,
    };
    let mut builder = DomArenaBuilder::new();
    let doc_id = builder.push(DomNode::Document(DocumentData {
        id: 0,
        raw: String::new(),
        is_fragment: true,
        unknown_parse_error: None,
        children: vec![],
    }));
    let li_id = builder.push(DomNode::Element(ElementData {
        pretender_context: None,
        base: node_base("li", "<li>", "li", doc_id, 1),
        namespace: NamespaceURI::XHTML,
        element_type: ElementType::Html,
        is_fragment: false,
        attributes: vec![],
        has_spread_attr: false,
        block_behavior: None,
        pair_node_id: None,
        tag_open_char: "<".to_string(),
        tag_close_char: ">".to_string(),
        is_ghost: false,
        close_tag: None,
    }));
    let block_id = builder.push(DomNode::PSBlock(PSBlockData {
        base: node_base("ps", "{block}", "#ps:block", li_id, 2),
        is_fragment,
        block_behavior: behavior.map(|behavior_type| MLASTBlockBehavior {
            behavior_type,
            expression: String::new(),
        }),
        is_bogus: false,
    }));
    let text_id = text.map(|raw| {
        builder.push(DomNode::Text(TextData {
            base: node_base("t", raw, "#text", block_id, 3),
            is_bogus: false,
        }))
    });
    if let Some(DomNode::Element(e)) = builder.get_mut(li_id) {
        e.base.id = li_id;
        e.base.children = vec![block_id];
    }
    if let Some(DomNode::PSBlock(b)) = builder.get_mut(block_id) {
        b.base.id = block_id;
        b.base.children = text_id.into_iter().collect();
    }
    if let Some(id) = text_id {
        if let Some(DomNode::Text(t)) = builder.get_mut(id) {
            t.base.id = id;
        }
    }
    if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
        d.children = vec![li_id];
    }
    builder.finish()
}

fn verify_li(arena: &markuplint_dom::arena::DomArena) -> Vec<String> {
    NoEmptyPalpableContent
        .verify(arena, &spec(), &RuleConfigSet::global_only(RuleConfig::default()))
        .into_iter()
        .map(|v| v.raw)
        .collect()
}

/// A fragment block (a JSX expression `{i.name}`) is transparent to TS `childNodes` and holds no
/// node of its own, so the `li` around it is empty. Expected values are the TS output on the
/// same input (`<li key={i.id}>{i.name}</li>` with the JSX parser).
#[test]
fn v6_no_empty_palpable_content_015() {
    assert_eq!(verify_li(&li_with_block(true, None, None)), ["<li>"]);
}

/// A block that is not a fragment and has no `each`/`end` behavior stays a node of `childNodes`:
/// which of its branches renders is unknown, so it counts as content. Expected values are the TS
/// output on `<ul><li>{#if a} {/if}</li></ul>` with the Svelte parser.
#[test]
fn v6_no_empty_palpable_content_016() {
    assert!(verify_li(&li_with_block(false, None, None)).is_empty());
    let if_block = Some(MLASTBlockBehaviorType::If);
    assert!(verify_li(&li_with_block(false, if_block, Some(" "))).is_empty());
}

/// A block of the `each` behavior is replaced by its children: what is left decides. Expected
/// values are the TS output on `<ul><li>{#each items as i}x{/each}</li></ul>` and the same with a
/// space for the `x` (Svelte parser).
#[test]
fn v6_no_empty_palpable_content_017() {
    let each = Some(MLASTBlockBehaviorType::Each);
    assert!(verify_li(&li_with_block(false, each.clone(), Some("x"))).is_empty());
    assert_eq!(verify_li(&li_with_block(false, each, Some(" "))), ["<li>"]);
}
