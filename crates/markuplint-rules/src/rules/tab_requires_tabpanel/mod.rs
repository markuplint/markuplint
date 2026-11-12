//! `tab-requires-tabpanel` rule: report an active `tab` that has no corresponding `tabpanel`.
//!
//! Ports `packages/@markuplint/rules/src/tab-requires-tabpanel/` and its checker
//! `wai-aria/checkings/tab-requires-tabpanel.ts`. A tab is active when its `aria-selected` value
//! is exactly `true`. Its tabpanel is found either way ARIA in HTML lets authors connect them: an
//! ID in the tab's `aria-controls` names an element whose computed role is `tabpanel`, or an
//! element whose computed role is `tabpanel` lists the tab's `id` in its `aria-labelledby`. An
//! attribute with a dynamic value is not read.
//!
//! The ids are resolved in the tree of the tab (the content of a `template` element is a tree of
//! its own), and compared as the DOM has them, with the character references resolved.
//!
//! WAI-ARIA 1.3 `tab`: "Authors MUST ensure that if a tab is active, a corresponding tabpanel that
//! represents the active tab is rendered."

use markuplint_core::mlast::MLASTHTMLAttr;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::computed_role::get_computed_role;
use crate::aria_check::{ElementContext, ElementGate, find_attr, is_js_whitespace, walk_elements};
use crate::create_message::Kw;
use crate::rule::{Rule, RuleConfigSet};
use crate::tree_scope::{decode_or_keep, dom_value, dom_value_of, element_by_id_of, is_expression, root_of};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct TabRequiresTabpanel;

impl Rule for TabRequiresTabpanel {
    fn id(&self) -> &'static str {
        "tab-requires-tabpanel"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        walk_elements(
            self.id(),
            arena,
            spec,
            config,
            ElementGate::Supported,
            |_| (),
            |(), ctx, violations| violations.extend(check(ctx)),
        )
    }
}

fn check(ctx: &ElementContext<'_>) -> Option<Violation> {
    if !has_role(ctx.spec, ctx.arena, ctx.node_id, ctx.version, "tab") {
        return None;
    }

    let selected = static_value(find_attr(ctx.el, "aria-selected"))?;
    if selected != "true" {
        return None;
    }

    let is_tabpanel = |node_id: NodeId| has_role(ctx.spec, ctx.arena, node_id, ctx.version, "tabpanel");

    let root = root_of(ctx.arena, ctx.spec, ctx.node_id);

    if let Some(controls_attr) = find_attr(ctx.el, "aria-controls")
        && let Some(controls) = static_value(Some(controls_attr))
        && split_js_whitespace(controls).filter(|id| !id.is_empty()).any(|id| {
            let id = if is_expression(controls_attr) {
                id.to_owned()
            } else {
                decode_or_keep(id)
            };
            element_by_id_of(ctx.arena, ctx.spec, root, &id).is_some_and(is_tabpanel)
        })
    {
        return None;
    }

    // The tabpanel refers to the tab in the tree of the tab
    if let Some(tab_id) = find_attr(ctx.el, "id").and_then(dom_value) {
        let labelled = ctx.arena.elements().any(|(node_id, el)| {
            find_attr(el, "aria-labelledby").is_some_and(|labelledby| {
                static_value(Some(labelledby)).is_some_and(|value| {
                    split_js_whitespace(value).any(|id| dom_value_of(labelledby, id).is_some_and(|id| id == tab_id))
                })
            }) && root_of(ctx.arena, ctx.spec, node_id) == root
                && is_tabpanel(node_id)
        });
        if labelled {
            return None;
        }
    }

    let tr = ctx.tr;
    let message = tr.t(
        "{0} requires {1}",
        &[
            Kw::S(&tr.t("an active \"{0*}\" {1}", &[Kw::S("tab"), Kw::S("role")])),
            Kw::S(&tr.t("a corresponding \"{0*}\" {1}", &[Kw::S("tabpanel"), Kw::S("role")])),
        ],
    );
    Some(ctx.element_violation(tr.finish(&message)))
}

fn has_role(spec: &MLMLSpec, arena: &DomArena, node_id: NodeId, version: ARIAVersion, name: &str) -> bool {
    get_computed_role(spec, arena, node_id, version, false)
        .role
        .is_some_and(|role| role.name == name)
}

/// The attribute's value, unless the attribute is absent or its value is dynamic.
fn static_value(attr: Option<&MLASTHTMLAttr>) -> Option<&str> {
    attr.filter(|attr| attr.is_dynamic_value != Some(true))
        .map(markuplint_dom::helpers::attr_value)
}

/// JS `value.split(/\s+/)`: like it, a leading or trailing run of whitespace yields an empty
/// string at that end.
fn split_js_whitespace(value: &str) -> impl Iterator<Item = &str> {
    let mut pieces = Vec::new();
    let mut start = 0;
    let mut in_space = false;
    for (index, ch) in value.char_indices() {
        if is_js_whitespace(ch) {
            if !in_space {
                pieces.push(&value[start..index]);
                in_space = true;
            }
        } else if in_space {
            start = index;
            in_space = false;
        }
    }
    pieces.push(if in_space { "" } else { &value[start..] });
    pieces.into_iter()
}
