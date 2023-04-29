// @ts-nocheck

import { toNoEmptyStringArrayFromStringOrArray, decodeEntities } from './functions';

test('toArrayFromStringOrArray', () => {
	expect(toNoEmptyStringArrayFromStringOrArray('')).toStrictEqual([]);
	expect(toNoEmptyStringArrayFromStringOrArray('a')).toStrictEqual(['a']);
	expect(toNoEmptyStringArrayFromStringOrArray(['a'])).toStrictEqual(['a']);
	expect(toNoEmptyStringArrayFromStringOrArray(['a', 'b'])).toStrictEqual(['a', 'b']);
	expect(toNoEmptyStringArrayFromStringOrArray(['', ''])).toStrictEqual([]);
});

test('decodeEntities', () => {
	expect(decodeEntities('&#8226;')).toBe('\u2022');
	expect(decodeEntities('&bull;')).toBe('\u2022');
	expect(decodeEntities('&bullet;')).toBe('\u2022');
	expect(decodeEntities('&#8227;')).toBe('\u2023');
	expect(decodeEntities('&#8259;')).toBe('\u2043');
	expect(decodeEntities('&hybull;')).toBe('\u2043');
});
