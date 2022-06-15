import specs from '@markuplint/html-spec';

import { checkAria, checkAriaValue, decodeCharRef } from './helpers';

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
});

describe('checkAria', () => {
	test('aria-activedescendant', () => {
		expect(checkAria(specs, 'aria-activedescendant', 'foo').isValid).toBe(true);
		expect(checkAria(specs, 'aria-activedescendant', '').isValid).toBe(true);
	});

	test('aria-atomic', () => {
		expect(checkAria(specs, 'aria-atomic', '').isValid).toBe(false);
		expect(checkAria(specs, 'aria-atomic', 'true').isValid).toBe(true);
		expect(checkAria(specs, 'aria-atomic', 'false').isValid).toBe(true);
		expect(checkAria(specs, 'aria-atomic', 'undefined').isValid).toBe(false);
	});

	test('aria-autocomplete', () => {
		expect(checkAria(specs, 'aria-autocomplete', '').isValid).toBe(false);
		expect(checkAria(specs, 'aria-autocomplete', 'inline').isValid).toBe(true);
		expect(checkAria(specs, 'aria-autocomplete', 'list').isValid).toBe(true);
		expect(checkAria(specs, 'aria-autocomplete', 'both').isValid).toBe(true);
		expect(checkAria(specs, 'aria-autocomplete', 'none').isValid).toBe(true);
		expect(checkAria(specs, 'aria-autocomplete', 'foo').isValid).toBe(false);
	});
});

describe('decodeCharRef', () => {
	test('decode', () => {
		expect(decodeCharRef('&#8226;')).toBe('\u2022');
		expect(decodeCharRef('&bull;')).toBe('\u2022');
		expect(decodeCharRef('&bullet;')).toBe('\u2022');
		expect(decodeCharRef('&#8227;')).toBe('\u2023');
		expect(decodeCharRef('&#8259;')).toBe('\u2043');
		expect(decodeCharRef('&hybull;')).toBe('\u2043');
	});
});
