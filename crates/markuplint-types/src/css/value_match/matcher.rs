//! Core CSS value matching engine.
//!
//! Matches a token stream against a CSS Value Definition Syntax AST using
//! recursive descent with backtracking.

use std::collections::HashSet;

use crate::css::syntax_definition::ast::{Combinator, MultiplierInfo, SyntaxNode};
use crate::css::value_match::error::MismatchInfo;
use crate::css::value_match::token::Token;

/// Matcher state: a cursor over a token stream with backtracking support.
pub struct Matcher<'a> {
    /// The token stream (whitespace tokens filtered out).
    tokens: &'a [Token],
    /// Current position in the token stream.
    pos: usize,
    /// The furthest position reached during matching (for error reporting).
    longest_match: usize,
    /// Expected values at the longest match position.
    expected_at_longest: Vec<String>,
    /// The original input string (for offset calculation).
    input: &'a str,
    /// Byte offsets for each token in the original input.
    token_offsets: &'a [usize],
    /// Type/property names currently being resolved (for cycle detection).
    visiting: HashSet<String>,
}

impl<'a> Matcher<'a> {
    pub fn new(tokens: &'a [Token], input: &'a str, token_offsets: &'a [usize]) -> Self {
        Self {
            tokens,
            pos: 0,
            longest_match: 0,
            expected_at_longest: Vec::new(),
            input,
            token_offsets,
            visiting: HashSet::new(),
        }
    }

    /// Save the current position for backtracking.
    pub fn save(&self) -> usize {
        self.pos
    }

    /// Restore a previously saved position.
    pub fn restore(&mut self, pos: usize) {
        self.pos = pos;
    }

    /// Peek at the current token without consuming it.
    pub fn peek(&self) -> Option<&Token> {
        self.tokens.get(self.pos)
    }

    /// Advance to the next token and return the current one.
    pub fn advance(&mut self) -> Option<&Token> {
        let token = self.tokens.get(self.pos)?;
        self.pos += 1;
        self.update_longest();
        Some(token)
    }

    /// Check if all tokens have been consumed.
    pub fn is_at_end(&self) -> bool {
        self.pos >= self.tokens.len()
    }

    /// Record an expected value at the current position (for error reporting).
    pub fn record_expected(&mut self, expected: &str) {
        if self.pos > self.longest_match {
            self.longest_match = self.pos;
            self.expected_at_longest.clear();
            self.expected_at_longest.push(expected.to_string());
        } else if self.pos == self.longest_match {
            let s = expected.to_string();
            if !self.expected_at_longest.contains(&s) {
                self.expected_at_longest.push(s);
            }
        }
    }

    fn update_longest(&mut self) {
        if self.pos > self.longest_match {
            self.longest_match = self.pos;
            self.expected_at_longest.clear();
        }
    }

    /// Build a `MismatchInfo` from the current state.
    pub fn mismatch(&self) -> MismatchInfo {
        let offset = if self.longest_match < self.token_offsets.len() {
            self.token_offsets[self.longest_match]
        } else {
            self.input.len()
        };
        let length = if self.longest_match < self.tokens.len() {
            // Length of the token at the mismatch position
            let end = if self.longest_match + 1 < self.token_offsets.len() {
                self.token_offsets[self.longest_match + 1]
            } else {
                self.input.len()
            };
            end - offset
        } else {
            0
        };

        MismatchInfo {
            offset,
            length,
            expected: self.expected_at_longest.clone(),
        }
    }

    /// Match a syntax node against the token stream.
    pub fn match_node(&mut self, node: &SyntaxNode) -> bool {
        match node {
            SyntaxNode::Keyword { name } => self.match_keyword(name),
            SyntaxNode::Token { value } => self.match_token_value(value),
            SyntaxNode::Comma => self.match_comma(),
            SyntaxNode::Group {
                terms,
                combinator,
                disallow_empty,
                ..
            } => self.match_group(terms, combinator, *disallow_empty),
            SyntaxNode::Multiplier { term, info } => self.match_multiplier(term, info),
            SyntaxNode::Type { name, opts } => {
                use crate::css::value_match::generic;
                use crate::css::value_match::registry;

                // Check for math functions (calc, min, max, etc.)
                if generic::supports_math_functions(name)
                    && let Some(Token::Function(fn_name)) = self.peek()
                    && generic::is_math_function(fn_name)
                {
                    return self.match_math_function(name);
                }

                // Check for var() / env()
                if let Some(Token::Function(fn_name)) = self.peek() {
                    let lower = fn_name.to_ascii_lowercase();
                    if lower == "var" || lower == "env" {
                        return self.match_var_or_env();
                    }
                }

                // Try built-in type matcher first
                if generic::is_builtin_type(name) {
                    if generic::match_type(self, name, opts.as_ref()) {
                        return true;
                    }
                    // Built-in type didn't match — don't fall through to registry
                    self.record_expected(&format!("<{name}>"));
                    return false;
                }

                // Try registry lookup for non-built-in types (e.g., <color>, <position>)
                let key = format!("type:{name}");
                if !self.visiting.contains(&key)
                    && let Some(syntax_str) = registry::lookup_syntax(name)
                    && let Ok(ast) = crate::css::syntax_definition::parse(syntax_str)
                {
                    self.visiting.insert(key.clone());
                    let result = self.match_node(&ast);
                    self.visiting.remove(&key);
                    if result {
                        return true;
                    }
                }

                self.record_expected(&format!("<{name}>"));
                false
            }
            SyntaxNode::Property { name } => {
                use crate::css::value_match::registry;

                let key = format!("prop:{name}");
                if !self.visiting.contains(&key)
                    && let Some(syntax_str) = registry::lookup_property(name)
                    && let Ok(ast) = crate::css::syntax_definition::parse(syntax_str)
                {
                    self.visiting.insert(key.clone());
                    let result = self.match_node(&ast);
                    self.visiting.remove(&key);
                    if result {
                        return true;
                    }
                }

                self.record_expected(&format!("<'{name}'>"));
                false
            }
            SyntaxNode::Function { name } => {
                // Match a function call: name( ... )
                self.match_function(name)
            }
            SyntaxNode::StringNode { value } => self.match_string(value),
            SyntaxNode::AtKeyword { name } => self.match_at_keyword(name),
            SyntaxNode::Boolean { term } => self.match_node(term),
        }
    }

    fn match_keyword(&mut self, name: &str) -> bool {
        if let Some(Token::Ident(ident)) = self.peek()
            && ident.eq_ignore_ascii_case(name)
        {
            self.advance();
            return true;
        }
        self.record_expected(name);
        false
    }

    fn match_token_value(&mut self, value: &str) -> bool {
        if let Some(token) = self.peek() {
            let matches = match token {
                Token::Delim(c) => value.len() == 1 && value.starts_with(*c),
                Token::Comma => value == ",",
                Token::Colon => value == ":",
                Token::Semicolon => value == ";",
                Token::LeftParen => value == "(",
                Token::RightParen => value == ")",
                Token::LeftBracket => value == "[",
                Token::RightBracket => value == "]",
                Token::LeftBrace => value == "{",
                Token::RightBrace => value == "}",
                _ => false,
            };
            if matches {
                self.advance();
                return true;
            }
        }
        self.record_expected(&format!("'{value}'"));
        false
    }

    fn match_comma(&mut self) -> bool {
        if let Some(Token::Comma) = self.peek() {
            self.advance();
            return true;
        }
        self.record_expected(",");
        false
    }

    fn match_string(&mut self, value: &str) -> bool {
        if let Some(Token::String(s)) = self.peek()
            && s == value
        {
            self.advance();
            return true;
        }
        self.record_expected(&format!("\"{value}\""));
        false
    }

    fn match_at_keyword(&mut self, name: &str) -> bool {
        if let Some(Token::AtKeyword(kw)) = self.peek()
            && kw.eq_ignore_ascii_case(name)
        {
            self.advance();
            return true;
        }
        self.record_expected(&format!("@{name}"));
        false
    }

    /// Consume a function call token and everything up to the matching `)`.
    /// Assumes the current token is a `Function(...)` token.
    /// Returns `true` if the closing `)` was found.
    pub fn consume_function_call(&mut self) -> bool {
        // The current token should be Function(_) — consume it
        self.advance();
        let mut depth = 1u32;
        while !self.is_at_end() && depth > 0 {
            match self.peek() {
                Some(Token::LeftParen | Token::Function(_)) => {
                    depth += 1;
                    self.advance();
                }
                Some(Token::RightParen) => {
                    depth -= 1;
                    self.advance();
                }
                _ => {
                    self.advance();
                }
            }
        }
        depth == 0
    }

    /// Match a CSS math function (calc, min, max, etc.) with type checking.
    ///
    /// Parses the function's internal expression and verifies that the result
    /// type is compatible with the expected CSS type per CSS Values Level 4.
    ///
    /// **Note:** Currently, type mismatches are still accepted (returns `true`)
    /// to maintain css-tree compatibility and avoid false positives during the
    /// transition period. The type information is computed and available for
    /// stricter checking in a future release.
    fn match_math_function(&mut self, expected_type: &str) -> bool {
        use crate::css::value_match::calc;

        let fn_name = match self.peek() {
            Some(Token::Function(name)) => name.clone(),
            _ => return false,
        };

        // Collect the function's inner tokens
        let saved = self.save();
        self.advance(); // consume Function token
        let mut inner_tokens = Vec::new();
        let mut depth = 1u32;
        while !self.is_at_end() && depth > 0 {
            match self.peek() {
                Some(Token::LeftParen | Token::Function(_)) => {
                    depth += 1;
                    inner_tokens.push(self.peek().unwrap().clone());
                    self.advance();
                }
                Some(Token::RightParen) => {
                    depth -= 1;
                    if depth > 0 {
                        inner_tokens.push(Token::RightParen);
                    }
                    self.advance();
                }
                Some(token) => {
                    inner_tokens.push(token.clone());
                    self.advance();
                }
                None => break,
            }
        }

        if depth != 0 {
            self.restore(saved);
            return false;
        }

        // Type-check the expression
        let result_type = calc::check_math_function(&fn_name, &inner_tokens);
        if result_type.is_compatible_with(expected_type) {
            true
        } else {
            // Type mismatch — still consumed the tokens but report the issue.
            // For now, accept it (like css-tree does) to avoid false positives
            // during the transition period. The type info is available for
            // stricter checking later.
            true
        }
    }

    /// Match `var()` or `env()` with optional fallback type checking.
    ///
    /// For `var()`: `var( <custom-property-name> [, <declaration-value>]? )`
    /// For `env()`: `env( <custom-ident> [, <declaration-value>]? )`
    ///
    /// Unlike css-tree (which rejects `var()` entirely), this validates the
    /// function structure and accepts it as matching the expected type.
    fn match_var_or_env(&mut self) -> bool {
        // Current token is Function("var") or Function("env")
        let is_var = matches!(self.peek(), Some(Token::Function(n)) if n.eq_ignore_ascii_case("var"));
        self.advance(); // consume function token

        if is_var {
            // First arg must be a custom property name (starts with --, length > 2)
            match self.peek() {
                Some(Token::Ident(name)) if name.starts_with("--") && name.len() > 2 => {
                    self.advance();
                }
                _ => {
                    // Invalid var() — consume rest and fail
                    self.record_expected("<custom-property-name>");
                    self.skip_to_matching_paren(1);
                    return false;
                }
            }
        } else {
            // env(): first arg is a custom-ident
            if let Some(Token::Ident(_)) = self.peek() {
                self.advance();
            } else {
                self.record_expected("<custom-ident>");
                self.skip_to_matching_paren(1);
                return false;
            }
        }

        // Optional: comma + fallback
        // We don't type-check the fallback here because we don't know the
        // expected type at this level. The fallback is <declaration-value>.
        // For now, accept any remaining tokens until ).
        if matches!(self.peek(), Some(Token::Comma)) {
            self.advance(); // consume comma
            // Consume everything until matching )
            self.skip_to_matching_paren(1);
        } else if matches!(self.peek(), Some(Token::RightParen)) {
            self.advance();
        } else {
            // Unexpected tokens
            self.skip_to_matching_paren(1);
        }

        true
    }

    /// Skip tokens until the matching `)` is found, respecting nesting.
    fn skip_to_matching_paren(&mut self, initial_depth: u32) {
        let mut depth = initial_depth;
        while !self.is_at_end() && depth > 0 {
            match self.peek() {
                Some(Token::LeftParen | Token::Function(_)) => {
                    depth += 1;
                    self.advance();
                }
                Some(Token::RightParen) => {
                    depth -= 1;
                    self.advance();
                }
                _ => {
                    self.advance();
                }
            }
        }
    }

    fn match_function(&mut self, name: &str) -> bool {
        if let Some(Token::Function(fn_name)) = self.peek()
            && fn_name.eq_ignore_ascii_case(name)
        {
            // Consume only the Function token (name + opening paren).
            // The argument tokens and closing ) are matched by subsequent
            // nodes in the parent group's Juxtaposition sequence.
            self.advance();
            return true;
        }
        self.record_expected(&format!("{name}()"));
        false
    }

    fn match_group(&mut self, terms: &[SyntaxNode], combinator: &Combinator, disallow_empty: bool) -> bool {
        let saved = self.save();
        let result = match combinator {
            Combinator::Juxtaposition => self.match_juxtaposition(terms),
            Combinator::DoubleAmpersand => self.match_double_ampersand(terms),
            Combinator::DoubleBar => self.match_double_bar(terms),
            Combinator::Bar => self.match_bar(terms),
        };

        if result && disallow_empty && self.save() == saved {
            // Group matched but consumed no tokens — and disallow_empty is set
            self.restore(saved);
            return false;
        }

        if !result {
            self.restore(saved);
        }

        result
    }

    /// Juxtaposition: all terms must match in order.
    fn match_juxtaposition(&mut self, terms: &[SyntaxNode]) -> bool {
        for term in terms {
            if !self.match_node(term) {
                return false;
            }
        }
        true
    }

    /// `|` combinator: exactly one alternative must match.
    fn match_bar(&mut self, terms: &[SyntaxNode]) -> bool {
        let saved = self.save();
        for term in terms {
            if self.match_node(term) {
                return true;
            }
            self.restore(saved);
        }
        false
    }

    /// `&&` combinator: all terms must match, in any order.
    ///
    /// Uses a bitmask to track which terms have been matched. Supports up to 64
    /// terms, which is more than sufficient for CSS properties (typically 3-5 terms).
    fn match_double_ampersand(&mut self, terms: &[SyntaxNode]) -> bool {
        let n = terms.len();
        if n == 0 {
            return true;
        }
        debug_assert!(n <= 64, "DoubleAmpersand with more than 64 terms is not supported");

        let all_matched = (1u64 << n) - 1;
        self.match_permutation(terms, 0u64, all_matched)
    }

    /// Recursive bitmask permutation matcher for `&&`.
    fn match_permutation(&mut self, terms: &[SyntaxNode], matched: u64, all_matched: u64) -> bool {
        if matched == all_matched {
            return true;
        }

        let saved = self.save();
        for i in 0..terms.len() {
            if matched & (1u64 << i) != 0 {
                continue; // already matched
            }
            if self.match_node(&terms[i]) && self.match_permutation(terms, matched | (1u64 << i), all_matched) {
                return true;
            }
            self.restore(saved);
        }
        false
    }

    /// `||` combinator: one or more terms must match, in any order.
    ///
    /// Uses a bitmask to track which terms have been matched. Supports up to 64
    /// terms (same as `&&`).
    fn match_double_bar(&mut self, terms: &[SyntaxNode]) -> bool {
        let n = terms.len();
        if n == 0 {
            return false;
        }
        debug_assert!(n <= 64, "DoubleBar with more than 64 terms is not supported");

        self.match_double_bar_rec(terms, 0u64, false)
    }

    fn match_double_bar_rec(&mut self, terms: &[SyntaxNode], matched: u64, any_matched: bool) -> bool {
        // Try to match more terms
        let saved = self.save();
        for i in 0..terms.len() {
            if matched & (1u64 << i) != 0 {
                continue;
            }
            if self.match_node(&terms[i]) && self.match_double_bar_rec(terms, matched | (1u64 << i), true) {
                return true;
            }
            self.restore(saved);
        }

        // No more terms can match — succeed if at least one did
        any_matched
    }

    /// Match a multiplied term.
    fn match_multiplier(&mut self, term: &SyntaxNode, info: &MultiplierInfo) -> bool {
        let min = info.min as usize;
        let max = if info.max == 0 { usize::MAX } else { info.max as usize };

        let mut count = 0;
        let mut last_pos = self.save();

        while count < max {
            // For comma-separated multipliers, consume a comma before each item after the first
            if info.comma && count > 0 {
                let before_comma = self.save();
                if !self.match_comma() {
                    self.restore(before_comma);
                    break;
                }
            }

            let saved = self.save();
            if self.match_node(term) {
                count += 1;
                if self.save() == saved {
                    // Matched but consumed no tokens — avoid infinite loop
                    break;
                }
                last_pos = self.save();
            } else {
                // If we consumed a comma but failed to match, restore to before the comma
                if info.comma && count > 0 {
                    self.restore(last_pos);
                }
                break;
            }
        }

        count >= min
    }
}

/// Filter whitespace tokens and compute byte offsets for non-whitespace tokens.
pub fn prepare_tokens(all_tokens: &[Token], input: &str) -> (Vec<Token>, Vec<usize>) {
    let mut tokens = Vec::new();
    let mut offsets = Vec::new();
    let mut byte_pos = 0;

    for token in all_tokens {
        let token_len = token_byte_length(token, input, byte_pos);
        if !token.is_whitespace() {
            tokens.push(token.clone());
            offsets.push(byte_pos);
        }
        byte_pos += token_len;
    }

    (tokens, offsets)
}

/// Estimate the byte length of a token in the original input.
fn token_byte_length(token: &Token, input: &str, offset: usize) -> usize {
    let remaining = &input[offset..];
    match token {
        Token::Whitespace => remaining
            .bytes()
            .take_while(|b| matches!(b, b' ' | b'\t' | b'\n' | b'\r' | 0x0C))
            .count()
            .max(1),
        Token::Ident(_) | Token::AtKeyword(_) => {
            // Scan forward to find how many bytes this ident/at-keyword consumes
            let prefix = usize::from(matches!(token, Token::AtKeyword(_)));
            // Approximate: find the name in the remaining input
            scan_name_length(remaining, prefix)
        }
        Token::Function(name) => {
            // name + '('
            let name_len = scan_name_length(remaining, 0);
            name_len.max(name.len() + 1)
        }
        Token::Hash(value) => value.len(), // includes '#'
        Token::String(value) => {
            // quote + content + quote (approximate)
            value.len() + 2
        }
        Token::Number(_) | Token::Percentage(_) | Token::Dimension { .. } => scan_numeric_length(remaining),
        Token::Comma
        | Token::Colon
        | Token::Semicolon
        | Token::LeftParen
        | Token::RightParen
        | Token::LeftBracket
        | Token::RightBracket
        | Token::LeftBrace
        | Token::RightBrace
        | Token::Delim(_) => 1,
    }
}

fn scan_name_length(input: &str, prefix: usize) -> usize {
    let bytes = input.as_bytes();
    let mut pos = prefix;
    while pos < bytes.len() {
        let b = bytes[pos];
        if b.is_ascii_alphanumeric() || b == b'_' || b == b'-' || b >= 0x80 {
            if b >= 0x80 {
                // UTF-8 multibyte
                let s = &input[pos..];
                if let Some(ch) = s.chars().next() {
                    pos += ch.len_utf8();
                } else {
                    break;
                }
            } else {
                pos += 1;
            }
        } else if b == b'\\' && pos + 1 < bytes.len() && bytes[pos + 1] != b'\n' {
            // Escape sequence
            pos += 2;
            while pos < bytes.len() && bytes[pos].is_ascii_hexdigit() {
                pos += 1;
            }
        } else {
            break;
        }
    }
    pos.max(1)
}

fn scan_numeric_length(input: &str) -> usize {
    let bytes = input.as_bytes();
    let mut pos = 0;

    // Optional sign
    if pos < bytes.len() && matches!(bytes[pos], b'+' | b'-') {
        pos += 1;
    }
    // Digits
    while pos < bytes.len() && bytes[pos].is_ascii_digit() {
        pos += 1;
    }
    // Decimal
    if pos < bytes.len() && bytes[pos] == b'.' {
        pos += 1;
        while pos < bytes.len() && bytes[pos].is_ascii_digit() {
            pos += 1;
        }
    }
    // Scientific
    if pos < bytes.len() && matches!(bytes[pos], b'e' | b'E') {
        let saved = pos;
        pos += 1;
        if pos < bytes.len() && matches!(bytes[pos], b'+' | b'-') {
            pos += 1;
        }
        if pos < bytes.len() && bytes[pos].is_ascii_digit() {
            while pos < bytes.len() && bytes[pos].is_ascii_digit() {
                pos += 1;
            }
        } else {
            pos = saved;
        }
    }
    // Unit or %
    if pos < bytes.len() && bytes[pos] == b'%' {
        pos += 1;
    } else {
        while pos < bytes.len() && (bytes[pos].is_ascii_alphabetic() || bytes[pos] == b'_' || bytes[pos] >= 0x80) {
            pos += 1;
        }
    }

    pos.max(1)
}
