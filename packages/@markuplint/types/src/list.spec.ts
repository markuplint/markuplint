import { checkList } from './list';

test('Zero space', () => {
	const type = { token: 'Zero', separator: 'space' } as const;
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
	const type = { token: 'Zero', separator: 'comma' } as const;
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
	const type = { token: 'Zero', separator: 'comma', disallowToSurroundBySpaces: true } as const;
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
	const type = { token: 'Accept', separator: 'comma' } as const;
	expect(checkList('x/y;a=b', type)).toStrictEqual({
		candicate: 'x/y',
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
		candicate: 'x/y',
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
		candicate: 'x/y',
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
	const type = { token: 'Accept', separator: 'comma' } as const;
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
	const type = { token: 'Accept', separator: 'comma' } as const;
	expect(checkList('a/b,x/y a/z', type)).toStrictEqual({
		column: 9,
		candicate: ',a/z',
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
