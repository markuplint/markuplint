import type { CellType, Key } from './types.js';
import type { Element } from '@markuplint/ml-core';

import { findChildren } from './find-children.js';

export class Grid {
	readonly tbodyGrid: ReadonlyArray<ReadonlyArray<CellType>>;
	readonly tfootGrid: ReadonlyArray<ReadonlyArray<CellType>>;
	readonly theadGrid: ReadonlyArray<ReadonlyArray<CellType>>;
	#tbodyRowElements: ReadonlyArray<Element<boolean>>;
	#tfootRowElements: ReadonlyArray<Element<boolean>>;
	#theadRowElements: ReadonlyArray<Element<boolean>>;

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

	getAllRowElements() {
		return [...this.#theadRowElements, ...this.#tbodyRowElements, ...this.#tfootRowElements];
	}

	getAllRows() {
		return [
			...this.theadGrid.filter(hasElementFilter),
			...this.tbodyGrid.filter(hasElementFilter),
			...this.tfootGrid.filter(hasElementFilter),
		];
	}

	getBaseColLength() {
		if (this.theadGrid.length > 0) {
			return getBaseColLength(this.theadGrid);
		}
		if (this.tfootGrid.length > 0) {
			return getBaseColLength(this.tfootGrid);
		}
		return getBaseColLength(this.tbodyGrid);
	}

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

	hasOverlapped() {
		return (
			this.tbodyGrid.some(row => row.includes('x')) ||
			this.tfootGrid.some(row => row.includes('x')) ||
			this.theadGrid.some(row => row.includes('x'))
		);
	}

	log() {
		// eslint-disable-next-line no-console
		console.table(this.theadGrid);
		// eslint-disable-next-line no-console
		console.table(this.tbodyGrid);
		// eslint-disable-next-line no-console
		console.table(this.tfootGrid);
	}
}

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

export function getIndexes(row: readonly CellType[]) {
	let indexCounter = 0;
	return row.map(col => (col === '●' || col === '◎' ? indexCounter++ : null));
}

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
					matrix[rowNum]![colNum] = 'x';
				} else {
					matrix[rowNum]![colNum] = spanStart ? '◎' : addCol > 0 ? '↓' : colSpan > 1 ? '→' : '●';
				}

				if (addCol === 1) {
					matrix[rowNum]!.push('●');
				}

				colNum += 1;
			}
		}
	}

	return matrix;
}

function hasElementFilter(row: readonly CellType[]) {
	return row.some(cell => cell === '●' || cell === '◎');
}
