//! Ports of `decodeEntities` and `decodeHref` from `@markuplint/shared`
//! (`packages/@markuplint/shared/src/functions.ts`).
//!
//! Both work on JavaScript (UTF-16) strings in TS. A result that would hold an
//! unpaired surrogate has no Rust `String`, which is why [`decode_entities`]
//! returns an `Option`.

use markuplint_html_parser::tokenizer::char_ref::lookup_named;

/// Named references with a semicolon that the `html5` body pattern of `html-entities`
/// tries before anything else, in its order: each starts with the name of a legacy
/// reference (one that may omit the semicolon), so it has to win over that prefix.
const PREFIXED_NAMES: &[&str] = &[
    "centerdot",
    "copysr",
    "divideontimes",
    "gtcc",
    "gtcir",
    "gtdot",
    "gtlPar",
    "gtquest",
    "gtrapprox",
    "gtrarr",
    "gtrdot",
    "gtreqless",
    "gtreqqless",
    "gtrless",
    "gtrsim",
    "ltcc",
    "ltcir",
    "ltdot",
    "lthree",
    "ltimes",
    "ltlarr",
    "ltquest",
    "ltrPar",
    "ltri",
    "ltrie",
    "ltrif",
    "notin",
    "notinE",
    "notindot",
    "notinva",
    "notinvb",
    "notinvc",
    "notni",
    "notniva",
    "notnivb",
    "notnivc",
    "parallel",
    "timesb",
    "timesbar",
    "timesd",
];

/// The legacy references (those that may omit the semicolon), in the order the
/// `html5` body pattern of `html-entities` tries them.
const LEGACY_NAMES: &[&str] = &[
    "AElig", "AMP", "Aacute", "Acirc", "Agrave", "Aring", "Atilde", "Auml", "COPY", "Ccedil", "ETH", "Eacute", "Ecirc",
    "Egrave", "Euml", "GT", "Iacute", "Icirc", "Igrave", "Iuml", "LT", "Ntilde", "Oacute", "Ocirc", "Ograve", "Oslash",
    "Otilde", "Ouml", "QUOT", "REG", "THORN", "Uacute", "Ucirc", "Ugrave", "Uuml", "Yacute", "aacute", "acirc",
    "acute", "aelig", "agrave", "amp", "aring", "atilde", "auml", "brvbar", "ccedil", "cedil", "cent", "copy",
    "curren", "deg", "divide", "eacute", "ecirc", "egrave", "eth", "euml", "frac12", "frac14", "frac34", "gt",
    "iacute", "icirc", "iexcl", "igrave", "iquest", "iuml", "laquo", "lt", "macr", "micro", "middot", "nbsp", "not",
    "ntilde", "oacute", "ocirc", "ograve", "ordf", "ordm", "oslash", "otilde", "ouml", "para", "plusmn", "pound",
    "quot", "raquo", "reg", "sect", "shy", "sup1", "sup2", "sup3", "szlig", "thorn", "times", "uacute", "ucirc",
    "ugrave", "uml", "uuml", "yacute", "yen", "yuml",
];

/// TS `decodeEntities`: `decode(text, { level: 'html5' })` of `html-entities` (2.x), whose
/// default scope `body` replaces, left to right, every match of
///
/// ```text
/// &<PREFIXED_NAMES>; | &(?:<LEGACY_NAMES>|#\d+|#[xX][\da-fA-F]+|[0-9a-zA-Z]+);?
/// ```
///
/// (alternatives in that order, the first that matches wins) with the referenced
/// characters, and leaves a match that names no reference as it is.
///
/// The table is the WHATWG one the HTML parser uses, which has the same names as the
/// one `html-entities` ships; the two differ only in `&lang;` and `&rang;`, which
/// `html-entities` maps to U+2329 and U+232A (the WHATWG table: U+27E8, U+27E9).
///
/// Returns `None` when the result holds an unpaired surrogate (a numeric reference to
/// one), which such a TS string can, and a Rust `String` cannot, contain.
#[must_use]
pub fn decode_entities(text: &str) -> Option<String> {
    let mut out: Vec<u16> = Vec::with_capacity(text.len());
    let mut rest = text;
    while let Some(amp) = rest.find('&') {
        out.extend(rest[..amp].encode_utf16());
        let at = &rest[amp..];
        let len = match_reference(at);
        if len == 0 {
            out.push(u16::from(b'&'));
            rest = &at[1..];
            continue;
        }
        decode_reference(&at[..len], &mut out);
        rest = &at[len..];
    }
    out.extend(rest.encode_utf16());
    String::from_utf16(&out).ok()
}

/// The length of the reference the body pattern matches at the start of `text` (which
/// starts with `&`), or 0 when it matches none.
fn match_reference(text: &str) -> usize {
    let body = &text[1..];
    for name in PREFIXED_NAMES {
        if body.strip_prefix(name).is_some_and(|after| after.starts_with(';')) {
            return 1 + name.len() + 1;
        }
    }
    let name_len = LEGACY_NAMES
        .iter()
        .find(|name| body.starts_with(**name))
        .map(|name| name.len())
        .or_else(|| {
            let digits = |s: &str, hex: bool| {
                s.bytes()
                    .take_while(|b| if hex { b.is_ascii_hexdigit() } else { b.is_ascii_digit() })
                    .count()
            };
            if let Some(num) = body.strip_prefix('#') {
                let dec = digits(num, false);
                if dec > 0 {
                    return Some(1 + dec);
                }
                if let Some(hex) = num.strip_prefix(['x', 'X']) {
                    let hex = digits(hex, true);
                    if hex > 0 {
                        return Some(2 + hex);
                    }
                }
                return None;
            }
            let alnum = body.bytes().take_while(u8::is_ascii_alphanumeric).count();
            (alnum > 0).then_some(alnum)
        });
    match name_len {
        Some(len) => 1 + len + usize::from(body[len..].starts_with(';')),
        None => 0,
    }
}

/// TS `getDecodedEntity` of `html-entities` for a matched `entity` (`&...`), pushed as
/// UTF-16 code units.
fn decode_reference(entity: &str, out: &mut Vec<u16>) {
    match entity {
        "&lang;" => return out.push(0x2329),
        "&rang;" => return out.push(0x232A),
        _ => {}
    }
    if let Some(chars) = lookup_named(entity) {
        for c in chars {
            let mut buf = [0u16; 2];
            out.extend_from_slice(c.encode_utf16(&mut buf));
        }
        return;
    }
    let Some(number) = entity.strip_prefix("&#") else {
        out.extend(entity.encode_utf16());
        return;
    };
    // `parseInt` of the digits (a trailing `;` ends them); a value too large for `u32`
    // only has to compare as "at least U+10FFFF".
    let code = match number.strip_prefix(['x', 'X']) {
        Some(hex) => parse_prefix(hex, 16),
        None => parse_prefix(number, 10),
    };
    if code >= 0x10_FFFF {
        out.push(0xFFFD);
    } else if code > 0xFFFF {
        // Below U+10FFFF, so a valid scalar value outside the surrogate range.
        let mut buf = [0u16; 2];
        if let Some(c) = char::from_u32(code) {
            out.extend_from_slice(c.encode_utf16(&mut buf));
        }
    } else {
        // `fromCharCode(numericUnicodeMap[code] || code)`: one UTF-16 code unit, which
        // may be an unpaired surrogate.
        let unit = u16::try_from(code).unwrap_or(0xFFFD);
        out.push(numeric_unicode_map(unit).unwrap_or(unit));
    }
}

/// The leading digits of `s` in `radix`, saturating at `u32::MAX`.
fn parse_prefix(s: &str, radix: u32) -> u32 {
    s.chars()
        .map_while(|c| c.to_digit(radix))
        .fold(0u32, |acc, d| acc.saturating_mul(radix).saturating_add(d))
}

/// `numericUnicodeMap` of `html-entities`: NUL and the C1 range as Windows-1252 maps them.
fn numeric_unicode_map(code: u16) -> Option<u16> {
    Some(match code {
        0 => 65533,
        128 => 8364,
        130 => 8218,
        131 => 402,
        132 => 8222,
        133 => 8230,
        134 => 8224,
        135 => 8225,
        136 => 710,
        137 => 8240,
        138 => 352,
        139 => 8249,
        140 => 338,
        142 => 381,
        145 => 8216,
        146 => 8217,
        147 => 8220,
        148 => 8221,
        149 => 8226,
        150 => 8211,
        151 => 8212,
        152 => 732,
        153 => 8482,
        154 => 353,
        155 => 8250,
        156 => 339,
        158 => 382,
        159 => 376,
        _ => return None,
    })
}

/// TS `decodeHref`: `decodeURIComponent(href)`, or `href` itself when that throws a
/// `URIError` — a `%` not followed by two hex digits, or escaped bytes that are not
/// UTF-8 (a literal character can never complete an escaped sequence, so decoding the
/// bytes as a whole is equivalent to the per-character algorithm).
#[must_use]
pub fn decode_href(href: &str) -> String {
    let bytes = href.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            let hex = bytes.get(i + 1..i + 3).and_then(|pair| {
                let pair = std::str::from_utf8(pair).ok()?;
                u8::from_str_radix(pair, 16)
                    .ok()
                    .filter(|_| pair.bytes().all(|b| b.is_ascii_hexdigit()))
            });
            let Some(byte) = hex else {
                return href.to_owned();
            };
            decoded.push(byte);
            i += 3;
        } else {
            decoded.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(decoded).unwrap_or_else(|_| href.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Expected values from `decodeEntities` of `@markuplint/shared`.
    #[test]
    fn v6_decode_entities_001() {
        let cases: &[(&str, Option<&str>)] = &[
            ("", Some("")),
            ("a&amp;b", Some("a&b")),
            ("&amp", Some("&")),
            ("&ampfoo;", Some("&foo;")),
            ("&notit;", Some("\u{AC}it;")),
            ("&notin;", Some("\u{2209}")),
            ("&lang;", Some("\u{2329}")),
            ("&rang;", Some("\u{232A}")),
            ("&#38;", Some("&")),
            ("&#x26;", Some("&")),
            ("&#X26", Some("&")),
            ("&#0;", Some("\u{FFFD}")),
            ("&#128;", Some("\u{20AC}")),
            ("&#129;", Some("\u{81}")),
            ("&#xD83D;&#xDE00;", Some("\u{1F600}")),
            ("&#xD800;", None),
            ("&#1114111;", Some("\u{FFFD}")),
            ("&#1114110;", Some("\u{10FFFE}")),
            ("&#99999999999999999999;", Some("\u{FFFD}")),
            ("&#x1F600;", Some("\u{1F600}")),
            ("&foo;", Some("&foo;")),
            ("&Abreve;", Some("\u{102}")),
            ("&Abreve", Some("&Abreve")),
            ("&;", Some("&;")),
            ("&#;", Some("&#;")),
            ("&#x;", Some("&#x;")),
            ("& amp;", Some("& amp;")),
            ("&centerdot;", Some("\u{B7}")),
            ("&cent", Some("\u{A2}")),
            ("&ltrie;", Some("\u{22B4}")),
            ("&ltri;", Some("\u{25C3}")),
            ("&lt;rie", Some("<rie")),
            ("&AMP;x", Some("&x")),
            ("&#65abc", Some("Aabc")),
            ("&#x41g", Some("Ag")),
            ("&&amp;&", Some("&&&")),
            ("x&nbsp;y&nbspz", Some("x\u{A0}y\u{A0}z")),
            ("&NotEqualTilde;", Some("\u{2242}\u{338}")),
            ("&acE;", Some("\u{223E}\u{333}")),
            ("&#xFFFF;", Some("\u{FFFF}")),
            ("&#65536;", Some("\u{10000}")),
        ];
        for (input, expected) in cases {
            assert_eq!(decode_entities(input).as_deref(), *expected, "{input}");
        }
    }

    /// Expected values from `decodeHref` of `@markuplint/shared`.
    #[test]
    fn v6_decode_href_001() {
        let cases: &[(&str, &str)] = &[
            ("foo", "foo"),
            ("a%20b", "a b"),
            ("%E3%81%82", "\u{3042}"),
            ("%", "%"),
            ("%2", "%2"),
            ("%zz", "%zz"),
            ("%+F", "%+F"),
            ("%C3", "%C3"),
            ("%C3%28", "%C3%28"),
            ("%ED%A0%80", "%ED%A0%80"),
            ("%F4%90%80%80", "%F4%90%80%80"),
            ("apple%3Aorange", "apple:orange"),
            ("%25", "%"),
            ("a%2Fb", "a/b"),
            ("%c3%a9", "\u{E9}"),
            ("%C0%AF", "%C0%AF"),
            ("%E3%81", "%E3%81"),
            ("\u{3042}%E3%81%82", "\u{3042}\u{3042}"),
            ("%E3\u{3042}", "%E3\u{3042}"),
        ];
        for (input, expected) in cases {
            assert_eq!(decode_href(input), *expected, "{input}");
        }
    }
}
