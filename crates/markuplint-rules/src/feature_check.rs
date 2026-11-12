//! The spec-flag walk shared by `no-experimental-features` and `no-nonstandard-features`, two of
//! the three rules `no-unsupported-features` was split into.
//!
//! Both TS rules walk every element in the HTML namespace whose element type is `html` (custom
//! and authored elements reach them only through pretenders), and report the element when its
//! spec carries the flag and every non-directive attribute whose merged attribute spec (TS
//! `getAttrSpecs`), looked up by the name the DOM gives the attribute (TS `findAttrSpec`),
//! carries it.
//!
//! `ignoreFeatures` holds element names and `element[attribute]` keys (TS
//! `createIgnoreFeaturesLookup`). The element part is compared as the document compares tag names
//! (`tagNameCaseSensitive`), and the attribute part by the attribute that is checked
//! (`MLAttr#isNamedBy`). The option of an element replaces that of the rule for it.

use markuplint_core::mlast::{ElementType, MLASTAttr, NamespaceURI};
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::{attr_name, is_named_by};
use markuplint_types::spec::types::{ElementSpec, MLMLSpec};
use serde_json::Value;

use markuplint_core::i18n::Primitive as Kw;

use crate::attr_name_key::{attr_specs_of, find_attr_spec};
use crate::rule::RuleConfigSet;
use crate::violation::Violation;

/// The spec flag a rule reports, with the word its message uses.
#[derive(Clone, Copy)]
pub(crate) enum Flag {
    Experimental,
    NonStandard,
}

impl Flag {
    fn word(self) -> &'static str {
        match self {
            Self::Experimental => "experimental",
            Self::NonStandard => "non-standard",
        }
    }

    fn of_element(self, spec: &ElementSpec) -> bool {
        match self {
            Self::Experimental => spec.experimental == Some(true),
            Self::NonStandard => spec.non_standard == Some(true),
        }
    }
}

/// The parts of the keys of `ignoreFeatures` (TS `parseIgnoreFeatures`): the element keys, and the
/// element part and the attribute part of the attribute keys.
struct IgnoreFeatures<'a> {
    elements: Vec<&'a str>,
    attrs: Vec<(&'a str, &'a str)>,
}

impl<'a> IgnoreFeatures<'a> {
    fn parse(option: &'a Value) -> Self {
        let mut elements = Vec::new();
        let mut attrs = Vec::new();
        for feature in option.as_array().into_iter().flatten().filter_map(Value::as_str) {
            match feature.find('[') {
                Some(open) if feature.ends_with(']') => {
                    attrs.push((&feature[..open], &feature[open + 1..feature.len() - 1]));
                }
                _ => elements.push(feature),
            }
        }
        Self { elements, attrs }
    }
}

/// The element part of a key names `el_name`, compared as the document compares tag names.
fn element_part_matches(part: &str, el_name: &str, tag_name_case_sensitive: bool) -> bool {
    if tag_name_case_sensitive {
        part == el_name
    } else {
        part.eq_ignore_ascii_case(el_name)
    }
}

pub(crate) fn check_features(
    rule_id: &str,
    flag: Flag,
    arena: &DomArena,
    spec: &MLMLSpec,
    config: &RuleConfigSet,
) -> Vec<Violation> {
    let tag_name_case_sensitive = arena.settings().tag_name_case_sensitive;
    let tr = config.translator();
    let mut violations = Vec::new();
    for (node_id, el) in arena.elements() {
        let rule_config = config.get(node_id);
        if rule_config.disabled || el.is_ghost {
            continue;
        }
        // TS gates on `el.namespaceURI`, which follows a pretender as `localName` does, and lets
        // a non-HTML element through when it pretends.
        if el.namespace != NamespaceURI::XHTML || (el.element_type != ElementType::Html && el.pretended().is_none()) {
            continue;
        }
        // TS `el.localName`
        let el_name = if tag_name_case_sensitive {
            el.base.node_name.clone()
        } else {
            el.base.node_name.to_ascii_lowercase()
        };
        let empty = Value::Null;
        let ignore = IgnoreFeatures::parse(rule_config.options.get("ignoreFeatures").unwrap_or(&empty));
        // TS `getSpec()` looks the HTML element up by its exact local name.
        let el_spec = spec.specs.iter().find(|s| s.name == el_name);

        let element_ignored = ignore
            .elements
            .iter()
            .any(|part| element_part_matches(part, &el_name, tag_name_case_sensitive));
        if !element_ignored
            && let Some(el_spec) = el_spec
            && flag.of_element(el_spec)
        {
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity: rule_config.severity,
                message: tr.finish(&tr.t(
                    "{0} is {1:c}",
                    &[
                        Kw::S(&tr.t("the \"{0*}\" {1}", &[Kw::S(&el_name), Kw::S("element")])),
                        Kw::S(flag.word()),
                    ],
                )),
                line: el.base.line,
                col: el.base.col,
                raw: el.base.raw.clone(),
                reason: rule_config.reason.clone(),
                fix: None,
            });
        }

        let Some(attr_specs) = attr_specs_of(spec, el) else {
            continue;
        };
        for attr in &el.attributes {
            let MLASTAttr::HTMLAttr(html_attr) = attr else {
                continue;
            };
            if html_attr.is_directive == Some(true) {
                continue;
            }
            let attr_ignored = ignore.attrs.iter().any(|(element, name)| {
                element_part_matches(element, &el_name, tag_name_case_sensitive) && is_named_by(el, html_attr, name)
            });
            if attr_ignored {
                continue;
            }
            let Some(attr_spec) = find_attr_spec(&attr_specs, el, html_attr) else {
                continue;
            };
            let flagged = match flag {
                Flag::Experimental => attr_spec.experimental,
                Flag::NonStandard => attr_spec.non_standard,
            };
            if flagged != Some(true) {
                continue;
            }
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity: rule_config.severity,
                message: tr.finish(&tr.t(
                    "{0} is {1:c}",
                    &[
                        Kw::S(&tr.t("the \"{0*}\" {1}", &[Kw::S(attr_name(html_attr)), Kw::S("attribute")])),
                        Kw::S(flag.word()),
                    ],
                )),
                line: html_attr.name.line,
                col: html_attr.name.col,
                raw: html_attr.name.raw.clone(),
                reason: rule_config.reason.clone(),
                fix: None,
            });
        }
    }
    violations
}
