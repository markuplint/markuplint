//! The tree an element is matched in: what is in the content of a `template` element is a tree of
//! its own, so a selector does not reach out of it (TS `treeParentElement`).

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;

use super::matches;
use crate::parser;

fn html_arena(html: &str) -> DomArena {
    let as_doc = markuplint_html_parser::should_parse_as_document(html);
    let parser_arena = if as_doc {
        markuplint_html_parser::parse_document(html)
    } else {
        markuplint_html_parser::parse_fragment(html)
    };
    markuplint_dom::html_builder::build_from_html_arena(html, &parser_arena, !as_doc)
}

/// The elements of the document named `name`, in the order of the markup.
fn elements(arena: &DomArena, name: &str) -> Vec<NodeId> {
    arena
        .elements()
        .filter(|(_, el)| el.base.node_name.eq_ignore_ascii_case(name))
        .map(|(id, _)| id)
        .collect()
}

/// Which of the `<p>` elements of `html` the selector matches, by their order.
fn matched_paragraphs(html: &str, selector: &str, scope: Option<NodeId>) -> Vec<usize> {
    let arena = html_arena(html);
    let list = parser::parse(selector).unwrap();
    elements(&arena, "p")
        .into_iter()
        .enumerate()
        .filter(|&(_, id)| matches(&list, &arena, id, scope, None, None))
        .map(|(index, _)| index)
        .collect()
}

#[test]
fn a_descendant_combinator_does_not_leave_the_content_of_a_template() {
    assert_eq!(
        matched_paragraphs(
            "<section><p></p><template><p></p></template></section>",
            "section p",
            None
        ),
        [0]
    );
}

#[test]
fn a_child_combinator_does_not_reach_the_template_from_its_content() {
    assert_eq!(
        matched_paragraphs("<template><p></p></template>", "template > p", None),
        Vec::<usize>::new()
    );
}

#[test]
fn a_sibling_combinator_stays_in_the_content_of_a_template() {
    assert_eq!(
        matched_paragraphs("<template><b></b><p></p></template>", "b + p", None),
        [0]
    );
}

#[test]
fn closest_does_not_leave_the_content_of_a_template() {
    assert_eq!(
        matched_paragraphs(
            "<section><template><p></p></template></section>",
            "p:closest(section)",
            None
        ),
        Vec::<usize>::new()
    );
    assert_eq!(
        matched_paragraphs("<section><div><p></p></div></section>", "p:closest(section)", None),
        [0]
    );
}

#[test]
fn has_does_not_look_into_the_content_of_a_template() {
    let arena = html_arena("<section><template><p></p></template></section>");
    let section = elements(&arena, "section")[0];
    let template = elements(&arena, "template")[0];
    for selector in ["section:has(p)", "section:has(> template > p)"] {
        let list = parser::parse(selector).unwrap();
        assert!(!matches(&list, &arena, section, None, None, None), "{selector}");
    }
    for selector in ["template:has(p)", "template:has(> p)"] {
        let list = parser::parse(selector).unwrap();
        assert!(!matches(&list, &arena, template, None, None, None), "{selector}");
    }
    let list = parser::parse("section:has(> template)").unwrap();
    assert!(matches(&list, &arena, section, None, None, None));
}

#[test]
fn root_is_the_html_element() {
    let fragment = html_arena("<p></p>");
    let list = parser::parse(":root").unwrap();
    assert!(!matches(
        &list,
        &fragment,
        elements(&fragment, "p")[0],
        None,
        None,
        None
    ));

    let document = html_arena("<!DOCTYPE html><html><head><title>t</title></head><body></body></html>");
    assert!(matches(
        &list,
        &document,
        elements(&document, "html")[0],
        None,
        None,
        None
    ));
    assert!(!matches(
        &list,
        &document,
        elements(&document, "body")[0],
        None,
        None,
        None
    ));
}

#[test]
fn scope_stands_where_the_parent_of_the_top_of_the_document_would() {
    let arena = html_arena("<p></p><div><p></p></div>");
    let document = arena.document_id();
    assert!(matches!(
        document.and_then(|id| arena.get(id)),
        Some(DomNode::Document(_))
    ));
    let first = elements(&arena, "p")[0];
    let second = elements(&arena, "p")[1];

    let child = parser::parse(":scope > p").unwrap();
    assert!(matches(&child, &arena, first, document, None, None));
    assert!(!matches(&child, &arena, second, document, None, None));

    let below = parser::parse("div :scope > p").unwrap();
    assert!(!matches(&below, &arena, first, document, None, None));
}

#[test]
fn a_chain_through_the_scope_that_is_the_document_matches_nothing_above_it() {
    let arena = html_arena("<p></p><div><p></p></div>");
    let document = arena.document_id();
    for selector in [
        "div :scope > p",
        "* :scope p",
        "* > :scope p",
        "p ~ :scope > p",
        "p + :scope p",
        ":scope ~ p",
        ":scope + p",
        "div:has(:scope) p",
    ] {
        let list = parser::parse(selector).unwrap();
        for id in elements(&arena, "p") {
            assert!(!matches(&list, &arena, id, document, None, None), "{selector}");
        }
    }
}
