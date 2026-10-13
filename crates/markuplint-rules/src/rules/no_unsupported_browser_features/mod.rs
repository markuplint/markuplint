//! `no-unsupported-browser-features` rule: in TS, report HTML elements and attributes that the
//! project's browserslist targets do not support, according to MDN's browser-compat-data (BCD).
//!
//! Ports the id and the no-browserslist contract of
//! `packages/@markuplint/rules/src/no-unsupported-browser-features/`, the browserslist half of
//! the former `no-unsupported-features` rule, but not its check. TS resolves the targets with
//! the `browserslist` package (from the `browserslist` / `browserslistConfig` /
//! `browserslistEnv` options or the project's configuration found from the linted file) and
//! loads BCD at run time; the Rust engine has neither the resolver nor the data, so this rule
//! never reports. The former Rust `no-unsupported-features` accepted and ignored the same
//! options. The default severity is `warning`, as in TS.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct NoUnsupportedBrowserFeatures;

impl Rule for NoUnsupportedBrowserFeatures {
    fn id(&self) -> &'static str {
        "no-unsupported-browser-features"
    }

    fn default_severity(&self) -> Severity {
        Severity::Warning
    }

    fn verify(&self, _arena: &DomArena, _spec: &MLMLSpec, _config: &RuleConfigSet) -> Vec<Violation> {
        Vec::new()
    }
}
