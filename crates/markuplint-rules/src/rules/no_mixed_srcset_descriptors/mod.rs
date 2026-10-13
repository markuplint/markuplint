//! `no-mixed-srcset-descriptors` rule: every candidate of a `srcset` uses the same kind of
//! descriptor.
//!
//! Ports `packages/@markuplint/rules/src/no-mixed-srcset-descriptors/`, Check 2 of the former
//! `srcset-sizes-constraint` rule. HTML LS § Srcset attributes: all width (`w`), or all pixel
//! density (`x`, including the implied `1x` of a descriptor-less candidate). Reported at the
//! `srcset` value. Overlaps with the `Srcset` type `no-invalid-attr-value` validates the same
//! attribute against: that rule validates syntax, this one the inter-descriptor constraint, and
//! both may fire on the same mixed value.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::srcset_check::{CandidateGate, attr_node, is_dynamic, parse_srcset, walk_image_candidates};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoMixedSrcsetDescriptors;

impl Rule for NoMixedSrcsetDescriptors {
    fn id(&self) -> &'static str {
        "no-mixed-srcset-descriptors"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        walk_image_candidates(
            self.id(),
            arena,
            config,
            CandidateGate::ImgOrPictureSource,
            |ctx, violations| {
                let Some(srcset) = attr_node(ctx.el, "srcset").filter(|srcset| !is_dynamic(srcset)) else {
                    return;
                };
                let descriptors = parse_srcset(&srcset.value.raw);
                if descriptors.has_width && (descriptors.has_density || descriptors.has_implied) {
                    violations.push(ctx.value_violation(
                        srcset,
                        "The \"srcset\" attribute must not mix width and pixel density descriptors",
                    ));
                }
            },
        )
    }
}
