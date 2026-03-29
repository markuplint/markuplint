//! List type validation.

use super::types::{
    CheckResult, ListNumber, ListType, Reason, Separator, UnmatchedOpts, matched, unmatched, unmatched_with,
};

/// Validate a separated list of tokens.
#[must_use]
pub fn check_list<F>(value: &str, type_def: &ListType, check_token: F) -> CheckResult
where
    F: Fn(&str) -> CheckResult,
{
    let tokens = split_tokens(value, &type_def.separator);

    // Check for empty input
    if tokens.is_empty() {
        return if type_def.allow_empty {
            matched()
        } else {
            unmatched(value, Reason::EmptyToken)
        };
    }

    // Check token count
    if let Some(ref number) = type_def.number {
        let count = tokens.len();
        match number {
            ListNumber::OneOrMore if count == 0 => {
                return unmatched(value, Reason::EmptyToken);
            }
            ListNumber::Range { min, max } => {
                if min.is_some_and(|m| count < m) {
                    return unmatched(value, Reason::EmptyToken);
                }
                if max.is_some_and(|m| count > m) {
                    return unmatched(value, Reason::ExtraToken);
                }
            }
            _ => {}
        }
    }

    // Check uniqueness
    if type_def.unique {
        for i in 0..tokens.len() {
            for j in (i + 1)..tokens.len() {
                let eq = if type_def.case_insensitive {
                    tokens[i].eq_ignore_ascii_case(tokens[j])
                } else {
                    tokens[i] == tokens[j]
                };
                if eq {
                    return unmatched_with(
                        tokens[j],
                        Reason::Duplicated,
                        UnmatchedOpts {
                            part_name: Some("the content of the list".to_owned()),
                            ..Default::default()
                        },
                    );
                }
            }
        }
    }

    // Check each token
    for token in &tokens {
        if token.is_empty() {
            if type_def.allow_empty {
                continue;
            }
            return unmatched(value, Reason::EmptyToken);
        }

        let result = check_token(token);
        if !result.is_matched() {
            return result;
        }
    }

    matched()
}

/// Split a value into tokens based on the separator.
fn split_tokens<'a>(value: &'a str, separator: &Separator) -> Vec<&'a str> {
    match separator {
        Separator::Space => value.split_ascii_whitespace().filter(|t| !t.is_empty()).collect(),
        Separator::Comma => value.split(',').map(str::trim).collect(),
    }
}
