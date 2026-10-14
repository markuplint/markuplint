//! `no-broken-fragment-link` rule: a hyperlink to a fragment (`href="#foo"`) refers to an
//! existing ID (or, with `fragmentRefersNameAttr`, a `name`).
//!
//! Split out of the former `no-refer-to-non-existent-id`. HTML LS does not make a broken
//! fragment a conformance error — scrolling to a missing fragment does nothing
//! (§ Scrolling to a fragment) — hence the `warning` default.

use std::collections::HashSet;

use markuplint_core::mlast::MLASTHTMLAttr;
use markuplint_dom::arena::DomArena;
use markuplint_dom::node::{DomNode, ElementData};
use markuplint_types::spec::types::MLMLSpec;
use serde_json::Value;

use crate::aria_check::{attr_name, element_local_name, html_attrs};
use crate::decode::{decode_entities, decode_href};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct NoBrokenFragmentLink;

impl Rule for NoBrokenFragmentLink {
    fn id(&self) -> &'static str {
        "no-broken-fragment-link"
    }

    /// Matches TS `createRule({ defaultSeverity: 'warning' })`.
    fn default_severity(&self) -> Severity {
        Severity::Warning
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        // A preprocessor block may generate any ID, so the document cannot be judged.
        let is_mutable = (0..arena.len()).any(|id| matches!(arena.get(id), Some(DomNode::PSBlock(_))));
        if is_mutable {
            return violations;
        }

        let (ids, has_dynamic_id) = collect_values(arena, "id");
        // A dynamic ID may be any fragment.
        if has_dynamic_id {
            return violations;
        }
        let (names, has_dynamic_name) = collect_values(arena, "name");

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let refers_name = rule_config
                .options
                .get("fragmentRefersNameAttr")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            if refers_name && has_dynamic_name {
                continue;
            }

            // TS `el.matches('a[href], area[href]')`.
            if !matches!(element_local_name(el).as_str(), "a" | "area") {
                continue;
            }
            let Some(href) = attr_node(el, "href") else {
                continue;
            };

            let Some(raw_fragment) = fragment_of(attr_value(href)) else {
                continue;
            };
            let decoded = decode_href(raw_fragment);

            // > 2. If fragment is the empty string, then return the special value top of the document.
            // >
            // > 9. If decodedFragment is an ASCII case-insensitive match for the string top, then return the top of the document.
            if decoded.is_empty() || decoded.eq_ignore_ascii_case("top") {
                continue;
            }

            if !ids.contains(&decoded) && (!refers_name || !names.contains(&decoded)) {
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: format!("Missing \"{decoded}\" ID"),
                    line: href.value.line,
                    col: href.value.col,
                    raw: href.value.raw.clone(),
                    reason: rule_config.reason.clone(),
                    fix: None,
                });
            }
        }

        violations
    }
}

/// TS `el.getAttributeNode(name)`: the first attribute of that name. Unlike
/// `getAttribute`, it compares the name as written, case-sensitively, so neither
/// `<div ID="x">` nor `<a HREF="#x">` takes part.
fn attr_node<'a>(el: &'a ElementData, name: &str) -> Option<&'a MLASTHTMLAttr> {
    html_attrs(el).find(|attr| attr_name(attr) == name)
}

/// TS `attr.value`: the value the parser resolved, otherwise the value as written
/// (character references are not decoded).
fn attr_value(attr: &MLASTHTMLAttr) -> &str {
    attr.potential_value.as_deref().unwrap_or(&attr.value.raw)
}

/// The entity-decoded values of the `attr_name` attribute of every element (TS
/// `querySelectorAll('[id]')` / `'[name]'`), and whether any of them is dynamic.
///
/// TS leaves out values whose `valueType` is `code`; only a framework's directive
/// patterns set that type, which the Rust engine does not model, so every value is
/// kept. A decoded value holding an unpaired surrogate is left out: no decoded
/// fragment can equal it (`decodeURIComponent` never yields one).
fn collect_values(arena: &DomArena, attr_name: &str) -> (HashSet<String>, bool) {
    let mut values = HashSet::new();
    let mut has_dynamic = false;
    for (_, el) in arena.elements() {
        let Some(attr) = attr_node(el, attr_name) else {
            continue;
        };
        if attr.is_dynamic_value == Some(true) {
            has_dynamic = true;
        }
        if let Some(decoded) = decode_entities(attr_value(attr)) {
            values.insert(decoded);
        }
    }
    (values, has_dynamic)
}

/// TS `href.match(/^#(.+)/)?.[1]`: what follows a leading `#`, up to the first line
/// terminator (which `.` does not match), when that is not empty.
fn fragment_of(href: &str) -> Option<&str> {
    let rest = href.strip_prefix('#')?;
    let end = rest.find(['\n', '\r', '\u{2028}', '\u{2029}']).unwrap_or(rest.len());
    (end > 0).then(|| &rest[..end])
}
