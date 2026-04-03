import { describe, test, expect } from 'vitest';

import { checkAriaValue } from './value.js';

describe('checkAriaValue', () => {
	test('[wai-aria-invalid-001] token', () => {
		expect(checkAriaValue('token', 'a', ['a'])).toBe(true);
		expect(checkAriaValue('token', 'a', ['b'])).toBe(false);
	});

	test('[wai-aria-invalid-002] token list', () => {
		expect(checkAriaValue('token list', 'a', ['a'])).toBe(true);
		expect(checkAriaValue('token list', 'a', ['b'])).toBe(false);
		expect(checkAriaValue('token list', 'a b', ['a'])).toBe(false);
		expect(checkAriaValue('token list', 'a b', ['b'])).toBe(false);
		expect(checkAriaValue('token list', 'a b', ['a', 'b'])).toBe(true);
		expect(checkAriaValue('token list', 'a b', ['a', 'b', 'c'])).toBe(true);
		expect(checkAriaValue('token list', 'a b d', ['a', 'b', 'c'])).toBe(false);
	});

	test('[wai-aria-invalid-003] integer', () => {
		expect(checkAriaValue('integer', '1', [])).toBe(true);
		expect(checkAriaValue('integer', '-1', [])).toBe(true);
		expect(checkAriaValue('integer', '-1.1', [])).toBe(false);
		expect(checkAriaValue('integer', '-1.1', [])).toBe(false);
	});

	test('[wai-aria-invalid-004] number', () => {
		expect(checkAriaValue('number', '1', [])).toBe(true);
		expect(checkAriaValue('number', '-1', [])).toBe(true);
		expect(checkAriaValue('number', '-1.1', [])).toBe(true);
		expect(checkAriaValue('number', '-1.1', [])).toBe(true);
		expect(checkAriaValue('number', '-1.1.1', [])).toBe(false);
	});
});
