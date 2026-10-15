//! `meta-charset-position` rule: the character encoding declaration starts within the first
//! 1024 bytes of the document.
//!
//! Ports `packages/@markuplint/rules/src/meta-charset-position/`. HTML LS §4.2.5.4: "The
//! element containing the character encoding declaration must be serialized completely within
//! the first 1024 bytes of the document." The limit is a byte count: TS measures the UTF-8
//! length of the source before the element (`Buffer.byteLength`), which is the element's byte
//! offset here. As in TS, the start of the element is what is checked.
//!
//! <https://html.spec.whatwg.org/multipage/semantics.html#charset>

use markuplint_dom::arena::DomArena;
use markuplint_selector::{matcher, parser};
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct MetaCharsetPosition;

const BYTE_LIMIT: usize = 1024;

/// TS `document.querySelectorAll(...)`: the elements that declare the character encoding.
const DECLARATIONS: &str = r#"meta[charset], meta[http-equiv="content-type" i]"#;

impl Rule for MetaCharsetPosition {
    fn id(&self) -> &'static str {
        "meta-charset-position"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let selector = parser::parse(DECLARATIONS).expect("a valid built-in selector");
        arena
            .elements()
            .filter(|&(node_id, el)| {
                el.base.offset >= BYTE_LIMIT && matcher::matches(&selector, arena, node_id, None, Some(spec), None)
            })
            .filter_map(|(node_id, el)| {
                let rule_config = config.get(node_id);
                if rule_config.disabled {
                    return None;
                }
                Some(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: format!(
                        "The character encoding declaration must be within the first {BYTE_LIMIT} bytes of the document"
                    ),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                    reason: rule_config.reason.clone(),
                    fix: None,
                })
            })
            .collect()
    }
}
