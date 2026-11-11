//! Port of `packages/@markuplint/types/src/whatwg/check-url.ts`: the validation errors of the URL
//! Living Standard.
//!
//! TS runs a sequence of regular expressions over the value and then asks `URL.canParse()`. The
//! regular expressions are rewritten here as code with the same result (several of them use a
//! lookahead, which the `regex` crate lacks), and the `url` crate — a WHATWG URL parser —
//! stands in for `URL.canParse()`.

use crate::check::types::{CheckResult, Reason, matched, unmatched};

/// TS `DUMMY_BASE`: the base a relative URL is resolved against. Only the syntax is validated, so
/// the actual base URL is irrelevant (nu-html-checker resolves against a dummy base too).
const DUMMY_BASE: &str = "http://example.org/foo/bar";

/// The special schemes of URL LS §4.2.
///
/// @see <https://url.spec.whatwg.org/#special-scheme>
const SPECIAL_SCHEMES: [&str; 6] = ["ftp", "file", "http", "https", "ws", "wss"];

/// TS `SPECIAL_SCHEME_PREFIX` (`/^(?:ftp|file|https?|wss?):/i`): the rest of the value after the
/// special scheme and its `:`, or `None` when the value does not start with one.
fn after_special_scheme(value: &str) -> Option<&str> {
    let (scheme, rest) = value.split_once(':')?;
    SPECIAL_SCHEMES
        .iter()
        .any(|s| s.eq_ignore_ascii_case(scheme))
        .then_some(rest)
}

/// The rest of the value after a URL scheme (`/^[a-z][a-z0-9+.-]*:/i`) and its `:`, or `None`
/// when the value does not start with a scheme.
fn after_any_scheme(value: &str) -> Option<&str> {
    let (scheme, rest) = value.split_once(':')?;
    let mut chars = scheme.chars();
    let first = chars.next()?;
    (first.is_ascii_alphabetic() && chars.all(|c| c.is_ascii_alphanumeric() || matches!(c, '+' | '.' | '-')))
        .then_some(rest)
}

/// TS `SPECIAL_SCHEME_MISSING_SOLIDUS` (`/^(?:ftp|file|https?|wss?):(?!\/\/)/i`): a special
/// scheme not followed by `//` (`http:foo`, `file:/foo`, `file:`).
///
/// @see <https://url.spec.whatwg.org/#special-scheme-missing-following-solidus>
fn special_scheme_missing_solidus(value: &str) -> bool {
    after_special_scheme(value).is_some_and(|rest| !rest.starts_with("//"))
}

/// TS `SPECIAL_SCHEME_SINGLE_SLASH` (`/^(?:ftp|file|https?|wss?):\/(?!\/)/i`): a special scheme
/// followed by a single `/`.
///
/// @see <https://url.spec.whatwg.org/#special-scheme-missing-following-solidus>
fn special_scheme_single_slash(value: &str) -> bool {
    after_special_scheme(value).is_some_and(|rest| rest.starts_with('/') && !rest.starts_with("//"))
}

/// The authority of a URL whose value starts with an optional scheme and `//`: everything up to
/// the first `/`, `?` or `#` after the `//`, and the rest of the value after it. `special_only`
/// limits the scheme to the special schemes.
///
/// TS `/^(?:(?:ftp|file|https?|wss?):)?\/\/[^/?#]*/i` and `/^(?:[a-z][a-z0-9+.-]*:)?\/\/([^/?#]*)/i`.
/// A scheme cannot contain `:` or `/`, so when a scheme precedes the `//`, the regex has only the
/// one way to match.
fn split_authority(value: &str, special_only: bool) -> Option<(&str, &str)> {
    let after_scheme = if special_only {
        after_special_scheme(value)
    } else {
        after_any_scheme(value)
    };
    let after_slashes = after_scheme.unwrap_or(value).strip_prefix("//")?;
    let end = after_slashes.find(['/', '?', '#']).unwrap_or(after_slashes.len());
    Some(after_slashes.split_at(end))
}

/// TS `SPECIAL_SCHEME_AUTHORITY_HAS_AT_SIGN`: a special-scheme or scheme-relative URL whose
/// authority contains `@`, i.e. declares userinfo, even an empty one (`http://@host`).
///
/// @see <https://url.spec.whatwg.org/#invalid-credentials>
fn special_scheme_authority_has_at_sign(value: &str) -> bool {
    split_authority(value, true).is_some_and(|(authority, _)| authority.contains('@'))
}

/// TS `MULTIPLE_HASH` (`/#.*#/`): two `#` with no line terminator between them (`.` without the
/// `s` flag does not match U+000A, U+000D, U+2028 or U+2029).
///
/// @see <https://url.spec.whatwg.org/#invalid-url-unit>
fn multiple_hash(value: &str) -> bool {
    value
        .split(['\n', '\r', '\u{2028}', '\u{2029}'])
        .any(|line| line.matches('#').count() >= 2)
}

/// TS `hasBracketsOutsideHost`: `[` or `]` anywhere but the authority, the only position where
/// they are URL code points (delimiting an IPv6 host).
///
/// @see <https://url.spec.whatwg.org/#invalid-url-unit>
/// @see <https://url.spec.whatwg.org/#url-code-points>
fn has_brackets_outside_host(value: &str) -> bool {
    let without_authority = split_authority(value, false).map_or(value, |(_, rest)| rest);
    without_authority.contains(['[', ']'])
}

/// TS `DATA_URL_MISSING_COMMA` (`/^data:[^,]*$/i`): a `data:` URL with no `,` separator, which
/// RFC 2397 requires.
///
/// @see <https://datatracker.ietf.org/doc/html/rfc2397>
fn data_url_missing_comma(value: &str) -> bool {
    value
        .get(..5)
        .is_some_and(|scheme| scheme.eq_ignore_ascii_case("data:"))
        && !value[5..].contains(',')
}

/// TS `FILE_WINDOWS_DRIVE_LETTER_WITH_BAR` (`/^file:\/{0,3}[a-z]\|/i`): a Windows drive letter
/// written with `|` instead of `:` (`file:///C|/foo`).
///
/// @see <https://url.spec.whatwg.org/#file-invalid-windows-drive-letter>
fn file_windows_drive_letter_with_bar(value: &str) -> bool {
    let Some(rest) = value
        .get(..5)
        .filter(|s| s.eq_ignore_ascii_case("file:"))
        .map(|_| &value[5..])
    else {
        return false;
    };
    let rest = rest.trim_start_matches('/');
    let slashes = value.len() - 5 - rest.len();
    let bytes = rest.as_bytes();
    slashes <= 3 && bytes.len() >= 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b'|'
}

/// TS `ILLEGAL_WHITESPACE` (`/[\t\n\r]/`): tab and newlines, which the parser strips but which
/// are validation errors.
///
/// @see <https://url.spec.whatwg.org/#url-code-points>
fn has_illegal_whitespace(value: &str) -> bool {
    value.contains(['\t', '\n', '\r'])
}

/// TS `FORBIDDEN_CODE_POINT`: C0 controls other than TAB / LF / CR (and including U+000B and
/// U+000C), DEL, C1 controls, and the Unicode noncharacters.
///
/// @see <https://infra.spec.whatwg.org/#noncharacter>
/// @see <https://html.spec.whatwg.org/multipage/parsing.html#preprocessing-the-input-stream>
fn is_forbidden_code_point(c: char) -> bool {
    let cp = u32::from(c);
    matches!(cp, 0x00..=0x08 | 0x0B | 0x0E..=0x1F | 0x7F..=0x9F | 0xFDD0..=0xFDEF) || (cp & 0xFFFE) == 0xFFFE
}

/// TS `MALFORMED_PERCENT` (`/%(?![0-9A-F]{2})/i`): a `%` not followed by two hex digits.
fn has_malformed_percent(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.iter().enumerate().any(|(i, &b)| {
        b == b'%'
            && !(bytes.get(i + 1).is_some_and(u8::is_ascii_hexdigit)
                && bytes.get(i + 2).is_some_and(u8::is_ascii_hexdigit))
    })
}

/// TS `stripAsciiWhitespace`: strips TAB / LF / FF / CR / SPACE from both ends, and nothing else
/// (U+000B stays and is a forbidden code point).
///
/// @see <https://infra.spec.whatwg.org/#strip-leading-and-trailing-ascii-whitespace>
fn strip_ascii_whitespace(value: &str) -> &str {
    value.trim_matches(['\t', '\n', '\u{000C}', '\r', ' '])
}

/// TS `IPV4_NON_DECIMAL_PART` (`/^0(?:x[0-9a-f]*|\d+)$/i`): a host label in hex or leading-zero
/// octal notation.
///
/// @see <https://url.spec.whatwg.org/#ipv4-number-parser>
fn is_ipv4_non_decimal_part(label: &str) -> bool {
    let Some(rest) = label.strip_prefix('0') else {
        return false;
    };
    if let Some(hex) = rest.strip_prefix(['x', 'X']) {
        return hex.bytes().all(|b| b.is_ascii_hexdigit());
    }
    !rest.is_empty() && rest.bytes().all(|b| b.is_ascii_digit())
}

/// TS `IPV4_LAST_PART_NUMERIC` (`/^(?:\d+|0x[0-9a-f]*)$/i`): a host label that "ends in a
/// number".
///
/// @see <https://url.spec.whatwg.org/#ends-in-a-number-checker>
fn is_ipv4_numeric_part(label: &str) -> bool {
    if !label.is_empty() && label.bytes().all(|b| b.is_ascii_digit()) {
        return true;
    }
    label
        .strip_prefix("0x")
        .or_else(|| label.strip_prefix("0X"))
        .is_some_and(|hex| hex.bytes().all(|b| b.is_ascii_hexdigit()))
}

/// TS `extractRawHost`: the raw (pre-percent-decode, pre-IDNA) host of the authority, or `None`
/// when there is no authority or the host is empty or an IPv6 literal.
fn extract_raw_host(value: &str) -> Option<&str> {
    let (authority, _) = split_authority(value, false)?;
    let host = authority.rfind('@').map_or(authority, |at| &authority[at + 1..]);
    if host.is_empty() || host.starts_with('[') {
        return None;
    }
    Some(host.find(':').map_or(host, |port| &host[..port]))
}

/// JS `decodeURIComponent`: `None` where it throws (a `%` not followed by two hex digits, or bytes
/// that are not UTF-8).
fn decode_uri_component(value: &str) -> Option<String> {
    let bytes = value.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            let hex = value.get(i + 1..i + 3)?;
            out.push(
                u8::from_str_radix(hex, 16)
                    .ok()
                    .filter(|_| hex.bytes().all(|b| b.is_ascii_hexdigit()))?,
            );
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).ok()
}

/// TS `hasIPv4NonDecimalPart`: a host label in hex / octal notation, detected before the URL
/// parser normalizes it away (`http://192.0x00A80001`).
///
/// TS folds the host with `String.prototype.normalize('NFKC')`; [`nfkc::fold`] has the same
/// effect on what this check reads.
///
/// @see <https://url.spec.whatwg.org/#concept-host-parser>
/// @see <https://url.spec.whatwg.org/#concept-ipv4-parser>
fn has_ipv4_non_decimal_part(value: &str) -> bool {
    let Some(raw_host) = extract_raw_host(value) else {
        return false;
    };
    let Some(decoded) = decode_uri_component(raw_host) else {
        return false;
    };
    let host = nfkc::fold(&decoded);
    let mut labels: Vec<&str> = host.split('.').collect();
    if labels.len() > 1 && labels.last() == Some(&"") {
        labels.pop();
    }
    let last = labels.last().copied().unwrap_or_default();
    if !is_ipv4_numeric_part(last) {
        return false;
    }
    labels.iter().any(|label| is_ipv4_non_decimal_part(label))
}

/// TS `isSpecialOrSchemeless`: an explicit special scheme, or no scheme at all (a relative URL,
/// which in an HTML attribute resolves against an overwhelmingly special-scheme base).
///
/// @see <https://url.spec.whatwg.org/#special-scheme>
fn is_special_or_schemeless(value: &str) -> bool {
    after_special_scheme(value).is_some() || after_any_scheme(value).is_none()
}

/// JS `URL.canParse(value)` / `URL.canParse(value, DUMMY_BASE)`.
fn can_parse(value: &str) -> bool {
    if super::js_url::can_parse(value, None) {
        return true;
    }
    let Ok(base) = url::Url::parse(DUMMY_BASE) else {
        return false;
    };
    super::js_url::can_parse(value, Some(&base))
}

/// TS `checkURL()`: a valid URL potentially surrounded by spaces, absolute or relative, with the
/// URL LS validation errors the parser silently auto-corrects reported.
///
/// Every failure is `unmatched(trimmed, 'unexpected-token')`: the whole value without the
/// surrounding ASCII whitespace, at offset 0.
///
/// @see <https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces>
/// @see <https://url.spec.whatwg.org/#url-parsing>
#[must_use]
pub fn check_url(value: &str) -> CheckResult {
    let trimmed = strip_ascii_whitespace(value);

    // The empty string resolves to the document's URL.
    if trimmed.is_empty() {
        return matched();
    }

    let special_or_schemeless = is_special_or_schemeless(trimmed);
    let invalid = has_illegal_whitespace(trimmed)
        || trimmed.chars().any(is_forbidden_code_point)
        || has_malformed_percent(trimmed)
        || trimmed.contains(' ')
        || special_scheme_missing_solidus(trimmed)
        || special_scheme_single_slash(trimmed)
        || file_windows_drive_letter_with_bar(trimmed)
        // invalid-reverse-solidus: non-special schemes allow `\` in their opaque path.
        || (special_or_schemeless && trimmed.contains('\\'))
        || special_scheme_authority_has_at_sign(trimmed)
        // Non-special schemes treat an extra `#` as their own data.
        || (special_or_schemeless && multiple_hash(trimmed))
        || has_brackets_outside_host(trimmed)
        || data_url_missing_comma(trimmed)
        // Only a special-scheme host goes through the IPv4 parser.
        || (special_or_schemeless && has_ipv4_non_decimal_part(trimmed))
        || !can_parse(trimmed);

    if invalid {
        return unmatched(trimmed, Reason::UnexpectedToken);
    }
    matched()
}

/// The part of Unicode NFKC that [`has_ipv4_non_decimal_part`] can observe.
///
/// That check splits the host on `.` and tests each label against ASCII-only patterns over
/// `[0-9A-Fa-fXx]`. A label that keeps a non-ASCII character never matches, and composition
/// never produces an ASCII character, so the result changes only through the code points whose
/// NFKC mapping is ASCII and contains one of `0-9 A-F a-f X x .`. Those are listed here,
/// generated from Node.js `String.prototype.normalize('NFKC')` over every code point.
mod nfkc {
    /// A run of code points that each map to one ASCII character, consecutive from the third
    /// field.
    const RANGES: &[(u32, u32, u8)] = &[
        (0xAA, 0xAA, b'a'),
        (0xB2, 0xB3, b'2'),
        (0xB9, 0xB9, b'1'),
        (0x2E3, 0x2E3, b'x'),
        (0x1D2C, 0x1D2C, b'A'),
        (0x1D2E, 0x1D2E, b'B'),
        (0x1D30, 0x1D31, b'D'),
        (0x1D43, 0x1D43, b'a'),
        (0x1D47, 0x1D47, b'b'),
        (0x1D48, 0x1D49, b'd'),
        (0x1D9C, 0x1D9C, b'c'),
        (0x1DA0, 0x1DA0, b'f'),
        (0x2024, 0x2024, b'.'),
        (0x2070, 0x2070, b'0'),
        (0x2074, 0x2079, b'4'),
        (0x2080, 0x2089, b'0'),
        (0x2090, 0x2090, b'a'),
        (0x2091, 0x2091, b'e'),
        (0x2093, 0x2093, b'x'),
        (0x2102, 0x2102, b'C'),
        (0x212C, 0x212D, b'B'),
        (0x212F, 0x212F, b'e'),
        (0x2130, 0x2131, b'E'),
        (0x2145, 0x2145, b'D'),
        (0x2146, 0x2147, b'd'),
        (0x2169, 0x2169, b'X'),
        (0x216D, 0x216E, b'C'),
        (0x2179, 0x2179, b'x'),
        (0x217D, 0x217E, b'c'),
        (0x2460, 0x2468, b'1'),
        (0x24B6, 0x24BB, b'A'),
        (0x24CD, 0x24CD, b'X'),
        (0x24D0, 0x24D5, b'a'),
        (0x24E7, 0x24E7, b'x'),
        (0x24EA, 0x24EA, b'0'),
        (0xA7F2, 0xA7F2, b'C'),
        (0xA7F3, 0xA7F3, b'F'),
        (0xFE52, 0xFE52, b'.'),
        (0xFF0E, 0xFF0E, b'.'),
        (0xFF10, 0xFF19, b'0'),
        (0xFF21, 0xFF26, b'A'),
        (0xFF38, 0xFF38, b'X'),
        (0xFF41, 0xFF46, b'a'),
        (0xFF58, 0xFF58, b'x'),
        (0x1CCD6, 0x1CCDB, b'A'),
        (0x1CCED, 0x1CCED, b'X'),
        (0x1CCF0, 0x1CCF9, b'0'),
        (0x1D400, 0x1D405, b'A'),
        (0x1D417, 0x1D417, b'X'),
        (0x1D41A, 0x1D41F, b'a'),
        (0x1D431, 0x1D431, b'x'),
        (0x1D434, 0x1D439, b'A'),
        (0x1D44B, 0x1D44B, b'X'),
        (0x1D44E, 0x1D453, b'a'),
        (0x1D465, 0x1D465, b'x'),
        (0x1D468, 0x1D46D, b'A'),
        (0x1D47F, 0x1D47F, b'X'),
        (0x1D482, 0x1D487, b'a'),
        (0x1D499, 0x1D499, b'x'),
        (0x1D49C, 0x1D49C, b'A'),
        (0x1D49E, 0x1D49F, b'C'),
        (0x1D4B3, 0x1D4B3, b'X'),
        (0x1D4B6, 0x1D4B9, b'a'),
        (0x1D4BB, 0x1D4BB, b'f'),
        (0x1D4CD, 0x1D4CD, b'x'),
        (0x1D4D0, 0x1D4D5, b'A'),
        (0x1D4E7, 0x1D4E7, b'X'),
        (0x1D4EA, 0x1D4EF, b'a'),
        (0x1D501, 0x1D501, b'x'),
        (0x1D504, 0x1D505, b'A'),
        (0x1D507, 0x1D509, b'D'),
        (0x1D51B, 0x1D51B, b'X'),
        (0x1D51E, 0x1D523, b'a'),
        (0x1D535, 0x1D535, b'x'),
        (0x1D538, 0x1D539, b'A'),
        (0x1D53B, 0x1D53D, b'D'),
        (0x1D54F, 0x1D54F, b'X'),
        (0x1D552, 0x1D557, b'a'),
        (0x1D569, 0x1D569, b'x'),
        (0x1D56C, 0x1D571, b'A'),
        (0x1D583, 0x1D583, b'X'),
        (0x1D586, 0x1D58B, b'a'),
        (0x1D59D, 0x1D59D, b'x'),
        (0x1D5A0, 0x1D5A5, b'A'),
        (0x1D5B7, 0x1D5B7, b'X'),
        (0x1D5BA, 0x1D5BF, b'a'),
        (0x1D5D1, 0x1D5D1, b'x'),
        (0x1D5D4, 0x1D5D9, b'A'),
        (0x1D5EB, 0x1D5EB, b'X'),
        (0x1D5EE, 0x1D5F3, b'a'),
        (0x1D605, 0x1D605, b'x'),
        (0x1D608, 0x1D60D, b'A'),
        (0x1D61F, 0x1D61F, b'X'),
        (0x1D622, 0x1D627, b'a'),
        (0x1D639, 0x1D639, b'x'),
        (0x1D63C, 0x1D641, b'A'),
        (0x1D653, 0x1D653, b'X'),
        (0x1D656, 0x1D65B, b'a'),
        (0x1D66D, 0x1D66D, b'x'),
        (0x1D670, 0x1D675, b'A'),
        (0x1D687, 0x1D687, b'X'),
        (0x1D68A, 0x1D68F, b'a'),
        (0x1D6A1, 0x1D6A1, b'x'),
        (0x1D7CE, 0x1D7D7, b'0'),
        (0x1D7D8, 0x1D7E1, b'0'),
        (0x1D7E2, 0x1D7EB, b'0'),
        (0x1D7EC, 0x1D7F5, b'0'),
        (0x1D7F6, 0x1D7FF, b'0'),
        (0x1F12B, 0x1F12B, b'C'),
        (0x1F130, 0x1F135, b'A'),
        (0x1F147, 0x1F147, b'X'),
        (0x1FBF0, 0x1FBF9, b'0'),
    ];

    /// Code points that map to more than one ASCII character.
    const STRINGS: &[(u32, &str)] = &[
        (0x1F1, "DZ"),
        (0x1F2, "Dz"),
        (0x1F3, "dz"),
        (0x2025, ".."),
        (0x2026, "..."),
        (0x2100, "a/c"),
        (0x2101, "a/s"),
        (0x2105, "c/o"),
        (0x2106, "c/u"),
        (0x2121, "TEL"),
        (0x213B, "FAX"),
        (0x2168, "IX"),
        (0x216A, "XI"),
        (0x216B, "XII"),
        (0x2178, "ix"),
        (0x217A, "xi"),
        (0x217B, "xii"),
        (0x2469, "10"),
        (0x246A, "11"),
        (0x246B, "12"),
        (0x246C, "13"),
        (0x246D, "14"),
        (0x246E, "15"),
        (0x246F, "16"),
        (0x2470, "17"),
        (0x2471, "18"),
        (0x2472, "19"),
        (0x2473, "20"),
        (0x2474, "(1)"),
        (0x2475, "(2)"),
        (0x2476, "(3)"),
        (0x2477, "(4)"),
        (0x2478, "(5)"),
        (0x2479, "(6)"),
        (0x247A, "(7)"),
        (0x247B, "(8)"),
        (0x247C, "(9)"),
        (0x247D, "(10)"),
        (0x247E, "(11)"),
        (0x247F, "(12)"),
        (0x2480, "(13)"),
        (0x2481, "(14)"),
        (0x2482, "(15)"),
        (0x2483, "(16)"),
        (0x2484, "(17)"),
        (0x2485, "(18)"),
        (0x2486, "(19)"),
        (0x2487, "(20)"),
        (0x2488, "1."),
        (0x2489, "2."),
        (0x248A, "3."),
        (0x248B, "4."),
        (0x248C, "5."),
        (0x248D, "6."),
        (0x248E, "7."),
        (0x248F, "8."),
        (0x2490, "9."),
        (0x2491, "10."),
        (0x2492, "11."),
        (0x2493, "12."),
        (0x2494, "13."),
        (0x2495, "14."),
        (0x2496, "15."),
        (0x2497, "16."),
        (0x2498, "17."),
        (0x2499, "18."),
        (0x249A, "19."),
        (0x249B, "20."),
        (0x249C, "(a)"),
        (0x249D, "(b)"),
        (0x249E, "(c)"),
        (0x249F, "(d)"),
        (0x24A0, "(e)"),
        (0x24A1, "(f)"),
        (0x24B3, "(x)"),
        (0x3250, "PTE"),
        (0x3251, "21"),
        (0x3252, "22"),
        (0x3253, "23"),
        (0x3254, "24"),
        (0x3255, "25"),
        (0x3256, "26"),
        (0x3257, "27"),
        (0x3258, "28"),
        (0x3259, "29"),
        (0x325A, "30"),
        (0x325B, "31"),
        (0x325C, "32"),
        (0x325D, "33"),
        (0x325E, "34"),
        (0x325F, "35"),
        (0x32B1, "36"),
        (0x32B2, "37"),
        (0x32B3, "38"),
        (0x32B4, "39"),
        (0x32B5, "40"),
        (0x32B6, "41"),
        (0x32B7, "42"),
        (0x32B8, "43"),
        (0x32B9, "44"),
        (0x32BA, "45"),
        (0x32BB, "46"),
        (0x32BC, "47"),
        (0x32BD, "48"),
        (0x32BE, "49"),
        (0x32BF, "50"),
        (0x32CD, "erg"),
        (0x32CE, "eV"),
        (0x32CF, "LTD"),
        (0x3371, "hPa"),
        (0x3372, "da"),
        (0x3373, "AU"),
        (0x3374, "bar"),
        (0x3376, "pc"),
        (0x3377, "dm"),
        (0x3378, "dm2"),
        (0x3379, "dm3"),
        (0x3380, "pA"),
        (0x3381, "nA"),
        (0x3383, "mA"),
        (0x3384, "kA"),
        (0x3385, "KB"),
        (0x3386, "MB"),
        (0x3387, "GB"),
        (0x3388, "cal"),
        (0x3389, "kcal"),
        (0x338A, "pF"),
        (0x338B, "nF"),
        (0x3397, "dl"),
        (0x3399, "fm"),
        (0x339D, "cm"),
        (0x339F, "mm2"),
        (0x33A0, "cm2"),
        (0x33A1, "m2"),
        (0x33A2, "km2"),
        (0x33A3, "mm3"),
        (0x33A4, "cm3"),
        (0x33A5, "m3"),
        (0x33A6, "km3"),
        (0x33A9, "Pa"),
        (0x33AA, "kPa"),
        (0x33AB, "MPa"),
        (0x33AC, "GPa"),
        (0x33AD, "rad"),
        (0x33C2, "a.m."),
        (0x33C3, "Bq"),
        (0x33C4, "cc"),
        (0x33C5, "cd"),
        (0x33C7, "Co."),
        (0x33C8, "dB"),
        (0x33CA, "ha"),
        (0x33D3, "lx"),
        (0x33D4, "mb"),
        (0x33D8, "p.m."),
        (0x33DD, "Wb"),
        (0x33FF, "gal"),
        (0xFB00, "ff"),
        (0xFB01, "fi"),
        (0xFB02, "fl"),
        (0xFB03, "ffi"),
        (0xFB04, "ffl"),
        (0xFE19, "..."),
        (0xFE30, ".."),
        (0x1F100, "0."),
        (0x1F101, "0,"),
        (0x1F102, "1,"),
        (0x1F103, "2,"),
        (0x1F104, "3,"),
        (0x1F105, "4,"),
        (0x1F106, "5,"),
        (0x1F107, "6,"),
        (0x1F108, "7,"),
        (0x1F109, "8,"),
        (0x1F10A, "9,"),
        (0x1F110, "(A)"),
        (0x1F111, "(B)"),
        (0x1F112, "(C)"),
        (0x1F113, "(D)"),
        (0x1F114, "(E)"),
        (0x1F115, "(F)"),
        (0x1F127, "(X)"),
        (0x1F12D, "CD"),
        (0x1F14C, "SD"),
        (0x1F14F, "WC"),
        (0x1F16A, "MC"),
        (0x1F16B, "MD"),
        (0x1F190, "DJ"),
    ];

    pub(super) fn fold(value: &str) -> String {
        let mut out = String::with_capacity(value.len());
        for c in value.chars() {
            let cp = u32::from(c);
            if cp < 0x80 {
                out.push(c);
            } else if let Some(&(start, _, first)) = RANGES.iter().find(|&&(start, end, _)| (start..=end).contains(&cp))
            {
                // `cp - start` is below the length of a range, which is below 256.
                #[allow(clippy::cast_possible_truncation)]
                out.push(char::from(first + (cp - start) as u8));
            } else if let Ok(i) = STRINGS.binary_search_by_key(&cp, |&(k, _)| k) {
                out.push_str(STRINGS[i].1);
            } else {
                out.push(c);
            }
        }
        out
    }
}
