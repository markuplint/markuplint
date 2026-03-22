//! Pattern type validation.

use regex::Regex;

use super::types::{CheckResult, Expect, ExpectType, PatternType, Reason, UnmatchedOpts, matched, unmatched_with};

/// Validate a value against a regex or literal pattern.
#[must_use]
pub fn check_pattern(value: &str, type_def: &PatternType) -> CheckResult {
    let pattern = &type_def.pattern;

    if let Some((regex_body, flags)) = parse_regex_literal(pattern) {
        // Regex literal: /pattern/flags
        let case_insensitive = flags.contains('i');
        let multiline = flags.contains('m');

        let mut regex_str = String::new();
        if case_insensitive || multiline {
            regex_str.push_str("(?");
            if case_insensitive {
                regex_str.push('i');
            }
            if multiline {
                regex_str.push('m');
            }
            regex_str.push(')');
        }
        regex_str.push_str(regex_body);

        match Regex::new(&regex_str) {
            Ok(re) => {
                if re.is_match(value) {
                    matched()
                } else {
                    unmatched_with(
                        value,
                        Reason::SyntaxError,
                        UnmatchedOpts {
                            expects: Some(vec![Expect {
                                type_: ExpectType::Regexp,
                                value: pattern.clone(),
                            }]),
                            ..Default::default()
                        },
                    )
                }
            }
            Err(_) => unmatched_with(
                value,
                Reason::SyntaxError,
                UnmatchedOpts {
                    expects: Some(vec![Expect {
                        type_: ExpectType::Regexp,
                        value: pattern.clone(),
                    }]),
                    ..Default::default()
                },
            ),
        }
    } else {
        // Plain string: exact match
        if value == pattern.as_str() {
            matched()
        } else {
            unmatched_with(
                value,
                Reason::SyntaxError,
                UnmatchedOpts {
                    expects: Some(vec![Expect {
                        type_: ExpectType::Const,
                        value: pattern.clone(),
                    }]),
                    ..Default::default()
                },
            )
        }
    }
}

/// Parse a regex literal like `/pattern/flags` into (body, flags).
fn parse_regex_literal(s: &str) -> Option<(&str, &str)> {
    if !s.starts_with('/') {
        return None;
    }

    // Find the last '/'
    let rest = &s[1..];
    let last_slash = rest.rfind('/')?;
    let body = &rest[..last_slash];
    let flags = &rest[last_slash + 1..];

    // Validate flags: only g, i, m allowed
    if flags.chars().all(|c| matches!(c, 'g' | 'i' | 'm')) {
        Some((body, flags))
    } else {
        None
    }
}
