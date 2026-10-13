//! `no-always-matching-source` rule: a `<source>` followed by more candidates must be told apart
//! from them by `media` or `type`.
//!
//! Ports `packages/@markuplint/rules/src/no-always-matching-source/`, Check 6 of the former
//! `srcset-sizes-constraint` rule. HTML LS § the source element: when a `<source>` has a following
//! sibling `<source>` or `<img>` with a `srcset` attribute, it must have a `type` attribute or a
//! `media` attribute that is not always-matching, otherwise it "always matches" and shadows the
//! following candidates. Whether the `<source>` itself has a `srcset` is irrelevant.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::srcset_check::{
    CandidateContext, CandidateGate, attr_node, following_element_siblings, is_dynamic, walk_image_candidates,
};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoAlwaysMatchingSource;

impl Rule for NoAlwaysMatchingSource {
    fn id(&self) -> &'static str {
        "no-always-matching-source"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        walk_image_candidates(
            self.id(),
            arena,
            config,
            CandidateGate::PictureSource,
            |ctx, violations| {
                if is_always_matching_source(ctx) {
                    violations.push(ctx.element_violation(
                        "The \"source\" element must have a \"media\" or \"type\" attribute when it has a following sibling \"source\" or \"img\" element with a \"srcset\" attribute",
                    ));
                }
            },
        )
    }
}

/// Whether the `<source>` lacks a usable `media` / `type` yet has a following sibling `<source>` /
/// `<img>` with a `srcset`.
///
/// A `type` attribute, whatever its value, satisfies the requirement. A `media` attribute does
/// only when its value is not always-matching; a dynamic value is unknown at lint time, so it is
/// assumed to qualify rather than risk a false positive.
fn is_always_matching_source(ctx: &CandidateContext<'_>) -> bool {
    let has_usable_type = attr_node(ctx.el, "type").is_some();
    let has_usable_media = attr_node(ctx.el, "media")
        .is_some_and(|media| is_dynamic(media) || !is_always_matching_media(&media.value.raw));
    !has_usable_type
        && !has_usable_media
        && following_element_siblings(ctx.arena, ctx.node_id).any(|sibling| {
            matches!(sibling.base.node_name.as_str(), "source" | "img") && attr_node(sibling, "srcset").is_some()
        })
}

/// Whether a `media` value is always-matching: after stripping leading and trailing ASCII
/// whitespace it is empty or an ASCII case-insensitive match for `all`.
///
/// Only ASCII whitespace (TAB, LF, FF, CR, SPACE) is stripped: a value padded with, say, NBSP is
/// neither empty nor `all` and keeps its distinguishing media query.
fn is_always_matching_media(value: &str) -> bool {
    let normalized = value.trim_matches(['\t', '\n', '\x0C', '\r', ' ']);
    normalized.is_empty() || normalized.eq_ignore_ascii_case("all")
}
