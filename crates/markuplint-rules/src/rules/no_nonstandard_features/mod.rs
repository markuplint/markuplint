//! `no-nonstandard-features` rule: report HTML elements and attributes the spec marks
//! `nonStandard`.
//!
//! Ports `packages/@markuplint/rules/src/no-nonstandard-features/`, the `checkNonStandard`
//! half of the former `no-unsupported-features` rule: enabling this rule is the toggle the
//! option used to be. The walk is shared with `no-experimental-features` in
//! [`crate::feature_check`]. The default severity is `warning`.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::feature_check::{Flag, check_features};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct NoNonstandardFeatures;

impl Rule for NoNonstandardFeatures {
    fn id(&self) -> &'static str {
        "no-nonstandard-features"
    }

    fn default_severity(&self) -> Severity {
        Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        check_features(self.id(), Flag::NonStandard, arena, spec, config)
    }
}
