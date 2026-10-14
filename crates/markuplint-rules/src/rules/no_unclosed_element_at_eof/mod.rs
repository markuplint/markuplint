//! `no-unclosed-element-at-eof` rule: an element still open when the source ends.
//!
//! Ports `packages/@markuplint/rules/src/no-unclosed-element-at-eof/`. HTML LS "in body"
//! insertion mode, "An end-of-file token": it is a parse error if the stack of open elements
//! holds an element other than `dd`, `dt`, `li`, `optgroup`, `option`, `p`, `rb`, `rp`, `rt`,
//! `rtc`, `tbody`, `td`, `tfoot`, `th`, `thead`, `tr`, `body` or `html`. Those names all have
//! an optional end tag, so they are exempt; so are void and omitted (ghost) elements. Only an
//! element followed by nothing but whitespace after its content is the EOF case: content
//! that a sibling closes implicitly mid-document is out of scope.
//!
//! TS also skips a document whose parser never records end tags (`endTag: 'never'`, e.g. the
//! Pug parser); the HTML parser always records them.
//!
//! <https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody>

use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
use markuplint_types::spec::lookup::is_void_element_name;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::is_js_whitespace;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoUnclosedElementAtEof;

/// TS `EOF_EXEMPT_NAMES`.
const EOF_EXEMPT_NAMES: [&str; 18] = [
    "dd", "dt", "li", "optgroup", "option", "p", "rb", "rp", "rt", "rtc", "tbody", "td", "tfoot", "th", "thead", "tr",
    "body", "html",
];

/// TS `deepEndOffset()`: where the node's content ends in the source — the end of its end
/// tag, or else of its last child, or else of its own start tag (or raw).
fn deep_end_offset(arena: &DomArena, node_id: NodeId) -> usize {
    let Some(node) = arena.get(node_id) else {
        return 0;
    };
    if let DomNode::Element(el) = node
        && let Some(close_tag) = &el.close_tag
    {
        return close_tag.offset + close_tag.raw.len();
    }
    if let Some(&last) = node.children().last() {
        return deep_end_offset(arena, last);
    }
    node.base().map_or(0, |base| base.offset + base.raw.len())
}

impl Rule for NoUnclosedElementAtEof {
    fn id(&self) -> &'static str {
        "no-unclosed-element-at-eof"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let Some(source) = arena.source().or_else(|| match arena.document() {
            Some(DomNode::Document(doc)) => Some(doc.raw.as_str()),
            _ => None,
        }) else {
            return vec![];
        };

        arena
            .elements()
            .filter(|(node_id, el)| {
                let name = el.base.node_name.as_str();
                !el.is_ghost
                    && !is_void_element_name(name)
                    && el.close_tag.is_none()
                    && !EOF_EXEMPT_NAMES.contains(&name)
                    && source
                        .get(deep_end_offset(arena, *node_id)..)
                        .is_some_and(|rest| rest.trim_matches(is_js_whitespace).is_empty())
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
                        "The \"{}\" element is not closed at the end of the file",
                        el.base.node_name
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
