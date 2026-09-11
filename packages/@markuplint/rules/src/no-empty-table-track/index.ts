import { createRule } from '@markuplint/ml-core';

import { Grid } from '../table-row-column-alignment/grid.js';

import meta from './meta.js';

/**
 * HTML LS [§4.9.12.1 *Forming a table*](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)
 * Step 20: "if a column or a row does not have at least one cell anchored to it, that also
 * constitutes a table model error" — covers both a `<tr>` with no cell anchored in it and a
 * column that no cell (nor a `<col>` / `<colgroup>` it belongs to) ever anchors a cell to.
 *
 * Split from the original `table-row-column-alignment` rule. Skips a table that
 * `no-table-cell-overlap` already reports on — once two cells claim the same slot, anchors
 * derived from the grid model are no longer reliable.
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

			for (const range of grid.getColumnsWithoutAnchor()) {
				const count = range.right - range.left;
				report({
					scope: range.source.getAttributeNode('colspan') ?? range.source,
					message:
						count === 1
							? t('{0} {1} has no cells beginning in it', t('1'), t('column'))
							: t('{0} {1} have no cells beginning in them', t(`${count}`), t('columns')),
				});
			}

			for (const row of grid.getRows()) {
				if (row.anchorCount === 0) {
					report({
						scope: row.element,
						message: t('{0} {1} has no cells beginning in it', t('1'), t('row')),
					});
				}
			}
		}
	},
});
