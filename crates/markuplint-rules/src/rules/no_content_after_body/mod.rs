//! `no-content-after-body` rule: no element or non-whitespace text after `</body>`.
//!
//! Ports `packages/@markuplint/rules/src/no-content-after-body/`. HTML LS "after body"
//! insertion mode: anything but whitespace, a comment or EOF is a parse error, after which the
//! token is reprocessed "in body" — so the offending content ends up inside `<body>` in the
//! tree although it follows `</body>` in the source. The rule therefore reports the direct
//! children of the first `<body>` that start at or after the end of its end tag. A `<body>`
//! without an end tag is never checked.
//!
//! <https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-afterbody>

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::is_js_whitespace;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoContentAfterBody;

impl Rule for NoContentAfterBody {
    fn id(&self) -> &'static str {
        "no-content-after-body"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        // TS `document.querySelector('body')`: the first `<body>` in document order.
        let Some((body_id, body)) = arena
            .elements()
            .find(|(_, el)| el.base.node_name.eq_ignore_ascii_case("body"))
        else {
            return vec![];
        };
        let Some(close_tag) = &body.close_tag else {
            return vec![];
        };
        let body_close_end = close_tag.offset + close_tag.raw.len();

        arena
            .children_of(body_id)
            .unwrap_or_default()
            .iter()
            .filter_map(|&child_id| {
                let node = arena.get(child_id)?;
                let base = match node {
                    DomNode::Element(el) => &el.base,
                    DomNode::Text(text) if !text.base.raw.trim_matches(is_js_whitespace).is_empty() => &text.base,
                    _ => return None,
                };
                if base.offset < body_close_end {
                    return None;
                }
                let rule_config = config.get(child_id);
                if rule_config.disabled {
                    return None;
                }
                Some(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: "Content after the end tag of the \"body\" element is not allowed".to_string(),
                    line: base.line,
                    col: base.col,
                    raw: base.raw.clone(),
                    reason: rule_config.reason.clone(),
                    fix: None,
                })
            })
            .collect()
    }
}
