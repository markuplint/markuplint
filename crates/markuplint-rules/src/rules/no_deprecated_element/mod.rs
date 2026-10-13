//! `no-deprecated-element` rule: report elements the spec marks deprecated.
//!
//! The MDN/BCD deprecation half of the former `deprecated-element` rule; the HTML LS
//! obsolete half is `no-obsolete-element`. Deprecation is a fact recorded by MDN/BCD,
//! not a spec MUST NOT, so the default severity is `warning` (TS `defaultSeverity`).

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::lifecycle_check::{Lifecycle, verify_element_lifecycle};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct NoDeprecatedElement;

impl Rule for NoDeprecatedElement {
    fn id(&self) -> &'static str {
        "no-deprecated-element"
    }

    fn default_severity(&self) -> Severity {
        Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        verify_element_lifecycle(self.id(), Lifecycle::Deprecated, arena, spec, config)
    }
}
