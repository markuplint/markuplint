//! `no-empty-table-track` rule: report a table column or row that no cell is anchored to.
//!
//! Ports `packages/@markuplint/rules/src/no-empty-table-track/`. HTML LS
//! [§4.9.12.1 *Forming a table*](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)
//! Step 20: "if a column or a row does not have at least one cell anchored to it, that also
//! constitutes a table model error". That covers both a `<tr>` with no cell anchored in it and a
//! column that no cell (nor a `<col>` / `<colgroup>` it belongs to) ever anchors a cell to. A
//! table [`crate::table_grid::Grid::has_overlapped`] is skipped, as `no-table-cell-overlap`
//! reports it and the anchors derived from its grid are no longer reliable.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::table_grid;
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoEmptyTableTrack;

impl Rule for NoEmptyTableTrack {
    fn id(&self) -> &'static str {
        "no-empty-table-track"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (_, grid) in table_grid::tables(arena, config) {
            if grid.has_overlapped() {
                continue;
            }

            for range in grid.columns_without_anchor() {
                let Some(source) = table_grid::element(arena, range.source) else {
                    continue;
                };
                let count = range.right - range.left;
                let message = if count == 1 {
                    "One column has no cells beginning in it".to_string()
                } else {
                    table_grid::capitalize(&format!(
                        "{} columns have no cells beginning in them",
                        table_grid::count_word(count)
                    ))
                };
                violations.push(match table_grid::attr_node(source, "colspan") {
                    Some(colspan) => table_grid::attr_violation(self.id(), config, range.source, colspan, message),
                    None => table_grid::element_violation(self.id(), config, range.source, source, message),
                });
            }

            for row in grid.rows() {
                if row.anchor_count > 0 {
                    continue;
                }
                let Some(row_el) = table_grid::element(arena, row.element) else {
                    continue;
                };
                violations.push(table_grid::element_violation(
                    self.id(),
                    config,
                    row.element,
                    row_el,
                    "One row has no cells beginning in it".to_string(),
                ));
            }
        }

        violations
    }
}
