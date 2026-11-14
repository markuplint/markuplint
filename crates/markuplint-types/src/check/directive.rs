//! Port of `packages/@markuplint/types/src/directive.ts`.

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

use super::types::{CheckResult, DirectiveType, Reason, UnmatchedOpts, UnmatchedResult, matched, unmatched_with};

/// TS `regexParser` of `@markuplint/shared`: `/pattern/flags` as a regular expression. A flag that
/// has no counterpart here (`g`, `y`, `d`, `u`, `v`) does not change what matches.
#[must_use]
pub fn regex_parser(regexp_like: &str) -> Option<fancy_regex::Regex> {
    let rest = regexp_like.strip_prefix('/')?;
    let last_slash = rest.rfind('/')?;
    let pattern = &rest[..last_slash];
    let flags = &rest[last_slash + 1..];
    if pattern.is_empty() || !flags.chars().all(|c| "dgimsuvy".contains(c)) {
        return None;
    }
    js_regex(pattern, flags)
}

thread_local! {
    /// `directive` to its [`regex_parser`] result, which is `None` for a directive that is a plain
    /// prefix: the directives come from a spec, so they are few, and compiling one for every value
    /// checked is what the cache avoids. Per thread, like [`super::js_regex::JsRegex::cached`]:
    /// a hit takes no lock and builds no key.
    static MATCHERS: RefCell<HashMap<String, Option<Rc<fancy_regex::Regex>>>> = RefCell::default();
}

fn cached_regex_parser(directive: &str) -> Option<Rc<fancy_regex::Regex>> {
    if let Some(found) = MATCHERS.with(|cache| cache.borrow().get(directive).cloned()) {
        return found;
    }
    let compiled = regex_parser(directive).map(Rc::new);
    MATCHERS.with(|cache| cache.borrow_mut().insert(directive.to_owned(), compiled.clone()));
    compiled
}

/// A JS regular expression with its flags. `fancy-regex` reads the lookaround and backreferences
/// that a JS pattern may have.
#[must_use]
pub fn js_regex(pattern: &str, flags: &str) -> Option<fancy_regex::Regex> {
    let mut inline = String::new();
    for (flag, inner) in [('i', 'i'), ('m', 'm'), ('s', 's')] {
        if flags.contains(flag) {
            inline.push(inner);
        }
    }
    let translated = super::js_regex::translate(pattern, flags.contains('s'));
    let source = if inline.is_empty() {
        translated
    } else {
        format!("(?{inline}){translated}")
    };
    fancy_regex::Regex::new(&source).ok()
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
        let token_part: String = if let Some(matcher) = cached_regex_parser(directive) {
            let Ok(Some(caps)) = matcher.captures(value) else {
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
