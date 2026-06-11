//! Named and numeric character reference handling.
//!
//! The full WHATWG named character reference table (2231 entries) is generated
//! at build time from `entities.json` and stored as a sorted static array.
//! Lookup uses binary search.

// Include the generated table.
include!(concat!(env!("OUT_DIR"), "/entities_generated.rs"));

/// `name` is the full reference text, e.g. `"&amp;"`.
/// Also handles references without a trailing semicolon (e.g. `"&amp"`)
/// per WHATWG spec: the longest match wins.
#[must_use]
pub fn lookup_named(name: &str) -> Option<&'static [char]> {
    if let Ok(idx) = NAMED_ENTITIES.binary_search_by_key(&name, |(k, _)| k) {
        return Some(NAMED_ENTITIES[idx].1);
    }
    None
}

/// Find the longest matching named character reference at the current position.
///
/// `text` should start with `&` and include as much of the input as available.
/// Returns `(replacement_chars, consumed_length)` for the longest match,
/// or `None` if no match is found.
///
/// Per WHATWG spec §13.2.5.73, the algorithm tries the longest match first.
#[must_use]
pub fn find_longest_match(text: &str) -> Option<(&'static [char], usize)> {
    let max_len = text.len().min(33); // Longest entity is ~32 chars
    let mut best: Option<(&'static [char], usize)> = None;

    for len in 2..=max_len {
        if len > text.len() || !text.is_char_boundary(len) {
            continue;
        }
        let candidate = &text[..len];
        if let Ok(idx) = NAMED_ENTITIES.binary_search_by_key(&candidate, |(k, _)| k.as_ref()) {
            best = Some((NAMED_ENTITIES[idx].1, len));
        }
    }

    best
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lookup_with_semicolon() {
        assert_eq!(lookup_named("&amp;"), Some(&['&'] as &[char]));
        assert_eq!(lookup_named("&lt;"), Some(&['<'] as &[char]));
        assert_eq!(lookup_named("&gt;"), Some(&['>'] as &[char]));
        assert_eq!(lookup_named("&quot;"), Some(&['"'] as &[char]));
    }

    #[test]
    fn lookup_without_semicolon() {
        assert_eq!(lookup_named("&amp"), Some(&['&'] as &[char]));
        assert_eq!(lookup_named("&lt"), Some(&['<'] as &[char]));
    }

    #[test]
    fn lookup_nonexistent() {
        assert_eq!(lookup_named("&xyz;"), None);
        assert_eq!(lookup_named("&notarealentity;"), None);
    }

    #[test]
    fn lookup_two_char_entity() {
        // &nLtv; maps to U+226A U+0338
        let result = lookup_named("&nLtv;");
        assert!(result.is_some());
        let chars = result.unwrap();
        assert_eq!(chars.len(), 2);
    }

    #[test]
    fn longest_match() {
        let result = find_longest_match("&amp;xyz");
        assert_eq!(result, Some((&['&'] as &[char], 5)));
    }

    #[test]
    fn longest_match_without_semicolon() {
        let result = find_longest_match("&ampxyz");
        assert_eq!(result, Some((&['&'] as &[char], 4)));
    }

    #[test]
    fn longest_match_with_multibyte_chars() {
        // Text containing multibyte UTF-8 characters after '&' should not panic.
        // 'ホ' is 3 bytes (U+30DB), so byte indices inside it are not char boundaries.
        let result = find_longest_match("&ホゲ");
        assert_eq!(result, None);
    }

    #[test]
    fn longest_match_entity_before_multibyte() {
        // Entity followed by multibyte characters should still match.
        let result = find_longest_match("&amp;ホゲ");
        assert_eq!(result, Some((&['&'] as &[char], 5)));
    }

    #[test]
    fn entity_table_size() {
        // WHATWG defines 2231 named entities.
        assert!(
            NAMED_ENTITIES.len() >= 2200,
            "Expected 2200+ entities, got {}",
            NAMED_ENTITIES.len()
        );
    }
}
