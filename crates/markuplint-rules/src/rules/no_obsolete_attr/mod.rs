//! `no-obsolete-attr` rule: report attributes the spec marks obsolete.
//!
//! The HTML LS non-conforming-features half of the former `deprecated-attr` rule;
//! the MDN/BCD deprecation half is `no-deprecated-attr`.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::lifecycle_check::{Lifecycle, verify_attr_lifecycle};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoObsoleteAttr;

impl Rule for NoObsoleteAttr {
    fn id(&self) -> &'static str {
        "no-obsolete-attr"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        verify_attr_lifecycle(self.id(), Lifecycle::Obsolete, arena, spec, config)
    }
}
