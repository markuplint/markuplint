//! `no-unpaired-srcset-sizes` rule: `sizes` and a width-descriptor `srcset` require each other.
//!
//! Ports `packages/@markuplint/rules/src/no-unpaired-srcset-sizes/`, Checks 1 and 5 of the former
//! `srcset-sizes-constraint` rule, the two directions of one constraint of HTML LS § img / source
//! `srcset` attributes:
//!
//! - `sizes` present → `srcset` must use width descriptors (reported at the `srcset` value).
//! - `srcset` uses width descriptors → `sizes` must be present (reported at the element). For
//!   `<img>` this is unconditional. For `<source>`, `sizes` "may" be omitted when the following
//!   sibling `<img>` supports auto-sizes, which `loading="lazy"` stands for; a `<picture>` with no
//!   `<img>` cannot supply that, so the `<source>` is reported.
//!
//! A dynamic `srcset` (or `sizes`, for the first direction) is unknown at lint time and not judged.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::srcset_check::{
    CandidateContext, CandidateGate, allows_auto_sizes, attr_node, find_following_img, is_dynamic, is_lazy_loading,
    parse_srcset, walk_image_candidates,
};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoUnpairedSrcsetSizes;

impl Rule for NoUnpairedSrcsetSizes {
    fn id(&self) -> &'static str {
        "no-unpaired-srcset-sizes"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        walk_image_candidates(
            self.id(),
            arena,
            config,
            CandidateGate::ImgOrPictureSource,
            |ctx, violations| violations.extend(check(ctx)),
        )
    }
}

fn check(ctx: &CandidateContext<'_>) -> Vec<Violation> {
    let mut violations = Vec::new();
    let Some(srcset) = attr_node(ctx.el, "srcset") else {
        return violations;
    };
    if is_dynamic(srcset) {
        return violations;
    }
    let sizes = attr_node(ctx.el, "sizes");
    let descriptors = parse_srcset(markuplint_dom::helpers::attr_value(srcset));

    if sizes.is_some_and(|sizes| !is_dynamic(sizes)) && !descriptors.has_width {
        violations.push(ctx.value_violation(
            srcset,
            "The \"srcset\" attribute requires width descriptors when the \"sizes\" attribute is present",
        ));
    }

    if descriptors.has_width && sizes.is_none() {
        // A `<source>` may leave `sizes` out when the following `img` has `loading="lazy"` and
        // `sizes="auto"`, which it then takes (TS `allowsAutoSizes`)
        let img = if ctx.local_name == "source" {
            find_following_img(ctx.arena, ctx.node_id)
        } else {
            None
        };
        if img.is_none_or(|img| allows_auto_sizes(img) == Some(false)) {
            let message = if img.is_some_and(|img| is_lazy_loading(img) == Some(true)) {
                "The \"sizes\" attribute is required when the \"srcset\" attribute uses width descriptors, unless the following sibling \"img\" element has loading=\"lazy\" and sizes=\"auto\""
            } else {
                "The \"sizes\" attribute is required when the \"srcset\" attribute uses width descriptors"
            };
            violations.push(ctx.element_violation(message));
        }
    }

    violations
}
