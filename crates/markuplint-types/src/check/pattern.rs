//! Port of `packages/@markuplint/types/src/pattern.ts`.

use super::js_regex::{JsRegex, split_literal};
use super::types::{CheckResult, Expect, ExpectType, PatternType, Reason, UnmatchedOpts, matched, unmatched_with};

/// TS `checkPattern`: `/.../flags` is a regular expression the value is tested against, and any
/// other pattern is the value itself.
#[must_use]
pub fn check_pattern(value: &str, type_def: &PatternType) -> CheckResult {
    // TS `/^\/(.*)\/([gim])*$/`: the capture keeps the last flag only
    let pattern = &type_def.pattern;
    if let Some((body, flags)) = split_literal(pattern, "gim").filter(|(body, _)| !body.is_empty()) {
        let last_flag: String = flags.chars().last().map_or_default(String::from);
        if JsRegex::cached(body, &last_flag).is_some_and(|re| re.is_match(value)) {
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
