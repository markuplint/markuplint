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

	test('valid: CSS named color', () => {
		expect(check('red', 'SimpleColor').matched).toBe(true);
	});

	test('valid: shorthand hex', () => {
		expect(check('#f00', 'SimpleColor').matched).toBe(true);
	});

	test('valid: 8-digit hex (alpha)', () => {
		expect(check('#ff000080', 'SimpleColor').matched).toBe(true);
	});

	test('valid: rgb() function', () => {
		expect(check('rgb(255, 0, 0)', 'SimpleColor').matched).toBe(true);
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

describe('SimpleColor (CSS color)', () => {
	test.each([
		'#f008',
		'RED',
		'transparent',
		'currentcolor',
		'Canvas',
		'rgb(255 0 0 / 50%)',
		'hsl(0 100% 50%)',
		'hwb(0 0% 0%)',
		'lab(50% 40 59.5)',
		'oklch(0.5 0.2 30)',
		'color(display-p3 1 0 0)',
	])('valid CSS color: %s', value => {
		expect(check(value, 'SimpleColor').matched).toBe(true);
	});

	test.each(['#ff000', '#ff00000', 'rgb(1 2)', 'notacolor', '1px', 'red blue'])('invalid: %s', value => {
		expect(check(value, 'SimpleColor').matched).toBe(false);
	});
});
