import type { List } from './types.schema.js';

import { test, expect, describe } from 'vitest';

import { checkList as _checkList } from './list.js';
import { defs } from './defs.js';
import { cssDefs } from './css-defs.js';

const checkList = (value: string, type: List) => _checkList(value, type, { ...defs, ...cssDefs });

test('Zero space', () => {
	const type: List = { token: 'Zero', separator: 'space' };
	expect(checkList('0', type).matched).toBe(true);
	expect(checkList(' 0 ', type).matched).toBe(true);
	expect(checkList(' 0 0', type).matched).toBe(true);
	expect(checkList(' 0 0 ', type).matched).toBe(true);
	expect(checkList('0 0 0 ', type).matched).toBe(true);
	expect(checkList('0 0 0 0', type).matched).toBe(true);
	expect(checkList('0 0 0    0', type).matched).toBe(true);
	expect(checkList('1', type).matched).toBe(false);
	expect(checkList(' 1 ', type).matched).toBe(false);
	expect(checkList(' 1 0', type).matched).toBe(false);
	expect(checkList(' 1 0 ', type).matched).toBe(false);
	expect(checkList('0 1 0 ', type).matched).toBe(false);
	expect(checkList('0 1 0 0', type).matched).toBe(false);
	expect(checkList('0 1 0    0', type).matched).toBe(false);
});

test('Zero comma', () => {
	const type: List = { token: 'Zero', separator: 'comma' };
	expect(checkList('0', type).matched).toBe(true);
	expect(checkList(' 0 ', type).matched).toBe(true);
	expect(checkList(' 0 0', type).matched).toBe(false);
	expect(checkList(' 0,0', type).matched).toBe(true);
	expect(checkList(' 0,,0 ', type).matched).toBe(false);
	expect(checkList('0 0 0 ', type).matched).toBe(false);
	expect(checkList(' 0,0,0,0 ', type).matched).toBe(true);
	expect(checkList('0, 0, 0 , 0', type).matched).toBe(true);
	expect(checkList('0,0,0,0,', type).matched).toBe(false);
	expect(checkList(',0,0,0,0', type).matched).toBe(false);
});

test('Zero comma (disallowToSurroundBySpaces)', () => {
	const type: List = { token: 'Zero', separator: 'comma', disallowToSurroundBySpaces: true };
	expect(checkList('0', type).matched).toBe(true);
	expect(checkList(' 0 ', type).matched).toBe(false);
	expect(checkList(' 0 0', type).matched).toBe(false);
	expect(checkList(' 0,0', type).matched).toBe(false);
	expect(checkList(' 0,,0 ', type).matched).toBe(false);
	expect(checkList('0 0 0 ', type).matched).toBe(false);
	expect(checkList(' 0,0,0,0 ', type).matched).toBe(false);
	expect(checkList('0, 0, 0 , 0', type).matched).toBe(false);
	expect(checkList('0,0,0,0', type).matched).toBe(true);
	expect(checkList('0,0,0,0,', type).matched).toBe(false);
	expect(checkList(',0,0,0,0', type).matched).toBe(false);
});

test('Location of the token', () => {
	const type: List = { token: 'Accept', separator: 'comma' };
	expect(checkList('x/y;a=b', type)).toStrictEqual({
		candidate: 'x/y',
		column: 4,
		expects: [{ type: 'format', value: 'MIME Type with no parameters' }],
		length: 4,
		line: 1,
		matched: false,
		offset: 3,
		raw: ';a=b',
		reason: 'extra-token',
		partName: 'the content of the list',
		ref: 'https://html.spec.whatwg.org/multipage/input.html#attr-input-accept',
	});
	expect(checkList('x/y,x/y;a=b', type)).toStrictEqual({
		candidate: 'x/y',
		column: 8,
		expects: [{ type: 'format', value: 'MIME Type with no parameters' }],
		length: 4,
		line: 1,
		matched: false,
		offset: 7,
		raw: ';a=b',
		reason: 'extra-token',
		partName: 'the content of the list',
		ref: 'https://html.spec.whatwg.org/multipage/input.html#attr-input-accept',
	});
	expect(checkList('x/y\n,\nx/y;a=b', type)).toStrictEqual({
		candidate: 'x/y',
		column: 4,
		expects: [{ type: 'format', value: 'MIME Type with no parameters' }],
		length: 4,
		line: 3,
		matched: false,
		offset: 9,
		raw: ';a=b',
		reason: 'extra-token',
		partName: 'the content of the list',
		ref: 'https://html.spec.whatwg.org/multipage/input.html#attr-input-accept',
	});
});

test('Expected comma', () => {
	const type: List = { token: 'Accept', separator: 'comma' };
	expect(checkList('x/y,', type)).toStrictEqual({
		column: 4,
		expects: undefined,
		length: 1,
		line: 1,
		matched: false,
		offset: 3,
		raw: ',',
		reason: 'extra-token',
		ref: null,
	});
	expect(checkList('x/y,,x/y', type)).toStrictEqual({
		column: 5,
		expects: undefined,
		length: 1,
		line: 1,
		matched: false,
		offset: 4,
		raw: ',',
		reason: 'unexpected-comma',
		ref: null,
	});
});

test('Missing comma', () => {
	const type: List = { token: 'Accept', separator: 'comma' };
	expect(checkList('a/b,x/y a/z', type)).toStrictEqual({
		column: 9,
		candidate: ',a/z',
		expects: undefined,
		length: 3,
		line: 1,
		matched: false,
		offset: 8,
		raw: 'a/z',
		reason: 'missing-comma',
		ref: null,
	});
});

describe('Issues', () => {
	test('#391', () => {
		const type: List = {
			token: {
				enum: ['a', 'b'],
			},
			separator: 'space',
			unique: true,
		};

		expect(checkList('a', type).matched).toBe(true);
		expect(checkList('a b', type).matched).toBe(true);
		expect(checkList('a   b', type).matched).toBe(true);
		expect(checkList('a   b c', type).matched).toBe(false);
		expect(checkList('a a', type).matched).toBe(false);
		expect(checkList('b', type).matched).toBe(true);
		expect(checkList('b a', type).matched).toBe(true);
		expect(checkList('b a c', type).matched).toBe(false);
		expect(checkList('c', type).matched).toBe(false);
	});
});
