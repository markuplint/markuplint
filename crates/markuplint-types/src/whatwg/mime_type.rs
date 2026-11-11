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

/// TS `checkMIMEType({ withoutParameters })` (`whatwg/check-mime-type.ts`).
#[must_use]
pub fn check_mime_type(value: &str, without_parameters: bool) -> crate::check::types::CheckResult {
    use crate::check::types::{Expect, ExpectType, Reason, UnmatchedOpts, matched, unmatched_with};
    if is_valid_mime_type(value, without_parameters) {
        return matched();
    }
    let reason = if value.is_empty() {
        Reason::EmptyToken
    } else {
        Reason::SyntaxError
    };
    unmatched_with(
        value,
        reason,
        UnmatchedOpts {
            expects: Some(vec![Expect {
                type_: ExpectType::Format,
                value: if without_parameters {
                    "MIME Type with no parameters".to_owned()
                } else {
                    "MIME Type".to_owned()
                },
            }]),
            ..Default::default()
        },
    )
}
