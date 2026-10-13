//! Tests for `no-table-span-overflow` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-table-span-overflow-invalid-001  → no_table_span_overflow_invalid_001 (was `rowspan_overflow_in_thead_section`)
//!   no-table-span-overflow-invalid-002  → no_table_span_overflow_invalid_002
//!   no-table-span-overflow-valid-001    → no_table_span_overflow_valid_001 (was `empty_table_no_violation`)
//!   no-table-span-overflow-valid-002    → no_table_span_overflow_valid_002
//!   no-table-span-overflow-valid-003    → no_table_span_overflow_valid_003 (was `rowspan_valid`)
//!   no-table-span-overflow-valid-004    → no_table_span_overflow_valid_004
//!   no-table-span-overflow-valid-005    → no_table_span_overflow_valid_005
//!   v6_no_table_span_overflow_001  — Rust-only: `rowspan="0"` grows to the end of its group and never overflows
//!   v6_no_table_span_overflow_002  — Rust-only: each of `<thead>` / `<tbody>` / `<tfoot>` is its own row group
//!   v6_no_table_span_overflow_003  — Rust-only: an overflow in a table with an overlap is not reported

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

const RULE: &str = "no-table-span-overflow";
const MESSAGE: &str = "Exceeds the number of available rows";

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

fn run(html: &str) -> Vec<Violation> {
    let config: LintConfig = serde_json::from_value(serde_json::json!({ "rules": { RULE: true } })).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

/// `(severity, line, col, message, raw)`, the fields the TS specs assert.
type Expected<'a> = (Severity, u32, u32, &'a str, &'a str);

fn assert_violations(actual: &[Violation], expected: &[Expected<'_>]) {
    assert_eq!(actual.len(), expected.len(), "violations: {actual:?}");
    for (violation, (severity, line, col, message, raw)) in actual.iter().zip(expected) {
        assert_eq!(violation.rule_id, RULE);
        assert_eq!(violation.severity, *severity);
        assert_eq!(violation.line, *line);
        assert_eq!(violation.col, *col);
        assert_eq!(violation.message, *message);
        assert_eq!(violation.raw, *raw);
    }
}

/// TS: `[no-table-span-overflow-invalid-001]`
#[test]
fn no_table_span_overflow_invalid_001() {
    const _ID: &str = "no-table-span-overflow-invalid-001";
    let violations = run(r#"
<table>
  <thead class="overflow">
    <tr>
      <th rowspan="3"></th>
      <th></th>
      <th></th>
    </tr>
  </thead>
  <tr>
    <td></td>
    <td colspan="8"></td>
  </tr>
  <tr class="missing1">
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td class="extra1"></td>
    <td class="extra2"></td>
  </tr>
</table>
"#);
    assert_violations(&violations, &[(Severity::Error, 5, 11, MESSAGE, "rowspan=\"3\"")]);
}

/// TS: `[no-table-span-overflow-invalid-002]`
#[test]
fn no_table_span_overflow_invalid_002() {
    const _ID: &str = "no-table-span-overflow-invalid-002";
    let violations = run(r#"
<table>
  <tbody>
    <tr><td rowspan="3">Spanning cell</td></tr>
    <tr><td>Cell</td></tr>
  </tbody>
</table>
"#);
    assert_violations(&violations, &[(Severity::Error, 4, 13, MESSAGE, "rowspan=\"3\"")]);
}

/// TS: `[no-table-span-overflow-valid-001]`
#[test]
fn no_table_span_overflow_valid_001() {
    const _ID: &str = "no-table-span-overflow-valid-001";
    let violations = run("
<table>
</table>
");
    assert_violations(&violations, &[]);
}

/// TS: `[no-table-span-overflow-valid-002]`
#[test]
fn no_table_span_overflow_valid_002() {
    const _ID: &str = "no-table-span-overflow-valid-002";
    let violations = run(r"
<table>
  <thead>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
      <th>Header 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data 1</td>
      <td>Data 2</td>
      <td>Data 3</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td>Footer 1</td>
      <td>Footer 2</td>
      <td>Footer 3</td>
    </tr>
  </tfoot>
</table>
");
    assert_violations(&violations, &[]);
}

/// TS: `[no-table-span-overflow-valid-003]`
#[test]
fn no_table_span_overflow_valid_003() {
    const _ID: &str = "no-table-span-overflow-valid-003";
    let violations = run(r#"
<table>
  <tr>
    <td rowspan="2">A</td>
    <td>B</td>
    <td>C</td>
  </tr>
  <tr>
    <td>D</td>
    <td>E</td>
  </tr>
</table>
"#);
    assert_violations(&violations, &[]);
}

/// TS: `[no-table-span-overflow-valid-004]`
#[test]
fn no_table_span_overflow_valid_004() {
    const _ID: &str = "no-table-span-overflow-valid-004";
    let violations = run(r#"
<table>
  <thead>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
      <th>Header 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2">Data A</td>
      <td colspan="2">Data B</td>
    </tr>
    <tr>
      <td>Data C</td>
      <td>Data D</td>
    </tr>
  </tbody>
</table>
"#);
    assert_violations(&violations, &[]);
}

/// TS: `[no-table-span-overflow-valid-005]`
#[test]
fn no_table_span_overflow_valid_005() {
    const _ID: &str = "no-table-span-overflow-valid-005";
    let violations = run(r#"
<table>
<tr>
  <td></td>
  <td rowspan="3"></td>
  <td rowspan="3">cell1</td>
</tr>
<tr>
  <td colspan="2"></td>
  <td rowspan="2">cell0</td>
</tr>
</table>
"#);
    assert_violations(&violations, &[]);
}

#[test]
fn v6_no_table_span_overflow_001() {
    let violations = run("<table>\n<tr><td rowspan=\"0\"></td><td></td></tr>\n<tr><td></td></tr>\n</table>");
    assert_violations(&violations, &[]);
}

#[test]
fn v6_no_table_span_overflow_002() {
    let violations = run(
        "<table>\n<thead><tr><th rowspan=\"2\"></th><th></th></tr><tr><th></th></tr></thead>\n<tbody><tr><td></td><td rowspan=\"2\"></td></tr></tbody>\n<tfoot><tr><td rowspan=\"3\"></td><td></td></tr></tfoot>\n</table>",
    );
    assert_violations(
        &violations,
        &[
            (Severity::Error, 3, 25, MESSAGE, "rowspan=\"2\""),
            (Severity::Error, 4, 16, MESSAGE, "rowspan=\"3\""),
        ],
    );
}

#[test]
fn v6_no_table_span_overflow_003() {
    let violations = run(
        "<table><tr><td></td><td rowspan=\"2\"></td></tr><tr><td colspan=\"2\"></td></tr><tr><td rowspan=\"5\"></td></tr></table>",
    );
    assert_violations(&violations, &[]);
}
