//! Tests for `consistent-table-row-length` rule.
//!
//! Test ID mapping (TS → Rust):
//!   consistent-table-row-length-003  → consistent_table_row_length_003 (was `extra_columns_in_row`, `find_unexpected_cell_reports_at_td_position`)
//!   consistent-table-row-length-004  → consistent_table_row_length_004
//!   consistent-table-row-length-005  → consistent_table_row_length_005 (was `mismatched_column_count`)
//!   consistent-table-row-length-006  → consistent_table_row_length_006
//!   consistent-table-row-length-007  → consistent_table_row_length_007
//!   consistent-table-row-length-008  → consistent_table_row_length_008
//!   consistent-table-row-length-009  → consistent_table_row_length_009
//!   consistent-table-row-length-010  → consistent_table_row_length_010
//!   consistent-table-row-length-013  → consistent_table_row_length_013 (was `table_with_thead_tbody`, `thead_defines_base_column_count_over_tbody`)
//!   consistent-table-row-length-021  → consistent_table_row_length_021
//!   consistent-table-row-length-024  → consistent_table_row_length_024
//!   consistent-table-row-length-025  → consistent_table_row_length_025
//!   consistent-table-row-length-011    → consistent_table_row_length_011 (was `empty_table_no_violation`)
//!   consistent-table-row-length-012    → consistent_table_row_length_012
//!   consistent-table-row-length-014    → consistent_table_row_length_014
//!   consistent-table-row-length-015    → consistent_table_row_length_015 (was `colspan_correct_count`)
//!   consistent-table-row-length-016    → consistent_table_row_length_016 (was `rowspan_valid`)
//!   consistent-table-row-length-017    → consistent_table_row_length_017
//!   consistent-table-row-length-018    → consistent_table_row_length_018
//!   consistent-table-row-length-019    → consistent_table_row_length_019 (was `valid_table_no_violations`)
//!   consistent-table-row-length-020    → consistent_table_row_length_020
//!   consistent-table-row-length-022    → consistent_table_row_length_022
//!   consistent-table-row-length-023    → consistent_table_row_length_023
//!   consistent-table-row-length-026    → consistent_table_row_length_026
//!   consistent-table-row-length-027    → consistent_table_row_length_027
//!   v6_consistent_table_row_length_001  — Rust-only: 3+ rows take the width closest to the average (was `three_rows_averaging_logic`)
//!   v6_consistent_table_row_length_002  — Rust-only: `<tfoot>` decides the base width over `<tbody>`
//!   v6_consistent_table_row_length_003  — Rust-only: an unparsable `colspan` counts as 1
//!   v6_consistent_table_row_length_004  — Rust-only: a row without an anchored cell is left to `no-empty-table-track`
//!   v6_consistent_table_row_length_005  — Rust-only: severity override and `rules: false`
//!
//! `table-row-column-alignment` is four rules now; its test `rowspan_overflow_in_thead_section`
//! is `no-table-span-overflow-001`.

use crate::lint::{LintConfig, lint};
use crate::violation::{Severity, Violation};
use markuplint_dom::html_builder;
use markuplint_types::spec::load_spec;
use markuplint_types::spec::types::MLMLSpec;

const RULE: &str = "consistent-table-row-length";
const ONE_EXTRA: &str = "One extra column in a row";
const ONE_MISSING: &str = "One missing column in a row";
const EXCEEDS: &str = "Exceeds the number of available columns";

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

/// TS: `[consistent-table-row-length-003]`
#[test]
fn consistent_table_row_length_003() {
    const _ID: &str = "consistent-table-row-length-003";
    let violations = run(r#"
<table>
  <tr>
    <th></th>
  </tr>
  <tr>
    <td></td>
    <td class="extra"></td>
  </tr>
</table>
"#);
    assert_violations(
        &violations,
        &[(Severity::Warning, 8, 5, ONE_EXTRA, "<td class=\"extra\">")],
    );
}

/// TS: `[consistent-table-row-length-004]`
#[test]
fn consistent_table_row_length_004() {
    const _ID: &str = "consistent-table-row-length-004";
    let violations = run(r#"
<table>
  <tr>
    <th></th>
  </tr>
  <tr>
    <td></td>
    <td class="extra1"></td>
    <td class="extra2"></td>
  </tr>
</table>
"#);
    assert_violations(
        &violations,
        &[(
            Severity::Warning,
            8,
            5,
            "Two extra columns in a row",
            "<td class=\"extra1\">",
        )],
    );
}

/// TS: `[consistent-table-row-length-005]`
#[test]
fn consistent_table_row_length_005() {
    const _ID: &str = "consistent-table-row-length-005";
    let violations = run(r#"
<table>
  <tr>
    <th></th>
    <th></th>
    <th></th>
  </tr>
  <tr class="missing">
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
  </tr>
</table>
"#);
    assert_violations(
        &violations,
        &[(Severity::Warning, 8, 3, ONE_MISSING, "<tr class=\"missing\">")],
    );
}

/// TS: `[consistent-table-row-length-006]`
#[test]
fn consistent_table_row_length_006() {
    const _ID: &str = "consistent-table-row-length-006";
    let violations = run(r#"
<table>
  <tr>
    <th></th>
    <th></th>
    <th></th>
    <th></th>
    <th></th>
    <th></th>
    <th></th>
    <th></th>
    <th></th>
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
            Severity::Warning,
            15,
            3,
            "9 missing columns in a row",
            "<tr class=\"missing\">",
        )],
    );
}

/// TS: `[consistent-table-row-length-007]`
#[test]
fn consistent_table_row_length_007() {
    const _ID: &str = "consistent-table-row-length-007";
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
            Severity::Warning,
            8,
            3,
            "Four missing columns in a row",
            "<tr class=\"missing\">",
        )],
    );
}

/// TS: `[consistent-table-row-length-008]`
#[test]
fn consistent_table_row_length_008() {
    const _ID: &str = "consistent-table-row-length-008";
    let violations = run(r#"
<table>
  <tr class="missing1">
    <th></th>
    <th rowspan="3"></th>
    <!-- missing -->
  </tr>
  <tr>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
  </tr>
  <tr class="missing2">
    <td></td>
    <td></td>
    <!-- missing -->
  </tr>
</table>
"#);
    assert_violations(
        &violations,
        &[
            (Severity::Warning, 3, 3, ONE_MISSING, "<tr class=\"missing1\">"),
            (Severity::Warning, 16, 3, ONE_MISSING, "<tr class=\"missing2\">"),
        ],
    );
}

/// TS: `[consistent-table-row-length-009]`
#[test]
fn consistent_table_row_length_009() {
    const _ID: &str = "consistent-table-row-length-009";
    let violations = run(r#"
<table>
  <tr class="missing">
    <th></th>
    <th colspan="3" rowspan="3"></th>
    <!-- missing -->
  </tr>
  <tr>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
</table>
"#);
    assert_violations(
        &violations,
        &[(Severity::Warning, 3, 3, ONE_MISSING, "<tr class=\"missing\">")],
    );
}

/// TS: `[consistent-table-row-length-010]`
#[test]
fn consistent_table_row_length_010() {
    const _ID: &str = "consistent-table-row-length-010";
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
    assert_violations(
        &violations,
        &[
            (Severity::Warning, 12, 9, EXCEEDS, "colspan=\"8\""),
            (Severity::Warning, 14, 3, ONE_MISSING, "<tr class=\"missing1\">"),
            (
                Severity::Warning,
                22,
                5,
                "Two extra columns in a row",
                "<td class=\"extra1\">",
            ),
        ],
    );
}

/// TS: `[consistent-table-row-length-011]`
#[test]
fn consistent_table_row_length_011() {
    const _ID: &str = "consistent-table-row-length-011";
    let violations = run("
<table>
</table>
");
    assert_violations(&violations, &[]);
}

/// TS: `[consistent-table-row-length-012]`
#[test]
fn consistent_table_row_length_012() {
    const _ID: &str = "consistent-table-row-length-012";
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

/// TS: `[consistent-table-row-length-013]`
#[test]
fn consistent_table_row_length_013() {
    const _ID: &str = "consistent-table-row-length-013";
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
    <tr class="missing">
      <td>Data 1</td>
      <td>Data 2</td>
    </tr>
  </tbody>
</table>
"#);
    assert_violations(
        &violations,
        &[(Severity::Warning, 11, 5, ONE_MISSING, "<tr class=\"missing\">")],
    );
}

/// TS: `[consistent-table-row-length-014]`
#[test]
fn consistent_table_row_length_014() {
    const _ID: &str = "consistent-table-row-length-014";
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

/// TS: `[consistent-table-row-length-015]`
#[test]
fn consistent_table_row_length_015() {
    const _ID: &str = "consistent-table-row-length-015";
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

/// TS: `[consistent-table-row-length-016]`
#[test]
fn consistent_table_row_length_016() {
    const _ID: &str = "consistent-table-row-length-016";
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

/// TS: `[consistent-table-row-length-017]`
#[test]
fn consistent_table_row_length_017() {
    const _ID: &str = "consistent-table-row-length-017";
    let violations = run(r#"
<table>
  <tr>
    <td rowspan="3">A</td>
    <td>B</td>
    <td>C</td>
  </tr>
  <tr>
    <td>D</td>
    <td>E</td>
  </tr>
  <tr>
    <td>F</td>
    <td>G</td>
  </tr>
</table>
"#);
    assert_violations(&violations, &[]);
}

/// TS: `[consistent-table-row-length-018]`
#[test]
fn consistent_table_row_length_018() {
    const _ID: &str = "consistent-table-row-length-018";
    let violations = run(r#"
<table>
  <tr>
    <td rowspan="1" colspan="1">A</td>
    <td>B</td>
  </tr>
  <tr>
    <td>C</td>
    <td>D</td>
  </tr>
</table>
"#);
    assert_violations(&violations, &[]);
}

/// TS: `[consistent-table-row-length-019]`
#[test]
fn consistent_table_row_length_019() {
    const _ID: &str = "consistent-table-row-length-019";
    let violations = run(r"
<table>
  <tr>
    <td>1</td>
    <td>2</td>
    <td>3</td>
    <td>4</td>
  </tr>
  <tr>
    <td>5</td>
    <td>6</td>
    <td>7</td>
    <td>8</td>
  </tr>
  <tr>
    <td>9</td>
    <td>10</td>
    <td>11</td>
    <td>12</td>
  </tr>
  <tr>
    <td>13</td>
    <td>14</td>
    <td>15</td>
    <td>16</td>
  </tr>
  <tr>
    <td>17</td>
    <td>18</td>
    <td>19</td>
    <td>20</td>
  </tr>
</table>
");
    assert_violations(&violations, &[]);
}

/// TS: `[consistent-table-row-length-020]`
#[test]
fn consistent_table_row_length_020() {
    const _ID: &str = "consistent-table-row-length-020";
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

/// TS: `[consistent-table-row-length-021]`
#[test]
fn consistent_table_row_length_021() {
    const _ID: &str = "consistent-table-row-length-021";
    let violations = run(r#"
<table>
  <tr>
    <td>A</td>
    <td>B</td>
    <td>C</td>
  </tr>
  <tr>
    <td rowspan="2">D</td>
    <td colspan="2">E</td>
  </tr>
  <tr>
    <td>F</td>
    <td>G</td>
  </tr>
  <tr class="extra">
    <td>H</td>
    <td>I</td>
    <td>J</td>
    <td>K</td>
  </tr>
</table>
"#);
    assert_violations(&violations, &[(Severity::Warning, 20, 5, ONE_EXTRA, "<td>")]);
}

/// TS: `[consistent-table-row-length-022]`
#[test]
fn consistent_table_row_length_022() {
    const _ID: &str = "consistent-table-row-length-022";
    let violations = run(r"
<table>
  <tr>
    <td>Single cell</td>
  </tr>
</table>
");
    assert_violations(&violations, &[]);
}

/// TS: `[consistent-table-row-length-023]`
#[test]
fn consistent_table_row_length_023() {
    const _ID: &str = "consistent-table-row-length-023";
    let violations = run(r#"
<table>
  <tr>
    <td colspan="5">Wide cell</td>
  </tr>
</table>
"#);
    assert_violations(&violations, &[]);
}

/// TS: `[consistent-table-row-length-024]`
#[test]
fn consistent_table_row_length_024() {
    const _ID: &str = "consistent-table-row-length-024";
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
    assert_violations(&violations, &[(Severity::Warning, 8, 9, EXCEEDS, "colspan=\"2\"")]);
}

/// TS: `[consistent-table-row-length-025]`
#[test]
fn consistent_table_row_length_025() {
    const _ID: &str = "consistent-table-row-length-025";
    let violations = run(r#"
<table>
  <tbody>
    <tr><td rowspan="3">Spanning cell</td></tr>
    <tr><td>Cell</td></tr>
  </tbody>
</table>
"#);
    assert_violations(&violations, &[(Severity::Warning, 5, 9, ONE_EXTRA, "<td>")]);
}

/// TS: `[consistent-table-row-length-026]`
#[test]
fn consistent_table_row_length_026() {
    const _ID: &str = "consistent-table-row-length-026";
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

/// TS: `[consistent-table-row-length-027]`
#[test]
fn consistent_table_row_length_027() {
    const _ID: &str = "consistent-table-row-length-027";
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

#[test]
fn v6_consistent_table_row_length_001() {
    let violations = run(
        "<table>\n<tr><td></td><td></td><td></td></tr>\n<tr><td></td><td></td><td></td><td></td><td></td></tr>\n<tr><td></td><td></td><td></td><td></td></tr>\n<tr><td></td><td></td><td></td></tr>\n</table>",
    );
    assert_violations(
        &violations,
        &[
            (Severity::Warning, 2, 1, ONE_MISSING, "<tr>"),
            (Severity::Warning, 3, 41, ONE_EXTRA, "<td>"),
            (Severity::Warning, 5, 1, ONE_MISSING, "<tr>"),
        ],
    );
}

#[test]
fn v6_consistent_table_row_length_002() {
    let violations = run(
        "<table>\n<tbody><tr><td></td><td></td><td></td></tr></tbody>\n<tfoot><tr><td></td><td></td></tr></tfoot>\n</table>",
    );
    assert_violations(&violations, &[(Severity::Warning, 2, 30, ONE_EXTRA, "<td>")]);
}

#[test]
fn v6_consistent_table_row_length_003() {
    let violations =
        run("<table>\n<tr><td></td><td></td></tr>\n<tr><td colspan=\"abc\"></td><td></td><td></td></tr>\n</table>");
    assert_violations(&violations, &[(Severity::Warning, 3, 37, ONE_EXTRA, "<td>")]);
}

#[test]
fn v6_consistent_table_row_length_004() {
    let violations = run("<table>\n<tr><td></td><td></td></tr>\n<tr></tr>\n</table>");
    assert_violations(&violations, &[]);
}

#[test]
fn v6_consistent_table_row_length_005() {
    let html = "<table>\n<tr><td></td></tr>\n<tr><td></td><td></td></tr>\n</table>";
    assert_violations(
        &run_rule(html, serde_json::json!({ "severity": "error" })),
        &[(Severity::Error, 3, 14, ONE_EXTRA, "<td>")],
    );
    assert_violations(&run_rule(html, serde_json::json!(false)), &[]);
}
