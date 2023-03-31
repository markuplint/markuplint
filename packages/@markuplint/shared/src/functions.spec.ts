// @ts-nocheck

import { toNoEmptyStringArrayFromStringOrArray } from './functions';

test('toArrayFromStringOrArray', () => {
	expect(toNoEmptyStringArrayFromStringOrArray('')).toStrictEqual([]);
	expect(toNoEmptyStringArrayFromStringOrArray('a')).toStrictEqual(['a']);
	expect(toNoEmptyStringArrayFromStringOrArray(['a'])).toStrictEqual(['a']);
	expect(toNoEmptyStringArrayFromStringOrArray(['a', 'b'])).toStrictEqual(['a', 'b']);
	expect(toNoEmptyStringArrayFromStringOrArray(['', ''])).toStrictEqual([]);
});
