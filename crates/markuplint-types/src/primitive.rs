//! Rust equivalents of `@markuplint/types/src/primitive/`.
//!
//! The shapes of TS `/^-?\d+$/`, `/^\d+$/` and `/(^-?\.\d+|…)([a-z]+$)/i`, with their JS semantics:
//! `\d` is an ASCII digit, and a case-insensitive `[a-z]` without the `u` flag folds no non-ASCII
//! character onto an ASCII one, so every class here is ASCII. The white space that `trim()` and
//! `parseFloat` skip is the JS set ([`crate::js_string`]), not Unicode's.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NumberType {
    Int,
    Uint,
    Float,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SplitUnitResult {
    pub num: String,
    pub unit: String,
}

/// Equivalent to the WHATWG "signed integer" microsyntax.
pub fn is_int(value: &str) -> bool {
    is_digits(value.strip_prefix('-').unwrap_or(value))
}

/// `/^\d+$/`: one or more ASCII digits and nothing else.
fn is_digits(value: &str) -> bool {
    !value.is_empty() && value.bytes().all(|b| b.is_ascii_digit())
}

/// The length of the run of ASCII digits at the start of `value`.
fn digits_len(value: &str) -> usize {
    value.bytes().take_while(u8::is_ascii_digit).count()
}

pub fn is_uint(value: &str, gt: Option<i64>) -> bool {
    if !is_digits(value) {
        return false;
    }
    if let Some(gt) = gt {
        let Ok(n) = value.parse::<i64>() else {
            return false;
        };
        return n > gt;
    }
    true
}

/// Matches the behavior of JS `Number.isFinite(Number.parseFloat(value))`
/// after trimming whitespace.
pub fn is_float(value: &str) -> bool {
    if value != crate::js_string::trim(value) {
        return false;
    }
    parse_float(value).is_some()
}

pub fn is_non_zero_uint(value: &str) -> bool {
    is_digits(value) && !value.bytes().all(|b| b == b'0')
}

pub fn split_unit(value: &str) -> SplitUnitResult {
    let value = crate::js_string::trim(value).to_lowercase();
    if let Some(number_end) = number_end_before_unit(&value) {
        SplitUnitResult {
            num: value[..number_end].to_owned(),
            unit: value[number_end..].to_owned(),
        }
    } else {
        SplitUnitResult {
            num: value,
            unit: String::new(),
        }
    }
}

/// Where the number ends in a lower-cased `value` that is a number followed by a unit: JS
/// `/(^-?\.\d+|^-?\d+(?:\.\d+(?:e[+-]\d+)?)?)([a-z]+$)/i`. The unit is one or more ASCII letters
/// up to the end, so a number that leaves anything else after it is not the one; of the numbers a
/// prefix can spell, the longest that leaves such a unit counts (the order the regular expression
/// tries them in).
fn number_end_before_unit(value: &str) -> Option<usize> {
    let is_unit = |rest: &str| !rest.is_empty() && rest.bytes().all(|b| b.is_ascii_lowercase());
    let sign = usize::from(value.starts_with('-'));
    let after_sign = &value[sign..];
    if let Some(fraction) = after_sign.strip_prefix('.') {
        let digits = digits_len(fraction);
        let end = sign + 1 + digits;
        return (digits > 0 && is_unit(&value[end..])).then_some(end);
    }
    let int_end = sign + digits_len(after_sign);
    if int_end == sign {
        return None;
    }
    let mut candidates = Vec::with_capacity(3);
    if value[int_end..].starts_with('.') {
        let frac_end = int_end + 1 + digits_len(&value[int_end + 1..]);
        if frac_end > int_end + 1 {
            let exponent = value[frac_end..]
                .strip_prefix('e')
                .and_then(|rest| rest.strip_prefix(['+', '-']))
                .map(digits_len)
                .filter(|n| *n > 0);
            if let Some(n) = exponent {
                candidates.push(frac_end + 2 + n);
            }
            candidates.push(frac_end);
        }
    }
    candidates.push(int_end);
    candidates.into_iter().find(|end| is_unit(&value[*end..]))
}

pub fn is_quantity(value: &str, units: &[&str], number_type: NumberType) -> bool {
    let result = split_unit(value);
    if !units.iter().any(|u| u.eq_ignore_ascii_case(&result.unit)) {
        return false;
    }
    match number_type {
        NumberType::Int => is_int(&result.num),
        NumberType::Uint => is_uint(&result.num, None),
        NumberType::Float => is_float(&result.num),
    }
}

pub fn range(value: &str, from: f64, to: f64) -> bool {
    let Some(num) = parse_float(value) else {
        return false;
    };
    (from..=to).contains(&num)
}

/// JS `Number.isFinite(Number.parseFloat(value))` as a value: `None` for `NaN` and the infinities.
fn parse_float(value: &str) -> Option<f64> {
    parse_float_prefix(value).filter(|n| n.is_finite())
}

/// JS `Number.parseFloat`: the number the longest prefix of `value` (after leading white space)
/// spells, `None` for `NaN`. `"1abc"` is `1`, `"Infinity"` is infinite.
#[must_use]
pub fn parse_float_prefix(value: &str) -> Option<f64> {
    let trimmed = value.trim_start_matches(crate::js_string::is_white_space);
    let text = &trimmed[..float_prefix_len(trimmed)?];
    if text.ends_with("Infinity") {
        return Some(if text.starts_with('-') {
            f64::NEG_INFINITY
        } else {
            f64::INFINITY
        });
    }
    text.parse().ok()
}

/// The length of the longest prefix of `value` that spells a JS decimal literal, `None` when it
/// has none: `/^[+-]?(?:Infinity|(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)/`.
fn float_prefix_len(value: &str) -> Option<usize> {
    let sign = usize::from(value.starts_with(['+', '-']));
    let rest = &value[sign..];
    if rest.starts_with("Infinity") {
        return Some(sign + "Infinity".len());
    }
    let int_len = digits_len(rest);
    let mut end = sign + int_len;
    if int_len > 0 {
        if value[end..].starts_with('.') {
            end += 1 + digits_len(&value[end + 1..]);
        }
    } else if value[end..].starts_with('.') && digits_len(&value[end + 1..]) > 0 {
        end += 1 + digits_len(&value[end + 1..]);
    } else {
        return None;
    }
    if let Some(after_e) = value[end..].strip_prefix(['e', 'E']) {
        let exp_sign = usize::from(after_e.starts_with(['+', '-']));
        let n = digits_len(&after_e[exp_sign..]);
        if n > 0 {
            end += 1 + exp_sign + n;
        }
    }
    Some(end)
}

#[cfg(test)]
mod equivalence_tests {
    use regex::Regex;

    use super::*;
    use crate::equivalence::for_each_string;

    #[test]
    fn digits_and_integers_are_the_regular_expressions() {
        let int = Regex::new(r"^-?[0-9]+$").unwrap();
        let uint = Regex::new(r"^[0-9]+$").unwrap();
        let zeros = Regex::new(r"^0+$").unwrap();
        for_each_string(&["0", "7", "-", "+", ".", "a", "\n", "\u{661}"], 4, &mut |s| {
            assert_eq!(is_int(s), int.is_match(s), "is_int({s:?})");
            assert_eq!(is_uint(s, None), uint.is_match(s), "is_uint({s:?})");
            assert_eq!(
                is_non_zero_uint(s),
                uint.is_match(s) && !zeros.is_match(s),
                "is_non_zero_uint({s:?})"
            );
        });
    }

    #[test]
    fn split_unit_is_the_regular_expression() {
        // JS `\d` and `[a-z]` are ASCII, so the reference spells them out; the pieces make a
        // number with a fraction and an exponent in three of them.
        let re = Regex::new(r"(^-?\.[0-9]+|^-?[0-9]+(?:\.[0-9]+(?:e[+-][0-9]+)?)?)([a-z]+$)").unwrap();
        let alphabet = [
            "1", "0", "-", "+", ".", "e", "x", "px", "E", "1.5", "e+1", "e-", "e+", "\n", "\u{661}", "\u{17f}",
            "\u{FEFF}", "\u{85}",
        ];
        for_each_string(&alphabet, 4, &mut |s| {
            let lowered = crate::js_string::trim(s).to_lowercase();
            let expected = re.captures(&lowered).map_or_else(
                || (lowered.clone(), String::new()),
                |c| (c[1].to_owned(), c[2].to_owned()),
            );
            let got = split_unit(s);
            assert_eq!((got.num, got.unit), expected, "split_unit({s:?})");
        });
    }

    #[test]
    fn split_unit_reads_the_exponent_and_the_js_white_space() {
        let split = |s: &str| {
            let got = split_unit(s);
            (got.num, got.unit)
        };
        let pair = |num: &str, unit: &str| (num.to_owned(), unit.to_owned());
        assert_eq!(split("1.5e+3px"), pair("1.5e+3", "px"));
        assert_eq!(split("1.5e-3px"), pair("1.5e-3", "px"));
        assert_eq!(split("1.5e3px"), pair("1.5e3px", ""));
        assert_eq!(split("1.5e+px"), pair("1.5e+px", ""));
        assert_eq!(split("1e+3px"), pair("1e+3px", ""));
        assert_eq!(split("1.5e+3e"), pair("1.5e+3", "e"));
        assert_eq!(split("-.5em"), pair("-.5", "em"));
        assert_eq!(split("1.5epx"), pair("1.5", "epx"));
        // JS `trim()` strips U+FEFF and not U+0085
        assert_eq!(split("\u{FEFF}1px\u{FEFF}"), pair("1", "px"));
        assert_eq!(split("\u{85}1px"), pair("\u{85}1px", ""));
        assert!(!is_float("\u{FEFF}1"));
        assert!(!is_float("\u{85}1"));
        assert!(is_float("1"));
    }

    #[test]
    fn float_prefix_is_the_regular_expression() {
        let re = Regex::new(r"^[+-]?(?:Infinity|(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)").unwrap();
        for_each_string(
            &["1", "0", "-", "+", ".", "e", "E", "x", "Infinity", "I"],
            5,
            &mut |s| {
                assert_eq!(
                    float_prefix_len(s),
                    re.find(s).map(|m| m.end()),
                    "float_prefix_len({s:?})"
                );
            },
        );
    }
}
