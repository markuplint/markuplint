use strsim::levenshtein;

/// Returns a candidate only when the similarity ratio is >= 50% and the candidate
/// differs from the input value.
#[must_use]
pub fn get_candidate(value: &str, candidates: &[&str]) -> Option<String> {
    let value_lower = value.trim().to_lowercase();
    if value_lower.is_empty() {
        return None;
    }

    let mut best: Option<(String, f64)> = None;

    for &candidate in candidates {
        let cand_lower = candidate.to_lowercase();
        if value_lower == cand_lower {
            // Exact match — no suggestion needed
            return None;
        }

        let dist = levenshtein(&value_lower, &cand_lower);
        let len = cand_lower.len().max(1);
        #[allow(clippy::cast_precision_loss)]
        let ratio = 1.0 - (dist as f64 / len as f64);

        if ratio >= 0.5 {
            if let Some((_, best_ratio)) = &best {
                if ratio > *best_ratio {
                    best = Some((candidate.to_owned(), ratio));
                }
            } else {
                best = Some((candidate.to_owned(), ratio));
            }
        }
    }

    best.map(|(c, _)| c)
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
        assert_eq!(get_candidate("HELLO", &["hello", "world"]), None);
    }
}
