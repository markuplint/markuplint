//! `no-obsolete-doctype` rule: the DOCTYPE must not carry an obsolete public or
//! system identifier.
//!
//! The other half of the former `doctype` rule; a missing DOCTYPE is
//! `require-doctype`'s concern. Like TS `document.doctype`, only the first DOCTYPE
//! in the document is examined.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

/// HTML LS §13.1.1 (the DOCTYPE): `<!DOCTYPE html SYSTEM "about:legacy-compat">` is
/// the one conforming DOCTYPE with a legacy string, kept for old parsers that
/// require a system identifier.
const LEGACY_COMPAT_SYSTEM_ID: &str = "about:legacy-compat";

pub struct NoObsoleteDoctype;

impl Rule for NoObsoleteDoctype {
    fn id(&self) -> &'static str {
        "no-obsolete-doctype"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let config = config.global();
        match arena.document() {
            Some(DomNode::Document(doc)) if !doc.is_fragment => {}
            _ => return vec![],
        }

        let Some(dt) = (0..arena.len()).find_map(|i| match arena.get(i) {
            Some(DomNode::Doctype(dt)) => Some(dt),
            _ => None,
        }) else {
            return vec![];
        };

        if dt.public_id.is_empty() && dt.system_id == LEGACY_COMPAT_SYSTEM_ID {
            return vec![];
        }

        let obsolete = (dt.name.eq_ignore_ascii_case("html") && !dt.public_id.is_empty()) || !dt.system_id.is_empty();
        if !obsolete {
            return vec![];
        }

        vec![Violation {
            rule_id: self.id().to_string(),
            name: None,
            severity: config.severity,
            message: "Never declare obsolete doctype".to_string(),
            line: dt.base.line,
            col: dt.base.col,
            raw: dt.base.raw.clone(),
            reason: None,
        }]
    }
}
