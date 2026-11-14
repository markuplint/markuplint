//! A JavaScript regular expression, as far as a pattern of a spec or an option needs one.
//!
//! `fancy-regex` reads lookahead, backreferences and fixed-length lookbehind. JavaScript also
//! takes a lookbehind of any length (`/(?<![^\s]+)noreferrer/`); one that leads the pattern is
//! tested here by matching it against the end of the text before each position the rest of the
//! pattern matches at.
//!
//! The syntax of `fancy-regex` is Rust's, whose classes are Unicode: [`translate`] rewrites what
//! JavaScript (without the `u` flag) reads differently, so that `\d`, `\w`, `\s` and `\b` are
//! ASCII (and `\s` the JS white space), `.` leaves out the four line terminators, `[` `&` and `~`
//! are plain characters in a class, `[]` matches nothing and `[^]` anything, and `\0` is NUL. What
//! it leaves is the Unicode case folding of the `i` flag, the line terminators of the `m` flag, and
//! two hyphens in a row in a class (`[a-c--]`), which Rust reads as a set difference.

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

use crate::js_string::is_line_terminator;

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

/// The groups of the first match of a [`JsRegex`].
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct JsCaptures {
    /// `numbered[i]` is `$i` (`$0` is the whole match); a group that did not take part is `None`.
    pub numbered: Vec<Option<String>>,
    /// The named groups that took part, in the order of the pattern.
    pub named: Vec<(String, String)>,
}

fn captures_of(re: &fancy_regex::Regex, text: &str) -> Option<JsCaptures> {
    let caps = re.captures(text).ok()??;
    Some(JsCaptures {
        numbered: (0..caps.len())
            .map(|i| caps.get(i).map(|m| m.as_str().to_owned()))
            .collect(),
        named: re
            .capture_names()
            .flatten()
            .filter_map(|name| caps.name(name).map(|m| (name.to_owned(), m.as_str().to_owned())))
            .collect(),
    })
}

/// The flags, then the pattern, to the compiled expression (`None` for one that cannot be read).
/// Two levels, so that a hit is looked up by `&str` without building a key.
type Cache = HashMap<String, HashMap<String, Option<Rc<JsRegex>>>>;

thread_local! {
    static CACHE: RefCell<Cache> = RefCell::default();
}

/// Splits `/body/flags`, the way a pattern of a spec or an option names a regular expression:
/// JS `/^\/(.*)\/([…]*)$/` with the flag letters `flags`. `.` is any character but a JS line
/// terminator, so a pattern with one is not a literal; the body may be empty.
///
/// The last `/` ends the body (the greedy `(.*)` reaches it first, and a flag letter is never
/// `/`).
#[must_use]
pub fn split_literal<'a>(pattern: &'a str, flags: &str) -> Option<(&'a str, &'a str)> {
    let rest = pattern.strip_prefix('/')?;
    let end = rest.rfind('/')?;
    let (body, tail) = (&rest[..end], &rest[end + 1..]);
    (tail.chars().all(|c| flags.contains(c)) && !body.contains(is_line_terminator)).then_some((body, tail))
}

/// The characters of JS `\s`, as the body of a class.
const WHITE_SPACE: &str =
    r"\t\n\x0B\x0C\r \x{A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}";

/// The characters of JS `\w`, as the body of a class.
const WORD: &str = "0-9A-Za-z_";

/// JS `\b`: the position between a word character and anything else, on either side.
const WORD_BOUNDARY: &str = "(?:(?<=[0-9A-Za-z_])(?![0-9A-Za-z_])|(?<![0-9A-Za-z_])(?=[0-9A-Za-z_]))";

/// JS `\B`: the position that is not [`WORD_BOUNDARY`].
const NOT_WORD_BOUNDARY: &str = "(?:(?<=[0-9A-Za-z_])(?=[0-9A-Za-z_])|(?<![0-9A-Za-z_])(?![0-9A-Za-z_]))";

/// The class that JS `[]` and `[^]` stand for: every scalar value.
const EVERYTHING: &str = r"\x{0}-\x{10FFFF}";

/// `pattern`, read as JavaScript reads it, in the syntax of `fancy-regex`. `dot_all` is the `s`
/// flag: `.` then matches the line terminators as well.
#[must_use]
pub fn translate(pattern: &str, dot_all: bool) -> String {
    let mut out = String::with_capacity(pattern.len() + 16);
    let mut chars = pattern.chars().peekable();
    let mut in_class = false;
    // Whether the last thing written in a class is a class escape.
    let mut after_class_escape = false;
    while let Some(c) = chars.next() {
        let was_class_escape = std::mem::take(&mut after_class_escape);
        match c {
            '\\' => {
                let Some(next) = chars.next() else {
                    out.push('\\');
                    break;
                };
                let class_escape = matches!(next, 'd' | 'D' | 'w' | 'W' | 's' | 'S');
                if in_class && class_escape {
                    after_class_escape = true;
                }
                match (next, in_class) {
                    ('d', false) => out.push_str("[0-9]"),
                    ('d', true) => out.push_str("0-9"),
                    ('D', _) => out.push_str("[^0-9]"),
                    ('w', false) => {
                        out.push('[');
                        out.push_str(WORD);
                        out.push(']');
                    }
                    ('w', true) => out.push_str(WORD),
                    ('W', _) => {
                        out.push_str("[^");
                        out.push_str(WORD);
                        out.push(']');
                    }
                    ('s', false) => {
                        out.push('[');
                        out.push_str(WHITE_SPACE);
                        out.push(']');
                    }
                    ('s', true) => out.push_str(WHITE_SPACE),
                    ('S', _) => {
                        out.push_str("[^");
                        out.push_str(WHITE_SPACE);
                        out.push(']');
                    }
                    // A boundary between a character of `\w` and one that is not, with `\w` ASCII
                    ('b', false) => out.push_str(WORD_BOUNDARY),
                    // in a class JS `\b` is a backspace
                    ('b', true) => out.push_str(r"\x08"),
                    ('B', false) => out.push_str(NOT_WORD_BOUNDARY),
                    ('0', _) if !chars.peek().is_some_and(char::is_ascii_digit) => out.push_str(r"\x00"),
                    _ => {
                        out.push('\\');
                        out.push(next);
                    }
                }
            }
            '[' if in_class => out.push_str(r"\["),
            '[' => {
                let negated = chars.peek() == Some(&'^');
                if negated {
                    chars.next();
                }
                if chars.peek() == Some(&']') {
                    // JS `[]` matches nothing and `[^]` anything; Rust reads the `]` as a member
                    chars.next();
                    out.push_str(if negated { "[" } else { "[^" });
                    out.push_str(EVERYTHING);
                    out.push(']');
                } else {
                    in_class = true;
                    out.push('[');
                    if negated {
                        out.push('^');
                    }
                }
            }
            ']' if in_class => {
                in_class = false;
                out.push(']');
            }
            // set operators of Rust
            '&' | '~' if in_class => {
                out.push('\\');
                out.push(c);
            }
            // A `-` next to a class escape is a character in JS, and a range to it is an error in Rust.
            '-' if in_class => {
                let mut ahead = chars.clone();
                let before_class_escape =
                    ahead.next() == Some('\\') && matches!(ahead.next(), Some('d' | 'D' | 'w' | 'W' | 's' | 'S'));
                out.push_str(if was_class_escape || before_class_escape {
                    r"\-"
                } else {
                    "-"
                });
            }
            '.' if !in_class && !dot_all => out.push_str(r"[^\n\r\x{2028}\x{2029}]"),
            _ => out.push(c),
        }
    }
    out
}

impl JsRegex {
    /// [`JsRegex::new`] compiled once per `(pattern, flags)` on a thread. The patterns come from a
    /// spec or from the options of a rule, which are read once per element, so a pattern compiled
    /// where it is read is compiled once per element; a config names few of them, so the cache
    /// stays small; a pattern that `nodeRules` gives to one element only is still one entry. A
    /// pattern that cannot be read is kept as `None`, so it is not tried again either.
    ///
    /// The cache is per thread, so that a hit takes no lock and builds no key; the directive
    /// matchers of [`super::directive`] are kept the same way.
    #[must_use]
    pub fn cached(pattern: &str, flags: &str) -> Option<Rc<Self>> {
        let found = CACHE.with(|cache| {
            cache
                .borrow()
                .get(flags)
                .and_then(|patterns| patterns.get(pattern))
                .cloned()
        });
        if let Some(found) = found {
            return found;
        }
        let compiled = Self::new(pattern, flags).map(Rc::new);
        CACHE.with(|cache| {
            cache
                .borrow_mut()
                .entry(flags.to_owned())
                .or_default()
                .insert(pattern.to_owned(), compiled.clone());
        });
        compiled
    }

    /// `None` when the pattern cannot be read.
    #[must_use]
    pub fn new(pattern: &str, flags: &str) -> Option<Self> {
        let prefix = inline_flags(flags);
        let dot_all = flags.contains('s');
        if let Ok(re) = fancy_regex::Regex::new(&format!("{prefix}{}", translate(pattern, dot_all))) {
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
            behind: fancy_regex::Regex::new(&format!("{prefix}(?:{})$", translate(behind, dot_all))).ok()?,
            rest: fancy_regex::Regex::new(&format!("{prefix}^(?:{})", translate(rest, dot_all))).ok()?,
        })
    }

    /// The groups of JS `re.exec(text)`. For a lookbehind that leads the pattern, the groups are
    /// those of the rest of the pattern, numbered from 1 as if the lookbehind had none.
    #[must_use]
    pub fn captures(&self, text: &str) -> Option<JsCaptures> {
        match self {
            Self::Plain(re) => captures_of(re, text),
            Self::LeadingLookbehind { negative, behind, rest } => {
                let start = (0..=text.len()).filter(|i| text.is_char_boundary(*i)).find(|i| {
                    rest.is_match(&text[*i..]).unwrap_or(false)
                        && behind.is_match(&text[..*i]).unwrap_or(false) != *negative
                })?;
                captures_of(rest, &text[start..])
            }
        }
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
    fn cached_compiles_once_and_remembers_a_failure() {
        let first = JsRegex::cached(r"^cached-\d+$", "").unwrap();
        let second = JsRegex::cached(r"^cached-\d+$", "").unwrap();
        assert!(Rc::ptr_eq(&first, &second));
        assert!(first.is_match("cached-1"));
        assert!(JsRegex::cached("(", "").is_none());
        // The failure is kept in the cache, so it is not compiled again.
        assert!(CACHE.with(|cache| cache.borrow()[""]["("].is_none()));
        assert!(JsRegex::cached("(", "").is_none());
    }

    #[test]
    fn split_literal_is_the_regular_expression() {
        use crate::equivalence::for_each_string;

        for flags in ["gim", "gi"] {
            let re = regex::Regex::new(&format!(r"^/([^\n\r\u{{2028}}\u{{2029}}]*)/([{flags}]*)$")).unwrap();
            let alphabet = [
                "/", "a", "g", "i", "m", "x", "G", "\n", "\r", "\u{2028}", "\u{2029}", "\u{85}",
            ];
            for_each_string(&alphabet, 5, &mut |s| {
                let expected = re
                    .captures(s)
                    .map(|c| (c.get(1).unwrap().as_str(), c.get(2).unwrap().as_str()));
                assert_eq!(split_literal(s, flags), expected, "split_literal({s:?}, {flags:?})");
            });
        }
    }

    #[test]
    fn captures_are_numbered_and_named() {
        let re = JsRegex::new(r"^(?<value>a(b))(c)?$", "").unwrap();
        let caps = re.captures("ab").unwrap();
        assert_eq!(
            caps.numbered,
            [Some("ab".to_owned()), Some("ab".to_owned()), Some("b".to_owned()), None]
        );
        assert_eq!(caps.named, [("value".to_owned(), "ab".to_owned())]);
        assert!(re.captures("x").is_none());
        let behind = JsRegex::new(r"(?<![^\s]+)(no)(?![^\s]+)", "").unwrap();
        assert_eq!(behind.captures("x no y").unwrap().numbered[1], Some("no".to_owned()));
    }

    /// What `new RegExp(pattern).test(input)` answers in Node.js 26 for each of `INPUTS`, as the
    /// inputs that match; `None` for a pattern that JS cannot read.
    #[allow(clippy::type_complexity)]
    const JS_CASES: &[(&str, Option<&[&str]>)] = &[
        (r#"\d"#, Some(&["7", "a7", "5-"])),
        (r#"^\d+$"#, Some(&["7"])),
        (
            r#"\D"#,
            Some(&[
                "\u{663}", "a", "a7", "A_", "_", " ", "\u{9}", "\u{A}", "\u{D}", "\u{2028}", "\u{2029}", "\u{A0}",
                "\u{85}", "\u{FEFF}", "\u{3000}", "\u{E9}", "\u{17F}", "a\u{A}c", "abc", "a\u{D}c", "foo", "xfoo",
                "foo bar", "foox", "no", "yes", "aa", "ab", "[", "a&", "&", "~", "-", ".", "/", "]", "\\", "\\d",
                "\u{0}", "\u{8}", "+", "5-",
            ]),
        ),
        (
            r#"^\w+$"#,
            Some(&[
                "7", "a", "a7", "A_", "_", "abc", "foo", "xfoo", "foox", "no", "yes", "aa", "ab",
            ]),
        ),
        (
            r#"\W"#,
            Some(&[
                "\u{663}", " ", "\u{9}", "\u{A}", "\u{D}", "\u{2028}", "\u{2029}", "\u{A0}", "\u{85}", "\u{FEFF}",
                "\u{3000}", "\u{E9}", "\u{17F}", "a\u{A}c", "a\u{D}c", "foo bar", "[", "a&", "&", "~", "-", ".", "/",
                "]", "\\", "\\d", "\u{0}", "\u{8}", "+", "5-",
            ]),
        ),
        (
            r#"^\s+$"#,
            Some(&[
                " ", "\u{9}", "\u{A}", "\u{D}", "\u{2028}", "\u{2029}", "\u{A0}", "\u{FEFF}", "\u{3000}",
            ]),
        ),
        (
            r#"\S"#,
            Some(&[
                "7", "\u{663}", "a", "a7", "A_", "_", "\u{85}", "\u{E9}", "\u{17F}", "a\u{A}c", "abc", "a\u{D}c",
                "foo", "xfoo", "foo bar", "foox", "no", "yes", "aa", "ab", "[", "a&", "&", "~", "-", ".", "/", "]",
                "\\", "\\d", "\u{0}", "\u{8}", "+", "5-",
            ]),
        ),
        (r#"[\d]"#, Some(&["7", "a7", "5-"])),
        (
            r#"[^\d]"#,
            Some(&[
                "\u{663}", "a", "a7", "A_", "_", " ", "\u{9}", "\u{A}", "\u{D}", "\u{2028}", "\u{2029}", "\u{A0}",
                "\u{85}", "\u{FEFF}", "\u{3000}", "\u{E9}", "\u{17F}", "a\u{A}c", "abc", "a\u{D}c", "foo", "xfoo",
                "foo bar", "foox", "no", "yes", "aa", "ab", "[", "a&", "&", "~", "-", ".", "/", "]", "\\", "\\d",
                "\u{0}", "\u{8}", "+", "5-",
            ]),
        ),
        (
            r#"[\w-.]"#,
            Some(&[
                "7", "a", "a7", "A_", "_", "a\u{A}c", "abc", "a\u{D}c", "foo", "xfoo", "foo bar", "foox", "no", "yes",
                "aa", "ab", "a&", "-", ".", "\\d", "5-",
            ]),
        ),
        (r#"[+-\d]"#, Some(&["7", "a7", "-", "+", "5-"])),
        (
            r#"[\s\d]+"#,
            Some(&[
                "7", "a7", " ", "\u{9}", "\u{A}", "\u{D}", "\u{2028}", "\u{2029}", "\u{A0}", "\u{FEFF}", "\u{3000}",
                "a\u{A}c", "a\u{D}c", "foo bar", "5-",
            ]),
        ),
        (
            r#"[\D]"#,
            Some(&[
                "\u{663}", "a", "a7", "A_", "_", " ", "\u{9}", "\u{A}", "\u{D}", "\u{2028}", "\u{2029}", "\u{A0}",
                "\u{85}", "\u{FEFF}", "\u{3000}", "\u{E9}", "\u{17F}", "a\u{A}c", "abc", "a\u{D}c", "foo", "xfoo",
                "foo bar", "foox", "no", "yes", "aa", "ab", "[", "a&", "&", "~", "-", ".", "/", "]", "\\", "\\d",
                "\u{0}", "\u{8}", "+", "5-",
            ]),
        ),
        (r#"a.c"#, Some(&["abc"])),
        (
            r#"^.$"#,
            Some(&[
                "7", "\u{663}", "a", "_", " ", "\u{9}", "\u{A0}", "\u{85}", "\u{FEFF}", "\u{3000}", "\u{E9}",
                "\u{17F}", "[", "&", "~", "-", ".", "/", "]", "\\", "\u{0}", "\u{8}", "+",
            ]),
        ),
        (r#"\bfoo\b"#, Some(&["foo", "foo bar"])),
        (r#"\Bo"#, Some(&["foo", "xfoo", "foo bar", "foox", "no"])),
        (r#"[\b]"#, Some(&["\u{8}"])),
        (r#"\0"#, Some(&["\u{0}"])),
        (r#"[[]"#, Some(&["["])),
        (
            r#"[a&&b]"#,
            Some(&["a", "a7", "a\u{A}c", "abc", "a\u{D}c", "foo bar", "aa", "ab", "a&", "&"]),
        ),
        (
            r#"[a~~b]"#,
            Some(&["a", "a7", "a\u{A}c", "abc", "a\u{D}c", "foo bar", "aa", "ab", "a&", "~"]),
        ),
        (r#"[]"#, Some(&[])),
        (
            r#"[^]"#,
            Some(&[
                "7", "\u{663}", "a", "a7", "A_", "_", " ", "\u{9}", "\u{A}", "\u{D}", "\u{2028}", "\u{2029}", "\u{A0}",
                "\u{85}", "\u{FEFF}", "\u{3000}", "\u{E9}", "\u{17F}", "a\u{A}c", "abc", "a\u{D}c", "foo", "xfoo",
                "foo bar", "foox", "no", "yes", "aa", "ab", "[", "a&", "&", "~", "-", ".", "/", "]", "\\", "\\d",
                "\u{0}", "\u{8}", "+", "5-",
            ]),
        ),
        (
            r#"^[^]$"#,
            Some(&[
                "7", "\u{663}", "a", "_", " ", "\u{9}", "\u{A}", "\u{D}", "\u{2028}", "\u{2029}", "\u{A0}", "\u{85}",
                "\u{FEFF}", "\u{3000}", "\u{E9}", "\u{17F}", "[", "&", "~", "-", ".", "/", "]", "\\", "\u{0}", "\u{8}",
                "+",
            ]),
        ),
        (
            r#"^(?!no).+$"#,
            Some(&[
                "7", "\u{663}", "a", "a7", "A_", "_", " ", "\u{9}", "\u{A0}", "\u{85}", "\u{FEFF}", "\u{3000}",
                "\u{E9}", "\u{17F}", "abc", "foo", "xfoo", "foo bar", "foox", "yes", "aa", "ab", "[", "a&", "&", "~",
                "-", ".", "/", "]", "\\", "\\d", "\u{0}", "\u{8}", "+", "5-",
            ]),
        ),
        (r#"(a)\1"#, Some(&["aa"])),
        (r#"\/"#, Some(&["/"])),
        (r#"\-"#, Some(&["-", "5-"])),
        (r#"[\]]"#, Some(&["]"])),
        (r#"[\\]"#, Some(&["\\", "\\d"])),
        (r#"\\d"#, Some(&["\\d"])),
    ];

    const INPUTS: &[&str] = &[
        "", "7", "\u{663}", "a", "a7", "A_", "_", " ", "\u{9}", "\u{A}", "\u{D}", "\u{2028}", "\u{2029}", "\u{A0}",
        "\u{85}", "\u{FEFF}", "\u{3000}", "\u{E9}", "\u{17F}", "a\u{A}c", "abc", "a\u{D}c", "foo", "xfoo", "foo bar",
        "foox", "no", "yes", "aa", "ab", "[", "a&", "&", "~", "-", ".", "/", "]", "\\", "\\d", "\u{0}", "\u{8}", "+",
        "5-",
    ];

    #[test]
    fn a_pattern_is_read_as_javascript_reads_it() {
        for (pattern, hits) in JS_CASES {
            let Some(hits) = hits else {
                assert!(JsRegex::new(pattern, "").is_none(), "{pattern:?}");
                continue;
            };
            let re = JsRegex::new(pattern, "").unwrap_or_else(|| panic!("{pattern:?} is not read"));
            for input in INPUTS {
                assert_eq!(re.is_match(input), hits.contains(input), "{pattern:?} on {input:?}");
            }
        }
    }

    #[test]
    fn the_s_flag_lets_the_dot_match_a_line_terminator() {
        assert!(!JsRegex::new("^.$", "").unwrap().is_match("\n"));
        assert!(JsRegex::new("^.$", "s").unwrap().is_match("\n"));
    }

    #[test]
    fn plain_pattern_with_flags() {
        let re = JsRegex::new(r"^\/|^https:\/\/", "i").unwrap();
        assert!(re.is_match("HTTPS://example.com"));
        assert!(!re.is_match("./path"));
    }
}
