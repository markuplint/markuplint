import { createRule } from '@markuplint/ml-core';

import { Grid } from '../table-row-column-alignment/grid.js';

import meta from './meta.js';

/**
 * HTML LS §4.9.12 ("A cell cannot cover slots that are from two or more row groups."): a cell
 * whose `rowspan` reaches past the last row of its `<thead>` / `<tbody>` / `<tfoot>` is clipped
 * to the row group by the *ending a row group* algorithm, which is itself the table model error
 * this rule reports.
 *
 * Split from the original `table-row-column-alignment` rule. Skips a table that
 * `no-table-cell-overlap` already reports on — once two cells claim the same slot, the grid
 * model's row groups are no longer reliable.
 */
export default createRule<boolean>({
	meta,
	verify({ document, report, t }) {
		const tables = document.querySelectorAll('table');

		for (const table of tables) {
			const grid = new Grid(table);

			if (grid.hasOverlapped()) {
				continue;
			}

			for (const rowGroup of grid.rowGroups) {
				for (const overflow of rowGroup.overflows) {
					const rowSpan = overflow.cell.getAttributeNode('rowspan');
					if (!rowSpan) {
						continue;
					}
					report({
						scope: rowSpan,
						message: t('Exceeds the number of available {0}', 'rows'),
					});
				}
			}
		}
	},
});
