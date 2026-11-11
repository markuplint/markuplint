//! Lifecycle checks shared by the rules `deprecated-attr` and `deprecated-element`
//! were split into: `no-obsolete-attr` / `no-deprecated-attr` and
//! `no-obsolete-element` / `no-deprecated-element`.
//!
//! Each pair walks the same nodes and reads the same spec entries; the two rules of
//! a pair differ only in which flag (`obsolete` or `deprecated`) they report. A node
//! carrying both flags is reported by both rules.

use markuplint_core::mlast::{ElementType, MLASTAttr, NamespaceURI};
use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::attr_name;
use markuplint_types::spec::lookup::get_spec;
use markuplint_types::spec::types::MLMLSpec;

use crate::attr_name_key::{attr_specs_of, find_attr_spec};
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
/// `lifecycle` flag. The spec is the one the attribute names as the DOM names it (TS
/// `findAttrSpec`): `ALIGN` on a `<div>` is `align`, and `ID` on an `<svg>` whose attributes
/// code sets is not `id`.
///
/// The message names the attribute as written for `deprecated` (TS `attr.name`) and as the spec
/// spells it for `obsolete` (TS `attrSpec.name`).
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
        let Some(attr_specs) = attr_specs_of(spec, el) else {
            continue;
        };

        for attr in &el.attributes {
            let MLASTAttr::HTMLAttr(html_attr) = attr else {
                continue;
            };
            let Some(attr_spec) = find_attr_spec(&attr_specs, el, html_attr) else {
                continue;
            };
            let flagged = match lifecycle {
                Lifecycle::Obsolete => attr_spec.obsolete,
                Lifecycle::Deprecated => attr_spec.deprecated,
            };
            if flagged != Some(true) {
                continue;
            }
            let name = match lifecycle {
                Lifecycle::Obsolete => attr_spec.name.as_deref().unwrap_or_default(),
                Lifecycle::Deprecated => attr_name(html_attr),
            };
            violations.push(Violation {
                rule_id: rule_id.to_string(),
                name: None,
                severity: rule_config.severity,
                message: format!("The \"{name}\" attribute is {}", lifecycle.key()),
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

/// Reports every HTML or SVG element whose spec carries the `lifecycle` flag.
///
/// TS reports `obsolete` when the field is present at all (`spec.obsolete != null`)
/// and `deprecated` when it is truthy. Elements in the `MathML` namespace are out of
/// scope (the spec's deprecated `mml:mfenced` and `mml:maction` are not reported),
/// and so are custom and authored elements, unless they pretend to be an element.
///
/// TS gates on, and looks the pretender name up in, `el.namespaceURI`, which follows
/// the pretender as `localName` does.
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
        let (local_name, qualified_name) = match el.namespace {
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
            fix: None,
        });
    }

    violations
}
