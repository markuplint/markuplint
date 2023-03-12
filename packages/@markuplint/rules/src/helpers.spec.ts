// @ts-nocheck

import { decodeCharRef } from './helpers';

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
