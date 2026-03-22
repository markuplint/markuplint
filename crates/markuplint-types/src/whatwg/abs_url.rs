//! Absolute URL validation.
//!
//! @see <https://url.spec.whatwg.org/#syntax-url-absolute>

/// Checks whether a string is a valid absolute URL per the WHATWG URL Standard.
pub fn is_abs_url(value: &str) -> bool {
    url::Url::parse(value).is_ok()
}
