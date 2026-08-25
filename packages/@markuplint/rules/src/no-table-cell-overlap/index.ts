import { createRule } from '@markuplint/ml-core';

import { Grid } from '../table-row-column-alignment/grid.js';

import meta from './meta.js';

/**
 * HTML LS [§4.9.12.1 *Forming a table*](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)
 * Step 14 table model error: two cells anchored so that a slot is covered twice.
 *
 * Split from the original `table-row-column-alignment` rule. This is the one check the sibling
 * splits (`no-table-span-overflow`, `no-empty-table-track`, `consistent-table-row-length`) all
 * skip a table for: once two cells claim the same slot, every column and width derived from the
 * grid model is speculative, so reporting them would bury the one error the author has to fix
 * first.
 */
export default createRule<boolean>({
	meta,
	verify({ document, report, t }) {
		const tables = document.querySelectorAll('table');

		for (const table of tables) {
			const grid = new Grid(table);

			if (grid.hasOverlapped()) {
				report({
					scope: table,
					message: t(
						//
						'{0} are causing {1}',
						t(['rowspan', 'colspan'], true),
						'cell overlap',
					),
				});
			}
		}
	},
});
