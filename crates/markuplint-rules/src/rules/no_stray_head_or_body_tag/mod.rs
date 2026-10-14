//! `no-stray-head-or-body-tag` rule: a `</head>` or `<body>` tag the parser discarded.
//!
//! Ports `packages/@markuplint/rules/src/no-stray-head-or-body-tag/`. HTML LS "in body"
//! insertion mode: a `body` start tag is a parse error, and so is an end tag that does not
//! match the current node. Once the parser has moved past `<head>`, a literal `</head>` or a
//! second `<body>` in the source is such a token. The tree builder discards it, and the text
//! node around it keeps it in its raw (see `markuplint_dom::html_builder`); an orphaned end
//! tag outside such a text is its own bogus text node. The rule looks for that residue in
//! every text node, except the content of raw text and RCDATA elements, where tag-shaped text
//! is never a tag.
//!
//! <https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody>

use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;

use crate::aria_check::is_js_whitespace;
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoStrayHeadOrBodyTag;

/// TS `RAW_TEXT_CONTAINERS`: elements whose content the tokenizer never reads as tags.
const RAW_TEXT_CONTAINERS: [&str; 5] = ["script", "style", "title", "textarea", "xmp"];

/// TS `/<\/head(?=[\s/>])/i` and `/<body(?=[\s/>])/i`: `prefix` (ASCII, matched
/// case-insensitively) followed by whitespace, `/` or `>`.
fn contains_tag(raw: &str, prefix: &str) -> bool {
    let bytes = raw.as_bytes();
    (0..bytes.len()).any(|i| {
        bytes
            .get(i..i + prefix.len())
            .is_some_and(|s| s.eq_ignore_ascii_case(prefix.as_bytes()))
            && raw[i + prefix.len()..]
                .chars()
                .next()
                .is_some_and(|c| c == '/' || c == '>' || is_js_whitespace(c))
    })
}

impl Rule for NoStrayHeadOrBodyTag {
    fn id(&self) -> &'static str {
        "no-stray-head-or-body-tag"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();
        for node_id in 0..arena.len() {
            let Some(DomNode::Text(text)) = arena.get(node_id) else {
                continue;
            };
            let in_raw_text = arena
                .parent(node_id)
                .and_then(DomNode::as_element)
                .is_some_and(|parent| RAW_TEXT_CONTAINERS.contains(&parent.base.node_name.as_str()));
            if in_raw_text {
                continue;
            }
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            for (prefix, message) in [
                ("</head", "A stray \"head\" end tag detected"),
                ("<body", "A duplicate \"body\" start tag detected"),
            ] {
                if contains_tag(&text.base.raw, prefix) {
                    violations.push(Violation {
                        rule_id: self.id().to_string(),
                        name: None,
                        severity: rule_config.severity,
                        message: message.to_string(),
                        line: text.base.line,
                        col: text.base.col,
                        raw: text.base.raw.clone(),
                        reason: rule_config.reason.clone(),
                        fix: None,
                    });
                }
            }
        }
        violations
    }
}
