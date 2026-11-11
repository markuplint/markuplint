//! Port of `packages/@markuplint/types/src/w3c/check-content-security-policy.ts`.
//!
//! Every value that reaches the grammar checks is ASCII without control characters other than
//! TAB (the first check rejects anything else), so JS `\s`, `trim()` and `toLowerCase()` act on
//! TAB and SPACE and ASCII letters only, and the regular expressions see the same input in both
//! engines.

use std::rc::Rc;
use std::sync::LazyLock;

use regex::Regex;

use crate::check::types::{CheckResult, Expect, ExpectType, Reason, UnmatchedOpts, matched};
use crate::token::Token;

/// Fetch Directives — value grammar is a `serialized-source-list`.
///
/// @see <https://www.w3.org/TR/CSP3/#directives-fetch>
const FETCH_DIRECTIVES: &[&str] = &[
    "child-src",
    "connect-src",
    "default-src",
    "font-src",
    "frame-src",
    "img-src",
    "manifest-src",
    "media-src",
    "object-src",
    "script-src",
    "script-src-attr",
    "script-src-elem",
    "style-src",
    "style-src-attr",
    "style-src-elem",
    "worker-src",
];

/// Directives whose value is also a `serialized-source-list`, besides the fetch directives.
///
/// @see <https://www.w3.org/TR/CSP3/#framework-directive-source-list>
const OTHER_SOURCE_LIST_DIRECTIVES: &[&str] = &["base-uri", "form-action", "frame-ancestors"];

/// Directives that carry no value at all.
///
/// @see <https://www.w3.org/TR/upgrade-insecure-requests/#delivery>
const NO_VALUE_DIRECTIVES: &[&str] = &["upgrade-insecure-requests"];

/// Directives recognized by name, whose value grammar is not validated (accepts anything,
/// including empty).
const UNVALIDATED_VALUE_DIRECTIVES: &[&str] = &["report-uri", "report-to", "webrtc"];

/// The remaining registered directives, each with a checker of its own.
///
/// @see <https://www.w3.org/TR/trusted-types/#require-trusted-types-for-csp-directive>
/// @see <https://www.w3.org/TR/trusted-types/#trusted-types-csp-directive>
const OTHER_KNOWN_DIRECTIVES: &[&str] = &["sandbox", "require-trusted-types-for", "trusted-types"];

/// Mirrors the `sandbox` attribute's sandboxing-token enum in
/// `packages/@markuplint/html-spec/src/spec.iframe.jsonc`, as TS does.
///
/// @see <https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox>
const SANDBOX_TOKENS: &[&str] = &[
    "allow-downloads",
    "allow-forms",
    "allow-modals",
    "allow-orientation-lock",
    "allow-pointer-lock",
    "allow-popups",
    "allow-popups-to-escape-sandbox",
    "allow-presentation",
    "allow-same-origin",
    "allow-scripts",
    "allow-top-navigation",
    "allow-top-navigation-by-user-activation",
    "allow-custom-protocols-navigation",
];

/// `source-expression` keyword-source alternatives, excluding `'none'`.
///
/// @see <https://www.w3.org/TR/CSP3/#grammardef-source-expression>
const KEYWORD_SOURCES: &[&str] = &[
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "'strict-dynamic'",
    "'unsafe-hashes'",
    "'report-sample'",
    "'unsafe-allow-redirects'",
];

const NONE_SOURCE: &str = "'none'";

const TRUSTED_TYPES_KEYWORDS: &[&str] = &["'allow-duplicates'", "'none'"];

/// `scheme-part ":"`.
static SCHEME_SOURCE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)^[A-Z][A-Z0-9+.-]*:$").unwrap());

/// `[ scheme-part "://" ] host-part [ port-part ] [ path-part ]`.
static HOST_SOURCE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?i)^(?:[A-Z][A-Z0-9+.-]*://)?(?:\*|(?:\*\.)?[A-Z0-9-]+(?:\.[A-Z0-9-]+)*)(?::(?:[0-9]+|\*))?(?:/\S*)?$",
    )
    .unwrap()
});

/// `"'nonce-" base64-value "'"`.
static NONCE_SOURCE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^'nonce-[A-Za-z0-9_+/-]+={0,2}'$").unwrap());

/// `"'" hash-algorithm "-" base64-value "'"`.
static HASH_SOURCE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^'sha(?:256|384|512)-[A-Za-z0-9_+/-]+={0,2}'$").unwrap());

/// `trusted-types-policy-name` charset.
///
/// @see <https://www.w3.org/TR/trusted-types/#tt-policy-name>
fn is_trusted_types_policy_name(value: &str) -> bool {
    !value.is_empty()
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"_-#=/@.%".contains(&b))
}

/// @see <https://www.w3.org/TR/CSP3/#grammardef-directive-name>
fn is_directive_name(value: &str) -> bool {
    !value.is_empty() && value.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
}

fn is_known_directive(name: &str) -> bool {
    [
        FETCH_DIRECTIVES,
        OTHER_SOURCE_LIST_DIRECTIVES,
        NO_VALUE_DIRECTIVES,
        UNVALIDATED_VALUE_DIRECTIVES,
        OTHER_KNOWN_DIRECTIVES,
    ]
    .iter()
    .any(|set| set.contains(&name))
}

/// `directive-value = *( %x09 / %x20-2B / %x2D-3A / %x3C-7E )`: HTAB or printable ASCII.
fn is_policy_char(c: char) -> bool {
    matches!(c, '\t' | '\u{20}'..='\u{7E}')
}

/// JS `\s` over a value of TAB and printable ASCII.
fn is_space(c: char) -> bool {
    c == '\t' || c == ' '
}

/// A piece of the value and its byte offset in it.
#[derive(Clone, Copy)]
struct Piece<'a> {
    value: &'a str,
    offset: usize,
}

impl<'a> Piece<'a> {
    fn sub(self, start: usize, end: usize) -> Self {
        Piece {
            value: &self.value[start..end],
            offset: self.offset + start,
        }
    }

    /// TS `splitToken`: every occurrence of `delimiter`.
    fn split(self, delimiter: char) -> impl Iterator<Item = Piece<'a>> {
        let mut start = 0;
        self.value.split(delimiter).map(move |part| {
            let piece = Piece {
                value: part,
                offset: self.offset + start,
            };
            start += part.len() + delimiter.len_utf8();
            piece
        })
    }

    /// TS `splitTokenByWhitespace`: the non-empty pieces between whitespace runs.
    fn split_whitespace(self) -> Vec<Piece<'a>> {
        let mut start = 0;
        self.value
            .split(is_space)
            .filter_map(|part| {
                let piece = Piece {
                    value: part,
                    offset: self.offset + start,
                };
                start += part.len() + 1;
                (!part.is_empty()).then_some(piece)
            })
            .collect()
    }

    /// TS `trimToken`.
    fn trim(self) -> Self {
        let leading = self.value.len() - self.value.trim_start_matches(is_space).len();
        Piece {
            value: self.value.trim_matches(is_space),
            offset: self.offset + leading,
        }
    }

    fn unmatched(self, original: &Rc<str>, reason: Reason, opts: UnmatchedOpts) -> CheckResult {
        Token::new(self.value, self.offset, Rc::clone(original), &[]).unmatched_result(Some(reason), opts)
    }
}

fn expects(type_: ExpectType, value: &str) -> Vec<Expect> {
    vec![Expect {
        type_,
        value: value.to_owned(),
    }]
}

/// Validates the `content` attribute value of `<meta http-equiv="content-security-policy">`
/// against the Content Security Policy Level 3 `serialized-policy` grammar.
///
/// Directive-value grammars are enforced for the source-list directives (the fetch directives,
/// `base-uri`, `form-action`, `frame-ancestors`), `sandbox`, `require-trusted-types-for`,
/// `trusted-types` and `upgrade-insecure-requests`; `report-uri` / `report-to` / `webrtc` are
/// recognized by name but their values are not validated. The `<meta>` delivery splits the value
/// on "," into independently-parsed policies.
///
/// @see <https://www.w3.org/TR/CSP3/#framework-policy>
/// @see <https://www.w3.org/TR/CSP3/#framework-directives>
/// @see <https://www.w3.org/TR/CSP3/#meta-element>
#[must_use]
pub fn check_content_security_policy(value: &str) -> CheckResult {
    let original: Rc<str> = Rc::from(value);

    // A non-ASCII authority (an IDN host written as Unicode) fails here first. TS reports the
    // UTF-16 code unit; a character outside the BMP is reported here as the whole character.
    if let Some((index, c)) = value.char_indices().find(|&(_, c)| !is_policy_char(c)) {
        let root = Piece { value, offset: 0 };
        return root.sub(index, index + c.len_utf8()).unmatched(
            &original,
            Reason::SyntaxError,
            UnmatchedOpts {
                expects: Some(expects(ExpectType::Format, "ASCII-only Content Security Policy")),
                ..Default::default()
            },
        );
    }

    let root = Piece { value, offset: 0 };
    for policy in root.split(',') {
        let result = check_serialized_policy(policy, &original);
        if !result.is_matched() {
            return result;
        }
    }
    matched()
}

fn check_serialized_policy(policy: Piece<'_>, original: &Rc<str>) -> CheckResult {
    for raw_directive in policy.split(';') {
        let directive = raw_directive.trim();
        // OWS-only segments are permitted: a trailing ";", an empty policy, and the separator
        // between adjacent directives.
        if directive.value.is_empty() {
            continue;
        }

        let space_index = directive.value.find(is_space);
        let name_piece = match space_index {
            None => directive,
            Some(i) => directive.sub(0, i),
        };
        let name = name_piece.value.to_ascii_lowercase();
        let value_piece = match space_index {
            None => directive.sub(directive.value.len(), directive.value.len()),
            Some(i) => directive.sub(i + 1, directive.value.len()).trim(),
        };

        if !is_directive_name(name_piece.value) {
            return name_piece.unmatched(
                original,
                Reason::UnexpectedToken,
                UnmatchedOpts {
                    expects: Some(expects(ExpectType::Format, "directive-name")),
                    part_name: Some("directive-name".to_owned()),
                    ..Default::default()
                },
            );
        }

        if !is_known_directive(&name) {
            return name_piece.unmatched(
                original,
                Reason::DoesntExistInEnum,
                UnmatchedOpts {
                    expects: Some(expects(ExpectType::Common, "registered CSP directive name")),
                    part_name: Some("directive-name".to_owned()),
                    ..Default::default()
                },
            );
        }

        let result = check_directive_value(&name, value_piece, original);
        if !result.is_matched() {
            return result;
        }
    }
    matched()
}

fn check_directive_value(name: &str, value: Piece<'_>, original: &Rc<str>) -> CheckResult {
    if FETCH_DIRECTIVES.contains(&name) || OTHER_SOURCE_LIST_DIRECTIVES.contains(&name) {
        return check_source_list(value, original);
    }
    match name {
        "sandbox" => return check_sandbox(value, original),
        "require-trusted-types-for" => return check_require_trusted_types_for(value, original),
        "trusted-types" => return check_trusted_types(value, original),
        _ => {}
    }
    if NO_VALUE_DIRECTIVES.contains(&name) && !value.value.is_empty() {
        return value.unmatched(
            original,
            Reason::ExtraToken,
            UnmatchedOpts {
                extra: Some(Expect {
                    type_: ExpectType::Common,
                    value: "directive-value".to_owned(),
                }),
                part_name: Some(name.to_owned()),
                ..Default::default()
            },
        );
    }
    // report-uri / report-to / webrtc: accept anything.
    matched()
}

/// `serialized-source-list = (source-expression *(RWS source-expression)) / "'none'"`.
fn check_source_list(value: Piece<'_>, original: &Rc<str>) -> CheckResult {
    if value.value.is_empty() {
        return matched();
    }
    let tokens = value.split_whitespace();

    // `'none'` is only valid as the sole item of the list.
    if tokens.len() > 1
        && let Some(none) = tokens.iter().find(|t| t.value.eq_ignore_ascii_case(NONE_SOURCE))
    {
        return none.unmatched(
            original,
            Reason::IllegalCombination,
            UnmatchedOpts {
                expects: Some(expects(ExpectType::Format, "source-expression")),
                part_name: Some("source-list".to_owned()),
                ..Default::default()
            },
        );
    }

    for token in tokens {
        let lower = token.value.to_ascii_lowercase();
        if lower == NONE_SOURCE
            || token.value == "*"
            || KEYWORD_SOURCES.contains(&lower.as_str())
            || NONCE_SOURCE.is_match(token.value)
            || HASH_SOURCE.is_match(token.value)
            || SCHEME_SOURCE.is_match(token.value)
            || HOST_SOURCE.is_match(token.value)
        {
            continue;
        }
        return token.unmatched(
            original,
            Reason::UnexpectedToken,
            UnmatchedOpts {
                expects: Some(expects(ExpectType::Format, "source-expression")),
                part_name: Some("source-expression".to_owned()),
                ..Default::default()
            },
        );
    }
    matched()
}

fn check_sandbox(value: Piece<'_>, original: &Rc<str>) -> CheckResult {
    if value.value.is_empty() {
        return matched();
    }
    for token in value.split_whitespace() {
        if !SANDBOX_TOKENS.contains(&token.value.to_ascii_lowercase().as_str()) {
            return token.unmatched(
                original,
                Reason::DoesntExistInEnum,
                UnmatchedOpts {
                    expects: Some(expects(ExpectType::Common, "sandboxing-token")),
                    part_name: Some("sandbox".to_owned()),
                    ..Default::default()
                },
            );
        }
    }
    matched()
}

fn check_require_trusted_types_for(value: Piece<'_>, original: &Rc<str>) -> CheckResult {
    let tokens = value.split_whitespace();
    let opts = || UnmatchedOpts {
        expects: Some(expects(ExpectType::Const, "'script'")),
        part_name: Some("require-trusted-types-for".to_owned()),
        ..Default::default()
    };
    if tokens.is_empty() {
        return value.unmatched(original, Reason::MissingToken, opts());
    }
    for token in tokens {
        if !token.value.eq_ignore_ascii_case("'script'") {
            return token.unmatched(original, Reason::DoesntExistInEnum, opts());
        }
    }
    matched()
}

fn check_trusted_types(value: Piece<'_>, original: &Rc<str>) -> CheckResult {
    if value.value.is_empty() {
        return matched();
    }
    for token in value.split_whitespace() {
        if token.value == "*"
            || TRUSTED_TYPES_KEYWORDS.contains(&token.value.to_ascii_lowercase().as_str())
            || is_trusted_types_policy_name(token.value)
        {
            continue;
        }
        return token.unmatched(
            original,
            Reason::UnexpectedToken,
            UnmatchedOpts {
                expects: Some(expects(ExpectType::Format, "trusted-types-value")),
                part_name: Some("trusted-types".to_owned()),
                ..Default::default()
            },
        );
    }
    matched()
}
