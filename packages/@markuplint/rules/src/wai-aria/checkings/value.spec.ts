import { describe, test, expect } from 'vitest';

import { checkAriaValue } from './value.js';

describe('checkAriaValue', () => {
	test('token', () => {
		expect(checkAriaValue('token', 'a', ['a'])).toBe(true);
		expect(checkAriaValue('token', 'a', ['b'])).toBe(false);
	});

	test('token list', () => {
		expect(checkAriaValue('token list', 'a', ['a'])).toBe(true);
		expect(checkAriaValue('token list', 'a', ['b'])).toBe(false);
		expect(checkAriaValue('token list', 'a b', ['a'])).toBe(false);
		expect(checkAriaValue('token list', 'a b', ['b'])).toBe(false);
		expect(checkAriaValue('token list', 'a b', ['a', 'b'])).toBe(true);
		expect(checkAriaValue('token list', 'a b', ['a', 'b', 'c'])).toBe(true);
		expect(checkAriaValue('token list', 'a b d', ['a', 'b', 'c'])).toBe(false);
	});

	test('token list is split on ASCII white space only', () => {
		expect(checkAriaValue('token list', 'a\tb\nc', ['a', 'b', 'c'])).toBe(true);
		expect(checkAriaValue('token list', ' a ', ['a'])).toBe(true);
		expect(checkAriaValue('token list', '', ['a'])).toBe(false);
		expect(checkAriaValue('token list', ' ', ['a'])).toBe(false);
		expect(checkAriaValue('token list', 'a\u00A0b', ['a', 'b'])).toBe(false);
		expect(checkAriaValue('token list', 'a\u00A0b', ['a\u00A0b'])).toBe(true);
	});

	test('integer', () => {
		expect(checkAriaValue('integer', '1', [])).toBe(true);
		expect(checkAriaValue('integer', '-1', [])).toBe(true);
		expect(checkAriaValue('integer', '-1.1', [])).toBe(false);
		expect(checkAriaValue('integer', '-1.1', [])).toBe(false);
	});

	test('number', () => {
		expect(checkAriaValue('number', '1', [])).toBe(true);
		expect(checkAriaValue('number', '-1', [])).toBe(true);
		expect(checkAriaValue('number', '-1.1', [])).toBe(true);
		expect(checkAriaValue('number', '-1.1', [])).toBe(true);
		expect(checkAriaValue('number', '-1.1.1', [])).toBe(false);
	});

	test.each(['5.0', '05', '.5', '1e2', '1.5E-3'])('%j is a valid floating-point number', value => {
		expect(checkAriaValue('number', value, [])).toBe(true);
	});

	test.each(['5.', '+5', '5abc', '\u00A05', '5\u00A0', '', 'Infinity'])(
		'%j is not a valid floating-point number',
		value => {
			expect(checkAriaValue('number', value, [])).toBe(false);
		},
	);

	test.each(['5', '05', '-5'])('%j is a valid integer', value => {
		expect(checkAriaValue('integer', value, [])).toBe(true);
	});

	test.each(['5.0', '5abc', '+5', '\u00A05', '5\u00A0', ''])('%j is not a valid integer', value => {
		expect(checkAriaValue('integer', value, [])).toBe(false);
	});
});

describe('checkAriaValue reads a value as the computed ARIA props read it', () => {
	test.each([
		['true/false', ' TRUE ', false],
		['integer', ' 5 ', true],
		['URI', '', false],
		['ID reference', 'a b', false],
		['unknown', 'x', true],
	])('%s %j is %j', (type, value, valid) => {
		expect(checkAriaValue(type, value, [])).toBe(valid);
	});
});
