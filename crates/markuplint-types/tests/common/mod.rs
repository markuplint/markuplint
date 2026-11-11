//! Compares a Rust check result with the result TS `check(value, type)` returns, as JSON.
//!
//! The expected values were produced by the TypeScript `@markuplint/types` `check()`. `offset`
//! is a byte offset (TS counts UTF-16 code units); `line` and `column` are TS's. `length` is not
//! compared, being bytes in Rust.

#![allow(dead_code)]

use markuplint_types::check::check;
use markuplint_types::check::types::{CheckResult, Expect, ExpectType, Reason, Type};
use serde_json::{Value, json};

fn expect_type(t: &ExpectType) -> &'static str {
    match t {
        ExpectType::Common => "common",
        ExpectType::Const => "const",
        ExpectType::Format => "format",
        ExpectType::Syntax => "syntax",
        ExpectType::Regexp => "regexp",
    }
}

fn reason(r: &Reason) -> String {
    let name = format!("{r:?}");
    let mut kebab = String::new();
    for (i, c) in name.chars().enumerate() {
        if c.is_ascii_uppercase() {
            if i > 0 {
                kebab.push('-');
            }
            kebab.push(c.to_ascii_lowercase());
        } else {
            kebab.push(c);
        }
    }
    kebab
}

fn expect_json(e: &Expect) -> Value {
    json!({ "type": expect_type(&e.type_), "value": e.value })
}

/// The result of `check(value, type)` in the shape of the TS result.
pub fn result_json(value: &str, type_: &Type) -> Value {
    match check(value, type_, None) {
        CheckResult::Matched => json!({ "matched": true }),
        CheckResult::Unmatched(u) => json!({
            "matched": false,
            "ref": u.ref_,
            "raw": u.raw,
            "offset": u.offset,
            "line": u.line,
            "column": u.column,
            "reason": reason(&u.reason),
            "partName": u.part_name,
            "expects": if u.expects.is_empty() {
                Value::Null
            } else {
                Value::Array(u.expects.iter().map(expect_json).collect())
            },
            "extra": u.extra.as_ref().map(expect_json),
            "candidate": u.candidate,
        }),
    }
}

/// Asserts that `check(value, keyword)` returns `expected` (the TS result).
pub fn assert_keyword(keyword: &str, value: &str, expected: &str) {
    let expected: Value = serde_json::from_str(expected).unwrap();
    let actual = result_json(value, &Type::Keyword(keyword.into()));
    assert_eq!(actual, expected, "{keyword}: {value:?}");
}
