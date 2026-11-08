import { describe, expect, test } from 'vitest';

import { getSelectDisplaySize, parseNonNegativeInteger } from './select-display-size.js';

describe('parseNonNegativeInteger', () => {
	test.each([
		['0', 0],
		['1', 1],
		['01', 1],
		['12', 12],
		[' 3', 3],
		['\t\n\f\r 3', 3],
		['+3', 3],
		['-0', 0],
		['+0', 0],
		['-00', 0],
		[' -0', 0],
		['2abc', 2],
		['2.5', 2],
	])('%j is read as %d', (text, expected) => {
		expect(parseNonNegativeInteger(text)).toBe(expected);
	});

	test.each([
		['-1'],
		['abc'],
		[''],
		[' '],
		['+'],
		['a1'],
		[null],
		// Only ASCII whitespace is skipped, and only ASCII digits are digits
		[' 3'],
		['　3'],
		['３'],
		['٣'],
	])('%j is an error', text => {
		expect(parseNonNegativeInteger(text)).toBeNull();
	});
});

describe('getSelectDisplaySize', () => {
	test.each([
		[null, false, 1],
		[null, true, 4],
		['abc', false, 1],
		['abc', true, 4],
		['-1', false, 1],
		['-1', true, 4],
		['', true, 4],
		['0', false, 0],
		['0', true, 0],
		['1', true, 1],
		['2', false, 2],
		['01', false, 1],
		[' 3', false, 3],
	])('size=%j, multiple=%j is %d', (size, hasMultiple, expected) => {
		expect(getSelectDisplaySize(size, hasMultiple)).toBe(expected);
	});
});
