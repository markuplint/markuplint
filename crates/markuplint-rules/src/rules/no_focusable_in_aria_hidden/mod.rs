//! `no-focusable-in-aria-hidden` rule: report an element that may be focusable while it, or an
//! ancestor, has `aria-hidden="true"`.
//!
//! Ports `packages/@markuplint/rules/src/no-focusable-in-aria-hidden/` and its checker
//! `wai-aria/checkings/interaction-in-hidden.ts`. Focusability is the static `mayBeFocusable()`
//! heuristic ([`may_be_focusable`]), so a `disabled` control is still reported. The closest
//! element (the element itself first, then its `parentElement` chain) whose `aria-hidden` value
//! is exactly `true` decides the message; an intervening `aria-hidden="false"` does not stop the
//! walk. As TS `getAttributeNode('aria-hidden')` compares the lower-cased query with the
//! attribute name as written, an `ARIA-HIDDEN` attribute is not found, and the value comparison
//! is a case-sensitive `=== 'true'`, so `TRUE` or ` true` does not count. The default severity is
//! `warning`.

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::ElementData;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::may_be_focusable::may_be_focusable;
use crate::aria_check::{ElementContext, ElementGate, attr_name, html_attrs, walk_elements};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct NoFocusableInAriaHidden;

impl Rule for NoFocusableInAriaHidden {
    fn id(&self) -> &'static str {
        "no-focusable-in-aria-hidden"
    }

    fn default_severity(&self) -> Severity {
        Severity::Warning
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
    if !may_be_focusable(ctx.spec, ctx.arena, ctx.node_id) {
        return None;
    }

    let hidden_by = closest_aria_hidden(ctx.arena, ctx.node_id, ctx.el)?;
    let message = if hidden_by == ctx.node_id {
        "It may be focusable in spite of it has aria-hidden=true"
    } else {
        "It may be focusable in spite of it has the ancestor that has aria-hidden=true"
    };
    Some(ctx.element_violation(message))
}

/// The element itself or its closest ancestor element whose `aria-hidden` is `true`.
fn closest_aria_hidden(arena: &DomArena, node_id: NodeId, el: &ElementData) -> Option<NodeId> {
    if is_aria_hidden(el) {
        return Some(node_id);
    }
    arena
        .ancestors(node_id)
        .map_while(|node| node.as_element())
        .find(|ancestor| is_aria_hidden(ancestor))
        .map(|ancestor| ancestor.base.id)
}

/// TS `el.getAttributeNode('aria-hidden')?.value === 'true'`.
fn is_aria_hidden(el: &ElementData) -> bool {
    html_attrs(el)
        .find(|attr| attr_name(attr) == "aria-hidden")
        .is_some_and(|attr| attr.value.raw == "true")
}
