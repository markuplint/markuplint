use super::*;
use serde_json::json;

fn key(code: &str) -> Option<String> {
    parse_literal_expression(code).map(|l| l.key)
}

#[test]
fn v6_literal_keys_are_the_normal_form() {
    assert_eq!(key("true").as_deref(), Some("true"));
    assert_eq!(key("false").as_deref(), Some("false"));
    assert_eq!(key("null").as_deref(), Some("null"));
    assert_eq!(key("undefined").as_deref(), Some("undefined"));
    // Quotes do not matter, and the key of a string is its JSON
    assert_eq!(key("'x'").as_deref(), Some("\"x\""));
    assert_eq!(key("\"x\"").as_deref(), Some("\"x\""));
    assert_eq!(key("`x`").as_deref(), Some("\"x\""));
    assert_eq!(key("\"true\"").as_deref(), Some("\"true\""));
    assert_eq!(key("'\\x41\\u0042\\u{43}\\n'").as_deref(), Some("\"ABC\\n\""));
    // A number is its `String(n)`
    assert_eq!(key("0x10").as_deref(), Some("16"));
    assert_eq!(key("-0").as_deref(), Some("0"));
    assert_eq!(key("1_000").as_deref(), Some("1000"));
    assert_eq!(key("1e3").as_deref(), Some("1000"));
    assert_eq!(key(".5").as_deref(), Some("0.5"));
    assert_eq!(key("5.").as_deref(), Some("5"));
    assert_eq!(key("-1.5").as_deref(), Some("-1.5"));
    assert_eq!(key("1e21").as_deref(), Some("1e+21"));
    assert_eq!(key("1e-7").as_deref(), Some("1e-7"));
    assert_eq!(key("1e999").as_deref(), Some("Infinity"));
    // A BigInt keeps its digits
    assert_eq!(key("12345678901234567890n").as_deref(), Some("12345678901234567890"));
    assert_eq!(key("-5n").as_deref(), Some("-5"));
}

#[test]
fn v6_literal_reads_parentheses_and_assertions() {
    assert_eq!(key("(true)").as_deref(), Some("true"));
    assert_eq!(key(" ( ( 'x' ) ) ").as_deref(), Some("\"x\""));
    assert_eq!(key("true as boolean").as_deref(), Some("true"));
    assert_eq!(key("'a' as const").as_deref(), Some("\"a\""));
    assert_eq!(key("(0 satisfies number)").as_deref(), Some("0"));
    assert_eq!(key("'a' as 'a' | 'b'").as_deref(), Some("\"a\""));
}

#[test]
fn v6_literal_rejects_what_is_not_a_literal() {
    for code in [
        "",
        "x",
        "NaN",
        "Infinity",
        "a ? 0 : 1",
        "1 + 2",
        "[]",
        "{}",
        "`a${b}`",
        "'a' + 'b'",
        "(true",
        "true)",
        "-'x'",
        "-true",
        "true as boolean, x",
        "true as A ? b : c",
        "'unterminated",
        "010",
        "1__0",
        "f()",
    ] {
        assert_eq!(key(code), None, "{code}");
    }
}

#[test]
fn v6_literal_number_to_string_is_javascripts() {
    assert_eq!(js_number_to_string(0.1), "0.1");
    assert_eq!(js_number_to_string(100.0), "100");
    assert_eq!(
        js_number_to_string(123_456_789_012_345_680_000.0),
        "123456789012345680000"
    );
    assert_eq!(js_number_to_string(1.5e-6), "0.0000015");
    assert_eq!(js_number_to_string(1.5e-7), "1.5e-7");
    assert_eq!(js_number_to_string(-2.5), "-2.5");
}

fn rendering(declaration: &serde_json::Value, booleans: &[&str]) -> LiteralRendering {
    serde_json::from_value(json!({ "specLiteralValues": declaration, "booleanAttrNames": booleans })).unwrap()
}

fn render(r: &LiteralRendering, code: &str, name: &str, custom: bool) -> RenderedLiteral {
    r.render(&parse_literal_expression(code).unwrap(), name, custom)
}

#[test]
fn v6_literal_renders_by_default() {
    let r = rendering(&json!({}), &["disabled"]);
    let value = |s: &str| RenderedLiteral::Value(s.to_owned());
    assert_eq!(render(&r, "true", "aria-busy", false), value("true"));
    assert_eq!(render(&r, "false", "aria-busy", false), value("false"));
    assert_eq!(render(&r, "null", "title", false), RenderedLiteral::Absent);
    assert_eq!(render(&r, "0", "tabindex", false), value("0"));
    assert_eq!(render(&r, "'x'", "title", false), value("x"));
    assert_eq!(render(&r, "true", "disabled", false), value(""));
    assert_eq!(render(&r, "false", "disabled", false), RenderedLiteral::Absent);
    assert_eq!(render(&r, "0", "disabled", false), RenderedLiteral::Absent);
    assert_eq!(render(&r, "2", "disabled", false), value(""));
    assert_eq!(render(&r, "''", "disabled", false), RenderedLiteral::Unknown);
    assert_eq!(render(&r, "'x'", "disabled", false), value(""));
    // `hidden` is rendered as a boolean by the frameworks though it is not one in the spec
    assert_eq!(render(&r, "true", "hidden", false), value(""));
    assert_eq!(render(&r, "false", "hidden", false), RenderedLiteral::Absent);
}

#[test]
fn v6_literal_renders_by_the_tables_in_order() {
    let r = rendering(
        &json!({
            "otherAttrs": { "true": "yes" },
            "attrs": { "title": { "true": "by-name" } },
            "customElements": { "otherAttrs": { "false": null }, "attrs": { "title": { "true": "custom-name" } } },
        }),
        &[],
    );
    let value = |s: &str| RenderedLiteral::Value(s.to_owned());
    assert_eq!(render(&r, "true", "title", false), value("by-name"));
    assert_eq!(render(&r, "true", "lang", false), value("yes"));
    assert_eq!(render(&r, "true", "title", true), value("custom-name"));
    assert_eq!(render(&r, "false", "lang", true), RenderedLiteral::Absent);
    assert_eq!(render(&r, "false", "lang", false), value("false"));
}
