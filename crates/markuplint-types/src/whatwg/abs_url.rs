//! @see <https://url.spec.whatwg.org/#syntax-url-absolute>

/// TS `isAbsURL`: `new URL(value)` succeeds without a base.
#[must_use]
pub fn is_abs_url(value: &str) -> bool {
    super::js_url::can_parse(value, None)
}
