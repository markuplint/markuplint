import { test, expect, describe } from 'vitest';

import { check } from '../check.js';

describe('SimpleColor', () => {
	test('valid: lowercase hex', () => {
		expect(check('#000000', 'SimpleColor').matched).toBe(true);
	});

	test('valid: uppercase hex', () => {
		expect(check('#FF0000', 'SimpleColor').matched).toBe(true);
	});

	test('valid: mixed case hex', () => {
		expect(check('#aaBB00', 'SimpleColor').matched).toBe(true);
	});

	test('invalid: CSS named color', () => {
		expect(check('red', 'SimpleColor').matched).toBe(false);
	});

	test('invalid: shorthand hex', () => {
		expect(check('#f00', 'SimpleColor').matched).toBe(false);
	});

	test('invalid: 8-digit hex (alpha)', () => {
		expect(check('#ff000080', 'SimpleColor').matched).toBe(false);
	});

	test('invalid: rgb() function', () => {
		expect(check('rgb(255, 0, 0)', 'SimpleColor').matched).toBe(false);
	});

	test('invalid: missing hash', () => {
		expect(check('ff0000', 'SimpleColor').matched).toBe(false);
	});

	test('invalid: empty string', () => {
		expect(check('', 'SimpleColor').matched).toBe(false);
	});

	test('invalid: non-hex characters', () => {
		expect(check('#gggggg', 'SimpleColor').matched).toBe(false);
	});

	test('invalid: with spaces', () => {
		expect(check('# ff0000', 'SimpleColor').matched).toBe(false);
	});
});
