//! Built-in CSS data type matchers.
//!
//! Each function attempts to consume one or more tokens from the matcher
//! and returns `true` if the type matches.
//!
//! Type definitions follow [CSS Values Level 4 § Component Value Types](https://drafts.csswg.org/css-values/#component-types)
//! and [CSS Syntax Level 3 § Token Types](https://drafts.csswg.org/css-syntax/#tokenization).
//!
//! Built-in types take priority over mdn-data registry definitions to enforce
//! stricter CSS spec semantics: mdn-data sometimes defines a type more
//! permissively (e.g. `<integer>` as `<number-token>`, which would accept
//! `3.14`), whereas the built-in matcher applies the precise spec rule. Type
//! names not handled here (e.g. `<color>`, `<position>`) fall through to the
//! [registry](super::registry).

use crate::css::syntax_definition::ast::TypeRange;
use crate::css::value_match::matcher::Matcher;
use crate::css::value_match::token::Token;
use crate::css::value_match::units::{DimensionType, is_unit_of_type, unit_type};

/// CSS-wide keywords that are excluded from `<custom-ident>`.
const CSS_WIDE_KEYWORDS: &[&str] = &["inherit", "initial", "unset", "revert", "revert-layer"];

/// Default keyword values excluded from `<custom-ident>`.
const DEFAULT_KEYWORDS: &[&str] = &["default"];

pub fn is_builtin_type(name: &str) -> bool {
    matches!(
        name,
        "number"
            | "integer"
            | "zero"
            | "percentage"
            | "length"
            | "angle"
            | "time"
            | "frequency"
            | "resolution"
            | "flex"
            | "length-percentage"
            | "frequency-percentage"
            | "angle-percentage"
            | "time-percentage"
            | "hex-color"
            | "string"
            | "url"
            | "ident"
            | "ident-token"
            | "custom-ident"
            | "dashed-ident"
            | "custom-property-name"
            | "declaration-value"
            | "any-value"
            | "id-selector"
            | "number-token"
            | "dimension-token"
            | "percentage-token"
            | "bcp-47"
    )
}

pub fn match_type(matcher: &mut Matcher, name: &str, range: Option<&TypeRange>) -> bool {
    match name {
        // Numeric types
        "number" => match_number(matcher, range),
        "integer" => match_integer(matcher, range),
        "zero" => match_zero(matcher),
        "percentage" => match_percentage(matcher, range),

        // Dimension types
        "length" => match_dimension(matcher, DimensionType::Length, range, true),
        "angle" => match_dimension(matcher, DimensionType::Angle, range, false),
        "time" => match_dimension(matcher, DimensionType::Time, range, false),
        "frequency" => match_dimension(matcher, DimensionType::Frequency, range, false),
        "resolution" => match_dimension(matcher, DimensionType::Resolution, range, false),
        "flex" => match_dimension(matcher, DimensionType::Flex, range, false),

        // Combined types
        "length-percentage" => match_length_percentage(matcher, range),
        "frequency-percentage" => match_combined_percentage(matcher, DimensionType::Frequency, range),
        "angle-percentage" => match_combined_percentage(matcher, DimensionType::Angle, range),
        "time-percentage" => match_combined_percentage(matcher, DimensionType::Time, range),

        // Color
        "hex-color" => match_hex_color(matcher),

        // String types
        "string" => match_string(matcher),
        "url" => match_url(matcher),

        // Identifier types
        "ident" | "ident-token" => match_ident(matcher),
        "custom-ident" => match_custom_ident(matcher),
        "dashed-ident" => match_dashed_ident(matcher),
        "custom-property-name" => match_custom_property_name(matcher),

        // Special types
        "declaration-value" => match_declaration_value(matcher),
        "any-value" => match_any_value(matcher),
        "id-selector" => match_id_selector(matcher),

        // Numeric token types
        "number-token" => match_number_token(matcher),
        "dimension-token" => match_dimension_token(matcher),
        "percentage-token" => match_percentage_token(matcher),

        // Markuplint custom built-in types
        "bcp-47" => match_bcp47(matcher),

        _ => false,
    }
}

// ============================================================
// Numeric types
// ============================================================

fn match_number(matcher: &mut Matcher, range: Option<&TypeRange>) -> bool {
    if let Some(Token::Number(value)) = matcher.peek() {
        let value = *value;
        if check_range(value, range) {
            matcher.advance();
            return true;
        }
    }
    matcher.record_expected("<number>");
    false
}

fn match_integer(matcher: &mut Matcher, range: Option<&TypeRange>) -> bool {
    if let Some(Token::Number(value)) = matcher.peek() {
        let value = *value;
        // Must be a whole number
        if value.fract() == 0.0 && check_range(value, range) {
            matcher.advance();
            return true;
        }
    }
    matcher.record_expected("<integer>");
    false
}

fn match_zero(matcher: &mut Matcher) -> bool {
    if let Some(Token::Number(value)) = matcher.peek()
        && *value == 0.0
    {
        matcher.advance();
        return true;
    }
    matcher.record_expected("0");
    false
}

fn match_percentage(matcher: &mut Matcher, range: Option<&TypeRange>) -> bool {
    if let Some(Token::Percentage(value)) = matcher.peek() {
        let value = *value;
        if check_range(value, range) {
            matcher.advance();
            return true;
        }
    }
    matcher.record_expected("<percentage>");
    false
}

// ============================================================
// Dimension types
// ============================================================

fn match_dimension(
    matcher: &mut Matcher,
    dim_type: DimensionType,
    range: Option<&TypeRange>,
    allow_zero_unitless: bool,
) -> bool {
    match matcher.peek() {
        Some(Token::Dimension { value, unit }) => {
            let value = *value;
            if is_unit_of_type(unit, dim_type) && check_range(value, range) {
                matcher.advance();
                return true;
            }
        }
        Some(Token::Number(value)) if allow_zero_unitless && *value == 0.0 => {
            // `0` is valid for <length> without a unit
            if check_range(0.0, range) {
                matcher.advance();
                return true;
            }
        }
        _ => {}
    }
    let type_name = match dim_type {
        DimensionType::Length => "<length>",
        DimensionType::Angle => "<angle>",
        DimensionType::Time => "<time>",
        DimensionType::Frequency => "<frequency>",
        DimensionType::Resolution => "<resolution>",
        DimensionType::Flex => "<flex>",
    };
    matcher.record_expected(type_name);
    false
}

fn match_length_percentage(matcher: &mut Matcher, range: Option<&TypeRange>) -> bool {
    let saved = matcher.save();
    if match_dimension(matcher, DimensionType::Length, range, true) {
        return true;
    }
    matcher.restore(saved);
    match_percentage(matcher, range)
}

fn match_combined_percentage(matcher: &mut Matcher, dim_type: DimensionType, range: Option<&TypeRange>) -> bool {
    let saved = matcher.save();
    if match_dimension(matcher, dim_type, range, false) {
        return true;
    }
    matcher.restore(saved);
    match_percentage(matcher, range)
}

// ============================================================
// Color types
// ============================================================

fn match_hex_color(matcher: &mut Matcher) -> bool {
    if let Some(Token::Hash(value)) = matcher.peek() {
        let hex = &value[1..];
        let len = hex.len();
        // Valid lengths: 3 (rgb), 4 (rgba), 6 (rrggbb), 8 (rrggbbaa)
        if (len == 3 || len == 4 || len == 6 || len == 8) && hex.bytes().all(|b| b.is_ascii_hexdigit()) {
            matcher.advance();
            return true;
        }
    }
    matcher.record_expected("<hex-color>");
    false
}

// ============================================================
// String types
// ============================================================

fn match_string(matcher: &mut Matcher) -> bool {
    if matches!(matcher.peek(), Some(Token::String(_))) {
        matcher.advance();
        return true;
    }
    matcher.record_expected("<string>");
    false
}

fn match_url(matcher: &mut Matcher) -> bool {
    // url( <string> ) or url( <url-token> )
    if let Some(Token::Function(name)) = matcher.peek()
        && name.eq_ignore_ascii_case("url")
    {
        let saved = matcher.save();
        matcher.advance();
        let mut depth = 1u32;
        while !matcher.is_at_end() && depth > 0 {
            match matcher.peek() {
                Some(Token::LeftParen | Token::Function(_)) => {
                    depth += 1;
                    matcher.advance();
                }
                Some(Token::RightParen) => {
                    depth -= 1;
                    matcher.advance();
                }
                _ => {
                    matcher.advance();
                }
            }
        }
        if depth == 0 {
            return true;
        }
        matcher.restore(saved);
    }
    matcher.record_expected("<url>");
    false
}

// ============================================================
// Identifier types
// ============================================================

fn match_ident(matcher: &mut Matcher) -> bool {
    if matches!(matcher.peek(), Some(Token::Ident(_))) {
        matcher.advance();
        return true;
    }
    matcher.record_expected("<ident>");
    false
}

fn match_custom_ident(matcher: &mut Matcher) -> bool {
    if let Some(Token::Ident(name)) = matcher.peek() {
        let lower = name.to_ascii_lowercase();
        // Must not be a CSS-wide keyword or "default"
        if !CSS_WIDE_KEYWORDS.iter().any(|kw| *kw == lower) && !DEFAULT_KEYWORDS.iter().any(|kw| *kw == lower) {
            matcher.advance();
            return true;
        }
    }
    matcher.record_expected("<custom-ident>");
    false
}

fn match_dashed_ident(matcher: &mut Matcher) -> bool {
    if let Some(Token::Ident(name)) = matcher.peek()
        && name.starts_with("--")
    {
        matcher.advance();
        return true;
    }
    matcher.record_expected("<dashed-ident>");
    false
}

fn match_custom_property_name(matcher: &mut Matcher) -> bool {
    if let Some(Token::Ident(name)) = matcher.peek() {
        // Must start with -- and not be exactly --
        if name.starts_with("--") && name.len() > 2 {
            matcher.advance();
            return true;
        }
    }
    matcher.record_expected("<custom-property-name>");
    false
}

// ============================================================
// Special types
// ============================================================

fn match_declaration_value(matcher: &mut Matcher) -> bool {
    // <declaration-value> matches any sequence of tokens, except:
    // - bad-string, bad-url (not produced by our tokenizer)
    // - unmatched ), ], }
    // - top-level semicolons
    // - top-level ! delimiters
    if matcher.is_at_end() {
        return false;
    }

    let mut depth = 0i32;
    let mut count = 0;

    while let Some(token) = matcher.peek() {
        match token {
            Token::Semicolon | Token::Delim('!') if depth == 0 => break,
            Token::RightParen | Token::RightBracket | Token::RightBrace if depth <= 0 => break,
            Token::LeftParen | Token::Function(_) | Token::LeftBracket | Token::LeftBrace => {
                depth += 1;
                matcher.advance();
            }
            Token::RightParen | Token::RightBracket | Token::RightBrace => {
                depth -= 1;
                matcher.advance();
            }
            _ => {
                matcher.advance();
            }
        }
        count += 1;
    }

    count > 0
}

fn match_any_value(matcher: &mut Matcher) -> bool {
    // <any-value> is like <declaration-value> but allows top-level ; and !
    if matcher.is_at_end() {
        return false;
    }

    let mut depth = 0i32;
    let mut count = 0;

    while let Some(token) = matcher.peek() {
        match token {
            Token::RightParen | Token::RightBracket | Token::RightBrace if depth <= 0 => break,
            Token::LeftParen | Token::Function(_) | Token::LeftBracket | Token::LeftBrace => {
                depth += 1;
                matcher.advance();
            }
            Token::RightParen | Token::RightBracket | Token::RightBrace => {
                depth -= 1;
                matcher.advance();
            }
            _ => {
                matcher.advance();
            }
        }
        count += 1;
    }

    count > 0
}

fn match_id_selector(matcher: &mut Matcher) -> bool {
    if let Some(Token::Hash(value)) = matcher.peek() {
        // Must start with # followed by a valid identifier start
        let rest = &value[1..];
        if let Some(first) = rest.bytes().next()
            && (first.is_ascii_alphabetic() || first == b'_' || first >= 0x80)
        {
            matcher.advance();
            return true;
        }
    }
    matcher.record_expected("<id-selector>");
    false
}

// ============================================================
// Token types (raw token matching)
// ============================================================

fn match_number_token(matcher: &mut Matcher) -> bool {
    if matches!(matcher.peek(), Some(Token::Number(_))) {
        matcher.advance();
        return true;
    }
    matcher.record_expected("<number-token>");
    false
}

fn match_dimension_token(matcher: &mut Matcher) -> bool {
    if matches!(matcher.peek(), Some(Token::Dimension { .. })) {
        matcher.advance();
        return true;
    }
    matcher.record_expected("<dimension-token>");
    false
}

fn match_percentage_token(matcher: &mut Matcher) -> bool {
    if matches!(matcher.peek(), Some(Token::Percentage(_))) {
        matcher.advance();
        return true;
    }
    matcher.record_expected("<percentage-token>");
    false
}

// ============================================================
// Markuplint custom built-in types
// ============================================================

fn match_bcp47(matcher: &mut Matcher) -> bool {
    if let Some(Token::Ident(value)) = matcher.peek()
        && crate::rfc::bcp47::is_bcp47(value)
    {
        matcher.advance();
        return true;
    }
    matcher.record_expected("<bcp-47>");
    false
}

// ============================================================
// Range checking
// ============================================================

fn check_range(value: f64, range: Option<&TypeRange>) -> bool {
    let Some(range) = range else {
        return true;
    };

    // Parse min/max. None means infinity.
    if let Some(min_str) = &range.min
        && let Some(min_val) = parse_range_number(min_str)
        && value < min_val
    {
        return false;
    }
    // If we can't parse (different units), skip the check

    if let Some(max_str) = &range.max
        && let Some(max_val) = parse_range_number(max_str)
        && value > max_val
    {
        return false;
    }

    true
}

fn parse_range_number(s: &str) -> Option<f64> {
    if let Ok(v) = s.parse::<f64>() {
        return Some(v);
    }
    let num_end = s
        .bytes()
        .position(|b| b.is_ascii_alphabetic() || b == b'%')
        .unwrap_or(s.len());
    s[..num_end].parse::<f64>().ok()
}

// ============================================================
// Math function detection
// ============================================================

/// Known CSS math function names.
///
/// Exhaustively lists every math function defined in CSS Values Level 4
/// (arithmetic, stepped-value, trigonometric, exponential, and sign-related).
/// When CSS adds a new math function it must be added both here and to the
/// match arms in [`calc`](super::calc); the two must stay in sync.
pub const MATH_FUNCTIONS: &[&str] = &[
    "calc", "min", "max", "clamp", "round", "mod", "rem", "sin", "cos", "tan", "asin", "acos", "atan", "atan2", "pow",
    "sqrt", "hypot", "log", "exp", "abs", "sign",
];

pub fn is_math_function(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    MATH_FUNCTIONS.iter().any(|f| *f == lower)
}

pub fn math_function_result_type(name: &str) -> Option<&'static str> {
    let lower = name.to_ascii_lowercase();
    match lower.as_str() {
        // Trig and number-only functions returning <number>
        "sin" | "cos" | "tan" | "pow" | "sqrt" | "hypot" | "log" | "exp" => Some("number"),
        // Inverse trig returning <angle>
        "asin" | "acos" | "atan" => Some("angle"),
        // These preserve the input type (or unknown function)
        _ => None,
    }
}

pub fn supports_math_functions(type_name: &str) -> bool {
    matches!(
        type_name,
        "number"
            | "integer"
            | "length"
            | "angle"
            | "time"
            | "frequency"
            | "resolution"
            | "flex"
            | "percentage"
            | "length-percentage"
            | "angle-percentage"
            | "time-percentage"
            | "frequency-percentage"
    )
}

pub fn is_type_compatible_with_result(expected_type: &str, result_type: &str) -> bool {
    if expected_type == result_type {
        return true;
    }
    if expected_type == "integer" && result_type == "number" {
        return true;
    }
    // Combined types accept their component types
    match expected_type {
        "length-percentage" => matches!(result_type, "length" | "percentage"),
        "angle-percentage" => matches!(result_type, "angle" | "percentage"),
        "time-percentage" => matches!(result_type, "time" | "percentage"),
        "frequency-percentage" => matches!(result_type, "frequency" | "percentage"),
        _ => false,
    }
}

pub fn dimension_type_name(unit: &str) -> Option<&'static str> {
    unit_type(unit).map(|dt| match dt {
        DimensionType::Length => "length",
        DimensionType::Angle => "angle",
        DimensionType::Time => "time",
        DimensionType::Frequency => "frequency",
        DimensionType::Resolution => "resolution",
        DimensionType::Flex => "flex",
    })
}
