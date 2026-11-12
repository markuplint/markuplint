//! `valid-importmap` rule: the body of `<script type="importmap">` is a valid import map.
//!
//! @see <https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string>

use std::collections::HashSet;

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;
use markuplint_types::whatwg::abs_url::is_abs_url;

use markuplint_core::i18n::Translator;

use crate::create_message::Kw;
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
        let tr = config.translator();
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
                    spec_conformance: None,
                    rule_id: self.id().to_string(),
                    name: None,
                    severity: rule_config.severity,
                    message: tr.finish(&message),
                    line: el.base.line,
                    col: el.base.col,
                    raw: el.base.raw.clone(),
                    reason: rule_config.reason.clone(),
                    fix: None,
                });
            };

            match body {
                ScriptJson::Empty => report(tr.t("{0} must contain a JSON object", &[Kw::S("Import map")])),
                ScriptJson::Invalid => report(tr.t("{0} must be valid JSON", &[Kw::S("Import map")])),
                ScriptJson::NotObject => report(tr.t("{0} must be a JSON object", &[Kw::S("Import map")])),
                ScriptJson::Object(parsed) => verify_import_map(tr, &parsed, &mut report),
            }
        }

        violations
    }
}

fn verify_import_map(tr: Translator<'_>, parsed: &JsonObject, report: &mut impl FnMut(String)) {
    for key in parsed.keys() {
        if !ALLOWED_TOP_LEVEL_KEYS.contains(&key) {
            report(tr.t(
                "{0} is {1:c}",
                &[
                    Kw::S(&tr.t("the import map top-level key \"{0*}\"", &[Kw::S(key)])),
                    Kw::S("not allowed (use \"imports\", \"scopes\", or \"integrity\")"),
                ],
            ));
        }
    }

    let not_object = |key: &str| {
        tr.t(
            "{0} must be {1}",
            &[
                Kw::S(&tr.t("the \"{0*}\" top-level key of an import map", &[Kw::S(key)])),
                Kw::S("a JSON object"),
            ],
        )
    };

    if let Some(imports) = parsed.get("imports") {
        match imports {
            JsonValue::Object(map) => validate_specifier_map(tr, map, "imports", report),
            _ => report(not_object("imports")),
        }
    }

    if let Some(scopes) = parsed.get("scopes") {
        match scopes {
            JsonValue::Object(scopes) => {
                for (scope_key, scope_value) in scopes.iter() {
                    match scope_value {
                        JsonValue::Object(map) => {
                            validate_specifier_map(tr, map, &format!("scopes[\"{scope_key}\"]"), report);
                        }
                        _ => report(tr.t(
                            "{0} must be {1}",
                            &[
                                Kw::S(&tr.t("the value of the scope \"{0*}\"", &[Kw::S(scope_key)])),
                                Kw::S("a JSON object"),
                            ],
                        )),
                    }
                }
            }
            _ => report(not_object("scopes")),
        }
    }

    if let Some(integrity) = parsed.get("integrity") {
        match integrity {
            JsonValue::Object(map) => validate_integrity_map(tr, map, report),
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
fn validate_integrity_map(tr: Translator<'_>, map: &JsonObject, report: &mut impl FnMut(String)) {
    for (key, value) in map.iter() {
        if !resolves_as_url_like_specifier(key) {
            report(tr.t(
                "{0} must be {1}",
                &[
                    Kw::S(&tr.t("the integrity key \"{0*}\"", &[Kw::S(key)])),
                    Kw::S(URL_LIKE),
                ],
            ));
            continue;
        }
        if !matches!(value, JsonValue::String(_)) {
            report(tr.t(
                "{0} must be {1}",
                &[
                    Kw::S(&tr.t("the value of \"{0*}\" in \"integrity\"", &[Kw::S(key)])),
                    Kw::S("a string"),
                ],
            ));
        }
    }
}

fn validate_specifier_map(tr: Translator<'_>, map: &JsonObject, map_label: &str, report: &mut impl FnMut(String)) {
    for (key, value) in map.iter() {
        if key.is_empty() {
            report(tr.t(
                "{0} must not be {1}",
                &[
                    Kw::S(&tr.t("the specifier key in \"{0*}\"", &[Kw::S(map_label)])),
                    Kw::S("empty"),
                ],
            ));
            continue;
        }
        let JsonValue::String(value) = value else {
            report(tr.t(
                "{0} must be {1}",
                &[
                    Kw::S(&tr.t("the value of \"{0*}\" in \"{1*}\"", &[Kw::S(key), Kw::S(map_label)])),
                    Kw::S("a string"),
                ],
            ));
            continue;
        };
        if !resolves_as_url_like_specifier(value) {
            report(tr.t(
                "{0} must be {1}",
                &[
                    Kw::S(&tr.t(
                        "the address \"{0*}\" of \"{1*}\" in \"{2*}\"",
                        &[Kw::S(value), Kw::S(key), Kw::S(map_label)],
                    )),
                    Kw::S(URL_LIKE),
                ],
            ));
            continue;
        }
        if key.ends_with('/') && !value.ends_with('/') {
            report(tr.t(
                "{0} ends with \"/\" so {1} must end with \"/\" as well",
                &[
                    Kw::S(&tr.t(
                        "the specifier key \"{0*}\" in \"{1*}\"",
                        &[Kw::S(key), Kw::S(map_label)],
                    )),
                    Kw::S(&tr.t("the address \"{0*}\"", &[Kw::S(value)])),
                ],
            ));
        }
    }
}
