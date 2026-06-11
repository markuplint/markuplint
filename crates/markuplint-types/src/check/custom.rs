//! Keyword types that require custom logic beyond simple boolean predicate checks.

use regex::Regex;

use super::types::{CheckResult, Reason, matched, unmatched};
use crate::primitive::{is_float, is_uint, split_unit};
use crate::whatwg::abs_url::is_abs_url;

#[must_use]
pub fn check_pattern_keyword(value: &str) -> CheckResult {
    let pattern = format!("^(?:{value})$");
    match Regex::new(&pattern) {
        Ok(_) => matched(),
        Err(_) => unmatched(value, Reason::SyntaxError),
    }
}

#[must_use]
pub fn check_json(value: &str) -> CheckResult {
    match serde_json::from_str::<serde_json::Value>(value) {
        Ok(_) => matched(),
        Err(_) => unmatched(value, Reason::SyntaxError),
    }
}

/// Must be either an absolute URL or a valid property name
/// (non-empty, no ASCII whitespace).
#[must_use]
pub fn check_item_prop(value: &str) -> CheckResult {
    if value.is_empty() {
        return unmatched(value, Reason::UnexpectedToken);
    }
    if is_abs_url(value) {
        return matched();
    }
    if !value.chars().any(|c| c.is_ascii_whitespace()) {
        return matched();
    }
    unmatched(value, Reason::UnexpectedToken)
}

/// Comma-separated image candidate strings, each with an optional
/// width (`w`) or density (`x`) descriptor. Cannot mix descriptor types.
#[must_use]
pub fn check_srcset(value: &str) -> CheckResult {
    let images: Vec<&str> = value.split(',').collect();
    let mut has_width = false;
    let mut has_density = false;

    for image in &images {
        let trimmed = image.trim();
        if trimmed.is_empty() {
            return unmatched(value, Reason::UnexpectedToken);
        }

        let parts: Vec<&str> = trimmed.split_ascii_whitespace().collect();
        if parts.is_empty() {
            return unmatched(value, Reason::UnexpectedToken);
        }

        match parts.len() {
            1 => {
                // No descriptor implies 1x (density).
                has_density = true;
            }
            2 => {
                let descriptor = parts[1];
                let result = split_unit(descriptor);
                match result.unit.as_str() {
                    "w" => {
                        if !is_uint(&result.num, None) || result.num == "0" {
                            return unmatched(value, Reason::UnexpectedToken);
                        }
                        has_width = true;
                    }
                    "x" => {
                        if !is_float(&result.num) {
                            return unmatched(value, Reason::UnexpectedToken);
                        }
                        // Zero density is not valid per WHATWG spec
                        if result.num.parse::<f64>().is_ok_and(|n| n == 0.0) {
                            return unmatched(value, Reason::UnexpectedToken);
                        }
                        has_density = true;
                    }
                    _ => {
                        return unmatched(value, Reason::UnexpectedToken);
                    }
                }
            }
            _ => {
                return unmatched(value, Reason::UnexpectedToken);
            }
        }
    }

    if has_width && has_density {
        return unmatched(value, Reason::UnexpectedToken);
    }

    matched()
}

/// Space-separated `hash-algo-base64` tokens where algo is sha256, sha384, or sha512.
/// @see <https://w3c.github.io/webappsec-subresource-integrity/#integrity-metadata-description>
#[must_use]
pub fn check_sri_hash(value: &str) -> CheckResult {
    if value.is_empty() {
        return unmatched(value, Reason::EmptyToken);
    }

    for token in value.split_ascii_whitespace() {
        let Some((algo, _hash)) = token.split_once('-') else {
            return unmatched(value, Reason::SyntaxError);
        };
        match algo {
            "sha256" | "sha384" | "sha512" => {}
            _ => return unmatched(value, Reason::UnexpectedToken),
        }
    }

    matched()
}

/// Must be `"any"` (case-insensitive) or `WIDTHxHEIGHT` where both are
/// non-zero unsigned integers.
#[must_use]
pub fn check_icon_size(value: &str) -> CheckResult {
    let lower = value.to_lowercase();
    if lower == "any" {
        return matched();
    }

    let Some(x_pos) = lower.find('x') else {
        return unmatched(value, Reason::UnexpectedToken);
    };

    let width_str = &value[..x_pos];
    let height_str = &value[x_pos + 1..];

    if width_str.is_empty() || height_str.is_empty() {
        return unmatched(value, Reason::UnexpectedToken);
    }

    if !is_uint(width_str, None) || width_str == "0" {
        return unmatched(value, Reason::UnexpectedToken);
    }
    if !is_uint(height_str, None) || height_str == "0" {
        return unmatched(value, Reason::UnexpectedToken);
    }

    matched()
}

/// Accepts: `audio/*`, `video/*`, `image/*`, a valid MIME type
/// (without parameters), or a file extension starting with `.`.
#[must_use]
pub fn check_accept(value: &str) -> CheckResult {
    let wildcard_types = ["audio/*", "video/*", "image/*"];
    if wildcard_types.iter().any(|&w| value.eq_ignore_ascii_case(w)) {
        return matched();
    }
    if crate::whatwg::mime_type::is_valid_mime_type(value, true) {
        return matched();
    }
    if value.starts_with('.') && value.len() >= 2 {
        return matched();
    }
    unmatched(value, Reason::UnexpectedToken)
}

/// Rejects `data:` and `javascript:` schemes.
#[must_use]
pub fn check_base_url(value: &str) -> CheckResult {
    let lower = value.trim().to_lowercase();
    if lower.starts_with("data:") || lower.starts_with("javascript:") {
        return unmatched(value, Reason::UnexpectedToken);
    }
    matched()
}

/// Rejects absolute URLs; accepts a relative URL whose value starts with `http:`/`https:`.
#[must_use]
pub fn check_http_schema_url(value: &str) -> CheckResult {
    if is_abs_url(value) {
        return unmatched(value, Reason::UnexpectedToken);
    }
    let lower = value.to_lowercase();
    if lower.starts_with("http:") || lower.starts_with("https:") {
        return matched();
    }
    unmatched(value, Reason::UnexpectedToken)
}

#[must_use]
pub fn check_navigable_target_name_or_keyword(value: &str) -> CheckResult {
    let lower = value.to_lowercase();
    let keywords = ["_blank", "_self", "_parent", "_top"];
    if keywords.contains(&lower.as_str()) {
        return matched();
    }
    if lower.starts_with('_') {
        let candidate_refs: Vec<&str> = keywords.to_vec();
        let candidate = super::candidate::get_candidate(&lower, &candidate_refs);
        return super::types::unmatched_with(
            value,
            Reason::UnexpectedToken,
            super::types::UnmatchedOpts {
                candidate,
                ..Default::default()
            },
        );
    }
    if crate::whatwg::navigable_target_name::is_navigable_target_name(value) {
        return matched();
    }
    super::types::unmatched_with(
        value,
        Reason::UnexpectedToken,
        super::types::UnmatchedOpts {
            fallback_to: Some("_blank".to_owned()),
            ..Default::default()
        },
    )
}
