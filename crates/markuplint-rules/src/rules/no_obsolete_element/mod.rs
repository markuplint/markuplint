//! `no-obsolete-element` rule: report elements the spec marks obsolete.
//!
//! The HTML LS non-conforming-features half of the former `deprecated-element` rule;
//! the MDN/BCD deprecation half is `no-deprecated-element`.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::lifecycle_check::{Lifecycle, verify_element_lifecycle};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoObsoleteElement;

impl Rule for NoObsoleteElement {
    fn id(&self) -> &'static str {
        "no-obsolete-element"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        verify_element_lifecycle(self.id(), Lifecycle::Obsolete, arena, spec, config)
    }
}
