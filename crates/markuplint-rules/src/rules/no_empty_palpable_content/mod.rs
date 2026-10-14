//! `no-empty-palpable-content` rule: palpable content elements should not be empty.
//!
//! Palpability is decided as TS `isPalpableElement()` does: the `#palpable` entries of the
//! spec are evaluated as selectors (an entry may carry a condition, as in `audio[controls]`,
//! or a trailing space, as in `sup `), together with the exposable elements when
//! `extendsExposableElements` is on. `#SVGRenderable` is left out, as the TS rule passes
//! `extendsSvg: false`.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_selector::ast::SelectorList;
use markuplint_selector::{matcher, parser};
use markuplint_types::spec::lookup::{get_content_model_tags, is_nothing_content_model_name};
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct NoEmptyPalpableContent;

/// Elements allowed to be empty: `textarea` and `output` are filled by user interaction, and
/// the rest are palpable by themselves, so their content is not what makes them so.
const ALLOWED_ELEMENTS: &[&str] = &["textarea", "output", "audio", "canvas", "video", "img"];

/// Elements that are not palpable content but are exposed to the accessibility tree.
///
/// Copy of `exposableElementsThatAreNoBelongingAModel` in `@markuplint/ml-spec`
/// (`algorithm/html/is-palpable-elements.ts`), which is not spec data and so cannot be read
/// from the spec; the test `v6_no_empty_palpable_content_013` fails when the two diverge.
const EXPOSABLE_ELEMENTS: &[&str] = &[
    "body",
    "dd",
    "dt",
    "figcaption",
    "html",
    "legend",
    "li",
    "optgroup",
    "option",
    "rp",
    "rt",
    "summary",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
];

/// TS `Text.isWhitespace()` (`/^\s+$/`). Not `str::trim`: a JS `\s` matches U+FEFF and not
/// U+0085, and Rust's `White_Space` is the other way round.
fn is_whitespace(text: &str) -> bool {
    !text.is_empty()
        && text
            .chars()
            .all(|c| (c.is_whitespace() && c != '\u{85}') || c == '\u{feff}')
}

impl Rule for NoEmptyPalpableContent {
    fn id(&self) -> &'static str {
        "no-empty-palpable-content"
    }

    /// Matches TS `createRule({ defaultSeverity: 'warning' })`.
    fn default_severity(&self) -> crate::violation::Severity {
        crate::violation::Severity::Warning
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let global = config.global();
        let ignore_if_aria_busy = global
            .options
            .get("ignoreIfAriaBusy")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true);

        let extends_exposable = global
            .options
            .get("extendsExposableElements")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true);

        // One entry at a time, so that an entry this parser rejects drops out alone instead of
        // silencing the rule; `v6_no_empty_palpable_content_014` keeps the spec's entries parseable.
        let exposable: &[&str] = if extends_exposable { EXPOSABLE_ELEMENTS } else { &[] };
        let palpable = SelectorList {
            selectors: get_content_model_tags(spec, "#palpable")
                .unwrap_or_default()
                .iter()
                .map(String::as_str)
                .chain(exposable.iter().copied())
                .filter_map(|entry| parser::parse(entry).ok())
                .flat_map(|list| list.selectors)
                .collect(),
        };

        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if ALLOWED_ELEMENTS.contains(&el.base.node_name.as_str()) {
                continue;
            }

            if !matcher::matches(&palpable, arena, node_id, None, Some(spec), None) {
                continue;
            }

            if is_nothing_content_model_name(&el.base.node_name) {
                continue;
            }

            if ignore_if_aria_busy {
                let has_aria_busy = el.attributes.iter().any(|attr| {
                    if let MLASTAttr::HTMLAttr(html_attr) = attr {
                        html_attr.node_name.eq_ignore_ascii_case("aria-busy") && html_attr.value.raw == "true"
                    } else {
                        false
                    }
                });
                if has_aria_busy {
                    continue;
                }
            }

            // Direct children only, as TS `childNodes` sees them (a fragment block such as a JSX
            // `{i.name}` is transparent); anything but whitespace text (a comment included) is content.
            let is_empty = arena
                .child_nodes(node_id)
                .iter()
                .all(|&child| matches!(arena.get(child), Some(DomNode::Text(t)) if is_whitespace(&t.base.raw)));

            if is_empty {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: "The element should not empty".to_string(),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                    reason: None,
                    fix: None,
                });
            }
        }

        violations
    }
}

#[cfg(test)]
mod tests;
