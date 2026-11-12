//! Port of `packages/@markuplint/types/src/whatwg/check-http-equiv-refresh.ts`.

use crate::check::types::{CheckResult, Expect, ExpectType, Reason, UnmatchedOpts, matched, unmatched_with};

/// ASCII whitespace per Infra: TAB, LF, FF, CR, SPACE.
///
/// @see <https://infra.spec.whatwg.org/#ascii-whitespace>
fn is_ascii_whitespace(b: u8) -> bool {
    matches!(b, b'\t' | b'\n' | 0x0C | b'\r' | b' ')
}

fn expect(type_: ExpectType, value: &str) -> Expect {
    Expect {
        type_,
        value: value.to_owned(),
    }
}

fn fail(value: &str, reason: Reason, expects: Vec<Expect>) -> CheckResult {
    unmatched_with(
        value,
        reason,
        UnmatchedOpts {
            expects: Some(expects),
            ..Default::default()
        },
    )
}

/// Validates the `content` attribute value of `<meta http-equiv="refresh">` against the HTML
/// Living Standard "Refresh" conformance grammar (distinct from the more lenient parse algorithm
/// browsers use to execute the refresh):
///
/// 1. Optionally, ASCII whitespace.
/// 2. A valid non-negative integer.
/// 3. Optionally:
///    1. Either a ";" (U+003B) or a "," (U+002C).
///    2. Optionally, ASCII whitespace.
///    3. Either an ASCII case-insensitive match for "URL", followed by "=", followed by a valid
///       URL potentially surrounded by spaces; or a valid URL potentially surrounded by spaces.
///
/// A bare whitespace after the integer does not open clause 3: the grammar names the
/// punctuation. A tail that is not `URL=` is checked as a bare URL, which a relative URL such as
/// `href=http://example.com` is.
///
/// @see <https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh>
#[must_use]
pub fn check_http_equiv_refresh(value: &str) -> CheckResult {
    let bytes = value.as_bytes();
    let len = bytes.len();
    let mut i = 0;

    while i < len && is_ascii_whitespace(bytes[i]) {
        i += 1;
    }

    let digit_start = i;
    while i < len && bytes[i].is_ascii_digit() {
        i += 1;
    }
    if digit_start == i {
        return fail(
            value,
            Reason::SyntaxError,
            vec![expect(ExpectType::Format, "non-negative integer")],
        );
    }

    if i == len {
        return matched();
    }

    if bytes[i] != b';' && bytes[i] != b',' {
        return fail(
            value,
            Reason::UnexpectedToken,
            vec![expect(ExpectType::Const, ";"), expect(ExpectType::Const, ",")],
        );
    }
    i += 1;

    while i < len && is_ascii_whitespace(bytes[i]) {
        i += 1;
    }

    if i == len {
        return fail(value, Reason::MissingToken, vec![expect(ExpectType::Common, "URL")]);
    }

    let rest = &value[i..];
    let rest_bytes = rest.as_bytes();
    let url = if rest_bytes.len() >= 4 && rest_bytes[..3].eq_ignore_ascii_case(b"url") && rest_bytes[3] == b'=' {
        &rest[4..]
    } else {
        rest
    };

    if let CheckResult::Unmatched(result) = crate::check::custom::check_url(url) {
        return fail(value, result.reason, vec![expect(ExpectType::Common, "URL")]);
    }

    matched()
}
