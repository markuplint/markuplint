import { test, expect } from 'vitest';

import {
	toNoEmptyStringArrayFromStringOrArray,
	decodeEntities,
	branchesToPatterns,
	regexParser,
	asciiLowerCase,
	splitOnAsciiWhitespace,
	trimAsciiWhitespace,
	hasText,
	isValidInteger,
	isValidFloatingPointNumber,
} from './functions.js';

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

test.each([
	['&#xD800;', '\uFFFD'],
	['&#55296;', '\uFFFD'],
	['&#xdfff;', '\uFFFD'],
	['&#57343;', '\uFFFD'],
	['&#xD7FF;', '\uD7FF'],
	['&#xE000;', '\uE000'],
	['&#x1F600;', '\u{1F600}'],
])('decodeEntities makes U+FFFD of a reference to a surrogate, as the tokenizer does: %j', (text, decoded) => {
	expect(decodeEntities(text)).toBe(decoded);
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

test('asciiLowerCase', () => {
	expect(asciiLowerCase('ARIA-Label')).toBe('aria-label');
	expect(asciiLowerCase('viewBox')).toBe('viewbox');
	// Nothing to fold: the same string
	expect(asciiLowerCase('data-x')).toBe('data-x');
	expect(asciiLowerCase('')).toBe('');
	// Only A-Z fold: U+212A KELVIN SIGN is not an ASCII `K`, and a non-ASCII upper-case letter stays
	const kelvin = String.fromCodePoint(8490);
	expect(asciiLowerCase(`x-${kelvin}`)).toBe(`x-${kelvin}`);
	expect(asciiLowerCase('\u00C9A')).toBe('\u00C9a');
});

test('splitOnAsciiWhitespace', () => {
	expect(splitOnAsciiWhitespace('a b')).toStrictEqual(['a', 'b']);
	expect(splitOnAsciiWhitespace(' \t\n\f\r a \t\n\f\r b \t\n\f\r ')).toStrictEqual(['a', 'b']);
	expect(splitOnAsciiWhitespace('')).toStrictEqual([]);
	expect(splitOnAsciiWhitespace(' \t ')).toStrictEqual([]);
	// U+000B (vertical tab) is not ASCII white space
	expect(splitOnAsciiWhitespace('a\u000Bb')).toStrictEqual(['a\u000Bb']);
	// Only the five ASCII white space characters separate: U+00A0, U+2028 and U+FEFF stay in a token
	expect(splitOnAsciiWhitespace('a\u00A0b c')).toStrictEqual(['a\u00A0b', 'c']);
	expect(splitOnAsciiWhitespace('\u00A0a\u2028 \uFEFFb')).toStrictEqual(['\u00A0a\u2028', '\uFEFFb']);
});

test('trimAsciiWhitespace', () => {
	const nbsp = String.fromCodePoint(160);
	expect(trimAsciiWhitespace(' \t\n\f\ra b\r\f\n\t ')).toBe('a b');
	expect(trimAsciiWhitespace('')).toBe('');
	// `String#trim` removes U+00A0, which is part of the value as the HTML syntax reads it
	expect(trimAsciiWhitespace(`${nbsp}a${nbsp}`)).toBe(`${nbsp}a${nbsp}`);
	// U+000B is removed by `String#trim`, and is not ASCII white space
	expect(trimAsciiWhitespace('\u000Ba\u000B')).toBe('\u000Ba\u000B');
	expect(trimAsciiWhitespace(`  a${' '.repeat(5)}b  `)).toBe(`a${' '.repeat(5)}b`);
	expect(trimAsciiWhitespace(' \t\n\f\r ')).toBe('');
});

test('hasText', () => {
	const nonAscii = '\u00A0\u2028\uFEFF';
	expect(hasText(null)).toBe(false);
	expect(hasText()).toBe(false);
	expect(hasText('')).toBe(false);
	expect(hasText(' \t\n\f\r ')).toBe(false);
	expect(hasText('a')).toBe(true);
	// `String#trim` takes these for white space, but they are characters of the value
	expect(hasText(nonAscii)).toBe(true);
	expect(hasText('\u000B')).toBe(true);
});

test.each(['0', '1', '-1', '05', '1234567890123456789012'])('isValidInteger: %j is valid', value => {
	expect(isValidInteger(value)).toBe(true);
});

test.each(['', '-', '+1', '1.0', '1.', '.5', '1e2', '1a', 'a1', ' 1', '1 ', '1\n', '\u00A01', '1\u00A0', '１', '0x10'])(
	'isValidInteger: %j is not valid',
	value => {
		expect(isValidInteger(value)).toBe(false);
	},
);

test.each(['0', '1', '-1', '05', '1.5', '5.0', '.5', '-.5', '1e2', '1E+2', '1.5e-3', '.5e1'])(
	'isValidFloatingPointNumber: %j is valid',
	value => {
		expect(isValidFloatingPointNumber(value)).toBe(true);
	},
);

test.each([
	'',
	'-',
	'--1',
	'+1',
	'1.',
	'.',
	'-.',
	'1e',
	'1e+',
	'1e2.5',
	'1.5.5',
	'1a',
	'a1',
	' 1',
	'1 ',
	'1\n',
	'\u00A01',
	'1\u00A0',
	'１',
	'0x10',
	'NaN',
	'Infinity',
])('isValidFloatingPointNumber: %j is not valid', value => {
	expect(isValidFloatingPointNumber(value)).toBe(false);
});
