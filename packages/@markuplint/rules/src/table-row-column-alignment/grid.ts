import type { CellType } from './types.js';
import type { Element } from '@markuplint/ml-core';

import { findChildren } from './find-children.js';

/**
 * HTML LS [§4.9.12.1 *Forming a table*](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)
 * Step 8 clamps `colspan` to the range 1–1000.
 */
const MAX_COLSPAN = 1000;

/**
 * HTML LS [§4.9.12.1 *Forming a table*](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table)
 * Step 9 clamps `rowspan` to the range 0–65534.
 */
const MAX_ROWSPAN = 65_534;

/** A `<th>` / `<td>` anchored to a slot, together with the slots it covers. */
export type Anchor = {
	/** The cell element. */
	readonly cell: Element<boolean>;
	/** The slot column the cell is anchored to (spec: xcurrent when the cell was placed). */
	readonly x: number;
	/** The slot row the cell is anchored to, counted within the owning row group (spec: ycurrent). */
	readonly y: number;
	/** The clamped `colspan`. */
	readonly colspan: number;
	/** The clamped `rowspan`, or the distance to the end of the row group for a downward-growing cell. */
	readonly rowspan: number;
	/** Whether `rowspan="0"` made the cell grow downward to the end of its row group (spec Step 10). */
	readonly growsDownward: boolean;
};

/** A contiguous slot column range together with the element that established it. */
export type ColumnRange = {
	/**
	 * The element the range is attributed to: a `<col>` / `<colgroup>` for column markup,
	 * or the `<th>` / `<td>` whose `colspan` stretched the table to cover the range.
	 */
	readonly source: Element<boolean>;
	/** The leftmost column that is part of the range. */
	readonly left: number;
	/** The first column to the right that is not part of the range. */
	readonly right: number;
};

/** One row of slots, paired with the `<tr>` that established it. */
export type Row = {
	/** The `<tr>` element. */
	readonly element: Element<boolean>;
	/**
	 * The slots the row occupies. Its length is the row's width, which mirrors
	 * nu-validator's insertion point at the end of the row: the cells anchored in
	 * the row plus the run of slots that spans from earlier rows continue into.
	 */
	readonly slots: readonly CellType[];
	/** How many cells are anchored in this row (spec Step 20 counts rows by this). */
	readonly anchorCount: number;
};

/** One row group — `<thead>`, `<tbody>`, `<tfoot>`, or the implicit group parse5 inserts. */
export type RowGroup = {
	/** The tag name of the element that established the group, lowercased. */
	readonly tagName: string;
	/** The rows of the group, in document order. */
	readonly rows: readonly Row[];
	/** Every cell anchored within the group, in document order. */
	readonly anchors: readonly Anchor[];
	/**
	 * Anchors whose `rowspan` reaches past the last row of the group. HTML LS
	 * §4.9.12 forbids this ("A cell cannot cover slots that are from two or more
	 * row groups."), and the *ending a row group* algorithm clips the cell instead.
	 */
	readonly overflows: readonly Anchor[];
	/** Whether any slot of the group is covered twice (spec Step 14). */
	readonly hasOverlap: boolean;
};

/**
 * Models a `<table>` as the slot grid of HTML LS
 * [§4.9.12.1 *Forming a table*](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table).
 *
 * The algorithm is followed rather than approximated because every table model error the
 * `table-row-column-alignment` rule reports is defined in terms of it: Step 6 decides which
 * slot a cell is anchored to (a `colspan` after a `rowspan` continuation does *not* start at
 * the cell's ordinal position), Steps 7 and 11 decide how wide the table becomes, Step 14
 * defines cell overlap, and Step 20 defines rows and columns that no cell is anchored to.
 *
 * Two things the spec has no name for are tracked alongside:
 *
 * - **Row width** ({@link Row.slots} length). Rows narrower or wider than the rest of the
 *   table are not a table model error — nu-validator reports them as warnings unless column
 *   markup fixes the width — but they are the rule's original diagnostic and predate the
 *   spec-level checks.
 * - **Row group boundaries**. The spec's *ending a row group* algorithm clips a cell to its
 *   row group, so slots are covered per group; {@link RowGroup.overflows} keeps the cells that
 *   were clipped so the rule can report them.
 */
export class Grid {
	/** Column ranges established by `<col>` / `<colgroup>`, in document order. */
	readonly columnMarkup: readonly ColumnRange[];

	/** The row groups of the table, in document order. */
	readonly rowGroups: readonly RowGroup[];

	/** The number of slot columns in the table (spec: xwidth). */
	readonly xwidth: number;

	/**
	 * Constructs a grid model from a `<table>` element.
	 *
	 * @param table - The table element to model.
	 */
	constructor(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		table: Element<boolean>,
	) {
		this.columnMarkup = collectColumnMarkup(table);

		// Column markup establishes the initial xwidth (spec: the *processing column groups* step).
		let xwidth = this.columnMarkup.at(-1)?.right ?? 0;

		const rowGroups: RowGroup[] = [];

		for (const groupElement of findChildren(table, 'thead, tbody, tfoot')) {
			const group = processRowGroup(groupElement, xwidth);
			xwidth = group.xwidth;
			rowGroups.push(group.rowGroup);
		}

		this.rowGroups = rowGroups;
		this.xwidth = xwidth;
	}

	/** @returns Every cell anchored in the table, in document order. */
	getAnchors() {
		return this.rowGroups.flatMap(group => group.anchors);
	}

	/**
	 * Determines the expected (base) column count that rows are compared against.
	 *
	 * Rows decide it, preferring `<thead>` then `<tfoot>` since a heading or footing
	 * row is the more deliberate declaration. Column markup is deliberately *not*
	 * consulted: HTML LS §4.9.12.1 Step 7 grows xwidth to fit a row that is wider
	 * than the `<col>` markup, so such a row is not an error (tracked as a
	 * nu-validator over-detection in `tests/external/snapshots/excluded-ids.json`).
	 * A row narrower than the column markup is caught by the Step 20 column scan
	 * instead, which reports the `<col>` that no cell ever starts in.
	 *
	 * @returns The base number of columns that rows should have.
	 */
	getBaseColLength() {
		const preferred =
			this.rowGroups.find(group => group.tagName === 'thead' && group.rows.length > 0) ??
			this.rowGroups.find(group => group.tagName === 'tfoot' && group.rows.length > 0) ??
			this.rowGroups.find(group => group.rows.length > 0);

		return preferred ? getBaseColLength(preferred.rows) : 0;
	}

	/**
	 * Collects the columns that no cell is anchored to (spec Step 20), merging
	 * neighbouring columns that the same element established into one range so a
	 * `colspan` overshooting by four columns is reported once, not four times.
	 *
	 * @returns The offending ranges, in column order.
	 */
	getColumnsWithoutAnchor() {
		const anchors = this.getAnchors();
		const anchored = new Set(anchors.map(anchor => anchor.x));
		const ranges: ColumnRange[] = [];

		for (let x = 0; x < this.xwidth; x++) {
			if (anchored.has(x)) {
				continue;
			}

			const source = this.#findColumnSource(x, anchors);
			if (!source) {
				continue;
			}

			const last = ranges.at(-1);
			if (last && last.source === source && last.right === x) {
				ranges[ranges.length - 1] = { source, left: last.left, right: x + 1 };
				continue;
			}

			ranges.push({ source, left: x, right: x + 1 });
		}

		return ranges;
	}

	/** @returns Every row of the table, in document order. */
	getRows() {
		return this.rowGroups.flatMap(group => group.rows);
	}

	/**
	 * Checks whether any slot of the table is covered by more than one cell.
	 *
	 * @returns `true` if the table has a Step 14 cell overlap.
	 */
	hasOverlapped() {
		return this.rowGroups.some(group => group.hasOverlap);
	}

	/**
	 * Resolves which element is answerable for a column: the column markup that
	 * declared it, or else the cell whose `colspan` stretched the table over it.
	 *
	 * @param x - The column index.
	 * @param anchors - The anchors of the table.
	 * @returns The element, or `null` when nothing covers the column.
	 */
	#findColumnSource(x: number, anchors: readonly Anchor[]) {
		const markup = this.columnMarkup.find(range => range.left <= x && x < range.right);
		if (markup) {
			return markup.source;
		}

		const spanning = anchors.find(anchor => anchor.x < x && x < anchor.x + anchor.colspan);

		return spanning?.cell ?? null;
	}
}

/**
 * Maps each slot of a row to the index of the `<th>` / `<td>` anchored to it
 * (counted among the row's own cells), or `null` for a slot the row does not anchor a cell to.
 *
 * @param slots - The slots of a single row.
 * @returns An array of cell indices or `null` values, one per slot.
 */
export function getIndexes(slots: readonly CellType[]) {
	let indexCounter = 0;
	return slots.map(slot => (slot === '●' || slot === '◎' ? indexCounter++ : null));
}

/**
 * Collects the column ranges that `<col>` and `<colgroup>` establish.
 *
 * A `<colgroup>` contributes its own `span` only when it has no `<col>` children,
 * mirroring HTML LS §4.9.3: the `span` attribute of a `<colgroup>` "must not be
 * specified if the element contains one or more `col` elements".
 *
 * @param table - The table element.
 * @returns The ranges in document order.
 */
function collectColumnMarkup(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	table: Element<boolean>,
) {
	const ranges: ColumnRange[] = [];
	let left = 0;

	const append = (
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		source: Element<boolean>,
	) => {
		const span = parseSpan(source.getAttribute('span'), 1, 1, MAX_COLSPAN);
		ranges.push({ source, left, right: left + span });
		left += span;
	};

	for (const child of findChildren(table, 'colgroup, col')) {
		if (child.localName === 'col') {
			append(child);
			continue;
		}

		const cols = findChildren(child, 'col');
		if (cols.length === 0) {
			append(child);
			continue;
		}

		for (const col of cols) {
			append(col);
		}
	}

	return ranges;
}

/**
 * Calculates the base (expected) column count from the rows of a row group.
 *
 * For groups with 3 or more rows, uses the row width closest to the average so a
 * single malformed row does not become the baseline. Otherwise uses the first row.
 *
 * @param rows - The rows of a row group.
 * @returns The base number of columns.
 */
function getBaseColLength(rows: readonly Row[]) {
	if (rows.length < 3) {
		return rows[0]?.slots.length ?? 0;
	}

	let totalCols = 0;
	for (const row of rows) {
		totalCols += row.slots.length;
	}

	const average = Math.round(totalCols / rows.length);

	let closest = rows[0]?.slots.length ?? 0;
	for (const row of rows) {
		if (Math.abs(row.slots.length - average) < Math.abs(closest - average)) {
			closest = row.slots.length;
		}
	}

	return closest;
}

/**
 * Parses a `colspan` / `rowspan` / `span` attribute value the way HTML LS does:
 * a missing or unparseable value falls back to the default, and a parsed value is
 * clamped to the range the spec allows.
 *
 * @param value - The raw attribute value.
 * @param fallback - The value to use when the attribute is absent or unparseable.
 * @param min - The lower bound of the clamp range.
 * @param max - The upper bound of the clamp range.
 * @returns The effective span.
 */
function parseSpan(value: string | null | undefined, fallback: number, min: number, max: number) {
	if (value == null) {
		return fallback;
	}

	const digits = /^[\t\n\f\r ]*(\d+)/.exec(value);
	if (!digits?.[1]) {
		return fallback;
	}

	return Math.min(Math.max(Number.parseInt(digits[1], 10), min), max);
}

/**
 * Runs the spec's *algorithm for processing rows* over one row group.
 *
 * @param groupElement - The `<thead>` / `<tbody>` / `<tfoot>` element.
 * @param initialXwidth - The table's xwidth before this group is processed.
 * @returns The modelled row group and the xwidth the group grew the table to.
 */
function processRowGroup(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	groupElement: Element<boolean>,
	initialXwidth: number,
) {
	const rowElements = findChildren(groupElement, 'tr');
	const rowCount = rowElements.length;

	/** The anchor covering each slot, keyed by `"row:column"`. */
	const covered = new Map<string, Anchor>();
	/** Slots a second cell tried to cover (spec Step 14). */
	const overlapped = new Set<string>();
	const anchors: Anchor[] = [];
	const overflows: Anchor[] = [];
	const widths: number[] = [];
	const anchorCounts: number[] = [];

	let xwidth = initialXwidth;

	for (const [y, rowElement] of rowElements.entries()) {
		let xcurrent = 0;
		let anchorCount = 0;

		for (const cell of findChildren(rowElement, 'th, td')) {
			const colspan = parseSpan(cell.getAttribute('colspan'), 1, 1, MAX_COLSPAN);
			const declaredRowspan = parseSpan(cell.getAttribute('rowspan'), 1, 0, MAX_ROWSPAN);
			const growsDownward = declaredRowspan === 0;
			const rowspan = growsDownward ? Math.max(rowCount - y, 1) : declaredRowspan;

			// Step 6
			while (xcurrent < xwidth && covered.has(`${y}:${xcurrent}`)) {
				xcurrent += 1;
			}

			// Step 7
			if (xcurrent === xwidth) {
				xwidth += 1;
			}

			// Step 11
			xwidth = Math.max(xwidth, xcurrent + colspan);

			const anchor: Anchor = { cell, x: xcurrent, y, colspan, rowspan, growsDownward };
			anchors.push(anchor);
			anchorCount += 1;

			// Steps 13 and 14. The bottom is clipped to the row group per *ending a row group*.
			const bottom = Math.min(y + rowspan, rowCount);
			for (let cy = y; cy < bottom; cy++) {
				for (let cx = xcurrent; cx < xcurrent + colspan; cx++) {
					const key = `${cy}:${cx}`;
					if (covered.has(key)) {
						overlapped.add(key);
						continue;
					}
					covered.set(key, anchor);
				}
			}

			if (!growsDownward && y + rowspan > rowCount) {
				overflows.push(anchor);
			}

			xcurrent += colspan;
		}

		// The row is as wide as its own cells plus the run of continuing spans that follows them.
		while (covered.has(`${y}:${xcurrent}`)) {
			xcurrent += 1;
		}

		widths[y] = xcurrent;
		anchorCounts[y] = anchorCount;
	}

	const rows: Row[] = rowElements.map((element, y) => {
		const slots: CellType[] = [];

		for (let x = 0; x < (widths[y] ?? 0); x++) {
			const key = `${y}:${x}`;

			if (overlapped.has(key)) {
				slots.push('x');
				continue;
			}

			const anchor = covered.get(key);
			if (!anchor) {
				continue;
			}

			slots.push(
				anchor.x === x && anchor.y === y
					? anchor.colspan > 1 || anchor.rowspan > 1
						? '◎'
						: '●'
					: anchor.y === y
						? '→'
						: '↓',
			);
		}

		return { element, slots, anchorCount: anchorCounts[y] ?? 0 };
	});

	return {
		rowGroup: {
			tagName: groupElement.localName,
			rows,
			anchors,
			overflows,
			hasOverlap: overlapped.size > 0,
		} satisfies RowGroup,
		xwidth,
	};
}
