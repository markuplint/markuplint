//! `require-end-tag` rule: reports missing end tags on non-void HTML elements.

use markuplint_core::mlast::{EndTagType, NamespaceURI};
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::lookup::is_void_element;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct RequireEndTag;

impl Rule for RequireEndTag {
    fn id(&self) -> &'static str {
        "require-end-tag"
    }

    /// Matches TS `createRule({ defaultSeverity: 'warning' })`.
    fn default_severity(&self) -> crate::violation::Severity {
        crate::violation::Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        let end_tag = arena.settings().end_tag;

        // A parser that writes no end tags (Pug) leaves none missing.
        if end_tag == EndTagType::Never {
            return violations;
        }

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }

            if el.is_ghost {
                continue;
            }

            if is_void_element(spec, &el.base.node_name) {
                continue;
            }

            if el.close_tag.is_some() {
                continue;
            }

            // Foreign elements (SVG/MathML) may self-close, so `<.../>` is valid, and so is every
            // element of an XML-like parser (JSX, Vue, ...).
            // Matches TS: `(document.endTag === 'xml' || el.isForeignElement) && el.tagCloseChar.startsWith('/')`.
            // `isForeignElement` is the namespace of the element as written, which a
            // pretender does not change.
            let self_closes = end_tag == EndTagType::Xml || *el.identity(true).namespace != NamespaceURI::XHTML;
            if self_closes && el.tag_close_char.starts_with('/') {
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
                reason: None,
                fix: None,
            });
        }

        violations
    }
}
