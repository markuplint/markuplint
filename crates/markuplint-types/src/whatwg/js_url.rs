//! JS `URL.canParse()` / `new URL()` as Node.js answers it, on top of the `url` crate.
//!
//! The TS package asks the JS `URL` parser (ada, in Node.js) whether a value parses; the `url`
//! crate is the WHATWG URL parser here. The two agree except in one place this module corrects:
//! ada takes a host that is ASCII after percent-decoding through a fast path that only
//! lower-cases it and rejects the forbidden domain code points, so it never decodes an `xn--`
//! label and accepts one that is not valid Punycode (`http://xn--zz.com`). The `url` crate runs
//! every host through UTS #46, which decodes the label and fails. A host with a non-ASCII code
//! point goes through UTS #46 in both, and both reject the label.
//!
//! @see <https://url.spec.whatwg.org/#concept-domain-to-ascii>

use std::fmt::Write as _;

use url::{ParseError, Url};

/// The special schemes of URL LS §4.2.
const SPECIAL_SCHEMES: [&str; 6] = ["ftp", "file", "http", "https", "ws", "wss"];

/// JS `URL.canParse(value)` (`base` `None`) or `URL.canParse(value, base)`.
#[must_use]
pub fn can_parse(value: &str, base: Option<&Url>) -> bool {
    let parse = |input: &str| Url::options().base_url(base).parse(input);
    match parse(value) {
        Ok(_) => true,
        Err(ParseError::IdnaError) => {
            let input = preprocess(value);
            let Some((start, end)) = host_range(&input, base) else {
                return false;
            };
            let Some(host) = ascii_host_without_punycode(&input[start..end]) else {
                return false;
            };
            let retried = format!("{}{host}{}", &input[..start], &input[end..]);
            parse(&retried).is_ok()
        }
        Err(_) => false,
    }
}

/// The input as the basic URL parser reads it: without leading and trailing C0 controls and
/// spaces, and without ASCII tab or newline.
///
/// @see <https://url.spec.whatwg.org/#concept-basic-url-parser>
fn preprocess(value: &str) -> String {
    value
        .trim_matches(|c: char| c <= ' ')
        .chars()
        .filter(|c| !matches!(c, '\t' | '\n' | '\r'))
        .collect()
}

fn is_slash(c: u8) -> bool {
    c == b'/' || c == b'\\'
}

/// The byte range of the host of a special URL in the preprocessed input, following the scheme,
/// relative and authority states of the basic URL parser; `None` when the input has no host that
/// goes through the domain-to-ASCII step.
fn host_range(input: &str, base: Option<&Url>) -> Option<(usize, usize)> {
    let bytes = input.as_bytes();
    let scheme_end = input.find(':').filter(|&i| {
        let scheme = &bytes[..i];
        scheme.first().is_some_and(u8::is_ascii_alphabetic)
            && scheme
                .iter()
                .all(|&b| b.is_ascii_alphanumeric() || matches!(b, b'+' | b'-' | b'.'))
    });
    let authority_start = if let Some(scheme_end) = scheme_end {
        let scheme = input[..scheme_end].to_ascii_lowercase();
        if !SPECIAL_SCHEMES.contains(&scheme.as_str()) {
            return None;
        }
        let rest = &bytes[scheme_end + 1..];
        if scheme == "file" {
            // file state → file slash state → file host state
            if !(rest.len() >= 2 && is_slash(rest[0]) && is_slash(rest[1])) {
                return None;
            }
            let start = scheme_end + 3;
            let end = start
                + bytes[start..]
                    .iter()
                    .position(|&b| is_slash(b) || b == b'?' || b == b'#')
                    .unwrap_or(bytes.len() - start);
            let buffer = &bytes[start..end];
            let windows_drive_letter =
                buffer.len() == 2 && buffer[0].is_ascii_alphabetic() && matches!(buffer[1], b':' | b'|');
            return (!windows_drive_letter && start < end).then_some((start, end));
        }
        let same_scheme_as_base = base.is_some_and(|b| b.scheme() == scheme);
        if same_scheme_as_base && !(rest.len() >= 2 && is_slash(rest[0]) && is_slash(rest[1])) {
            // special relative or authority state → relative state: a path
            return None;
        }
        scheme_end + 1
    } else {
        // relative state, against a special base
        if !base.is_some_and(|b| SPECIAL_SCHEMES.contains(&b.scheme())) {
            return None;
        }
        if !(bytes.len() >= 2 && is_slash(bytes[0]) && is_slash(bytes[1])) {
            return None;
        }
        0
    };
    // special authority ignore slashes state
    let start = authority_start + bytes[authority_start..].iter().take_while(|&&b| is_slash(b)).count();
    // authority state
    let end = start
        + bytes[start..]
            .iter()
            .position(|&b| is_slash(b) || b == b'?' || b == b'#')
            .unwrap_or(bytes.len() - start);
    let host_start = input[start..end].rfind('@').map_or(start, |at| start + at + 1);
    // host state: up to a `:` outside `[` `]`
    let mut inside_brackets = false;
    let mut host_end = end;
    for (i, &b) in bytes[host_start..end].iter().enumerate() {
        match b {
            b'[' => inside_brackets = true,
            b']' => inside_brackets = false,
            b':' if !inside_brackets => {
                host_end = host_start + i;
                break;
            }
            _ => {}
        }
    }
    (host_start < host_end).then_some((host_start, host_end))
}

/// The host as ada's ASCII fast path sees it, re-encoded for the `url` crate with each `xn--`
/// label prefix replaced, so that the label is not decoded as Punycode; `None` when the host is
/// not ASCII after percent-decoding (UTS #46 then runs in ada too).
fn ascii_host_without_punycode(raw: &str) -> Option<String> {
    let bytes = raw.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        let hex = |b: u8| char::from(b).to_digit(16);
        if bytes[i] == b'%'
            && let (Some(Some(hi)), Some(Some(lo))) =
                (bytes.get(i + 1).map(|&b| hex(b)), bytes.get(i + 2).map(|&b| hex(b)))
        {
            // `hi * 16 + lo` is at most 0xFF.
            #[allow(clippy::cast_possible_truncation)]
            decoded.push((hi * 16 + lo) as u8);
            i += 3;
        } else {
            decoded.push(bytes[i]);
            i += 1;
        }
    }
    if !decoded.is_ascii() {
        return None;
    }
    let lower = String::from_utf8(decoded).ok()?.to_ascii_lowercase();
    let mut out = String::with_capacity(lower.len());
    for (n, label) in lower.split('.').enumerate() {
        if n > 0 {
            out.push('.');
        }
        let label = label
            .strip_prefix("xn--")
            .map_or_else(|| label.to_owned(), |rest| format!("xn-a{rest}"));
        for b in label.bytes() {
            if b.is_ascii_alphanumeric() || b == b'-' {
                out.push(char::from(b));
            } else {
                let _ = write!(out, "%{b:02X}");
            }
        }
    }
    Some(out)
}
