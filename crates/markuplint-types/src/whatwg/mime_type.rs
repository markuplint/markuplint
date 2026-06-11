//! @see <https://mimesniff.spec.whatwg.org/#valid-mime-type>

pub fn is_valid_mime_type(value: &str, without_parameters: bool) -> bool {
    if value.is_empty() {
        return false;
    }
    let Ok(mime) = value.parse::<mime::Mime>() else {
        return false;
    };
    if without_parameters {
        // The essence is the bare type/subtype, so equality with it rejects any parameters.
        return value.eq_ignore_ascii_case(mime.essence_str());
    }
    true
}
