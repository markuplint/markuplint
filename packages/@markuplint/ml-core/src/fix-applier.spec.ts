import type { FixData } from '@markuplint/ml-config';

import { describe, test, expect } from 'vitest';

import { applyFixes } from './fix-applier.js';

describe('applyFixes', () => {
	test('empty fixes returns source unchanged', () => {
		const result = applyFixes('hello world', []);
		expect(result.output).toBe('hello world');
		expect(result.applied).toStrictEqual([]);
		expect(result.skipped).toStrictEqual([]);
	});

	test('single edit: replace', () => {
		const fix: FixData = { edits: [{ range: [0, 5], text: 'HELLO' }] };
		const result = applyFixes('hello world', [fix]);
		expect(result.output).toBe('HELLO world');
		expect(result.applied).toStrictEqual([fix]);
		expect(result.skipped).toStrictEqual([]);
	});

	test('single edit: insert (zero-width range)', () => {
		const fix: FixData = { edits: [{ range: [5, 5], text: ',' }] };
		const result = applyFixes('hello world', [fix]);
		expect(result.output).toBe('hello, world');
		expect(result.applied).toStrictEqual([fix]);
	});

	test('single edit: delete (empty text)', () => {
		const fix: FixData = { edits: [{ range: [5, 6], text: '' }] };
		const result = applyFixes('hello world', [fix]);
		expect(result.output).toBe('helloworld');
		expect(result.applied).toStrictEqual([fix]);
	});

	test('multiple non-overlapping edits', () => {
		const fix1: FixData = { edits: [{ range: [0, 5], text: 'HELLO' }] };
		const fix2: FixData = { edits: [{ range: [6, 11], text: 'WORLD' }] };
		const result = applyFixes('hello world', [fix1, fix2]);
		expect(result.output).toBe('HELLO WORLD');
		expect(result.applied).toStrictEqual([fix1, fix2]);
		expect(result.skipped).toStrictEqual([]);
	});

	test('overlapping edits: second is skipped', () => {
		const fix1: FixData = { edits: [{ range: [0, 7], text: 'HELLO' }] };
		const fix2: FixData = { edits: [{ range: [5, 11], text: 'WORLD' }] };
		const result = applyFixes('hello world', [fix1, fix2]);
		// cspell:disable-next-line
		expect(result.output).toBe('HELLOorld');
		expect(result.applied).toStrictEqual([fix1]);
		expect(result.skipped).toStrictEqual([fix2]);
	});

	test('multiple edits within one FixData', () => {
		const fix: FixData = {
			edits: [
				{ range: [0, 1], text: 'H' },
				{ range: [6, 7], text: 'W' },
			],
		};
		const result = applyFixes('hello world', [fix]);
		expect(result.output).toBe('Hello World');
		expect(result.applied).toStrictEqual([fix]);
	});

	test('adjacent edits (touching ranges) are both applied', () => {
		const fix1: FixData = { edits: [{ range: [0, 5], text: 'HELLO' }] };
		const fix2: FixData = { edits: [{ range: [5, 6], text: '_' }] };
		const result = applyFixes('hello world', [fix1, fix2]);
		expect(result.output).toBe('HELLO_world');
		expect(result.applied).toStrictEqual([fix1, fix2]);
	});

	test('FixData with partial overlap: entire FixData is skipped', () => {
		// fix1 has two edits: one at [0,3] and one at [5,8]
		// fix2 overlaps with fix1's second edit at [6,9]
		const fix1: FixData = {
			edits: [
				{ range: [0, 3], text: 'AAA' },
				{ range: [5, 8], text: 'BBB' },
			],
		};
		const fix2: FixData = { edits: [{ range: [6, 9], text: 'CCC' }] };
		const result = applyFixes('0123456789', [fix1, fix2]);
		expect(result.output).toBe('AAA34BBB89');
		expect(result.applied).toStrictEqual([fix1]);
		expect(result.skipped).toStrictEqual([fix2]);
	});

	test('edits are applied in source order regardless of input order', () => {
		const fix1: FixData = { edits: [{ range: [6, 11], text: 'WORLD' }] };
		const fix2: FixData = { edits: [{ range: [0, 5], text: 'HELLO' }] };
		const result = applyFixes('hello world', [fix1, fix2]);
		expect(result.output).toBe('HELLO WORLD');
		expect(result.applied).toStrictEqual([fix1, fix2]);
	});

	test('empty edits array is classified as applied', () => {
		const fix: FixData = { edits: [] };
		const result = applyFixes('hello world', [fix]);
		expect(result.output).toBe('hello world');
		expect(result.applied).toStrictEqual([fix]);
		expect(result.skipped).toStrictEqual([]);
	});

	test('multibyte characters: offsets are character-based', () => {
		// "こんにちは世界" — each character is 1 unit in JS string index
		const source = 'こんにちは世界';
		const fix: FixData = { edits: [{ range: [5, 7], text: 'ワールド' }] };
		const result = applyFixes(source, [fix]);
		expect(result.output).toBe('こんにちはワールド');
		expect(result.applied).toStrictEqual([fix]);
	});

	test('multiple zero-width inserts at the same position', () => {
		const fix1: FixData = { edits: [{ range: [5, 5], text: 'A' }] };
		const fix2: FixData = { edits: [{ range: [5, 5], text: 'B' }] };
		const result = applyFixes('hello world', [fix1, fix2]);
		// Both are zero-width inserts at position 5. After fix1 inserts 'A',
		// fix2 starts at 5 which equals lastAppliedEnd (5), so it is also applied.
		expect(result.output).toBe('helloAB world');
		expect(result.applied).toStrictEqual([fix1, fix2]);
	});
});

describe('applyFixes appliedEdits', () => {
	test('empty fixes returns empty appliedEdits', () => {
		const result = applyFixes('hello world', []);
		expect(result.appliedEdits).toStrictEqual([]);
	});

	test('appliedEdits is sorted by range[0] ascending', () => {
		const fix1: FixData = { edits: [{ range: [6, 11], text: 'WORLD' }] };
		const fix2: FixData = { edits: [{ range: [0, 5], text: 'HELLO' }] };
		const result = applyFixes('hello world', [fix1, fix2]);
		// Edits are sorted internally, so appliedEdits should be in source order
		expect(result.appliedEdits).toStrictEqual([
			{ range: [0, 5], text: 'HELLO' },
			{ range: [6, 11], text: 'WORLD' },
		]);
	});

	test('appliedEdits excludes skipped edits', () => {
		const fix1: FixData = { edits: [{ range: [0, 7], text: 'HELLO' }] };
		const fix2: FixData = { edits: [{ range: [5, 11], text: 'WORLD' }] };
		const result = applyFixes('hello world', [fix1, fix2]);
		// fix2 is skipped due to overlap
		expect(result.appliedEdits).toStrictEqual([{ range: [0, 7], text: 'HELLO' }]);
		expect(result.skipped).toStrictEqual([fix2]);
	});

	test('appliedEdits contains all edits from multi-edit FixData', () => {
		const fix: FixData = {
			edits: [
				{ range: [0, 1], text: 'H' },
				{ range: [6, 7], text: 'W' },
			],
		};
		const result = applyFixes('hello world', [fix]);
		expect(result.appliedEdits).toStrictEqual([
			{ range: [0, 1], text: 'H' },
			{ range: [6, 7], text: 'W' },
		]);
	});
});

describe('applyFixes edge cases', () => {
	test('edit at end of source string (append)', () => {
		const fix: FixData = { edits: [{ range: [11, 11], text: '!' }] };
		const result = applyFixes('hello world', [fix]);
		expect(result.output).toBe('hello world!');
		expect(result.applied).toStrictEqual([fix]);
	});

	test('edit replacing entire source', () => {
		const fix: FixData = { edits: [{ range: [0, 11], text: 'goodbye' }] };
		const result = applyFixes('hello world', [fix]);
		expect(result.output).toBe('goodbye');
		expect(result.applied).toStrictEqual([fix]);
	});
});
