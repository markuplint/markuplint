//! Port of `packages/@markuplint/types/src/w3c/check-serialized-permissions-policy.ts`: the value
//! of `iframe[allow]`.
//!
//! @see <https://w3c.github.io/webappsec-permissions-policy/#serialization>
//!
//! > A serialized permissions policy is a string made of entries separated by U+003B (;).
//! > After stripping leading and trailing ASCII whitespace, each entry must be one of:
//! >
//! > - empty;
//! > - the token of a policy-controlled feature;
//! > - the token of a policy-controlled feature, followed by one or more ASCII whitespace and "'none'";
//! > - the token of a policy-controlled feature, followed by one or more ASCII whitespace and
//! >   one or more allowlist values separated by one or more ASCII whitespace.
//! >
//! > The same token must not appear in more than one entry.
//! >
//! > Each allowlist value must be one of:
//! >
//! > - "*";
//! > - "'self'", which refers to the origin of the Document that contains the element;
//! > - "'src'", which refers to the element's declared origin;
//! > - the serialization of an origin that is not an opaque origin and whose host does not contain
//! >   U+002A (*), optionally followed by U+002F (/).
//!
//! The specification does not define the grammar of a feature token, and the set of
//! policy-controlled features is open-ended, so a token is not checked against a list of known
//! features. It is checked against lowercase ASCII letters, digits and hyphens, which the tokens of
//! the listed features are made of, so that a mistake such as `camera:` or `Camera` is still
//! reported. Feature tokens are compared as written; `'none'`, `'self'` and `'src'` are matched
//! ASCII case-insensitively, as the parsing algorithm of the specification does.
//!
//! Only ASCII whitespace separates tokens: Unicode whitespace such as U+3000 does not.
//!
//! @see <https://infra.spec.whatwg.org/#ascii-whitespace>
//! @see <https://github.com/w3c/webappsec-permissions-policy/blob/master/features.md>
//! @see <https://w3c.github.io/webappsec-permissions-policy/#algo-parse-policy-directive>

use std::collections::HashSet;
use std::rc::Rc;

use crate::check::types::{CheckResult, Expect, ExpectType, Reason, UnmatchedOpts, matched};
use crate::token::Token;

fn is_ascii_whitespace(c: char) -> bool {
    matches!(c, '\t' | '\n' | '\u{0C}' | '\r' | ' ')
}

fn common(value: &str) -> Expect {
    Expect {
        type_: ExpectType::Common,
        value: value.to_owned(),
    }
}

fn konst(value: &str) -> Expect {
    Expect {
        type_: ExpectType::Const,
        value: value.to_owned(),
    }
}

/// TS `checkSerializedPermissionsPolicy()`.
#[must_use]
pub fn check_serialized_permissions_policy(value: &str) -> CheckResult {
    let original: Rc<str> = Rc::from(value);
    let token = |value: &str, offset: usize| Token::new(value, offset, Rc::clone(&original), &[]);

    let mut feature_tokens = HashSet::new();
    let mut entry_offset = 0;

    for entry in value.split(';') {
        let this_offset = entry_offset;
        entry_offset += entry.len() + 1;

        let leading = entry.len() - entry.trim_start_matches(is_ascii_whitespace).len();
        let after_leading = &entry[leading..];
        let feature_len = after_leading.find(is_ascii_whitespace).unwrap_or(after_leading.len());
        let feature = &after_leading[..feature_len];

        // An entry that is empty after stripping ASCII whitespace
        if feature.is_empty() {
            continue;
        }
        let feature_token = token(feature, this_offset + leading);

        if !feature
            .bytes()
            .all(|b| b.is_ascii_digit() || b.is_ascii_lowercase() || b == b'-')
        {
            return feature_token.unmatched_result(
                Some(Reason::UnexpectedToken),
                UnmatchedOpts {
                    expects: Some(vec![common("feature-identifier")]),
                    part_name: Some("feature-identifier".to_owned()),
                    ..Default::default()
                },
            );
        }

        // > The same token must not appear in more than one entry.
        if !feature_tokens.insert(feature) {
            return feature_token.unmatched_result(
                Some(Reason::Duplicated),
                UnmatchedOpts {
                    part_name: Some("feature-identifier".to_owned()),
                    ..Default::default()
                },
            );
        }

        let after_feature = &after_leading[feature_len..];
        let separating = after_feature.len() - after_feature.trim_start_matches(is_ascii_whitespace).len();
        let allow_list_offset = this_offset + leading + feature_len + separating;
        let allow_list = &after_feature[separating..];

        let mut values = Vec::new();
        let mut offset = allow_list_offset;
        for part in allow_list.split(is_ascii_whitespace) {
            if !part.is_empty() {
                values.push(token(part, offset));
            }
            offset += part.len() + 1;
        }

        let count = values.len();
        for (index, allow) in values.iter().enumerate() {
            // `'none'` is not an allowlist value. It is only valid as the whole allowlist of an
            // entry.
            if allow.matches_str("'none'", true) {
                if count > 1 {
                    return allow.unmatched_result(
                        Some(Reason::IllegalCombination),
                        UnmatchedOpts {
                            part_name: Some("allow-list".to_owned()),
                            ..Default::default()
                        },
                    );
                }
                continue;
            }

            if allow.matches_any(&["*", "'self'", "'src'"], true) {
                continue;
            }

            if allow.matches_any(&["self", "src", "none"], true) {
                return allow.unmatched_result(
                    Some(Reason::MissingToken),
                    UnmatchedOpts {
                        expects: Some(vec![common("single-quote")]),
                        part_name: Some("keyword".to_owned()),
                        ..Default::default()
                    },
                );
            }

            let CheckResult::Unmatched(origin) = check_serialized_origin(allow) else {
                continue;
            };

            if origin.reason != Reason::SyntaxError {
                return CheckResult::Unmatched(origin);
            }

            let mut expects = vec![konst("*"), konst("'self'"), konst("'src'")];
            // `'none'` is only valid as the whole allowlist, so only the first value can be it.
            if index == 0 {
                expects.push(konst("'none'"));
            }
            expects.push(common("serialized-origin"));
            return allow.unmatched_result(
                Some(Reason::UnexpectedToken),
                UnmatchedOpts {
                    expects: Some(expects),
                    part_name: Some("allow-list".to_owned()),
                    ..Default::default()
                },
            );
        }
    }

    matched()
}

/// The schemes whose URLs have a tuple origin (scheme, host, port). The origin of any other URL
/// is opaque, except for `file:`, which the URL Standard leaves to the implementation, and
/// `blob:`, which takes the origin of the URL it embeds; both are rejected, as in TS.
///
/// @see <https://url.spec.whatwg.org/#concept-url-origin>
const TUPLE_ORIGIN_SCHEMES: &[&str] = &["ftp", "http", "https", "ws", "wss"];

/// The serialization of an origin that is not an opaque origin and whose host does not contain
/// U+002A (*), optionally followed by U+002F (/).
///
/// @see <https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy>
fn check_serialized_origin(token: &Token) -> CheckResult {
    let not_origin = || {
        token.unmatched_result(
            None,
            UnmatchedOpts {
                expects: Some(vec![common("serialized-origin")]),
                ..Default::default()
            },
        )
    };
    let extra = |what: &str| {
        token.unmatched_result(
            Some(Reason::ExtraToken),
            UnmatchedOpts {
                extra: Some(common(what)),
                part_name: Some("serialized-origin".to_owned()),
                ..Default::default()
            },
        )
    };

    let Ok(url) = url::Url::parse(&token.value) else {
        return not_origin();
    };

    if !TUPLE_ORIGIN_SCHEMES.contains(&url.scheme()) {
        return not_origin();
    }

    if !url.path().is_empty() && url.path() != "/" {
        return extra("pathname");
    }

    // `URL.search` and `URL.hash` are empty for a bare `?` or `#`, so the token is what is checked.
    if token.value.contains('?') {
        return extra("query");
    }
    if token.value.contains('#') {
        return extra("hash");
    }
    if !url.username().is_empty() {
        return extra("username");
    }
    if url.password().is_some_and(|p| !p.is_empty()) {
        return extra("password");
    }

    if url.host_str().is_some_and(|host| host.contains('*')) {
        return token.unmatched_result(
            Some(Reason::UnexpectedToken),
            UnmatchedOpts {
                expects: Some(vec![common("serialized-origin")]),
                part_name: Some("serialized-origin".to_owned()),
                ..Default::default()
            },
        );
    }

    // The token must be the serialization of the origin itself, apart from the optional
    // trailing U+002F (/).
    let without_trailing_slash = token.value.strip_suffix('/').unwrap_or(&token.value);
    if without_trailing_slash != url.origin().ascii_serialization() {
        return token.unmatched_result(
            Some(Reason::MustBeSerialized),
            UnmatchedOpts {
                part_name: Some("serialized-origin".to_owned()),
                ..Default::default()
            },
        );
    }

    matched()
}
