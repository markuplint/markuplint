/// Whether `c` is an XML `NameStartChar`.
///
/// @see <https://www.w3.org/TR/xml/#NT-Name>
///
/// ```text
/// NameStartChar ::= ":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | ...
/// NameChar      ::= NameStartChar | "-" | "." | [0-9] | #xB7 | ...
/// Name          ::= NameStartChar (NameChar)*
/// ```
#[must_use]
pub fn is_xml_name_start_char(c: char) -> bool {
    matches!(c,
        ':' | 'A'..='Z' | '_' | 'a'..='z'
        | '\u{00C0}'..='\u{00D6}' | '\u{00D8}'..='\u{00F6}' | '\u{00F8}'..='\u{02FF}'
        | '\u{0370}'..='\u{037D}' | '\u{037F}'..='\u{1FFF}' | '\u{200C}' | '\u{200D}'
        | '\u{2070}'..='\u{218F}' | '\u{2C00}'..='\u{2FEF}' | '\u{3001}'..='\u{D7FF}'
        | '\u{F900}'..='\u{FDCF}' | '\u{FDF0}'..='\u{FFFD}' | '\u{10000}'..='\u{EFFFF}')
}

/// Whether `c` is an XML `NameChar`.
#[must_use]
pub fn is_xml_name_char(c: char) -> bool {
    is_xml_name_start_char(c)
        || matches!(c, '-' | '.' | '0'..='9' | '\u{00B7}' | '\u{0300}'..='\u{036F}' | '\u{203F}' | '\u{2040}')
}

pub fn is_zero(value: &str) -> bool {
    value == "0"
}

pub fn is_no_empty_any(value: &str) -> bool {
    !value.is_empty()
}

pub fn is_one_line_any(value: &str) -> bool {
    !value.contains('\u{000A}') && !value.contains('\u{000D}')
}

pub fn is_dom_id(value: &str) -> bool {
    !value.is_empty() && !value.chars().any(char::is_whitespace)
}

pub fn is_hash_name(value: &str) -> bool {
    value.starts_with('#')
}

/// Matches JS `string.length === 1` for BMP characters (the practical
/// input domain for `accesskey` attributes).
pub fn is_one_code_point_char(value: &str) -> bool {
    value.chars().count() == 1
}

pub fn is_valid_custom_command(value: &str) -> bool {
    value.starts_with("--") && value.len() > 2
}

pub fn is_xml_name(value: &str) -> bool {
    let mut chars = value.chars();
    chars.next().is_some_and(is_xml_name_start_char) && chars.all(is_xml_name_char)
}

#[cfg(test)]
mod equivalence_tests {
    use regex::Regex;

    use super::*;
    use crate::equivalence::for_each_string;

    const START: &str = r"[:A-Z_a-z\u{00C0}-\u{00D6}\u{00D8}-\u{00F6}\u{00F8}-\u{02FF}\u{0370}-\u{037D}\u{037F}-\u{1FFF}\u{200C}\u{200D}\u{2070}-\u{218F}\u{2C00}-\u{2FEF}\u{3001}-\u{D7FF}\u{F900}-\u{FDCF}\u{FDF0}-\u{FFFD}\u{10000}-\u{EFFFF}]";
    const TAIL: &str = r"[:A-Z_a-z\u{00C0}-\u{00D6}\u{00D8}-\u{00F6}\u{00F8}-\u{02FF}\u{0370}-\u{037D}\u{037F}-\u{1FFF}\u{200C}\u{200D}\u{2070}-\u{218F}\u{2C00}-\u{2FEF}\u{3001}-\u{D7FF}\u{F900}-\u{FDCF}\u{FDF0}-\u{FFFD}\u{10000}-\u{EFFFF}\x2D\x2E0-9\u{00B7}\u{0300}-\u{036F}\u{203F}\u{2040}]";

    #[test]
    fn xml_name_is_the_regular_expression() {
        let name = Regex::new(&format!("^{START}{TAIL}*$")).unwrap();
        let start = Regex::new(START).unwrap();
        // The ends of every range, and the characters just outside them.
        let alphabet = [
            "a",
            "Z",
            "_",
            ":",
            "-",
            ".",
            "0",
            "9",
            " ",
            "\n",
            "\u{B6}",
            "\u{B7}",
            "\u{B8}",
            "\u{BF}",
            "\u{C0}",
            "\u{D6}",
            "\u{D7}",
            "\u{D8}",
            "\u{F6}",
            "\u{F7}",
            "\u{F8}",
            "\u{2FF}",
            "\u{300}",
            "\u{36F}",
            "\u{370}",
            "\u{37D}",
            "\u{37E}",
            "\u{37F}",
            "\u{1FFF}",
            "\u{2000}",
            "\u{200B}",
            "\u{200C}",
            "\u{200D}",
            "\u{200E}",
            "\u{203E}",
            "\u{203F}",
            "\u{2040}",
            "\u{2041}",
            "\u{206F}",
            "\u{2070}",
            "\u{218F}",
            "\u{2190}",
            "\u{2BFF}",
            "\u{2C00}",
            "\u{2FEF}",
            "\u{2FF0}",
            "\u{3000}",
            "\u{3001}",
            "\u{D7FF}",
            "\u{E000}",
            "\u{F8FF}",
            "\u{F900}",
            "\u{FDCF}",
            "\u{FDD0}",
            "\u{FDEF}",
            "\u{FDF0}",
            "\u{FFFD}",
            "\u{FFFE}",
            "\u{10000}",
            "\u{EFFFF}",
            "\u{F0000}",
        ];
        for_each_string(&alphabet, 2, &mut |s| {
            assert_eq!(is_xml_name(s), name.is_match(s), "is_xml_name({s:?})");
            assert_eq!(
                s.chars().any(is_xml_name_start_char),
                start.is_match(s),
                "start in {s:?}"
            );
        });
    }
}
