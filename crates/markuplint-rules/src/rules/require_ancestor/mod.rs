//! `require-ancestor` rule: an element outside the ancestor its content model requires.
//!
//! Ports `packages/@markuplint/rules/src/require-ancestor/`. The required ancestor is the
//! selector of `contentModel.descendantOf` in the spec of the element (looked up with its
//! namespace). The climb stays in the tree of the element (it stops at the top of the content of
//! a `template` element), and an element with no ancestor matching it is reported unless:
//!
//! - a component whose output is not known stands above it (an unresolved component that is not
//!   rendered away): it may render the ancestor;
//! - the content model requires the ancestor only of an element with a parent node
//!   (`descendantOfWithParentNode`) and the element is at the top of a fragment document;
//! - the climb ended in the content of an ordinary `template` element, which a script places
//!   where the markup does not tell. The content of a declarative shadow root is reported.

use markuplint_core::i18n::Primitive as Kw;
use markuplint_core::mlast::NamespaceURI;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
use markuplint_selector::matcher;
use markuplint_types::spec::types::{ElementSpec, MLMLSpec};

use crate::aria_check::element_local_name;
use crate::diagnostic;
use crate::helpers::{is_rendered_away, is_unresolved_component};
use crate::rule::{Rule, RuleConfigSet};
use crate::tree_scope::{ShadowRootAttachment, TreeRoot, Trees, declarative_shadow_root_attachment};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct RequireAncestor;

/// TS `getSpecByTagName`: the spec named exactly as the element is in its namespace (`area` for
/// HTML, `svg:area` for SVG). Unlike `get_spec_by_tag_name` it does not fall back to the HTML
/// name, so an SVG `area` is not the HTML `area` element.
fn exact_spec<'a>(spec: &'a MLMLSpec, local_name: &str, namespace: &NamespaceURI) -> Option<&'a ElementSpec> {
    let prefix = match namespace {
        NamespaceURI::XHTML => "",
        NamespaceURI::SVG => "svg:",
        NamespaceURI::MathML => "mml:",
        NamespaceURI::XLink => "xlink:",
    };
    let name = format!("{prefix}{local_name}");
    spec.specs.iter().find(|s| s.name == name)
}

/// TS `hasParentNode`: in a fragment document, an element whose parents up to the top of the file
/// are all rendered away (or blocks of a template language) has no parent node.
fn has_parent_node(arena: &DomArena, node_id: NodeId) -> bool {
    if !arena.is_fragment() {
        return true;
    }
    let mut current = arena.get(node_id).and_then(DomNode::parent_id);
    while let Some(id) = current {
        match arena.get(id) {
            Some(DomNode::Element(el)) if !is_rendered_away(el) => return true,
            Some(node @ DomNode::Element(_)) => current = node.parent_id(),
            Some(DomNode::PSBlock(block)) => current = block.base.parent,
            _ => return false,
        }
    }
    false
}

impl Rule for RequireAncestor {
    fn id(&self) -> &'static str {
        "require-ancestor"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let trees = Trees::new(arena, spec);
        let mut violations = Vec::new();
        let tr = config.translator();
        for (node_id, el) in arena.elements() {
            let local_name = element_local_name(el);
            let Some(content_model) = exact_spec(spec, &local_name, &el.namespace).map(|s| &s.content_model) else {
                continue;
            };
            let Some(descendant_of) = content_model.get("descendantOf").and_then(serde_json::Value::as_str) else {
                continue;
            };
            let Some(selector) = diagnostic::parse_selector("spec content model descendantOf", descendant_of) else {
                continue;
            };
            let mut found = false;
            let mut unknown = false;
            for ancestor in trees.tree_ancestor_elements(node_id) {
                if matcher::matches(&selector, arena, ancestor, None, Some(spec), None) {
                    found = true;
                    break;
                }
                // What the component renders is not known, so the ancestor may be among it
                if arena
                    .get(ancestor)
                    .and_then(DomNode::as_element)
                    .is_some_and(|a| !is_rendered_away(a) && is_unresolved_component(a))
                {
                    unknown = true;
                    break;
                }
            }
            if found || unknown {
                continue;
            }
            if content_model
                .get("descendantOfWithParentNode")
                .and_then(serde_json::Value::as_bool)
                == Some(true)
                && !has_parent_node(arena, node_id)
            {
                continue;
            }
            // The content of an ordinary `template` is placed where the markup does not tell; a
            // declarative shadow root is a tree of its own
            if let TreeRoot::Content(template) = trees.root_of(node_id)
                && declarative_shadow_root_attachment(arena, spec, template) != ShadowRootAttachment::Attached
            {
                continue;
            }
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            violations.push(Violation {
                spec_conformance: None,
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message: tr.finish(&tr.t(
                    "{0} must appear as a descendant of {1}",
                    &[
                        Kw::S(&tr.t("the \"{0}\" {1}", &[Kw::S(&el.base.node_name), Kw::S("element")])),
                        Kw::S(&tr.t("the \"{0}\" {1}", &[Kw::S(descendant_of), Kw::S("element")])),
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
