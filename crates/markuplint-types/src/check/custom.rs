//! The checkers of TS `defs` (`defs.ts`) that need more than a predicate.

use super::candidate::get_candidate;
use super::types::{CheckResult, Expect, ExpectType, Reason, UnmatchedOpts, matched, unmatched, unmatched_with};
use crate::primitive::{is_float, is_uint, split_unit};
use crate::token::{TokenCollection, TokenCollectionOptions, TokenKind};
use crate::whatwg::abs_url::is_abs_url;

#[allow(clippy::unnecessary_wraps)] // the shape `UnmatchedOpts::expects` takes
fn expects(list: &[(ExpectType, &str)]) -> Option<Vec<Expect>> {
    Some(
        list.iter()
            .map(|(type_, value)| Expect {
                type_: type_.clone(),
                value: (*value).to_owned(),
            })
            .collect(),
    )
}

/// TS `checkMultiTypes`: the first check that matches, or the unmatched result that got furthest
/// (the most passes, then the latest offset).
#[must_use]
pub fn check_multi_types(value: &str, checks: &[&dyn Fn(&str) -> CheckResult]) -> CheckResult {
    let mut best: Option<super::types::UnmatchedResult> = None;
    for check in checks {
        let res = check(value);
        let CheckResult::Unmatched(res) = res else {
            return res;
        };
        let passed_a = best.as_ref().and_then(|u| u.pass_count).unwrap_or(0);
        let passed_b = res.pass_count.unwrap_or(0);
        let offset_a = best.as_ref().map_or(0, |u| u.offset);
        if passed_a < passed_b || (passed_a == passed_b && offset_a <= res.offset) {
            best = Some(res);
        }
    }
    best.map_or_else(matched, CheckResult::Unmatched)
}

/// JS `value.replaceAll(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '')`.
#[must_use]
pub fn trim_ascii_ws(value: &str) -> &str {
    value.trim_matches(['\t', '\n', '\u{000C}', '\r', ' '])
}

/// TS `OneLineAny`.
#[must_use]
pub fn check_one_line_any(value: &str) -> CheckResult {
    let tokens = TokenCollection::new(value, TokenCollectionOptions::default());
    if let Some(token) = tokens.search(|t| t.value.contains(['\u{000A}', '\u{000D}'])) {
        return token.unmatched_result(Some(Reason::UnexpectedNewline), UnmatchedOpts::default());
    }
    matched()
}

/// TS `XMLName`: the pattern is tested unanchored, as TS does.
#[must_use]
pub fn check_xml_name(value: &str) -> CheckResult {
    // The pattern is a `NameStartChar` followed by name characters it never has to reach, so it
    // matches wherever the value has a `NameStartChar`.
    if value.chars().any(crate::simple_patterns::is_xml_name_start_char) {
        matched()
    } else {
        unmatched(value, Reason::UnexpectedToken)
    }
}

/// TS `FormControlName`.
///
/// @see <https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-name>
///
/// > If the attribute is specified, its value must not be the empty string or isindex.
///
/// `isindex` is matched case-sensitively, as the spec writes it.
#[must_use]
pub fn check_form_control_name(value: &str) -> CheckResult {
    if value.is_empty() {
        return unmatched(value, Reason::EmptyToken);
    }
    if value == "isindex" {
        return unmatched(value, Reason::UnexpectedToken);
    }
    matched()
}

/// TS `DOMID`.
#[must_use]
pub fn check_dom_id(value: &str) -> CheckResult {
    let tokens = TokenCollection::new(value, TokenCollectionOptions::default());
    if let Some(ws) = tokens.search(|t| t.kind == TokenKind::WhiteSpace) {
        return ws.unmatched_result(Some(Reason::UnexpectedSpace), UnmatchedOpts::default());
    }
    if tokens.is_empty() {
        return unmatched(value, Reason::EmptyToken);
    }
    matched()
}

/// The `Pattern` keyword: a value that compiles as the regular expression of a `pattern`
/// attribute ([`super::pattern_syntax`]).
#[must_use]
pub fn check_pattern_keyword(value: &str) -> CheckResult {
    if super::pattern_syntax::is_valid(value) {
        matched()
    } else {
        unmatched(value, Reason::SyntaxError)
    }
}

#[must_use]
pub fn check_json(value: &str) -> CheckResult {
    match serde_json::from_str::<serde_json::Value>(value) {
        Ok(_) => matched(),
        Err(_) => unmatched(value, Reason::SyntaxError),
    }
}

/// TS `isEmail` (`whatwg/check-email.ts`): the pattern the HTML Standard gives.
///
/// TS writes it `[a-z0-9]` with the `i` flag. A JS case-insensitive pattern without the `u` flag
/// folds no non-ASCII character onto an ASCII one (U+017F, ſ, is not `s`; U+212A, K, is not `k`),
/// so every class here is ASCII.
#[must_use]
pub fn is_email(value: &str) -> bool {
    let Some((local, domain)) = value.split_once('@') else {
        return false;
    };
    !local.is_empty()
        && local
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b".!#$%&'*+/=?^_`{|}~-".contains(&b))
        && domain.split('.').all(is_email_domain_label)
}

/// One label of the domain of an email address: 1 to 63 ASCII letters, digits and hyphens that
/// neither starts nor ends with a hyphen.
fn is_email_domain_label(label: &str) -> bool {
    let bytes = label.as_bytes();
    (1..=63).contains(&bytes.len())
        && bytes.iter().all(|b| b.is_ascii_alphanumeric() || *b == b'-')
        && bytes.first().is_some_and(u8::is_ascii_alphanumeric)
        && bytes.last().is_some_and(u8::is_ascii_alphanumeric)
}

/// TS `checkURL()`: the URL Living Standard validation of a URL.
#[must_use]
pub fn check_url(value: &str) -> CheckResult {
    crate::whatwg::url::check_url(value)
}

/// TS `BaseURL`.
#[must_use]
pub fn check_base_url(value: &str) -> CheckResult {
    let normalised = value.to_lowercase();
    // JS `String.prototype.trim()`: its white space includes U+FEFF and excludes U+0085, which
    // `char::is_whitespace` does the other way round.
    let normalised = normalised.trim_matches(|c: char| (c.is_whitespace() && c != '\u{85}') || c == '\u{FEFF}');
    if normalised.starts_with("data:") || normalised.starts_with("javascript:") {
        return unmatched(value, Reason::UnexpectedToken);
    }
    check_url(value)
}

/// TS `ItemProp`.
#[must_use]
pub fn check_item_prop(value: &str) -> CheckResult {
    let abs = |v: &str| {
        if is_abs_url(v) {
            matched()
        } else {
            unmatched(value, Reason::UnexpectedToken)
        }
    };
    let name = |v: &str| {
        if v.contains([':', '.', ' ']) {
            unmatched(value, Reason::UnexpectedToken)
        } else {
            matched()
        }
    };
    check_multi_types(value, &[&abs, &name])
}

/// TS `Srcset`.
#[must_use]
#[allow(clippy::too_many_lines, clippy::missing_panics_doc)] // the base URL is a constant
pub fn check_srcset(value: &str) -> CheckResult {
    let mut has_width = false;
    let mut has_density = false;
    let mut used_widths: Vec<f64> = Vec::new();
    let mut used_densities: Vec<f64> = Vec::new();

    for image in value.split(',') {
        let tokens = TokenCollection::new(
            image.trim(),
            TokenCollectionOptions {
                disallow_to_surround_by_spaces: true,
                ..TokenCollectionOptions::default()
            },
        );
        let url = tokens.first();
        let descriptor = tokens.get(2);
        let tail = tokens.get(3);

        let Some(url) = url else {
            return unmatched_with(
                value,
                Reason::UnexpectedToken,
                UnmatchedOpts {
                    expects: expects(&[(ExpectType::Format, "valid non-empty URL")]),
                    ..Default::default()
                },
            );
        };

        let base = url::Url::parse("https://example.com/").expect("a valid base URL");
        if !crate::whatwg::js_url::can_parse(&url.value, Some(&base)) {
            return url.unmatched_result(
                Some(Reason::UnexpectedToken),
                UnmatchedOpts {
                    expects: expects(&[(ExpectType::Format, "valid non-empty URL")]),
                    ..Default::default()
                },
            );
        }

        if let Some(descriptor) = descriptor {
            let split = split_unit(&descriptor.value);
            match split.unit.as_str() {
                "w" => {
                    let w = js_number(&split.num);
                    if !is_uint(&split.num, None) || w.is_none_or(|w| w <= 0.0) {
                        return unmatched_with(
                            value,
                            Reason::UnexpectedToken,
                            UnmatchedOpts {
                                expects: expects(&[(ExpectType::Format, "width descriptor")]),
                                ..Default::default()
                            },
                        );
                    }
                    let w = w.unwrap_or_default();
                    if used_widths.contains(&w) {
                        return unmatched_with(
                            value,
                            Reason::Duplicated,
                            UnmatchedOpts {
                                expects: expects(&[(ExpectType::Format, "unique width descriptor")]),
                                ..Default::default()
                            },
                        );
                    }
                    used_widths.push(w);
                    has_width = true;
                }
                "x" => {
                    let d = js_number(&split.num);
                    if !is_float(&split.num) || d.is_none_or(|d| d <= 0.0) {
                        return unmatched_with(
                            value,
                            Reason::UnexpectedToken,
                            UnmatchedOpts {
                                expects: expects(&[(ExpectType::Format, "pixel density descriptor")]),
                                ..Default::default()
                            },
                        );
                    }
                    let d = d.unwrap_or_default();
                    if used_densities.contains(&d) {
                        return unmatched_with(
                            value,
                            Reason::Duplicated,
                            UnmatchedOpts {
                                expects: expects(&[(ExpectType::Format, "unique pixel density descriptor")]),
                                ..Default::default()
                            },
                        );
                    }
                    used_densities.push(d);
                    has_density = true;
                }
                _ => {
                    return unmatched_with(
                        value,
                        Reason::UnexpectedToken,
                        UnmatchedOpts {
                            expects: expects(&[
                                (ExpectType::Format, "width descriptor"),
                                (ExpectType::Format, "pixel density descriptor"),
                            ]),
                            ..Default::default()
                        },
                    );
                }
            }
        } else {
            if used_densities.contains(&1.0) {
                return unmatched_with(
                    value,
                    Reason::Duplicated,
                    UnmatchedOpts {
                        expects: expects(&[(ExpectType::Format, "unique pixel density descriptor")]),
                        ..Default::default()
                    },
                );
            }
            used_densities.push(1.0);
            has_density = true;
        }

        if tail.is_some() {
            return unmatched_with(
                value,
                Reason::UnexpectedToken,
                UnmatchedOpts {
                    expects: expects(&[(ExpectType::Syntax, "image candidate string")]),
                    ..Default::default()
                },
            );
        }
    }

    if has_width && has_density {
        return unmatched_with(
            value,
            Reason::UnexpectedToken,
            UnmatchedOpts {
                expects: expects(&[(
                    ExpectType::Format,
                    "consistent descriptors (all width or all density, not mixed)",
                )]),
                ..Default::default()
            },
        );
    }

    matched()
}

/// JS `Number(value)` for the decimal strings `splitUnit` yields; `None` for `NaN`.
fn js_number(value: &str) -> Option<f64> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Some(0.0);
    }
    trimmed.parse::<f64>().ok()
}

/// TS `SRIHash`.
#[must_use]
pub fn check_sri_hash(value: &str) -> CheckResult {
    let tokens: Vec<&str> = crate::js_string::trim(value)
        .split(crate::js_string::is_white_space)
        .filter(|t| !t.is_empty())
        .collect();
    if tokens.is_empty() {
        return unmatched(value, Reason::EmptyToken);
    }
    for token in tokens {
        if !is_sri_token(token) {
            return unmatched(value, Reason::UnexpectedToken);
        }
    }
    matched()
}

/// `/^sha(?:256|384|512)-[A-Za-z0-9_+\/]+=*$/`: a digest algorithm, a hyphen, base64 (URL-safe
/// characters included) and any padding.
fn is_sri_token(token: &str) -> bool {
    let Some(digest) = token.strip_prefix("sha").and_then(|rest| {
        ["256-", "384-", "512-"]
            .iter()
            .find_map(|algorithm| rest.strip_prefix(algorithm))
    }) else {
        return false;
    };
    let body = digest.trim_end_matches('=');
    !body.is_empty()
        && body
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'+' | b'/'))
}

/// TS `IconSize`.
#[must_use]
pub fn check_icon_size(value: &str) -> CheckResult {
    let value = value.to_lowercase();
    if value == "any" {
        return matched();
    }
    let tokens = TokenCollection::new(
        &value,
        TokenCollectionOptions {
            specific_separator: vec!['x'],
            ..TokenCollectionOptions::default()
        },
    );
    let none = UnmatchedOpts::default;
    let Some(width) = tokens.first() else {
        return unmatched(&value, Reason::UnexpectedToken);
    };
    let Some(sep) = tokens.get(1) else {
        return width.unmatched_result(Some(Reason::UnexpectedToken), none());
    };
    let Some(height) = tokens.get(2) else {
        return sep.unmatched_result(Some(Reason::UnexpectedToken), none());
    };
    if let Some(extra) = tokens.get(3) {
        return extra.unmatched_result(Some(Reason::ExtraToken), none());
    }
    if !is_uint(&width.value, None) {
        return width.unmatched_result(Some(Reason::UnexpectedToken), none());
    }
    if width.value == "0" {
        return width.unmatched_result(Some(Reason::OutOfRange), none());
    }
    if sep.value != "x" {
        return sep.unmatched_result(Some(Reason::OutOfRange), none());
    }
    if !is_uint(&height.value, None) {
        return height.unmatched_result(Some(Reason::UnexpectedToken), none());
    }
    if height.value == "0" {
        return height.unmatched_result(Some(Reason::OutOfRange), none());
    }
    matched()
}

/// TS `Accept`.
#[must_use]
pub fn check_accept(value: &str) -> CheckResult {
    if ["audio/*", "video/*", "image/*"].contains(&value) {
        return matched();
    }
    let mime = check_mime_type(value, true);
    if mime.is_matched() {
        return matched();
    }
    let mut chars = value.chars();
    if chars.next() == Some('.') && chars.next().is_some() {
        return matched();
    }
    mime
}

/// TS `checkMIMEType({ withoutParameters })`.
#[must_use]
pub fn check_mime_type(value: &str, without_parameters: bool) -> CheckResult {
    crate::whatwg::mime_type::check_mime_type(value, without_parameters)
}

/// TS `ValidCustomCommand`.
#[must_use]
pub fn check_valid_custom_command(value: &str) -> CheckResult {
    let mut chars = value.chars();
    let valid = value.starts_with("--") && {
        chars.next();
        chars.next();
        // JS `.` does not match a line terminator
        chars
            .next()
            .is_some_and(|c| !matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}'))
    };
    if valid {
        return matched();
    }
    unmatched_with(
        value,
        Reason::Typo,
        UnmatchedOpts {
            candidate: Some(format!("--{value}")),
            expects: expects(&[(ExpectType::Format, "custom command")]),
            ..Default::default()
        },
    )
}

/// TS `HTTPSchemaURL`.
#[must_use]
pub fn check_http_schema_url(value: &str) -> CheckResult {
    if is_abs_url(value) {
        return unmatched(value, Reason::UnexpectedToken);
    }
    let lower = value.to_lowercase();
    if lower.starts_with("http") {
        return matched();
    }
    unmatched_with(
        value,
        Reason::UnexpectedToken,
        UnmatchedOpts {
            expects: expects(&[(ExpectType::Format, "HTTP(S) schema")]),
            ..Default::default()
        },
    )
}

const KEYWORDS: [&str; 4] = ["_blank", "_self", "_parent", "_top"];

use crate::whatwg::navigable_target_name::{has_tab_or_newline_and_less_than, is_navigable_target_name};

/// TS `NavigableTargetNameOrKeyword`.
#[must_use]
pub fn check_navigable_target_name_or_keyword(value: &str) -> CheckResult {
    let lower = value.to_lowercase();
    if KEYWORDS.contains(&lower.as_str()) {
        return matched();
    }
    if value.starts_with('_') {
        return unmatched_with(
            value,
            Reason::UnexpectedToken,
            UnmatchedOpts {
                candidate: get_candidate(&lower, &KEYWORDS),
                ..Default::default()
            },
        );
    }
    if is_navigable_target_name(value) {
        return matched();
    }
    unmatched_with(
        value,
        Reason::UnexpectedToken,
        UnmatchedOpts {
            fallback_to: has_tab_or_newline_and_less_than(value).then(|| "_blank".to_owned()),
            ..Default::default()
        },
    )
}

/// TS `BrowsingContextNameOrKeyword`.
#[must_use]
pub fn check_browsing_context_name_or_keyword(value: &str) -> CheckResult {
    let lower = value.to_lowercase();
    if KEYWORDS.contains(&lower.as_str()) {
        return matched();
    }
    if value.starts_with('_') {
        return unmatched_with(
            value,
            Reason::UnexpectedToken,
            UnmatchedOpts {
                candidate: get_candidate(&lower, &KEYWORDS),
                ..Default::default()
            },
        );
    }
    super::keyword_type::matches(value, is_navigable_target_name(value), None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::primitive::parse_float_prefix;

    #[test]
    fn parse_float_prefix_is_js_parse_float() {
        assert_eq!(parse_float_prefix("1abc"), Some(1.0));
        assert_eq!(parse_float_prefix("abc"), None);
        assert_eq!(parse_float_prefix(" -.5e1x"), Some(-5.0));
    }

    #[test]
    fn srcset_duplicates() {
        assert!(!check_srcset("a.png, b.png 1x").is_matched());
        assert!(!check_srcset("a.png 1x, b.png 1.0x").is_matched());
        assert!(!check_srcset("a.png 100w, b.png 100w").is_matched());
        assert!(check_srcset("a.png 1x, b.png 2x").is_matched());
    }

    mod equivalence {
        use regex::Regex;

        use super::super::*;
        use crate::equivalence::for_each_string;

        #[test]
        fn email_is_the_regular_expression() {
            // The characters of the local part, the domain, and what is just outside both.
            let re = Regex::new(
                r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",
            )
            .unwrap();
            for_each_string(
                &["a", "-", ".", "@", "!", "(", " ", "\n", "\u{e9}", "\u{17f}"],
                6,
                &mut |s| {
                    assert_eq!(is_email(s), re.is_match(s), "is_email({s:?})");
                },
            );
            // Every ASCII character, in each place of the local part and of the domain.
            for c in (0u8..128).map(char::from) {
                for value in [
                    format!("{c}@a"),
                    format!("a{c}b@a"),
                    format!("a@{c}"),
                    format!("a@a{c}"),
                    format!("a@{c}a"),
                    format!("a@a{c}a"),
                    format!("a@a.{c}"),
                    format!("a@a.{c}a"),
                ] {
                    assert_eq!(is_email(&value), re.is_match(&value), "is_email({value:?})");
                }
            }
            for len in [61, 62, 63, 64, 65] {
                for value in [
                    format!("a@{}", "b".repeat(len)),
                    format!("a@{}-", "b".repeat(len)),
                    format!("a@b.{}.c", "d".repeat(len)),
                    format!("a@b.{}-c", "d".repeat(len.saturating_sub(3))),
                ] {
                    assert_eq!(is_email(&value), re.is_match(&value), "is_email({value:?})");
                }
            }
        }

        #[test]
        fn sri_token_is_the_regular_expression() {
            let re = Regex::new(r"^sha(?:256|384|512)-[A-Za-z0-9_+/]+=*$").unwrap();
            for_each_string(
                &["sha", "256", "384", "512", "-", "=", "a", "+", "/", "_", ".", " ", "\n"],
                5,
                &mut |s| {
                    assert_eq!(is_sri_token(s), re.is_match(s), "is_sri_token({s:?})");
                },
            );
            // The characters on both sides of each class of the digest, behind each algorithm.
            let digest = [
                "a", "Z", "0", "9", "+", "/", "-", "_", "=", "@", "[", "`", "{", ":", ".", " ", "\n",
            ];
            for algorithm in ["sha256-", "sha384-", "sha512-", "sha1-", "sha-", "SHA256-"] {
                for_each_string(&digest, 4, &mut |s| {
                    let token = format!("{algorithm}{s}");
                    assert_eq!(is_sri_token(&token), re.is_match(&token), "is_sri_token({token:?})");
                });
            }
        }

        #[test]
        fn xml_name_matches_where_the_value_has_a_name_start_character() {
            assert!(check_xml_name("a").is_matched());
            assert!(check_xml_name("1a").is_matched());
            assert!(!check_xml_name("1").is_matched());
            assert!(!check_xml_name("-").is_matched());
            assert!(!check_xml_name("").is_matched());
        }

        #[test]
        fn sri_hash_splits_at_the_js_white_space() {
            assert!(check_sri_hash("sha256-abc\u{FEFF}sha384-def").is_matched());
            assert!(check_sri_hash("\u{FEFF}sha256-abc\u{3000}").is_matched());
            assert!(!check_sri_hash("sha256-abc\u{85}sha384-def").is_matched());
            assert!(!check_sri_hash("\u{FEFF}").is_matched());
        }
    }
}
