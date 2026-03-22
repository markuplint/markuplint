//! MIME type validation.
//!
//! @see <https://mimesniff.spec.whatwg.org/#valid-mime-type>

/// Checks whether a string is a valid MIME type.
///
/// When `without_parameters` is true, also rejects MIME types with parameters.
pub fn is_valid_mime_type(value: &str, without_parameters: bool) -> bool {
    if value.is_empty() {
        return false;
    }
    let Ok(mime) = value.parse::<mime::Mime>() else {
        return false;
    };
    if without_parameters {
        // No parameters allowed: the value must equal the essence (type/subtype)
        return value.eq_ignore_ascii_case(mime.essence_str());
    }
    true
}
