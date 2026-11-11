//! Port of `packages/@markuplint/types/src/token/`: the tokens a checker splits a value into, and
//! the collection that checks a list of them.
//!
//! An offset is a byte offset into the original value (TS counts UTF-16 code units); the line and
//! column an unmatched result carries are counted as TS counts them (the column in UTF-16 code
//! units), so a position in a message is the one the TypeScript engine reports.

use std::rc::Rc;

use regex::Regex;

use crate::check::types::{
    CheckResult, Expect, ListNumber, ListType, Reason, Separator, UnmatchedOpts, UnmatchedResult, matched,
    unmatched_with,
};

/// TS `Token.Ident` / `Token.WhiteSpace` / `Token.Comma`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TokenKind {
    Ident,
    WhiteSpace,
    Comma,
}

/// TS `Token.whitespace`.
pub const WHITESPACE: [char; 5] = ['\u{0009}', '\u{000A}', '\u{000C}', '\u{000D}', '\u{0020}'];

fn is_ws(c: char) -> bool {
    WHITESPACE.contains(&c)
}

/// TS `Token`.
#[derive(Debug, Clone)]
pub struct Token {
    pub value: String,
    /// The byte offset of the token in [`Token::original_value`].
    pub offset: usize,
    pub original_value: Rc<str>,
    pub kind: TokenKind,
}

/// TS `Token.getPosition`: the 1-based line and column of `offset` (a byte offset) in `value`.
#[must_use]
pub fn get_position(value: &str, offset: usize) -> (usize, usize) {
    let offset = offset.min(value.len());
    let before = value.get(..offset).unwrap_or(value);
    let line = before.matches('\n').count() + 1;
    let last = before.rsplit('\n').next().unwrap_or("");
    (line, last.encode_utf16().count() + 1)
}

impl Token {
    #[must_use]
    pub fn new(value: &str, offset: usize, original_value: Rc<str>, separators: &[char]) -> Self {
        Self {
            kind: Self::get_type(value, separators),
            value: value.to_owned(),
            offset,
            original_value,
        }
    }

    /// TS `Token.getType`.
    #[must_use]
    pub fn get_type(value: &str, separators: &[char]) -> TokenKind {
        let first = value.chars().next();
        match first {
            Some(c) if is_ws(c) => TokenKind::WhiteSpace,
            Some(',') if separators.contains(&',') => TokenKind::Comma,
            _ => TokenKind::Ident,
        }
    }

    /// TS `Token.shiftLocation`: `(offset, line, column)` of `offset` bytes past the token.
    #[must_use]
    pub fn shift_location(&self, offset: usize) -> (usize, usize, usize) {
        let shifted = self.offset + offset;
        let (line, column) = get_position(&self.original_value, shifted);
        (shifted, line, column)
    }

    /// TS `token.length`, in bytes.
    #[must_use]
    pub fn len(&self) -> usize {
        self.value.len()
    }

    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.value.is_empty()
    }

    /// TS `token.matches(string)`.
    #[must_use]
    pub fn matches_str(&self, value: &str, case_insensitive: bool) -> bool {
        if case_insensitive {
            self.value.to_lowercase() == value.to_lowercase()
        } else {
            self.value == value
        }
    }

    /// TS `token.matches(string[])`.
    #[must_use]
    pub fn matches_any(&self, values: &[&str], case_insensitive: bool) -> bool {
        values.iter().any(|v| self.matches_str(v, case_insensitive))
    }

    /// TS `token.matches(RegExp)`.
    #[must_use]
    pub fn matches_re(&self, re: &Regex) -> bool {
        re.is_match(&self.value)
    }

    /// TS `token.includes(string)`.
    #[must_use]
    pub fn includes_str(&self, value: &str, case_insensitive: bool) -> bool {
        if case_insensitive {
            self.value.to_lowercase().contains(&value.to_lowercase())
        } else {
            self.value.contains(value)
        }
    }

    /// TS `Token#toNumber`.
    #[must_use]
    pub fn to_number(&self) -> f64 {
        crate::primitive::parse_float_prefix(&self.value).unwrap_or(0.0)
    }

    /// TS `token.unmatched(options)`. `reason` defaults to `syntax-error` as in TS.
    #[must_use]
    pub fn unmatched(&self, reason: Option<Reason>, opts: UnmatchedOpts) -> UnmatchedResult {
        let (line, column) = get_position(&self.original_value, self.offset);
        UnmatchedResult {
            ref_: opts.ref_,
            raw: self.value.clone(),
            length: self.value.len(),
            offset: self.offset,
            line,
            column,
            reason: reason.unwrap_or(Reason::SyntaxError),
            pass_count: opts.pass_count,
            part_name: opts.part_name,
            expects: opts.expects.unwrap_or_default(),
            extra: opts.extra,
            candidate: opts.candidate,
            fallback_to: opts.fallback_to,
        }
    }

    /// [`Token::unmatched`] as a [`CheckResult`].
    #[must_use]
    pub fn unmatched_result(&self, reason: Option<Reason>, opts: UnmatchedOpts) -> CheckResult {
        CheckResult::Unmatched(self.unmatched(reason, opts))
    }
}

/// The options of a [`TokenCollection`] (TS `TokenCollectionOptions`).
#[derive(Debug, Clone)]
#[allow(clippy::struct_excessive_bools)]
pub struct TokenCollectionOptions {
    pub allow_empty: bool,
    pub case_insensitive: bool,
    pub disallow_to_surround_by_spaces: bool,
    pub number: Option<ListNumber>,
    pub ordered: bool,
    pub separator: Separator,
    pub unique: bool,
    pub specific_separator: Vec<char>,
}

impl Default for TokenCollectionOptions {
    fn default() -> Self {
        Self {
            allow_empty: true,
            case_insensitive: true,
            disallow_to_surround_by_spaces: false,
            number: None,
            ordered: false,
            separator: Separator::Space,
            unique: false,
            specific_separator: Vec::new(),
        }
    }
}

impl TokenCollectionOptions {
    /// The options a list type gives its collection.
    #[must_use]
    pub fn from_list(list: &ListType) -> Self {
        Self {
            allow_empty: list.allow_empty,
            case_insensitive: list.case_insensitive,
            disallow_to_surround_by_spaces: list.disallow_to_surround_by_spaces,
            number: list.number.clone(),
            ordered: list.ordered,
            separator: list.separator.clone(),
            unique: list.unique,
            specific_separator: Vec::new(),
        }
    }

    #[must_use]
    pub fn with_separator(separator: Separator) -> Self {
        Self {
            separator,
            ..Self::default()
        }
    }
}

/// The result of [`TokenCollection::take_turns`].
#[derive(Debug, Clone)]
pub struct TakeTurnsError {
    pub unexpected_last_token: bool,
    pub expected_token_kind: TokenKind,
    pub token: Token,
}

/// A callback of [`TokenCollection::each_check`]: the head token and the tokens after it.
/// `None` is TS `void`.
pub type TokenEachCheck<'a> = Box<dyn Fn(Option<&Token>, &TokenCollection) -> Option<CheckResult> + 'a>;

/// TS `TokenCollection`.
#[derive(Debug, Clone)]
pub struct TokenCollection {
    pub tokens: Vec<Token>,
    pub options: TokenCollectionOptions,
}

impl std::ops::Deref for TokenCollection {
    type Target = Vec<Token>;
    fn deref(&self) -> &Self::Target {
        &self.tokens
    }
}

impl TokenCollection {
    /// TS `new TokenCollection(value, typeOptions)`.
    #[must_use]
    pub fn new(value: &str, options: TokenCollectionOptions) -> Self {
        let mut collection = Self {
            tokens: Vec::new(),
            options,
        };
        if value.is_empty() {
            return collection;
        }
        let mut separators: Vec<char> = Vec::new();
        if collection.options.separator == Separator::Comma {
            separators.push(',');
        }
        separators.extend(collection.options.specific_separator.iter().copied());

        let mut values: Vec<String> = Vec::new();
        for c in value.chars() {
            let Some(last) = values.pop() else {
                values.push(c.to_string());
                continue;
            };
            let last_char = last.chars().next();
            if let Some(lc) = last_char
                && !separators.contains(&c)
                && !separators.contains(&lc)
                && is_ws(lc) == is_ws(c)
            {
                values.push(format!("{last}{c}"));
            } else {
                values.push(last);
                values.push(c.to_string());
            }
        }

        let original: Rc<str> = Rc::from(value);
        let mut offset = 0;
        for v in values {
            let len = v.len();
            collection
                .tokens
                .push(Token::new(&v, offset, Rc::clone(&original), &separators));
            offset += len;
        }
        collection
    }

    /// TS `TokenCollection.#new`: a collection of `tokens` with the options of `old`.
    #[must_use]
    pub fn with_tokens(tokens: Vec<Token>, old: &Self) -> Self {
        Self {
            tokens,
            options: old.options.clone(),
        }
    }

    /// TS `TokenCollection.fromPatterns`.
    #[must_use]
    pub fn from_patterns(value: &str, patterns: &[&Regex], options: TokenCollectionOptions, repeat: bool) -> Self {
        Self::from_patterns_at(value, 0, &Rc::from(value), patterns, options, repeat)
    }

    /// TS `TokenCollection.fromPatterns` with a token as the value.
    #[must_use]
    pub fn from_patterns_token(
        token: &Token,
        patterns: &[&Regex],
        options: TokenCollectionOptions,
        repeat: bool,
    ) -> Self {
        Self::from_patterns_at(
            &token.value,
            token.offset,
            &token.original_value,
            patterns,
            options,
            repeat,
        )
    }

    fn from_patterns_at(
        value: &str,
        start_offset: usize,
        original: &Rc<str>,
        patterns: &[&Regex],
        options: TokenCollectionOptions,
        repeat: bool,
    ) -> Self {
        let mut strings: String = value.to_owned();
        let mut cumulative_offset = start_offset;
        let mut tokens: Vec<Token> = Vec::new();

        let mut add_token = |token_value: &str, strings: &mut String, cumulative_offset: &mut usize| {
            tokens.push(Token::new(token_value, *cumulative_offset, Rc::clone(original), &[]));
            *strings = strings.get(token_value.len()..).unwrap_or("").to_owned();
            *cumulative_offset += token_value.len();
        };

        loop {
            let mut is_broken = false;
            for pattern in patterns {
                let token_value = match pattern.find(&strings) {
                    Some(m) if m.start() == 0 => m.as_str().to_owned(),
                    Some(m) => strings.get(m.end()..).unwrap_or("").to_owned(),
                    None => {
                        is_broken = true;
                        String::new()
                    }
                };
                add_token(&token_value, &mut strings, &mut cumulative_offset);
            }
            if is_broken {
                let rest = strings.clone();
                add_token(&rest, &mut strings, &mut cumulative_offset);
            }
            if !repeat || strings.is_empty() {
                break;
            }
        }

        if !strings.is_empty() {
            let rest = strings.clone();
            add_token(&rest, &mut strings, &mut cumulative_offset);
        }

        Self { tokens, options }
    }

    /// TS `collection.value`.
    #[must_use]
    pub fn value(&self) -> String {
        self.tokens.iter().map(|t| t.value.as_str()).collect()
    }

    /// TS `collection.check({ expects, ref })`.
    #[must_use]
    pub fn check(&self, expects: Option<&[Expect]>, ref_: Option<&str>) -> CheckResult {
        let opts = || UnmatchedOpts {
            ref_: ref_.map(str::to_owned),
            expects: expects.map(<[Expect]>::to_vec),
            ..Default::default()
        };

        if self.options.separator != Separator::Space && self.options.disallow_to_surround_by_spaces {
            for token in &self.tokens {
                if token.kind == TokenKind::WhiteSpace {
                    return token.unmatched_result(Some(Reason::UnexpectedSpace), opts());
                }
            }
        }

        if self.options.separator == Separator::Comma {
            let without_ws = self.filter(|t| t.kind != TokenKind::WhiteSpace);
            if let Some(consecutive) = without_ws.get_consecutive_token(TokenKind::Comma) {
                return consecutive.unmatched_result(Some(Reason::UnexpectedComma), opts());
            }
            if let Some(first) = without_ws.first()
                && first.kind == TokenKind::Comma
            {
                return first.unmatched_result(Some(Reason::UnexpectedComma), opts());
            }
            if let Some(err) = without_ws.take_turns(&[TokenKind::Ident, TokenKind::Comma], Some(TokenKind::Ident)) {
                if err.unexpected_last_token {
                    return err.token.unmatched_result(Some(Reason::ExtraToken), opts());
                } else if err.token.kind == err.expected_token_kind {
                    return err.token.unmatched_result(Some(Reason::UnexpectedComma), opts());
                }
                let mut o = opts();
                o.candidate = Some(format!(",{}", err.token.value));
                return err.token.unmatched_result(Some(Reason::MissingComma), o);
            }
        }

        let ident_tokens = self.get_ident_tokens();

        if !self.options.allow_empty && ident_tokens.is_empty() {
            return unmatched_with(&self.value(), Reason::EmptyToken, opts());
        }

        if self.options.unique
            && let Some(duplicated) = ident_tokens.get_duplicated()
        {
            let mut o = opts();
            o.part_name = Some("the content of the list".to_owned());
            return duplicated.unmatched_result(Some(Reason::Duplicated), o);
        }

        matched()
    }

    /// TS `collection.chunk(split)`.
    #[must_use]
    pub fn chunk(&self, split: usize) -> Vec<Self> {
        self.tokens
            .chunks(split.max(1))
            .map(|c| Self::with_tokens(c.to_vec(), self))
            .collect()
    }

    /// TS `collection.compareTokens(callback)`.
    pub fn compare_tokens(&self, mut callback: impl FnMut(&Token, &Token) -> Option<Token>) -> Option<Token> {
        for pair in self.tokens.windows(2) {
            if let Some(result) = callback(&pair[0], &pair[1]) {
                return Some(result);
            }
        }
        None
    }

    /// TS `collection.divide(position)`.
    #[must_use]
    pub fn divide(&self, position: usize) -> (Self, Self) {
        let position = position.min(self.tokens.len());
        (
            Self::with_tokens(self.tokens[..position].to_vec(), self),
            Self::with_tokens(self.tokens[position..].to_vec(), self),
        )
    }

    /// TS `collection.eachCheck(...callbacks)`.
    #[must_use]
    pub fn each_check(&self, callbacks: &[TokenEachCheck<'_>]) -> CheckResult {
        let (mut head, mut tail) = self.head_and_tail();
        let mut prev: Option<Token> = None;
        let mut cumulative_offset = 0;
        let mut pass_count: usize = 0;
        let mut first_unmatched: Option<UnmatchedResult> = None;
        let mut wait: i64 = 20;
        for callback in callbacks {
            wait -= 1;
            let result = callback(head.as_ref(), &tail);
            match result {
                Some(CheckResult::Unmatched(result)) => {
                    pass_count += result.pass_count.unwrap_or(0);
                    if let Some(p) = &prev
                        && result.offset == 0
                        && result.length == 0
                    {
                        let (offset, line, column) = p.shift_location(cumulative_offset);
                        if first_unmatched.is_none() {
                            first_unmatched = Some(UnmatchedResult {
                                offset,
                                line,
                                column,
                                ..result.clone()
                            });
                        }
                    }
                    if prev.is_none() && self.value().is_empty() && first_unmatched.is_none() {
                        first_unmatched = Some(UnmatchedResult {
                            reason: Reason::EmptyToken,
                            expects: Vec::new(),
                            ..result.clone()
                        });
                    }
                    match &result.reason {
                        Reason::ExtraToken => pass_count += 1,
                        Reason::OutOfRangeWithBounds { .. }
                        | Reason::OutOfRangeLengthChar { .. }
                        | Reason::OutOfRangeLengthDigit { .. } => {
                            pass_count += usize::try_from(2 * wait).unwrap_or(0);
                        }
                        _ => {}
                    }
                    if first_unmatched.is_none() {
                        first_unmatched = Some(result);
                    }
                }
                Some(CheckResult::Matched) if first_unmatched.is_none() => {
                    return CheckResult::Matched;
                }
                _ => {
                    if let Some(h) = &head
                        && !h.value.is_empty()
                        && !h.value.chars().all(char::is_whitespace)
                    {
                        pass_count += usize::try_from(4 * wait).unwrap_or(0);
                    }
                }
            }
            cumulative_offset = head.as_ref().map_or(0, Token::len);
            let next = tail.head_and_tail();
            prev = head;
            head = next.0;
            tail = next.1;
        }

        if let Some(first) = first_unmatched {
            return CheckResult::Unmatched(UnmatchedResult {
                pass_count: Some(pass_count),
                ..first
            });
        }
        matched()
    }

    /// TS `collection.filter(callback)`.
    #[must_use]
    pub fn filter(&self, callback: impl Fn(&Token) -> bool) -> Self {
        Self::with_tokens(self.tokens.iter().filter(|t| callback(t)).cloned().collect(), self)
    }

    /// TS `collection.getConsecutiveToken(tokenType)`.
    #[must_use]
    pub fn get_consecutive_token(&self, kind: TokenKind) -> Option<Token> {
        self.compare_tokens(|prev, current| (prev.kind == kind && current.kind == kind).then(|| current.clone()))
    }

    /// TS `collection.getDuplicated()`.
    #[must_use]
    pub fn get_duplicated(&self) -> Option<Token> {
        for a in &self.tokens {
            for b in &self.tokens {
                if a.offset == b.offset {
                    continue;
                }
                let same = if self.options.case_insensitive {
                    a.value.to_lowercase() == b.value.to_lowercase()
                } else {
                    a.value == b.value
                };
                if same {
                    return Some(b.clone());
                }
            }
        }
        None
    }

    /// TS `collection.getIdentTokens()`.
    #[must_use]
    pub fn get_ident_tokens(&self) -> Self {
        self.filter(|t| t.kind == TokenKind::Ident)
    }

    /// TS `collection.headAndTail()`.
    #[must_use]
    pub fn head_and_tail(&self) -> (Option<Token>, Self) {
        match self.tokens.split_first() {
            Some((head, rest)) => (Some(head.clone()), Self::with_tokens(rest.to_vec(), self)),
            None => (None, Self::with_tokens(Vec::new(), self)),
        }
    }

    /// TS `collection.search(value)` with a predicate in place of the `TokenValue`.
    #[must_use]
    pub fn search(&self, predicate: impl Fn(&Token) -> bool) -> Option<&Token> {
        self.tokens.iter().find(|t| predicate(t))
    }

    /// TS `collection.takeTurns(tokenNumbers, lastTokenNumber)`.
    #[must_use]
    pub fn take_turns(&self, kinds: &[TokenKind], last: Option<TokenKind>) -> Option<TakeTurnsError> {
        let count = self.tokens.len();
        for (i, token) in self.tokens.iter().enumerate() {
            let expected = kinds[i % kinds.len()];
            if token.kind != expected {
                return Some(TakeTurnsError {
                    unexpected_last_token: false,
                    expected_token_kind: expected,
                    token: token.clone(),
                });
            }
            if let Some(last) = last
                && i == count - 1
                && token.kind != last
            {
                return Some(TakeTurnsError {
                    unexpected_last_token: true,
                    expected_token_kind: expected,
                    token: token.clone(),
                });
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_like_ts() {
        let c = TokenCollection::new("a  b,c", TokenCollectionOptions::with_separator(Separator::Comma));
        let values: Vec<&str> = c.iter().map(|t| t.value.as_str()).collect();
        assert_eq!(values, ["a", "  ", "b", ",", "c"]);
        assert_eq!(c[3].kind, TokenKind::Comma);
        assert_eq!(c[3].offset, 4);
    }

    #[test]
    fn comma_list_errors() {
        let opts = || TokenCollectionOptions::with_separator(Separator::Comma);
        let CheckResult::Unmatched(r) = TokenCollection::new("a,,b", opts()).check(None, None) else {
            panic!()
        };
        assert_eq!(r.reason, Reason::UnexpectedComma);
        assert_eq!(r.column, 3);
        let CheckResult::Unmatched(r) = TokenCollection::new("a,b,", opts()).check(None, None) else {
            panic!()
        };
        assert_eq!(r.reason, Reason::ExtraToken);
        let CheckResult::Unmatched(r) = TokenCollection::new("a b", opts()).check(None, None) else {
            panic!()
        };
        assert_eq!(r.reason, Reason::MissingComma);
        assert_eq!(r.candidate.as_deref(), Some(",b"));
    }

    #[test]
    fn position_counts_utf16() {
        assert_eq!(get_position("例a\nbc", 6), (2, 2));
        assert_eq!(get_position("例ab", 4), (1, 3));
    }
}
