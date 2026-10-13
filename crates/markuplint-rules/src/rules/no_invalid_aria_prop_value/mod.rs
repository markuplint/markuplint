//! `no-invalid-aria-prop-value` rule: report an `aria-*` attribute whose value does not fit the
//! property's value type.
//!
//! Ports `packages/@markuplint/rules/src/no-invalid-aria-prop-value/` and its checker
//! `wai-aria/checkings/value.ts` (`checkAriaValue` is [`check_aria_value`]). The value type is the
//! property's, or the `conditionalValue` entry for the computed role when there is one. The
//! property is matched by the attribute name as written, case-sensitively (`ARIA-LIVE="x"` is not
//! looked at, as in TS), and an attribute with a dynamic value is skipped.
//!
//! `integer` and `number` are kept as TS has them, `Number.parseInt(v).toString() === v` and
//! `Number.parseFloat(v).toString() === v`, so what counts as valid is what JS prints back: `1e-7`
//! and `NaN` are valid numbers, `1e21` (`1e+21`), `+1`, `-0`, ` 1` and `1.0` are not.
//!
//! Known gap: TS passes `document.booleanish` (a parser option for JSX, where an omitted value
//! means `true`) so that an empty value is accepted for `true/false`, `tristate` and
//! `true/false/undefined`. The Rust DOM has no such flag, so the default (non-booleanish) behavior
//! is the only one: an empty value is invalid for those types.

use markuplint_core::mlast::MLASTHTMLAttr;
use markuplint_dom::arena::DomArena;
use markuplint_types::spec::aria;
use markuplint_types::spec::types::{ARIAAttributeValue, ARIAProperty, MLMLSpec};

use crate::aria::computed_role::get_computed_role;
use crate::aria_check::{
    ElementContext, ElementGate, aria_prop_attrs, attr_name, is_js_whitespace, prop_type_label, walk_elements,
};
use crate::rule::{Rule, RuleConfigSet};
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoInvalidAriaPropValue;

impl Rule for NoInvalidAriaPropValue {
    fn id(&self) -> &'static str {
        "no-invalid-aria-prop-value"
    }

    fn verify(&self, arena: &DomArena, spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        walk_elements(
            self.id(),
            arena,
            spec,
            config,
            ElementGate::Supported,
            |_| (),
            |(), ctx, violations| check(ctx, violations),
        )
    }
}

fn check(ctx: &ElementContext<'_>, violations: &mut Vec<Violation>) {
    let attrs = aria_prop_attrs(ctx.el);
    if attrs.is_empty() {
        return;
    }

    let role_name = get_computed_role(ctx.spec, ctx.arena, ctx.node_id, ctx.version, false)
        .role
        .map(|role| role.name);
    let props = &aria::get_aria_spec(ctx.spec, ctx.version).props;

    for attr in attrs {
        if let Some(message) = invalid_value_message(attr, props, role_name.as_deref()) {
            violations.push(ctx.attr_violation(attr, message));
        }
    }
}

/// The message for `attr` when its value does not fit the property, `None` when it does, when the
/// property is unknown, or when the value is dynamic.
fn invalid_value_message(attr: &MLASTHTMLAttr, props: &[ARIAProperty], role_name: Option<&str>) -> Option<String> {
    if attr.is_dynamic_value == Some(true) {
        return None;
    }
    let name = attr_name(attr);
    let prop = props.iter().find(|p| p.name == name)?;

    let mut value_type = &prop.value;
    if let (Some(role_name), Some(conditions)) = (role_name, &prop.conditional_value)
        && let Some(cond) = conditions.iter().find(|cond| cond.role.iter().any(|r| r == role_name))
    {
        value_type = &cond.value;
    }

    let value = attr.value.raw.as_str();
    if check_aria_value(value_type, value, &prop.enum_values) {
        return None;
    }

    let mut message = format!(
        "The \"{value}\" is disallowed on the \"{name}\" ARIA {}",
        prop_type_label(&prop.prop_type)
    );
    if !prop.enum_values.is_empty() {
        let allowed: Vec<String> = prop.enum_values.iter().map(|v| format!("\"{v}\"")).collect();
        message.push_str(". Allowed values are: ");
        message.push_str(&allowed.join(", "));
    }
    Some(message)
}

/// Port of `checkAriaValue` (`wai-aria/checkings/value.ts`) for the non-booleanish case, see the
/// module docs. `URI`, which TS has no case for, is always valid.
fn check_aria_value(value_type: &ARIAAttributeValue, value: &str, enum_values: &[String]) -> bool {
    match value_type {
        ARIAAttributeValue::Token => enum_values.iter().any(|e| e == value),
        ARIAAttributeValue::TokenList => split_whitespace_runs(value)
            .iter()
            .all(|token| enum_values.iter().any(|e| e == token)),
        ARIAAttributeValue::StringValue
        | ARIAAttributeValue::IdReference
        | ARIAAttributeValue::IdReferenceList
        | ARIAAttributeValue::Uri => true,
        ARIAAttributeValue::TrueFalse => matches!(value, "true" | "false"),
        ARIAAttributeValue::Tristate => matches!(value, "mixed" | "true" | "false" | "undefined"),
        ARIAAttributeValue::TrueFalseUndefined => matches!(value, "true" | "false" | "undefined"),
        ARIAAttributeValue::Integer => js_number_to_string(js_parse_int(value)) == value,
        ARIAAttributeValue::Number => js_number_to_string(js_parse_float(value)) == value,
    }
}

/// JS `value.split(/\s+/)`: runs of whitespace separate, and a leading or trailing run leaves an
/// empty string at that end (`""` splits to `[""]`).
fn split_whitespace_runs(value: &str) -> Vec<&str> {
    let mut tokens = Vec::new();
    let mut start = 0;
    let mut in_run = false;
    for (i, ch) in value.char_indices() {
        if is_js_whitespace(ch) {
            if !in_run {
                tokens.push(&value[start..i]);
                in_run = true;
            }
        } else if in_run {
            start = i;
            in_run = false;
        }
    }
    if in_run {
        tokens.push("");
    } else {
        tokens.push(&value[start..]);
    }
    tokens
}

/// JS `Number.parseInt(value)` (radix 10, or 16 after a `0x` prefix).
fn js_parse_int(value: &str) -> f64 {
    let trimmed = value.trim_start_matches(is_js_whitespace);
    let (sign, rest) = split_sign(trimmed);
    let (radix, digits) = match rest.strip_prefix("0x").or_else(|| rest.strip_prefix("0X")) {
        Some(hex) => (16, hex),
        None => (10, rest),
    };
    let end = digits.find(|c: char| !c.is_digit(radix)).unwrap_or(digits.len());
    let digits = &digits[..end];
    if digits.is_empty() {
        return f64::NAN;
    }
    let magnitude = if radix == 10 {
        digits.parse::<f64>().unwrap_or(f64::NAN)
    } else {
        digits
            .chars()
            .filter_map(|c| c.to_digit(16))
            .fold(0.0, |acc, d| acc * 16.0 + f64::from(d))
    };
    sign * magnitude
}

/// JS `Number.parseFloat(value)`: the longest prefix that is a decimal literal or `Infinity`.
fn js_parse_float(value: &str) -> f64 {
    let trimmed = value.trim_start_matches(is_js_whitespace);
    let (sign, rest) = split_sign(trimmed);
    if rest.starts_with("Infinity") {
        return sign * f64::INFINITY;
    }

    let bytes = rest.as_bytes();
    let count_digits = |from: usize| bytes[from..].iter().take_while(|b| b.is_ascii_digit()).count();

    let int_digits = count_digits(0);
    let mut end = int_digits;
    let mut frac_digits = 0;
    if bytes.get(end) == Some(&b'.') {
        frac_digits = count_digits(end + 1);
        if int_digits > 0 || frac_digits > 0 {
            end += 1 + frac_digits;
        }
    }
    if int_digits == 0 && frac_digits == 0 {
        return f64::NAN;
    }
    if matches!(bytes.get(end), Some(b'e' | b'E')) {
        let mut exp = end + 1;
        if matches!(bytes.get(exp), Some(b'+' | b'-')) {
            exp += 1;
        }
        let exp_digits = count_digits(exp);
        if exp_digits > 0 {
            end = exp + exp_digits;
        }
    }

    sign * rest[..end].parse::<f64>().unwrap_or(f64::NAN)
}

fn split_sign(s: &str) -> (f64, &str) {
    if let Some(rest) = s.strip_prefix('-') {
        (-1.0, rest)
    } else if let Some(rest) = s.strip_prefix('+') {
        (1.0, rest)
    } else {
        (1.0, s)
    }
}

/// JS `Number.prototype.toString()` (radix 10): the shortest digits that round-trip, written in
/// plain notation for exponents from -7 to 20 and in `e` notation outside that.
fn js_number_to_string(n: f64) -> String {
    if n.is_nan() {
        return "NaN".to_string();
    }
    if n == 0.0 {
        return "0".to_string();
    }
    let sign = if n < 0.0 { "-" } else { "" };
    if n.is_infinite() {
        return format!("{sign}Infinity");
    }

    // `{:e}` prints the shortest round-trip digits as `d.ddde<exp>`.
    let scientific = format!("{:e}", n.abs());
    let Some((mantissa, exp)) = scientific.split_once('e') else {
        return scientific;
    };
    let digits = mantissa.replace('.', "");
    let k = i32::try_from(digits.len()).unwrap_or(i32::MAX);
    // The decimal point sits after `point` digits.
    let point = exp.parse::<i32>().unwrap_or(0) + 1;
    let zeros = |count: i32| "0".repeat(usize::try_from(count).unwrap_or(0));

    let body = if k <= point && point <= 21 {
        format!("{digits}{}", zeros(point - k))
    } else if 0 < point && point <= 21 {
        let split = usize::try_from(point).unwrap_or(0);
        format!("{}.{}", &digits[..split], &digits[split..])
    } else if -6 < point && point <= 0 {
        format!("0.{}{digits}", zeros(-point))
    } else {
        let exponent = point - 1;
        let exponent_sign = if exponent < 0 { "-" } else { "+" };
        if k == 1 {
            format!("{digits}e{exponent_sign}{}", exponent.abs())
        } else {
            format!("{}.{}e{exponent_sign}{}", &digits[..1], &digits[1..], exponent.abs())
        }
    };
    format!("{sign}{body}")
}
