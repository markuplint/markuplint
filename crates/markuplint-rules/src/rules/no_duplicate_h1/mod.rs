//! `no-duplicate-h1` rule: report a second `<h1>` element.
//!
//! Ports `packages/@markuplint/rules/src/no-duplicate-h1/`, the duplicate-`<h1>` half of the
//! former `required-h1` rule. TS reports `h1Stack[1]` alone, so a third or later `<h1>` adds
//! no further violation. The former `expected-once` option is gone: disabling this rule is how
//! to opt out. Based on WCAG Technique H42, which is non-normative, so the default severity is
//! `warning`.

use std::collections::HashMap;

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::create_message::Kw;
use crate::h1_check::collect_h1s;
use crate::rule::{Rule, RuleConfigSet};
use crate::tree_scope::{TreeRoot, Trees};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct NoDuplicateH1;

impl Rule for NoDuplicateH1 {
    fn id(&self) -> &'static str {
        "no-duplicate-h1"
    }

    fn default_severity(&self) -> Severity {
        Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let tr = config.translator();
        let config = config.global();
        let trees = Trees::new(arena, spec);
        let Some(h1s) = collect_h1s(arena, &trees, config) else {
            return vec![];
        };
        // The h1 elements are counted by tree: each tree reports its own second h1
        let mut count_of_tree: HashMap<TreeRoot, usize> = HashMap::new();
        let mut seconds = Vec::new();
        for (root, h1) in h1s {
            let count = count_of_tree.entry(root).or_default();
            *count += 1;
            if *count == 2 {
                seconds.push(h1);
            }
        }
        seconds
            .into_iter()
            .map(|second| Violation {
                spec_conformance: None,
                rule_id: self.id().to_string(),
                name: None,
                severity: config.severity,
                message: tr.finish(&tr.t(
                    "{0} is {1:c}",
                    &[
                        Kw::S(&tr.t("the \"{0*}\" {1}", &[Kw::S("h1"), Kw::S("element")])),
                        Kw::S("duplicated"),
                    ],
                )),
                line: second.base.line,
                col: second.base.col,
                raw: second.base.raw.clone(),
                reason: None,
                fix: None,
            })
            .collect()
    }
}
