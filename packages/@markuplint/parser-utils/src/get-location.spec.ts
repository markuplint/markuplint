import { describe, test, expect } from 'vitest';

import { getEndCol, getEndLine } from './get-location.js';

describe('getEndLine', () => {
	test('empty', () => {
		expect(getEndLine('', 1)).toBe(1);
		expect(getEndLine('', 3)).toBe(3);
	});

	test('basic', () => {
		expect(getEndLine('\n\n', 2)).toBe(4);
		expect(getEndLine('\n\n', 4)).toBe(6);
		expect(getEndLine('\n\n  \n  \n  foo', 1)).toBe(5);
		expect(getEndLine('\n\n  \n  \n  foo', 6)).toBe(10);
	});
});

describe('getEndCol', () => {
	test('empty', () => {
		expect(getEndCol('', 1)).toBe(1);
		expect(getEndCol('', 3)).toBe(3);
	});

	test('basic', () => {
		expect(getEndCol('  ', 2)).toBe(4);
		expect(getEndCol('  ', 4)).toBe(6);
		expect(getEndCol('foo bar', 1)).toBe(8);
		expect(getEndCol('foo bar', 6)).toBe(13);
	});

	test('with line break', () => {
		expect(getEndCol('foo bar\n', 4)).toBe(1);
		expect(getEndCol('foo bar\n', 4)).toBe(1);
		expect(getEndCol('foo bar\n  ', 4)).toBe(3);
		expect(getEndCol('foo bar\n  ', 4)).toBe(3);
		expect(getEndCol('foo bar\nfoo bar', 1)).toBe(8);
		expect(getEndCol('foo bar\nfoo bar', 6)).toBe(8);
	});
});
