import type { TextEdit } from '@markuplint/ml-config';

/**
 * Computes the new cursor offset after text edits have been applied.
 *
 * For each edit before the cursor: delta += text.length - (end - start).
 * If the cursor falls inside a replaced range [start, end), it is placed
 * at start + text.length (immediately after the replacement).
 *
 * @param appliedEdits - Applied edits sorted by range[0] ascending
 * @param cursorOffset - Original 0-based cursor offset
 * @returns New cursor offset in the fixed code
 */
export function computeCursorOffset(appliedEdits: readonly TextEdit[], cursorOffset: number): number {
	let newOffset = cursorOffset;

	for (const edit of appliedEdits) {
		const [start, end] = edit.range;
		const delta = edit.text.length - (end - start);

		if (start > cursorOffset) {
			break;
		}

		if (end <= cursorOffset) {
			// Range is half-open [start, end), so cursor at `end` is outside the edit.
			newOffset += delta;
		} else {
			newOffset = start + edit.text.length;
			break;
		}
	}

	// Defensive guard: should never go negative with well-formed, non-overlapping edits
	return Math.max(0, newOffset);
}
