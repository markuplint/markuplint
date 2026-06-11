#[derive(Clone, Debug, PartialEq)]
pub enum Token {
    /// An identifier (e.g., `red`, `auto`, `none`).
    Ident(String),

    /// A function token (e.g., `rgb(`). The name does NOT include the `(`.
    Function(String),

    /// An at-keyword (e.g., `@media`). The name does NOT include the `@`.
    AtKeyword(String),

    /// A hash token (e.g., `#ff0000`). The value includes the `#`.
    Hash(String),

    /// A string token (e.g., `"hello"`, `'world'`).
    String(String),

    /// A numeric token without a unit (e.g., `42`, `3.14`, `-1`).
    Number(f64),

    /// A percentage token (e.g., `50%`). The value is the numeric part.
    Percentage(f64),

    /// A dimension token (e.g., `10px`, `2em`).
    Dimension {
        value: f64,
        unit: String,
    },

    Comma,

    Colon,

    Semicolon,

    /// Left parenthesis `(` (not preceded by a function name).
    LeftParen,

    RightParen,

    LeftBracket,

    RightBracket,

    LeftBrace,

    RightBrace,

    /// A delimiter character (any single code point not matched by another token type).
    Delim(char),

    /// Whitespace (one or more whitespace characters, collapsed into a single token).
    Whitespace,
}

impl Token {
    pub fn is_whitespace(&self) -> bool {
        matches!(self, Token::Whitespace)
    }
}
