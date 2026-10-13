//! Tests for `no-invalid-aria-prop-value` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-invalid-aria-prop-value-valid-001    → no_invalid_aria_prop_value_valid_001
//!   no-invalid-aria-prop-value-invalid-001  → no_invalid_aria_prop_value_invalid_001
//!   v6_no_invalid_aria_prop_value_001  — Rust-only: token with the allowed values in the message
//!   v6_no_invalid_aria_prop_value_002  — Rust-only: token list
//!   v6_no_invalid_aria_prop_value_003  — Rust-only: empty values
//!   v6_no_invalid_aria_prop_value_004  — Rust-only: `conditionalValue` by the computed role
//!   v6_no_invalid_aria_prop_value_005  — Rust-only: property names are matched case-sensitively; unknown properties; positions over lines
//!   v6_no_invalid_aria_prop_value_006  — Rust-only: dynamic value is skipped (the HTML parser has none, so the check function is called directly)
//!   v6_no_invalid_aria_prop_value_007  — Rust-only: `version` option, `rules: false`
//!   v6_no_invalid_aria_prop_value_008  — Rust-only: integer and number values through the pipeline
//!   v6_no_invalid_aria_prop_value_009  — Rust-only: character references are not decoded before the check
//!   v6_no_invalid_aria_prop_value_010  — Rust-only: valid token, true/false and integer values
//!   v6_check_aria_value_*  — Rust-only: unit tests of `check_aria_value`; expectations are the results of the TS
//!                            `checkAriaValue` for the same inputs
//!
//! Known gap: the TS `booleanish` argument (JSX parser) has no Rust counterpart, so there is no
//! test for an empty `true/false` value being accepted.

use super::*;
use crate::aria_check::html_attrs;
use crate::lint::{LintConfig, lint};
use crate::violation::Severity;
use markuplint_dom::html_builder;
use markuplint_types::spec::aria::ARIAVersion;
use markuplint_types::spec::load_spec;

fn spec() -> MLMLSpec {
    load_spec(include_str!("../../../../../packages/@markuplint/html-spec/index.json")).unwrap()
}

fn html_arena(html: &str) -> markuplint_dom::arena::DomArena {
    let as_doc = markuplint_html_parser::should_parse_as_document(html);
    let is_fragment = !as_doc;
    let parser_arena = if is_fragment {
        markuplint_html_parser::parse_fragment(html)
    } else {
        markuplint_html_parser::parse_document(html)
    };
    html_builder::build_from_html_arena(html, &parser_arena, is_fragment)
}

fn config(value: serde_json::Value) -> LintConfig {
    serde_json::from_value(serde_json::json!({ "rules": { "no-invalid-aria-prop-value": value } })).unwrap()
}

/// `(severity, line, col, message, raw)` of every violation.
fn run(html: &str, value: serde_json::Value) -> Vec<(Severity, u32, u32, String, String)> {
    let arena = html_arena(html);
    lint(&arena, &spec(), &config(value))
        .violations
        .into_iter()
        .map(|v| (v.severity, v.line, v.col, v.message, v.raw))
        .collect()
}

fn violation(line: u32, col: u32, message: &str, raw: &str) -> (Severity, u32, u32, String, String) {
    (Severity::Error, line, col, message.to_string(), raw.to_string())
}

/// TS: `[no-invalid-aria-prop-value-valid-001]`
#[test]
fn no_invalid_aria_prop_value_valid_001() {
    const _ID: &str = "no-invalid-aria-prop-value-valid-001";
    assert_eq!(
        run(
            r#"<div role="button" aria-pressed="true"></div>"#,
            serde_json::json!(true)
        ),
        vec![]
    );
}

/// TS: `[no-invalid-aria-prop-value-invalid-001]`
#[test]
fn no_invalid_aria_prop_value_invalid_001() {
    const _ID: &str = "no-invalid-aria-prop-value-invalid-001";
    assert_eq!(
        run(
            r#"<div role="button" aria-pressed="hoge"></div>"#,
            serde_json::json!(true)
        ),
        vec![violation(
            1,
            20,
            "The \"hoge\" is disallowed on the \"aria-pressed\" ARIA state",
            "aria-pressed=\"hoge\""
        )]
    );
}

#[test]
fn v6_no_invalid_aria_prop_value_001() {
    assert_eq!(
        run(r#"<div aria-live="hoge"></div>"#, serde_json::json!(true)),
        vec![violation(
            1,
            6,
            "The \"hoge\" is disallowed on the \"aria-live\" ARIA property. Allowed values are: \"assertive\", \"off\", \"polite\"",
            "aria-live=\"hoge\""
        )]
    );
    // The values are listed in the spec's order, not sorted.
    assert_eq!(
        run(r#"<div aria-haspopup="hoge"></div>"#, serde_json::json!(true)),
        vec![violation(
            1,
            6,
            "The \"hoge\" is disallowed on the \"aria-haspopup\" ARIA property. Allowed values are: \"false\", \"true\", \"menu\", \"listbox\", \"tree\", \"grid\", \"dialog\"",
            "aria-haspopup=\"hoge\""
        )]
    );
}

#[test]
fn v6_no_invalid_aria_prop_value_002() {
    assert_eq!(
        run(r#"<div aria-relevant="hoge additions"></div>"#, serde_json::json!(true)),
        vec![violation(
            1,
            6,
            "The \"hoge additions\" is disallowed on the \"aria-relevant\" ARIA property. Allowed values are: \"additions\", \"additions text\", \"all\", \"removals\", \"text\"",
            "aria-relevant=\"hoge additions\""
        )]
    );
    // Runs of whitespace separate tokens.
    assert_eq!(
        run(
            r#"<div aria-relevant="additions  text" aria-pressed="x"></div>"#,
            serde_json::json!(true)
        ),
        vec![violation(
            1,
            38,
            "The \"x\" is disallowed on the \"aria-pressed\" ARIA state",
            "aria-pressed=\"x\""
        )]
    );
}

#[test]
fn v6_no_invalid_aria_prop_value_003() {
    assert_eq!(
        run(r#"<div aria-live="" aria-relevant=""></div>"#, serde_json::json!(true)),
        vec![
            violation(
                1,
                6,
                "The \"\" is disallowed on the \"aria-live\" ARIA property. Allowed values are: \"assertive\", \"off\", \"polite\"",
                "aria-live=\"\""
            ),
            violation(
                1,
                19,
                "The \"\" is disallowed on the \"aria-relevant\" ARIA property. Allowed values are: \"additions\", \"additions text\", \"all\", \"removals\", \"text\"",
                "aria-relevant=\"\""
            ),
        ]
    );
}

#[test]
fn v6_no_invalid_aria_prop_value_004() {
    // `aria-checked` is `tristate` on `checkbox` (explicit or implicit), `true/false` elsewhere.
    assert_eq!(
        run(
            r#"<div role="checkbox" aria-checked="mixed"></div>"#,
            serde_json::json!(true)
        ),
        vec![]
    );
    assert_eq!(
        run(
            r#"<input type="checkbox" aria-checked="mixed">"#,
            serde_json::json!(true)
        ),
        vec![]
    );
    assert_eq!(
        run(
            r#"<div role="radio" aria-checked="mixed"></div>"#,
            serde_json::json!(true)
        ),
        vec![violation(
            1,
            19,
            "The \"mixed\" is disallowed on the \"aria-checked\" ARIA state",
            "aria-checked=\"mixed\""
        )]
    );
}

#[test]
fn v6_no_invalid_aria_prop_value_005() {
    let html = "<div role=\"checkbox\" aria-checked=\"mixed\" aria-pressed=\"x\"></div>\n<p aria-level=\"a\" aria-label=\"\" aria-owns=\"\"></p>";
    assert_eq!(
        run(html, serde_json::json!(true)),
        vec![
            violation(
                1,
                43,
                "The \"x\" is disallowed on the \"aria-pressed\" ARIA state",
                "aria-pressed=\"x\""
            ),
            violation(
                2,
                4,
                "The \"a\" is disallowed on the \"aria-level\" ARIA property",
                "aria-level=\"a\""
            ),
        ]
    );
    // Unknown `aria-*` and upper-case names are not looked up.
    assert_eq!(
        run(r#"<div aria-foo="x" ARIA-LIVE="hoge"></div>"#, serde_json::json!(true)),
        vec![]
    );
}

#[test]
fn v6_no_invalid_aria_prop_value_006() {
    let arena = html_arena(r#"<div aria-pressed="hoge"></div>"#);
    let spec = spec();
    let props = &markuplint_types::spec::aria::get_aria_spec(&spec, ARIAVersion::V1_3).props;
    let (_, el) = arena.elements().next().unwrap();
    let mut attr = html_attrs(el).next().unwrap().clone();

    assert_eq!(
        invalid_value_message(&attr, props, None).as_deref(),
        Some("The \"hoge\" is disallowed on the \"aria-pressed\" ARIA state")
    );
    attr.is_dynamic_value = Some(true);
    assert_eq!(invalid_value_message(&attr, props, None), None);
}

#[test]
fn v6_no_invalid_aria_prop_value_007() {
    let html = r#"<div aria-live="hoge"></div>"#;
    assert_eq!(
        run(html, serde_json::json!({ "options": { "version": "1.1" } })),
        vec![violation(
            1,
            6,
            "The \"hoge\" is disallowed on the \"aria-live\" ARIA property. Allowed values are: \"assertive\", \"off\", \"polite\"",
            "aria-live=\"hoge\""
        )]
    );
    assert_eq!(run(html, serde_json::json!(false)), vec![]);
}

#[test]
fn v6_no_invalid_aria_prop_value_008() {
    assert_eq!(
        run(
            r#"<div aria-level="1e3" aria-valuenow="1e-7" aria-valuemin="0.0000001" aria-valuemax="+Infinity"></div>"#,
            serde_json::json!(true)
        ),
        vec![
            violation(
                1,
                6,
                "The \"1e3\" is disallowed on the \"aria-level\" ARIA property",
                "aria-level=\"1e3\""
            ),
            violation(
                1,
                44,
                "The \"0.0000001\" is disallowed on the \"aria-valuemin\" ARIA property",
                "aria-valuemin=\"0.0000001\""
            ),
            violation(
                1,
                70,
                "The \"+Infinity\" is disallowed on the \"aria-valuemax\" ARIA property",
                "aria-valuemax=\"+Infinity\""
            ),
        ]
    );
}

/// TS checks the value as written: a character reference is not decoded first, so `&#49;` is
/// not the integer 1 and `&#111;ff` is not the token `off`.
#[test]
fn v6_no_invalid_aria_prop_value_009() {
    assert_eq!(
        run(
            r#"<div role="heading" aria-level="&#49;"></div>"#,
            serde_json::json!(true)
        ),
        vec![violation(
            1,
            21,
            "The \"&#49;\" is disallowed on the \"aria-level\" ARIA property",
            "aria-level=\"&#49;\""
        )]
    );
    assert_eq!(
        run(r#"<div aria-live="&#111;ff"></div>"#, serde_json::json!(true)),
        vec![violation(
            1,
            6,
            "The \"&#111;ff\" is disallowed on the \"aria-live\" ARIA property. Allowed values are: \"assertive\", \"off\", \"polite\"",
            "aria-live=\"&#111;ff\""
        )]
    );
}

fn valid_values(value_type: &ARIAAttributeValue, enum_values: &[&str], candidates: &[&str]) -> Vec<String> {
    let enum_values: Vec<String> = enum_values.iter().map(ToString::to_string).collect();
    candidates
        .iter()
        .filter(|v| check_aria_value(value_type, v, &enum_values))
        .map(ToString::to_string)
        .collect()
}

#[test]
fn v6_check_aria_value_token() {
    let enums = ["inline", "list", "both", "none"];
    assert_eq!(
        valid_values(
            &ARIAAttributeValue::Token,
            &enums,
            &["list", "invalid", "", " list", "List"]
        ),
        vec!["list"]
    );
    assert_eq!(
        valid_values(&ARIAAttributeValue::Token, &["", "a"], &["", "a", " a"]),
        vec!["", "a"]
    );
}

#[test]
fn v6_check_aria_value_token_list() {
    let enums = ["ascending", "descending", "other"];
    assert_eq!(
        valid_values(
            &ARIAAttributeValue::TokenList,
            &enums,
            &[
                "ascending descending",
                "ascending invalid",
                "",
                " ascending",
                "ascending ",
                "ascending  descending",
                "ascending\tdescending",
                "ascending\u{a0}descending",
                "other",
            ]
        ),
        vec![
            "ascending descending",
            "ascending  descending",
            "ascending\tdescending",
            "ascending\u{a0}descending",
            "other",
        ]
    );
    // A leading or trailing run of whitespace yields an empty token, valid only when the enum has one.
    assert_eq!(
        valid_values(&ARIAAttributeValue::TokenList, &["", "a"], &["", "a", "a "]),
        vec!["", "a", "a "]
    );
}

#[test]
fn v6_check_aria_value_booleans() {
    let candidates = ["true", "false", "mixed", "undefined", "", "TRUE", " true", "yes"];
    assert_eq!(
        valid_values(&ARIAAttributeValue::TrueFalse, &[], &candidates),
        vec!["true", "false"]
    );
    assert_eq!(
        valid_values(&ARIAAttributeValue::Tristate, &[], &candidates),
        vec!["true", "false", "mixed", "undefined"]
    );
    assert_eq!(
        valid_values(&ARIAAttributeValue::TrueFalseUndefined, &[], &candidates),
        vec!["true", "false", "undefined"]
    );
}

#[test]
fn v6_check_aria_value_integer() {
    let candidates = [
        "42",
        "-1",
        "3.5",
        "abc",
        "",
        " 1",
        "1 ",
        "+1",
        "-0",
        "0",
        "1e3",
        "1.0",
        "NaN",
        "Infinity",
        "0x10",
        "9007199254740992",
        "9007199254740993",
        "100000000000000000000",
        "123456789012345680000",
        "1234567890123456789012",
        "00",
        "\n1",
    ];
    assert_eq!(
        valid_values(&ARIAAttributeValue::Integer, &[], &candidates),
        vec![
            "42",
            "-1",
            "0",
            "NaN",
            "9007199254740992",
            "100000000000000000000",
            "123456789012345680000"
        ]
    );
}

#[test]
fn v6_check_aria_value_number() {
    let candidates = [
        "42",
        "-1",
        "3.5",
        "abc",
        "",
        " 1",
        "1 ",
        "+1",
        "-0",
        "0",
        "1e3",
        "1e-7",
        "1e21",
        "1e+21",
        "1.0",
        "1.",
        ".5",
        "0.5",
        "-0.5",
        "NaN",
        "Infinity",
        "-Infinity",
        "+Infinity",
        "0x10",
        "9007199254740992",
        "9007199254740993",
        "100000000000000000000",
        "123456789012345680000",
        "1234567890123456789012",
        "0.000001",
        "0.0000001",
        "5px",
        "00",
        "0.1",
        "0.30000000000000004",
        "1e100",
        "12e-1",
        "\n1",
    ];
    assert_eq!(
        valid_values(&ARIAAttributeValue::Number, &[], &candidates),
        vec![
            "42",
            "-1",
            "3.5",
            "0",
            "1e-7",
            "1e+21",
            "0.5",
            "-0.5",
            "NaN",
            "Infinity",
            "-Infinity",
            "9007199254740992",
            "100000000000000000000",
            "123456789012345680000",
            "0.000001",
            "0.1",
            "0.30000000000000004",
        ]
    );
}

#[test]
fn v6_check_aria_value_free_form_types() {
    assert!(check_aria_value(&ARIAAttributeValue::StringValue, "anything", &[]));
    assert!(check_aria_value(&ARIAAttributeValue::IdReference, "", &[]));
    assert!(check_aria_value(&ARIAAttributeValue::IdReferenceList, "a b", &[]));
    assert!(check_aria_value(&ARIAAttributeValue::Uri, "x", &[]));
}

#[test]
fn v6_no_invalid_aria_prop_value_010() {
    for html in [
        r#"<input role="combobox" aria-autocomplete="list">"#,
        r#"<div role="button" aria-disabled="true"></div>"#,
        r#"<div role="heading" aria-level="2"></div>"#,
    ] {
        assert_eq!(run(html, serde_json::json!(true)), vec![], "{html}");
    }
}
