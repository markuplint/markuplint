use strsim::levenshtein;

/// TS `getCandidate`: the candidate most similar to `value` (a Levenshtein ratio of at least 0.5,
/// compared trimmed and in lower case), unless it is `value` itself.
#[must_use]
pub fn get_candidate(value: &str, candidates: &[&str]) -> Option<String> {
    if value.is_empty() {
        return None;
    }
    let value_lower = value.trim().to_lowercase();
    let mut candidate: Option<&str> = None;
    let mut max_ratio = 0.0_f64;
    for &word in candidates {
        if word.is_empty() {
            continue;
        }
        let word_lower = word.trim().to_lowercase();
        let dist = levenshtein(&value_lower, &word_lower);
        #[allow(clippy::cast_precision_loss)]
        let ratio = 1.0 - (dist as f64 / word.encode_utf16().count() as f64);
        if 0.5 <= ratio && max_ratio < ratio {
            candidate = Some(word);
        }
        max_ratio = max_ratio.max(ratio);
    }
    if candidate == Some(value) {
        return None;
    }
    candidate.map(str::to_owned)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_match_returns_none() {
        assert_eq!(get_candidate("hello", &["hello", "world"]), None);
    }

    #[test]
    fn close_match() {
        assert_eq!(get_candidate("helo", &["hello", "world"]), Some("hello".to_owned()));
    }

    #[test]
    fn no_close_match() {
        assert_eq!(get_candidate("xyz", &["hello", "world"]), None);
    }

    #[test]
    fn case_insensitive() {
        assert_eq!(get_candidate("HELLO", &["hello", "world"]), Some("hello".to_owned()));
    }
}
