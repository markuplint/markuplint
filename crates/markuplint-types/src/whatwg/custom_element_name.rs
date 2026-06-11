//! @see <https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name>

use regex::Regex;
use std::sync::LazyLock;

static RE_PCEN_CHAR: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"^[\x2D\x2E0-9_a-z\u{00B7}\u{00C0}-\u{00D6}\u{00D8}-\u{00F6}\u{00F8}-\u{037D}\u{037F}-\u{1FFF}\u{200C}\u{200D}\u{203F}\u{2040}\u{2070}-\u{218F}\u{2C00}-\u{2FEF}\u{3001}-\u{D7FF}\u{F900}-\u{FDCF}\u{FDF0}-\u{FFFD}\u{10000}-\u{EFFFF}]*$",
    )
    .unwrap()
});

const RESERVED_NAMES: &[&str] = &[
    "annotation-xml",
    "color-profile",
    "font-face",
    "font-face-src",
    "font-face-uri",
    "font-face-format",
    "font-face-name",
    "missing-glyph",
];

pub fn is_custom_element_name(tag_name: &str) -> bool {
    if RESERVED_NAMES.contains(&tag_name) {
        return false;
    }

    if !tag_name.starts_with(|c: char| c.is_ascii_lowercase()) {
        return false;
    }

    if !tag_name.contains('-') {
        return false;
    }

    RE_PCEN_CHAR.is_match(tag_name)
}
