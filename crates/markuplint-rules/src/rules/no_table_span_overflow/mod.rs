//! `no-table-span-overflow` rule: report a `rowspan` that reaches past the last row of its row
//! group.
//!
//! Ports `packages/@markuplint/rules/src/no-table-span-overflow/`. HTML LS §4.9.12 says "A cell
//! cannot cover slots that are from two or more row groups."; the *ending a row group* algorithm
//! clips such a cell to its `<thead>` / `<tbody>` / `<tfoot>`, which is itself the table model
//! error reported here. A table [`crate::table_grid::Grid::has_overlapped`] is skipped, as
//! `no-table-cell-overlap` reports it and its row groups are no longer reliable.

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::table_grid;
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoTableSpanOverflow;

impl Rule for NoTableSpanOverflow {
    fn id(&self) -> &'static str {
        "no-table-span-overflow"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        let mut violations = Vec::new();

        for (_, grid) in table_grid::tables(arena, config) {
            if grid.has_overlapped() {
                continue;
            }
            for overflow in grid.row_groups.iter().flat_map(|group| &group.overflows) {
                let Some(rowspan) =
                    table_grid::element(arena, overflow.cell).and_then(|cell| table_grid::attr_node(cell, "rowspan"))
                else {
                    continue;
                };
                violations.push(table_grid::attr_violation(
                    self.id(),
                    config,
                    overflow.cell,
                    rowspan,
                    "Exceeds the number of available rows".to_string(),
                ));
            }
        }

        violations
    }
}
