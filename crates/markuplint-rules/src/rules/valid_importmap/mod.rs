//! `valid-importmap` rule: the body of `<script type="importmap">` is a valid import map.
//!
//! @see <https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string>

use std::collections::HashSet;

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;
use markuplint_types::whatwg::abs_url::is_abs_url;

use crate::inline_script::{ScriptJson, script_json};
use crate::js::{JsonObject, JsonValue};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct ValidImportmap;

/// Per HTML LS § Parse an import map string, only `imports`, `scopes`, and `integrity`
/// are recognised top-level keys; other keys trigger a warning there, so they are
/// reported as dead configuration.
///
/// When HTML LS adds a top-level key, update this list, the "not allowed" message
/// below, and the TS rule (the reference implementation) with its README table.
const ALLOWED_TOP_LEVEL_KEYS: &[&str] = &["imports", "scopes", "integrity"];

const URL_LIKE: &str = "a URL-like specifier (starts with \"/\", \"./\", \"../\", or is an absolute URL)";

impl Rule for ValidImportmap {
    fn id(&self) -> &'static str {
        "valid-importmap"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let Some(body) = script_json(arena, node_id, el, "importmap") else {
                continue;
            };

            // Every report is at the element, so TS's de-duplication of reports (by
            // position, message and raw) comes down to one per message.
            let mut reported = HashSet::new();
            let mut report = |message: String| {
                if !reported.insert(message.clone()) {
                    return;
                }
                violations.push(Violation {
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message,
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                    reason: rule_config.reason.clone(),
                });
            };

            match body {
                ScriptJson::Empty => report("Import map must contain a JSON object".to_owned()),
                ScriptJson::Invalid => report("Import map must be valid JSON".to_owned()),
                ScriptJson::NotObject => report("Import map must be a JSON object".to_owned()),
                ScriptJson::Object(parsed) => verify_import_map(&parsed, &mut report),
            }
        }

        violations
    }
}

fn verify_import_map(parsed: &JsonObject, report: &mut impl FnMut(String)) {
    for key in parsed.keys() {
        if !ALLOWED_TOP_LEVEL_KEYS.contains(&key) {
            report(format!(
                "The import map top-level key \"{key}\" is not allowed (use \"imports\", \"scopes\", or \"integrity\")"
            ));
        }
    }

    let not_object = |key: &str| format!("The \"{key}\" top-level key of an import map must be a JSON object");

    if let Some(imports) = parsed.get("imports") {
        match imports {
            JsonValue::Object(map) => validate_specifier_map(map, "imports", report),
            _ => report(not_object("imports")),
        }
    }

    if let Some(scopes) = parsed.get("scopes") {
        match scopes {
            JsonValue::Object(scopes) => {
                for (scope_key, scope_value) in scopes.iter() {
                    match scope_value {
                        JsonValue::Object(map) => {
                            validate_specifier_map(map, &format!("scopes[\"{scope_key}\"]"), report);
                        }
                        _ => report(format!("The value of the scope \"{scope_key}\" must be a JSON object")),
                    }
                }
            }
            _ => report(not_object("scopes")),
        }
    }

    if let Some(integrity) = parsed.get("integrity") {
        match integrity {
            JsonValue::Object(map) => validate_integrity_map(map, report),
            _ => report(not_object("integrity")),
        }
    }
}

/// Resolves a URL-like module specifier per HTML LS: it starts with `/`, `./` or `../`
/// (resolvable against a base URL) or parses as an absolute URL on its own (TS
/// `new URL(specifier)` succeeding).
///
/// @see <https://html.spec.whatwg.org/multipage/webappapis.html#resolving-a-url-like-module-specifier>
fn resolves_as_url_like_specifier(specifier: &str) -> bool {
    specifier.starts_with('/') || specifier.starts_with("./") || specifier.starts_with("../") || is_abs_url(specifier)
}

/// Per HTML LS § normalizing a module integrity map, each key is resolved as a URL-like
/// module specifier and each value must be a string. Unlike specifier maps there is no
/// trailing-slash invariant: the values are SRI hashes, not URLs.
///
/// @see <https://html.spec.whatwg.org/multipage/webappapis.html#normalizing-a-module-integrity-map>
fn validate_integrity_map(map: &JsonObject, report: &mut impl FnMut(String)) {
    for (key, value) in map.iter() {
        if !resolves_as_url_like_specifier(key) {
            report(format!("The integrity key \"{key}\" must be {URL_LIKE}"));
            continue;
        }
        if !matches!(value, JsonValue::String(_)) {
            report(format!("The value of \"{key}\" in \"integrity\" must be a string"));
        }
    }
}

fn validate_specifier_map(map: &JsonObject, map_label: &str, report: &mut impl FnMut(String)) {
    for (key, value) in map.iter() {
        if key.is_empty() {
            report(format!("The specifier key in \"{map_label}\" must not be empty"));
            continue;
        }
        let JsonValue::String(value) = value else {
            report(format!("The value of \"{key}\" in \"{map_label}\" must be a string"));
            continue;
        };
        if !resolves_as_url_like_specifier(value) {
            report(format!(
                "The address \"{value}\" of \"{key}\" in \"{map_label}\" must be {URL_LIKE}"
            ));
            continue;
        }
        if key.ends_with('/') && !value.ends_with('/') {
            report(format!(
                "The specifier key \"{key}\" in \"{map_label}\" ends with \"/\" so the address \"{value}\" must end with \"/\" as well"
            ));
        }
    }
}
