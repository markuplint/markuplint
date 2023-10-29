import { test, expect } from 'vitest';

import { AttrState, attrParser } from './attr-parser.js';

test('abc', () => {
	expect(attrParser('abc')).toStrictEqual({
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
	expect(attrParser('  abc  ')).toStrictEqual({
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
	expect(attrParser('  abc =')).toStrictEqual({
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
	expect(attrParser('  abc = d')).toStrictEqual({
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
	expect(attrParser('  abc = "de"')).toStrictEqual({
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
		attrParser('  abc = {de}', [
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
	expect(attrParser(' abc="123"')).toStrictEqual({
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
	expect(attrParser('abc=')).toStrictEqual({
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
	expect(attrParser('abc=""')).toStrictEqual({
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
	expect(() => attrParser('abc="123')).toThrowError('Unclosed attribute value');
});

test('{variableAsName}', () => {
	expect(attrParser('{variableAsName}', [{ start: '{', end: '}' }], AttrState.BeforeValue)).toStrictEqual({
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
		attrParser(
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
		attrParser(
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
	expect(attrParser('abc=def ghi')).toStrictEqual({
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
	expect(attrParser('a b c')).toStrictEqual({
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
	expect(attrParser('a>')).toStrictEqual({
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
	expect(attrParser('a=>')).toStrictEqual({
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
	expect(attrParser('a=a>')).toStrictEqual({
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
	expect(attrParser('a/>')).toStrictEqual({
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
	expect(attrParser('a=/>')).toStrictEqual({
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
	expect(attrParser('a=a/>')).toStrictEqual({
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
