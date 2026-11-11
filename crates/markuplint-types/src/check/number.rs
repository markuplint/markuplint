//! Port of `packages/@markuplint/types/src/number.ts`. What a number is expected to be is not part
//! of the result: the message builds it from the type.

use super::types::{CheckResult, NumberType, NumericKind, Reason, UnmatchedOpts, matched, unmatched, unmatched_with};
use crate::primitive::{is_float, is_int, parse_float_prefix};

/// TS `checkNumber`.
#[must_use]
pub fn check_number(value: &str, type_def: &NumberType, _ref: Option<&str>) -> CheckResult {
    if value.is_empty() {
        return unmatched(value, Reason::EmptyToken);
    }
    let is_integer = type_def.number_type == NumericKind::Integer;
    let syntax_matched = if is_integer { is_int(value) } else { is_float(value) };
    if !syntax_matched {
        return unmatched(value, Reason::UnexpectedToken);
    }
    let Some(n) = parse_float_prefix(value).filter(|n| n.is_finite()) else {
        return unmatched(value, Reason::UnexpectedToken);
    };
    let clampable = type_def.clampable;
    let out_of_range = |candidate: Option<String>| {
        unmatched_with(
            value,
            Reason::OutOfRange,
            UnmatchedOpts {
                candidate,
                ..Default::default()
            },
        )
    };

    if let Some(gt) = type_def.gt
        && n <= gt
    {
        return out_of_range((clampable && is_integer).then(|| js_number_string(gt + 1.0)));
    }
    if let Some(gte) = type_def.gte
        && n < gte
    {
        return out_of_range(clampable.then(|| js_number_string(gte)));
    }
    if let Some(lt) = type_def.lt
        && lt <= n
    {
        return out_of_range((clampable && is_integer).then(|| js_number_string(lt - 1.0)));
    }
    if let Some(lte) = type_def.lte
        && lte < n
    {
        return out_of_range(clampable.then(|| js_number_string(lte)));
    }
    matched()
}

/// JS `` `${n}` `` for a number.
#[must_use]
pub fn js_number_string(n: f64) -> String {
    if n.fract() == 0.0 && n.abs() < 1e21 {
        #[allow(clippy::cast_possible_truncation)]
        let i = n as i64;
        return i.to_string();
    }
    n.to_string()
}
