//! `consistent-table-row-length` rule: report a row whose width disagrees with the table's base
//! column count.
//!
//! Ports `packages/@markuplint/rules/src/consistent-table-row-length/`. Unlike the other splits of
//! `table-row-column-alignment`, this is not a table model error: HTML LS §4.9.12.1 Step 7 grows
//! xwidth to fit a wider row, and a narrower row is only a table model error where
//! `no-empty-table-track` already catches it (a column no cell ever anchors to). A ragged table is
//! nevertheless almost always a mistake, which is why this check exists and why it defaults to
//! `warning` rather than the `error` of its siblings. A table
//! [`crate::table_grid::Grid::has_overlapped`] is skipped, as `no-table-cell-overlap` reports it
//! and the row widths derived from its grid are no longer reliable.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::table_grid::{self, Row};
use crate::violation::{Severity, Violation};

#[cfg(test)]
mod tests;

pub struct ConsistentTableRowLength;

impl Rule for ConsistentTableRowLength {
    fn id(&self) -> &'static str {
        "consistent-table-row-length"
    }

    fn default_severity(&self) -> Severity {
        Severity::Warning
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (_, grid) in table_grid::tables(arena, config) {
            if grid.has_overlapped() {
                continue;
            }
            let base_col_length = grid.base_col_length();
            for row in grid.rows() {
                if row.anchor_count == 0 {
                    continue;
                }
                violations.extend(self.check_row(arena, config, row, base_col_length));
            }
        }

        violations
    }
}

impl ConsistentTableRowLength {
    fn check_row(
        &self,
        arena: &DomArena,
        config: &RuleConfigSet,
        row: &Row,
        base_col_length: usize,
    ) -> Option<Violation> {
        let col_length = row.slots.len();
        let row_el = table_grid::element(arena, row.element)?;

        if col_length < base_col_length {
            let diff = base_col_length - col_length;
            return Some(table_grid::element_violation(
                self.id(),
                config,
                row.element,
                row_el,
                table_grid::capitalize(&format!(
                    "{} missing {} in a row",
                    table_grid::count_word(diff),
                    columns(diff)
                )),
            ));
        }
        if col_length == base_col_length {
            return None;
        }

        let cells = table_grid::find_children(arena, row.element, &["th", "td"]);
        let unexpected = table_grid::slot_cell_indexes(&row.slots)
            .get(base_col_length)
            .copied()
            .flatten()
            .and_then(|index| cells.get(index).copied());

        let Some(unexpected) = unexpected else {
            // The overshoot starts inside a spanned cell, so the `colspan` is the culprit.
            let (span_start, colspan) = cells.iter().rev().find_map(|&cell| {
                let colspan = table_grid::attr_node(table_grid::element(arena, cell)?, "colspan")?;
                js_parse_int(&colspan.value.raw)
                    .is_some_and(|n| n > 1)
                    .then_some((cell, colspan))
            })?;
            return Some(table_grid::attr_violation(
                self.id(),
                config,
                span_start,
                colspan,
                "Exceeds the number of available columns".to_string(),
            ));
        };

        let diff = col_length - base_col_length;
        Some(table_grid::element_violation(
            self.id(),
            config,
            unexpected,
            table_grid::element(arena, unexpected)?,
            table_grid::capitalize(&format!(
                "{} extra {} in a row",
                table_grid::count_word(diff),
                columns(diff)
            )),
        ))
    }
}

fn columns(count: usize) -> &'static str {
    if count == 1 { "column" } else { "columns" }
}

/// JS `Number.parseInt(value)` for the sign and leading digits it reads, `None` for `NaN`.
///
/// TS decides which cell's `colspan` overshot with `parseInt`, which, unlike the table model's
/// span parsing, also skips non-ASCII leading whitespace and accepts a sign.
fn js_parse_int(value: &str) -> Option<i64> {
    let trimmed = value.trim_start();
    let (negative, digits) = match trimmed.as_bytes().first() {
        Some(b'-') => (true, &trimmed[1..]),
        Some(b'+') => (false, &trimmed[1..]),
        _ => (false, trimmed),
    };
    let end = digits.bytes().take_while(u8::is_ascii_digit).count();
    if end == 0 {
        return None;
    }
    let magnitude = digits[..end].bytes().fold(0_i64, |n, digit| {
        n.saturating_mul(10).saturating_add(i64::from(digit - b'0'))
    });
    Some(if negative { -magnitude } else { magnitude })
}
