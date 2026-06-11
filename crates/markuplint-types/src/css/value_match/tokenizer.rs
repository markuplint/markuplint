//! CSS value tokenizer.
//!
//! Tokenizes CSS value strings into a sequence of [`Token`]s following the
//! [CSS Syntax Module Level 3](https://drafts.csswg.org/css-syntax/#tokenization) algorithm,
//! simplified for value-level tokenization (no stylesheet-level constructs).

use super::token::Token;

/// Tokenize a CSS value string into a list of tokens.
///
/// Whitespace tokens are preserved so that the matcher can handle them
/// (e.g., distinguishing `10 px` from `10px`).
pub fn tokenize(input: &str) -> Vec<Token> {
    let mut tokenizer = Tokenizer::new(input);
    let mut tokens = Vec::new();
    while let Some(token) = tokenizer.next_token() {
        tokens.push(token);
    }
    tokens
}

struct Tokenizer<'a> {
    input: &'a [u8],
    pos: usize,
}

impl<'a> Tokenizer<'a> {
    fn new(input: &'a str) -> Self {
        Self {
            input: input.as_bytes(),
            pos: 0,
        }
    }

    fn peek(&self) -> Option<u8> {
        self.input.get(self.pos).copied()
    }

    fn peek_at(&self, offset: usize) -> Option<u8> {
        self.input.get(self.pos + offset).copied()
    }

    fn advance(&mut self) -> Option<u8> {
        let b = self.input.get(self.pos).copied()?;
        self.pos += 1;
        Some(b)
    }

    fn slice(&self, start: usize, end: usize) -> &str {
        // SAFETY: We only slice at ASCII boundaries or validated UTF-8 boundaries.
        std::str::from_utf8(&self.input[start..end]).unwrap_or("")
    }

    fn next_token(&mut self) -> Option<Token> {
        self.skip_comments();
        let b = self.peek()?;

        match b {
            b' ' | b'\t' | b'\n' | b'\r' | 0x0C => {
                self.consume_whitespace();
                Some(Token::Whitespace)
            }

            b'"' | b'\'' => Some(self.consume_string(b)),

            b'#' => {
                self.advance();
                if self.peek().is_some_and(|b| is_name_code_point(b) || b == b'\\') {
                    let name = format!("#{}", self.consume_name());
                    Some(Token::Hash(name))
                } else {
                    Some(Token::Delim('#'))
                }
            }

            b'(' => {
                self.advance();
                Some(Token::LeftParen)
            }
            b')' => {
                self.advance();
                Some(Token::RightParen)
            }
            b'[' => {
                self.advance();
                Some(Token::LeftBracket)
            }
            b']' => {
                self.advance();
                Some(Token::RightBracket)
            }
            b'{' => {
                self.advance();
                Some(Token::LeftBrace)
            }
            b'}' => {
                self.advance();
                Some(Token::RightBrace)
            }

            b',' => {
                self.advance();
                Some(Token::Comma)
            }
            b':' => {
                self.advance();
                Some(Token::Colon)
            }
            b';' => {
                self.advance();
                Some(Token::Semicolon)
            }

            // Number starting with +/-
            #[allow(clippy::match_same_arms)] // Cannot merge: intermediate arms for +/- as delimiters
            b'+' | b'-' if self.starts_number() => Some(self.consume_numeric()),

            b'+' => {
                self.advance();
                Some(Token::Delim('+'))
            }
            b'-' if self.starts_identifier() => Some(self.consume_ident_like()),
            b'-' => {
                self.advance();
                Some(Token::Delim('-'))
            }

            // Number starting with dot
            #[allow(clippy::match_same_arms)] // Cannot merge with +/- arm above due to intermediate arms
            b'.' if self.starts_number() => Some(self.consume_numeric()),
            b'.' => {
                self.advance();
                Some(Token::Delim('.'))
            }

            b'@' => {
                self.advance();
                if self.starts_identifier_at_current() {
                    let name = self.consume_name();
                    Some(Token::AtKeyword(name))
                } else {
                    Some(Token::Delim('@'))
                }
            }

            b'\\' if self.is_valid_escape() => Some(self.consume_ident_like()),

            b'0'..=b'9' => Some(self.consume_numeric()),

            // Ident-start (ASCII letters, underscore, or non-ASCII/UTF-8 multibyte)
            b'a'..=b'z' | b'A'..=b'Z' | b'_' | 0x80.. => Some(self.consume_ident_like()),

            _ => {
                self.advance();
                Some(Token::Delim(b as char))
            }
        }
    }

    fn skip_comments(&mut self) {
        while self.pos + 1 < self.input.len() && self.input[self.pos] == b'/' && self.input[self.pos + 1] == b'*' {
            self.pos += 2;
            loop {
                if self.pos + 1 >= self.input.len() {
                    // Unclosed comment — consume rest of input
                    self.pos = self.input.len();
                    break;
                }
                if self.input[self.pos] == b'*' && self.input[self.pos + 1] == b'/' {
                    self.pos += 2;
                    break;
                }
                self.pos += 1;
            }
        }
    }

    fn consume_whitespace(&mut self) {
        while let Some(b) = self.peek() {
            if matches!(b, b' ' | b'\t' | b'\n' | b'\r' | 0x0C) {
                self.pos += 1;
            } else {
                break;
            }
        }
    }

    fn consume_string(&mut self, quote: u8) -> Token {
        self.advance();
        let mut value = std::string::String::new();
        loop {
            match self.advance() {
                None | Some(b'\n' | b'\r') => break, // bad string → treat as string
                Some(b) if b == quote => break,
                Some(b'\\') => {
                    match self.peek() {
                        None => {} // EOF after backslash
                        Some(b'\n' | b'\r') => {
                            self.advance(); // line continuation
                        }
                        _ => {
                            let ch = self.consume_escape();
                            value.push(ch);
                        }
                    }
                }
                Some(b) => {
                    if b < 0x80 {
                        value.push(b as char);
                    } else {
                        self.pos -= 1;
                        let ch = self.consume_utf8_char();
                        value.push(ch);
                    }
                }
            }
        }
        Token::String(value)
    }

    fn consume_escape(&mut self) -> char {
        match self.advance() {
            None => char::REPLACEMENT_CHARACTER,
            Some(b) if b.is_ascii_hexdigit() => {
                let mut hex = std::string::String::new();
                hex.push(b as char);
                for _ in 0..5 {
                    if let Some(h) = self.peek() {
                        if h.is_ascii_hexdigit() {
                            hex.push(h as char);
                            self.advance();
                        } else {
                            break;
                        }
                    }
                }
                // Optional whitespace after hex escape
                if let Some(ws) = self.peek()
                    && matches!(ws, b' ' | b'\t' | b'\n' | b'\r' | 0x0C)
                {
                    self.advance();
                }
                let code_point = u32::from_str_radix(&hex, 16).unwrap_or(0);
                char::from_u32(code_point)
                    .filter(|c| *c != '\0')
                    .unwrap_or(char::REPLACEMENT_CHARACTER)
            }
            Some(b) => {
                if b < 0x80 {
                    b as char
                } else {
                    self.pos -= 1;
                    self.consume_utf8_char()
                }
            }
        }
    }

    fn consume_utf8_char(&mut self) -> char {
        let start = self.pos;
        let remaining = &self.input[start..];
        let s = std::str::from_utf8(remaining).unwrap_or("");
        if let Some(ch) = s.chars().next() {
            self.pos += ch.len_utf8();
            ch
        } else {
            self.pos += 1;
            char::REPLACEMENT_CHARACTER
        }
    }

    fn consume_name(&mut self) -> String {
        let mut name = std::string::String::new();
        loop {
            match self.peek() {
                Some(b) if is_name_code_point(b) => {
                    if b < 0x80 {
                        name.push(b as char);
                        self.advance();
                    } else {
                        let ch = self.consume_utf8_char();
                        name.push(ch);
                    }
                }
                Some(b'\\') if self.is_valid_escape() => {
                    self.advance();
                    let ch = self.consume_escape();
                    name.push(ch);
                }
                _ => break,
            }
        }
        name
    }

    fn consume_numeric(&mut self) -> Token {
        let value = self.consume_number();

        if self.starts_identifier_at_current() {
            let unit = self.consume_name();
            Token::Dimension {
                value,
                unit: unit.to_ascii_lowercase(),
            }
        } else if self.peek() == Some(b'%') {
            self.advance();
            Token::Percentage(value)
        } else {
            Token::Number(value)
        }
    }

    fn consume_number(&mut self) -> f64 {
        let start = self.pos;

        if matches!(self.peek(), Some(b'+' | b'-')) {
            self.advance();
        }

        while matches!(self.peek(), Some(b'0'..=b'9')) {
            self.advance();
        }

        if self.peek() == Some(b'.') && matches!(self.peek_at(1), Some(b'0'..=b'9')) {
            self.advance();
            while matches!(self.peek(), Some(b'0'..=b'9')) {
                self.advance();
            }
        }

        if matches!(self.peek(), Some(b'e' | b'E')) {
            let next = self.peek_at(1);
            if matches!(next, Some(b'0'..=b'9'))
                || (matches!(next, Some(b'+' | b'-')) && matches!(self.peek_at(2), Some(b'0'..=b'9')))
            {
                self.advance();
                if matches!(self.peek(), Some(b'+' | b'-')) {
                    self.advance();
                }
                while matches!(self.peek(), Some(b'0'..=b'9')) {
                    self.advance();
                }
            }
        }

        let s = self.slice(start, self.pos);
        s.parse::<f64>().unwrap_or(0.0)
    }

    fn consume_ident_like(&mut self) -> Token {
        let name = self.consume_name();

        if self.peek() == Some(b'(') {
            self.advance();
            Token::Function(name)
        } else {
            Token::Ident(name)
        }
    }

    /// Check if the current position starts a number (CSS spec § 4.3.10).
    fn starts_number(&self) -> bool {
        match self.peek() {
            Some(b'+' | b'-') => {
                matches!(self.peek_at(1), Some(b'0'..=b'9'))
                    || (self.peek_at(1) == Some(b'.') && matches!(self.peek_at(2), Some(b'0'..=b'9')))
            }
            Some(b'.') => matches!(self.peek_at(1), Some(b'0'..=b'9')),
            Some(b'0'..=b'9') => true,
            _ => false,
        }
    }

    /// Check if current position starts an identifier (including `-` prefix).
    fn starts_identifier(&self) -> bool {
        match self.peek() {
            Some(b'-') => match self.peek_at(1) {
                Some(b) if is_name_start_code_point(b) => true,
                Some(b'-') => true,
                Some(b'\\') => self.pos + 2 < self.input.len() && self.input[self.pos + 2] != b'\n',
                _ => false,
            },
            Some(b) if is_name_start_code_point(b) => true,
            Some(b'\\') => self.is_valid_escape(),
            _ => false,
        }
    }

    fn starts_identifier_at_current(&self) -> bool {
        self.starts_identifier()
    }

    fn is_valid_escape(&self) -> bool {
        self.peek() == Some(b'\\') && self.peek_at(1).is_some_and(|b| b != b'\n' && b != b'\r')
    }
}

/// CSS name-start code point: letter, non-ASCII, or underscore.
fn is_name_start_code_point(b: u8) -> bool {
    b.is_ascii_alphabetic() || b == b'_' || b >= 0x80
}

/// CSS name code point: name-start, digit, or hyphen.
fn is_name_code_point(b: u8) -> bool {
    is_name_start_code_point(b) || b.is_ascii_digit() || b == b'-'
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_ident() {
        assert_eq!(tokenize("red"), vec![Token::Ident("red".into())]);
        assert_eq!(tokenize("auto"), vec![Token::Ident("auto".into())]);
    }

    #[test]
    fn basic_number() {
        assert_eq!(tokenize("42"), vec![Token::Number(42.0)]);
        assert_eq!(tokenize("3.14"), vec![Token::Number(3.14)]);
        assert_eq!(tokenize("0"), vec![Token::Number(0.0)]);
    }

    #[test]
    fn dimension() {
        assert_eq!(
            tokenize("10px"),
            vec![Token::Dimension {
                value: 10.0,
                unit: "px".into()
            }]
        );
        assert_eq!(
            tokenize("2em"),
            vec![Token::Dimension {
                value: 2.0,
                unit: "em".into()
            }]
        );
        assert_eq!(
            tokenize("1.5rem"),
            vec![Token::Dimension {
                value: 1.5,
                unit: "rem".into()
            }]
        );
    }

    #[test]
    fn percentage() {
        assert_eq!(tokenize("50%"), vec![Token::Percentage(50.0)]);
        assert_eq!(tokenize("100%"), vec![Token::Percentage(100.0)]);
    }

    #[test]
    fn hash() {
        assert_eq!(tokenize("#ff0000"), vec![Token::Hash("#ff0000".into())]);
        assert_eq!(tokenize("#abc"), vec![Token::Hash("#abc".into())]);
    }

    #[test]
    fn string_tokens() {
        assert_eq!(tokenize("\"hello\""), vec![Token::String("hello".into())]);
        assert_eq!(tokenize("'world'"), vec![Token::String("world".into())]);
    }

    #[test]
    fn function_token() {
        assert_eq!(tokenize("rgb("), vec![Token::Function("rgb".into())]);
        assert_eq!(tokenize("calc("), vec![Token::Function("calc".into())]);
    }

    #[test]
    fn function_with_args() {
        assert_eq!(
            tokenize("rgb(255, 0, 0)"),
            vec![
                Token::Function("rgb".into()),
                Token::Number(255.0),
                Token::Comma,
                Token::Whitespace,
                Token::Number(0.0),
                Token::Comma,
                Token::Whitespace,
                Token::Number(0.0),
                Token::RightParen,
            ]
        );
    }

    #[test]
    fn signed_numbers() {
        assert_eq!(tokenize("+123"), vec![Token::Number(123.0)]);
        assert_eq!(tokenize("-1.5"), vec![Token::Number(-1.5)]);
        assert_eq!(tokenize("+0"), vec![Token::Number(0.0)]);
    }

    #[test]
    fn decimal_without_leading_zero() {
        assert_eq!(tokenize(".5"), vec![Token::Number(0.5)]);
        assert_eq!(
            tokenize(".25em"),
            vec![Token::Dimension {
                value: 0.25,
                unit: "em".into()
            }]
        );
    }

    #[test]
    fn scientific_notation() {
        assert_eq!(tokenize("1e2"), vec![Token::Number(100.0)]);
        assert_eq!(tokenize("1.5e3"), vec![Token::Number(1500.0)]);
        assert_eq!(tokenize("1e-2"), vec![Token::Number(0.01)]);
    }

    #[test]
    fn dashed_ident() {
        assert_eq!(tokenize("--custom-prop"), vec![Token::Ident("--custom-prop".into())]);
        assert_eq!(tokenize("--"), vec![Token::Ident("--".into())]);
    }

    #[test]
    fn whitespace_handling() {
        assert_eq!(
            tokenize("10px 20px"),
            vec![
                Token::Dimension {
                    value: 10.0,
                    unit: "px".into()
                },
                Token::Whitespace,
                Token::Dimension {
                    value: 20.0,
                    unit: "px".into()
                },
            ]
        );
    }

    #[test]
    fn comments_are_skipped() {
        assert_eq!(tokenize("/* comment */red"), vec![Token::Ident("red".into())]);
        assert_eq!(
            tokenize("10px/* x */20px"),
            vec![
                Token::Dimension {
                    value: 10.0,
                    unit: "px".into()
                },
                Token::Dimension {
                    value: 20.0,
                    unit: "px".into()
                },
            ]
        );
    }

    #[test]
    fn comma_separated() {
        assert_eq!(
            tokenize("red, blue"),
            vec![
                Token::Ident("red".into()),
                Token::Comma,
                Token::Whitespace,
                Token::Ident("blue".into()),
            ]
        );
    }

    #[test]
    fn delimiters() {
        assert_eq!(tokenize("/"), vec![Token::Delim('/')]);
        assert_eq!(tokenize("*"), vec![Token::Delim('*')]);
    }

    #[test]
    fn at_keyword() {
        assert_eq!(tokenize("@media"), vec![Token::AtKeyword("media".into())]);
    }

    #[test]
    fn empty_input() {
        assert_eq!(tokenize(""), Vec::<Token>::new());
    }

    #[test]
    fn complex_value() {
        // e.g., `1px solid #000`
        assert_eq!(
            tokenize("1px solid #000"),
            vec![
                Token::Dimension {
                    value: 1.0,
                    unit: "px".into()
                },
                Token::Whitespace,
                Token::Ident("solid".into()),
                Token::Whitespace,
                Token::Hash("#000".into()),
            ]
        );
    }

    #[test]
    fn unicode_escape() {
        // \41 → 'A'
        assert_eq!(tokenize("\\41 bc"), vec![Token::Ident("Abc".into())]);
    }

    #[test]
    fn var_function() {
        assert_eq!(
            tokenize("var(--x)"),
            vec![
                Token::Function("var".into()),
                Token::Ident("--x".into()),
                Token::RightParen,
            ]
        );
    }

    #[test]
    fn var_with_fallback() {
        assert_eq!(
            tokenize("var(--x, 10px)"),
            vec![
                Token::Function("var".into()),
                Token::Ident("--x".into()),
                Token::Comma,
                Token::Whitespace,
                Token::Dimension {
                    value: 10.0,
                    unit: "px".into()
                },
                Token::RightParen,
            ]
        );
    }

    #[test]
    fn calc_expression() {
        assert_eq!(
            tokenize("calc(100% - 20px)"),
            vec![
                Token::Function("calc".into()),
                Token::Percentage(100.0),
                Token::Whitespace,
                Token::Delim('-'),
                Token::Whitespace,
                Token::Dimension {
                    value: 20.0,
                    unit: "px".into()
                },
                Token::RightParen,
            ]
        );
    }

    #[test]
    fn negative_dimension() {
        assert_eq!(
            tokenize("-10px"),
            vec![Token::Dimension {
                value: -10.0,
                unit: "px".into()
            }]
        );
    }

    #[test]
    fn case_insensitive_units() {
        // Units are lowercased
        assert_eq!(
            tokenize("10PX"),
            vec![Token::Dimension {
                value: 10.0,
                unit: "px".into()
            }]
        );
    }

    #[test]
    fn minus_as_delim_before_non_number() {
        // `-` followed by something that doesn't start a number or identifier
        assert_eq!(
            tokenize("- 10px"),
            vec![
                Token::Delim('-'),
                Token::Whitespace,
                Token::Dimension {
                    value: 10.0,
                    unit: "px".into()
                },
            ]
        );
    }

    #[test]
    fn plus_as_delim() {
        assert_eq!(
            tokenize("+ 10px"),
            vec![
                Token::Delim('+'),
                Token::Whitespace,
                Token::Dimension {
                    value: 10.0,
                    unit: "px".into()
                },
            ]
        );
    }

    // Edge cases (QA review)

    #[test]
    fn unclosed_comment() {
        // Unclosed comment consumes rest of input; whitespace before /* is preserved
        assert_eq!(
            tokenize("10px /* unclosed"),
            vec![
                Token::Dimension {
                    value: 10.0,
                    unit: "px".into()
                },
                Token::Whitespace,
            ]
        );
    }

    #[test]
    fn unclosed_string_double() {
        // Unclosed string is treated as a string token
        let tokens = tokenize("\"unclosed");
        assert_eq!(tokens, vec![Token::String("unclosed".into())]);
    }

    #[test]
    fn unclosed_string_single() {
        let tokens = tokenize("'unclosed");
        assert_eq!(tokens, vec![Token::String("unclosed".into())]);
    }

    #[test]
    fn multiple_comments() {
        assert_eq!(
            tokenize("/* c1 */ red /* c2 */ blue"),
            vec![
                Token::Whitespace,
                Token::Ident("red".into()),
                Token::Whitespace,
                Token::Whitespace,
                Token::Ident("blue".into()),
            ]
        );
    }

    #[test]
    fn function_without_closing_paren() {
        let tokens = tokenize("rgb(255, 0, 0");
        assert_eq!(tokens[0], Token::Function("rgb".into()));
        assert_eq!(tokens.last(), Some(&Token::Number(0.0)));
    }

    #[test]
    fn hash_bare_pound() {
        // # followed by non-name-code-point
        assert_eq!(tokenize("# "), vec![Token::Delim('#'), Token::Whitespace]);
    }

    #[test]
    fn multibyte_ident() {
        // Japanese ident
        let tokens = tokenize("色");
        assert_eq!(tokens, vec![Token::Ident("色".into())]);
    }
}
