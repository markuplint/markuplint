//! `no-circular-aria-owns` rule: report an `aria-owns` that refers to an element that is the element
//! itself or an ancestor of it in the accessibility tree.
//!
//! Ports `packages/@markuplint/rules/src/no-circular-aria-owns/`.
//!
//! > Authors MUST NOT create circular references with aria-owns.
//!
//! A reference is circular when the element it refers to is the element itself or an ancestor of it in
//! the accessibility tree, where the ancestors follow the DOM and every `aria-owns`
//! ([`is_circular_aria_owns_reference`]). Every reference of a cycle is reported at its ID, as each of
//! them closes it. The rule reports under every ARIA version, although the aria-owns property of
//! WAI-ARIA 1.1 and 1.2 does not state the requirement.
//!
//! An ID is resolved as `aria-owns` resolves it ([`get_aria_owns_target`]), and an ID that no element
//! has is left to `no-refer-to-non-existent-id`. A document with a template-language block, or an
//! `aria-owns` whose value is not known until it is rendered, is not judged.
//!
//! @see <https://w3c.github.io/aria/#aria-owns>

use std::collections::HashSet;

use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::get_attr_node_from_el;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::owns::{get_aria_owns_target, has_preprocessor_block, is_circular_aria_owns_reference};
use crate::aria_check::{ElementContext, ElementGate, role_tokens, walk_elements};
use crate::create_message::Kw;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoCircularAriaOwns;

impl Rule for NoCircularAriaOwns {
    fn id(&self) -> &'static str {
        "no-circular-aria-owns"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        if has_preprocessor_block(arena) {
            return vec![];
        }
        walk_elements(
            self.id(),
            arena,
            spec,
            config,
            ElementGate::Supported,
            |_| (),
            |(), ctx, violations| check(ctx, violations),
        )
    }
}

fn check(ctx: &ElementContext<'_>, violations: &mut Vec<Violation>) {
    let Some(attr) = get_attr_node_from_el(ctx.el, "aria-owns") else {
        return;
    };
    if attr.is_dynamic_value == Some(true) {
        return;
    }
    let mut reported = HashSet::new();
    for token in role_tokens(attr) {
        if reported.contains(&token.value) {
            continue;
        }
        let Some(target) = get_aria_owns_target(ctx.arena, ctx.spec, ctx.node_id, &token.value) else {
            continue;
        };
        if !is_circular_aria_owns_reference(ctx.arena, ctx.spec, ctx.node_id, target) {
            continue;
        }
        reported.insert(token.value.clone());
        let tr = ctx.tr;
        let message = tr.t(
            "Referring to {0} from \"aria-owns\" makes a cycle",
            &[Kw::S(
                &tr.t("the {0}", &[Kw::S(&tr.t("\"{0*}\" ID", &[Kw::S(&token.value)]))]),
            )],
        );
        violations.push(ctx.token_violation(&token, tr.finish(&message)));
    }
}
