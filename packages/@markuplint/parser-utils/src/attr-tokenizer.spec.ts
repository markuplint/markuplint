import { test, expect } from 'vitest';

import { attrTokenizer } from './attr-tokenizer.js';
import { AttrState } from './enums.js';

test('name', () => {
	expect(attrTokenizer('a').attrName).toBe('a');
	expect(attrTokenizer('abc').attrName).toBe('abc');
	expect(attrTokenizer('abc:').attrName).toBe('abc:');
	expect(attrTokenizer(':abc').attrName).toBe(':abc');
	expect(attrTokenizer('xxx:abc').attrName).toBe('xxx:abc');
	expect(attrTokenizer('@abc').attrName).toBe('@abc');
});

test('value', () => {
	expect(attrTokenizer('a=b').attrValue).toBe('b');
	expect(attrTokenizer('abc=xyz').attrValue).toBe('xyz');
	expect(attrTokenizer('abc:="xyz"').attrValue).toBe('xyz');
});

test('complex', () => {
	expect(
		attrTokenizer(
			//
			' @a:x.y\n= x + y ',
			undefined,
			undefined,
			undefined,
			[],
		),
	).toStrictEqual({
		spacesBeforeAttrName: ' ',
		attrName: '@a:x.y',
		spacesBeforeEqual: '\n',
		equal: '=',
		spacesAfterEqual: '',
		quoteStart: '',
		attrValue: ' x + y ',
		quoteEnd: '',
		leftover: '',
	});

	expect(attrTokenizer(' @a:x.y\n= " x\' + y " ')).toStrictEqual({
		spacesBeforeAttrName: ' ',
		attrName: '@a:x.y',
		spacesBeforeEqual: '\n',
		equal: '=',
		spacesAfterEqual: ' ',
		quoteStart: '"',
		attrValue: " x' + y ",
		quoteEnd: '"',
		leftover: ' ',
	});
});

test('jsx', () => {
	expect(
		attrTokenizer(
			' className={classList.map((c) => `${c.toLowerCase()}`).join(",")} ',
			[
				{ start: '"', end: '"' },
				{ start: "'", end: "'" },
				{ start: '{', end: '}' },
			],
			0,
			[
				{ start: '"', end: '"' },
				{ start: "'", end: "'" },
				{ start: '`', end: '`' },
				{ start: '${', end: '}' },
			],
		),
	).toStrictEqual({
		spacesBeforeAttrName: ' ',
		attrName: 'className',
		spacesBeforeEqual: '',
		equal: '=',
		spacesAfterEqual: '',
		quoteStart: '{',
		attrValue: 'classList.map((c) => `${c.toLowerCase()}`).join(",")',
		quoteEnd: '}',
		leftover: ' ',
	});
});

test('abc', () => {
	expect(attrTokenizer('abc')).toStrictEqual({
		spacesBeforeAttrName: '',
		attrName: 'abc',
		spacesBeforeEqual: '',
		equal: '',
		spacesAfterEqual: '',
		quoteStart: '',
		attrValue: '',
		quoteEnd: '',
		leftover: '',
	});
});

test('␣␣abc␣␣', () => {
	expect(attrTokenizer('  abc  ')).toStrictEqual({
		spacesBeforeAttrName: '  ',
		attrName: 'abc',
		spacesBeforeEqual: '  ',
		equal: '',
		spacesAfterEqual: '',
		quoteStart: '',
		attrValue: '',
		quoteEnd: '',
		leftover: '',
	});
});

test('␣␣abc␣=', () => {
	expect(attrTokenizer('  abc =')).toStrictEqual({
		spacesBeforeAttrName: '  ',
		attrName: 'abc',
		spacesBeforeEqual: ' ',
		equal: '=',
		spacesAfterEqual: '',
		quoteStart: '',
		attrValue: '',
		quoteEnd: '',
		leftover: '',
	});
});

test('␣␣abc␣=␣d', () => {
	expect(attrTokenizer('  abc = d')).toStrictEqual({
		spacesBeforeAttrName: '  ',
		attrName: 'abc',
		spacesBeforeEqual: ' ',
		equal: '=',
		spacesAfterEqual: ' ',
		quoteStart: '',
		attrValue: 'd',
		quoteEnd: '',
		leftover: '',
	});
});

test('␣␣abc␣=␣"de"', () => {
	expect(attrTokenizer('  abc = "de"')).toStrictEqual({
		spacesBeforeAttrName: '  ',
		attrName: 'abc',
		spacesBeforeEqual: ' ',
		equal: '=',
		spacesAfterEqual: ' ',
		quoteStart: '"',
		attrValue: 'de',
		quoteEnd: '"',
		leftover: '',
	});
});

test('␣␣abc␣=␣{de}', () => {
	expect(
		attrTokenizer('  abc = {de}', [
			{ start: '"', end: '"' },
			{ start: "'", end: "'" },
			{ start: '{', end: '}' },
		]),
	).toStrictEqual({
		spacesBeforeAttrName: '  ',
		attrName: 'abc',
		spacesBeforeEqual: ' ',
		equal: '=',
		spacesAfterEqual: ' ',
		quoteStart: '{',
		attrValue: 'de',
		quoteEnd: '}',
		leftover: '',
	});
});

test('␣abc="123"', () => {
	expect(attrTokenizer(' abc="123"')).toStrictEqual({
		spacesBeforeAttrName: ' ',
		attrName: 'abc',
		spacesBeforeEqual: '',
		equal: '=',
		spacesAfterEqual: '',
		quoteStart: '"',
		attrValue: '123',
		quoteEnd: '"',
		leftover: '',
	});
});

test('abc=', () => {
	expect(attrTokenizer('abc=')).toStrictEqual({
		spacesBeforeAttrName: '',
		attrName: 'abc',
		spacesBeforeEqual: '',
		equal: '=',
		spacesAfterEqual: '',
		quoteStart: '',
		attrValue: '',
		quoteEnd: '',
		leftover: '',
	});
});

test('abc=""', () => {
	expect(attrTokenizer('abc=""')).toStrictEqual({
		spacesBeforeAttrName: '',
		attrName: 'abc',
		spacesBeforeEqual: '',
		equal: '=',
		spacesAfterEqual: '',
		quoteStart: '"',
		attrValue: '',
		quoteEnd: '"',
		leftover: '',
	});
});

test('abc="123', () => {
	expect(() => attrTokenizer('abc="123')).toThrowError('Unclosed attribute value');
});

test('{variableAsName}', () => {
	expect(attrTokenizer('{variableAsName}', [{ start: '{', end: '}' }], AttrState.BeforeValue)).toStrictEqual({
		spacesBeforeAttrName: '',
		attrName: '',
		spacesBeforeEqual: '',
		equal: '',
		spacesAfterEqual: '',
		quoteStart: '{',
		attrValue: 'variableAsName',
		quoteEnd: '}',
		leftover: '',
	});
});

test('literal={ `abc${def}ghi${`jkl${mno}pqr`}` }', () => {
	expect(
		attrTokenizer(
			//
			'literal={ `abc${def}ghi${`jkl${mno}pqr`}` }',
			[{ start: '{', end: '}' }],
			0,
			[
				{ start: '"', end: '"' },
				{ start: "'", end: "'" },
				{ start: '`', end: '`' },
				{ start: '${', end: '}' },
			],
		),
	).toStrictEqual({
		spacesBeforeAttrName: '',
		attrName: 'literal',
		spacesBeforeEqual: '',
		equal: '=',
		spacesAfterEqual: '',
		quoteStart: '{',
		attrValue: ' `abc${def}ghi${`jkl${mno}pqr`}` ',
		quoteEnd: '}',
		leftover: '',
	});
});

test('transition:fade="{{ duration: 2000 }}"', () => {
	expect(
		attrTokenizer(
			//
			'transition:fade="{{ duration: 2000 }}"',
			[
				{ start: '"', end: '"' },
				{ start: "'", end: "'" },
				{ start: '{', end: '}' },
			],
			0,
			[
				{ start: '"', end: '"' },
				{ start: "'", end: "'" },
				{ start: '`', end: '`' },
				{ start: '${', end: '}' },
			],
		),
	).toStrictEqual({
		spacesBeforeAttrName: '',
		attrName: 'transition:fade',
		spacesBeforeEqual: '',
		equal: '=',
		spacesAfterEqual: '',
		quoteStart: '"',
		attrValue: '{{ duration: 2000 }}',
		quoteEnd: '"',
		leftover: '',
	});
});

test('abc=def␣ghi', () => {
	expect(attrTokenizer('abc=def ghi')).toStrictEqual({
		spacesBeforeAttrName: '',
		attrName: 'abc',
		spacesBeforeEqual: '',
		equal: '=',
		spacesAfterEqual: '',
		quoteStart: '',
		attrValue: 'def',
		quoteEnd: '',
		leftover: ' ghi',
	});
});

test('a␣b␣c', () => {
	expect(attrTokenizer('a b c')).toStrictEqual({
		spacesBeforeAttrName: '',
		attrName: 'a',
		spacesBeforeEqual: '',
		equal: '',
		spacesAfterEqual: '',
		quoteStart: '',
		attrValue: '',
		quoteEnd: '',
		leftover: ' b c',
	});
});

test('a>', () => {
	expect(attrTokenizer('a>')).toStrictEqual({
		spacesBeforeAttrName: '',
		attrName: 'a',
		spacesBeforeEqual: '',
		equal: '',
		spacesAfterEqual: '',
		quoteStart: '',
		attrValue: '',
		quoteEnd: '',
		leftover: '>',
	});
});

test('a=>', () => {
	expect(attrTokenizer('a=>')).toStrictEqual({
		spacesBeforeAttrName: '',
		attrName: 'a',
		spacesBeforeEqual: '',
		equal: '=',
		spacesAfterEqual: '',
		quoteStart: '',
		attrValue: '',
		quoteEnd: '',
		leftover: '>',
	});
});

test('a=a>', () => {
	expect(attrTokenizer('a=a>')).toStrictEqual({
		spacesBeforeAttrName: '',
		attrName: 'a',
		spacesBeforeEqual: '',
		equal: '=',
		spacesAfterEqual: '',
		quoteStart: '',
		attrValue: 'a',
		quoteEnd: '',
		leftover: '>',
	});
});

test('a/>', () => {
	expect(attrTokenizer('a/>')).toStrictEqual({
		spacesBeforeAttrName: '',
		attrName: 'a',
		spacesBeforeEqual: '',
		equal: '',
		spacesAfterEqual: '',
		quoteStart: '',
		attrValue: '',
		quoteEnd: '',
		leftover: '/>',
	});
});

test('a=/>', () => {
	expect(attrTokenizer('a=/>')).toStrictEqual({
		spacesBeforeAttrName: '',
		attrName: 'a',
		spacesBeforeEqual: '',
		equal: '=',
		spacesAfterEqual: '',
		quoteStart: '',
		attrValue: '',
		quoteEnd: '',
		leftover: '/>',
	});
});

test('a=a/>', () => {
	expect(attrTokenizer('a=a/>')).toStrictEqual({
		spacesBeforeAttrName: '',
		attrName: 'a',
		spacesBeforeEqual: '',
		equal: '=',
		spacesAfterEqual: '',
		quoteStart: '',
		attrValue: 'a',
		quoteEnd: '',
		leftover: '/>',
	});
});
