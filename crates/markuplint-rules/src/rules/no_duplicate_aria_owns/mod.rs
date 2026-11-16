//! `no-duplicate-aria-owns` rule: report an ID that more than one element's `aria-owns` lists.
//!
//! Ports `packages/@markuplint/rules/src/no-duplicate-aria-owns/`.
//!
//! > Authors MUST ensure that an element's ID is not specified in more than one other element's
//! > aria-owns attribute at any time. In other words, an element can have only one explicit owner.
//!
//! Every `aria-owns` after the first one in tree order that lists an ID is reported, at the ID. The
//! first one is the one [`get_first_aria_owns_referrer`] reads from the markup, so an element of any
//! kind counts there, the ones this rule does not judge included. Which of them a user agent takes as
//! the owner also depends on the excluded ones it does not resolve, and does not change that all but
//! one are errors.
//!
//! An ID is resolved as `aria-owns` resolves it ([`get_aria_owns_target`]: the first element with the
//! ID in the tree of the `aria-owns`), and an ID that no element has is left to
//! `no-refer-to-non-existent-id`. An element that lists its own ID is a circular reference
//! (`no-circular-aria-owns`), not an owner of another element. A document with a template-language
//! block, or an `aria-owns` whose value is not known until it is rendered, is not judged.
//!
//! @see <https://w3c.github.io/aria/#aria-owns>

use std::collections::HashSet;

use markuplint_dom::arena::DomArena;
use markuplint_dom::helpers::get_attr_node_from_el;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria::owns::{get_aria_owns_target, get_first_aria_owns_referrer, has_preprocessor_block};
use crate::aria_check::{ElementContext, ElementGate, role_tokens, walk_elements};
use crate::create_message::Kw;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoDuplicateAriaOwns;

impl Rule for NoDuplicateAriaOwns {
    fn id(&self) -> &'static str {
        "no-duplicate-aria-owns"
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
        if target == ctx.node_id {
            continue;
        }
        let Some(first) = get_first_aria_owns_referrer(ctx.arena, ctx.spec, target) else {
            continue;
        };
        if first == ctx.node_id {
            continue;
        }
        reported.insert(token.value.clone());
        let tr = ctx.tr;
        let message = tr.t(
            "{0} is already referred to by the \"aria-owns\" of another element",
            &[Kw::S(
                &tr.t("the {0}", &[Kw::S(&tr.t("\"{0*}\" ID", &[Kw::S(&token.value)]))]),
            )],
        );
        violations.push(ctx.token_violation(&token, tr.finish(&message)));
    }
}
