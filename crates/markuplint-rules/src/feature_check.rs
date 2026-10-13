//! The spec-flag walk shared by `no-experimental-features` and `no-nonstandard-features`, two of
//! the three rules `no-unsupported-features` was split into.
//!
//! Both TS rules walk every element in the HTML namespace whose element type is `html` (custom
//! and authored elements reach them only through pretenders, which the Rust DOM does not
//! resolve), and report the element when its spec carries the flag and every non-directive
//! attribute whose merged attribute spec carries it. The element name is the lower-cased local
//! name; the attribute name is matched as written against the spec's names, so `CREDENTIALLESS`
//! is not `credentialless`. `ignoreFeatures` is read from each element's own config and holds
//! element names and `element[attribute]` keys, compared as-is.

use markuplint_core::mlast::{ElementType, MLASTAttr, NamespaceURI};
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::get_raw_attr_name;
use markuplint_types::spec::types::{ElementSpec, MLMLSpec};
use serde_json::Value;

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

    fn json_key(self) -> &'static str {
        match self {
            Self::Experimental => "experimental",
            Self::NonStandard => "nonStandard",
        }
    }
}

pub(crate) fn check_features(
    rule_id: &str,
    flag: Flag,
    arena: &DomArena,
    spec: &MLMLSpec,
    config: &RuleConfigSet,
) -> Vec<Violation> {
    let mut violations = Vec::new();
    for (node_id, el) in arena.elements() {
        let rule_config = config.get(node_id);
        if rule_config.disabled || el.is_ghost {
            continue;
        }
        if el.namespace != NamespaceURI::XHTML || el.element_type != ElementType::Html {
            continue;
        }
        let el_name = el.base.node_name.to_ascii_lowercase();
        let ignore: Vec<&str> = rule_config
            .options
            .get("ignoreFeatures")
            .and_then(Value::as_array)
            .map(|list| list.iter().filter_map(Value::as_str).collect())
            .unwrap_or_default();
        // TS `getSpec()` / `getAttrSpecs()` look the HTML element up by its exact local name.
        let el_spec = spec.specs.iter().find(|s| s.name == el_name);

        if !ignore.contains(&el_name.as_str())
            && let Some(el_spec) = el_spec
            && flag.of_element(el_spec)
        {
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity: rule_config.severity,
                message: format!("The \"{el_name}\" element is {}", flag.word()),
                line: el.base.line,
                col: el.base.col,
                raw: el.base.raw.clone(),
                reason: None,
            });
        }

        let Some(el_spec) = el_spec else {
            continue;
        };
        for attr in &el.attributes {
            let MLASTAttr::HTMLAttr(html_attr) = attr else {
                continue;
            };
            if html_attr.is_directive == Some(true) {
                continue;
            }
            let attr_name = get_raw_attr_name(html_attr);
            let ignore_key = format!("{el_name}[{attr_name}]");
            if ignore.contains(&ignore_key.as_str()) {
                continue;
            }
            if !attr_has_flag(spec, el_spec, attr_name, flag) {
                continue;
            }
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity: rule_config.severity,
                message: format!("The \"{attr_name}\" attribute is {}", flag.word()),
                line: html_attr.name.line,
                col: html_attr.name.col,
                raw: html_attr.name.raw.clone(),
                reason: None,
            });
        }
    }
    violations
}

/// The flag on the attribute spec TS `getAttrSpecs()` builds: the global attributes of every
/// enabled category (all of a category enabled with `true`, the listed names of one enabled
/// with an array), with the element's own definition spread over them property by property, so
/// an element-level definition that leaves the flag out keeps the global one.
fn attr_has_flag(spec: &MLMLSpec, el_spec: &ElementSpec, attr_name: &str, flag: Flag) -> bool {
    if let Some(own) = el_spec.attributes.get(attr_name) {
        let own_flag = match flag {
            Flag::Experimental => own.experimental,
            Flag::NonStandard => own.non_standard,
        };
        if let Some(value) = own_flag {
            return value;
        }
    }
    let mut global_flag = false;
    for (category, enabled) in &el_spec.global_attrs {
        let selected = match enabled {
            Value::Bool(true) => true,
            Value::Array(names) => names.iter().any(|n| n.as_str() == Some(attr_name)),
            _ => false,
        };
        if !selected {
            continue;
        }
        if let Some(def) = spec
            .def
            .global_attrs
            .get(category)
            .and_then(|attrs| attrs.get(attr_name))
            && let Some(value) = def.get(flag.json_key()).and_then(Value::as_bool)
        {
            global_flag = value;
        }
    }
    global_flag
}
