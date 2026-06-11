#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Position {
    /// 0-based byte offset.
    pub offset: usize,
    /// 1-based line number.
    pub line: u32,
    /// 1-based column number.
    pub col: u32,
}

/// Start inclusive, end exclusive.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Span {
    pub start: Position,
    pub end: Position,
}

impl Span {
    #[must_use]
    pub fn new(start: Position, end: Position) -> Self {
        Self { start, end }
    }

    #[must_use]
    pub fn empty(pos: Position) -> Self {
        Self { start: pos, end: pos }
    }

    /// Length in bytes.
    #[must_use]
    pub fn len(&self) -> usize {
        self.end.offset - self.start.offset
    }

    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

pub struct Input<'a> {
    source: &'a str,
    bytes: &'a [u8],
    pos: usize,
    line: u32,
    col: u32,
    /// Previous position (for reconsume).
    prev_pos: usize,
    prev_line: u32,
    prev_col: u32,
}

impl<'a> Input<'a> {
    #[must_use]
    pub fn new(source: &'a str) -> Self {
        Self {
            source,
            bytes: source.as_bytes(),
            pos: 0,
            line: 1,
            col: 1,
            prev_pos: 0,
            prev_line: 1,
            prev_col: 1,
        }
    }

    pub fn next_char(&mut self) -> Option<char> {
        // Save previous position for reconsume BEFORE the EOF check.
        // This ensures prev_pos == pos at EOF, so reconsume() is a
        // no-op and doesn't cause infinite loops.
        self.prev_pos = self.pos;
        self.prev_line = self.line;
        self.prev_col = self.col;

        if self.pos >= self.bytes.len() {
            return None;
        }

        let mut ch = self.current_char_at(self.pos);
        self.pos += ch.len_utf8();

        // WHATWG §13.2.3.5: Preprocessing the input stream.
        // CR (\r) and CRLF (\r\n) are normalized to LF (\n).
        if ch == '\r' {
            ch = '\n';
            // Skip the following \n if present (CRLF → single LF).
            if self.pos < self.bytes.len() && self.bytes[self.pos] == b'\n' {
                self.pos += 1;
            }
        }

        if ch == '\n' {
            self.line += 1;
            self.col = 1;
        } else {
            self.col += 1;
        }

        Some(ch)
    }

    #[must_use]
    pub fn peek(&self) -> Option<char> {
        if self.pos >= self.bytes.len() {
            None
        } else {
            let ch = self.current_char_at(self.pos);
            // Normalize CR to LF for peek too.
            if ch == '\r' { Some('\n') } else { Some(ch) }
        }
    }

    /// `n` positions ahead (0 = next char).
    #[must_use]
    pub fn peek_n(&self, n: usize) -> Option<char> {
        let mut offset = self.pos;
        for _ in 0..n {
            if offset >= self.bytes.len() {
                return None;
            }
            let ch = self.current_char_at(offset);
            offset += ch.len_utf8();
        }
        if offset >= self.bytes.len() {
            None
        } else {
            Some(self.current_char_at(offset))
        }
    }

    /// Case-insensitive.
    #[must_use]
    pub fn starts_with_ci(&self, s: &str) -> bool {
        let remaining = &self.source[self.pos..];
        if remaining.len() < s.len() {
            return false;
        }
        remaining[..s.len()].eq_ignore_ascii_case(s)
    }

    #[must_use]
    pub fn starts_with(&self, s: &str) -> bool {
        self.source[self.pos..].starts_with(s)
    }

    pub fn reconsume(&mut self) {
        // Only reconsume if pos actually advanced (not at EOF).
        // Reconsuming at EOF would put pos back to the last real
        // character, causing infinite loops in tokenizer states
        // that reconsume on the catch-all arm.
        if self.pos > self.prev_pos {
            self.pos = self.prev_pos;
            self.line = self.prev_line;
            self.col = self.prev_col;
        }
    }

    #[must_use]
    pub fn position(&self) -> Position {
        Position {
            offset: self.pos,
            line: self.line,
            col: self.col,
        }
    }

    /// Position before the last `next_char`.
    #[must_use]
    pub fn prev_position(&self) -> Position {
        Position {
            offset: self.prev_pos,
            line: self.prev_line,
            col: self.prev_col,
        }
    }

    #[must_use]
    pub fn is_eof(&self) -> bool {
        self.pos >= self.bytes.len()
    }

    /// Byte offsets.
    #[must_use]
    pub fn slice(&self, start: usize, end: usize) -> &'a str {
        &self.source[start..end]
    }

    #[must_use]
    pub fn source(&self) -> &'a str {
        self.source
    }

    pub fn advance(&mut self, n: usize) {
        for _ in 0..n {
            if self.next_char().is_none() {
                break;
            }
        }
    }

    fn current_char_at(&self, offset: usize) -> char {
        // SAFETY: source is valid UTF-8; we index at char boundaries.
        self.source[offset..].chars().next().unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_ascii() {
        let mut input = Input::new("abc");
        assert_eq!(
            input.position(),
            Position {
                offset: 0,
                line: 1,
                col: 1
            }
        );
        assert_eq!(input.next_char(), Some('a'));
        assert_eq!(
            input.position(),
            Position {
                offset: 1,
                line: 1,
                col: 2
            }
        );
        assert_eq!(input.next_char(), Some('b'));
        assert_eq!(input.next_char(), Some('c'));
        assert_eq!(input.next_char(), None);
        assert!(input.is_eof());
    }

    #[test]
    fn newline_tracking() {
        let mut input = Input::new("a\nb\nc");
        assert_eq!(input.next_char(), Some('a'));
        assert_eq!(
            input.position(),
            Position {
                offset: 1,
                line: 1,
                col: 2
            }
        );

        assert_eq!(input.next_char(), Some('\n'));
        assert_eq!(
            input.position(),
            Position {
                offset: 2,
                line: 2,
                col: 1
            }
        );

        assert_eq!(input.next_char(), Some('b'));
        assert_eq!(
            input.position(),
            Position {
                offset: 3,
                line: 2,
                col: 2
            }
        );

        assert_eq!(input.next_char(), Some('\n'));
        assert_eq!(
            input.position(),
            Position {
                offset: 4,
                line: 3,
                col: 1
            }
        );

        assert_eq!(input.next_char(), Some('c'));
        assert_eq!(
            input.position(),
            Position {
                offset: 5,
                line: 3,
                col: 2
            }
        );
    }

    #[test]
    fn multibyte_utf8() {
        let mut input = Input::new("a\u{00E9}b"); // "aéb" — é is 2 bytes
        assert_eq!(input.next_char(), Some('a'));
        assert_eq!(
            input.position(),
            Position {
                offset: 1,
                line: 1,
                col: 2
            }
        );

        assert_eq!(input.next_char(), Some('\u{00E9}'));
        assert_eq!(
            input.position(),
            Position {
                offset: 3,
                line: 1,
                col: 3
            }
        );

        assert_eq!(input.next_char(), Some('b'));
        assert_eq!(
            input.position(),
            Position {
                offset: 4,
                line: 1,
                col: 4
            }
        );
    }

    #[test]
    fn cjk_characters() {
        let mut input = Input::new("あいう"); // each is 3 bytes
        assert_eq!(input.next_char(), Some('あ'));
        assert_eq!(
            input.position(),
            Position {
                offset: 3,
                line: 1,
                col: 2
            }
        );

        assert_eq!(input.next_char(), Some('い'));
        assert_eq!(
            input.position(),
            Position {
                offset: 6,
                line: 1,
                col: 3
            }
        );
    }

    #[test]
    fn reconsume() {
        let mut input = Input::new("ab");
        assert_eq!(input.next_char(), Some('a'));
        input.reconsume();
        assert_eq!(
            input.position(),
            Position {
                offset: 0,
                line: 1,
                col: 1
            }
        );
        assert_eq!(input.next_char(), Some('a'));
        assert_eq!(input.next_char(), Some('b'));
    }

    #[test]
    fn peek_operations() {
        let mut input = Input::new("abc");
        assert_eq!(input.peek(), Some('a'));
        assert_eq!(input.peek_n(0), Some('a'));
        assert_eq!(input.peek_n(1), Some('b'));
        assert_eq!(input.peek_n(2), Some('c'));
        assert_eq!(input.peek_n(3), None);

        input.next_char(); // consume 'a'
        assert_eq!(input.peek(), Some('b'));
    }

    #[test]
    fn starts_with_checks() {
        let input = Input::new("<div>");
        assert!(input.starts_with("<div"));
        assert!(input.starts_with_ci("<DIV"));
        assert!(!input.starts_with("div"));
    }

    #[test]
    fn empty_input() {
        let mut input = Input::new("");
        assert!(input.is_eof());
        assert_eq!(input.next_char(), None);
        assert_eq!(input.peek(), None);
    }
}
