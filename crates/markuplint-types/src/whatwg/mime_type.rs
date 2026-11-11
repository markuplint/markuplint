//! Port of `packages/@markuplint/types/src/whatwg/check-mime-type.ts`, with the WHATWG MIME
//! Sniffing "parse a MIME type" algorithm that TS takes from `whatwg-mimetype` (`MIMEType.parse`).
//!
//! @see <https://mimesniff.spec.whatwg.org/#valid-mime-type>
//! @see <https://mimesniff.spec.whatwg.org/#parse-a-mime-type>

use std::rc::Rc;

use crate::check::types::{CheckResult, Expect, ExpectType, Reason, UnmatchedOpts, matched, unmatched_with};
use crate::token::Token;

/// The result of [`parse_mime_type`]: what `whatwg-mimetype`'s `MIMEType` exposes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MimeType {
    /// ASCII-lowercased type.
    pub type_: String,
    /// ASCII-lowercased subtype.
    pub subtype: String,
    /// The parameters in insertion order; a name appears once (the first occurrence wins).
    pub parameters: Vec<(String, String)>,
}

impl MimeType {
    /// `type "/" subtype`.
    #[must_use]
    pub fn essence(&self) -> String {
        format!("{}/{}", self.type_, self.subtype)
    }
}

/// HTTP whitespace: U+000A LF, U+000D CR, or an HTTP tab or space.
fn is_http_whitespace(c: char) -> bool {
    matches!(c, ' ' | '\t' | '\n' | '\r')
}

/// An HTTP token code point.
fn is_http_token_code_point(c: char) -> bool {
    c.is_ascii_alphanumeric() || "-!#$%&'*+.^_`|~".contains(c)
}

fn solely_http_token_code_points(s: &str) -> bool {
    s.chars().all(is_http_token_code_point)
}

/// An HTTP quoted-string token code point: U+0009 TAB, U+0020 SPACE to U+007E (~), or U+0080
/// to U+00FF.
fn solely_http_quoted_string_token_code_points(s: &str) -> bool {
    s.chars()
        .all(|c| matches!(c, '\t' | '\u{20}'..='\u{7E}' | '\u{80}'..='\u{FF}'))
}

/// "collect an HTTP quoted string" with the extract-value flag set. `position` is the byte index
/// of the opening `"`; returns the value and the byte index after it.
fn collect_http_quoted_string(input: &str, mut position: usize) -> (String, usize) {
    let bytes = input.as_bytes();
    let mut value = String::new();
    position += 1;
    loop {
        let start = position;
        while position < bytes.len() && bytes[position] != b'"' && bytes[position] != b'\\' {
            position += 1;
        }
        value.push_str(&input[start..position]);
        if position >= bytes.len() {
            break;
        }
        let quote_or_backslash = bytes[position];
        position += 1;
        if quote_or_backslash == b'\\' {
            let Some(c) = input[position..].chars().next() else {
                value.push('\\');
                break;
            };
            value.push(c);
            position += c.len_utf8();
        } else {
            break;
        }
    }
    (value, position)
}

/// The WHATWG MIME Sniffing "parse a MIME type" algorithm, as `whatwg-mimetype` 5 implements it.
/// `None` is failure.
#[must_use]
pub fn parse_mime_type(input: &str) -> Option<MimeType> {
    let input = input.trim_matches(is_http_whitespace);
    let bytes = input.as_bytes();

    let mut position = input.find('/').unwrap_or(input.len());
    let type_ = &input[..position];
    if type_.is_empty() || !solely_http_token_code_points(type_) {
        return None;
    }
    if position >= input.len() {
        return None;
    }
    // Skip past "/"
    position += 1;

    let subtype_start = position;
    position = input[position..].find(';').map_or(input.len(), |i| position + i);
    let subtype = input[subtype_start..position].trim_end_matches(is_http_whitespace);
    if subtype.is_empty() || !solely_http_token_code_points(subtype) {
        return None;
    }

    let mut mime_type = MimeType {
        type_: type_.to_ascii_lowercase(),
        subtype: subtype.to_ascii_lowercase(),
        parameters: Vec::new(),
    };

    while position < bytes.len() {
        // Skip past ";"
        position += 1;

        while position < bytes.len() && is_http_whitespace(char::from(bytes[position])) {
            position += 1;
        }

        let name_start = position;
        while position < bytes.len() && bytes[position] != b';' && bytes[position] != b'=' {
            position += 1;
        }
        let parameter_name = input[name_start..position].to_ascii_lowercase();

        if position < bytes.len() {
            if bytes[position] == b';' {
                continue;
            }
            // Skip past "="
            position += 1;
        }

        let parameter_value;
        if bytes.get(position) == Some(&b'"') {
            let (value, next) = collect_http_quoted_string(input, position);
            parameter_value = value;
            position = next;
            while position < bytes.len() && bytes[position] != b';' {
                position += 1;
            }
        } else {
            let value_start = position;
            while position < bytes.len() && bytes[position] != b';' {
                position += 1;
            }
            let value = input[value_start..position].trim_end_matches(is_http_whitespace);
            if value.is_empty() {
                continue;
            }
            parameter_value = value.to_owned();
        }

        if !parameter_name.is_empty()
            && solely_http_token_code_points(&parameter_name)
            && solely_http_quoted_string_token_code_points(&parameter_value)
            && !mime_type.parameters.iter().any(|(name, _)| *name == parameter_name)
        {
            mime_type.parameters.push((parameter_name, parameter_value));
        }
    }

    Some(mime_type)
}

/// The byte offset of the opening `"` of a quoted-string parameter value that has no closing
/// `"` (TS `findUnterminatedQuotedString`).
///
/// [RFC 9110 §5.6.6](https://www.rfc-editor.org/rfc/rfc9110#name-parameters) requires the closing
/// DQUOTE; the WHATWG parser tolerates its absence, so the parser cannot surface this error.
/// Like TS, the scan assumes the opening DQUOTE immediately follows the `=` byte.
fn find_unterminated_quoted_string(value: &str) -> Option<usize> {
    let bytes = value.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] != b';' {
            i += 1;
            continue;
        }
        i += 1;
        while i < bytes.len() && bytes[i] != b'=' && bytes[i] != b';' {
            i += 1;
        }
        if i >= bytes.len() || bytes[i] == b';' {
            continue;
        }
        i += 1;
        if i >= bytes.len() || bytes[i] != b'"' {
            continue;
        }
        let start = i;
        i += 1;
        let mut terminated = false;
        while i < bytes.len() {
            // A skipped byte that is not ASCII is a UTF-8 continuation or lead byte, which no
            // delimiter equals, so skipping two bytes acts as TS skipping two UTF-16 units.
            if bytes[i] == b'\\' {
                i += 2;
                continue;
            }
            if bytes[i] == b'"' {
                i += 1;
                terminated = true;
                break;
            }
            i += 1;
        }
        if !terminated {
            return Some(start);
        }
    }
    None
}

fn expects(without_parameters: bool) -> Vec<Expect> {
    vec![Expect {
        type_: ExpectType::Format,
        value: if without_parameters {
            "MIME Type with no parameters".to_owned()
        } else {
            "MIME Type".to_owned()
        },
    }]
}

/// TS `checkMIMEType({ withoutParameters })` (`whatwg/check-mime-type.ts`).
///
/// @see <https://mimesniff.spec.whatwg.org/#valid-mime-type>
/// @see <https://mimesniff.spec.whatwg.org/#valid-mime-type-with-no-parameters>
#[must_use]
pub fn check_mime_type(value: &str, without_parameters: bool) -> CheckResult {
    if value.is_empty() {
        return unmatched_with(
            value,
            Reason::EmptyToken,
            UnmatchedOpts {
                expects: Some(expects(without_parameters)),
                ..Default::default()
            },
        );
    }
    if let Some(offset) = find_unterminated_quoted_string(value) {
        return Token::new(&value[offset..], offset, Rc::from(value), &[]).unmatched_result(
            Some(Reason::SyntaxError),
            UnmatchedOpts {
                expects: Some(expects(without_parameters)),
                ..Default::default()
            },
        );
    }
    if let Some(mime_type) = parse_mime_type(value) {
        let essence = mime_type.essence();
        if value.to_lowercase() == essence {
            return matched();
        }
        if !without_parameters && !mime_type.parameters.is_empty() {
            return matched();
        }
        // The essence is ASCII and every character of the value before its length is ASCII
        // (leading HTTP whitespace, then the type and subtype), so the byte offset is the TS one.
        let extra = value.get(essence.len()..).unwrap_or("");
        return Token::new(extra, essence.len(), Rc::from(value), &[]).unmatched_result(
            Some(Reason::ExtraToken),
            UnmatchedOpts {
                expects: Some(expects(without_parameters)),
                candidate: Some(essence),
                ..Default::default()
            },
        );
    }
    unmatched_with(
        value,
        Reason::SyntaxError,
        UnmatchedOpts {
            expects: Some(expects(without_parameters)),
            ..Default::default()
        },
    )
}
