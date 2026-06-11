//! CSS math function expression parser and type checker.
//!
//! Validates `calc()`, `min()`, `max()`, `clamp()`, and other CSS math functions
//! by parsing internal expressions and checking type compatibility per
//! [CSS Values Level 4 § Type Checking](https://drafts.csswg.org/css-values/#calc-type-checking).
//!
//! This goes beyond css-tree, which accepts math functions without validating
//! internals. Type checking is worth the extra code because it catches real
//! errors that css-tree lets through — e.g. `calc(10px + 5deg)` mixes a length
//! and an angle, an invalid operation — and the checking algorithm is O(n), so
//! there is no performance cost to running it.

use crate::css::value_match::token::Token;
use crate::css::value_match::units::{self, DimensionType};

/// The resolved type of a calc sub-expression.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum CalcType {
    /// A pure number (unitless).
    Number,
    /// A percentage value.
    Percentage,
    /// A dimensioned value (length, angle, time, frequency, resolution, flex).
    Dimension(DimensionType),
    /// A combined dimension-percentage type (e.g., length-percentage).
    ///
    /// CSS permits mixing a dimension with a percentage in a calc expression:
    /// `calc(100% - 20px)` resolves to `<length-percentage>`, not `<length>`
    /// or `<percentage>`, and is valid wherever any of the three is expected.
    /// Without this dedicated variant the result type of such mixed
    /// expressions cannot be represented faithfully.
    DimensionPercentage(DimensionType),
    /// Type could not be determined or is invalid.
    Invalid,
}

impl CalcType {
    pub fn is_compatible_with(&self, expected: &str) -> bool {
        match self {
            CalcType::Number => matches!(expected, "number" | "integer"),
            CalcType::Percentage => matches!(
                expected,
                "percentage" | "length-percentage" | "angle-percentage" | "time-percentage" | "frequency-percentage"
            ),
            CalcType::Dimension(dim) => {
                let dim_name = dim_type_name(*dim);
                expected == dim_name || is_combined_type(expected, dim_name)
            }
            CalcType::DimensionPercentage(dim) => {
                let dim_name = dim_type_name(*dim);
                expected == dim_name || is_combined_type(expected, dim_name) || expected == "percentage"
            }
            CalcType::Invalid => false,
        }
    }
}

fn dim_type_name(dim: DimensionType) -> &'static str {
    match dim {
        DimensionType::Length => "length",
        DimensionType::Angle => "angle",
        DimensionType::Time => "time",
        DimensionType::Frequency => "frequency",
        DimensionType::Resolution => "resolution",
        DimensionType::Flex => "flex",
    }
}

fn is_combined_type(expected: &str, dim_name: &str) -> bool {
    match expected {
        "length-percentage" => dim_name == "length",
        "angle-percentage" => dim_name == "angle",
        "time-percentage" => dim_name == "time",
        "frequency-percentage" => dim_name == "frequency",
        _ => false,
    }
}

fn add_types(a: &CalcType, b: &CalcType) -> CalcType {
    match (a, b) {
        // Same type
        (CalcType::Number, CalcType::Number) => CalcType::Number,
        (CalcType::Percentage, CalcType::Percentage) => CalcType::Percentage,
        (CalcType::Dimension(d1), CalcType::Dimension(d2)) if d1 == d2 => CalcType::Dimension(*d1),

        // Dimension + Percentage → DimensionPercentage
        (CalcType::Dimension(d), CalcType::Percentage) | (CalcType::Percentage, CalcType::Dimension(d)) => {
            CalcType::DimensionPercentage(*d)
        }

        // DimensionPercentage combinations
        (CalcType::DimensionPercentage(d), CalcType::Percentage)
        | (CalcType::Percentage, CalcType::DimensionPercentage(d)) => CalcType::DimensionPercentage(*d),
        (CalcType::DimensionPercentage(d1), CalcType::Dimension(d2))
        | (CalcType::Dimension(d2), CalcType::DimensionPercentage(d1))
            if d1 == d2 =>
        {
            CalcType::DimensionPercentage(*d1)
        }
        (CalcType::DimensionPercentage(d1), CalcType::DimensionPercentage(d2)) if d1 == d2 => {
            CalcType::DimensionPercentage(*d1)
        }

        _ => CalcType::Invalid,
    }
}

fn mul_types(a: &CalcType, b: &CalcType) -> CalcType {
    match (a, b) {
        (CalcType::Number, CalcType::Number) => CalcType::Number,
        (CalcType::Number, other) | (other, CalcType::Number) => other.clone(),
        // Two non-number types multiplied → invalid
        _ => CalcType::Invalid,
    }
}

fn div_types(a: &CalcType, b: &CalcType) -> CalcType {
    match b {
        CalcType::Number => a.clone(),
        _ => CalcType::Invalid, // Can only divide by a number
    }
}

/// Parse and type-check the tokens inside a math function.
///
/// `tokens` should be the tokens between the opening `(` (exclusive) and
/// closing `)` (exclusive) of the math function.
///
/// `fn_name` is the function name (e.g., "calc", "min", "max").
pub fn check_math_function(fn_name: &str, tokens: &[Token]) -> CalcType {
    let lower = fn_name.to_ascii_lowercase();
    match lower.as_str() {
        "calc" => {
            let mut parser = CalcParser::new(tokens);
            parser.parse_sum()
        }
        "min" | "max" => {
            // All arguments must be type-compatible
            check_comma_separated_args(tokens)
        }
        "clamp" => {
            // clamp(min, val, max) — all three must be type-compatible
            check_comma_separated_args(tokens)
        }
        "sin" | "cos" | "tan" => {
            // Argument: <number> | <angle> → result: <number>
            let arg_type = {
                let mut parser = CalcParser::new(tokens);
                parser.parse_sum()
            };
            match arg_type {
                CalcType::Number | CalcType::Dimension(DimensionType::Angle) => CalcType::Number,
                _ => CalcType::Invalid,
            }
        }
        "asin" | "acos" | "atan" => {
            // Argument: <number> → result: <angle>
            let arg_type = {
                let mut parser = CalcParser::new(tokens);
                parser.parse_sum()
            };
            match arg_type {
                CalcType::Number => CalcType::Dimension(DimensionType::Angle),
                _ => CalcType::Invalid,
            }
        }
        "atan2" => {
            // Two arguments, same type → result: <angle>
            let result = check_comma_separated_args(tokens);
            match result {
                CalcType::Invalid => CalcType::Invalid,
                _ => CalcType::Dimension(DimensionType::Angle),
            }
        }
        "pow" | "sqrt" | "hypot" | "log" | "exp" => {
            // Number arguments → result: <number>
            let arg_type = check_comma_separated_args(tokens);
            match arg_type {
                CalcType::Number => CalcType::Number,
                _ => CalcType::Invalid,
            }
        }
        "abs" | "sign" => {
            // Preserves input type
            let mut parser = CalcParser::new(tokens);
            parser.parse_sum()
        }
        "round" | "mod" | "rem" => {
            // Two same-type arguments → same type
            check_comma_separated_args(tokens)
        }
        _ => CalcType::Invalid,
    }
}

/// Parse comma-separated arguments and check they're all type-compatible.
fn check_comma_separated_args(tokens: &[Token]) -> CalcType {
    let args = split_by_comma(tokens);
    if args.is_empty() {
        return CalcType::Invalid;
    }

    let mut result_type: Option<CalcType> = None;
    for arg in args {
        let mut parser = CalcParser::new(arg);
        let t = parser.parse_sum();
        if t == CalcType::Invalid {
            return CalcType::Invalid;
        }
        match &result_type {
            None => result_type = Some(t),
            Some(existing) => {
                let combined = add_types(existing, &t);
                if combined == CalcType::Invalid {
                    return CalcType::Invalid;
                }
                result_type = Some(combined);
            }
        }
    }

    result_type.unwrap_or(CalcType::Invalid)
}

/// Split tokens by top-level commas.
fn split_by_comma(tokens: &[Token]) -> Vec<&[Token]> {
    let mut result = Vec::new();
    let mut start = 0;
    let mut depth = 0u32;

    for (i, token) in tokens.iter().enumerate() {
        match token {
            Token::LeftParen | Token::Function(_) => depth += 1,
            Token::RightParen => {
                depth = depth.saturating_sub(1);
            }
            Token::Comma if depth == 0 => {
                result.push(&tokens[start..i]);
                start = i + 1;
            }
            _ => {}
        }
    }
    if start < tokens.len() {
        result.push(&tokens[start..]);
    } else if !tokens.is_empty() {
        // Trailing comma
        result.push(&tokens[tokens.len()..]);
    }
    result
}

struct CalcParser<'a> {
    tokens: &'a [Token],
    pos: usize,
}

impl<'a> CalcParser<'a> {
    fn new(tokens: &'a [Token]) -> Self {
        Self { tokens, pos: 0 }
    }

    fn peek(&self) -> Option<&Token> {
        self.tokens.get(self.pos)
    }

    fn advance(&mut self) -> Option<&Token> {
        let t = self.tokens.get(self.pos)?;
        self.pos += 1;
        Some(t)
    }

    /// Parse a calc sum: `product [ ['+' | '-'] product ]*`
    fn parse_sum(&mut self) -> CalcType {
        let mut result = self.parse_product();
        if result == CalcType::Invalid {
            return result;
        }

        while let Some(Token::Delim('+' | '-')) = self.peek() {
            self.advance();
            let right = self.parse_product();
            result = add_types(&result, &right);
            if result == CalcType::Invalid {
                return result;
            }
        }

        result
    }

    /// Parse a calc product: `value [ ['*' | '/'] value ]*`
    fn parse_product(&mut self) -> CalcType {
        let mut result = self.parse_value();
        if result == CalcType::Invalid {
            return result;
        }

        loop {
            match self.peek() {
                Some(Token::Delim('*')) => {
                    self.advance();
                    let right = self.parse_value();
                    result = mul_types(&result, &right);
                    if result == CalcType::Invalid {
                        return result;
                    }
                }
                Some(Token::Delim('/')) => {
                    self.advance();
                    let right = self.parse_value();
                    result = div_types(&result, &right);
                    if result == CalcType::Invalid {
                        return result;
                    }
                }
                _ => break,
            }
        }

        result
    }

    /// Parse a calc value: number, dimension, percentage, parenthesized expr, or nested function.
    fn parse_value(&mut self) -> CalcType {
        match self.peek() {
            Some(Token::Number(_)) => {
                self.advance();
                CalcType::Number
            }
            Some(Token::Percentage(_)) => {
                self.advance();
                CalcType::Percentage
            }
            Some(Token::Dimension { unit, .. }) => {
                let dim = units::unit_type(unit);
                self.advance();
                match dim {
                    Some(d) => CalcType::Dimension(d),
                    None => CalcType::Invalid,
                }
            }
            Some(Token::LeftParen) => {
                self.advance();
                let result = self.parse_sum();
                if matches!(self.peek(), Some(Token::RightParen)) {
                    self.advance();
                }
                result
            }
            Some(Token::Function(name)) => {
                let fn_name = name.clone();
                self.advance();
                let inner = self.collect_until_close_paren();
                check_math_function(&fn_name, &inner)
            }
            _ => {
                if self.peek().is_some() {
                    self.advance();
                }
                CalcType::Invalid
            }
        }
    }

    fn collect_until_close_paren(&mut self) -> Vec<Token> {
        let mut result = Vec::new();
        let mut depth = 1u32;
        while let Some(token) = self.peek() {
            match token {
                Token::LeftParen | Token::Function(_) => {
                    depth += 1;
                    result.push(token.clone());
                    self.advance();
                }
                Token::RightParen => {
                    depth -= 1;
                    if depth == 0 {
                        self.advance();
                        break;
                    }
                    result.push(token.clone());
                    self.advance();
                }
                _ => {
                    result.push(token.clone());
                    self.advance();
                }
            }
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::css::value_match::matcher::prepare_tokens;
    use crate::css::value_match::tokenizer::tokenize;

    fn calc_type(input: &str) -> CalcType {
        let all = tokenize(input);
        let (tokens, _) = prepare_tokens(&all, input);
        // Should start with Function("calc"), then contents, then RightParen
        assert!(matches!(tokens.first(), Some(Token::Function(_))));
        // Skip function token and closing paren
        let inner = &tokens[1..tokens.len() - 1];
        check_math_function("calc", inner)
    }

    #[test]
    fn calc_number_plus_number() {
        assert_eq!(calc_type("calc(1 + 2)"), CalcType::Number);
    }

    #[test]
    fn calc_length_plus_length() {
        assert_eq!(
            calc_type("calc(10px + 20px)"),
            CalcType::Dimension(DimensionType::Length)
        );
    }

    #[test]
    fn calc_length_plus_percentage() {
        assert_eq!(
            calc_type("calc(100% - 20px)"),
            CalcType::DimensionPercentage(DimensionType::Length)
        );
    }

    #[test]
    fn calc_number_times_length() {
        assert_eq!(calc_type("calc(2 * 10px)"), CalcType::Dimension(DimensionType::Length));
    }

    #[test]
    fn calc_length_div_number() {
        assert_eq!(calc_type("calc(100px / 2)"), CalcType::Dimension(DimensionType::Length));
    }

    #[test]
    fn calc_length_plus_angle_invalid() {
        assert_eq!(calc_type("calc(10px + 5deg)"), CalcType::Invalid);
    }

    #[test]
    fn calc_length_times_length_invalid() {
        assert_eq!(calc_type("calc(10px * 10px)"), CalcType::Invalid);
    }

    #[test]
    fn calc_nested_parens() {
        assert_eq!(
            calc_type("calc((10px + 5px) * 2)"),
            CalcType::Dimension(DimensionType::Length)
        );
    }

    #[test]
    fn calc_compatibility_with_length() {
        let t = calc_type("calc(100% - 20px)");
        assert!(t.is_compatible_with("length"));
        assert!(t.is_compatible_with("length-percentage"));
    }

    #[test]
    fn calc_angle() {
        assert_eq!(
            calc_type("calc(90deg + 45deg)"),
            CalcType::Dimension(DimensionType::Angle)
        );
    }
}
