//! Tests for `tab-requires-tabpanel` rule.
//!
//! Test ID mapping (TS → Rust):
//!   tab-requires-tabpanel-valid-001    → tab_requires_tabpanel_valid_001
//!   tab-requires-tabpanel-valid-002    → tab_requires_tabpanel_valid_002
//!   tab-requires-tabpanel-valid-003    → tab_requires_tabpanel_valid_003
//!   tab-requires-tabpanel-valid-004    → tab_requires_tabpanel_valid_004
//!   tab-requires-tabpanel-valid-005    → tab_requires_tabpanel_valid_005
//!   tab-requires-tabpanel-invalid-001  → tab_requires_tabpanel_invalid_001
//!   tab-requires-tabpanel-invalid-002  → tab_requires_tabpanel_invalid_002
//!   tab-requires-tabpanel-invalid-003  → tab_requires_tabpanel_invalid_003
//!   v6_tab_requires_tabpanel_001  — Rust-only: `aria-selected` must be exactly `true`
//!   v6_tab_requires_tabpanel_002  — Rust-only: `aria-controls` is an ID list, resolved to the first element of each ID
//!   v6_tab_requires_tabpanel_003  — Rust-only: an `aria-labelledby` back-reference counts only from a tabpanel
//!   v6_tab_requires_tabpanel_004  — Rust-only: the computed role decides (a tab outside a tablist has none)
//!   v6_tab_requires_tabpanel_005  — Rust-only: severity and `rules: false`

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
    let config: LintConfig =
        serde_json::from_value(serde_json::json!({ "rules": { "tab-requires-tabpanel": value } })).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// `(severity, line, col, message, raw)`, the fields the TS specs assert.
type Expected<'a> = (Severity, u32, u32, &'a str, &'a str);

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (severity, line, col, message, raw)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, "tab-requires-tabpanel");
        assert_eq!(violation.severity, *severity);
        assert_eq!(violation.line, *line);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, *message);
        assert_eq!(violation.raw, *raw);
    }
}

const MESSAGE: &str = "An active \"tab\" role requires a corresponding \"tabpanel\" role";

/// TS: `[tab-requires-tabpanel-valid-001]`
#[test]
fn tab_requires_tabpanel_valid_001() {
    const _ID: &str = "tab-requires-tabpanel-valid-001";
    let violations = run_rule(
        r#"<div role="tablist"><button role="tab" aria-selected="true" aria-controls="panel">Tab</button></div><div id="panel" role="tabpanel">Content</div>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[tab-requires-tabpanel-valid-002]`
#[test]
fn tab_requires_tabpanel_valid_002() {
    const _ID: &str = "tab-requires-tabpanel-valid-002";
    let violations = run_rule(
        r#"<div role="tablist"><button id="tab1" role="tab" aria-selected="true">Tab</button></div><div role="tabpanel" aria-labelledby="tab1">Content</div>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[tab-requires-tabpanel-valid-003]`
#[test]
fn tab_requires_tabpanel_valid_003() {
    const _ID: &str = "tab-requires-tabpanel-valid-003";
    let violations = run_rule(
        r#"<div role="tablist"><button role="tab" aria-selected="false">Tab</button></div>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[tab-requires-tabpanel-valid-004]`
#[test]
fn tab_requires_tabpanel_valid_004() {
    const _ID: &str = "tab-requires-tabpanel-valid-004";
    let violations = run_rule(
        r#"<div role="tablist"><button role="tab">Tab</button></div>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[tab-requires-tabpanel-valid-005]`
#[test]
fn tab_requires_tabpanel_valid_005() {
    const _ID: &str = "tab-requires-tabpanel-valid-005";
    let violations = run_rule(
        r#"<button aria-selected="true">Not a tab</button>"#,
        serde_json::json!(true),
    );
    assert_violations(&violations, &[]);
}

/// TS: `[tab-requires-tabpanel-invalid-001]`
#[test]
fn tab_requires_tabpanel_invalid_001() {
    const _ID: &str = "tab-requires-tabpanel-invalid-001";
    let violations = run_rule(
        "<div role=\"tablist\">\n  <button role=\"tab\" aria-selected=\"false\">foo</button>\n  <button role=\"tab\" aria-selected=\"true\">bar</button>\n</div>",
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            3,
            3,
            MESSAGE,
            "<button role=\"tab\" aria-selected=\"true\">",
        )],
    );
}

/// TS: `[tab-requires-tabpanel-invalid-002]`
#[test]
fn tab_requires_tabpanel_invalid_002() {
    const _ID: &str = "tab-requires-tabpanel-invalid-002";
    let violations = run_rule(
        r#"<div role="tablist"><button role="tab" aria-selected="true" aria-controls="notpanel">Tab</button></div><div id="notpanel">Not a panel</div>"#,
        serde_json::json!(true),
    );
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            1,
            21,
            MESSAGE,
            "<button role=\"tab\" aria-selected=\"true\" aria-controls=\"notpanel\">",
        )],
    );
}

/// TS: `[tab-requires-tabpanel-invalid-003]`
#[test]
fn tab_requires_tabpanel_invalid_003() {
    const _ID: &str = "tab-requires-tabpanel-invalid-003";
    let violations = run_rule(
        r#"<div role="tablist"><button id="tab1" role="tab" aria-selected="true">Tab</button></div><div role="tabpanel" aria-labelledby="othertab">Content</div>"#,
        serde_json::json!(true),
    );
    assert_eq!(violations.len(), 1, "violations: {violations:?}");
    assert_eq!(violations[0].message, MESSAGE);
}

#[test]
fn v6_tab_requires_tabpanel_001() {
    assert_violations(
        &run_rule(
            r#"<div role="tablist"><button role="tab" aria-selected="TRUE">Tab</button></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

#[test]
fn v6_tab_requires_tabpanel_002() {
    assert_violations(
        &run_rule(
            r#"<div role="tablist"><button role="tab" aria-selected="true" aria-controls="a  panel ">Tab</button></div><div id="panel" role="tabpanel">Content</div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
    assert_violations(
        &run_rule(
            r#"<div role="tablist"><button role="tab" aria-selected="true" aria-controls="missing">Tab</button></div>"#,
            serde_json::json!(true),
        ),
        &[(
            Severity::Error,
            1,
            21,
            MESSAGE,
            "<button role=\"tab\" aria-selected=\"true\" aria-controls=\"missing\">",
        )],
    );
    assert_violations(
        &run_rule(
            r#"<div role="tablist"><button role="tab" aria-selected="true" aria-controls="p">Tab</button></div><div id="p" role="tabpanel"></div><div id="p"></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
    // Only the first element with the ID is looked at.
    assert_violations(
        &run_rule(
            r#"<div role="tablist"><button role="tab" aria-selected="true" aria-controls="p">Tab</button></div><div id="p"></div><div id="p" role="tabpanel"></div>"#,
            serde_json::json!(true),
        ),
        &[(
            Severity::Error,
            1,
            21,
            MESSAGE,
            "<button role=\"tab\" aria-selected=\"true\" aria-controls=\"p\">",
        )],
    );
}

#[test]
fn v6_tab_requires_tabpanel_003() {
    assert_violations(
        &run_rule(
            r#"<div role="tablist"><button id="t1" role="tab" aria-selected="true">Tab</button></div><section role="tabpanel" aria-labelledby="x t1">Content</section>"#,
            serde_json::json!(true),
        ),
        &[],
    );
    assert_violations(
        &run_rule(
            r#"<div role="tablist"><button id="t1" role="tab" aria-selected="true">Tab</button></div><div aria-labelledby="x t1">Content</div>"#,
            serde_json::json!(true),
        ),
        &[(
            Severity::Error,
            1,
            21,
            MESSAGE,
            "<button id=\"t1\" role=\"tab\" aria-selected=\"true\">",
        )],
    );
}

#[test]
fn v6_tab_requires_tabpanel_004() {
    // A fragment root keeps its role even without the required `tablist` parent.
    assert_violations(
        &run_rule(
            r#"<button role="tab" aria-selected="true">Tab</button>"#,
            serde_json::json!(true),
        ),
        &[(
            Severity::Error,
            1,
            1,
            MESSAGE,
            "<button role=\"tab\" aria-selected=\"true\">",
        )],
    );
    // Under a `<div>` the context is missing, so the element has no role.
    assert_violations(
        &run_rule(
            r#"<div><button role="tab" aria-selected="true">Tab</button></div>"#,
            serde_json::json!(true),
        ),
        &[],
    );
}

#[test]
fn v6_tab_requires_tabpanel_005() {
    let html = r#"<div role="tablist"><button role="tab" aria-selected="true">Tab</button></div>"#;
    assert_violations(
        &run_rule(html, serde_json::json!({ "severity": "warning" })),
        &[(
            Severity::Warning,
            1,
            21,
            MESSAGE,
            "<button role=\"tab\" aria-selected=\"true\">",
        )],
    );
    assert_violations(&run_rule(html, serde_json::json!(false)), &[]);
}
