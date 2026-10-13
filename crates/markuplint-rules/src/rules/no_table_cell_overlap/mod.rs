//! `no-table-cell-overlap` rule: report a `<table>` in which two cells cover the same slot.
//!
//! Ports `packages/@markuplint/rules/src/no-table-cell-overlap/`. HTML LS
//! [§4.9.12.1 *Forming a table*](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)
//! Step 14 makes a slot covered twice a table model error. This is the one check the sibling
//! splits of `table-row-column-alignment` (`no-table-span-overflow`, `no-empty-table-track`,
//! `consistent-table-row-length`) all skip a table for; see [`crate::table_grid`].

use markuplint_dom::arena::DomArena;
use markuplint_types::spec::types::MLMLSpec;

use crate::rule::{Rule, RuleConfigSet};
use crate::table_grid;
use crate::violation::Violation;

#[cfg(test)]
mod tests;

pub struct NoTableCellOverlap;

impl Rule for NoTableCellOverlap {
    fn id(&self) -> &'static str {
        "no-table-cell-overlap"
    }

    fn verify(&self, arena: &DomArena, _spec: &MLMLSpec, config: &RuleConfigSet) -> Vec<Violation> {
        table_grid::tables(arena, config)
            .filter(|(_, grid)| grid.has_overlapped())
            .filter_map(|(table, _)| {
                let el = table_grid::element(arena, table)?;
                Some(table_grid::element_violation(
                    self.id(),
                    config,
                    table,
                    el,
                    "\"rowspan\" and \"colspan\" are causing cell overlap".to_string(),
                ))
            })
            .collect()
    }
}
