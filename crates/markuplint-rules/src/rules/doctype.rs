//! `doctype` rule: requires DOCTYPE in non-fragment documents.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `doctype` rule.
pub struct Doctype;

impl Rule for Doctype {
    fn id(&self) -> &'static str {
        "doctype"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let config = config.global();
        // Skip fragments
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
            });
        }

        violations
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::violation::Severity;
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DoctypeData, DocumentData, DomNode, NodeBase};
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    fn make_doc_with_doctype(is_fragment: bool, doctype: Option<(&str, &str, &str)>) -> DomArena {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment,
            unknown_parse_error: None,
            children: vec![],
        }));

        let mut children = Vec::new();
        if let Some((name, public_id, system_id)) = doctype {
            let dt_id = builder.push(DomNode::Doctype(DoctypeData {
                base: NodeBase {
                    id: 0,
                    uuid: "dt".to_string(),
                    raw: "<!DOCTYPE html>".to_string(),
                    offset: 0,
                    line: 1,
                    col: 1,
                    node_name: "DOCTYPE".to_string(),
                    parent: Some(doc_id),
                    children: vec![],
                    next_sibling: None,
                    prev_sibling: None,
                    depth: 1,
                },
                name: name.to_string(),
                public_id: public_id.to_string(),
                system_id: system_id.to_string(),
            }));
            if let Some(DomNode::Doctype(d)) = builder.get_mut(dt_id) {
                d.base.id = dt_id;
            }
            children.push(dt_id);
        }

        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = children;
        }
        builder.finish()
    }

    #[test]
    fn non_fragment_with_doctype_no_violation() {
        let arena = make_doc_with_doctype(false, Some(("html", "", "")));
        let s = spec();
        let rule = Doctype;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn non_fragment_without_doctype() {
        let arena = make_doc_with_doctype(false, None);
        let s = spec();
        let rule = Doctype;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Require doctype");
    }

    #[test]
    fn fragment_skipped() {
        let arena = make_doc_with_doctype(true, None);
        let s = spec();
        let rule = Doctype;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn obsolete_doctype_denied() {
        let arena = make_doc_with_doctype(
            false,
            Some((
                "html",
                "-//W3C//DTD HTML 4.01//EN",
                "http://www.w3.org/TR/html4/strict.dtd",
            )),
        );
        let s = spec();
        let rule = Doctype;
        let config = RuleConfig {
            severity: Severity::Error,
            value: serde_json::json!("always"),
            options: serde_json::json!({ "denyObsoleteType": true }),
            disabled: false,
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Never declare obsolete doctype");
    }

    #[test]
    fn obsolete_doctype_denied_by_default() {
        // denyObsoleteType defaults to true, so obsolete doctype should be denied without explicit config
        let arena = make_doc_with_doctype(
            false,
            Some((
                "html",
                "-//W3C//DTD HTML 4.01//EN",
                "http://www.w3.org/TR/html4/strict.dtd",
            )),
        );
        let s = spec();
        let rule = Doctype;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Never declare obsolete doctype");
    }

    #[test]
    fn obsolete_doctype_allowed_when_false() {
        // denyObsoleteType=false should NOT deny obsolete doctype
        let arena = make_doc_with_doctype(
            false,
            Some((
                "html",
                "-//W3C//DTD HTML 4.01//EN",
                "http://www.w3.org/TR/html4/strict.dtd",
            )),
        );
        let s = spec();
        let rule = Doctype;
        let config = RuleConfig {
            options: serde_json::json!({ "denyObsoleteType": false }),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(
            violations.is_empty(),
            "denyObsoleteType=false should allow obsolete doctype, got: {violations:?}"
        );
    }

    #[test]
    fn config_value_not_always_skips_check() {
        // Non-fragment document without doctype, but value="never" → early return, no violations
        let arena = make_doc_with_doctype(false, None);
        let s = spec();
        let rule = Doctype;
        let config = RuleConfig {
            value: serde_json::json!("never"),
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert!(violations.is_empty());
    }
}
