//! BCP 47 language tag validation.
//!
//! @see <https://tools.ietf.org/rfc/bcp/bcp47.html>

use language_tags::LanguageTag;

/// Checks whether a string is a valid BCP 47 language tag.
///
/// Accepts both normal language tags (e.g. "en", "en-US", "ja-JP")
/// and private use tags (e.g. "x-default", "x-custom").
pub fn is_bcp47(value: &str) -> bool {
    // Empty string is valid per HTML spec: lang="" means "language unknown"
    // Matches TS behavior: check('', 'BCP47').matched === true
    if value.is_empty() {
        return true;
    }
    value.parse::<LanguageTag>().is_ok()
}
