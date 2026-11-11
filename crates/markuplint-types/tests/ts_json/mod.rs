//! A check result in the shape TS `JSON.stringify(check(value, type))` gives it, to compare the
//! Rust port against results taken from the TS implementation.
//!
//! Offsets and lengths are converted from bytes to UTF-16 code units, which TS counts. A key whose
//! TS value is `undefined` or `null` (an empty `expects`, an absent `ref`) is left out on both
//! sides.

use markuplint_types::check::types::{CheckResult, Expect, ExpectType, Reason};
use serde_json::{Map, Value, json};

fn reason(reason: &Reason) -> &'static str {
    match reason {
        Reason::SyntaxError => "syntax-error",
        Reason::Typo => "typo",
        Reason::MissingToken => "missing-token",
        Reason::MissingComma => "missing-comma",
        Reason::UnexpectedToken => "unexpected-token",
        Reason::UnexpectedSpace => "unexpected-space",
        Reason::UnexpectedNewline => "unexpected-newline",
        Reason::UnexpectedComma => "unexpected-comma",
        Reason::EmptyToken => "empty-token",
        Reason::OutOfRange => "out-of-range",
        Reason::DoesntExistInEnum => "doesnt-exist-in-enum",
        Reason::Duplicated => "duplicated",
        Reason::IllegalCombination => "illegal-combination",
        Reason::IllegalOrder => "illegal-order",
        Reason::ExtraToken => "extra-token",
        Reason::MustBePercentEncoded => "must-be-percent-encoded",
        Reason::MustBeSerialized => "must-be-serialized",
        other => panic!("no TS string for {other:?}"),
    }
}

fn expect(expect: &Expect) -> Value {
    let type_ = match expect.type_ {
        ExpectType::Common => "common",
        ExpectType::Const => "const",
        ExpectType::Format => "format",
        ExpectType::Syntax => "syntax",
        ExpectType::Regexp => "regexp",
    };
    json!({ "type": type_, "value": expect.value })
}

fn utf16_len(s: &str) -> usize {
    s.encode_utf16().count()
}

/// `result` of `value` as TS serialises it.
#[must_use]
pub fn to_ts_json(value: &str, result: &CheckResult) -> Value {
    let CheckResult::Unmatched(res) = result else {
        return json!({ "matched": true });
    };
    let mut obj = Map::new();
    obj.insert("matched".into(), json!(false));
    obj.insert("raw".into(), json!(res.raw));
    let offset = res.offset.min(value.len());
    let end = (res.offset + res.length).min(value.len());
    obj.insert("offset".into(), json!(utf16_len(value.get(..offset).unwrap_or(value))));
    obj.insert(
        "length".into(),
        json!(utf16_len(value.get(offset..end).unwrap_or(&res.raw))),
    );
    obj.insert("line".into(), json!(res.line));
    obj.insert("column".into(), json!(res.column));
    obj.insert("reason".into(), json!(reason(&res.reason)));
    if !res.expects.is_empty() {
        obj.insert("expects".into(), Value::Array(res.expects.iter().map(expect).collect()));
    }
    if let Some(ref_) = &res.ref_ {
        obj.insert("ref".into(), json!(ref_));
    }
    if let Some(candidate) = &res.candidate {
        obj.insert("candidate".into(), json!(candidate));
    }
    if let Some(part_name) = &res.part_name {
        obj.insert("partName".into(), json!(part_name));
    }
    if let Some(pass_count) = res.pass_count {
        obj.insert("passCount".into(), json!(pass_count));
    }
    if let Some(extra) = &res.extra {
        obj.insert("extra".into(), expect(extra));
    }
    if let Some(fallback_to) = &res.fallback_to {
        obj.insert("fallbackTo".into(), json!(fallback_to));
    }
    Value::Object(obj)
}

/// The TS JSON with its `null` values and empty `expects` left out.
fn normalise(ts: &str) -> Value {
    let mut value: Value = serde_json::from_str(ts).expect("valid JSON");
    if let Value::Object(obj) = &mut value {
        obj.retain(|key, v| {
            let empty_expects = key == "expects" && v.as_array().is_some_and(Vec::is_empty);
            !v.is_null() && !empty_expects
        });
    }
    value
}

/// Asserts each `(type, value, TS result)` against `check(value, type)`.
pub fn assert_ts_results(cases: &[(&str, &str, &str)], check: impl Fn(&str, &str) -> CheckResult) {
    let mut failures = Vec::new();
    for (type_, value, ts) in cases {
        let actual = to_ts_json(value, &check(value, type_));
        let expected = normalise(ts);
        if actual != expected {
            failures.push(format!(
                "{type_} {value:?}\n  expected: {expected}\n  actual:   {actual}"
            ));
        }
    }
    assert!(
        failures.is_empty(),
        "{} mismatch(es):\n{}",
        failures.len(),
        failures.join("\n")
    );
}
