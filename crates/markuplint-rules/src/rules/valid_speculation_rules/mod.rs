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

use markuplint_core::i18n::{Primitive as Kw, Translator};
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::inline_script::{ScriptJson, script_json};
use crate::js::{JsonObject, JsonValue};
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
        let tr = config.translator();

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
                let message = tr.finish(&message);
                if !reported.insert(message.clone()) {
                    return;
                }
                violations.push(Violation {
                    spec_conformance: None,
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
                ScriptJson::Empty => report(tr.t("{0} must contain a JSON object", &[Kw::S("Speculation rules")])),
                ScriptJson::Invalid => report(tr.t("{0} must be valid JSON", &[Kw::S("Speculation rules")])),
                ScriptJson::NotObject => report(tr.t("{0} must be a JSON object", &[Kw::S("Speculation rules")])),
                ScriptJson::Object(parsed) => verify_speculation_rules(tr, &parsed, &mut report),
            }
        }

        violations
    }
}

/// TS `t('{0} is {1:c}', subject, 'not allowed (use ...)')`: the second argument is a keyword
/// that the dictionary does not know, so it reaches the message as it is.
fn not_allowed(tr: Translator<'static>, subject: &str, allowed: &str) -> String {
    tr.t(
        "{0} is {1:c}",
        &[Kw::S(subject), Kw::S(&format!("not allowed (use {allowed})"))],
    )
}

fn must_be(tr: Translator<'static>, subject: &str, what: &str) -> String {
    tr.t("{0} must be {1}", &[Kw::S(subject), Kw::S(what)])
}

fn must_not_be(tr: Translator<'static>, subject: &str, what: &str) -> String {
    tr.t("{0} must not be {1}", &[Kw::S(subject), Kw::S(what)])
}

fn must_have(tr: Translator<'static>, subject: &str, what: &str) -> String {
    tr.t("{0} must have {1}", &[Kw::S(subject), Kw::S(what)])
}

fn must_not_have(tr: Translator<'static>, subject: &str, what: &str) -> String {
    tr.t("{0} must not have {1}", &[Kw::S(subject), Kw::S(what)])
}

fn verify_speculation_rules(tr: Translator<'static>, parsed: &JsonObject, report: &mut impl FnMut(String)) {
    let mut has_rule_set = false;
    for (key, rule_set) in parsed.iter() {
        if !SR_TOP_LEVEL_KEYS.contains(&key) {
            report(not_allowed(
                tr,
                &tr.t("the speculation rules top-level key \"{0*}\"", &[Kw::S(key)]),
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
            report(must_be(
                tr,
                &tr.t("the \"{0*}\" property of speculation rules", &[Kw::S(key)]),
                "a JSON array",
            ));
            continue;
        };
        for (i, rule) in rules.iter().enumerate() {
            // A template literal (`${key}[${i}]`), so the index is not locale-formatted.
            validate_speculation_rule(tr, rule, &format!("{key}[{i}]"), report);
        }
    }
    if !has_rule_set {
        report(must_be(
            tr,
            "Speculation rules",
            r#"an object with a "prefetch" or "prerender" property"#,
        ));
    }
}

#[derive(PartialEq, Eq, Clone, Copy)]
enum Source {
    List,
    Document,
}

fn validate_speculation_rule(tr: Translator<'static>, rule: &JsonValue, label: &str, report: &mut impl FnMut(String)) {
    let JsonValue::Object(rule) = rule else {
        report(must_be(
            tr,
            &tr.t("the speculation rule {0*}", &[Kw::S(label)]),
            "a JSON object",
        ));
        return;
    };

    for key in rule.keys() {
        if !SR_RULE_KEYS.contains(&key) {
            report(not_allowed(
                tr,
                &tr.t("the speculation rule key \"{0*}\"", &[Kw::S(key)]),
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
            tr,
            &tr.t("the \"source\" value \"{0*}\"", &[Kw::S(s)]),
            r#""list" or "document""#,
        )),
        Some(_) => report(must_be(
            tr,
            &tr.t("the \"source\" of {0*}", &[Kw::S(label)]),
            "a string",
        )),
    }

    match rule.get("eagerness") {
        None => {}
        Some(JsonValue::String(s)) if SR_EAGERNESS.contains(&s.as_str()) => {}
        Some(JsonValue::String(s)) => report(not_allowed(
            tr,
            &tr.t("the \"eagerness\" value \"{0*}\"", &[Kw::S(s)]),
            r#""immediate", "eager", "moderate", or "conservative""#,
        )),
        Some(_) => report(must_be(
            tr,
            &tr.t("the \"eagerness\" of {0*}", &[Kw::S(label)]),
            "a string",
        )),
    }

    let urls = rule.get("urls");
    if let Some(urls) = urls {
        validate_urls(tr, urls, label, report);
    }

    let where_ = rule.get("where");
    if let Some(where_) = where_ {
        validate_predicate(
            tr,
            where_,
            &tr.t("the \"where\" condition of {0*}", &[Kw::S(label)]),
            report,
        );
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
            let subject = tr.t("the list rule {0*}", &[Kw::S(label)]);
            if !has_urls {
                report(must_have(tr, &subject, "a \"urls\" property"));
            }
            if has_where {
                report(must_not_have(tr, &subject, "a \"where\" property"));
            }
        }
        Some(Source::Document) => {
            let subject = tr.t("the document rule {0*}", &[Kw::S(label)]);
            if !has_where {
                report(must_have(tr, &subject, "a \"where\" property"));
            }
            if has_urls {
                report(must_not_have(tr, &subject, "a \"urls\" property"));
            }
        }
        None if source.is_none() => report(must_have(
            tr,
            &tr.t("the speculation rule {0*}", &[Kw::S(label)]),
            "a \"source\", or exactly one of \"urls\" or \"where\"",
        )),
        None => {}
    }
}

fn validate_urls(tr: Translator<'static>, urls: &JsonValue, label: &str, report: &mut impl FnMut(String)) {
    let JsonValue::Array(urls) = urls else {
        report(must_be(
            tr,
            &tr.t("the \"urls\" of {0*}", &[Kw::S(label)]),
            "a JSON array",
        ));
        return;
    };
    if urls.is_empty() {
        report(must_not_be(tr, &tr.t("the \"urls\" of {0*}", &[Kw::S(label)]), "empty"));
        return;
    }
    for (i, url) in urls.iter().enumerate() {
        #[allow(clippy::cast_precision_loss)]
        let item = tr.t("the URL at index {0*} in \"urls\"", &[Kw::N(i as f64)]);
        match url {
            JsonValue::String(s) if s.is_empty() => report(must_not_be(tr, &item, "empty")),
            JsonValue::String(_) => {}
            _ => report(must_be(tr, &item, "a string")),
        }
    }
}

/// A document-rule `where` predicate: an object with exactly one of `and` / `or` / `not`
/// / `href_matches` / `selector_matches`.
///
/// @see <https://wicg.github.io/nav-speculation/speculation-rules.html#document-rule-predicates>
fn validate_predicate(tr: Translator<'static>, predicate: &JsonValue, label: &str, report: &mut impl FnMut(String)) {
    let JsonValue::Object(predicate) = predicate else {
        report(must_be(tr, label, "a JSON object"));
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
                tr,
                &tr.t("the predicate key \"{0*}\"", &[Kw::S(key)]),
                r#""and", "or", "not", "href_matches", or "selector_matches""#,
            ));
        }
    }

    if predicate_keys.is_empty() {
        if !has_keys {
            report(must_have(
                tr,
                label,
                "exactly one predicate (\"and\", \"or\", \"not\", \"href_matches\", or \"selector_matches\")",
            ));
        }
        return;
    }
    if predicate_keys.len() > 1 {
        report(must_have(tr, label, "exactly one predicate, but has multiple"));
    }

    for (key, value) in predicate_keys {
        match key {
            "and" | "or" => {
                let subject = tr.t("the \"{0*}\" predicate", &[Kw::S(key)]);
                let JsonValue::Array(items) = value else {
                    report(must_be(tr, &subject, "a JSON array"));
                    continue;
                };
                if items.is_empty() {
                    report(must_not_be(tr, &subject, "empty"));
                    continue;
                }
                for (i, item) in items.iter().enumerate() {
                    #[allow(clippy::cast_precision_loss)]
                    let item_label = tr.t("the \"{0*}\" predicate item [{1*}]", &[Kw::S(key), Kw::N(i as f64)]);
                    validate_predicate(tr, item, &item_label, report);
                }
            }
            "not" => validate_predicate(tr, value, &tr.t("the \"not\" predicate", &[]), report),
            _ => validate_pattern_value(tr, value, key, report),
        }
    }
}

fn validate_pattern_value(tr: Translator<'static>, value: &JsonValue, key: &str, report: &mut impl FnMut(String)) {
    match value {
        JsonValue::String(s) => {
            if s.is_empty() {
                report(must_not_be(tr, &tr.t("the \"{0*}\" pattern", &[Kw::S(key)]), "empty"));
            }
        }
        JsonValue::Array(items) => {
            if items.is_empty() {
                report(must_not_be(tr, &tr.t("the \"{0*}\" pattern", &[Kw::S(key)]), "empty"));
                return;
            }
            for (i, item) in items.iter().enumerate() {
                #[allow(clippy::cast_precision_loss)]
                let subject = tr.t("item [{0*}] of the \"{1*}\" pattern", &[Kw::N(i as f64), Kw::S(key)]);
                match item {
                    JsonValue::String(s) if s.is_empty() => report(must_not_be(tr, &subject, "empty")),
                    JsonValue::String(_) => {}
                    _ => report(must_be(tr, &subject, "a string")),
                }
            }
        }
        _ => report(must_be(
            tr,
            &tr.t("the \"{0*}\" pattern", &[Kw::S(key)]),
            "a string or an array of strings",
        )),
    }
}
