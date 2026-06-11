//! @see <https://tools.ietf.org/rfc/bcp/bcp47.html>

use language_tags::LanguageTag;

pub fn is_bcp47(value: &str) -> bool {
    // Empty string is valid per HTML spec: lang="" means "language unknown"
    // Matches TS behavior: check('', 'BCP47').matched === true
    if value.is_empty() {
        return true;
    }
    value.parse::<LanguageTag>().is_ok()
}
