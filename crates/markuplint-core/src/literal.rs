//! Literals in an attribute value written as code, and how a framework renders them.
//!
//! The Rust counterpart of `parseLiteralExpression` (`@markuplint/parser-utils`) and
//! `renderLiteral` (`literal-values.ts` of `@markuplint/ml-core`). It is what an attribute that
//! a pretender makes is read with: `{ expression }` is code, and a literal in it (`aria-busy={true}`)
//! is rendered as the framework renders it, as a literal written on an element is. The
//! attributes of a document that the TS parsers read are rendered on the TS side, and arrive
//! rendered.
//!
//! The tables that say how a framework differs from the default are the TS ones, sent as JSON
//! ([`LiteralRendering`]): the spec's and the parser's `literalValues`, and the names of the
//! boolean attributes of the spec, which TS computes (`getBooleanAttrNames`).
//!
//! Known limitations against `parseLiteralExpression`, which reads the code with a JavaScript
//! parser first: a comment inside the expression and a legacy octal number (`010`) are not
//! read as a literal, so the attribute is dynamic and not validated.

use std::collections::{HashMap, HashSet};

use serde::Deserialize;

/// The value of a literal.
#[derive(Debug, Clone, PartialEq)]
pub enum LiteralValue {
    String(String),
    /// A `BigInt` is its approximation here; its digits are the key.
    Number(f64),
    Boolean(bool),
    Null,
    Undefined,
}

/// A JavaScript expression that is nothing but a literal (TS `LiteralExpression`).
#[derive(Debug, Clone, PartialEq)]
pub struct LiteralExpression {
    pub value: LiteralValue,
    /// The normal form: two literals of one value and one type have the same key however they are
    /// written, and literals that differ in value or in type do not (`true` and `"true"`). A
    /// string's key is its JSON, a number's key is `String(value)`, the rest are their keyword.
    /// The keys are those of `literalValues`.
    pub key: String,
}

impl LiteralExpression {
    /// TS `literalToString`: the string of a literal as it is written, which is what a component
    /// receives as a prop of the literal.
    #[must_use]
    pub fn to_text(&self) -> String {
        match &self.value {
            LiteralValue::String(s) => s.clone(),
            LiteralValue::Number(_) => self.key.clone(),
            LiteralValue::Boolean(b) => b.to_string(),
            LiteralValue::Null | LiteralValue::Undefined => String::new(),
        }
    }
}

/// How a literal is rendered as an attribute of the DOM (TS `RenderedLiteral`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RenderedLiteral {
    /// The attribute has this value (`""` for `disabled={true}`).
    Value(String),
    /// The attribute is not output (`disabled={false}`).
    Absent,
    /// The frameworks differ and the attribute has a value that is not known (`disabled={""}`).
    Unknown,
}

/// TS `LiteralValues`: the key of a literal to the attribute value that results, or `null` when the
/// framework does not output the attribute.
pub type LiteralValues = HashMap<String, Option<String>>;

/// TS `LiteralValueTable`.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiteralValueTable {
    #[serde(default)]
    pub boolean_attrs: Option<LiteralValues>,
    #[serde(default)]
    pub aria_attrs: Option<LiteralValues>,
    #[serde(default)]
    pub data_attrs: Option<LiteralValues>,
    #[serde(default)]
    pub other_attrs: Option<LiteralValues>,
    /// By attribute name, in lower case.
    #[serde(default)]
    pub attrs: Option<HashMap<String, LiteralValues>>,
}

/// TS `LiteralValueDeclaration`.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiteralValueDeclaration {
    #[serde(flatten)]
    pub table: LiteralValueTable,
    /// Overrides the tables on a custom element.
    #[serde(default)]
    pub custom_elements: Option<LiteralValueTable>,
}

/// What decides the rendering of a literal besides the literal itself: the tables of the spec and of
/// the parser of the document (a spec wins over a parser on a key that both say), and the names of
/// the boolean attributes of the spec.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiteralRendering {
    #[serde(default)]
    pub spec_literal_values: Option<LiteralValueDeclaration>,
    #[serde(default)]
    pub parser_literal_values: Option<LiteralValueDeclaration>,
    /// In lower case.
    #[serde(default)]
    pub boolean_attr_names: HashSet<String>,
}

#[derive(Clone, Copy)]
enum AttrKind {
    Aria,
    Data,
    Boolean,
    Other,
}

impl AttrKind {
    fn of(name: &str, is_boolean: bool) -> Self {
        if name.starts_with("aria-") {
            Self::Aria
        } else if name.starts_with("data-") {
            Self::Data
        } else if is_boolean {
            Self::Boolean
        } else {
            Self::Other
        }
    }

    fn table(self, tables: &LiteralValueTable) -> Option<&LiteralValues> {
        match self {
            Self::Aria => tables.aria_attrs.as_ref(),
            Self::Data => tables.data_attrs.as_ref(),
            Self::Boolean => tables.boolean_attrs.as_ref(),
            Self::Other => tables.other_attrs.as_ref(),
        }
    }
}

fn by_name<'a>(table: &'a LiteralValueTable, name: &str) -> Option<&'a LiteralValues> {
    table.attrs.as_ref().and_then(|attrs| attrs.get(name))
}

impl LiteralRendering {
    /// TS `renderLiteral`: renders `literal` as the attribute `name` (as the DOM names it, in lower
    /// case) of an element, which is a custom element or not.
    ///
    /// The tables are looked up by the key of the literal, and the first table that has the key
    /// decides, in this order. A spec is read before a parser at each step.
    ///
    /// 1. On a custom element, `customElements`: the table of the attribute by name, then that of its kind
    /// 2. `attrs`: the table of the attribute by name
    /// 3. The table of `@markuplint/ml-core` by name (`hidden`, which the frameworks agree on)
    /// 4. The table of the kind of the attribute. The kinds are independent
    /// 5. The default ([`render_by_default`])
    #[must_use]
    pub fn render(&self, literal: &LiteralExpression, name: &str, is_custom_element: bool) -> RenderedLiteral {
        let is_boolean = self.boolean_attr_names.contains(name);
        let kind = AttrKind::of(name, is_boolean);
        let declarations = [self.spec_literal_values.as_ref(), self.parser_literal_values.as_ref()];

        // What the frameworks agree on for `hidden`, an enumerated attribute in the HTML Standard that
        // React, Vue, Svelte and Astro all render as a boolean (`NAME_DEFAULTS` of TS)
        let hidden: LiteralValues = HashMap::from([
            ("true".to_owned(), Some(String::new())),
            ("false".to_owned(), None),
            ("0".to_owned(), None),
        ]);

        let mut tables: Vec<Option<&LiteralValues>> = Vec::new();
        if is_custom_element {
            let custom = declarations.map(|d| d.and_then(|d| d.custom_elements.as_ref()));
            tables.extend(custom.map(|t| t.and_then(|t| by_name(t, name))));
            tables.extend(custom.map(|t| t.and_then(|t| kind.table(t))));
        }
        tables.extend(declarations.map(|d| d.and_then(|d| by_name(&d.table, name))));
        tables.push((name == "hidden").then_some(&hidden));
        tables.extend(declarations.map(|d| d.and_then(|d| kind.table(&d.table))));

        tables
            .into_iter()
            .flatten()
            .find_map(|table| table.get(&literal.key))
            .map_or_else(
                || render_by_default(literal, is_boolean),
                |rendered| {
                    rendered
                        .as_ref()
                        .map_or(RenderedLiteral::Absent, |v| RenderedLiteral::Value(v.clone()))
                },
            )
    }
}

/// TS `renderByDefault`: the rendering that React, Vue, Svelte and Astro share.
///
/// | literal            | boolean attribute | others      |
/// | ------------------ | ----------------- | ----------- |
/// | `true`             | `""`              | `"true"`    |
/// | `false`            | not output        | `"false"`   |
/// | `null`/`undefined` | not output        | not output  |
/// | a number except 0  | `""`              | `String(n)` |
/// | `0`                | not output        | `"0"`       |
/// | `""`               | unknown           | `""`        |
/// | any other string   | `""`              | the string  |
#[must_use]
pub fn render_by_default(literal: &LiteralExpression, is_boolean: bool) -> RenderedLiteral {
    if matches!(literal.value, LiteralValue::Null | LiteralValue::Undefined) {
        return RenderedLiteral::Absent;
    }
    if is_boolean {
        return match &literal.value {
            LiteralValue::Number(n) if *n == 0.0 => RenderedLiteral::Absent,
            LiteralValue::Boolean(false) => RenderedLiteral::Absent,
            LiteralValue::String(s) if s.is_empty() => RenderedLiteral::Unknown,
            _ => RenderedLiteral::Value(String::new()),
        };
    }
    RenderedLiteral::Value(literal.to_text())
}

/// TS `parseLiteralExpression`: reads a JavaScript expression and tells whether it is nothing but
/// a literal: a string, a template literal without a substitution, a number, `true`, `false`,
/// `null` or `undefined`, with a leading minus sign for a number, any number of balanced
/// parentheses, and a TypeScript `as` / `satisfies` assertion after it. An identifier, a call, an
/// object, an array, a template literal with a substitution, a regular expression, an operator, or
/// `NaN` is not.
#[must_use]
pub fn parse_literal_expression(code: &str) -> Option<LiteralExpression> {
    let mut reader = Reader {
        chars: code.chars().collect(),
        pos: 0,
    };
    let mut opened = 0usize;
    reader.skip_space();
    while reader.eat('(') {
        opened += 1;
        reader.skip_space();
    }
    let negative = reader.eat('-');
    if negative {
        reader.skip_space();
    }
    let literal = reader.literal(negative)?;
    let mut closed = 0usize;
    reader.skip_space();
    while reader.eat(')') {
        closed += 1;
        reader.skip_space();
    }
    if reader.at_end() {
        return (opened == closed).then_some(literal);
    }
    // Tokens after an `as` / `satisfies` are a type and not an expression, which has to end the code
    let keyword = ["as", "satisfies"].into_iter().find(|k| reader.eat_word(k))?;
    let _ = keyword;
    is_type(&reader.chars[reader.pos..], opened.checked_sub(closed)?).then_some(literal)
}

struct Reader {
    chars: Vec<char>,
    pos: usize,
}

impl Reader {
    fn peek(&self) -> Option<char> {
        self.chars.get(self.pos).copied()
    }

    fn at_end(&self) -> bool {
        self.pos >= self.chars.len()
    }

    fn eat(&mut self, c: char) -> bool {
        if self.peek() == Some(c) {
            self.pos += 1;
            true
        } else {
            false
        }
    }

    fn skip_space(&mut self) {
        while self.peek().is_some_and(char::is_whitespace) {
            self.pos += 1;
        }
    }

    /// Eats `word` when it is a whole word.
    fn eat_word(&mut self, word: &str) -> bool {
        let end = self.pos + word.chars().count();
        let matches = self
            .chars
            .get(self.pos..end)
            .is_some_and(|s| s.iter().copied().eq(word.chars()));
        let whole = self.chars.get(end).is_none_or(|c| !is_ident_char(*c));
        if matches && whole {
            self.pos = end;
            true
        } else {
            false
        }
    }

    fn literal(&mut self, negative: bool) -> Option<LiteralExpression> {
        let c = self.peek()?;
        if negative {
            return if c.is_ascii_digit() || c == '.' {
                self.number(true)
            } else {
                None
            };
        }
        match c {
            '"' | '\'' => self.string(c).map(string_literal),
            '`' => self.template().map(string_literal),
            '0'..='9' | '.' => self.number(false),
            _ => {
                let start = self.pos;
                while self.peek().is_some_and(is_ident_char) {
                    self.pos += 1;
                }
                let word: String = self.chars[start..self.pos].iter().collect();
                match word.as_str() {
                    "true" => Some(keyword(LiteralValue::Boolean(true), "true")),
                    "false" => Some(keyword(LiteralValue::Boolean(false), "false")),
                    "null" => Some(keyword(LiteralValue::Null, "null")),
                    "undefined" => Some(keyword(LiteralValue::Undefined, "undefined")),
                    _ => None,
                }
            }
        }
    }

    /// A string between quotes, whose escapes are resolved.
    fn string(&mut self, quote: char) -> Option<String> {
        self.pos += 1;
        let mut out = String::new();
        loop {
            let c = self.peek()?;
            self.pos += 1;
            match c {
                c if c == quote => return Some(out),
                '\\' => self.escape(&mut out, false)?,
                '\n' | '\r' => return None,
                c => out.push(c),
            }
        }
    }

    /// A template literal without a substitution, whose escapes are resolved (the cooked value).
    fn template(&mut self) -> Option<String> {
        self.pos += 1;
        let mut out = String::new();
        loop {
            let c = self.peek()?;
            self.pos += 1;
            match c {
                '`' => return Some(out),
                '$' if self.peek() == Some('{') => return None,
                '\\' => self.escape(&mut out, true)?,
                // A line terminator in a template is `\n`, even `\r\n`
                '\r' => {
                    self.eat('\n');
                    out.push('\n');
                }
                c => out.push(c),
            }
        }
    }

    fn escape(&mut self, out: &mut String, in_template: bool) -> Option<()> {
        let c = self.peek()?;
        self.pos += 1;
        match c {
            'n' => out.push('\n'),
            'r' => out.push('\r'),
            't' => out.push('\t'),
            'b' => out.push('\u{8}'),
            'f' => out.push('\u{c}'),
            'v' => out.push('\u{b}'),
            '0' if !self.peek().is_some_and(|d| d.is_ascii_digit()) => out.push('\0'),
            // A legacy octal escape and `\8` `\9` are not valid in a template
            '0'..='9' if in_template => return None,
            '0'..='7' => {
                let mut value = c.to_digit(8)?;
                for _ in 0..2 {
                    match self.peek().and_then(|d| d.to_digit(8)) {
                        Some(d) if value * 8 + d <= 0o377 => {
                            value = value * 8 + d;
                            self.pos += 1;
                        }
                        _ => break,
                    }
                }
                out.push(char::from_u32(value)?);
            }
            'x' => out.push(char::from_u32(self.hex(2)?)?),
            'u' => {
                let code = if self.eat('{') {
                    let start = self.pos;
                    while self.peek().is_some_and(|d| d.is_ascii_hexdigit()) {
                        self.pos += 1;
                    }
                    let digits: String = self.chars[start..self.pos].iter().collect();
                    if digits.is_empty() || !self.eat('}') {
                        return None;
                    }
                    u32::from_str_radix(&digits, 16).ok()?
                } else {
                    self.hex(4)?
                };
                // A lone surrogate is not a `char`. A pair is two escapes.
                if (0xD800..0xDC00).contains(&code) {
                    let low =
                        (self.peek() == Some('\\') && self.chars.get(self.pos + 1) == Some(&'u')).then(|| {
                            self.pos += 2;
                            self.hex(4)
                        })??;
                    let combined = 0x10000 + ((code - 0xD800) << 10) + low.checked_sub(0xDC00)?;
                    out.push(char::from_u32(combined)?);
                } else {
                    out.push(char::from_u32(code)?);
                }
            }
            // A line continuation
            '\n' | '\u{2028}' | '\u{2029}' => {}
            '\r' => {
                self.eat('\n');
            }
            c => out.push(c),
        }
        Some(())
    }

    fn hex(&mut self, count: usize) -> Option<u32> {
        let digits: String = self.chars.get(self.pos..self.pos + count)?.iter().collect();
        if !digits.chars().all(|c| c.is_ascii_hexdigit()) {
            return None;
        }
        self.pos += count;
        u32::from_str_radix(&digits, 16).ok()
    }

    fn number(&mut self, negative: bool) -> Option<LiteralExpression> {
        let start = self.pos;
        while self
            .peek()
            .is_some_and(|c| is_ident_char(c) || c == '.' || ((c == '+' || c == '-') && self.exponent_sign_at_pos()))
        {
            self.pos += 1;
        }
        let source: String = self.chars[start..self.pos].iter().collect();
        let (value, bigint_digits) = parse_number(&source)?;
        let value = if negative { -value } else { value };
        let key = match bigint_digits {
            Some(digits) if negative && digits != "0" => format!("-{digits}"),
            Some(digits) => digits,
            None => js_number_to_string(value),
        };
        Some(LiteralExpression {
            value: LiteralValue::Number(value),
            key,
        })
    }

    /// Whether the sign at the position belongs to an exponent (`1e+3`), not to an operator.
    fn exponent_sign_at_pos(&self) -> bool {
        let previous = self.pos.checked_sub(1).and_then(|i| self.chars.get(i)).copied();
        let started_hex = self.chars[..self.pos]
            .iter()
            .rev()
            .take_while(|c| c.is_ascii_alphanumeric() || **c == '.' || **c == '_')
            .collect::<String>()
            .to_ascii_lowercase()
            .contains('x');
        matches!(previous, Some('e' | 'E')) && !started_hex
    }
}

fn is_ident_char(c: char) -> bool {
    c.is_alphanumeric() || c == '_' || c == '$'
}

fn keyword(value: LiteralValue, key: &str) -> LiteralExpression {
    LiteralExpression {
        value,
        key: key.to_owned(),
    }
}

fn string_literal(value: String) -> LiteralExpression {
    LiteralExpression {
        key: serde_json::to_string(&value).unwrap_or_default(),
        value: LiteralValue::String(value),
    }
}

/// Reads the source of a number token: the notations of a number (`0x10`, `0o7`, `0b1`, `1e3`,
/// `1_000`, `.5`, `5.`), and a `BigInt` (`10n`), which also gives the digits that its key is made of.
fn parse_number(source: &str) -> Option<(f64, Option<String>)> {
    let (body, is_bigint) = source.strip_suffix('n').map_or((source, false), |b| (b, true));
    let lower = body.to_ascii_lowercase();
    let radix = if lower.starts_with("0x") {
        Some(16)
    } else if lower.starts_with("0o") {
        Some(8)
    } else if lower.starts_with("0b") {
        Some(2)
    } else {
        None
    };
    // A separator sits between digits only
    let valid_separators = !body.starts_with('_')
        && !body.ends_with('_')
        && !body.contains("__")
        && !body.contains("_.")
        && !body.contains("._");
    if !valid_separators {
        return None;
    }
    let digits = body.replace('_', "");
    if let Some(radix) = radix {
        let digits = &digits[2..];
        if digits.is_empty() {
            return None;
        }
        let value = u128::from_str_radix(digits, radix).ok()?;
        #[allow(clippy::cast_precision_loss)] // the number is the approximation of the digits
        return Some((value as f64, is_bigint.then(|| value.to_string())));
    }
    if is_bigint {
        // A decimal BigInt has digits only, and no leading zero but `0` itself
        if digits.is_empty()
            || !digits.bytes().all(|b| b.is_ascii_digit())
            || (digits.len() > 1 && digits.starts_with('0'))
        {
            return None;
        }
        let value: f64 = digits.parse().ok()?;
        return Some((value, Some(digits)));
    }
    // A legacy octal (`010`) and a number with a leading zero are not read
    if digits.len() > 1 && digits.starts_with('0') && digits.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    if !digits.bytes().next().is_some_and(|b| b.is_ascii_digit() || b == b'.') {
        return None;
    }
    // Rust does not read `5.` and `.5e3` the way JavaScript does in every case, so the shape is checked
    let normalized = if let Some(rest) = digits.strip_prefix('.') {
        format!("0.{rest}")
    } else {
        digits.clone()
    };
    let normalized = normalized.replace(".e", "e").replace(".E", "E");
    let normalized = normalized.strip_suffix('.').map_or(normalized.clone(), str::to_owned);
    if normalized
        .bytes()
        .any(|b| !(b.is_ascii_digit() || matches!(b, b'.' | b'e' | b'E' | b'+' | b'-')))
    {
        return None;
    }
    Some((normalized.parse().ok()?, None))
}

/// `String(value)` of JavaScript for a number (`Number::toString` of ECMAScript).
#[must_use]
pub fn js_number_to_string(value: f64) -> String {
    if value == 0.0 {
        return "0".to_owned();
    }
    if value.is_infinite() {
        return if value > 0.0 { "Infinity" } else { "-Infinity" }.to_owned();
    }
    let sign = if value < 0.0 { "-" } else { "" };
    // The shortest digits that read back as the value, and the exponent: `d.ddde<exp>`
    let scientific = format!("{:e}", value.abs());
    let (mantissa, exponent) = scientific.split_once('e').unwrap_or((&scientific, "0"));
    let digits: String = mantissa.chars().filter(char::is_ascii_digit).collect();
    let exponent: i32 = exponent.parse().unwrap_or(0);
    let k = i32::try_from(digits.len()).unwrap_or(i32::MAX);
    // The decimal point sits after `n` digits
    let n = exponent + 1;
    let body = if k <= n && n <= 21 {
        format!("{digits}{}", "0".repeat(usize::try_from(n - k).unwrap_or(0)))
    } else if 0 < n && n <= 21 {
        let (int, frac) = digits.split_at(usize::try_from(n).unwrap_or(0));
        format!("{int}.{frac}")
    } else if -6 < n && n <= 0 {
        format!("0.{}{digits}", "0".repeat(usize::try_from(-n).unwrap_or(0)))
    } else {
        let e = n - 1;
        let sign_e = if e < 0 { '-' } else { '+' };
        let (first, rest) = digits.split_at(1);
        let fraction = if rest.is_empty() {
            String::new()
        } else {
            format!(".{rest}")
        };
        format!("{first}{fraction}e{sign_e}{}", e.abs())
    };
    format!("{sign}{body}")
}

/// Whether the tokens after `as` / `satisfies` are a type that closes the `depth` parentheses that
/// are open, and nothing else: names, keywords, literal types, and the punctuation of unions,
/// generics, arrays, objects and parentheses. An operator (`+`, `||`, `?`, `,`) makes it code that
/// goes on after the assertion, which is not a literal. `:` and `;` belong to an object type, so
/// they are only inside its braces.
fn is_type(rest: &[char], depth: usize) -> bool {
    let mut open = i64::try_from(depth).unwrap_or(i64::MAX);
    let mut braces = 0i64;
    let mut any = false;
    let mut i = 0;
    while let Some(&c) = rest.get(i) {
        i += 1;
        match c {
            c if c.is_whitespace() => {}
            '"' | '\'' | '`' => {
                any = true;
                // A string of a literal type
                loop {
                    match rest.get(i) {
                        None => return false,
                        Some('\\') => i += 2,
                        Some(&q) if q == c => {
                            i += 1;
                            break;
                        }
                        Some(_) => i += 1,
                    }
                }
            }
            c if is_ident_char(c) => any = true,
            '(' => open += 1,
            ')' => {
                open -= 1;
                if open < 0 {
                    return false;
                }
            }
            '{' => braces += 1,
            '}' => {
                braces -= 1;
                if braces < 0 {
                    return false;
                }
            }
            '|' | '&' | '<' | '>' | '[' | ']' | '.' => {}
            ':' | ';' if braces > 0 => {}
            _ => return false,
        }
    }
    any && open == 0 && braces == 0
}

#[cfg(test)]
mod tests;
