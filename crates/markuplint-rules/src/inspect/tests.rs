use serde_json::json;

use super::{debug_map, node_list};
use crate::lint::LintConfig;
use crate::test_util::{html_arena, spec};

fn config(value: serde_json::Value) -> LintConfig {
    serde_json::from_value(value).unwrap()
}

fn nodes(html: &str, config_value: serde_json::Value) -> Vec<super::InspectedNode> {
    node_list(&html_arena(html), &spec(), &config(config_value)).unwrap()
}

fn debug(html: &str, config_value: serde_json::Value) -> Vec<String> {
    debug_map(&html_arena(html), &spec(), &config(config_value)).unwrap()
}

#[test]
fn v6_inspect_node_list_is_in_document_order_without_end_tags() {
    let list = nodes("<div id=\"a\"><p>t</p><!--c--></div>", json!({}));
    let types: Vec<u32> = list.iter().map(|node| node.node_type).collect();
    let names: Vec<&str> = list.iter().map(|node| node.local_name.as_str()).collect();
    // div, p, text, comment
    assert_eq!(types, [1, 1, 3, 8]);
    assert_eq!(names, ["div", "p", "", ""]);
}

#[test]
fn v6_inspect_node_list_links_parents_and_element_children() {
    let list = nodes("<div><p>t</p><span></span></div>", json!({}));
    // 0 div, 1 p, 2 text, 3 span
    assert_eq!(list[0].parent_element, None);
    assert_eq!(list[0].children, [1, 3]);
    assert_eq!(list[1].parent_element, Some(0));
    assert_eq!(list[2].parent_element, Some(1));
    assert_eq!(list[2].children, Vec::<usize>::new());
    assert_eq!(list[3].parent_element, Some(0));
}

#[test]
fn v6_inspect_node_list_reads_id_class_and_attributes() {
    let list = nodes("<div id=\"a\" class=\"x y x\" role=\"group\" hidden></div>", json!({}));
    let div = &list[0];
    assert_eq!(div.id, "a");
    // TS keeps a token that repeats.
    assert_eq!(div.class_list, ["x", "y", "x"]);
    let attributes: Vec<(&str, &str)> = div
        .attributes
        .iter()
        .map(|attr| (attr.name.as_str(), attr.value.as_str()))
        .collect();
    assert_eq!(
        attributes,
        [("id", "a"), ("class", "x y x"), ("role", "group"), ("hidden", "")]
    );
}

#[test]
fn v6_inspect_node_list_positions_are_those_of_the_nodes() {
    let list = nodes("<div>\n  <p>t</p></div>", json!({}));
    let positions: Vec<(u32, u32)> = list.iter().map(|node| (node.start_line, node.start_col)).collect();
    // div, text, p, text
    assert_eq!(positions, [(1, 1), (1, 6), (2, 3), (2, 6)]);
}

#[test]
fn v6_inspect_node_list_follows_the_pretender() {
    let list = nodes(
        "<MyButton class=\"c\">x</MyButton>",
        json!({ "pretenders": [{ "selector": "MyButton", "as": { "element": "button", "inheritAttrs": true } }] }),
    );
    assert_eq!(list[0].local_name, "button");
    assert_eq!(list[0].class_list, ["c"]);
}

#[test]
fn v6_inspect_node_list_is_none_for_a_document_that_did_not_parse() {
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode};

    let mut builder = DomArenaBuilder::new();
    builder.push(DomNode::Document(DocumentData {
        id: 0,
        raw: String::new(),
        is_fragment: true,
        unknown_parse_error: Some("The b is invalid element (2:5): Broke mapping nodes.".to_owned()),
        children: vec![],
    }));
    let arena = builder.finish();
    let config = config(json!({}));
    assert!(node_list(&arena, &spec(), &config).is_none());
    assert!(debug_map(&arena, &spec(), &config).is_none());
}

#[test]
fn v6_inspect_debug_map_describes_elements_and_attributes() {
    let map = debug("<label for=\"cheese\">Do</label>", json!({}));
    assert_eq!(
        map,
        [
            "[1:1]>[1:21](0,20)LABEL: <label␣for=\"cheese\">",
            "  namespaceURI: true",
            "  elementType: html",
            "  isInFragmentDocument: true",
            "  isForeignElement: false",
            "  [1:8]>[1:20](7,19)for: for=\"cheese\"",
            "    [1:7]>[1:8](6,7)bN: ␣",
            "    [1:8]>[1:11](7,10)name: for",
            "    [1:11]>[1:11](10,10)bE: ",
            "    [1:11]>[1:12](10,11)equal: =",
            "    [1:12]>[1:12](11,11)aE: ",
            "    [1:12]>[1:13](11,12)sQ: \"",
            "    [1:13]>[1:19](12,18)value: cheese",
            "    [1:19]>[1:20](18,19)eQ: \"",
            "    isDirective: false",
            "    isExpressionValue: false",
            "    isDynamicValue: false",
            "    isAbsent: false",
            "[1:21]>[1:23](20,22)#text: Do",
        ]
    );
}

#[test]
fn v6_inspect_debug_map_makes_white_space_visible_and_counts_utf16() {
    let map = debug("<p>é\t日\n😀</p>", json!({}));
    // The text begins after `<p>` (3 bytes); `é` and `日` are one UTF-16 unit each, `😀` two.
    assert_eq!(map.last().unwrap(), "[1:4]>[2:3](3,9)#text: é→日⏎😀");
}

#[test]
fn v6_inspect_debug_map_marks_an_omitted_element() {
    let map = debug("<!DOCTYPE html><title>t</title>", json!({}));
    assert!(
        map.iter().any(|line| line.starts_with("[N/A]>[N/A](N/A)HTML: ")),
        "{map:#?}"
    );
}

fn found(html: &str, selector: &str, config_value: serde_json::Value) -> Result<Vec<(u32, u32)>, String> {
    super::search(&html_arena(html), &spec(), &config(config_value), selector)
        .map(|hits| hits.into_iter().map(|hit| (hit.line, hit.col)).collect())
}

/// Rust-only: the input of the CLI test `[search-tree-001]` of `packages/markuplint/src/cli/search.spec.ts`.
#[test]
fn v6_search_finds_an_element_in_every_tree_in_the_order_of_the_markup() {
    let html =
        "<p>a</p>\n<template><p>b</p></template>\n<div><template shadowrootmode=\"open\"><p>c</p></template></div>\n";
    assert_eq!(found(html, "p", json!({})), Ok(vec![(1, 1), (2, 11), (3, 38)]));
}

#[test]
fn v6_search_matches_a_selector_in_the_tree_of_the_element() {
    // Descendant combinator: the `p` in the content of the `template` is not in the `section`.
    assert_eq!(
        found(
            "<section><p></p><template><p></p></template></section>",
            "section p",
            json!({})
        ),
        Ok(vec![(1, 10)])
    );
    // Child combinator
    assert_eq!(
        found("<template><p></p></template>", "template > p", json!({})),
        Ok(vec![])
    );
    // `:has()` does not look into the content of a `template`.
    assert_eq!(
        found(
            "<section><template><p></p></template></section>",
            "section:has(p)",
            json!({})
        ),
        Ok(vec![])
    );
    // Siblings share the tree.
    assert_eq!(
        found("<template><b></b><p></p></template>", "b + p", json!({})),
        Ok(vec![(1, 18)])
    );
}

#[test]
fn v6_search_takes_the_document_as_the_scope() {
    // `:scope` is the document: no element is it, and an element at the top of it is its child.
    assert_eq!(
        found("<p></p><div><p></p></div>", ":scope > p", json!({})),
        Ok(vec![(1, 1)])
    );
    assert_eq!(found("<p></p>", ":scope", json!({})), Ok(vec![]));
}

#[test]
fn v6_search_follows_the_pretender() {
    assert_eq!(
        found(
            "<MyButton>x</MyButton><p></p>",
            "button",
            json!({ "pretenders": [{ "selector": "MyButton", "as": { "element": "button" } }] })
        ),
        Ok(vec![(1, 1)])
    );
}

#[test]
fn v6_search_reads_the_role_and_the_content_model() {
    assert_eq!(
        found(
            "<div role=\"button\"></div><button></button><a href=\"/\"></a>",
            ":role(button)",
            json!({})
        ),
        Ok(vec![(1, 1), (1, 26)])
    );
    assert_eq!(
        found(
            "<button></button><p></p><a href=\"/\"></a>",
            ":model(interactive)",
            json!({})
        ),
        Ok(vec![(1, 1), (1, 25)])
    );
}

#[test]
fn v6_search_is_empty_for_a_document_that_did_not_parse() {
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode};

    let mut builder = DomArenaBuilder::new();
    builder.push(DomNode::Document(DocumentData {
        id: 0,
        raw: String::new(),
        is_fragment: true,
        unknown_parse_error: Some("The b is invalid element (2:5): Broke mapping nodes.".to_owned()),
        children: vec![],
    }));
    let arena = builder.finish();
    assert_eq!(super::search(&arena, &spec(), &config(json!({})), "p"), Ok(vec![]));
}

#[test]
fn v6_search_rejects_a_selector_it_cannot_read() {
    assert!(found("<p></p>", "p[", json!({})).is_err());
    assert!(found("<p></p>", ":model(no-such-category)", json!({})).is_err());
}

#[test]
fn v6_search_takes_the_html_element_as_the_root() {
    // An element at the top of a fragment is no root; the `html` element of a document is.
    assert_eq!(found("<p></p>", ":root", json!({})), Ok(vec![]));
    assert_eq!(
        found(
            "<!DOCTYPE html><html lang=\"en\"><head><title>t</title></head><body></body></html>",
            ":root",
            json!({})
        ),
        Ok(vec![(1, 16)])
    );
}

#[test]
fn v6_search_reads_the_children_of_an_element_in_its_tree() {
    // The content of a `template` is not its children.
    assert_eq!(
        found("<template><p></p></template>", "template:has(> p)", json!({})),
        Ok(vec![])
    );
    assert_eq!(
        found(
            "<section><template><p></p></template></section>",
            "section > template:has(> p)",
            json!({})
        ),
        Ok(vec![])
    );
    assert_eq!(
        found("<section><p></p></section>", "section:has(> p)", json!({})),
        Ok(vec![(1, 1)])
    );
}

#[test]
fn v6_search_closest_does_not_reach_out_of_a_template() {
    assert_eq!(
        found(
            "<section><template><p></p></template></section>",
            "p:closest(section)",
            json!({})
        ),
        Ok(vec![])
    );
    assert_eq!(
        found("<section><div><p></p></div></section>", "p:closest(section)", json!({})),
        Ok(vec![(1, 15)])
    );
    assert_eq!(
        found(
            "<section><template><p></p></template></section>",
            "p:not(:closest(section))",
            json!({})
        ),
        Ok(vec![(1, 20)])
    );
}

#[test]
fn v6_search_scope_has_no_element_above_it() {
    // Nothing stands above the document, so no `div` is an ancestor of `:scope`.
    assert_eq!(
        found("<p></p><div><p></p></div>", "div :scope > p", json!({})),
        Ok(vec![])
    );
}
