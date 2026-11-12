//! Port of css-tree's parser (`lib/parser/`, `lib/tokenizer/TokenStream.js`) for
//! `parse(value, { context: 'mediaQueryList', positions: true })`.
//!
//! Only what that context reaches is ported: `MediaQueryList`, `MediaQuery`, `Condition`,
//! `Feature`, `FeatureRange`, `FeatureFunction`, `GeneralEnclosed` and the value nodes they read
//! (the `Value` scope of `readSequence`). The tree keeps what TS `checkMediaQueryList` reads from
//! it: the media types, the features with their values, the `<general-enclosed>` fallbacks, and
//! their locations. The fallbacks (`parseWithFallback`) are what decides which node a group
//! becomes, so the parse errors and the points they are raised at follow css-tree.
//!
//! Offsets are UTF-16 code units, as css-tree counts them.

use super::tokenizer::{Source, TokenType, tokenize_units};

/// A css-tree parse error (`SyntaxError`); TS reads its `message`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParseError {
    pub message: String,
}

type PResult<T> = Result<T, ParseError>;

/// `MediaQuery`.
#[derive(Debug, Clone)]
pub struct MediaQuery {
    /// `loc.start.offset`.
    pub start: usize,
    pub media_type: Option<String>,
    pub condition: Option<Condition>,
}

/// `Condition`.
#[derive(Debug, Clone)]
pub struct Condition {
    pub children: Vec<ConditionChild>,
}

/// A child of a `Condition`.
#[derive(Debug, Clone)]
pub enum ConditionChild {
    Identifier,
    Feature(Feature),
    FeatureRange,
    Condition(Condition),
    /// `GeneralEnclosed` with its `loc` (`start`, `end`).
    GeneralEnclosed {
        start: usize,
        end: usize,
    },
}

/// `Feature`.
#[derive(Debug, Clone)]
pub struct Feature {
    pub start: usize,
    pub name: String,
    pub value: Option<FeatureValue>,
}

/// The value of a `Feature`: its node type and `loc`.
#[derive(Debug, Clone)]
pub struct FeatureValue {
    pub kind: ValueKind,
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ValueKind {
    Identifier,
    Number,
    Dimension,
    Ratio,
    Function,
}

/// The last term of a `Ratio`, `Feature` and `FeatureRange` read: its node type.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Term {
    Identifier,
    Other,
}

const SOLIDUS: u32 = 0x2F;
const LESSTHANSIGN: u32 = 0x3C;
const EQUALSSIGN: u32 = 0x3D;
const GREATERTHANSIGN: u32 = 0x3E;
const NUMBERSIGN: u32 = 0x23;
const ASTERISK: u32 = 0x2A;
const PLUSSIGN: u32 = 0x2B;
const HYPHENMINUS: u32 = 0x2D;
const QUESTIONMARK: u32 = 0x3F;
const EXCLAMATIONMARK: u32 = 0x21;
const SEMICOLON: u32 = 0x3B;

fn balance_pair(ty: Option<TokenType>) -> Option<TokenType> {
    match ty? {
        TokenType::Function | TokenType::LeftParenthesis => Some(TokenType::RightParenthesis),
        TokenType::LeftSquareBracket => Some(TokenType::RightSquareBracket),
        TokenType::LeftCurlyBracket => Some(TokenType::RightCurlyBracket),
        _ => None,
    }
}

fn is_block_opener(ty: Option<TokenType>) -> bool {
    matches!(
        ty,
        Some(
            TokenType::Function
                | TokenType::LeftParenthesis
                | TokenType::LeftSquareBracket
                | TokenType::LeftCurlyBracket
        )
    )
}

fn is_sc(ty: Option<TokenType>) -> bool {
    matches!(ty, Some(TokenType::WhiteSpace | TokenType::Comment))
}

/// What `skipUntilBalanced` stops at.
#[derive(Clone, Copy)]
enum StopAt {
    /// `consumeUntilBalanceEnd`
    BalanceEnd,
    /// `consumeUntilExclamationMarkOrSemicolon`
    ExclamationMarkOrSemicolon,
}

/// css-tree `TokenStream` and the parser methods on it. A token type of `None` is the EOF token.
struct Parser<'a> {
    source: &'a [u16],
    /// The type of each token; the entry at `token_count` is EOF.
    types: Vec<Option<TokenType>>,
    /// The end offset of each token; the entry at `token_count` is the source length.
    ends: Vec<usize>,
    balance: Vec<usize>,
    token_count: usize,
    first_char_offset: usize,
    eof: bool,
    token_index: usize,
    token_type: Option<TokenType>,
    token_start: usize,
    token_end: usize,
    /// The `loc.end` of the last value node read.
    last_node_end: usize,
}

impl<'a> Parser<'a> {
    /// `setSource`.
    fn new(source: &'a [u16]) -> Self {
        let tokens = tokenize_units(source);
        let token_count = tokens.len();
        let mut types = Vec::with_capacity(token_count + 1);
        let mut ends = Vec::with_capacity(token_count + 1);
        let mut balance = vec![0usize; token_count + 1];
        let mut first_char_offset = None;
        let mut balance_close_type: Option<TokenType> = None;
        let mut balance_start = source.len();

        for (index, &(ty, start, end)) in tokens.iter().enumerate() {
            types.push(Some(ty));
            ends.push(end);
            if first_char_offset.is_none() {
                first_char_offset = Some(start);
            }
            balance[index] = balance_start;
            if Some(ty) == balance_close_type {
                let prev_balance_start = balance.get(balance_start).copied().unwrap_or(0);
                // set reference to balance end for a block opener
                if let Some(slot) = balance.get_mut(balance_start) {
                    *slot = index;
                }
                // pop state
                balance_start = prev_balance_start;
                // css-tree reads the type of the token at `prevBalanceStart`, which past the
                // tokens is an unset buffer slot (no type)
                balance_close_type = balance_pair(types.get(prev_balance_start).copied().flatten());
            } else if is_block_opener(Some(ty)) {
                // push state
                balance_start = index;
                balance_close_type = balance_pair(Some(ty));
            }
        }
        types.push(None);
        ends.push(source.len());
        balance[token_count] = token_count;

        // reverse references from balance start to end
        for i in 0..token_count {
            let start = balance[i];
            if start <= i {
                let end = balance[start];
                if end != i {
                    balance[i] = end;
                }
            } else if start > token_count {
                balance[i] = token_count;
            }
        }

        let first_char_offset = first_char_offset.unwrap_or(0);
        let mut parser = Self {
            source,
            types,
            ends,
            balance,
            token_count,
            first_char_offset,
            eof: false,
            token_index: usize::MAX,
            token_type: None,
            token_start: first_char_offset,
            token_end: first_char_offset,
            last_node_end: 0,
        };
        parser.next();
        parser
    }

    fn src(&self) -> Source<'a> {
        Source { units: self.source }
    }

    fn char_code_at(&self, offset: usize) -> u32 {
        self.source.get(offset).map_or(0, |&c| u32::from(c))
    }

    fn substring(&self, start: usize, end: usize) -> String {
        let end = end.min(self.source.len());
        String::from_utf16_lossy(&self.source[start.min(end)..end])
    }

    // --- TokenStream ---

    fn lookup_type(&self, offset: isize) -> Option<TokenType> {
        let index = self.token_index.wrapping_add_signed(offset);
        if index < self.token_count {
            self.types[index]
        } else {
            None
        }
    }

    fn lookup_type_non_sc(&self, mut idx: usize) -> Option<TokenType> {
        let mut offset = self.token_index;
        while offset < self.token_count {
            let ty = self.types[offset];
            if !is_sc(ty) {
                if idx == 0 {
                    return ty;
                }
                idx -= 1;
            }
            offset += 1;
        }
        None
    }

    /// `lookupOffsetNonSC`: the offset of the `idx`-th non-whitespace token from the current one,
    /// or `0` (css-tree returns the EOF token type, `0`) when there is none.
    fn lookup_offset_non_sc(&self, mut idx: usize) -> usize {
        let mut offset = self.token_index;
        while offset < self.token_count {
            if !is_sc(self.types[offset]) {
                if idx == 0 {
                    return offset - self.token_index;
                }
                idx -= 1;
            }
            offset += 1;
        }
        0
    }

    /// `lookupOffset`: the start of the token `offset` tokens ahead.
    fn lookup_offset(&self, offset: usize) -> usize {
        let index = self.token_index + offset;
        if index < self.token_count {
            self.ends[index - 1]
        } else {
            self.source.len()
        }
    }

    /// `lookupNonWSType`.
    fn lookup_non_ws_type(&self, mut offset: isize) -> Option<TokenType> {
        loop {
            let ty = self.lookup_type(offset);
            offset += 1;
            // EOF is not whitespace, so the loop ends there
            if !is_sc(ty) {
                return ty;
            }
        }
    }

    fn lookup_value(&self, offset: usize, reference: &str) -> bool {
        let index = self.token_index + offset;
        if index < self.token_count {
            // css-tree reads `offsetAndType[-1]` for the first token, which is `0`
            let start = if index == 0 { 0 } else { self.ends[index - 1] };
            return self.src().cmp_str(start, self.ends[index], reference);
        }
        false
    }

    fn is_balance_edge(&self, token_index: usize) -> bool {
        self.balance[self.token_index.min(self.token_count)] < token_index
    }

    /// `isDelim(code, offset)`: a truthy `offset` looks ahead.
    fn is_delim_at(&self, code: u32, offset: usize) -> bool {
        if offset != 0 {
            return self.lookup_type(offset.cast_signed()) == Some(TokenType::Delim)
                && self.char_code_at(self.lookup_offset(offset)) == code;
        }
        self.is_delim(code)
    }

    fn is_delim(&self, code: u32) -> bool {
        self.token_type == Some(TokenType::Delim) && self.char_code_at(self.token_start) == code
    }

    fn skip(&mut self, token_count: isize) {
        let next = self.token_index.wrapping_add_signed(token_count);
        if next < self.token_count {
            self.token_index = next;
            self.token_start = if next == 0 {
                self.first_char_offset
            } else {
                self.ends[next - 1]
            };
            self.token_type = self.types[next];
            self.token_end = self.ends[next];
        } else {
            self.token_index = self.token_count;
            self.next();
        }
    }

    fn next(&mut self) {
        let next = self.token_index.wrapping_add(1);
        if next < self.token_count {
            self.token_index = next;
            self.token_start = self.token_end;
            self.token_type = self.types[next];
            self.token_end = self.ends[next];
        } else {
            self.eof = true;
            self.token_index = self.token_count;
            self.token_type = None;
            self.token_start = self.source.len();
            self.token_end = self.source.len();
        }
    }

    fn skip_sc(&mut self) {
        while is_sc(self.token_type) {
            self.next();
        }
    }

    fn skip_until_balanced(&mut self, start_token: usize, stop: StopAt) {
        let mut cursor = start_token;
        while cursor < self.token_count {
            let balance_end = self.balance[cursor];
            // stop scanning on balance edge that points to offset before start token
            if balance_end < start_token {
                break;
            }
            let offset = if cursor > 0 {
                self.ends[cursor - 1]
            } else {
                self.first_char_offset
            };
            let code = self.char_code_at(offset);
            let stop_here = match stop {
                StopAt::BalanceEnd => false,
                StopAt::ExclamationMarkOrSemicolon => code == EXCLAMATIONMARK || code == SEMICOLON,
            };
            if stop_here {
                break;
            }
            // fast forward to the end of balanced block for an open block tokens
            if is_block_opener(self.types[cursor]) {
                cursor = balance_end;
            }
            cursor += 1;
        }
        self.skip(cursor.cast_signed() - self.token_index.cast_signed());
    }

    // --- parser ---

    /// `this.error(message)`. css-tree also locates the error, which TS does not read, so the
    /// error carries its message only.
    #[allow(clippy::unused_self)]
    fn error(&self, message: &str) -> ParseError {
        ParseError {
            message: if message.is_empty() {
                "Unexpected input".to_owned()
            } else {
                message.to_owned()
            },
        }
    }

    /// `parseWithFallback`.
    fn with_fallback<T>(
        &mut self,
        consumer: impl FnOnce(&mut Self) -> PResult<T>,
        fallback: impl FnOnce(&mut Self) -> PResult<T>,
    ) -> PResult<T> {
        let start_index = self.token_index;
        if let Ok(value) = consumer(self) {
            return Ok(value);
        }
        self.skip(start_index.cast_signed() - self.token_index.cast_signed());
        fallback(self)
    }

    fn eat(&mut self, ty: TokenType) -> PResult<()> {
        if self.token_type != Some(ty) {
            let message = match ty {
                TokenType::Ident => {
                    if matches!(self.token_type, Some(TokenType::Function | TokenType::Url)) {
                        "Identifier is expected but function found".to_owned()
                    } else {
                        "Identifier is expected".to_owned()
                    }
                }
                TokenType::Percentage if self.token_type == Some(TokenType::Number) => {
                    "Percent sign is expected".to_owned()
                }
                TokenType::Hash if self.is_delim(NUMBERSIGN) => "Name is expected".to_owned(),
                _ => format!("{} is expected", token_name(ty)),
            };
            return Err(self.error(&message));
        }
        self.next();
        Ok(())
    }

    fn eat_ident(&mut self, name: &str) -> PResult<()> {
        if self.token_type != Some(TokenType::Ident) || !self.lookup_value(0, name) {
            return Err(self.error(&format!("Identifier \"{name}\" is expected")));
        }
        self.next();
        Ok(())
    }

    fn eat_delim(&mut self, code: u32) -> PResult<()> {
        if !self.is_delim(code) {
            let ch = char::from_u32(code).unwrap_or('\u{fffd}');
            return Err(self.error(&format!("Delim \"{ch}\" is expected")));
        }
        self.next();
        Ok(())
    }

    fn consume(&mut self, ty: TokenType) -> PResult<String> {
        let start = self.token_start;
        self.eat(ty)?;
        Ok(self.substring(start, self.token_start))
    }

    fn consume_function_name(&mut self) -> PResult<String> {
        let name = self.substring(self.token_start, self.token_end.saturating_sub(1));
        self.eat(TokenType::Function)?;
        Ok(name)
    }

    /// `consumeNumber(type)`.
    fn consume_number(&mut self, ty: TokenType) -> PResult<()> {
        self.eat(ty)
    }

    // --- nodes ---

    /// `MediaQueryList`.
    fn media_query_list(&mut self) -> PResult<Vec<MediaQuery>> {
        let mut children = Vec::new();
        self.skip_sc();
        while !self.eof {
            children.push(self.media_query()?);
            if self.token_type != Some(TokenType::Comma) {
                break;
            }
            self.next();
        }
        Ok(children)
    }

    /// `MediaQuery`.
    fn media_query(&mut self) -> PResult<MediaQuery> {
        let start = self.token_start;
        let mut media_type = None;
        let mut condition = None;

        self.skip_sc();

        if self.token_type == Some(TokenType::Ident) && self.lookup_type_non_sc(1) != Some(TokenType::LeftParenthesis) {
            // [ not | only ]? <media-type>
            let ident = self.consume(TokenType::Ident)?;
            let ident_lower_case = ident.to_lowercase();
            if ident_lower_case == "not" || ident_lower_case == "only" {
                self.skip_sc();
                media_type = Some(self.consume(TokenType::Ident)?);
            } else {
                media_type = Some(ident);
            }
            match self.lookup_type_non_sc(0) {
                Some(TokenType::Ident) => {
                    // and <media-condition-without-or>
                    self.skip_sc();
                    self.eat_ident("and")?;
                    condition = Some(self.condition()?);
                }
                Some(TokenType::LeftCurlyBracket | TokenType::Semicolon | TokenType::Comma) | None => {}
                _ => return Err(self.error("Identifier or parenthesis is expected")),
            }
        } else {
            match self.token_type {
                Some(TokenType::Ident | TokenType::LeftParenthesis | TokenType::Function) => {
                    // <media-condition>
                    condition = Some(self.condition()?);
                }
                Some(TokenType::LeftCurlyBracket | TokenType::Semicolon) | None => {}
                _ => return Err(self.error("Identifier or parenthesis is expected")),
            }
        }

        Ok(MediaQuery {
            start,
            media_type,
            condition,
        })
    }

    /// `Condition` (kind `media`).
    fn condition(&mut self) -> PResult<Condition> {
        let mut children = Vec::new();
        while !self.eof {
            match self.token_type {
                Some(TokenType::Comment | TokenType::WhiteSpace) => self.next(),
                Some(TokenType::Ident) => {
                    self.identifier()?;
                    children.push(ConditionChild::Identifier);
                }
                Some(TokenType::LeftParenthesis) => {
                    let term = self.with_fallback(|p| p.feature_or_range().map(Some), |_| Ok(None))?;
                    let term = match term {
                        Some(term) => term,
                        None => self.with_fallback(
                            |p| {
                                p.eat(TokenType::LeftParenthesis)?;
                                let res = p.condition()?;
                                p.eat(TokenType::RightParenthesis)?;
                                Ok(ConditionChild::Condition(res))
                            },
                            Self::general_enclosed,
                        )?,
                    };
                    children.push(term);
                }
                Some(TokenType::Function) => {
                    let term = self.with_fallback(|p| p.feature_function().map(Some), |_| Ok(None))?;
                    let term = match term {
                        Some(term) => term,
                        None => self.general_enclosed()?,
                    };
                    children.push(term);
                }
                _ => break,
            }
        }
        if children.is_empty() {
            return Err(self.error("Condition is expected"));
        }
        Ok(Condition { children })
    }

    /// `featureOrRange` of `Condition`.
    fn feature_or_range(&mut self) -> PResult<ConditionChild> {
        if self.lookup_type_non_sc(1) == Some(TokenType::Ident)
            && matches!(
                self.lookup_type_non_sc(2),
                Some(TokenType::Colon | TokenType::RightParenthesis) | None
            )
        {
            return self.feature().map(ConditionChild::Feature);
        }
        self.feature_range()?;
        Ok(ConditionChild::FeatureRange)
    }

    /// `FeatureFunction`: css-tree has no feature function for the `media` kind, so it always
    /// fails (`Unknown feature name()`).
    fn feature_function(&mut self) -> PResult<ConditionChild> {
        let name = self.consume_function_name()?;
        Err(self.error(&format!("Unknown feature {}()", name.to_lowercase())))
    }

    /// `Feature`.
    fn feature(&mut self) -> PResult<Feature> {
        let start = self.token_start;
        let mut value = None;

        self.eat(TokenType::LeftParenthesis)?;
        self.skip_sc();
        let name = self.consume(TokenType::Ident)?;
        self.skip_sc();

        if self.token_type != Some(TokenType::RightParenthesis) {
            self.eat(TokenType::Colon)?;
            self.skip_sc();
            let value_start = self.token_start;
            let kind = match self.token_type {
                Some(TokenType::Number) => {
                    if self.lookup_non_ws_type(1) == Some(TokenType::Delim) {
                        self.ratio()?;
                        ValueKind::Ratio
                    } else {
                        self.consume(TokenType::Number)?;
                        self.last_node_end = self.token_start;
                        ValueKind::Number
                    }
                }
                Some(TokenType::Dimension) => {
                    self.consume_number(TokenType::Dimension)?;
                    self.last_node_end = self.token_start;
                    ValueKind::Dimension
                }
                Some(TokenType::Ident) => {
                    self.identifier()?;
                    ValueKind::Identifier
                }
                Some(TokenType::Function) => self.with_fallback(
                    |p| {
                        p.function()?;
                        p.skip_sc();
                        if p.is_delim(SOLIDUS) {
                            return Err(p.error(""));
                        }
                        Ok(ValueKind::Function)
                    },
                    |p| {
                        p.ratio()?;
                        Ok(ValueKind::Ratio)
                    },
                )?,
                _ => return Err(self.error("Number, dimension, ratio or identifier is expected")),
            };
            value = Some(FeatureValue {
                kind,
                start: value_start,
                // a `Function` ends where its `)` was eaten, before the `skipSC` after it
                end: self.last_node_end,
            });
            self.skip_sc();
        }

        if !self.eof {
            self.eat(TokenType::RightParenthesis)?;
        }

        Ok(Feature { start, name, value })
    }

    /// `FeatureRange`.
    fn feature_range(&mut self) -> PResult<()> {
        self.skip_sc();
        self.eat(TokenType::LeftParenthesis)?;

        let left = self.read_term()?;
        self.read_comparison(left == Term::Identifier)?;
        self.read_term()?;

        if self.lookup_non_ws_type(0) != Some(TokenType::RightParenthesis) {
            self.read_comparison(false)?;
            self.read_term()?;
        }

        self.skip_sc();
        self.eat(TokenType::RightParenthesis)?;
        Ok(())
    }

    /// `readTerm` of `FeatureRange`.
    fn read_term(&mut self) -> PResult<Term> {
        self.skip_sc();
        match self.token_type {
            Some(TokenType::Number) => {
                if self.is_delim_at(SOLIDUS, self.lookup_offset_non_sc(1)) {
                    self.ratio()?;
                } else {
                    self.consume(TokenType::Number)?;
                }
                Ok(Term::Other)
            }
            Some(TokenType::Dimension) => {
                self.consume_number(TokenType::Dimension)?;
                Ok(Term::Other)
            }
            Some(TokenType::Ident) => {
                self.identifier()?;
                Ok(Term::Identifier)
            }
            Some(TokenType::Function) => {
                self.with_fallback(
                    |p| {
                        p.function()?;
                        p.skip_sc();
                        if p.is_delim(SOLIDUS) {
                            return Err(p.error(""));
                        }
                        Ok(())
                    },
                    Self::ratio,
                )?;
                Ok(Term::Other)
            }
            _ => Err(self.error("Number, dimension, ratio or identifier is expected")),
        }
    }

    /// `readComparison` of `FeatureRange`.
    fn read_comparison(&mut self, expect_colon: bool) -> PResult<()> {
        self.skip_sc();
        if self.is_delim(LESSTHANSIGN) || self.is_delim(GREATERTHANSIGN) {
            self.next();
            if self.is_delim(EQUALSSIGN) {
                self.next();
            }
            return Ok(());
        }
        // css-tree returns `=` without moving past it
        if self.is_delim(EQUALSSIGN) {
            return Ok(());
        }
        Err(self.error(&format!(
            "Expected {}\"<\", \">\", \"=\" or \")\"",
            if expect_colon { "\":\", " } else { "" }
        )))
    }

    /// `GeneralEnclosed`.
    fn general_enclosed(&mut self) -> PResult<ConditionChild> {
        let start = self.token_start;
        if self.token_type == Some(TokenType::Function) {
            self.consume_function_name()?;
        } else {
            self.eat(TokenType::LeftParenthesis)?;
        }
        self.with_fallback(
            |p| {
                let start_value_token = p.token_index;
                p.read_sequence()?;
                if !p.eof && !p.is_balance_edge(start_value_token) {
                    return Err(p.error(""));
                }
                Ok(())
            },
            |p| {
                p.raw(StopAt::BalanceEnd);
                Ok(())
            },
        )?;
        if !self.eof {
            self.eat(TokenType::RightParenthesis)?;
        }
        Ok(ConditionChild::GeneralEnclosed {
            start,
            end: self.token_start,
        })
    }

    /// `Raw(consumeUntil, false)`.
    fn raw(&mut self, stop: StopAt) {
        self.skip_until_balanced(self.token_index, stop);
        self.last_node_end = self.token_start;
    }

    /// `Ratio`.
    fn ratio(&mut self) -> PResult<()> {
        self.ratio_term()?;
        self.skip_sc();
        if self.is_delim(SOLIDUS) {
            self.eat_delim(SOLIDUS)?;
            self.ratio_term()?;
        }
        self.last_node_end = self.token_start;
        Ok(())
    }

    /// `consumeTerm` of `Ratio`.
    fn ratio_term(&mut self) -> PResult<()> {
        self.skip_sc();
        match self.token_type {
            Some(TokenType::Number) => self.consume(TokenType::Number).map(|_| ()),
            Some(TokenType::Function) => self.function(),
            _ => Err(self.error("Number of function is expected")),
        }
    }

    fn identifier(&mut self) -> PResult<()> {
        self.consume(TokenType::Ident)?;
        self.last_node_end = self.token_start;
        Ok(())
    }

    /// `readSequence(this.scope.Value)`.
    fn read_sequence(&mut self) -> PResult<()> {
        while !self.eof {
            if is_sc(self.token_type) {
                self.next();
            } else if !self.value_node()? {
                break;
            }
        }
        Ok(())
    }

    /// The default recognizer of the `Value` scope: reads one node, or returns `false` when the
    /// current token starts none.
    fn value_node(&mut self) -> PResult<bool> {
        match self.token_type {
            Some(
                TokenType::Hash | TokenType::String | TokenType::Dimension | TokenType::Percentage | TokenType::Number,
            ) => {
                let ty = self.token_type.unwrap_or(TokenType::Hash);
                self.consume(ty)?;
            }
            Some(TokenType::Comma) => self.next(),
            Some(TokenType::LeftParenthesis) => self.block(TokenType::LeftParenthesis, TokenType::RightParenthesis)?,
            Some(TokenType::LeftSquareBracket) => {
                self.block(TokenType::LeftSquareBracket, TokenType::RightSquareBracket)?;
            }
            Some(TokenType::Function) => {
                if self.src().cmp_str(self.token_start, self.token_end, "url(") {
                    self.url()?;
                } else {
                    self.function()?;
                }
            }
            Some(TokenType::Url) => self.url()?,
            Some(TokenType::Ident) => {
                // check for unicode range, it should start with u+ or U+
                if self.cmp_char(self.token_start, 0x75) && self.cmp_char(self.token_start + 1, PLUSSIGN) {
                    self.unicode_range()?;
                } else {
                    self.identifier()?;
                }
            }
            Some(TokenType::Delim) => {
                let code = self.char_code_at(self.token_start);
                if code == SOLIDUS || code == ASTERISK || code == PLUSSIGN || code == HYPHENMINUS {
                    // Operator
                    self.next();
                } else if code == NUMBERSIGN {
                    return Err(self.error("Hex or identifier is expected"));
                } else {
                    return Ok(false);
                }
            }
            _ => return Ok(false),
        }
        self.last_node_end = self.token_start;
        Ok(true)
    }

    fn cmp_char(&self, offset: usize, code: u32) -> bool {
        let mut c = self.char_code_at(offset);
        if (0x41..=0x5A).contains(&c) {
            c |= 32;
        }
        offset < self.source.len() && c == code
    }

    /// `Parentheses` / `Brackets`.
    fn block(&mut self, open: TokenType, close: TokenType) -> PResult<()> {
        self.eat(open)?;
        self.read_sequence()?;
        if !self.eof {
            self.eat(close)?;
        }
        Ok(())
    }

    /// `Function(readSequence, scope.Value)`.
    fn function(&mut self) -> PResult<()> {
        let name = self.consume_function_name()?;
        match name.to_lowercase().as_str() {
            "var" => self.var_function()?,
            "expression" => self.raw(StopAt::BalanceEnd),
            _ => self.read_sequence()?,
        }
        if !self.eof {
            self.eat(TokenType::RightParenthesis)?;
        }
        self.last_node_end = self.token_start;
        Ok(())
    }

    /// `var( <ident> , <value>? )` of the `Value` scope.
    fn var_function(&mut self) -> PResult<()> {
        self.skip_sc();
        self.identifier()?;
        self.skip_sc();
        if self.token_type == Some(TokenType::Comma) {
            self.next();
            self.raw(StopAt::ExclamationMarkOrSemicolon);
        }
        Ok(())
    }

    /// `Url`.
    fn url(&mut self) -> PResult<()> {
        match self.token_type {
            Some(TokenType::Url) => {
                self.consume(TokenType::Url)?;
            }
            Some(TokenType::Function) => {
                if !self.src().cmp_str(self.token_start, self.token_end, "url(") {
                    return Err(self.error("Function name must be `url`"));
                }
                self.eat(TokenType::Function)?;
                self.skip_sc();
                self.consume(TokenType::String)?;
                self.skip_sc();
                if !self.eof {
                    self.eat(TokenType::RightParenthesis)?;
                }
            }
            _ => return Err(self.error("Url or Function is expected")),
        }
        Ok(())
    }

    /// `UnicodeRange`.
    fn unicode_range(&mut self) -> PResult<()> {
        self.eat_ident("u")?;
        match self.token_type {
            Some(TokenType::Number) => {
                let hex_length = self.eat_hex_sequence(1, true)?;
                if self.is_delim(QUESTIONMARK) {
                    self.eat_question_mark_sequence(6 - hex_length)?;
                } else if matches!(self.token_type, Some(TokenType::Dimension | TokenType::Number)) {
                    if self.char_code_at(self.token_start) != HYPHENMINUS {
                        return Err(self.error("Hyphen minus is expected"));
                    }
                    self.eat_hex_sequence(1, false)?;
                }
            }
            Some(TokenType::Dimension) => {
                let hex_length = self.eat_hex_sequence(1, true)?;
                if hex_length > 0 {
                    self.eat_question_mark_sequence(6 - hex_length)?;
                }
            }
            _ => {
                self.eat_delim(PLUSSIGN)?;
                if self.token_type == Some(TokenType::Ident) {
                    let hex_length = self.eat_hex_sequence(0, true)?;
                    if hex_length > 0 {
                        self.eat_question_mark_sequence(6 - hex_length)?;
                    }
                } else if self.is_delim(QUESTIONMARK) {
                    self.next();
                    self.eat_question_mark_sequence(5)?;
                } else {
                    return Err(self.error("Hex digit or question mark is expected"));
                }
            }
        }
        Ok(())
    }

    /// `eatHexSequence`: the number of hex digits, or `-1` for a range.
    fn eat_hex_sequence(&mut self, offset: usize, allow_dash: bool) -> PResult<isize> {
        let mut len = 0usize;
        let mut pos = self.token_start + offset;
        while pos < self.token_end {
            let code = self.char_code_at(pos);
            if code == HYPHENMINUS && allow_dash && len != 0 {
                self.eat_hex_sequence(offset + len + 1, false)?;
                return Ok(-1);
            }
            if !super::tokenizer::is_hex_digit(code) {
                return Err(self.error(if allow_dash && len != 0 {
                    if len < 6 {
                        "Hyphen minus or hex digit is expected"
                    } else {
                        "Hyphen minus is expected"
                    }
                } else if len < 6 {
                    "Hex digit is expected"
                } else {
                    "Unexpected input"
                }));
            }
            len += 1;
            if len > 6 {
                return Err(self.error("Too many hex digits"));
            }
            pos += 1;
        }
        self.next();
        Ok(len.cast_signed())
    }

    fn eat_question_mark_sequence(&mut self, max: isize) -> PResult<()> {
        let mut count = 0;
        while self.is_delim(QUESTIONMARK) {
            count += 1;
            if count > max {
                return Err(self.error("Too many question marks"));
            }
            self.next();
        }
        Ok(())
    }
}

/// The name css-tree's `eat` gives a token type in `… is expected`.
fn token_name(ty: TokenType) -> &'static str {
    match ty {
        TokenType::Ident => "Ident",
        TokenType::Function => "Function",
        TokenType::AtKeyword => "At keyword",
        TokenType::Hash => "Hash",
        TokenType::String => "String",
        TokenType::BadString => "Bad string",
        TokenType::Url => "Url",
        TokenType::BadUrl => "Bad url",
        TokenType::Delim => "Delim",
        TokenType::Number => "Number",
        TokenType::Percentage => "Percentage",
        TokenType::Dimension => "Dimension",
        TokenType::WhiteSpace => "Whitespace",
        TokenType::Cdo => "CDO",
        TokenType::Cdc => "CDC",
        TokenType::Colon => "Colon",
        TokenType::Semicolon => "Semicolon",
        TokenType::Comma => "Comma",
        TokenType::LeftSquareBracket => "\"[\"",
        TokenType::RightSquareBracket => "\"]\"",
        TokenType::LeftParenthesis => "\"(\"",
        TokenType::RightParenthesis => "\")\"",
        TokenType::LeftCurlyBracket => "\"{\"",
        TokenType::RightCurlyBracket => "\"}\"",
        TokenType::Comment => "Comment",
    }
}

/// css-tree `parse(source, { context: 'mediaQueryList', positions: true })`.
///
/// # Errors
///
/// Returns the parse error css-tree throws.
pub fn parse_media_query_list(source: &[u16]) -> PResult<Vec<MediaQuery>> {
    let mut parser = Parser::new(source);
    let ast = parser.media_query_list()?;
    if !parser.eof {
        return Err(parser.error(""));
    }
    Ok(ast)
}
