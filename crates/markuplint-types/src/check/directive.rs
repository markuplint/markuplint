//! Port of `packages/@markuplint/types/src/directive.ts`.

use super::types::{CheckResult, DirectiveType, Reason, UnmatchedOpts, UnmatchedResult, matched, unmatched_with};

/// TS `regexParser` of `@markuplint/shared`: `/pattern/flags` as a regular expression. A flag the
/// `regex` crate has no counterpart of (`g`, `y`, `d`, `u`, `v`) does not change what matches.
#[must_use]
pub fn regex_parser(regexp_like: &str) -> Option<regex::Regex> {
    let rest = regexp_like.strip_prefix('/')?;
    let last_slash = rest.rfind('/')?;
    let pattern = &rest[..last_slash];
    let flags = &rest[last_slash + 1..];
    if pattern.is_empty() || !flags.chars().all(|c| "dgimsuvy".contains(c)) {
        return None;
    }
    js_regex(pattern, flags)
}

/// A JS regular expression with its flags, as the `regex` crate reads it.
#[must_use]
pub fn js_regex(pattern: &str, flags: &str) -> Option<regex::Regex> {
    let mut inline = String::new();
    for (flag, inner) in [('i', 'i'), ('m', 'm'), ('s', 's')] {
        if flags.contains(flag) {
            inline.push(inner);
        }
    }
    let source = if inline.is_empty() {
        pattern.to_owned()
    } else {
        format!("(?{inline}){pattern}")
    };
    regex::Regex::new(&source).ok()
}

/// TS `checkDirective`.
#[must_use]
pub fn check_directive<F>(value: &str, type_def: &DirectiveType, ref_: Option<&str>, check_token: F) -> CheckResult
where
    F: Fn(&str) -> CheckResult,
{
    let mut unmatches: Vec<UnmatchedResult> = Vec::new();
    let missing = || {
        let CheckResult::Unmatched(u) = unmatched_with(
            value,
            Reason::MissingToken,
            UnmatchedOpts {
                ref_: ref_.map(str::to_owned).or_else(|| type_def.ref_.clone()),
                ..Default::default()
            },
        ) else {
            unreachable!()
        };
        u
    };

    for directive in &type_def.directive {
        // TS `regexParser` returns `null` for a string it cannot read, and the directive is a prefix then
        let token_part: String = if let Some(matcher) = regex_parser(directive) {
            let Some(caps) = matcher.captures(value) else {
                unmatches.push(missing());
                continue;
            };
            caps.name("token")
                .or_else(|| caps.get(1))
                .map_or_else(String::new, |m| m.as_str().to_owned())
        } else if let Some(rest) = value.strip_prefix(directive.as_str()) {
            rest.to_owned()
        } else {
            unmatches.push(missing());
            continue;
        };

        match check_token(&token_part) {
            CheckResult::Matched => return CheckResult::Matched,
            CheckResult::Unmatched(u) => unmatches.push(u),
        }
    }

    unmatches
        .into_iter()
        .next()
        .map_or_else(matched, CheckResult::Unmatched)
}
