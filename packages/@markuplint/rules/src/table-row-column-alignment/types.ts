/**
 * Represents what covers one slot of the table grid.
 *
 * - `'●'` - A cell is anchored here and spans nothing else.
 * - `'◎'` - A cell is anchored here and spans further columns and/or rows.
 * - `'↓'` - Covered by a cell anchored in an earlier row.
 * - `'→'` - Covered by a cell anchored earlier in the same row.
 * - `'x'` - Covered by more than one cell (HTML LS §4.9.12.1 Step 14).
 */
export type CellType = '●' | '◎' | '↓' | '→' | 'x';
