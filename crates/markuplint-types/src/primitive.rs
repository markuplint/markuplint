//! Rust equivalents of `@markuplint/types/src/primitive/`.

use regex::Regex;
use std::sync::LazyLock;

static RE_INT: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^-?\d+$").unwrap());
static RE_UINT: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^\d+$").unwrap());
static RE_ALL_ZEROS: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^0+$").unwrap());
static RE_SPLIT_UNIT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)(^-?\.\d+|^-?\d+(?:\.\d+(?:e[+-]\d+)?)?)([a-z]+$)").unwrap());

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
    RE_INT.is_match(value)
}

pub fn is_uint(value: &str, gt: Option<i64>) -> bool {
    if !RE_UINT.is_match(value) {
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
    if value != value.trim() {
        return false;
    }
    parse_float(value).is_some()
}

pub fn is_non_zero_uint(value: &str) -> bool {
    RE_UINT.is_match(value) && !RE_ALL_ZEROS.is_match(value)
}

pub fn split_unit(value: &str) -> SplitUnitResult {
    let value = value.trim().to_lowercase();
    if let Some(caps) = RE_SPLIT_UNIT.captures(&value) {
        SplitUnitResult {
            num: caps.get(1).map_or_else(|| value.clone(), |m| m.as_str().to_owned()),
            unit: caps.get(2).map_or_else(String::new, |m| m.as_str().to_owned()),
        }
    } else {
        SplitUnitResult {
            num: value,
            unit: String::new(),
        }
    }
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

/// JS `parseFloat` parses the leading numeric portion of a string,
/// but for our use case the entire string must be a valid number
/// (after trim, which callers handle).
fn parse_float(value: &str) -> Option<f64> {
    let n: f64 = value.parse().ok()?;
    if n.is_finite() { Some(n) } else { None }
}
