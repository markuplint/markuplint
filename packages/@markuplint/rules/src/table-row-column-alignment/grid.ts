import type { CellType, Key } from './types.js';
import type { Element } from '@markuplint/ml-core';

import { findChildren } from './find-children.js';

/**
 * Represents a table as a grid model, splitting it into thead, tbody, and tfoot sections.
 *
 * Each section is modeled as a 2D array of `CellType` values that account for
 * `colspan` and `rowspan` attributes. Used by the `table-row-column-alignment`
 * rule to detect misaligned rows and overlapping cells.
 */
export class Grid {
	/** The grid model for the `<tbody>` section. */
	readonly tbodyGrid: ReadonlyArray<ReadonlyArray<CellType>>;
	/** The grid model for the `<tfoot>` section. */
	readonly tfootGrid: ReadonlyArray<ReadonlyArray<CellType>>;
	/** The grid model for the `<thead>` section. */
	readonly theadGrid: ReadonlyArray<ReadonlyArray<CellType>>;
	/** The `<tr>` elements within `<tbody>`. */
	#tbodyRowElements: ReadonlyArray<Element<boolean>>;
	/** The `<tr>` elements within `<tfoot>`. */
	#tfootRowElements: ReadonlyArray<Element<boolean>>;
	/** The `<tr>` elements within `<thead>`. */
	#theadRowElements: ReadonlyArray<Element<boolean>>;

	/**
	 * Constructs a grid model from a `<table>` element.
	 *
	 * @param table - The table element to model.
	 */
	constructor(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		table: Element<boolean>,
	) {
		const thead = findChildren(table, 'thead')[0];
		const tbody = findChildren(table, 'tbody')[0];
		const tfoot = findChildren(table, 'tfoot')[0];

		this.#theadRowElements = thead ? findChildren(thead, 'tr') : [];
		this.#tbodyRowElements = tbody ? findChildren(tbody, 'tr') : [];
		this.#tfootRowElements = tfoot ? findChildren(tfoot, 'tr') : [];

		this.theadGrid = createGrid(this.#theadRowElements);
		this.tbodyGrid = createGrid(this.#tbodyRowElements);
		this.tfootGrid = createGrid(this.#tfootRowElements);
	}

	/**
	 * Returns all `<tr>` elements across all table sections in document order.
	 *
	 * @returns Combined array of row elements from thead, tbody, and tfoot.
	 */
	getAllRowElements() {
		return [...this.#theadRowElements, ...this.#tbodyRowElements, ...this.#tfootRowElements];
	}

	/**
	 * Returns all grid rows that contain at least one actual cell element.
	 *
	 * @returns Combined array of grid rows from thead, tbody, and tfoot, filtered to rows with real cells.
	 */
	getAllRows() {
		return [
			...this.theadGrid.filter(hasElementFilter),
			...this.tbodyGrid.filter(hasElementFilter),
			...this.tfootGrid.filter(hasElementFilter),
		];
	}

	/**
	 * Determines the expected (base) column count for the table.
	 *
	 * Prefers the thead section if available, then tfoot, then tbody.
	 *
	 * @returns The base number of columns that rows should have.
	 */
	getBaseColLength() {
		if (this.theadGrid.length > 0) {
			return getBaseColLength(this.theadGrid);
		}
		if (this.tfootGrid.length > 0) {
			return getBaseColLength(this.tfootGrid);
		}
		return getBaseColLength(this.tbodyGrid);
	}

	/**
	 * Returns the grid and row elements for each table section (thead, tbody, tfoot).
	 *
	 * @returns An array of objects, each containing the section grid and its row elements.
	 */
	getSections() {
		return [
			{
				section: this.theadGrid,
				elements: this.#theadRowElements,
			},
			{
				section: this.tbodyGrid,
				elements: this.#tbodyRowElements,
			},
			{
				section: this.tfootGrid,
				elements: this.#tfootRowElements,
			},
		];
	}

	/**
	 * Checks whether any cell in the table grid has been marked as overlapping.
	 *
	 * @returns `true` if any cell has the overlap marker `'x'`.
	 */
	hasOverlapped() {
		return (
			this.tbodyGrid.some(row => row.includes('x')) ||
			this.tfootGrid.some(row => row.includes('x')) ||
			this.theadGrid.some(row => row.includes('x'))
		);
	}

	/** Logs the grid data for all three table sections to the console (for debugging). */
	log() {
		// eslint-disable-next-line no-console
		console.table(this.theadGrid);
		// eslint-disable-next-line no-console
		console.table(this.tbodyGrid);
		// eslint-disable-next-line no-console
		console.table(this.tfootGrid);
	}
}

/**
 * Detects a rowspan that extends beyond the available rows in a table section.
 *
 * When a grid row exists without a corresponding row element, it indicates
 * a rowspan overflow. Returns the offending `rowspan` attribute node if found.
 *
 * @param rows - The grid rows for a single table section.
 * @param rowElements - The `<tr>` elements for the section.
 * @returns An object containing the overflowing `rowSpan` attribute, or `null`.
 */
export function getOverflowRowSpan(
	rows: ReadonlyArray<ReadonlyArray<CellType>>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	rowElements: ReadonlyArray<Element<boolean>>,
) {
	for (const [rowNum] of rows.entries()) {
		const rowEl = rowElements[rowNum];

		if (!rowEl) {
			const prevRow = rows[rowNum - 1];
			const prevRowEl = rowElements[rowNum - 1];
			if (!prevRow || !prevRowEl) {
				continue;
			}
			const spanStart = prevRow.indexOf('◎');
			if (spanStart === -1) {
				continue;
			}
			const indexes = getIndexes(prevRow);
			const index = indexes[spanStart];
			if (index == null) {
				continue;
			}
			const cells = findChildren(prevRowEl, 'th, td');
			const spanStartCell = cells[index];
			if (!spanStartCell) {
				continue;
			}
			const rowSpan = spanStartCell.getAttributeNode('rowspan');
			if (!rowSpan) {
				continue;
			}

			return {
				rowSpan,
			};
		}
	}

	return null;
}

/**
 * Maps each cell in a grid row to its source cell index (for cells that correspond
 * to actual `<td>`/`<th>` elements), or `null` for spanned cells.
 *
 * @param row - A single row of cell types from the grid model.
 * @returns An array of cell indices or `null` values, one per grid column.
 */
export function getIndexes(row: readonly CellType[]) {
	let indexCounter = 0;
	return row.map(col => (col === '●' || col === '◎' ? indexCounter++ : null));
}

/**
 * Calculates the base (expected) column count from a section grid.
 *
 * For grids with 3 or more rows, uses the row length closest to the
 * average to handle minor variations from spans. Otherwise uses the first row.
 *
 * @param grid - The 2D grid for a table section.
 * @returns The base number of columns.
 */
function getBaseColLength(grid: ReadonlyArray<ReadonlyArray<CellType>>) {
	let baseColLength: number;

	if (grid.length >= 3) {
		const totalCols = grid.reduce((acc, row) => {
			return acc + row.length;
		}, 0);

		const average = Math.round(totalCols / grid.length);
		baseColLength = grid
			// eslint-disable-next-line unicorn/no-array-reduce
			.reduce((closest, row) => {
				return Math.abs(row.length - average) < Math.abs(closest - average) ? row.length : closest;
			}, grid[0]?.length ?? 0);
	} else {
		baseColLength = grid[0]?.length ?? 0;
	}

	return baseColLength;
}

/**
 * Builds a 2D grid model from an array of `<tr>` elements.
 *
 * Processes each row's `<th>` and `<td>` cells, expanding `colspan` and `rowspan`
 * attributes into the grid. Marks cells with appropriate cell types including
 * span origins, continuations, and overlaps.
 *
 * @param rows - The `<tr>` elements to convert into a grid.
 * @returns A 2D array of cell types representing the table section layout.
 */
function createGrid(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	rows: ReadonlyArray<Element<boolean>>,
) {
	const rowSpans = new Set<Key>();
	const matrix: CellType[][] = [];

	for (const [rowNum, row] of rows.entries()) {
		const cols = findChildren(row, 'th, td');

		let colNum = 0;

		matrix[rowNum] = matrix[rowNum] ?? [];

		for (const col of cols) {
			const colSpan = Number.parseInt(col.getAttribute('colspan') ?? '1');
			const rowSpan = Number.parseInt(col.getAttribute('rowspan') ?? '1');

			for (let i = 0; i < colSpan; i++) {
				const key: Key = `${rowNum}:${colNum}`;

				let spanStart = false;

				if (colSpan > 1 && i === 0) {
					spanStart = true;
				}

				if (rowSpan > 1) {
					if (i === 0) {
						spanStart = true;
					}

					for (let i = 1; i <= rowSpan - 1; i++) {
						matrix[rowNum + i] = matrix[rowNum + i] ?? [];
						matrix[rowNum + i]![colNum] = '↓';
						rowSpans.add(`${rowNum + i}:${colNum}`);
					}
				}

				const addCol = rowSpans.has(key) ? 1 : 0;

				if (matrix[rowNum]?.[colNum] === '↓' && !spanStart && colSpan > 1) {
					// Overlap
					matrix[rowNum][colNum] = 'x';
				} else {
					matrix[rowNum][colNum] = spanStart ? '◎' : addCol > 0 ? '↓' : colSpan > 1 ? '→' : '●';
				}

				if (addCol === 1) {
					matrix[rowNum].push('●');
				}

				colNum += 1;
			}
		}
	}

	return matrix;
}

/**
 * Filter predicate that returns `true` if a grid row contains at least one actual cell element.
 *
 * @param row - A single row of cell types.
 * @returns `true` if the row has a regular or span-origin cell.
 */
function hasElementFilter(row: readonly CellType[]) {
	return row.some(cell => cell === '●' || cell === '◎');
}
