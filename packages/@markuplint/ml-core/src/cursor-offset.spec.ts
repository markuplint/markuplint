import type { TextEdit } from '@markuplint/ml-config';

import { describe, test, expect } from 'vitest';

import { computeCursorOffset } from './cursor-offset.js';

describe('computeCursorOffset', () => {
	test('no edits → offset unchanged', () => {
		expect(computeCursorOffset([], 10)).toBe(10);
	});

	test('insert before cursor → shifts right', () => {
		// Insert "abc" at position 2 (zero-width range)
		const edits: TextEdit[] = [{ range: [2, 2], text: 'abc' }];
		// Cursor at 5: delta = 3 - 0 = 3, newOffset = 5 + 3 = 8
		expect(computeCursorOffset(edits, 5)).toBe(8);
	});

	test('delete before cursor → shifts left', () => {
		// Delete range [2, 5) (3 chars)
		const edits: TextEdit[] = [{ range: [2, 5], text: '' }];
		// Cursor at 8: delta = 0 - 3 = -3, newOffset = 8 - 3 = 5
		expect(computeCursorOffset(edits, 8)).toBe(5);
	});

	test('replace before cursor (length change) → delta shift', () => {
		// Replace range [0, 5) with "HELLO WORLD" (11 chars replacing 5)
		const edits: TextEdit[] = [{ range: [0, 5], text: 'HELLO WORLD' }];
		// Cursor at 7: delta = 11 - 5 = 6, newOffset = 7 + 6 = 13
		expect(computeCursorOffset(edits, 7)).toBe(13);
	});

	test('edit after cursor → no change', () => {
		const edits: TextEdit[] = [{ range: [10, 15], text: 'XYZ' }];
		// Cursor at 5: edit starts at 10 > 5, so break immediately
		expect(computeCursorOffset(edits, 5)).toBe(5);
	});

	test('cursor inside replaced range → placed at end of replacement', () => {
		// Replace range [3, 8) with "AB"
		const edits: TextEdit[] = [{ range: [3, 8], text: 'AB' }];
		// Cursor at 5: falls inside [3, 8), so newOffset = 3 + 2 = 5
		expect(computeCursorOffset(edits, 5)).toBe(5);
		// Cursor at 6: also inside [3, 8)
		expect(computeCursorOffset(edits, 6)).toBe(5);
	});

	test('multiple edits cumulative delta', () => {
		const edits: TextEdit[] = [
			{ range: [0, 3], text: 'A' }, // delta = 1 - 3 = -2
			{ range: [5, 5], text: 'BB' }, // delta = 2 - 0 = +2
			{ range: [10, 12], text: 'CCC' }, // delta = 3 - 2 = +1
		];
		// Cursor at 15: all edits before cursor
		// newOffset = 15 + (-2) + 2 + 1 = 16
		expect(computeCursorOffset(edits, 15)).toBe(16);
	});

	test('cursor at 0 edge case', () => {
		// Insert at position 0
		const edits: TextEdit[] = [{ range: [0, 0], text: 'PREFIX' }];
		// Cursor at 0: end (0) <= cursorOffset (0), so shift by delta = 6
		expect(computeCursorOffset(edits, 0)).toBe(6);
	});
});
