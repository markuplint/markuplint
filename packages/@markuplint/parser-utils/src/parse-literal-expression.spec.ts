import { describe, expect, test } from 'vitest';

import { parseLiteralByTokens, parseLiteralExpression } from './parse-literal-expression.js';

describe('parseLiteralExpression', () => {
	describe('string', () => {
		test.each([
			[`"abc"`, 'abc', `"abc"`],
			[`'abc'`, 'abc', `"abc"`],
			['`abc`', 'abc', `"abc"`],
			[`""`, '', `""`],
			[`"true"`, 'true', `"true"`],
			[`"0"`, '0', `"0"`],
			[`"a\\nb"`, 'a\nb', `"a\\nb"`],
			[`"\\u0041"`, 'A', `"A"`],
			[`"\\u{1F600}"`, '\u{1F600}', JSON.stringify('\u{1F600}')],
			[`"a\\\nb"`, 'ab', `"ab"`],
			[`"\\x41"`, 'A', `"A"`],
			['`a\\tb`', 'a\tb', `"a\\tb"`],
			[`"a&amp;b"`, 'a&amp;b', `"a&amp;b"`],
		])('%s', (code, value, key) => {
			expect(parseLiteralExpression(code)).toStrictEqual({ type: 'string', value, key });
		});
	});

	describe('number', () => {
		test.each([
			['0', 0, '0'],
			['42', 42, '42'],
			['-1', -1, '-1'],
			['- 1', -1, '-1'],
			['.5', 0.5, '0.5'],
			['1.50', 1.5, '1.5'],
			['1e3', 1000, '1000'],
			['0x10', 16, '16'],
			['0b11', 3, '3'],
			['0o7', 7, '7'],
			['1_000', 1000, '1000'],
			['0x0', 0, '0'],
			['-0', -0, '0'],
			['-0x10', -16, '-16'],
		])('%s', (code, value, key) => {
			expect(parseLiteralExpression(code)).toStrictEqual({ type: 'number', value, key });
		});

		test.each([
			['12345678901234567890n', '12345678901234567890'],
			['-12345678901234567890n', '-12345678901234567890'],
			['-1n', '-1'],
			['0x10n', '16'],
		])('A BigInt %s keeps its decimal form in the key', (code, key) => {
			const literal = parseLiteralExpression(code);
			expect(literal?.type).toBe('number');
			expect(literal?.key).toBe(key);
		});

		test.each([
			['-.5', -0.5, '-0.5'],
			['.5e1', 5, '5'],
		])('%s', (code, value, key) => {
			expect(parseLiteralExpression(code)).toStrictEqual({ type: 'number', value, key });
		});

		test('A BigInt is a number whose key is its decimal form', () => {
			expect(parseLiteralExpression('1n')).toStrictEqual({ type: 'number', value: 1, key: '1' });
		});

		test('A number beyond the range keeps the string of the number', () => {
			expect(parseLiteralExpression('1e999')).toStrictEqual({ type: 'number', value: Infinity, key: 'Infinity' });
		});
	});

	describe('boolean / null / undefined', () => {
		test('true', () => {
			expect(parseLiteralExpression('true')).toStrictEqual({ type: 'boolean', value: true, key: 'true' });
		});

		test('false', () => {
			expect(parseLiteralExpression('false')).toStrictEqual({ type: 'boolean', value: false, key: 'false' });
		});

		test('null', () => {
			expect(parseLiteralExpression('null')).toStrictEqual({ type: 'null', value: null, key: 'null' });
		});

		test('undefined', () => {
			expect(parseLiteralExpression('undefined')).toStrictEqual({
				type: 'undefined',
				value: undefined,
				key: 'undefined',
			});
		});
	});

	describe('the key tells a literal of one type from another', () => {
		test('true and "true" and 1', () => {
			const keys = ['true', '"true"', '1'].map(code => parseLiteralExpression(code)?.key);
			expect(new Set(keys).size).toBe(3);
		});

		test('0 and "0" and false and null and undefined and ""', () => {
			const keys = ['0', '"0"', 'false', 'null', 'undefined', '""'].map(
				code => parseLiteralExpression(code)?.key,
			);
			expect(new Set(keys).size).toBe(6);
		});

		test('Quotes of a string do not change the key', () => {
			expect(parseLiteralExpression(`'x'`)?.key).toBe(parseLiteralExpression(`"x"`)?.key);
			expect(parseLiteralExpression('`x`')?.key).toBe(parseLiteralExpression(`"x"`)?.key);
		});

		test('Notations of a number do not change the key', () => {
			expect(parseLiteralExpression('0x0')?.key).toBe('0');
			expect(parseLiteralExpression('-0')?.key).toBe('0');
			expect(parseLiteralExpression('1e3')?.key).toBe(parseLiteralExpression('1000')?.key);
		});
	});

	describe('Wrappers', () => {
		test.each([
			['("x")', 'x'],
			['((("x")))', 'x'],
			['  "x"  ', 'x'],
			['"x" as const', 'x'],
			['"x" as string', 'x'],
			['("x") as const', 'x'],
			['("x" as string)', 'x'],
			['"x" satisfies string', 'x'],
			['"x" as string | number', 'x'],
			['"x" as Array<string>', 'x'],
			['"x" as { a: string }', 'x'],
			['"x" as { a: string; b: number }', 'x'],
			['("x" as (string | number))', 'x'],
		])('%s', (code, value) => {
			expect(parseLiteralExpression(code)).toStrictEqual({ type: 'string', value, key: JSON.stringify(value) });
		});

		test('(true) as const', () => {
			expect(parseLiteralExpression('(true) as const')).toStrictEqual({
				type: 'boolean',
				value: true,
				key: 'true',
			});
		});
	});

	describe('Not a literal', () => {
		test.each([
			[''],
			['   '],
			['foo'],
			['foo.bar'],
			['foo()'],
			['"a" + b'],
			['"a" + "b"'],
			['a ? "x" : "y"'],
			['`a${b}c`'],
			['/a/'],
			['{}'],
			['{ a: 1 }'],
			['[]'],
			['["a", "b"]'],
			['a, b'],
			['"a", "b"'],
			['void 0'],
			['NaN'],
			['Infinity'],
			['-Infinity'],
			['+1'],
			['--1'],
			['-"x"'],
			['!true'],
			['("x"'],
			['"x")'],
			['"unterminated'],
			['1 2'],
			['(a) as const'],
			['"x" y'],
			['<div />'],
			['() => 1'],
			['("x" as string) + y'],
			['"x" as string + y'],
			['true as boolean || y'],
			['true as boolean ? 1 : 2'],
			['"x" as T, y'],
			['"x" as A : b'],
			['"x" as A ; b'],
			['"x" as { a: string'],
			['("x" as string'],
			['/* c */ true'],
			['-.5.5'],
		])('%j', code => {
			expect(parseLiteralExpression(code)).toBeNull();
		});

		test('A template literal with an invalid escape has no cooked value', () => {
			expect(parseLiteralExpression('`\\u{110000}`')).toBeNull();
		});
	});
});

/**
 * JavaScript is read from its tree and what only TypeScript has is read from the tokens, so the two have to
 * say the same for the code that both read.
 */
describe('the tree and the tokens say the same for JavaScript', () => {
	test.each([
		[`"abc"`],
		[`'a\\u0062c'`],
		['`abc`'],
		['`a${b}`'],
		['0x10'],
		['1_000'],
		['-1'],
		['- 1'],
		['-0'],
		['.5'],
		['12345678901234567890n'],
		['-12345678901234567890n'],
		['0x10n'],
		['true'],
		['false'],
		['null'],
		['undefined'],
		['("x")'],
		['((("x")))'],
		['( 1 )'],
		['"x" // comment'],
		['"x" /* comment */'],
		['/re/'],
		['-"x"'],
		['+1'],
		['--1'],
		['!true'],
		['1 + 2'],
		['true ? 1 : 2'],
		['"a" + b'],
		['"x", y'],
		['[1]'],
		['void 0'],
		['("x"'],
		['"x")'],
		['"unterminated'],
		['1 2'],
		['-.5.5'],
		['null.x'],
		['undefined()'],
	])('%j', code => {
		expect(parseLiteralExpression(code)).toStrictEqual(parseLiteralByTokens(code));
	});
});
