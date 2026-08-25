import { createRule } from '@markuplint/ml-core';

import { findChildren } from '../table-row-column-alignment/find-children.js';
import { Grid, getIndexes } from '../table-row-column-alignment/grid.js';

import meta from './meta.js';

/**
 * Flags rows whose width disagrees with the table's base column count.
 *
 * Unlike the sibling splits of `table-row-column-alignment`, this is not a table model error:
 * HTML LS §4.9.12.1 Step 7 grows `xwidth` to fit a wider row, and a narrower row is only a table
 * model error where {@link import('../no-empty-table-track/index.js')} already catches it (a
 * column no cell ever anchors to). A ragged table is nevertheless almost always a mistake, which
 * is why this check exists and why it stays a `warning` rather than the `error` of its siblings.
 *
 * Skips a table that `no-table-cell-overlap` already reports on — once two cells claim the same
 * slot, row widths derived from the grid model are no longer reliable.
 */
export default createRule<boolean>({
	meta,
	defaultSeverity: 'warning',
	verify({ document, report, t }) {
		const tables = document.querySelectorAll('table');

		for (const table of tables) {
			const grid = new Grid(table);

			if (grid.hasOverlapped()) {
				continue;
			}

			const baseColLength = grid.getBaseColLength();

			for (const row of grid.getRows()) {
				if (row.anchorCount === 0) {
					continue;
				}

				const colLength = row.slots.length;

				if (colLength === baseColLength) {
					continue;
				}

				const indexes = getIndexes(row.slots);
				const cells = findChildren(row.element, 'th, td');

				if (colLength > baseColLength) {
					const index = indexes.slice(baseColLength)[0];
					const unexpected = typeof index === 'number' ? cells[index] : null;

					if (!unexpected) {
						// The overshoot starts inside a spanned cell, so the `colspan` is the culprit.
						const spanStart = cells.findLast(
							cell => Number.parseInt(cell.getAttribute('colspan') ?? '1') > 1,
						);
						const colSpan = spanStart?.getAttributeNode('colspan');
						if (!colSpan) {
							continue;
						}
						report({
							scope: colSpan,
							message: t('Exceeds the number of available {0}', 'columns'),
						});

						continue;
					}

					const diff = colLength - baseColLength;

					report({
						scope: unexpected,
						message: t(
							'{0} extra {1} in {2}',
							t(`${diff}`),
							t(diff === 1 ? 'column' : 'columns'),
							t('a {0}', t('row')),
						),
					});

					continue;
				}

				const diff = baseColLength - colLength;

				report({
					scope: row.element,
					message: t(
						'{0} missing {1} in {2}',
						t(`${diff}`),
						t(diff === 1 ? 'column' : 'columns'),
						t('a {0}', t('row')),
					),
				});
			}
		}
	},
});
