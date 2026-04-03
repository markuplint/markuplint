//! `require-datetime` rule: `<time>` elements must have a `datetime` attribute.
//!
//! When a `<time>` element lacks the `datetime` attribute, this rule attempts to
//! parse the text content as a date/time using `whichtime` (natural language) and
//! a manual `YYYY/MM/DD` fallback, then suggests a candidate `datetime` value
//! built from components that are certain.

use std::sync::LazyLock;

use markuplint_core::mlast::MLASTAttr;
use markuplint_dom::arena::{DomArena, NodeId};
use markuplint_dom::node::DomNode;
use markuplint_types::spec::types::MLMLSpec;
use markuplint_types::whatwg::datetime::is_datetime;
use regex::Regex;
use whichtime::{Component, Locale, WhichTime};

use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

static SLASH_DATE_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^\d{4}/\d{2}/\d{2}$").unwrap());

/// Default locales to try (matches TS implementation).
const DEFAULT_LANGS: &[&str] = &["en", "ja", "fr", "nl", "ru", "de", "pt", "zh"];

/// The `require-datetime` rule.
pub struct RequireDatetime;

impl Rule for RequireDatetime {
    fn id(&self) -> &'static str {
        "require-datetime"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (node_id, el) in arena.elements() {
            let rule_config = config.get(node_id);
            if rule_config.disabled {
                continue;
            }
            if !el.base.node_name.eq_ignore_ascii_case("time") {
                continue;
            }

            let has_datetime = el.attributes.iter().any(|attr| {
                if let MLASTAttr::HTMLAttr(html_attr) = attr {
                    html_attr.node_name.eq_ignore_ascii_case("datetime")
                } else {
                    false
                }
            });

            if has_datetime {
                continue;
            }

            // Get text content from child text nodes
            let text = get_text_content(arena, node_id);

            // Skip empty/whitespace-only text
            if text.is_empty() {
                continue;
            }

            // If text is already a valid WHATWG datetime, no violation.
            // WHATWG datetime values are always ASCII, so skip the check for non-ASCII text
            // to avoid panics in the datetime parser on multibyte strings.
            if text.is_ascii() && is_datetime(&text) {
                continue;
            }

            // Read langs from per-node config options
            let langs = read_langs(&rule_config.options);

            // Try to build a candidate datetime string
            let candidate = try_slash_date_fallback(&text).or_else(|| try_whichtime_parse(&text, &langs));

            let message = if let Some(ref dt) = candidate {
                format!("Need datetime=\"{dt}\"")
            } else {
                "Need the \"datetime\" attribute".to_string()
            };

            violations.push(Violation {
                rule_id: self.id().to_string(),
                name: None,
                severity: rule_config.severity,
                message,
                line: el.base.line,
                col: el.base.col,
                raw: el.base.raw.clone(),
            });
        }

        violations
    }
}

/// Extract text content from child text nodes of a given node.
fn get_text_content(arena: &DomArena, node_id: NodeId) -> String {
    let Some(children) = arena.children_of(node_id) else {
        return String::new();
    };
    let mut text = String::new();
    for &child_id in children {
        if let Some(DomNode::Text(t)) = arena.get(child_id) {
            text.push_str(&t.base.raw);
        }
    }
    text.trim().to_string()
}

/// Read `langs` option from rule config as a string array.
/// Falls back to `DEFAULT_LANGS` if not specified.
fn read_langs(options: &serde_json::Value) -> Vec<Locale> {
    if let Some(arr) = options.get("langs").and_then(|v| v.as_array()) {
        let locales: Vec<Locale> = arr
            .iter()
            .filter_map(|v| v.as_str())
            .filter_map(str_to_locale)
            .collect();
        if !locales.is_empty() {
            return locales;
        }
    }
    DEFAULT_LANGS.iter().filter_map(|s| str_to_locale(s)).collect()
}

/// Map a locale string to a `whichtime::Locale`.
fn str_to_locale(s: &str) -> Option<Locale> {
    match s.to_ascii_lowercase().as_str() {
        "en" => Some(Locale::En),
        "ja" => Some(Locale::Ja),
        "fr" => Some(Locale::Fr),
        "nl" => Some(Locale::Nl),
        "ru" => Some(Locale::Ru),
        "de" => Some(Locale::De),
        "pt" => Some(Locale::Pt),
        "zh" => Some(Locale::Zh),
        _ => None,
    }
}

/// Manual fallback for `YYYY/MM/DD` format (not handled by whichtime).
fn try_slash_date_fallback(text: &str) -> Option<String> {
    if SLASH_DATE_RE.is_match(text) {
        let candidate = text.replace('/', "-");
        if is_datetime(&candidate) {
            return Some(candidate);
        }
    }
    None
}

/// Try parsing text with whichtime across multiple locales.
/// Returns a candidate datetime string built from certain components.
fn try_whichtime_parse(text: &str, langs: &[Locale]) -> Option<String> {
    let wt = WhichTime::new();

    for &locale in langs {
        let parser = wt.get_locale_parser(locale);
        let results = parser.parse(text, None).unwrap_or_default();

        for result in &results {
            // Skip ranges (where end is present)
            if result.end.is_some() {
                continue;
            }

            let start = &result.start;
            if let Some(candidate) = build_candidate(start) {
                return Some(candidate);
            }
        }
    }

    None
}

/// Build a candidate datetime string from certain components.
fn build_candidate(fc: &whichtime::FastComponents) -> Option<String> {
    let has_year = fc.is_certain(Component::Year);
    let has_month = fc.is_certain(Component::Month);
    let has_day = fc.is_certain(Component::Day);
    let has_hour = fc.is_certain(Component::Hour);
    let has_minute = fc.is_certain(Component::Minute);
    let has_second = fc.is_certain(Component::Second);
    let has_offset = fc.is_certain(Component::TimezoneOffset);

    let year = fc.get(Component::Year);
    let month = fc.get(Component::Month);
    let day = fc.get(Component::Day);
    let hour = fc.get(Component::Hour);
    let minute = fc.get(Component::Minute);
    let second = fc.get(Component::Second);
    let offset = fc.get(Component::TimezoneOffset);

    let mut date_part: Option<String> = None;
    let mut time_part: Option<String> = None;

    // Build date part
    if has_year && has_month && has_day {
        if let (Some(y), Some(m), Some(d)) = (year, month, day) {
            date_part = Some(format!("{y:04}-{m:02}-{d:02}"));
        }
    } else if has_year && has_month && !has_day {
        if let (Some(y), Some(m)) = (year, month) {
            date_part = Some(format!("{y:04}-{m:02}"));
        }
    } else if !has_year
        && has_month
        && has_day
        && let (Some(m), Some(d)) = (month, day)
    {
        // Yearless date: MM-DD
        date_part = Some(format!("{m:02}-{d:02}"));
    }

    // Build time part
    if has_hour && has_minute && has_second {
        if let (Some(h), Some(mi), Some(s)) = (hour, minute, second) {
            time_part = Some(format!("{h:02}:{mi:02}:{s:02}"));
        }
    } else if has_hour
        && has_minute
        && let (Some(h), Some(mi)) = (hour, minute)
    {
        time_part = Some(format!("{h:02}:{mi:02}"));
    }

    // Build timezone suffix
    let tz_suffix = if has_offset {
        offset.map(|off| {
            if off == 0 {
                "Z".to_string()
            } else {
                let sign = if off >= 0 { '+' } else { '-' };
                let abs_off = off.unsigned_abs();
                let hours = abs_off / 60;
                let mins = abs_off % 60;
                format!("{sign}{hours:02}{mins:02}")
            }
        })
    } else {
        None
    };

    // Combine parts
    let result = match (date_part, time_part) {
        (Some(d), Some(t)) => Some(format!("{d}T{t}")),
        (Some(d), None) => Some(d),
        (None, Some(t)) => Some(t),
        (None, None) => None,
    };

    // Append timezone if available
    result.map(|r| {
        if let Some(ref tz) = tz_suffix {
            format!("{r}{tz}")
        } else {
            r
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rule::{RuleConfig, RuleConfigSet};
    use crate::rules::attr_duplication::tests::make_element_with_attrs;
    use markuplint_types::spec::load_spec;

    fn spec() -> MLMLSpec {
        load_spec(include_str!("../../../../packages/@markuplint/html-spec/index.json")).unwrap()
    }

    #[test]
    fn time_with_datetime_no_violation() {
        let arena = make_element_with_attrs("time", &[("datetime", "2024-01-01")]);
        let s = spec();
        let rule = RequireDatetime;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn time_without_datetime_empty_text_skipped() {
        // make_element_with_attrs creates element with no child text nodes → empty text → skipped
        let arena = make_element_with_attrs("time", &[]);
        let s = spec();
        let rule = RequireDatetime;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    #[test]
    fn non_time_element_no_violation() {
        let arena = make_element_with_attrs("span", &[]);
        let s = spec();
        let rule = RequireDatetime;
        let violations = rule.verify(&arena, &s, &RuleConfigSet::global_only(RuleConfig::default()));
        assert!(violations.is_empty());
    }

    // --- Unit tests for helper functions ---

    #[test]
    fn slash_date_fallback() {
        assert_eq!(try_slash_date_fallback("2000/01/01"), Some("2000-01-01".to_string()));
        assert_eq!(try_slash_date_fallback("not-a-date"), None);
        assert_eq!(try_slash_date_fallback("2000/01/01 extra"), None);
    }

    #[test]
    fn whichtime_english_date() {
        let langs = vec![Locale::En];
        let result = try_whichtime_parse("January 1, 2024", &langs);
        assert_eq!(result, Some("2024-01-01".to_string()));
    }

    #[test]
    fn whichtime_japanese_era() {
        let langs = vec![Locale::Ja];
        let result = try_whichtime_parse("令和5年1月3日", &langs);
        assert_eq!(result, Some("2023-01-03".to_string()));
    }

    #[test]
    fn whichtime_unparseable() {
        let langs = DEFAULT_LANGS
            .iter()
            .filter_map(|s| str_to_locale(s))
            .collect::<Vec<_>>();
        let result = try_whichtime_parse("Content", &langs);
        assert_eq!(result, None);
    }

    #[test]
    fn whichtime_yearless_date() {
        // "1月3日" → month=1, day=3 certain; year implied (not certain)
        let langs = vec![Locale::Ja];
        let result = try_whichtime_parse("1月3日", &langs);
        assert_eq!(result, Some("01-03".to_string()));
    }

    #[test]
    fn read_langs_default() {
        let options = serde_json::Value::Null;
        let langs = read_langs(&options);
        assert_eq!(langs.len(), 8);
    }

    #[test]
    fn read_langs_custom() {
        let options = serde_json::json!({"langs": ["en", "ja"]});
        let langs = read_langs(&options);
        assert_eq!(langs.len(), 2);
    }

    #[test]
    fn valid_datetime_text_no_violation() {
        // Text "2000-01-01" is a valid WHATWG datetime → no violation expected
        // (This requires integration test with HTML parser for text node support)
        assert!(is_datetime("2000-01-01"));
    }
}
