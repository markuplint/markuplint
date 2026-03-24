//! CSS value matching engine.
//!
//! Matches CSS value strings against CSS Value Definition Syntax definitions.
//! This is the Rust equivalent of `css-tree`'s `lexer.match()`, with additional
//! capabilities:
//! - `var()` fallback value type checking
//! - `calc()` expression syntax validation and type checking

pub mod error;
pub mod generic;
pub mod matcher;
pub mod token;
pub mod tokenizer;
pub mod units;

use crate::css::syntax_definition;
use error::MatchResult;
use matcher::{Matcher, prepare_tokens};
use tokenizer::tokenize;

/// Match a CSS value string against a CSS Value Definition Syntax string.
///
/// Returns `Ok(())` if the value matches the syntax, or `Err(MismatchInfo)` with
/// details about where the mismatch occurred.
///
/// # Examples
///
/// ```
/// use markuplint_types::css::value_match::match_syntax;
///
/// assert!(match_syntax("auto", "auto").is_ok());
/// assert!(match_syntax("auto | none", "none").is_ok());
/// assert!(match_syntax("auto", "invalid").is_err());
/// ```
pub fn match_syntax(syntax: &str, value: &str) -> MatchResult {
    let ast = syntax_definition::parse(syntax).map_err(|e| error::MismatchInfo {
        offset: 0,
        length: value.len(),
        expected: vec![format!("valid syntax (parse error: {e})")],
    })?;

    match_syntax_node(&ast, value)
}

/// Match a CSS value string against a pre-parsed syntax AST node.
pub fn match_syntax_node(node: &syntax_definition::ast::SyntaxNode, value: &str) -> MatchResult {
    let all_tokens = tokenize(value);
    let (tokens, offsets) = prepare_tokens(&all_tokens, value);

    let mut matcher = Matcher::new(&tokens, value, &offsets);

    if matcher.match_node(node) && matcher.is_at_end() {
        Ok(())
    } else {
        Err(matcher.mismatch())
    }
}
