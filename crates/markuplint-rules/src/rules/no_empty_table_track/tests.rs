//! Tests for `no-empty-table-track` rule.
//!
//! Test ID mapping (TS → Rust):
//!   no-empty-table-track-invalid-001  → no_empty_table_track_invalid_001
//!   no-empty-table-track-invalid-002  → no_empty_table_track_invalid_002
//!   no-empty-table-track-invalid-003  → no_empty_table_track_invalid_003
//!   no-empty-table-track-invalid-004  → no_empty_table_track_invalid_004
//!   no-empty-table-track-invalid-005  → no_empty_table_track_invalid_005
//!   no-empty-table-track-invalid-006  → no_empty_table_track_invalid_006
//!   no-empty-table-track-invalid-007  → no_empty_table_track_invalid_007
//!   no-empty-table-track-valid-001    → no_empty_table_track_valid_001 (was `empty_table_no_violation`)
//!   no-empty-table-track-valid-002    → no_empty_table_track_valid_002
//!   no-empty-table-track-valid-003    → no_empty_table_track_valid_003
//!   no-empty-table-track-valid-004    → no_empty_table_track_valid_004 (was `colspan_correct_count`)
//!   no-empty-table-track-valid-005    → no_empty_table_track_valid_005
//!   no-empty-table-track-valid-006    → no_empty_table_track_valid_006
//!   no-empty-table-track-valid-007    → no_empty_table_track_valid_007
//!   v6_no_empty_table_track_001  — Rust-only: a `<colgroup span>` without `<col>` children is the column source
//!   v6_no_empty_table_track_002  — Rust-only: each `<col>` is its own column source, `span` included
//!   v6_no_empty_table_track_003  — Rust-only: every row without an anchored cell is reported
//!   v6_no_empty_table_track_004  — Rust-only: an unparsable `colspan` falls back to 1, a trailing suffix is ignored

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

const RULE: &str = "no-empty-table-track";
const ONE_COLUMN: &str = "One column has no cells beginning in it";
const FOUR_COLUMNS: &str = "Four columns have no cells beginning in them";
const ONE_ROW: &str = "One row has no cells beginning in it";

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

/// TS: `[no-empty-table-track-invalid-001]`
#[test]
fn no_empty_table_track_invalid_001() {
    const _ID: &str = "no-empty-table-track-invalid-001";
    let violations = run(r#"
<table>
  <tr>
    <th></th>
    <th colspan="3"></th>
    <th></th>
  </tr>
  <tr class="missing">
    <td></td>
  </tr>
</table>
"#);
    assert_violations(
        &violations,
        &[(
            Severity::Error,
            5,
            9,
            "Two columns have no cells beginning in them",
            "colspan=\"3\"",
        )],
    );
}

/// TS: `[no-empty-table-track-invalid-002]`
#[test]
fn no_empty_table_track_invalid_002() {
    const _ID: &str = "no-empty-table-track-invalid-002";
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
    assert_violations(&violations, &[(Severity::Error, 12, 9, FOUR_COLUMNS, "colspan=\"8\"")]);
}

/// TS: `[no-empty-table-track-invalid-003]`
#[test]
fn no_empty_table_track_invalid_003() {
    const _ID: &str = "no-empty-table-track-invalid-003";
    let violations = run(r#"
<table>
  <tr>
    <td rowspan="2">Cell 1</td>
    <td>Cell 2</td>
  </tr>
  <tr>
    <td colspan="2">Overlapping cell</td>
  </tr>
</table>
"#);
    assert_violations(&violations, &[(Severity::Error, 8, 9, ONE_COLUMN, "colspan=\"2\"")]);
}

/// TS: `[no-empty-table-track-invalid-004]`
#[test]
fn no_empty_table_track_invalid_004() {
    const _ID: &str = "no-empty-table-track-invalid-004";
    let violations = run(r#"
<table>
  <tr>
    <td>A</td>
    <td colspan="5">B</td>
  </tr>
</table>
"#);
    assert_violations(&violations, &[(Severity::Error, 5, 9, FOUR_COLUMNS, "colspan=\"5\"")]);
}

/// TS: `[no-empty-table-track-invalid-005]`
#[test]
fn no_empty_table_track_invalid_005() {
    const _ID: &str = "no-empty-table-track-invalid-005";
    let violations = run(r"
<table>
  <colgroup>
    <col><col><col>
  </colgroup>
  <tr><td>Cell 1</td><td>Cell 2</td></tr>
</table>
");
    assert_violations(&violations, &[(Severity::Error, 4, 15, ONE_COLUMN, "<col>")]);
}

/// TS: `[no-empty-table-track-invalid-006]`
#[test]
fn no_empty_table_track_invalid_006() {
    const _ID: &str = "no-empty-table-track-invalid-006";
    let violations = run(r"
<table>
  <tr><td>Cell</td></tr>
  <tr></tr>
</table>
");
    assert_violations(&violations, &[(Severity::Error, 4, 3, ONE_ROW, "<tr>")]);
}

/// TS: `[no-empty-table-track-invalid-007]`
#[test]
fn no_empty_table_track_invalid_007() {
    const _ID: &str = "no-empty-table-track-invalid-007";
    let violations = run(r#"
<table>
  <tr>
    <td colspan="5">Wide cell</td>
  </tr>
</table>
"#);
    assert_violations(&violations, &[(Severity::Error, 4, 9, FOUR_COLUMNS, "colspan=\"5\"")]);
}

/// TS: `[no-empty-table-track-valid-001]`
#[test]
fn no_empty_table_track_valid_001() {
    const _ID: &str = "no-empty-table-track-valid-001";
    let violations = run("
<table>
</table>
");
    assert_violations(&violations, &[]);
}

/// TS: `[no-empty-table-track-valid-002]`
#[test]
fn no_empty_table_track_valid_002() {
    const _ID: &str = "no-empty-table-track-valid-002";
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

/// TS: `[no-empty-table-track-valid-003]`
#[test]
fn no_empty_table_track_valid_003() {
    const _ID: &str = "no-empty-table-track-valid-003";
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

/// TS: `[no-empty-table-track-valid-004]`
#[test]
fn no_empty_table_track_valid_004() {
    const _ID: &str = "no-empty-table-track-valid-004";
    let violations = run(r#"
<table>
  <tr>
    <td colspan="3">Header</td>
  </tr>
  <tr>
    <td>A</td>
    <td>B</td>
    <td>C</td>
  </tr>
</table>
"#);
    assert_violations(&violations, &[]);
}

/// TS: `[no-empty-table-track-valid-005]`
#[test]
fn no_empty_table_track_valid_005() {
    const _ID: &str = "no-empty-table-track-valid-005";
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

/// TS: `[no-empty-table-track-valid-006]`
#[test]
fn no_empty_table_track_valid_006() {
    const _ID: &str = "no-empty-table-track-valid-006";
    let violations = run(r"
<table>
  <colgroup>
    <col><col>
  </colgroup>
  <tr><td>Cell 1</td><td>Cell 2</td><td>Cell 3</td></tr>
</table>
");
    assert_violations(&violations, &[]);
}

/// TS: `[no-empty-table-track-valid-007]`
#[test]
fn no_empty_table_track_valid_007() {
    const _ID: &str = "no-empty-table-track-valid-007";
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
fn v6_no_empty_table_track_001() {
    let violations = run("<table>\n<colgroup span=\"3\"></colgroup>\n<tr><td></td><td></td></tr>\n</table>");
    assert_violations(
        &violations,
        &[(Severity::Error, 2, 1, ONE_COLUMN, "<colgroup span=\"3\">")],
    );
}

#[test]
fn v6_no_empty_table_track_002() {
    let violations = run("<table>\n<colgroup><col span=\"2\"><col></colgroup>\n<tr><td></td></tr>\n</table>");
    assert_violations(
        &violations,
        &[
            (Severity::Error, 2, 11, ONE_COLUMN, "<col span=\"2\">"),
            (Severity::Error, 2, 25, ONE_COLUMN, "<col>"),
        ],
    );
}

#[test]
fn v6_no_empty_table_track_003() {
    let violations = run("<table>\n<tr><td></td></tr>\n<tr></tr>\n<tr></tr>\n</table>");
    assert_violations(
        &violations,
        &[
            (Severity::Error, 3, 1, ONE_ROW, "<tr>"),
            (Severity::Error, 4, 1, ONE_ROW, "<tr>"),
        ],
    );
}

#[test]
fn v6_no_empty_table_track_004() {
    let violations = run("<table>\n<tr><td colspan=\"abc\"></td><td colspan=\" 2x\"></td></tr>\n</table>");
    assert_violations(&violations, &[(Severity::Error, 2, 32, ONE_COLUMN, "colspan=\" 2x\"")]);
}
