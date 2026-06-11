use regex::Regex;
use std::sync::LazyLock;

/// @see <https://www.w3.org/TR/xml/#NT-Name>
///
/// ```text
/// NameStartChar ::= ":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | ...
/// NameChar      ::= NameStartChar | "-" | "." | [0-9] | #xB7 | ...
/// Name          ::= NameStartChar (NameChar)*
/// ```
static RE_XML_NAME: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"^[:A-Z_a-z\u{00C0}-\u{00D6}\u{00D8}-\u{00F6}\u{00F8}-\u{02FF}\u{0370}-\u{037D}\u{037F}-\u{1FFF}\u{200C}\u{200D}\u{2070}-\u{218F}\u{2C00}-\u{2FEF}\u{3001}-\u{D7FF}\u{F900}-\u{FDCF}\u{FDF0}-\u{FFFD}\u{10000}-\u{EFFFF}][:A-Z_a-z\u{00C0}-\u{00D6}\u{00D8}-\u{00F6}\u{00F8}-\u{02FF}\u{0370}-\u{037D}\u{037F}-\u{1FFF}\u{200C}\u{200D}\u{2070}-\u{218F}\u{2C00}-\u{2FEF}\u{3001}-\u{D7FF}\u{F900}-\u{FDCF}\u{FDF0}-\u{FFFD}\u{10000}-\u{EFFFF}\x2D\x2E0-9\u{00B7}\u{0300}-\u{036F}\u{203F}\u{2040}]*$",
    )
    .unwrap()
});

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
    !value.is_empty() && RE_XML_NAME.is_match(value)
}
