//! The character classes JavaScript regular expressions name with `\s` and `.`, for the checkers
//! that port a TS pattern. Rust's `char::is_whitespace` is another set (it has U+0085 and not
//! U+FEFF).

/// A character of JS `\s`: the white space and line terminators of ECMAScript.
#[must_use]
pub fn is_white_space(c: char) -> bool {
    matches!(
        c,
        '\t' | '\n' | '\u{0B}' | '\u{0C}' | '\r' | ' ' | '\u{A0}' | '\u{1680}' | '\u{2000}'
            ..='\u{200A}' | '\u{2028}' | '\u{2029}' | '\u{202F}' | '\u{205F}' | '\u{3000}' | '\u{FEFF}'
    )
}

/// JS `String.prototype.trim()` (and the white space `parseFloat` skips): the `\s` set at both ends.
#[must_use]
pub fn trim(value: &str) -> &str {
    value.trim_matches(is_white_space)
}

/// A JS line terminator, which JS `.` does not match.
#[must_use]
pub fn is_line_terminator(c: char) -> bool {
    matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}')
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The code points that match JS `/\s/u`, enumerated over every scalar value in Node.js 26.
    const WHITE_SPACE: [u32; 25] = [
        0x9, 0xA, 0xB, 0xC, 0xD, 0x20, 0xA0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007,
        0x2008, 0x2009, 0x200A, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF,
    ];

    /// The code points that JS `/./u` does not match, enumerated the same way.
    const LINE_TERMINATORS: [u32; 4] = [0xA, 0xD, 0x2028, 0x2029];

    fn code_points(set: fn(char) -> bool) -> Vec<u32> {
        (0..=0x0010_FFFFu32)
            .filter_map(char::from_u32)
            .filter(|c| set(*c))
            .map(u32::from)
            .collect()
    }

    #[test]
    fn white_space_is_every_code_point_of_js_s() {
        assert_eq!(code_points(is_white_space), WHITE_SPACE);
    }

    #[test]
    fn line_terminators_are_every_code_point_js_dot_excludes() {
        assert_eq!(code_points(is_line_terminator), LINE_TERMINATORS);
    }

    #[test]
    fn trim_strips_the_js_set_and_not_the_unicode_one() {
        assert_eq!(trim("\u{FEFF} a b\u{3000}\n"), "a b");
        assert_eq!(trim("\u{85}a\u{85}"), "\u{85}a\u{85}");
        assert_eq!(trim("\u{180E}a"), "\u{180E}a");
    }

    #[test]
    fn white_space_is_ecmascript_not_unicode_white_space() {
        assert!(is_white_space('\u{FEFF}'));
        assert!(!is_white_space('\u{85}'));
        assert!(is_white_space('\u{A0}'));
        assert!(!is_white_space('\u{180E}'));
    }

    #[test]
    fn line_terminators_are_four() {
        assert!(['\n', '\r', '\u{2028}', '\u{2029}'].into_iter().all(is_line_terminator));
        assert!(!is_line_terminator('\u{85}'));
    }
}
