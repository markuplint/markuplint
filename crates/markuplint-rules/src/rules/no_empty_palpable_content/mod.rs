//! `no-empty-palpable-content` rule: palpable content elements should not be empty.
//!
//! Known difference from TS: TS decides palpability with `el.matches()` over the `#palpable`
//! selectors (an entry may carry a condition, as in `audio[controls]`) and its own list of
//! exposable elements. [`is_palpable_element`] matches the tag name only, dropping the
//! condition, and the exposable list here differs from TS's (it lacks `body`, `figcaption`,
//! `legend`, `option`, `summary`, … and has `caption`), so the two can disagree on which elements are palpable.

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::node::DomNode;
use markuplint_types::spec::lookup::{is_nothing_content_model_name, is_palpable_element};
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

pub struct NoEmptyPalpableContent;

/// Elements allowed to be empty: `textarea` and `output` are filled by user interaction, and
/// the rest are palpable by themselves, so their content is not what makes them so.
const ALLOWED_ELEMENTS: &[&str] = &["textarea", "output", "audio", "canvas", "video", "img"];

/// Elements that are not palpable content but are exposed to the accessibility tree.
const EXPOSABLE_ELEMENTS: &[&str] = &["li", "dt", "dd", "th", "td", "tr", "thead", "tbody", "tfoot", "caption"];

fn is_exposable_element(name: &str) -> bool {
    EXPOSABLE_ELEMENTS.iter().any(|e| e.eq_ignore_ascii_case(name))
}

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

        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if ALLOWED_ELEMENTS.contains(&el.base.node_name.as_str()) {
                continue;
            }

            let is_palpable = is_palpable_element(spec, &el.base.node_name);
            let is_exposable = extends_exposable && is_exposable_element(&el.base.node_name);
            if !is_palpable && !is_exposable {
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

            // Direct children only; anything but whitespace text (a comment included) is content.
            let is_empty = arena
                .children_of(node_id)
                .unwrap_or_default()
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
