//! Port of `packages/@markuplint/types/src/whatwg/is-custom-element-name.ts`.
//!
//! <https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name>

/// The names a custom element name must not be.
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

/// Characters that make a name fail "valid element local name" when its first code point is an
/// ASCII alpha (the only case here: a custom element name starts with an ASCII lower alpha, so the
/// branch for `:`, `_` and U+0080 and above is never reached).
///
/// > If name contains ASCII whitespace, U+0000 NULL, U+002F (/), or U+003E (>), then return false.
///
/// <https://dom.spec.whatwg.org/#valid-element-local-name>
const FORBIDDEN_IN_LOCAL_NAME: [char; 8] = ['\t', '\n', '\u{000C}', '\r', ' ', '\0', '/', '>'];

/// TS `isCustomElementName()`.
///
/// > A string name is a valid custom element name if all of the following are true: name is a
/// > valid element local name; name's 0th code point is an ASCII lower alpha; name does not contain
/// > any ASCII upper alphas; name contains a U+002D (-); and name is not one of the following: […]
///
/// # Examples
///
/// ```
/// use markuplint_types::whatwg::custom_element_name::is_custom_element_name;
///
/// assert!(is_custom_element_name("my-element"));
/// assert!(!is_custom_element_name("font-face"));
/// ```
#[must_use]
pub fn is_custom_element_name(tag_name: &str) -> bool {
    if RESERVED_NAMES.contains(&tag_name) {
        return false;
    }
    if !tag_name.starts_with(|c: char| c.is_ascii_lowercase()) {
        return false;
    }
    if tag_name.contains(|c: char| c.is_ascii_uppercase()) {
        return false;
    }
    if !tag_name.contains('-') {
        return false;
    }
    !tag_name.contains(FORBIDDEN_IN_LOCAL_NAME)
}
