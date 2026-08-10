import { createRule } from '@markuplint/ml-core';

import { findChildren } from './find-children.js';
import { Grid, getIndexes } from './grid.js';
import meta from './meta.js';

/**
 * Reports the table model errors of HTML LS
 * [§4.9.12.1 *Forming a table*](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table),
 * plus the row-width inconsistencies that gave the rule its name.
 *
 * The spec closes the algorithm with "Authors must not produce a table with table model errors",
 * so cell overlap (Step 14), a cell clipped at its row group boundary (§4.9.12 "A cell cannot
 * cover slots that are from two or more row groups.") and rows or columns that no cell is
 * anchored to (Step 20) are all author errors. Row widths that merely disagree with each other
 * are not: the spec permits a short row, and nu-validator reports it as a warning unless column
 * markup fixes the table's width. They stay in this rule because a ragged table is almost always
 * a mistake, which is also why the rule's default severity is `warning` for every check.
 *
 * Overlap short-circuits the remaining checks for that table: once two cells claim the same slot,
 * every column and width derived from the grid is speculative, so reporting them would bury the
 * one error the author has to fix first.
 */
export default createRule<boolean>({
	meta,
	defaultSeverity: 'warning',
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

			const baseColLength = grid.getBaseColLength();

			for (const row of grid.getRows()) {
				if (row.anchorCount === 0) {
					report({
						scope: row.element,
						message: t('{0} {1} has no cells beginning in it', t('1'), t('row')),
					});
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
