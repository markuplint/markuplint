//! `no-disallowed-ancestor` rule: an element inside an ancestor its content model forbids.
//!
//! Ports `packages/@markuplint/rules/src/no-disallowed-ancestor/`. The content model of the
//! element holds its ancestors in two forms that are read together: `forbiddenAncestors`, a deny
//! list (an ancestor that matches any selector violates; `address` must not have an `address`
//! ancestor), and `permittedAncestors`, an allow list (an ancestor that matches no entry
//! violates; the ancestors of `main` are limited to `html`, `body`, `div`, a `form` without an
//! accessible name and custom elements). The nearest ancestor that violates is reported, once per
//! element.
//!
//! The spec is looked up for an element of the HTML namespace only, as TS looks it up with the
//! namespace and no element of another namespace has these fields: an SVG `main` is not judged.
//!
//! The walk stops at an HTML `template` element: the elements in its content belong to a separate
//! `DocumentFragment` and have no ancestors in the document. It skips, without judging, a node that
//! is not an element of the output (a fragment, a `template` that a template engine drops).
//!
//! @see <https://html.spec.whatwg.org/multipage/scripting.html#the-template-element>

use markuplint_core::i18n::Primitive as Kw;
use markuplint_core::mlast::NamespaceURI;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
use markuplint_selector::ast::SelectorList;
use markuplint_selector::matcher;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_resolver_impl::SpecAriaResolver;
use crate::diagnostic;
use crate::helpers::{ancestor_elements, content_model_field, is_html_template_element, is_rendered_away};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoDisallowedAncestor;

/// An entry of `permittedAncestors`: `#custom` is not a selector but a custom element, which the
/// element decides as the `:model()` pseudo-class does for the `#custom` of a category. In
/// `forbiddenAncestors` every entry is a selector, so `#custom` there would be an id selector.
enum PermittedAncestor {
    Custom,
    Selector(SelectorList),
}

fn selectors(spec: &MLMLSpec, local_name: &str, key: &str) -> Option<Vec<serde_json::Value>> {
    match content_model_field(spec, local_name, key) {
        Some(serde_json::Value::Array(entries)) => Some(entries.clone()),
        _ => None,
    }
}

impl Rule for NoDisallowedAncestor {
    fn id(&self) -> &'static str {
        "no-disallowed-ancestor"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let resolver = SpecAriaResolver { spec };
        let mut violations = Vec::new();
        let tr = config.translator();
        for (node_id, el) in arena.elements() {
            if !matches!(el.namespace, NamespaceURI::XHTML) {
                continue;
            }
            let name = el.base.node_name.as_str();
            let forbidden: Vec<SelectorList> = selectors(spec, name, "forbiddenAncestors")
                .unwrap_or_default()
                .iter()
                .filter_map(serde_json::Value::as_str)
                .filter_map(|s| diagnostic::parse_selector("spec content model forbiddenAncestors", s))
                .collect();
            let permitted: Option<Vec<PermittedAncestor>> =
                selectors(spec, name, "permittedAncestors").map(|entries| {
                    entries
                        .iter()
                        .filter_map(serde_json::Value::as_str)
                        .filter_map(|s| {
                            if s == "#custom" {
                                Some(PermittedAncestor::Custom)
                            } else {
                                diagnostic::parse_selector("spec content model permittedAncestors", s)
                                    .map(PermittedAncestor::Selector)
                            }
                        })
                        .collect()
                });
            if forbidden.is_empty() && permitted.is_none() {
                continue;
            }
            let matches = |sel: &SelectorList, ancestor: NodeId| {
                matcher::matches(sel, arena, ancestor, None, Some(spec), Some(&resolver))
            };
            let violates = |ancestor: NodeId| {
                forbidden.iter().any(|sel| matches(sel, ancestor))
                    || permitted.as_ref().is_some_and(|entries| {
                        !entries.iter().any(|entry| match entry {
                            PermittedAncestor::Custom => matcher::is_custom_element_node(arena, ancestor),
                            PermittedAncestor::Selector(sel) => matches(sel, ancestor),
                        })
                    })
            };
            let ancestor_data = |id: NodeId| arena.get(id).and_then(DomNode::as_element);
            let Some(ancestor) = ancestor_elements(arena, node_id)
                .take_while(|&id| !ancestor_data(id).is_some_and(|a| is_html_template_element(a, spec)))
                .filter(|&id| !ancestor_data(id).is_some_and(is_rendered_away))
                .find(|&ancestor| violates(ancestor))
            else {
                continue;
            };
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let ancestor_name = arena
                .get(ancestor)
                .and_then(DomNode::as_element)
                .map_or("", |a| a.base.node_name.as_str());
            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message: tr.finish(&tr.t(
                    "{0} must not appear as a descendant of {1}",
                    &[
                        Kw::S(&tr.t("the \"{0}\" {1}", &[Kw::S(&el.base.node_name), Kw::S("element")])),
                        Kw::S(&tr.t("the \"{0}\" {1}", &[Kw::S(ancestor_name), Kw::S("element")])),
                    ],
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
