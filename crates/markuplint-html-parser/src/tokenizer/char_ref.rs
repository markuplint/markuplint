//! Named and numeric character reference handling.
//!
//! Phase 4 will implement the full WHATWG named character reference table.
//! For now, only a small set of common references are supported.

/// Look up a named character reference.
/// Input should include the leading `&` and optional trailing `;`.
/// Returns the replacement character(s) if found.
#[must_use]
pub fn lookup_named(name: &str) -> Option<&'static [char]> {
    // Common HTML entities. Phase 4 will replace this with the full table.
    match name {
        "&amp;" => Some(&['&']),
        "&lt;" => Some(&['<']),
        "&gt;" => Some(&['>']),
        "&quot;" => Some(&['"']),
        "&apos;" => Some(&['\'']),
        "&nbsp;" => Some(&['\u{00A0}']),
        "&copy;" => Some(&['\u{00A9}']),
        "&reg;" => Some(&['\u{00AE}']),
        "&trade;" => Some(&['\u{2122}']),
        "&hellip;" => Some(&['\u{2026}']),
        "&mdash;" => Some(&['\u{2014}']),
        "&ndash;" => Some(&['\u{2013}']),
        "&laquo;" => Some(&['\u{00AB}']),
        "&raquo;" => Some(&['\u{00BB}']),
        "&lsquo;" => Some(&['\u{2018}']),
        "&rsquo;" => Some(&['\u{2019}']),
        "&ldquo;" => Some(&['\u{201C}']),
        "&rdquo;" => Some(&['\u{201D}']),
        _ => None,
    }
}
