//! `doctype` rule: requires DOCTYPE in non-fragment documents.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct Doctype;

impl Rule for Doctype {
    fn id(&self) -> &'static str {
        "doctype"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let config = config.global();
        let is_fragment = match arena.document() {
            Some(DomNode::Document(doc)) => doc.is_fragment,
            _ => return vec![],
        };
        if is_fragment {
            return vec![];
        }

        let value = config.value.as_str().unwrap_or("always");

        if value != "always" {
            return vec![];
        }

        let deny_obsolete = config
            .options
            .get("denyObsoleteType")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true);

        let mut violations = Vec::new();
        let mut found_doctype = false;

        for i in 0..arena.len() {
            if let Some(DomNode::Doctype(dt)) = arena.get(i) {
                found_doctype = true;

                if deny_obsolete && (!dt.public_id.is_empty() || !dt.system_id.is_empty()) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: config.severity,
                        message: "Never declare obsolete doctype".to_string(),
                        line: dt.base.line,
                        col: dt.base.col,
                        raw: dt.base.raw.clone(),
                        reason: None,
                    });
                }
            }
        }

        if !found_doctype {
            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: config.severity,
                message: "Require doctype".to_string(),
                line: 1,
                col: 1,
                raw: String::new(),
                reason: None,
            });
        }

        violations
    }
}
