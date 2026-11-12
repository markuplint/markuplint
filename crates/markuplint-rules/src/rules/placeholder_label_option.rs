//! `placeholder-label-option` rule: a `select` that is required, not `multiple` and of display
//! size 1 needs a placeholder label option. Port of
//! `packages/@markuplint/rules/src/placeholder-label-option/`.
//!
//! The placeholder label option is the first `option` of the list of options, outside an
//! `optgroup`, whose value is the empty string. A value or a display size that is not known
//! (a dynamic attribute, text a preprocessor writes) is not taken for either.
//!
//! <https://html.spec.whatwg.org/multipage/form-elements.html#placeholder-label-option>

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::helpers::{attr_value, get_html_attr_from_el};
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_types::spec::types::MLMLSpec;

use crate::create_message::Kw;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct PlaceholderLabelOption;

impl Rule for PlaceholderLabelOption {
    fn id(&self) -> &'static str {
        "placeholder-label-option"
    }
    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let tr = config.translator();
        let mut violations = Vec::new();
        for (node_id, el) in arena.elements() {
            if local_name(el) != "select" {
                continue;
            }
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if !need_placeholder_label_option(el) || has_placeholder_label_option(arena, node_id) {
                continue;
            }
            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message: tr.finish(&tr.t(
                    "need {0}",
                    &[Kw::S(&tr.t("the {0}", &[Kw::S("placeholder label option")]))],
                )),
                line: el.base.line,
                col: el.base.col,
                raw: el.base.raw.clone(),
                reason: rule_config.reason.clone(),
                fix: None,
            });
        }
        violations
    }
}

/// TS `el.localName`.
fn local_name(el: &ElementData) -> String {
    if el.namespace == markuplint_core::mlast::NamespaceURI::XHTML {
        el.base.node_name.to_ascii_lowercase()
    } else {
        el.base.node_name.clone()
    }
}

fn need_placeholder_label_option(select: &ElementData) -> bool {
    if get_html_attr_from_el(select, "required").is_none() || get_html_attr_from_el(select, "multiple").is_some() {
        return false;
    }
    display_size(select) == Some(1)
}

/// TS `displaySize`: the display size of the `select`, `None` when its `size` is not known.
fn display_size(select: &ElementData) -> Option<u64> {
    let size = get_html_attr_from_el(select, "size");
    if size.is_some_and(|size| size.is_dynamic_value == Some(true)) {
        return None;
    }
    let has_multiple = get_html_attr_from_el(select, "multiple").is_some();
    Some(get_select_display_size(size.map(attr_value), has_multiple))
}

/// TS `getSelectDisplaySize`: the `size` parsed as a non-negative integer, else 4 for a
/// `multiple` select and 1 for any other.
///
/// <https://html.spec.whatwg.org/multipage/form-elements.html#concept-select-size>
fn get_select_display_size(size: Option<&str>, has_multiple: bool) -> u64 {
    parse_non_negative_integer(size).unwrap_or(if has_multiple { 4 } else { 1 })
}

/// TS `parseNonNegativeInteger`: the rules for parsing non-negative integers, leading ASCII
/// whitespace skipped, a sign allowed, and what follows the digits ignored. `-0` is 0.
///
/// <https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#rules-for-parsing-non-negative-integers>
fn parse_non_negative_integer(text: Option<&str>) -> Option<u64> {
    let rest = text?.trim_start_matches(['\t', '\n', '\x0C', '\r', ' ']);
    let (negative, rest) = match rest.as_bytes().first() {
        Some(b'-') => (true, &rest[1..]),
        Some(b'+') => (false, &rest[1..]),
        _ => (false, rest),
    };
    let digits: &str = &rest[..rest.bytes().take_while(u8::is_ascii_digit).count()];
    if digits.is_empty() {
        return None;
    }
    // JS `Number()` of a long run of digits is a large float, never 1
    let value = digits.parse::<u64>().unwrap_or(u64::MAX);
    if negative && value != 0 {
        return None;
    }
    Some(value)
}

fn has_placeholder_label_option(arena: &DomArena, select_id: NodeId) -> bool {
    let Some((option_id, inside_optgroup)) = first_option(arena, select_id, false) else {
        return false;
    };
    if inside_optgroup {
        return false;
    }
    option_value(arena, option_id).is_none_or(|value| value.is_empty())
}

/// TS `firstOption`: the first `option` of the list of options, looking through the elements
/// that wrap it and into one level of `optgroup`, past what the list skips (`select`, `hr`,
/// `datalist`), with whether it is in an `optgroup`.
///
/// <https://html.spec.whatwg.org/multipage/form-elements.html#concept-select-option-list>
fn first_option(arena: &DomArena, parent: NodeId, inside_optgroup: bool) -> Option<(NodeId, bool)> {
    for child_id in arena.child_nodes(parent) {
        let Some(DomNode::Element(child)) = arena.get(child_id) else {
            continue;
        };
        match local_name(child).as_str() {
            "option" => return Some((child_id, inside_optgroup)),
            "select" | "hr" | "datalist" => {}
            "optgroup" => {
                if inside_optgroup {
                    continue;
                }
                if let Some(found) = first_option(arena, child_id, true) {
                    return Some(found);
                }
            }
            _ => {
                if let Some(found) = first_option(arena, child_id, inside_optgroup) {
                    return Some(found);
                }
            }
        }
    }
    None
}

/// TS `optionValue`: the `value` of an option, else its text with ASCII whitespace stripped
/// and collapsed. `None` when it is not known.
///
/// <https://html.spec.whatwg.org/multipage/form-elements.html#concept-option-value>
fn option_value(arena: &DomArena, option_id: NodeId) -> Option<String> {
    let option = arena.get(option_id)?.as_element()?;
    if let Some(value) = get_html_attr_from_el(option, "value") {
        return (value.is_dynamic_value != Some(true)).then(|| attr_value(value).to_owned());
    }
    html_aware_text_content(arena, option_id).map(|text| strip_and_collapse_ascii_whitespace(&text))
}

/// TS `htmlAwareTextContent`: the text of the descendants, with character references resolved.
/// `None` when a block of a preprocessor writes some of it.
fn html_aware_text_content(arena: &DomArena, id: NodeId) -> Option<String> {
    let mut text = String::new();
    for child_id in arena.child_nodes(id) {
        match arena.get(child_id) {
            Some(DomNode::Text(t)) => {
                text.push_str(&crate::decode::decode_entities(&t.base.raw).unwrap_or_else(|| t.base.raw.clone()));
            }
            Some(DomNode::Element(_)) => text.push_str(&html_aware_text_content(arena, child_id)?),
            Some(DomNode::PSBlock(_)) => return None,
            _ => {}
        }
    }
    Some(text)
}

/// TS `stripAndCollapseAsciiWhitespace`.
///
/// <https://infra.spec.whatwg.org/#strip-and-collapse-ascii-whitespace>
fn strip_and_collapse_ascii_whitespace(text: &str) -> String {
    text.split(['\t', '\n', '\x0C', '\r', ' '])
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use markuplint_core::mlast::{ElementType, MLASTAttr, MLASTHTMLAttr, MLASTToken, NamespaceURI};
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, DomNode, ElementData, NodeBase};
    use markuplint_types::spec::load_spec;
    use markuplint_types::spec::types::MLMLSpec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    fn empty_token() -> MLASTToken {
        MLASTToken {
            uuid: String::new(),
            raw: String::new(),
            offset: 0,
            line: 1,
            col: 1,
        }
    }

    fn make_attr(name: &str, value: &str) -> markuplint_core::mlast::MLASTAttr {
        MLASTAttr::HTMLAttr(Box::new(MLASTHTMLAttr {
            uuid: String::new(),
            raw: if value.is_empty() && name == "required" {
                name.to_string()
            } else {
                format!("{name}=\"{value}\"")
            },
            offset: 0,
            line: 1,
            col: 1,
            node_name: name.to_string(),
            spaces_before_name: empty_token(),
            name: MLASTToken {
                raw: name.to_string(),
                line: 1,
                col: 1,
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
            is_expression_value: None,
            is_absent: None,
            literal_expression: None,
            is_directive: None,
            potential_name: None,
            potential_value: None,
            value_type: None,
            candidate: None,
            is_duplicatable: false,
            name_fold: None,
        }))
    }

    fn make_element(tag: &str, attrs: Vec<markuplint_core::mlast::MLASTAttr>, line: u32) -> ElementData {
        ElementData {
            pretender_context: None,
            base: NodeBase {
                id: 0,
                uuid: String::new(),
                raw: format!("<{tag}>"),
                offset: 0,
                line,
                col: 1,
                node_name: tag.to_string(),
                parent: None,
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
            namespace: NamespaceURI::XHTML,
            element_type: ElementType::Html,
            is_fragment: false,
            attributes: attrs,
            has_spread_attr: false,
            block_behavior: None,
            pair_node_id: None,
            tag_open_char: "<".to_string(),
            tag_close_char: ">".to_string(),
            is_ghost: false,
            close_tag: None,
        }
    }

    #[test]
    fn required_select_with_placeholder_no_violation() {
        // <select required><option value="">Choose</option></select>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let select_id = builder.push(DomNode::Element(make_element(
            "select",
            vec![make_attr("required", "")],
            1,
        )));
        let option_id = builder.push(DomNode::Element(make_element(
            "option",
            vec![make_attr("value", "")],
            2,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(select_id) {
            e.base.id = select_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![option_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(option_id) {
            e.base.id = option_id;
            e.base.parent = Some(select_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![select_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = PlaceholderLabelOption;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn required_select_without_placeholder_reported() {
        // <select required><option value="a">A</option></select>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let select_id = builder.push(DomNode::Element(make_element(
            "select",
            vec![make_attr("required", "")],
            1,
        )));
        let option_id = builder.push(DomNode::Element(make_element(
            "option",
            vec![make_attr("value", "a")],
            2,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(select_id) {
            e.base.id = select_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![option_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(option_id) {
            e.base.id = option_id;
            e.base.parent = Some(select_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![select_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = PlaceholderLabelOption;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Need the placeholder label option");
    }

    #[test]
    fn required_select_no_children_reported() {
        // <select required></select> with zero children → violation
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let select_id = builder.push(DomNode::Element(make_element(
            "select",
            vec![make_attr("required", "")],
            1,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(select_id) {
            e.base.id = select_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![];
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![select_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = PlaceholderLabelOption;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Need the placeholder label option");
    }

    #[test]
    fn required_select_option_without_value_reported() {
        // The value of an option without a `value` attribute is its text: "Choose" is not empty
        let violations = crate::test_util::lint_brief(
            "placeholder-label-option",
            "<select required><option>Choose</option></select>",
            serde_json::json!({ "rules": { "placeholder-label-option": true } }),
        );
        assert_eq!(violations.len(), 1);
        // An empty text is the empty string, so the option is a placeholder label option
        let violations = crate::test_util::lint_brief(
            "placeholder-label-option",
            "<select required><option> </option><option>A</option></select>",
            serde_json::json!({ "rules": { "placeholder-label-option": true } }),
        );
        assert!(violations.is_empty());
    }

    #[test]
    fn non_required_select_no_violation() {
        // <select><option value="a">A</option></select>
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));

        let select_id = builder.push(DomNode::Element(make_element("select", vec![], 1)));
        let option_id = builder.push(DomNode::Element(make_element(
            "option",
            vec![make_attr("value", "a")],
            2,
        )));

        if let Some(DomNode::Element(e)) = builder.get_mut(select_id) {
            e.base.id = select_id;
            e.base.parent = Some(doc_id);
            e.base.children = vec![option_id];
        }
        if let Some(DomNode::Element(e)) = builder.get_mut(option_id) {
            e.base.id = option_id;
            e.base.parent = Some(select_id);
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![select_id];
        }

        let arena = builder.finish();
        let s = spec();
        let rule = PlaceholderLabelOption;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }
}
