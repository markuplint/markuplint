//! `require-h1` rule: report a document that has no `<h1>` element.
//!
//! Ports `packages/@markuplint/rules/src/require-h1/`, the missing-`<h1>` half of the former
//! `required-h1` rule. TS reports at 1:1 with `raw` set to the first character of the first
//! node's raw text (`nodeList[0].raw.slice(0, 1)`), so a document that begins with a newline
//! reports `"\n"`, not `<`. Based on WCAG Technique H42, which is non-normative, so the default
//! severity is `warning`.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::h1_check::collect_h1s;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct RequireH1;

impl Rule for RequireH1 {
    fn id(&self) -> &'static str {
        "require-h1"
    }

    fn default_severity(&self) -> Severity {
        Severity::Warning
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let config = config.global();
        let Some(h1s) = collect_h1s(arena, config) else {
            return vec![];
        };
        if !h1s.is_empty() {
            return vec![];
        }
        // TS `nodeList` covers the source from offset 0, so `nodeList[0].raw` starts with the
        // source's first character. Reading it from the document's raw text keeps whitespace
        // that the WHATWG tree builder drops before `<html>`.
        let raw = match arena.document() {
            Some(DomNode::Document(doc)) => doc.raw.chars().next().map(String::from).unwrap_or_default(),
            _ => String::new(),
        };
        vec![Violation {
            rule_id: self.id().to_string(),
            name: None,
            severity: config.severity,
            message: "Require the \"h1\" element".to_string(),
            line: 1,
            col: 1,
            raw,
            reason: None,
        }]
    }
}
