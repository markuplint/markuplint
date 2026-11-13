//! Port of `packages/@markuplint/types/src/pattern.ts`.

use std::sync::LazyLock;

use regex::Regex;

use super::js_regex::JsRegex;
use super::types::{CheckResult, Expect, ExpectType, PatternType, Reason, UnmatchedOpts, matched, unmatched_with};

/// TS `checkPattern`: `/.../flags` is a regular expression the value is tested against, and any
/// other pattern is the value itself.
#[must_use]
pub fn check_pattern(value: &str, type_def: &PatternType) -> CheckResult {
    // TS `/^\/(.*)\/([gim])*$/`: the capture keeps the last flag only
    static LITERAL: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^/(.*)/([gim]*)$").unwrap());
    let pattern = &type_def.pattern;
    if let Some(caps) = LITERAL.captures(pattern)
        && let Some(body) = caps.get(1).map(|m| m.as_str()).filter(|b| !b.is_empty())
    {
        let flags = caps.get(2).map_or("", |m| m.as_str());
        let last_flag: String = flags.chars().last().map_or_default(String::from);
        if JsRegex::new(body, &last_flag).is_some_and(|re| re.is_match(value)) {
            return matched();
        }
    } else if value == pattern.as_str() {
        return matched();
    }

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
