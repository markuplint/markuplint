//! Tests for `no-table-cell-overlap` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-table-cell-overlap-invalid-001  → no_table_cell_overlap_invalid_001
//!   no-table-cell-overlap-invalid-002  → no_table_cell_overlap_invalid_002
//!   no-table-cell-overlap-valid-001    → no_table_cell_overlap_valid_001
//!   no-table-cell-overlap-valid-002    → no_table_cell_overlap_valid_002 (was `empty_table_no_violation`)
//!   no-table-cell-overlap-valid-003    → no_table_cell_overlap_valid_003
//!   no-table-cell-overlap-valid-004    → no_table_cell_overlap_valid_004 (was `rowspan_valid`)
//!   no-table-cell-overlap-valid-005    → no_table_cell_overlap_valid_005
//!   v6_no_table_cell_overlap_001  — Rust-only: only the overlapping table of several is reported
//!   v6_no_table_cell_overlap_002  — Rust-only: severity override and `rules: false`

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

const RULE: &str = "no-table-cell-overlap";
const MESSAGE: &str = "\"rowspan\" and \"colspan\" are causing cell overlap";

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
    let config: LintConfig = serde_json::from_value(serde_json::json!({ "rules": { RULE: value } })).unwrap();
    lint(&html_arena(html), &spec(), &config).violations
}

fn run(html: &str) -> Vec<Violation> {
    run_rule(html, serde_json::json!(true))
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

/// TS: `[no-table-cell-overlap-invalid-001]`
#[test]
fn no_table_cell_overlap_invalid_001() {
    const _ID: &str = "no-table-cell-overlap-invalid-001";
    let violations = run(r#"
<table>
  <tr>
    <td></td>
    <td></td>
    <td rowspan="5"></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td colspan="5"></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
</table>
"#);
    assert_violations(&violations, &[(Severity::Error, 2, 1, MESSAGE, "<table>")]);
}

/// TS: `[no-table-cell-overlap-invalid-002]`
#[test]
fn no_table_cell_overlap_invalid_002() {
    const _ID: &str = "no-table-cell-overlap-invalid-002";
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
    assert_violations(&violations, &[(Severity::Error, 2, 1, MESSAGE, "<table>")]);
}

/// TS: `[no-table-cell-overlap-valid-001]`
#[test]
fn no_table_cell_overlap_valid_001() {
    const _ID: &str = "no-table-cell-overlap-valid-001";
    let violations = run(r#"
<table aria-label="テーブルのテストです">
  <tr>
      <th rowspan="2">縦2行分</th>
      <th colspan="2">横2列分</th>
  </tr>
  <tr>
      <th>1</th>
      <th>2</th>
  </tr>
</table>
"#);
    assert_violations(&violations, &[]);
}

/// TS: `[no-table-cell-overlap-valid-002]`
#[test]
fn no_table_cell_overlap_valid_002() {
    const _ID: &str = "no-table-cell-overlap-valid-002";
    let violations = run("
<table>
</table>
");
    assert_violations(&violations, &[]);
}

/// TS: `[no-table-cell-overlap-valid-003]`
#[test]
fn no_table_cell_overlap_valid_003() {
    const _ID: &str = "no-table-cell-overlap-valid-003";
    let violations = run(r#"
<table>
  <tr>
    <td rowspan="2">A</td>
    <td colspan="2">B</td>
    <td rowspan="3">C</td>
  </tr>
  <tr>
    <td>D</td>
    <td>E</td>
  </tr>
  <tr>
    <td colspan="3">F</td>
  </tr>
</table>
"#);
    assert_violations(&violations, &[]);
}

/// TS: `[no-table-cell-overlap-valid-004]`
#[test]
fn no_table_cell_overlap_valid_004() {
    const _ID: &str = "no-table-cell-overlap-valid-004";
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

/// TS: `[no-table-cell-overlap-valid-005]`
#[test]
fn no_table_cell_overlap_valid_005() {
    const _ID: &str = "no-table-cell-overlap-valid-005";
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

#[test]
fn v6_no_table_cell_overlap_001() {
    let violations = run(
        "<table><tr><td></td></tr></table>\n<table><tr><td></td><td rowspan=\"2\"></td></tr><tr><td colspan=\"2\"></td></tr></table>",
    );
    assert_violations(&violations, &[(Severity::Error, 2, 1, MESSAGE, "<table>")]);
}

#[test]
fn v6_no_table_cell_overlap_002() {
    let html = "<table><tr><td></td><td rowspan=\"2\"></td></tr><tr><td colspan=\"2\"></td></tr></table>";
    assert_violations(
        &run_rule(html, serde_json::json!({ "severity": "warning" })),
        &[(Severity::Warning, 1, 1, MESSAGE, "<table>")],
    );
    assert_violations(&run_rule(html, serde_json::json!(false)), &[]);
}
