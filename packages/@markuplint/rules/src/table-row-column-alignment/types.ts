/** A grid cell coordinate key in "row:column" format. */
export type Key = `${number}:${number}`;

/**
 * Represents the type of a cell in the table grid model.
 *
 * - `'●'` - A regular cell (single-span).
 * - `'◎'` - The origin cell of a colspan or rowspan.
 * - `'↓'` - A cell occupied by a rowspan from a row above.
 * - `'→'` - A cell occupied by a colspan from a column to the left.
 * - `'x'` - An overlapping cell caused by conflicting spans.
 */
export type CellType = '●' | '◎' | '↓' | '→' | 'x';
