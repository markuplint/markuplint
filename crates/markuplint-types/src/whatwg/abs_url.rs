//! @see <https://url.spec.whatwg.org/#syntax-url-absolute>

pub fn is_abs_url(value: &str) -> bool {
    url::Url::parse(value).is_ok()
}
