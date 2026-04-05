//! Number type validation.

use super::types::{
    CheckResult, Expect, ExpectType, NumberType, NumericKind, Reason, UnmatchedOpts, matched, unmatched, unmatched_with,
};
use crate::primitive::{is_float, is_int};

/// Validate a numeric value with optional range constraints.
#[must_use]
pub fn check_number(value: &str, type_def: &NumberType, ref_: Option<&str>) -> CheckResult {
    if value.is_empty() {
        return unmatched_with(
            value,
            Reason::EmptyToken,
            UnmatchedOpts {
                ref_: ref_.map(str::to_owned),
                ..Default::default()
            },
        );
    }

    // Syntax check
    let valid_syntax = match type_def.number_type {
        NumericKind::Integer => is_int(value),
        NumericKind::Float => is_float(value),
    };
    if !valid_syntax {
        let base = match type_def.number_type {
            NumericKind::Integer => "integer",
            NumericKind::Float => "number",
        };
        let desc = format_number_description(base, type_def);
        return unmatched_with(
            value,
            Reason::UnexpectedToken,
            UnmatchedOpts {
                ref_: ref_.map(str::to_owned),
                expects: Some(vec![Expect {
                    type_: ExpectType::Format,
                    value: desc,
                }]),
                ..Default::default()
            },
        );
    }

    let Ok(num) = value.parse::<f64>() else {
        return unmatched(value, Reason::SyntaxError);
    };
    if !num.is_finite() {
        return unmatched(value, Reason::SyntaxError);
    }

    // Range checks
    if type_def.gt.is_some_and(|gt| num <= gt)
        || type_def.gte.is_some_and(|gte| num < gte)
        || type_def.lt.is_some_and(|lt| num >= lt)
        || type_def.lte.is_some_and(|lte| num > lte)
    {
        return out_of_range(value, type_def, ref_);
    }

    matched()
}

fn out_of_range(value: &str, type_def: &NumberType, ref_: Option<&str>) -> CheckResult {
    let candidate = if type_def.clampable {
        clamp_candidate(value, type_def)
    } else {
        None
    };

    unmatched_with(
        value,
        Reason::OutOfRangeWithBounds {
            gt: type_def.gt,
            gte: type_def.gte,
            lt: type_def.lt,
            lte: type_def.lte,
        },
        UnmatchedOpts {
            ref_: ref_.map(str::to_owned),
            candidate,
            ..Default::default()
        },
    )
}

fn clamp_candidate(value: &str, type_def: &NumberType) -> Option<String> {
    let num = value.parse::<f64>().ok()?;

    if type_def.gte.is_some_and(|gte| num < gte) {
        return type_def.gte.map(|gte| format_number(gte, &type_def.number_type));
    }
    if type_def.gt.is_some_and(|gt| num <= gt) && type_def.number_type == NumericKind::Integer {
        return type_def.gt.map(|gt| format_number(gt + 1.0, &type_def.number_type));
    }
    if type_def.lte.is_some_and(|lte| num > lte) {
        return type_def.lte.map(|lte| format_number(lte, &type_def.number_type));
    }
    if type_def.lt.is_some_and(|lt| num >= lt) && type_def.number_type == NumericKind::Integer {
        return type_def.lt.map(|lt| format_number(lt - 1.0, &type_def.number_type));
    }
    None
}

/// Generate a human-readable description of a number type with its range constraints.
/// Matches TS behavior: "integer greater than or equal to 0 less than or equal to 8".
fn format_number_description(base: &str, type_def: &NumberType) -> String {
    let mut parts = vec![base.to_owned()];
    if let Some(gt) = type_def.gt {
        parts.push(format!("greater than {}", format_number(gt, &type_def.number_type)));
    }
    if let Some(gte) = type_def.gte {
        parts.push(format!(
            "greater than or equal to {}",
            format_number(gte, &type_def.number_type)
        ));
    }
    if let Some(lt) = type_def.lt {
        parts.push(format!("less than {}", format_number(lt, &type_def.number_type)));
    }
    if let Some(lte) = type_def.lte {
        parts.push(format!(
            "less than or equal to {}",
            format_number(lte, &type_def.number_type)
        ));
    }
    parts.join(" ")
}

fn format_number(n: f64, kind: &NumericKind) -> String {
    if *kind == NumericKind::Integer {
        #[allow(clippy::cast_possible_truncation)]
        let i = n as i64;
        format!("{i}")
    } else {
        format!("{n}")
    }
}
