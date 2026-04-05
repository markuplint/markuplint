//! `no-orphaned-end-tag` rule: reports orphaned end tags with no matching start tag.

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

/// The `no-orphaned-end-tag` rule.
pub struct NoOrphanedEndTag;

impl Rule for NoOrphanedEndTag {
    fn id(&self) -> &'static str {
        "no-orphaned-end-tag"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let config = config.global();
        let mut violations = Vec::new();

        for i in 0..arena.len() {
            // Check bogus text nodes (orphaned end tags from HTML parser path)
            // Matches TS behavior: walkOn('Text', text => { if (text.isBogus) ... })
            if let Some(DomNode::Text(text)) = arena.get(i)
                && text.is_bogus
            {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: config.severity,
                    message: "Orphaned end tag detected".to_string(),
                    line: text.base.line,
                    col: text.base.col,
                    raw: text.base.raw.clone(),
                    reason: None,
                });
            }
            // Also check EndTag nodes (from MLAST JSON path)
            if let Some(DomNode::EndTag(end_tag)) = arena.get(i) {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: config.severity,
                    message: "Orphaned end tag detected".to_string(),
                    line: end_tag.base.line,
                    col: end_tag.base.col,
                    raw: end_tag.base.raw.clone(),
                    reason: None,
                });
            }
        }

        violations
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::rules::attr_duplication::tests::make_element_with_attrs;
    use crate::violation::Severity;
    use markuplint_dom::arena::DomArenaBuilder;
    use markuplint_dom::node::{DocumentData, EndTagData, NodeBase};
    use markuplint_types::spec::load_spec;

    fn spec() -> markuplint_types::spec::types::MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn no_orphaned_end_tags() {
        let arena = make_element_with_attrs("div", &[("class", "a")]);
        let s = spec();
        let rule = NoOrphanedEndTag;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn orphaned_end_tag_detected() {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let end_id = builder.push(DomNode::EndTag(EndTagData {
            base: NodeBase {
                id: 0,
                uuid: "end-1".to_string(),
                raw: "</div>".to_string(),
                offset: 0,
                line: 1,
                col: 1,
                node_name: "div".to_string(),
                parent: Some(doc_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
        }));
        if let Some(DomNode::EndTag(e)) = builder.get_mut(end_id) {
            e.base.id = end_id;
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![end_id];
        }
        let arena = builder.finish();
        let s = spec();
        let rule = NoOrphanedEndTag;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].message, "Orphaned end tag detected");
    }

    #[test]
    fn severity_from_config() {
        let mut builder = DomArenaBuilder::new();
        let doc_id = builder.push(DomNode::Document(DocumentData {
            id: 0,
            raw: String::new(),
            is_fragment: true,
            unknown_parse_error: None,
            children: vec![],
        }));
        let end_id = builder.push(DomNode::EndTag(EndTagData {
            base: NodeBase {
                id: 0,
                uuid: "end-2".to_string(),
                raw: "</span>".to_string(),
                offset: 0,
                line: 2,
                col: 5,
                node_name: "span".to_string(),
                parent: Some(doc_id),
                children: vec![],
                next_sibling: None,
                prev_sibling: None,
                depth: 1,
            },
        }));
        if let Some(DomNode::EndTag(e)) = builder.get_mut(end_id) {
            e.base.id = end_id;
        }
        if let Some(DomNode::Document(d)) = builder.get_mut(doc_id) {
            d.children = vec![end_id];
        }
        let arena = builder.finish();
        let s = spec();
        let rule = NoOrphanedEndTag;
        let config = RuleConfig {
            severity: Severity::Warning,
            ..Default::default()
        };
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(config));
        assert_eq!(violations[0].severity, Severity::Warning);
    }
}
