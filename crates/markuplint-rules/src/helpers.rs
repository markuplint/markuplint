use std::sync::LazyLock;

static REGEX_LITERAL_RE: LazyLock<regex::Regex> = LazyLock::new(|| regex::Regex::new(r"^/(.+)/([gim]*)$").unwrap());

/// If the pattern is wrapped in `/` (e.g. `/^[a-z]+$/i`), it is treated
/// as a regular expression (with optional flags `g`, `i`, `m`).
/// Otherwise, the pattern is compared as an exact string match.
///
/// Uses `fancy-regex` to support lookahead/lookbehind assertions
/// (e.g., `/^(?!c-).+$/`), matching JavaScript regex behavior.
///
/// Mirrors the TS `match()` helper in `@markuplint/rules/src/helpers.ts`.
pub fn pattern_match(needle: &str, pattern: &str) -> bool {
    if let Some(re) = parse_regex_literal(pattern) {
        re.is_match(needle).unwrap_or(false)
    } else {
        needle == pattern
    }
}

fn parse_regex_literal(pattern: &str) -> Option<fancy_regex::Regex> {
    let caps = REGEX_LITERAL_RE.captures(pattern)?;
    let body = caps.get(1)?.as_str();
    let flags = caps.get(2).map_or("", |m| m.as_str());

    let mut regex_str = String::new();
    if flags.contains('i') {
        regex_str.push_str("(?i)");
    }
    if flags.contains('m') {
        regex_str.push_str("(?m)");
    }
    regex_str.push_str(body);

    fancy_regex::Regex::new(&regex_str).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn regex_pattern_matches() {
        assert!(pattern_match("foo", "/^[a-z]+$/"));
        assert!(!pattern_match("Foo", "/^[a-z]+$/"));
    }

    #[test]
    fn regex_pattern_with_flags() {
        assert!(pattern_match("FOO", "/^[a-z]+$/i"));
    }

    #[test]
    fn exact_match_without_slashes() {
        assert!(pattern_match("foo", "foo"));
        assert!(!pattern_match("foo", "bar"));
    }

    #[test]
    fn slash_only_pattern() {
        assert!(!pattern_match("foo", "/"));
    }

    #[test]
    fn negative_lookahead() {
        // /^(?!c-).+$/ matches strings NOT starting with "c-"
        assert!(pattern_match("hoge", "/^(?!c-).+$/"));
        assert!(!pattern_match("c-root", "/^(?!c-).+$/"));
    }

    #[test]
    fn positive_lookahead() {
        assert!(pattern_match("foobar", "/foo(?=bar)/"));
        assert!(!pattern_match("foobaz", "/foo(?=bar)/"));
    }
}
