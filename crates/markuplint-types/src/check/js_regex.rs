//! A JavaScript regular expression, as far as a pattern of a spec or an option needs one.
//!
//! `fancy-regex` reads lookahead, backreferences and fixed-length lookbehind. JavaScript also
//! takes a lookbehind of any length (`/(?<![^\s]+)noreferrer/`); one that leads the pattern is
//! tested here by matching it against the end of the text before each position the rest of the
//! pattern matches at.

/// A compiled JavaScript regular expression.
pub enum JsRegex {
    Plain(fancy_regex::Regex),
    /// `(?<=X)R` / `(?<!X)R` with a lookbehind `X` that `fancy-regex` cannot compile.
    LeadingLookbehind {
        negative: bool,
        /// `(?:X)$`
        behind: fancy_regex::Regex,
        /// `^(?:R)`
        rest: fancy_regex::Regex,
    },
}

/// The inline flags of the JS flags `i`, `m` and `s`; the others do not change what matches.
fn inline_flags(flags: &str) -> String {
    let inline: String = ['i', 'm', 's'].iter().filter(|f| flags.contains(**f)).collect();
    if inline.is_empty() {
        inline
    } else {
        format!("(?{inline})")
    }
}

/// The end of the group that starts at byte `start` (an opening parenthesis), skipping escapes
/// and character classes.
fn group_end(pattern: &str, start: usize) -> Option<usize> {
    let bytes = pattern.as_bytes();
    let mut depth = 0usize;
    let mut i = start;
    let mut in_class = false;
    while i < bytes.len() {
        match bytes[i] {
            b'\\' => {
                i += 2;
                continue;
            }
            b'[' if !in_class => in_class = true,
            b']' if in_class => in_class = false,
            b'(' if !in_class => depth += 1,
            b')' if !in_class => {
                depth -= 1;
                if depth == 0 {
                    return Some(i);
                }
            }
            _ => {}
        }
        i += 1;
    }
    None
}

impl JsRegex {
    /// `None` when the pattern cannot be read.
    #[must_use]
    pub fn new(pattern: &str, flags: &str) -> Option<Self> {
        let prefix = inline_flags(flags);
        if let Ok(re) = fancy_regex::Regex::new(&format!("{prefix}{pattern}")) {
            return Some(Self::Plain(re));
        }
        let negative = if pattern.starts_with("(?<!") {
            true
        } else if pattern.starts_with("(?<=") {
            false
        } else {
            return None;
        };
        let end = group_end(pattern, 0)?;
        let behind = &pattern[4..end];
        let rest = &pattern[end + 1..];
        Some(Self::LeadingLookbehind {
            negative,
            behind: fancy_regex::Regex::new(&format!("{prefix}(?:{behind})$")).ok()?,
            rest: fancy_regex::Regex::new(&format!("{prefix}^(?:{rest})")).ok()?,
        })
    }

    /// JS `re.test(text)`.
    #[must_use]
    pub fn is_match(&self, text: &str) -> bool {
        match self {
            Self::Plain(re) => re.is_match(text).unwrap_or(false),
            Self::LeadingLookbehind { negative, behind, rest } => {
                (0..=text.len()).filter(|i| text.is_char_boundary(*i)).any(|i| {
                    rest.is_match(&text[i..]).unwrap_or(false)
                        && behind.is_match(&text[..i]).unwrap_or(false) != *negative
                })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn variable_length_lookbehind() {
        let re = JsRegex::new(r"(?<![^\s]+)noreferrer(?![^\s]+)", "").unwrap();
        assert!(re.is_match("noreferrer noopener"));
        assert!(re.is_match("noopener noreferrer"));
        assert!(!re.is_match("noreferrernoopener"));
        assert!(!re.is_match("xnoreferrer"));
    }

    #[test]
    fn plain_pattern_with_flags() {
        let re = JsRegex::new(r"^\/|^https:\/\/", "i").unwrap();
        assert!(re.is_match("HTTPS://example.com"));
        assert!(!re.is_match("./path"));
    }
}
