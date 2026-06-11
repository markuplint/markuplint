use regex::Regex;

use super::types::{CheckResult, Expect, ExpectType, PatternType, Reason, UnmatchedOpts, matched, unmatched_with};

#[must_use]
pub fn check_pattern(value: &str, type_def: &PatternType) -> CheckResult {
    let pattern = &type_def.pattern;

    if let Some((regex_body, flags)) = parse_regex_literal(pattern) {
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
    } else if value == pattern.as_str() {
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

fn parse_regex_literal(s: &str) -> Option<(&str, &str)> {
    if !s.starts_with('/') {
        return None;
    }

    let rest = &s[1..];
    let last_slash = rest.rfind('/')?;
    let body = &rest[..last_slash];
    let flags = &rest[last_slash + 1..];

    if flags.chars().all(|c| matches!(c, 'g' | 'i' | 'm')) {
        Some((body, flags))
    } else {
        None
    }
}
