//! `require-doctype` rule: a non-fragment document must declare a DOCTYPE.
//!
//! The other half of the former `doctype` rule (the obsolete-identifier check) is
//! `no-obsolete-doctype`. An obsolete DOCTYPE still counts as present here. The
//! rule's only value is `"always"`, so the value is not read.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct RequireDoctype;

impl Rule for RequireDoctype {
    fn id(&self) -> &'static str {
        "require-doctype"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let config = config.global();
        match arena.document() {
            Some(DomNode::Document(doc)) if !doc.is_fragment => {}
            _ => return vec![],
        }

        let has_doctype = (0..arena.len()).any(|i| matches!(arena.get(i), Some(DomNode::Doctype(_))));
        if has_doctype {
            return vec![];
        }

        vec![Violation {
            rule_id: self.id().to_string(),
            name: None,
            severity: config.severity,
            message: "Require doctype".to_string(),
            line: 1,
            col: 1,
            raw: String::new(),
            reason: None,
            fix: None,
        }]
    }
}
