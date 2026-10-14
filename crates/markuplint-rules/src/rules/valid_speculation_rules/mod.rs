//! `valid-speculation-rules` rule: the body of `<script type="speculationrules">` is a
//! valid speculation rule set.
//!
//! Speculation Rules is part of HTML LS (§7.6 Speculation rules; "parse a speculation
//! rule" is §7.6.1.2). The rule also mirrors nu-validator's strictness (unknown keys,
//! empty `urls`, exactly one `where` predicate) so the two agree on the conformance
//! corpus. When the spec changes, update the key lists below, the messages, and the TS
//! rule (the reference implementation) with its README tables.
//!
//! @see <https://html.spec.whatwg.org/multipage/speculative-loading.html>

use std::collections::HashSet;

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::inline_script::{ScriptJson, script_json};
use crate::js::{JsonObject, JsonValue, to_locale_string_en};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct ValidSpeculationRules;

const SR_TOP_LEVEL_KEYS: &[&str] = &["tag", "prefetch", "prerender"];

/// HTML LS § 7.6.1.2 rejects a rule with an unknown key (it becomes null), so reporting
/// one is conformant. The full key set is accepted so that rules using fields beyond
/// `source`/`urls`/`where` are not flagged; the values of the extra fields are not
/// validated.
const SR_RULE_KEYS: &[&str] = &[
    "source",
    "urls",
    "where",
    "relative_to",
    "eagerness",
    "referrer_policy",
    "tag",
    "requires",
    "expects_no_vary_search",
    "target_hint",
];
const SR_SOURCES: &[&str] = &["list", "document"];
const SR_EAGERNESS: &[&str] = &["immediate", "eager", "moderate", "conservative"];
const SR_PREDICATE_KEYS: &[&str] = &["and", "or", "not", "href_matches", "selector_matches"];

impl Rule for ValidSpeculationRules {
    fn id(&self) -> &'static str {
        "valid-speculation-rules"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            let Some(body) = script_json(arena, node_id, el, "speculationrules") else {
                continue;
            };

            // Every report is at the element, so TS's de-duplication of reports (by
            // position, message and raw) comes down to one per message.
            let mut reported = HashSet::new();
            let mut report = |message: String| {
                let message = capitalize(message);
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
                    fix: None,
                });
            };

            match body {
                ScriptJson::Empty => report("Speculation rules must contain a JSON object".to_owned()),
                ScriptJson::Invalid => report("Speculation rules must be valid JSON".to_owned()),
                ScriptJson::NotObject => report("Speculation rules must be a JSON object".to_owned()),
                ScriptJson::Object(parsed) => verify_speculation_rules(&parsed, &mut report),
            }
        }

        violations
    }
}

/// The English translator upper-cases the first letter of every message
/// (`@markuplint/ml-core` `finish`: `/^[a-z]/`); the messages here are composed from
/// lower-case phrases as the TS `t()` calls are.
fn capitalize(mut message: String) -> String {
    if let Some(first) = message.get_mut(..1) {
        first.make_ascii_uppercase();
    }
    message
}

fn not_allowed(subject: &str, allowed: &str) -> String {
    format!("{subject} is not allowed (use {allowed})")
}

fn verify_speculation_rules(parsed: &JsonObject, report: &mut impl FnMut(String)) {
    let mut has_rule_set = false;
    for (key, rule_set) in parsed.iter() {
        if !SR_TOP_LEVEL_KEYS.contains(&key) {
            report(not_allowed(
                &format!("the speculation rules top-level key \"{key}\""),
                r#""tag", "prefetch", or "prerender""#,
            ));
            continue;
        }
        // `tag` labels the rule set; it is not a list of rules and does not satisfy the
        // "needs prefetch or prerender" requirement.
        if key == "tag" {
            continue;
        }
        has_rule_set = true;
        let JsonValue::Array(rules) = rule_set else {
            report(format!(
                "the \"{key}\" property of speculation rules must be a JSON array"
            ));
            continue;
        };
        for (i, rule) in rules.iter().enumerate() {
            // A template literal (`${key}[${i}]`), so the index is not locale-formatted.
            validate_speculation_rule(rule, &format!("{key}[{i}]"), report);
        }
    }
    if !has_rule_set {
        report(r#"Speculation rules must be an object with a "prefetch" or "prerender" property"#.to_owned());
    }
}

#[derive(PartialEq, Eq, Clone, Copy)]
enum Source {
    List,
    Document,
}

fn validate_speculation_rule(rule: &JsonValue, label: &str, report: &mut impl FnMut(String)) {
    let JsonValue::Object(rule) = rule else {
        report(format!("the speculation rule {label} must be a JSON object"));
        return;
    };

    for key in rule.keys() {
        if !SR_RULE_KEYS.contains(&key) {
            report(not_allowed(
                &format!("the speculation rule key \"{key}\""),
                r#""source", "urls", "where", "relative_to", "eagerness", "referrer_policy", "tag", "requires", "expects_no_vary_search", or "target_hint""#,
            ));
        }
    }

    let source = rule.get("source");
    let mut valid_source = None;
    match source {
        None => {}
        Some(JsonValue::String(s)) if SR_SOURCES.contains(&s.as_str()) => {
            valid_source = Some(if s == "list" { Source::List } else { Source::Document });
        }
        Some(JsonValue::String(s)) => report(not_allowed(
            &format!("the \"source\" value \"{s}\""),
            r#""list" or "document""#,
        )),
        Some(_) => report(format!("the \"source\" of {label} must be a string")),
    }

    match rule.get("eagerness") {
        None => {}
        Some(JsonValue::String(s)) if SR_EAGERNESS.contains(&s.as_str()) => {}
        Some(JsonValue::String(s)) => report(not_allowed(
            &format!("the \"eagerness\" value \"{s}\""),
            r#""immediate", "eager", "moderate", or "conservative""#,
        )),
        Some(_) => report(format!("the \"eagerness\" of {label} must be a string")),
    }

    let urls = rule.get("urls");
    if let Some(urls) = urls {
        validate_urls(urls, label, report);
    }

    let where_ = rule.get("where");
    if let Some(where_) = where_ {
        validate_predicate(where_, &format!("the \"where\" condition of {label}"), report);
    }

    // The effective source: an explicit valid `source`, otherwise inferred from exactly
    // one of `urls` (list) or `where` (document). Per spec the inference is mutually
    // exclusive: with neither or both (and no explicit source) the rule is invalid.
    let (has_urls, has_where) = (urls.is_some(), where_.is_some());
    let effective = valid_source.or(match (source.is_some(), has_urls, has_where) {
        (false, true, false) => Some(Source::List),
        (false, false, true) => Some(Source::Document),
        _ => None,
    });

    match effective {
        Some(Source::List) => {
            if !has_urls {
                report(format!("the list rule {label} must have a \"urls\" property"));
            }
            if has_where {
                report(format!("the list rule {label} must not have a \"where\" property"));
            }
        }
        Some(Source::Document) => {
            if !has_where {
                report(format!("the document rule {label} must have a \"where\" property"));
            }
            if has_urls {
                report(format!("the document rule {label} must not have a \"urls\" property"));
            }
        }
        None if source.is_none() => report(format!(
            "the speculation rule {label} must have a \"source\", or exactly one of \"urls\" or \"where\""
        )),
        None => {}
    }
}

fn validate_urls(urls: &JsonValue, label: &str, report: &mut impl FnMut(String)) {
    let JsonValue::Array(urls) = urls else {
        report(format!("the \"urls\" of {label} must be a JSON array"));
        return;
    };
    if urls.is_empty() {
        report(format!("the \"urls\" of {label} must not be empty"));
        return;
    }
    for (i, url) in urls.iter().enumerate() {
        let item = format!("the URL at index {} in \"urls\"", to_locale_string_en(i));
        match url {
            JsonValue::String(s) if s.is_empty() => report(format!("{item} must not be empty")),
            JsonValue::String(_) => {}
            _ => report(format!("{item} must be a string")),
        }
    }
}

/// A document-rule `where` predicate: an object with exactly one of `and` / `or` / `not`
/// / `href_matches` / `selector_matches`.
///
/// @see <https://wicg.github.io/nav-speculation/speculation-rules.html#document-rule-predicates>
fn validate_predicate(predicate: &JsonValue, label: &str, report: &mut impl FnMut(String)) {
    let JsonValue::Object(predicate) = predicate else {
        report(format!("{label} must be a JSON object"));
        return;
    };

    let mut has_keys = false;
    let mut predicate_keys = Vec::new();
    for (key, value) in predicate.iter() {
        has_keys = true;
        if SR_PREDICATE_KEYS.contains(&key) {
            predicate_keys.push((key, value));
        } else {
            report(not_allowed(
                &format!("the predicate key \"{key}\""),
                r#""and", "or", "not", "href_matches", or "selector_matches""#,
            ));
        }
    }

    if predicate_keys.is_empty() {
        if !has_keys {
            report(format!(
                "{label} must have exactly one predicate (\"and\", \"or\", \"not\", \"href_matches\", or \"selector_matches\")"
            ));
        }
        return;
    }
    if predicate_keys.len() > 1 {
        report(format!("{label} must have exactly one predicate, but has multiple"));
    }

    for (key, value) in predicate_keys {
        match key {
            "and" | "or" => {
                let JsonValue::Array(items) = value else {
                    report(format!("the \"{key}\" predicate must be a JSON array"));
                    continue;
                };
                if items.is_empty() {
                    report(format!("the \"{key}\" predicate must not be empty"));
                    continue;
                }
                for (i, item) in items.iter().enumerate() {
                    let item_label = format!("the \"{key}\" predicate item [{}]", to_locale_string_en(i));
                    validate_predicate(item, &item_label, report);
                }
            }
            "not" => validate_predicate(value, "the \"not\" predicate", report),
            _ => validate_pattern_value(value, key, report),
        }
    }
}

fn validate_pattern_value(value: &JsonValue, key: &str, report: &mut impl FnMut(String)) {
    match value {
        JsonValue::String(s) => {
            if s.is_empty() {
                report(format!("the \"{key}\" pattern must not be empty"));
            }
        }
        JsonValue::Array(items) => {
            if items.is_empty() {
                report(format!("the \"{key}\" pattern must not be empty"));
                return;
            }
            for (i, item) in items.iter().enumerate() {
                let subject = format!("item [{}] of the \"{key}\" pattern", to_locale_string_en(i));
                match item {
                    JsonValue::String(s) if s.is_empty() => report(format!("{subject} must not be empty")),
                    JsonValue::String(_) => {}
                    _ => report(format!("{subject} must be a string")),
                }
            }
        }
        _ => report(format!("the \"{key}\" pattern must be a string or an array of strings")),
    }
}
