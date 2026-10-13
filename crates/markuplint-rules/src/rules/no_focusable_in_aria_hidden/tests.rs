//! Tests for `no-focusable-in-aria-hidden` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-focusable-in-aria-hidden-valid-001    → no_focusable_in_aria_hidden_valid_001
//!   no-focusable-in-aria-hidden-valid-002    → no_focusable_in_aria_hidden_valid_002
//!   no-focusable-in-aria-hidden-invalid-001  → no_focusable_in_aria_hidden_invalid_001
//!   v6_no_focusable_in_aria_hidden_001  — Rust-only: the two messages, position and scope
//!   v6_no_focusable_in_aria_hidden_002  — Rust-only: what counts as focusable
//!   v6_no_focusable_in_aria_hidden_003  — Rust-only: the `aria-hidden` name and value are matched exactly
//!   v6_no_focusable_in_aria_hidden_004  — Rust-only: an inner `aria-hidden="false"` does not stop the walk
//!   v6_no_focusable_in_aria_hidden_005  — Rust-only: severity, multi-line position and `rules: false`

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

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

fn run_rule(html: &str, value: serde_json::Value) -> Vec<Violation> {
    let config: LintConfig = serde_json::from_value(serde_json::json!({
        "rules": { "no-focusable-in-aria-hidden": value }
    }))
    .unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// `(severity, line, col, message, raw)`, the fields the TS specs assert.
type Expected<'a> = (Severity, u32, u32, &'a str, &'a str);

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (severity, line, col, message, raw)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, "no-focusable-in-aria-hidden");
        assert_eq!(violation.severity, *severity);
        assert_eq!(violation.line, *line);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, *message);
        assert_eq!(violation.raw, *raw);
    }
}

const SELF_MESSAGE: &str = "It may be focusable in spite of it has aria-hidden=true";
const ANCESTOR_MESSAGE: &str = "It may be focusable in spite of it has the ancestor that has aria-hidden=true";

/// TS: `[no-focusable-in-aria-hidden-valid-001]`
#[test]
fn no_focusable_in_aria_hidden_valid_001() {
    const _ID: &str = "no-focusable-in-aria-hidden-valid-001";
    assert_violations(&run_rule("<button>click</button>", serde_json::json!(true)), &[]);
}

/// TS: `[no-focusable-in-aria-hidden-valid-002]`
#[test]
fn no_focusable_in_aria_hidden_valid_002() {
    const _ID: &str = "no-focusable-in-aria-hidden-valid-002";
    assert_violations(
        &run_rule(
            r#"<div aria-hidden="true"><span>text</span></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

/// TS: `[no-focusable-in-aria-hidden-invalid-001]`
#[test]
fn no_focusable_in_aria_hidden_invalid_001() {
    const _ID: &str = "no-focusable-in-aria-hidden-invalid-001";
    let violations = run_rule(
        r#"<div aria-hidden="true"><button>click</button></div>"#,
        serde_json::json!(true),
    );
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
    assert_eq!(violations[0].severity, Severity::Warning);
}

#[test]
fn v6_no_focusable_in_aria_hidden_001() {
    assert_violations(
        &run_rule(
            r#"<div aria-hidden="true"><button>click</button></div>"#,
            serde_json::json!(true),
        ),
        &[(Severity::Warning, 1, 25, ANCESTOR_MESSAGE, "<button>")],
    );
    assert_violations(
        &run_rule(r#"<button aria-hidden="true">x</button>"#, serde_json::json!(true)),
        &[(Severity::Warning, 1, 1, SELF_MESSAGE, r#"<button aria-hidden="true">"#)],
    );
    // The element's own `aria-hidden` wins over an ancestor's.
    assert_violations(
        &run_rule(
            r#"<div aria-hidden="true"><button aria-hidden="true"></button></div>"#,
            serde_json::json!(true),
        ),
        &[(Severity::Warning, 1, 25, SELF_MESSAGE, r#"<button aria-hidden="true">"#)],
    );
}

#[test]
fn v6_no_focusable_in_aria_hidden_002() {
    assert_violations(
        &run_rule(
            r##"<div aria-hidden="true"><a href="#">x</a><input><span tabindex="0"></span></div>"##,
            serde_json::json!(true),
        ),
        &[
            (Severity::Warning, 1, 25, ANCESTOR_MESSAGE, r##"<a href="#">"##),
            (Severity::Warning, 1, 42, ANCESTOR_MESSAGE, "<input>"),
            (Severity::Warning, 1, 49, ANCESTOR_MESSAGE, r#"<span tabindex="0">"#),
        ],
    );
    // A static heuristic: `disabled` and a negative `tabindex` do not exempt an element.
    assert_violations(
        &run_rule(
            r#"<div aria-hidden="true"><button disabled></button></div>"#,
            serde_json::json!(true),
        ),
        &[(Severity::Warning, 1, 25, ANCESTOR_MESSAGE, "<button disabled>")],
    );
    assert_violations(
        &run_rule(
            r#"<div aria-hidden="true"><span tabindex="-1"></span></div>"#,
            serde_json::json!(true),
        ),
        &[(Severity::Warning, 1, 25, ANCESTOR_MESSAGE, r#"<span tabindex="-1">"#)],
    );
    assert_violations(
        &run_rule(
            r#"<div aria-hidden="true"><div contenteditable></div></div>"#,
            serde_json::json!(true),
        ),
        &[(Severity::Warning, 1, 25, ANCESTOR_MESSAGE, "<div contenteditable>")],
    );
    // Not interactive content.
    assert_violations(
        &run_rule(
            r#"<div aria-hidden="true"><input type="hidden"></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
    assert_violations(
        &run_rule(r#"<div aria-hidden="true"><a>x</a></div>"#, serde_json::json!(true)),
        &[],
    );
    // An element without a spec is not looked at.
    assert_violations(
        &run_rule(
            r#"<div aria-hidden="true"><x-foo tabindex="0"></x-foo></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

#[test]
fn v6_no_focusable_in_aria_hidden_003() {
    for html in [
        r#"<div aria-hidden="false"><button></button></div>"#,
        r#"<div aria-hidden="TRUE"><button></button></div>"#,
        r#"<div aria-hidden=" true"><button></button></div>"#,
        r#"<div ARIA-HIDDEN="true"><button></button></div>"#,
    ] {
        assert_violations(&run_rule(html, serde_json::json!(true)), &[]);
    }
}

#[test]
fn v6_no_focusable_in_aria_hidden_004() {
    assert_violations(
        &run_rule(
            r#"<div aria-hidden="true"><div aria-hidden="false"><button></button></div></div>"#,
            serde_json::json!(true),
        ),
        &[(Severity::Warning, 1, 50, ANCESTOR_MESSAGE, "<button>")],
    );
}

#[test]
fn v6_no_focusable_in_aria_hidden_005() {
    assert_violations(
        &run_rule(
            r#"<div aria-hidden="true"><button>click</button></div>"#,
            serde_json::json!({ "severity": "error" }),
        ),
        &[(Severity::Error, 1, 25, ANCESTOR_MESSAGE, "<button>")],
    );
    assert_violations(
        &run_rule(
            "<div aria-hidden=\"true\">\n  <p>\n    <button\n      type=\"button\">x</button>\n  </p>\n</div>",
            serde_json::json!(true),
        ),
        &[(
            Severity::Warning,
            3,
            5,
            ANCESTOR_MESSAGE,
            "<button\n      type=\"button\">",
        )],
    );
    assert_violations(
        &run_rule(
            r#"<div aria-hidden="true"><button>click</button></div>"#,
            serde_json::json!(false),
        ),
        &[],
    );
}
