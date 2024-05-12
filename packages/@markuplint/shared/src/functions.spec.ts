import { test, expect } from 'vitest';

import { toNoEmptyStringArrayFromStringOrArray, decodeEntities, branchesToPatterns, regexParser } from './functions.js';

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

test('branchesToPatterns', () => {
	expect(branchesToPatterns([])).toStrictEqual([[]]);
	expect(branchesToPatterns([1])).toStrictEqual([[1]]);
	expect(branchesToPatterns([1, [2]])).toStrictEqual([[1, 2]]);
	expect(branchesToPatterns([1, [2, 3]])).toStrictEqual([
		[1, 2],
		[1, 3],
	]);
	expect(branchesToPatterns([1, [2, 3], 4])).toStrictEqual([
		[1, 2, 4],
		[1, 3, 4],
	]);
	expect(branchesToPatterns([1, [2, undefined], 3])).toStrictEqual([
		[1, 2, 3],
		[1, 3],
	]);
	expect(branchesToPatterns([1, [2, 3], [4, 5]])).toStrictEqual([
		[1, 2, 4],
		[1, 3, 4],
		[1, 2, 5],
		[1, 3, 5],
	]);
	expect(branchesToPatterns([1, [2, 3], [4, 5], 6])).toStrictEqual([
		[1, 2, 4, 6],
		[1, 3, 4, 6],
		[1, 2, 5, 6],
		[1, 3, 5, 6],
	]);
	expect(
		branchesToPatterns([
			[1, 2],
			[3, 4],
		]),
	).toStrictEqual([
		[1, 3],
		[2, 3],
		[1, 4],
		[2, 4],
	]);
	expect(
		branchesToPatterns([
			[1, 2],
			[3, 4],
			[5, 6],
		]),
	).toStrictEqual([
		[1, 3, 5],
		[2, 3, 5],
		[1, 4, 5],
		[2, 4, 5],
		[1, 3, 6],
		[2, 3, 6],
		[1, 4, 6],
		[2, 4, 6],
	]);
	expect(branchesToPatterns([1, [], 2])).toStrictEqual([[1, 2]]);
});

test('regexParser', () => {
	expect(regexParser('/[a-z]/')).toBeInstanceOf(RegExp);
	expect(regexParser('/[a-z]/')!.source).toBe('[a-z]');
	expect(regexParser('/[a-z]/')!.flags).toBe('');
	expect(regexParser('/[a-z]/g')!.flags).toBe('g');
	expect(regexParser('/[a-z]/i')!.flags).toBe('i');
	expect(regexParser('/[a-z]/u')!.flags).toBe('u');
	expect(regexParser('/[a-z]/y')!.flags).toBe('y');
	expect(regexParser('/[a-z]/m')!.flags).toBe('m');
	expect(regexParser('/[a-z]/s')!.flags).toBe('s');
	expect(regexParser('/[a-z]/d')!.flags).toBe('d');
	expect(regexParser('//')).toBeNull();
	expect(regexParser('/')).toBeNull();
	expect(regexParser('/[a-z]')).toBeNull();
	expect(regexParser('[a-z]/')).toBeNull();
	expect(regexParser(' ')).toBeNull();
	expect(regexParser(' // ')).toBeNull();
});
