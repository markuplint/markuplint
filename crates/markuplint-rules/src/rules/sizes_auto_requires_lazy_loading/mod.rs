//! `sizes-auto-requires-lazy-loading` rule: `sizes="auto"` only goes with `loading="lazy"`.
//!
//! Ports `packages/@markuplint/rules/src/sizes-auto-requires-lazy-loading/`, Checks 3 (`<img>`)
//! and 4 (`<source>`) of the former `srcset-sizes-constraint` rule. HTML LS § the img element /
//! the source element: `sizes="auto"` defers sizing to the image's intrinsic dimensions, which are
//! unknown until the image starts loading, so the spec requires `loading="lazy"`. A `<source>`
//! checks the following sibling `<img>` instead of itself. Reported at the `sizes` value.
//!
//! Gated on `srcset` being present, as the rule this was split from was: `sizes="auto"` has
//! nothing to auto-size without candidates to choose from.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::srcset_check::{
    CandidateContext, CandidateGate, attr_node, find_following_img, has_sizes_auto, is_auto_sizes, is_dynamic,
    is_lazy_loading, walk_image_candidates,
};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct SizesAutoRequiresLazyLoading;

impl Rule for SizesAutoRequiresLazyLoading {
    fn id(&self) -> &'static str {
        "sizes-auto-requires-lazy-loading"
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

fn check(ctx: &CandidateContext<'_>) -> Option<Violation> {
    attr_node(ctx.el, "srcset")?;
    let sizes = attr_node(ctx.el, "sizes")
        .filter(|sizes| !is_dynamic(sizes) && has_sizes_auto(markuplint_dom::helpers::attr_value(sizes)))?;

    if ctx.local_name == "img" {
        if is_lazy_loading(ctx.el) != Some(false) {
            return None;
        }
        return Some(ctx.value_violation(
            sizes,
            "The \"sizes\" attribute with \"auto\" requires the \"loading\" attribute to be \"lazy\"",
        ));
    }

    let img = find_following_img(ctx.arena, ctx.node_id);
    let lazy = img.map_or(Some(false), is_lazy_loading);
    let auto = img.map_or(Some(false), is_auto_sizes);
    if lazy != Some(false) && auto != Some(false) {
        return None;
    }
    let message = if img.is_none() || (auto != Some(false) && lazy == Some(false)) {
        "The \"source\" element with sizes=\"auto\" requires the following sibling \"img\" element to have loading=\"lazy\"".to_string()
    } else {
        let missing: Vec<&str> = [
            (lazy == Some(false)).then_some("loading=\"lazy\""),
            (auto == Some(false)).then_some("sizes=\"auto\""),
        ]
        .into_iter()
        .flatten()
        .collect();
        format!(
            "The \"source\" element with sizes=\"auto\" requires the following sibling \"img\" element to have {}",
            missing.join(" and ")
        )
    };
    Some(ctx.value_violation(sizes, &message))
}
