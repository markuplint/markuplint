//! `end-tag` rule: reports missing end tags on non-void HTML elements.

use markuplint_core::mlast::NamespaceURI;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::lookup::is_void_element;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

/// The `end-tag` rule.
pub struct EndTag;

impl Rule for EndTag {
    fn id(&self) -> &'static str {
        "end-tag"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }

            // Skip ghost (omitted) elements
            if el.is_ghost {
                continue;
            }

            // Skip void elements
            if is_void_element(spec, &el.base.node_name) {
                continue;
            }

            // Has a close tag → OK
            if el.close_tag.is_some() {
                continue;
            }

            // Foreign elements (SVG/MathML) with self-closing syntax are OK
            // (matches TS: el.isForeignElement && el.tagCloseChar.startsWith('/'))
            if el.namespace != NamespaceURI::XHTML && el.tag_close_char.starts_with('/') {
                continue;
            }

            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message: "Missing the end tag".to_string(),
                line: el.base.line,
                col: el.base.col,
                raw: el.base.raw.clone(),
            });
        }

        violations
    }
}
