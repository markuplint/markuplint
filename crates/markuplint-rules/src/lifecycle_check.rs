//! Lifecycle checks shared by the rules `deprecated-attr` and `deprecated-element`
//! were split into: `no-obsolete-attr` / `no-deprecated-attr` and
//! `no-obsolete-element` / `no-deprecated-element`.
//!
//! Each pair walks the same nodes and reads the same spec entries; the two rules of
//! a pair differ only in which flag (`obsolete` or `deprecated`) they report. A node
//! carrying both flags is reported by both rules.

use markuplint_core::mlast::{ElementType, MLASTAttr, NamespaceURI};
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::get_raw_attr_name;
use markuplint_types::spec::lookup::get_spec;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::RuleConfigSet;
use crate::violation::Violation;

/// Which spec flag a lifecycle rule reports.
#[derive(Clone, Copy)]
pub(crate) enum Lifecycle {
    Obsolete,
    Deprecated,
}

impl Lifecycle {
    /// The spec field name, also the adjective of the message.
    fn key(self) -> &'static str {
        match self {
            Self::Obsolete => "obsolete",
            Self::Deprecated => "deprecated",
        }
    }
}

/// Reports every attribute whose merged spec (TS `getAttrSpecs()`) carries the
/// `lifecycle` flag.
///
/// Like TS `attrSpecs.find(item => item.name === attr.name)`, the name is matched
/// exactly as written in the source: an HTML attribute written in another case
/// (`ALIGN`) is not matched, and a camelCase SVG attribute (`baseProfile`) is.
pub(crate) fn verify_attr_lifecycle(
    rule_id: &str,
    lifecycle: Lifecycle,
    arena: &DomArena,
    spec: &MLMLSpec,
    config: &RuleConfigSet,
) -> Vec<Violation> {
    let mut violations = Vec::new();

    for (node_id, el) in arena.elements() {
        let rule_config = config.get(node_id);
        if rule_config.disabled {
            continue;
        }
        // The namespace-qualified name finds the SVG/MathML spec (`svg:a`) instead
        // of the HTML element of the same local name. The spec prefixes MathML
        // elements with `mml:` (TS `resolveNamespace()`).
        let qualified_name = match el.namespace {
            NamespaceURI::SVG => format!("svg:{}", el.base.node_name),
            NamespaceURI::MathML => format!("mml:{}", el.base.node_name),
            _ => el.base.node_name.clone(),
        };

        for attr in &el.attributes {
            let MLASTAttr::HTMLAttr(html_attr) = attr else {
                continue;
            };
            let name = get_raw_attr_name(html_attr);
            if !attr_has_flag(spec, &qualified_name, name, lifecycle) {
                continue;
            }
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity: rule_config.severity,
                message: format!("The \"{name}\" attribute is {}", lifecycle.key()),
                line: html_attr.name.line,
                col: html_attr.name.col,
                raw: html_attr.name.raw.clone(),
                reason: None,
            });
        }
    }

    violations
}

/// Reports every HTML or SVG element whose spec carries the `lifecycle` flag.
///
/// TS reports `obsolete` when the field is present at all (`spec.obsolete != null`)
/// and `deprecated` when it is truthy. Elements in the `MathML` namespace are out of
/// scope (the spec's deprecated `mml:mfenced` and `mml:maction` are not reported),
/// and so are custom and authored elements, unless they pretend to be an element.
///
/// TS gates on, and looks the pretender name up in, the namespace of the element as
/// written (`el.namespaceURI` is not delegated to the pretender), so this reads the
/// original namespace of a pretended element.
pub(crate) fn verify_element_lifecycle(
    rule_id: &str,
    lifecycle: Lifecycle,
    arena: &DomArena,
    spec: &MLMLSpec,
    config: &RuleConfigSet,
) -> Vec<Violation> {
    let mut violations = Vec::new();

    for (node_id, el) in arena.elements() {
        let rule_config = config.get(node_id);
        if rule_config.disabled || (el.element_type != ElementType::Html && el.pretended().is_none()) {
            continue;
        }
        // TS `el.localName`: lower-case for HTML, as written (case-adjusted by the
        // parser) for SVG.
        let (local_name, qualified_name) = match el.identity(true).namespace {
            NamespaceURI::XHTML => {
                let name = el.base.node_name.to_ascii_lowercase();
                (name.clone(), name)
            }
            NamespaceURI::SVG => (el.base.node_name.clone(), format!("svg:{}", el.base.node_name)),
            _ => continue,
        };
        let Some(el_spec) = get_spec(spec, &qualified_name) else {
            continue;
        };
        let flagged = match lifecycle {
            Lifecycle::Obsolete => el_spec.obsolete.is_some(),
            Lifecycle::Deprecated => el_spec.deprecated == Some(true),
        };
        if !flagged {
            continue;
        }
        violations.push(Violation {
            rule_id: rule_id.to_string(),
            name: None,
            severity: rule_config.severity,
            message: format!("The \"{local_name}\" element is {}", lifecycle.key()),
            line: el.base.line,
            col: el.base.col,
            raw: el.base.raw.clone(),
            reason: None,
        });
    }

    violations
}

/// Whether the attribute `attr_name` of element `element_name` has the `lifecycle`
/// flag in the merged spec TS `getAttrSpecs()` builds: the global attribute
/// categories the element enables (a category set to `false` is off, one set to an
/// array enables only the names it lists), overlaid field by field with the
/// element's own definition of the attribute.
fn attr_has_flag(spec: &MLMLSpec, element_name: &str, attr_name: &str, lifecycle: Lifecycle) -> bool {
    let Some(el) = get_spec(spec, element_name) else {
        return false;
    };

    let own = el.attributes.get(attr_name).and_then(|attr| match lifecycle {
        Lifecycle::Obsolete => attr.obsolete,
        Lifecycle::Deprecated => attr.deprecated,
    });
    if let Some(flag) = own {
        return flag;
    }

    el.global_attrs.iter().any(|(category, enabled)| {
        let included = match enabled {
            serde_json::Value::Bool(b) => *b,
            serde_json::Value::Array(names) => names.iter().any(|n| n.as_str() == Some(attr_name)),
            _ => false,
        };
        included
            && spec
                .def
                .global_attrs
                .get(category)
                .and_then(|attrs| attrs.get(attr_name))
                .and_then(|def| def.get(lifecycle.key()))
                .and_then(serde_json::Value::as_bool)
                .unwrap_or(false)
    })
}
