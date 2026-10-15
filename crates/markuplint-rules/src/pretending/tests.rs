//! Ports of the HTML-parser pretender tests of `packages/@markuplint/ml-core/src/index.spec.ts`
//! and of `packages/@markuplint/ml-core/src/pretender-slot-content.spec.ts`. The latter use
//! JSX components; here they are custom elements (`<Pic>` → `<x-pic>`) parsed as HTML.

use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTHTMLAttr, NamespaceURI};
use markuplint_core::pretender::{PretenderAria, PretenderAriaName};
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_dom::pretender::{PretenderContext, SlotContent, SlotEntry};
use markuplint_selector::{matcher, parser};
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;
use serde_json::json;

use super::apply_pretenders;
use crate::lint::{LintConfig, lint};
use crate::violation::Severity;

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

fn html_arena(html: &str) -> DomArena {
    let as_doc = markuplint_html_parser::should_parse_as_document(html);
    let is_fragment = !as_doc;
    let parser_arena = if is_fragment {
        markuplint_html_parser::parse_fragment(html)
    } else {
        markuplint_html_parser::parse_document(html)
    };
    markuplint_dom::html_builder::build_from_html_arena(html, &parser_arena, is_fragment)
}

/// Parses `html`, applies `pretenders` and returns the arena with the id of the
/// first element.
fn pretended(html: &str, pretenders: serde_json::Value) -> (DomArena, NodeId) {
    let mut arena = html_arena(html);
    apply(&mut arena, pretenders);
    let id = arena.elements().next().unwrap().0;
    (arena, id)
}

fn apply(arena: &mut DomArena, pretenders: serde_json::Value) {
    let pretenders: Vec<markuplint_core::pretender::Pretender> = serde_json::from_value(pretenders).unwrap();
    apply_pretenders(arena, &pretenders, &spec());
}

fn el(arena: &DomArena, id: NodeId) -> &ElementData {
    arena.get(id).and_then(DomNode::as_element).unwrap()
}

fn slot_content(arena: &DomArena, id: NodeId) -> &SlotContent {
    el(arena, id).pretended().unwrap().slot_content.as_ref().unwrap()
}

fn attr<'a>(el: &'a ElementData, name: &str) -> Option<&'a MLASTHTMLAttr> {
    el.attributes.iter().find_map(|a| match a {
        MLASTAttr::HTMLAttr(a) if a.node_name.eq_ignore_ascii_case(name) => Some(a.as_ref()),
        _ => None,
    })
}

fn names(arena: &DomArena, ids: &[NodeId]) -> Vec<String> {
    ids.iter().map(|&id| el(arena, id).base.node_name.clone()).collect()
}

fn matches(arena: &DomArena, id: NodeId, selector: &str) -> bool {
    let selector = parser::parse(selector).unwrap();
    matcher::matches(&selector, arena, id, None, Some(&spec()), None)
}

// ============================================================
// index.spec.ts `pretenders`
// ============================================================

/// TS `index.spec.ts` "pretenders": an HTML element ignores its `as` attribute,
/// a custom element pretends to be what it names.
#[test]
fn v6_pretending_001() {
    let (arena, id) = pretended(r#"<div as="span"></div>"#, json!([]));
    assert!(!matches(&arena, id, "span"));
    assert!(el(&arena, id).pretender_context.is_none());

    let (arena, id) = pretended(r#"<x-div as="span"></x-div>"#, json!([]));
    assert!(matches(&arena, id, "span"));
    assert!(matches(&arena, id, "x-div"));
    // The `as` attribute pretender inherits the attributes.
    assert_eq!(attr(el(&arena, id), "as").unwrap().value.raw, "span");
}

/// TS `index.spec.ts` "pretenders": a pretended element matches both its
/// pretender name and its own name.
#[test]
fn v6_pretending_002() {
    let (arena, id) = pretended(
        r#"<x-custom as="span"></x-custom>"#,
        json!([{ "selector": "x-custom", "as": "div" }]),
    );
    assert!(matches(&arena, id, "div"));
    assert!(matches(&arena, id, "x-custom"));
    // The config wins over the `as` attribute.
    assert!(!matches(&arena, id, "span"));
    // Each phase reads one identity throughout: `:model()` and `:not()` see the
    // original name in the second phase, and a compound never mixes the two.
    // assert!(matches(&arena, id, ":model(custom)"));
    // TS has no `custom` category, so `:model(custom)` selects nothing (it used to match any name
    // with a hyphen here); `v6_pretending_021` reads the second phase with `:model(phrasing)`.
    assert!(!matches(&arena, id, ":model(custom)"));
    assert!(matches(&arena, id, "x-custom:not(div)"));
    assert!(!matches(&arena, id, "div:model(custom)"));
    let p = el(&arena, id).pretended().unwrap();
    assert_eq!(p.original.node_name, "x-custom");
    assert_eq!(p.original.element_type, ElementType::WebComponent);
    assert_eq!(el(&arena, id).element_type, ElementType::Html);
}

/// TS `index.spec.ts` "pretenders: slots: null treats component as void-like".
/// TS empties the children of the `as` element; here the element keeps its
/// children in the tree and records that the component renders none of them.
#[test]
fn v6_pretending_003() {
    let (arena, id) = pretended(
        "<x-void>child text</x-void>",
        json!([{ "selector": "x-void", "as": { "element": "img", "slots": null } }]),
    );
    let p = el(&arena, id).pretended().unwrap();
    assert!(!p.renders_children);
    assert_eq!(el(&arena, id).base.node_name, "img");

    let (arena, id) = pretended(
        "<x-slot>child text</x-slot>",
        json!([{ "selector": "x-slot", "as": { "element": "div", "slots": true } }]),
    );
    assert!(el(&arena, id).pretended().unwrap().renders_children);
}

/// TS `index.spec.ts` "pretenders: bare string identity (slots undefined) shares children".
#[test]
fn v6_pretending_004() {
    let (arena, id) = pretended(
        "<x-comp>child text</x-comp>",
        json!([{ "selector": "x-comp", "as": "div" }]),
    );
    let p = el(&arena, id).pretended().unwrap();
    assert!(p.renders_children);
    assert!(p.slot_content.is_none());
    assert_eq!(arena.children_of(id).unwrap().len(), 1);
}

fn from_attr_pretender(omit_if_missing: bool) -> serde_json::Value {
    let value = if omit_if_missing {
        json!({ "fromAttr": "kind", "omitIfMissing": true })
    } else {
        json!({ "fromAttr": "kind" })
    };
    json!([{ "selector": "x-comp", "as": { "element": "button", "attrs": [{ "name": "type", "value": value }] } }])
}

/// TS `index.spec.ts` "pretenders: fromAttr": the value of the attribute at the
/// usage site is copied.
#[test]
fn v6_pretending_005() {
    let (arena, id) = pretended(r#"<x-comp kind="submit"></x-comp>"#, from_attr_pretender(true));
    let el = el(&arena, id);
    assert_eq!(attr(el, "type").unwrap().value.raw, "submit");
    // Without `inheritAttrs`, the pretender has only the attributes it declares.
    assert!(attr(el, "kind").is_none());
}

/// TS `index.spec.ts` "pretenders: fromAttr": a missing attribute is not created
/// with `omitIfMissing`.
#[test]
fn v6_pretending_006() {
    let (arena, id) = pretended("<x-comp></x-comp>", from_attr_pretender(true));
    assert!(attr(el(&arena, id), "type").is_none());
}

/// TS `index.spec.ts` "pretenders: fromAttr": a missing attribute is created
/// empty without `omitIfMissing`.
#[test]
fn v6_pretending_007() {
    let (arena, id) = pretended("<x-comp></x-comp>", from_attr_pretender(false));
    assert_eq!(attr(el(&arena, id), "type").unwrap().value.raw, "");
}

/// TS `index.spec.ts` "pretenders: fromAttr": an expression at the usage site
/// stays dynamic. The HTML parser has no expressions, so the attribute is
/// marked dynamic by hand.
#[test]
fn v6_pretending_008() {
    for omit_if_missing in [true, false] {
        let mut arena = html_arena(r#"<x-comp kind="x"></x-comp>"#);
        let id = arena.elements().next().unwrap().0;
        for a in &mut arena.element_mut(id).unwrap().attributes {
            if let MLASTAttr::HTMLAttr(a) = a {
                a.is_dynamic_value = Some(true);
            }
        }
        apply(&mut arena, from_attr_pretender(omit_if_missing));
        let ty = attr(el(&arena, id), "type").unwrap();
        assert_eq!(ty.is_dynamic_value, Some(true));
        assert_eq!(ty.value.raw, "");
    }
}

/// `fromAttr` matches the attribute name case-insensitively.
#[test]
fn v6_pretending_009() {
    let (arena, id) = pretended(
        r#"<x-btn label="Go"></x-btn>"#,
        json!([{ "selector": "x-btn", "as": { "element": "button", "attrs": [{ "name": "aria-label", "value": { "fromAttr": "LABEL" } }] } }]),
    );
    assert_eq!(attr(el(&arena, id), "aria-label").unwrap().value.raw, "Go");
}

/// TS `index.spec.ts` "pretenders: ignored when selector matches an HTML element (issue-3740)".
#[test]
fn v6_pretending_010() {
    let (arena, id) = pretended("<marquee>x</marquee>", json!([{ "selector": "marquee", "as": "div" }]));
    assert!(el(&arena, id).pretender_context.is_none());
    assert_eq!(el(&arena, id).base.node_name, "marquee");
}

/// TS `index.spec.ts` "pretenders: still applies to web-component selectors (issue-3740)".
#[test]
fn v6_pretending_011() {
    let (arena, id) = pretended(
        "<x-marquee>x</x-marquee>",
        json!([{ "selector": "x-marquee", "as": "marquee" }]),
    );
    assert!(el(&arena, id).pretended().is_some());
    assert_eq!(el(&arena, id).base.node_name, "marquee");
}

/// TS `index.spec.ts` "pretenders: applies to non-spec custom names parsed as HTML (issue-3740)".
#[test]
fn v6_pretending_012() {
    let (arena, id) = pretended(
        "<SimpleButton>x</SimpleButton>",
        json!([{ "selector": "SimpleButton", "as": "button" }]),
    );
    assert!(el(&arena, id).pretended().is_some());
    assert_eq!(el(&arena, id).base.node_name, "button");
}

/// TS `index.spec.ts` "pretenders: aria field on HTML selector is ignored (issue-3740)".
/// TS passes `aria: { name: 'overridden' }`, a shape outside the `PretenderARIA`
/// type that the Rust config does not accept; a valid `aria` is used instead.
#[test]
fn v6_pretending_013() {
    let (arena, id) = pretended(
        "<button>x</button>",
        json!([{ "selector": "button", "as": { "element": "a", "aria": { "name": true } } }]),
    );
    assert!(el(&arena, id).pretender_context.is_none());
    assert_eq!(el(&arena, id).base.node_name, "button");
}

// ============================================================
// Pass behavior not covered by a TS unit test
// ============================================================

/// A bare-name pretender has no attributes: TS builds the `as` element with an
/// empty attribute list (so `<x-btn aria-label>` pretending to be `button` is unnamed).
#[test]
fn v6_pretending_014() {
    let (arena, id) = pretended(
        r#"<x-btn aria-label="x"></x-btn>"#,
        json!([{ "selector": "x-btn", "as": "button" }]),
    );
    assert!(el(&arena, id).attributes.is_empty());
    assert_eq!(el(&arena, id).pretended().unwrap().original.attributes.len(), 1);
    // Selectors still see the original attributes in the second phase.
    assert!(matches(&arena, id, "[aria-label]"));
}

/// `inheritAttrs` keeps the attributes of the matched element before the declared ones.
#[test]
fn v6_pretending_015() {
    let (arena, id) = pretended(
        r#"<x-btn aria-label="x"></x-btn>"#,
        json!([{ "selector": "x-btn", "as": { "element": "button", "inheritAttrs": true, "attrs": [{ "name": "type", "value": "button" }] } }]),
    );
    let names: Vec<_> = el(&arena, id)
        .attributes
        .iter()
        .filter_map(|a| match a {
            MLASTAttr::HTMLAttr(a) => Some(a.node_name.as_str()),
            MLASTAttr::Spread(_) => None,
        })
        .collect();
    assert_eq!(names, ["aria-label", "type"]);
}

/// The first matching pretender wins, in config order.
#[test]
fn v6_pretending_016() {
    let (arena, id) = pretended(
        "<x-btn></x-btn>",
        json!([{ "selector": "x-btn", "as": "a" }, { "selector": "x-btn", "as": "button" }]),
    );
    assert_eq!(el(&arena, id).base.node_name, "a");
}

/// Ancestors processed earlier are seen as what they pretend to be.
#[test]
fn v6_pretending_017() {
    let pretenders = json!([
        { "selector": "x-wrap", "as": "nav" },
        { "selector": "nav > x-btn", "as": "button" },
        { "selector": "x-wrap > x-link", "as": "a" }
    ]);
    let mut arena = html_arena("<x-wrap><x-btn></x-btn><x-link></x-link></x-wrap>");
    apply(&mut arena, pretenders);
    let ids: Vec<NodeId> = arena.elements().map(|(id, _)| id).collect();
    assert_eq!(names(&arena, &ids), ["nav", "button", "x-link"]);
}

/// `namespace: 'svg'` puts the pretender in the SVG namespace; the name keeps its case.
#[test]
fn v6_pretending_018() {
    let (arena, id) = pretended(
        "<x-icon></x-icon>",
        json!([{ "selector": "x-icon", "as": { "element": "foreignObject", "namespace": "svg" } }]),
    );
    assert_eq!(el(&arena, id).namespace, NamespaceURI::SVG);
    assert_eq!(el(&arena, id).base.node_name, "foreignObject");
    assert_eq!(
        el(&arena, id).pretended().unwrap().original.namespace,
        NamespaceURI::XHTML
    );
}

/// `aria` is kept for the name computation; position and `raw` stay the origin's.
#[test]
fn v6_pretending_019() {
    let (arena, id) = pretended(
        "<p><x-btn></x-btn></p>",
        json!([{ "selector": "x-btn", "as": { "element": "button", "aria": { "name": { "fromAttr": "title" } } } }]),
    );
    let btn = arena.elements().nth(1).unwrap().0;
    assert_ne!(btn, id);
    let p = el(&arena, btn).pretended().unwrap();
    assert_eq!(
        p.aria,
        Some(PretenderAria {
            name: Some(PretenderAriaName::FromAttr {
                from_attr: "title".into(),
            }),
        })
    );
    assert_eq!(el(&arena, btn).base.raw, "<x-btn>");
    assert_eq!(el(&arena, btn).base.col, 4);
}

/// An invalid selector matches nothing.
#[test]
fn v6_pretending_020() {
    let (arena, id) = pretended("<x-btn></x-btn>", json!([{ "selector": "x-btn[", "as": "button" }]));
    assert!(el(&arena, id).pretender_context.is_none());
}

/// `:model()` reads one identity per phase, and `#custom` follows it: a custom element that
/// pretends to be a `div` is not custom under the effective identity (`div` has no hyphen) but is
/// under the original one, which the second phase reads. Expected values are the TS output on the
/// same input (`createTestElement` with the same pretender).
#[test]
fn v6_pretending_021() {
    let (arena, id) = pretended(
        r#"<x-custom as="span"></x-custom>"#,
        json!([{ "selector": "x-custom", "as": "div" }]),
    );
    // `div` is not phrasing content: only the second phase, as the custom element, matches.
    assert!(matches(&arena, id, ":model(phrasing)"));
    assert!(matches(&arena, id, "x-custom:model(phrasing)"));
    // A compound never mixes the two identities.
    assert!(!matches(&arena, id, "div:model(phrasing)"));
    // `div` is flow content under the effective identity.
    assert!(matches(&arena, id, "div:model(flow)"));

    // A pretender target with a hyphen is custom under the effective identity, and the original
    // custom element is under the second phase.
    let (arena, id) = pretended("<x-a></x-a>", json!([{ "selector": "x-a", "as": "x-b" }]));
    assert!(matches(&arena, id, "x-b:model(phrasing)"));
    assert!(matches(&arena, id, "x-a:model(phrasing)"));
    assert!(!matches(&arena, id, ":model(interactive)"));
}

// ============================================================
// pretender-slot-content.spec.ts
// ============================================================

/// TS "{ dynamic: true } yields a dynamic attribute that keeps its name".
#[test]
fn v6_pretending_slot_001() {
    let (arena, id) = pretended(
        "<x-tab></x-tab>",
        json!([{ "selector": "x-tab", "as": { "element": "button", "attrs": [
            { "name": "type", "value": "button" },
            { "name": "tabIndex", "value": { "dynamic": true } }
        ] } }]),
    );
    let el = el(&arena, id);
    let ty = attr(el, "type").unwrap();
    assert_eq!(ty.value.raw, "button");
    assert_eq!(ty.is_dynamic_value, None);
    let tabindex = attr(el, "tabindex").unwrap();
    assert_eq!(tabindex.node_name, "tabIndex");
    assert_eq!(tabindex.is_dynamic_value, Some(true));
}

/// TS "an attribute without value stays a plain empty attribute".
#[test]
fn v6_pretending_slot_002() {
    let (arena, id) = pretended(
        "<x-tab></x-tab>",
        json!([{ "selector": "x-tab", "as": { "element": "button", "attrs": [{ "name": "disabled" }] } }]),
    );
    let disabled = attr(el(&arena, id), "disabled").unwrap();
    assert_eq!(disabled.value.raw, "");
    assert_eq!(disabled.is_dynamic_value, None);
}

/// TS "contents without a slot entry: static elements first, then the given children".
#[test]
fn v6_pretending_slot_003() {
    let (arena, id) = pretended(
        "<x-pic><source></x-pic>",
        json!([{ "selector": "x-pic", "as": {
            "element": "picture",
            "slots": null,
            "contents": [{ "element": "img", "attrs": [{ "name": "alt", "value": "x" }] }]
        } }]),
    );
    let content = slot_content(&arena, id);
    assert_eq!(content.wrapper, Some(id));
    assert_eq!(el(&arena, id).base.node_name, "picture");
    assert!(!content.mutable);

    let filled = content.fill(&arena.pure_children_of(id));
    assert_eq!(names(&arena, &filled), ["img", "source"]);
    assert_eq!(attr(el(&arena, filled[0]), "alt").unwrap().value.raw, "x");
}

/// TS "the slot entry decides where the given children are placed".
#[test]
fn v6_pretending_slot_004() {
    let (arena, id) = pretended(
        "<x-pic><source></x-pic>",
        json!([{ "selector": "x-pic", "as": { "element": "picture", "slots": true, "contents": [{ "slot": true }, { "element": "img" }] } }]),
    );
    let filled = slot_content(&arena, id).fill(&arena.pure_children_of(id));
    assert_eq!(names(&arena, &filled), ["source", "img"]);
}

/// TS "a dynamic entry marks the content mutable and adds no node".
#[test]
fn v6_pretending_slot_005() {
    let (arena, id) = pretended(
        "<x-box></x-box>",
        json!([{ "selector": "x-box", "as": { "element": "details", "slots": true, "contents": [{ "dynamic": true }, { "slot": true }] } }]),
    );
    let content = slot_content(&arena, id);
    assert!(content.mutable);
    assert!(content.fill(&[]).is_empty());
    assert_eq!(content.entries, [SlotEntry::Dynamic, SlotEntry::Slot]);
}

/// TS "a single slot wrapper is a virtual element whose parent is the component".
#[test]
fn v6_pretending_slot_006() {
    let (arena, id) = pretended(
        "<x-card>x</x-card>",
        json!([{ "selector": "x-card", "as": {
            "element": "div",
            "slots": [{ "element": "p", "attrs": [{ "name": "class", "value": "body" }], "contents": [{ "slot": true }] }]
        } }]),
    );
    assert_eq!(el(&arena, id).base.node_name, "div");
    let wrapper = slot_content(&arena, id).wrapper.unwrap();
    assert_ne!(wrapper, id);
    let wrapper_el = el(&arena, wrapper);
    assert_eq!(wrapper_el.base.node_name, "p");
    assert_eq!(attr(wrapper_el, "class").unwrap().value.raw, "body");
    assert_eq!(wrapper_el.base.parent, Some(id));
    assert!(wrapper_el.is_virtual());
    assert!(matches!(
        wrapper_el.pretender_context,
        Some(PretenderContext::Origin { origin }) if origin == id
    ));
    // Virtual elements are not part of the document.
    assert!(!arena.children_of(id).unwrap().contains(&wrapper));
    assert!(arena.elements().all(|(eid, _)| eid != wrapper));
    assert!(arena.elements_including_virtual().any(|(eid, _)| eid == wrapper));
}

/// TS "several slot wrappers leave the wrapper unknown".
#[test]
fn v6_pretending_slot_007() {
    let (arena, id) = pretended(
        "<x-card></x-card>",
        json!([{ "selector": "x-card", "as": { "element": "div", "slots": [
            { "element": "p", "contents": [{ "slot": true }] },
            { "element": "ul", "contents": [{ "slot": true }] }
        ] } }]),
    );
    let content = slot_content(&arena, id);
    assert_eq!(content.wrapper, None);
    assert!(!content.mutable);
}

/// TS "a dynamic entry in one of several slot wrappers marks the content mutable".
#[test]
fn v6_pretending_slot_008() {
    let (arena, id) = pretended(
        "<x-card></x-card>",
        json!([{ "selector": "x-card", "as": { "element": "div", "slots": [
            { "element": "p" },
            { "element": "ul", "contents": [{ "dynamic": true }] }
        ] } }]),
    );
    let content = slot_content(&arena, id);
    assert_eq!(content.wrapper, None);
    assert!(content.mutable);
}

/// TS "%s pretender without contents has no slot content".
#[test]
fn v6_pretending_slot_009() {
    for as_ in [
        json!("div"),
        json!({ "element": "div", "slots": true }),
        json!({ "element": "img", "slots": null }),
    ] {
        let (arena, id) = pretended("<x-comp>x</x-comp>", json!([{ "selector": "x-comp", "as": as_ }]));
        assert!(el(&arena, id).pretended().unwrap().slot_content.is_none());
    }
}

/// TS "svg, math and custom elements in contents keep their identity".
#[test]
fn v6_pretending_slot_010() {
    let (arena, id) = pretended(
        "<x-btn></x-btn>",
        json!([{ "selector": "x-btn", "as": {
            "element": "button",
            "slots": true,
            "contents": [{ "element": "svg" }, { "element": "math" }, { "element": "my-icon" }, { "slot": true }]
        } }]),
    );
    let filled = slot_content(&arena, id).fill(&[]);
    assert_eq!(el(&arena, filled[0]).namespace, NamespaceURI::SVG);
    assert_eq!(el(&arena, filled[1]).namespace, NamespaceURI::MathML);
    assert_eq!(el(&arena, filled[2]).element_type, ElementType::WebComponent);
    assert_eq!(el(&arena, filled[2]).namespace, NamespaceURI::XHTML);
}

/// TS "a null attribute value from an unchecked JSON config is a plain attribute".
#[test]
fn v6_pretending_slot_011() {
    let (arena, id) = pretended(
        "<x-det></x-det>",
        json!([{ "selector": "x-det", "as": { "element": "details", "attrs": [{ "name": "open", "value": null }] } }]),
    );
    assert_eq!(attr(el(&arena, id), "open").unwrap().value.raw, "");
}

/// TS "the given children are placed at the first slot position only".
#[test]
fn v6_pretending_slot_012() {
    let (arena, id) = pretended(
        "<x-fig><img></x-fig>",
        json!([{ "selector": "x-fig", "as": { "element": "figure", "slots": true, "contents": [{ "slot": true }, { "slot": true }] } }]),
    );
    let filled = slot_content(&arena, id).fill(&arena.pure_children_of(id));
    assert_eq!(filled.len(), 1);
}

/// Content entries of a single slot wrapper are children of the wrapper, and
/// the wrapper defaults to `[{ slot: true }]`.
#[test]
fn v6_pretending_slot_013() {
    let (arena, id) = pretended(
        "<x-card>x</x-card>",
        json!([{ "selector": "x-card", "as": { "element": "div", "slots": [{ "element": "ul" }] } }]),
    );
    let content = slot_content(&arena, id);
    assert_eq!(content.entries, [SlotEntry::Slot]);

    let (arena, id) = pretended(
        "<x-card>x</x-card>",
        json!([{ "selector": "x-card", "as": { "element": "div", "slots": [{ "element": "ul", "contents": [{ "element": "li" }, { "slot": true }] }] } }]),
    );
    let content = slot_content(&arena, id);
    let wrapper = content.wrapper.unwrap();
    let SlotEntry::Element(li) = content.entries[0] else {
        panic!("expected an element entry");
    };
    assert_eq!(el(&arena, li).base.parent, Some(wrapper));
}

// ============================================================
// lint() end to end (expected values from the TS engine)
// ============================================================

fn lint_with(html: &str, config: serde_json::Value) -> Vec<crate::violation::Violation> {
    let config: LintConfig = serde_json::from_value(config).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// TS: `<x-btn></x-btn>` pretending to be a `button` requires a name.
#[test]
fn v6_pretending_lint_001() {
    let v = lint_with(
        "<x-btn></x-btn>",
        json!({ "rules": { "require-accessible-name": true }, "pretenders": [{ "selector": "x-btn", "as": "button" }] }),
    );
    assert_eq!(v.len(), 1);
    assert_eq!(v[0].rule_id, "require-accessible-name");
    assert_eq!(v[0].severity, Severity::Error);
    assert_eq!(v[0].message, "Require accessible name");
    assert_eq!(v[0].line, 1);
    assert_eq!(v[0].col, 1);
    assert_eq!(v[0].raw, "<x-btn>");

    // Without pretenders the custom element is not checked.
    let v = lint_with(
        "<x-btn></x-btn>",
        json!({ "rules": { "require-accessible-name": true } }),
    );
    assert!(v.is_empty());
}

/// TS: the `as` attribute of a custom element makes it pretend even when no pretender is
/// configured at all. Expected values are the TS output.
#[test]
fn v6_pretending_lint_as_attr_without_pretenders() {
    let v = lint_with(
        r#"<x-btn as="button"></x-btn>"#,
        json!({ "rules": { "require-accessible-name": true } }),
    );
    assert_eq!(v.len(), 1);
    assert_eq!(v[0].message, "Require accessible name");
    assert_eq!((v[0].line, v[0].col), (1, 1));
    assert_eq!(v[0].raw, r#"<x-btn as="button">"#);

    let v = lint_with(
        r#"<x-btn as="button" aria-label="x"></x-btn>"#,
        json!({ "rules": { "require-accessible-name": true } }),
    );
    assert!(v.is_empty());
}

/// TS: a bare-name pretender drops the attributes, so `aria-label` does not name it;
/// with `inheritAttrs` it does.
#[test]
fn v6_pretending_lint_002() {
    let v = lint_with(
        r#"<x-btn aria-label="x"></x-btn>"#,
        json!({ "rules": { "require-accessible-name": true }, "pretenders": [{ "selector": "x-btn", "as": "button" }] }),
    );
    assert_eq!(v.len(), 1);
    assert_eq!(v[0].raw, r#"<x-btn aria-label="x">"#);

    let v = lint_with(
        r#"<x-btn aria-label="x"></x-btn>"#,
        json!({ "rules": { "require-accessible-name": true }, "pretenders": [{ "selector": "x-btn", "as": { "element": "button", "inheritAttrs": true } }] }),
    );
    assert!(v.is_empty());
}

/// TS: the name comes from the children of the pretended element and from a
/// `fromAttr` attribute.
#[test]
fn v6_pretending_lint_003() {
    let v = lint_with(
        "<x-btn>Hi</x-btn>",
        json!({ "rules": { "require-accessible-name": true }, "pretenders": [{ "selector": "x-btn", "as": "button" }] }),
    );
    assert!(v.is_empty());

    let v = lint_with(
        r#"<x-btn label="Go"></x-btn>"#,
        json!({ "rules": { "require-accessible-name": true }, "pretenders": [{ "selector": "x-btn", "as": {
            "element": "button", "attrs": [{ "name": "aria-label", "value": { "fromAttr": "LABEL" } }]
        } }] }),
    );
    assert!(v.is_empty());
}

/// TS: the first matching pretender wins (`a` without `href` needs no name).
#[test]
fn v6_pretending_lint_004() {
    let v = lint_with(
        "<x-btn></x-btn>",
        json!({ "rules": { "require-accessible-name": true }, "pretenders": [
            { "selector": "x-btn", "as": "a" },
            { "selector": "x-btn", "as": "button" }
        ] }),
    );
    assert!(v.is_empty());
}

/// TS: a selector sees an ancestor that pretended before as what it pretends to be.
#[test]
fn v6_pretending_lint_005() {
    let config = |selector: &str| {
        json!({ "rules": { "require-accessible-name": true }, "pretenders": [
            { "selector": "x-wrap", "as": "nav" },
            { "selector": selector, "as": "button" }
        ] })
    };
    let v = lint_with("<x-wrap><x-btn></x-btn></x-wrap>", config("nav > x-btn"));
    assert_eq!(v.len(), 1);
    assert_eq!(v[0].line, 1);
    assert_eq!(v[0].col, 9);
    assert_eq!(v[0].raw, "<x-btn>");

    let v = lint_with("<x-wrap><x-btn></x-btn></x-wrap>", config("x-wrap > x-btn"));
    assert!(v.is_empty());
}

/// TS: `nodeRules` match a pretended element by its pretender name.
#[test]
fn v6_pretending_lint_006() {
    let v = lint_with(
        "<div><x-btn></x-btn></div>",
        json!({
            "rules": { "require-accessible-name": true },
            "pretenders": [{ "selector": "x-btn", "as": "button" }],
            "nodeRules": [{ "selector": "button", "rules": { "require-accessible-name": false } }]
        }),
    );
    assert!(v.is_empty());
}

/// TS: `nodeRules` match a pretended element by its own name, by CSS and by regex.
#[test]
fn v6_pretending_lint_007() {
    for node_rule in [
        json!({ "selector": "x-btn", "rules": { "require-accessible-name": { "severity": "warning" } } }),
        json!({ "regexSelector": { "nodeName": "x-btn" }, "rules": { "require-accessible-name": { "severity": "warning" } } }),
    ] {
        let v = lint_with(
            "<div><x-btn></x-btn></div>",
            json!({
                "rules": { "require-accessible-name": true },
                "pretenders": [{ "selector": "x-btn", "as": "button" }],
                "nodeRules": [node_rule]
            }),
        );
        assert_eq!(v.len(), 1);
        assert_eq!(v[0].severity, Severity::Warning);
        assert_eq!(v[0].message, "Require accessible name");
        assert_eq!(v[0].line, 1);
        assert_eq!(v[0].col, 6);
        assert_eq!(v[0].raw, "<x-btn>");
    }
}

/// TS: virtual `contents` elements are not part of the document, so a rule that
/// walks the elements does not see them (an `h3` rendered by the component after
/// an `h1` is not a skipped level).
#[test]
fn v6_pretending_lint_008() {
    let v = lint_with(
        "<h1>a</h1><x-sec></x-sec>",
        json!({ "rules": { "no-skipped-heading-level": true }, "pretenders": [{ "selector": "x-sec", "as": {
            "element": "section", "slots": true, "contents": [{ "element": "h3" }, { "slot": true }]
        } }] }),
    );
    assert!(v.is_empty());
}

// ============================================================
// accname through the pretender (TS `ml-core` `ml-dom/helper/accname.ts`)
// ============================================================

/// One `require-accessible-name` case with its expected TS output: `None` for no
/// violation, or the `(col, raw)` of the single violation on line 1.
fn assert_accname_case(html: &str, pretenders: serde_json::Value, expected: Option<(u32, &str)>) {
    let v = lint_with(
        html,
        json!({ "rules": { "require-accessible-name": true }, "pretenders": pretenders }),
    );
    match expected {
        None => assert!(v.is_empty(), "{html}: {v:?}"),
        Some((col, raw)) => {
            assert_eq!(v.len(), 1, "{html}: {v:?}");
            assert_eq!(v[0].rule_id, "require-accessible-name");
            assert_eq!(v[0].severity, Severity::Error);
            assert_eq!(v[0].message, "Require accessible name");
            assert_eq!((v[0].line, v[0].col), (1, col), "{html}");
            assert_eq!(v[0].raw, raw);
        }
    }
}

/// TS: a component that never renders its children (`slots: null`) is not named by
/// the text written inside it.
#[test]
fn v6_pretending_accname_001() {
    assert_accname_case(
        "<x-btn>Hi</x-btn>",
        json!([{ "selector": "x-btn", "as": { "element": "button", "slots": null } }]),
        Some((1, "<x-btn>")),
    );
}

/// TS: `aria.name` of the pretender — `true` and `{ fromAttr }` (case-insensitive,
/// read from the attribute the user wrote) name the element; a missing or empty
/// source attribute does not.
#[test]
fn v6_pretending_accname_002() {
    assert_accname_case(
        r#"<x-btn label="Go">Hi</x-btn>"#,
        json!([{ "selector": "x-btn", "as": { "element": "button", "slots": null, "aria": { "name": { "fromAttr": "LABEL" } } } }]),
        None,
    );
    assert_accname_case(
        "<x-btn></x-btn>",
        json!([{ "selector": "x-btn", "as": { "element": "button", "aria": { "name": true } } }]),
        None,
    );
    assert_accname_case(
        "<x-btn></x-btn>",
        json!([{ "selector": "x-btn", "as": { "element": "button", "aria": { "name": { "fromAttr": "label" } } } }]),
        Some((1, "<x-btn>")),
    );
    assert_accname_case(
        r#"<x-btn label=""></x-btn>"#,
        json!([{ "selector": "x-btn", "as": { "element": "button", "aria": { "name": { "fromAttr": "label" } } } }]),
        Some((1, r#"<x-btn label="">"#)),
    );
}

/// TS: the name can come from an element the component renders (`contents`), and
/// from the children placed into a single slot wrapper.
#[test]
fn v6_pretending_accname_003() {
    assert_accname_case(
        "<x-btn></x-btn>",
        json!([{ "selector": "x-btn", "as": { "element": "button", "contents": [{ "element": "img", "attrs": [{ "name": "alt", "value": "Save" }] }] } }]),
        None,
    );
    assert_accname_case(
        "<x-btn>Hi</x-btn>",
        json!([{ "selector": "x-btn", "as": { "element": "button", "slots": [{ "element": "span" }] } }]),
        None,
    );
}

/// TS: a nested component is read as it renders — in name from content, in a label
/// and through `aria-labelledby`.
#[test]
fn v6_pretending_accname_004() {
    let null_span = |selector: &str| json!([{ "selector": selector, "as": { "element": "span", "slots": null } }]);
    assert_accname_case(
        "<button><x-icon>Save</x-icon></button>",
        null_span("x-icon"),
        Some((1, "<button>")),
    );
    assert_accname_case(
        "<button><x-icon></x-icon></button>",
        json!([{ "selector": "x-icon", "as": { "element": "span", "contents": [{ "element": "img", "attrs": [{ "name": "alt", "value": "Save" }] }] } }]),
        None,
    );
    assert_accname_case(
        "<label><x-txt>Name</x-txt><input></label>",
        null_span("x-txt"),
        Some((27, "<input>")),
    );
    assert_accname_case(
        "<label><x-txt>Name</x-txt><input></label>",
        json!([{ "selector": "x-txt", "as": { "element": "span" } }]),
        None,
    );
    assert_accname_case(
        r#"<span id="l"><x-t>Name</x-t></span><input aria-labelledby="l">"#,
        null_span("x-t"),
        Some((36, r#"<input aria-labelledby="l">"#)),
    );
}

/// TS: the options of a `select` that renders none of its children are not read,
/// neither for its value as an embedded control nor as a label.
#[test]
fn v6_pretending_accname_005() {
    let null_select = json!([{ "selector": "x-sel", "as": { "element": "select", "slots": null } }]);
    assert_accname_case(
        "<button><x-sel><option>One</option></x-sel></button>",
        null_select.clone(),
        Some((1, "<button>")),
    );
    assert_accname_case(
        "<label><x-sel><option>One</option></x-sel></label>",
        null_select,
        Some((8, "<x-sel>")),
    );
}

/// TS `collectTextContent` / `collectLabelText`: an element with no name of its own
/// passes on the names its descendants compute (no pretender involved).
#[test]
fn v6_pretending_accname_006() {
    assert_accname_case(r#"<button><span><img alt="Save"></span></button>"#, json!([]), None);
    assert_accname_case(
        r#"<label><span><img alt="Name"></span><input></label>"#,
        json!([]),
        None,
    );
}
