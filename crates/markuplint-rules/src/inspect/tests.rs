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
