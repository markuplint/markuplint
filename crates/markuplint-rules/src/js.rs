//! JavaScript built-ins whose exact behavior TS rules depend on: `String.prototype.trim`,
//! `JSON.parse` (with the property order of the objects it creates), and
//! `Number.prototype.toLocaleString('en')` of an index.

/// `String.prototype.trim`: strips the ECMAScript `WhiteSpace` and `LineTerminator`
/// code points. Unlike [`str::trim`], that includes U+FEFF and excludes U+0085.
#[must_use]
pub fn trim(s: &str) -> &str {
    s.trim_matches(|c: char| {
        matches!(
            c,
            '\u{9}'..='\u{D}'
                | ' '
                | '\u{A0}'
                | '\u{1680}'
                | '\u{2000}'..='\u{200A}'
                | '\u{2028}'
                | '\u{2029}'
                | '\u{202F}'
                | '\u{205F}'
                | '\u{3000}'
                | '\u{FEFF}'
        )
    })
}

/// `Number.prototype.toLocaleString('en')` of a non-negative integer: groups of three
/// digits separated by commas. The TS translator (`@markuplint/i18n`) formats a number
/// it inserts into a message this way, even into a verbatim (`{0*}`) placeholder.
#[must_use]
pub fn to_locale_string_en(n: usize) -> String {
    let digits = n.to_string();
    let mut out = String::with_capacity(digits.len() + digits.len() / 3);
    for (i, c) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i).is_multiple_of(3) {
            out.push(',');
        }
        out.push(c);
    }
    out
}

/// A value `JSON.parse` returns. Numbers are kept only as "a number": no caller reads
/// their value.
#[derive(Debug, PartialEq)]
pub enum JsonValue {
    Null,
    Bool(bool),
    Number,
    String(String),
    Array(Vec<JsonValue>),
    Object(JsonObject),
}

/// An object `JSON.parse` creates, with its properties in the order `Object.keys` and
/// `Object.entries` list them: array-index keys (`"0"`, `"42"`) first in ascending
/// numeric order, then the other keys in the order they first appear. A repeated key
/// keeps the position of its first appearance and the value of its last.
#[derive(Debug, PartialEq, Default)]
pub struct JsonObject {
    entries: Vec<(String, JsonValue)>,
}

impl JsonObject {
    /// The own property `key`, as `object[key] !== undefined` sees it.
    #[must_use]
    pub fn get(&self, key: &str) -> Option<&JsonValue> {
        self.entries.iter().find(|(k, _)| k == key).map(|(_, v)| v)
    }

    pub fn iter(&self) -> impl Iterator<Item = (&str, &JsonValue)> {
        self.entries.iter().map(|(k, v)| (k.as_str(), v))
    }

    pub fn keys(&self) -> impl Iterator<Item = &str> {
        self.entries.iter().map(|(k, _)| k.as_str())
    }

    fn insert(&mut self, key: String, value: JsonValue) {
        if let Some(entry) = self.entries.iter_mut().find(|(k, _)| *k == key) {
            entry.1 = value;
        } else {
            self.entries.push((key, value));
        }
    }

    /// Moves the array-index keys to the front, in numeric order (a stable sort keeps
    /// the other keys in creation order).
    fn order_properties(&mut self) {
        self.entries.sort_by_key(|(k, _)| array_index(k).map_or(1, |_| 0));
        let index_count = self
            .entries
            .iter()
            .take_while(|(k, _)| array_index(k).is_some())
            .count();
        self.entries[..index_count].sort_by_key(|(k, _)| array_index(k));
    }
}

/// The value of `key` as an ECMAScript array index: a canonical decimal integer (no
/// sign, no leading zero) below 2³² − 1.
fn array_index(key: &str) -> Option<u32> {
    if key.is_empty() || (key.len() > 1 && key.starts_with('0')) || !key.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    key.parse::<u32>().ok().filter(|&n| n != u32::MAX)
}

/// Nesting deeper than this is treated as a syntax error, so that parsing (and dropping
/// the result) cannot exhaust the stack. `JSON.parse` has no such limit.
const MAX_DEPTH: usize = 1000;

/// `JSON.parse(text)`: `None` where it throws a `SyntaxError`.
///
/// Strings are JavaScript (UTF-16) strings there; an unpaired surrogate escape
/// (`"\uD800"`) becomes U+FFFD here.
#[must_use]
pub fn json_parse(text: &str) -> Option<JsonValue> {
    let mut parser = Parser {
        text,
        src: text.as_bytes(),
        pos: 0,
    };
    let value = parser.value(0)?;
    parser.skip_ws();
    (parser.pos == parser.src.len()).then_some(value)
}

struct Parser<'a> {
    text: &'a str,
    src: &'a [u8],
    pos: usize,
}

impl Parser<'_> {
    fn peek(&self) -> Option<u8> {
        self.src.get(self.pos).copied()
    }

    /// JSON whitespace: tab, line feed, carriage return and space only.
    fn skip_ws(&mut self) {
        while matches!(self.peek(), Some(b'\t' | b'\n' | b'\r' | b' ')) {
            self.pos += 1;
        }
    }

    fn eat(&mut self, byte: u8) -> Option<()> {
        (self.peek() == Some(byte)).then(|| self.pos += 1)
    }

    fn literal(&mut self, word: &str, value: JsonValue) -> Option<JsonValue> {
        self.src[self.pos..].starts_with(word.as_bytes()).then(|| {
            self.pos += word.len();
            value
        })
    }

    fn value(&mut self, depth: usize) -> Option<JsonValue> {
        if depth > MAX_DEPTH {
            return None;
        }
        self.skip_ws();
        match self.peek()? {
            b'{' => self.object(depth),
            b'[' => self.array(depth),
            b'"' => self.string().map(JsonValue::String),
            b't' => self.literal("true", JsonValue::Bool(true)),
            b'f' => self.literal("false", JsonValue::Bool(false)),
            b'n' => self.literal("null", JsonValue::Null),
            b'-' | b'0'..=b'9' => self.number(),
            _ => None,
        }
    }

    fn object(&mut self, depth: usize) -> Option<JsonValue> {
        self.pos += 1;
        let mut object = JsonObject::default();
        self.skip_ws();
        if self.eat(b'}').is_none() {
            loop {
                self.skip_ws();
                if self.peek() != Some(b'"') {
                    return None;
                }
                let key = self.string()?;
                self.skip_ws();
                self.eat(b':')?;
                let value = self.value(depth + 1)?;
                object.insert(key, value);
                self.skip_ws();
                if self.eat(b',').is_some() {
                    continue;
                }
                self.eat(b'}')?;
                break;
            }
        }
        object.order_properties();
        Some(JsonValue::Object(object))
    }

    fn array(&mut self, depth: usize) -> Option<JsonValue> {
        self.pos += 1;
        let mut items = Vec::new();
        self.skip_ws();
        if self.eat(b']').is_none() {
            loop {
                items.push(self.value(depth + 1)?);
                self.skip_ws();
                if self.eat(b',').is_some() {
                    continue;
                }
                self.eat(b']')?;
                break;
            }
        }
        Some(JsonValue::Array(items))
    }

    /// `-? (0 | [1-9][0-9]*) (. [0-9]+)? ([eE] [+-]? [0-9]+)?`
    fn number(&mut self) -> Option<JsonValue> {
        let digits = |p: &mut Self| {
            let start = p.pos;
            while matches!(p.peek(), Some(b'0'..=b'9')) {
                p.pos += 1;
            }
            p.pos > start
        };
        let _ = self.eat(b'-');
        if self.eat(b'0').is_none() && !digits(self) {
            return None;
        }
        if self.eat(b'.').is_some() && !digits(self) {
            return None;
        }
        if matches!(self.peek(), Some(b'e' | b'E')) {
            self.pos += 1;
            if matches!(self.peek(), Some(b'+' | b'-')) {
                self.pos += 1;
            }
            if !digits(self) {
                return None;
            }
        }
        Some(JsonValue::Number)
    }

    /// A string literal starting at the opening quote. Code points below U+0020 must be
    /// escaped; the escapes are `\" \\ \/ \b \f \n \r \t \uXXXX`.
    fn string(&mut self) -> Option<String> {
        self.pos += 1;
        let mut units: Vec<u16> = Vec::new();
        loop {
            // `pos` only ever advances by whole characters, so it is a char boundary.
            let c = self.text[self.pos..].chars().next()?;
            self.pos += c.len_utf8();
            match c {
                '"' => break,
                '\\' => {
                    let escape = self.peek()?;
                    self.pos += 1;
                    let unit = match escape {
                        b'"' => 0x22,
                        b'\\' => 0x5C,
                        b'/' => 0x2F,
                        b'b' => 0x08,
                        b'f' => 0x0C,
                        b'n' => 0x0A,
                        b'r' => 0x0D,
                        b't' => 0x09,
                        b'u' => {
                            let hex = self.src.get(self.pos..self.pos + 4)?;
                            if !hex.iter().all(u8::is_ascii_hexdigit) {
                                return None;
                            }
                            self.pos += 4;
                            u16::from_str_radix(std::str::from_utf8(hex).ok()?, 16).ok()?
                        }
                        _ => return None,
                    };
                    units.push(unit);
                }
                c if u32::from(c) < 0x20 => return None,
                c => {
                    let mut buf = [0u16; 2];
                    units.extend_from_slice(c.encode_utf16(&mut buf));
                }
            }
        }
        Some(String::from_utf16_lossy(&units))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn keys(text: &str) -> Vec<String> {
        match json_parse(text) {
            Some(JsonValue::Object(o)) => o.keys().map(str::to_owned).collect(),
            other => panic!("{other:?}"),
        }
    }

    /// Expected values from `JSON.parse` / `Object.keys` in Node.js.
    #[test]
    fn v6_js_json_parse_001() {
        let valid = [
            "{}",
            "[]",
            "0",
            "-0.5e+10",
            "1E5",
            "\"a\\u0041\\n\\/\"",
            " \t\r\n{\"a\" : [ true , false , null ] } \n",
            "\"\u{1F600}\"",
            "\"\\uD83D\\uDE00\"",
            "\"\\uD800\"",
        ];
        for text in valid {
            assert!(json_parse(text).is_some(), "{text}");
        }
        let invalid = [
            "",
            "{",
            "{,}",
            "[1,]",
            "{\"a\":1,}",
            "01",
            "1.",
            ".5",
            "+1",
            "1e",
            "-",
            "'a'",
            "\"\\x41\"",
            "\"\\u12\"",
            "\"a\nb\"",
            "{a:1}",
            "tru",
            "nul",
            "NaN",
            "Infinity",
            "1 2",
            "\u{FEFF}{}",
            "\u{A0}{}",
            "{} x",
        ];
        for text in invalid {
            assert!(json_parse(text).is_none(), "{text}");
        }
        assert_eq!(
            json_parse("\"\\uD83D\\uDE00\""),
            Some(JsonValue::String("\u{1F600}".to_owned()))
        );
    }

    /// Expected values from `Object.keys(JSON.parse(text))` in Node.js.
    #[test]
    fn v6_js_json_parse_002() {
        assert_eq!(keys(r#"{"b":1,"a":2,"1":3,"0":4}"#), ["0", "1", "b", "a"]);
        assert_eq!(
            keys(r#"{"x":1,"01":2,"10":3,"2":4,"-1":5,"4294967295":6,"4294967294":7}"#),
            ["2", "10", "4294967294", "x", "01", "-1", "4294967295"]
        );
        assert_eq!(keys(r#"{"a":1,"b":2,"a":3}"#), ["a", "b"]);
        match json_parse(r#"{"a":1,"b":2,"a":"x"}"#) {
            Some(JsonValue::Object(o)) => assert_eq!(o.get("a"), Some(&JsonValue::String("x".to_owned()))),
            other => panic!("{other:?}"),
        }
    }

    #[test]
    fn v6_js_json_parse_003() {
        // The outermost value is at depth 0.
        let deep = format!("{}{}", "[".repeat(MAX_DEPTH + 2), "]".repeat(MAX_DEPTH + 2));
        assert!(json_parse(&deep).is_none());
        let ok = format!("{}{}", "[".repeat(MAX_DEPTH + 1), "]".repeat(MAX_DEPTH + 1));
        assert!(json_parse(&ok).is_some());
    }

    /// Expected values from `String.prototype.trim` in Node.js.
    #[test]
    fn v6_js_trim_001() {
        assert_eq!(
            trim("\u{FEFF}\u{A0}\t\n\u{B}\u{C}\r \u{3000}a b\u{2028}\u{2029}"),
            "a b"
        );
        assert_eq!(trim("\u{85}a\u{85}"), "\u{85}a\u{85}");
        assert_eq!(trim("\u{200B}a"), "\u{200B}a");
    }

    /// Expected values from `toLocaleString('en')` in Node.js.
    #[test]
    fn v6_js_to_locale_string_en_001() {
        assert_eq!(to_locale_string_en(0), "0");
        assert_eq!(to_locale_string_en(999), "999");
        assert_eq!(to_locale_string_en(1000), "1,000");
        assert_eq!(to_locale_string_en(1_234_567), "1,234,567");
    }
}
