//! Directive type validation.

use regex::Regex;

use super::types::{CheckResult, DirectiveType, Reason, matched, unmatched};

/// Validate a value against directive patterns, extracting and validating a token.
#[must_use]
pub fn check_directive<F>(value: &str, type_def: &DirectiveType, check_token: F) -> CheckResult
where
    F: Fn(&str) -> CheckResult,
{
    let mut first_unmatched: Option<CheckResult> = None;

    for pattern in &type_def.directive {
        if let Some((regex_body, _flags)) = parse_regex_literal(pattern) {
            if let Ok(re) = Regex::new(regex_body)
                && let Some(caps) = re.captures(value)
            {
                // Try named group "token" first, then capture group 1
                let token_part = caps.name("token").or_else(|| caps.get(1)).map(|m| m.as_str());

                if let Some(token_value) = token_part {
                    let result = check_token(token_value);
                    if result.is_matched() {
                        return matched();
                    }
                    if first_unmatched.is_none() {
                        first_unmatched = Some(result);
                    }
                } else {
                    // Regex matched but no token capture group
                    return matched();
                }
            }
            // Regex didn't match or was invalid — try next directive
        } else {
            // Plain string prefix
            if value.starts_with(pattern.as_str()) {
                let token_value = &value[pattern.len()..];
                let result = check_token(token_value);
                if result.is_matched() {
                    return matched();
                }
                if first_unmatched.is_none() {
                    first_unmatched = Some(result);
                }
            }
        }
    }

    first_unmatched.unwrap_or_else(|| unmatched(value, Reason::UnexpectedToken))
}

/// Parse a regex literal like `/pattern/flags` into (body, flags).
fn parse_regex_literal(s: &str) -> Option<(&str, &str)> {
    let rest = s.strip_prefix('/')?;
    let last_slash = rest.rfind('/')?;
    let body = &rest[..last_slash];
    let flags = &rest[last_slash + 1..];
    if flags.chars().all(|c| matches!(c, 'g' | 'i' | 'm')) {
        Some((body, flags))
    } else {
        None
    }
}
