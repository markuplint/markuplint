import attrTokenizer from './attr-tokenizer';

describe('attrTokenizer', () => {
	it('void attribute', async () => {
		expect(attrTokenizer(' abc', 1, 1, 0)).toMatchObject({
			raw: ' abc',
			startLine: 1,
			endLine: 1,
			startCol: 1,
			endCol: 5,
			startOffset: 0,
			endOffset: 4,
			spacesBeforeName: {
				raw: ' ',
				startLine: 1,
				endLine: 1,
				startCol: 1,
				endCol: 2,
				startOffset: 0,
				endOffset: 1,
			},
			name: {
				raw: 'abc',
				startLine: 1,
				endLine: 1,
				startCol: 2,
				endCol: 5,
				startOffset: 1,
				endOffset: 4,
			},
			spacesBeforeEqual: {
				raw: '',
				startLine: 1,
				endLine: 1,
				startCol: 5,
				endCol: 5,
				startOffset: 4,
				endOffset: 4,
			},
			equal: {
				raw: '',
				startLine: 1,
				endLine: 1,
				startCol: 5,
				endCol: 5,
				startOffset: 4,
				endOffset: 4,
			},
			spacesAfterEqual: {
				raw: '',
				startLine: 1,
				endLine: 1,
				startCol: 5,
				endCol: 5,
				startOffset: 4,
				endOffset: 4,
			},
			startQuote: {
				endCol: 5,
				endLine: 1,
				endOffset: 4,
				raw: '',
				startCol: 5,
				startLine: 1,
				startOffset: 4,
			},
			value: {
				endCol: 5,
				endLine: 1,
				endOffset: 4,
				raw: '',
				startCol: 5,
				startLine: 1,
				startOffset: 4,
			},
			endQuote: {
				endCol: 5,
				endLine: 1,
				endOffset: 4,
				raw: '',
				startCol: 5,
				startLine: 1,
				startOffset: 4,
			},
		});
	});
});

test('normal', async () => {
	expect(attrTokenizer(' abc="123"', 1, 1, 0)).toMatchObject({
		startLine: 1,
		endLine: 1,
		startCol: 1,
		endCol: 11,
		startOffset: 0,
		endOffset: 10,
		raw: ' abc="123"',
		spacesBeforeName: {
			raw: ' ',
			startLine: 1,
			endLine: 1,
			startCol: 1,
			endCol: 2,
			startOffset: 0,
			endOffset: 1,
		},
		name: {
			raw: 'abc',
			startLine: 1,
			endLine: 1,
			startCol: 2,
			endCol: 5,
			startOffset: 1,
			endOffset: 4,
		},
		spacesBeforeEqual: {
			raw: '',
			startLine: 1,
			endLine: 1,
			startCol: 5,
			endCol: 5,
			startOffset: 4,
			endOffset: 4,
		},
		equal: {
			raw: '=',
			startLine: 1,
			endLine: 1,
			startCol: 5,
			endCol: 6,
			startOffset: 4,
			endOffset: 5,
		},
		spacesAfterEqual: {
			raw: '',
			startLine: 1,
			endLine: 1,
			startCol: 6,
			endCol: 6,
			startOffset: 5,
			endOffset: 5,
		},
		startQuote: {
			raw: '"',
			startLine: 1,
			endLine: 1,
			startCol: 6,
			endCol: 7,
			startOffset: 5,
			endOffset: 6,
		},
		value: {
			raw: '123',
			startLine: 1,
			endLine: 1,
			startCol: 7,
			endCol: 10,
			startOffset: 6,
			endOffset: 9,
		},
		endQuote: {
			endCol: 11,
			endLine: 1,
			endOffset: 10,
			raw: '"',
			startCol: 10,
			startLine: 1,
			startOffset: 9,
		},
	});
});

test('after line break', async () => {
	expect(attrTokenizer('\n abc="123"', 1, 1, 0)).toMatchObject({
		startLine: 1,
		endLine: 2,
		startCol: 1,
		endCol: 11,
		startOffset: 0,
		endOffset: 11,
		raw: '\n abc="123"',
		spacesBeforeName: {
			raw: '\n ',
			startLine: 1,
			endLine: 2,
			startCol: 1,
			endCol: 2,
			startOffset: 0,
			endOffset: 2,
		},
		name: {
			raw: 'abc',
			startLine: 2,
			endLine: 2,
			startCol: 2,
			endCol: 5,
			startOffset: 2,
			endOffset: 5,
		},
		spacesBeforeEqual: {
			raw: '',
			startLine: 2,
			endLine: 2,
			startCol: 5,
			endCol: 5,
			startOffset: 5,
			endOffset: 5,
		},
		equal: {
			raw: '=',
			startLine: 2,
			endLine: 2,
			startCol: 5,
			endCol: 6,
			startOffset: 5,
			endOffset: 6,
		},
		spacesAfterEqual: {
			raw: '',
			startLine: 2,
			endLine: 2,
			startCol: 6,
			endCol: 6,
			startOffset: 6,
			endOffset: 6,
		},
		startQuote: {
			raw: '"',
			startLine: 2,
			endLine: 2,
			startCol: 6,
			endCol: 7,
			startOffset: 6,
			endOffset: 7,
		},
		value: {
			raw: '123',
			startLine: 2,
			endLine: 2,
			startCol: 7,
			endCol: 10,
			startOffset: 7,
			endOffset: 10,
		},
		endQuote: {
			raw: '"',
			startLine: 2,
			endLine: 2,
			startCol: 10,
			endCol: 11,
			startOffset: 10,
			endOffset: 11,
		},
	});
});

test('after line break', async () => {
	expect(attrTokenizer('\n abc="123"', 1, 3, 0)).toMatchObject({
		spacesBeforeName: {
			raw: '\n ',
			startLine: 1,
			endLine: 2,
			startCol: 3,
			endCol: 2,
			startOffset: 0,
			endOffset: 2,
		},
	});
});

test('single quote', () => {
	expect(attrTokenizer("  q='a'", 1, 1, 0)).toMatchObject({
		startLine: 1,
		endLine: 1,
		startCol: 1,
		endCol: 8,
		startOffset: 0,
		endOffset: 7,
		raw: "  q='a'",
		spacesBeforeName: {
			raw: '  ',
			startLine: 1,
			endLine: 1,
			startCol: 1,
			endCol: 3,
			startOffset: 0,
			endOffset: 2,
		},
		name: {
			raw: 'q',
			startLine: 1,
			endLine: 1,
			startCol: 3,
			endCol: 4,
			startOffset: 2,
			endOffset: 3,
		},
		equal: {
			raw: '=',
			startLine: 1,
			endLine: 1,
			startCol: 4,
			endCol: 5,
			startOffset: 3,
			endOffset: 4,
		},
		value: {
			raw: 'a',
			startLine: 1,
			endLine: 1,
			startCol: 6,
			endCol: 7,
			startOffset: 5,
			endOffset: 6,
		},
	});
});

test('no quote', () => {
	expect(attrTokenizer('q=a', 1, 1, 0)).toMatchObject({
		startLine: 1,
		endLine: 1,
		startCol: 1,
		endCol: 4,
		startOffset: 0,
		endOffset: 3,
		raw: 'q=a',
		name: {
			raw: 'q',
			startLine: 1,
			endLine: 1,
			startCol: 1,
			endCol: 2,
			startOffset: 0,
			endOffset: 1,
		},
		equal: {
			raw: '=',
			startLine: 1,
			endLine: 1,
			startCol: 2,
			endCol: 3,
			startOffset: 1,
			endOffset: 2,
		},
		value: {
			raw: 'a',
			startLine: 1,
			endLine: 1,
			startCol: 3,
			endCol: 4,
			startOffset: 2,
			endOffset: 3,
		},
	});
});

test('empty', () => {
	expect(attrTokenizer('q', 1, 1, 0)).toMatchObject({
		startLine: 1,
		endLine: 1,
		startCol: 1,
		endCol: 2,
		startOffset: 0,
		endOffset: 1,
		raw: 'q',
		name: {
			raw: 'q',
			startLine: 1,
			endLine: 1,
			startCol: 1,
			endCol: 2,
			startOffset: 0,
			endOffset: 1,
		},
		equal: {},
		value: {},
	});
});

test('no value', () => {
	expect(attrTokenizer('q=', 1, 1, 0)).toMatchObject({
		startLine: 1,
		endLine: 1,
		startCol: 1,
		endCol: 3,
		startOffset: 0,
		endOffset: 2,
		raw: 'q=',
		name: {
			raw: 'q',
			startLine: 1,
			endLine: 1,
			startCol: 1,
			endCol: 2,
			startOffset: 0,
			endOffset: 1,
		},
		equal: {
			raw: '=',
			startLine: 1,
			endLine: 1,
			startCol: 2,
			endCol: 3,
			startOffset: 1,
			endOffset: 2,
		},
		value: {
			raw: '',
			startLine: 1,
			endLine: 1,
			startCol: 3,
			endCol: 3,
			startOffset: 2,
			endOffset: 2,
		},
	});
});

test('spaces', () => {
	expect(attrTokenizer('abc  =  "efg"', 1, 1, 0)).toMatchObject({
		startLine: 1,
		endLine: 1,
		startCol: 1,
		endCol: 14,
		startOffset: 0,
		endOffset: 13,
		raw: 'abc  =  "efg"',
		name: {
			raw: 'abc',
			startLine: 1,
			endLine: 1,
			startCol: 1,
			endCol: 4,
			startOffset: 0,
			endOffset: 3,
		},
		equal: {
			raw: '=',
			startLine: 1,
			endLine: 1,
			startCol: 6,
			endCol: 7,
			startOffset: 5,
			endOffset: 6,
		},
		value: {
			raw: 'efg',
			startLine: 1,
			endLine: 1,
			startCol: 10,
			endCol: 13,
			startOffset: 9,
			endOffset: 12,
		},
	});
});

test('line break', () => {
	expect(
		attrTokenizer(
			`
 abc

   =

  "e

     fg

"`,
			1,
			1,
			0,
		),
	).toMatchObject({
		startLine: 1,
		endLine: 10,
		startCol: 1,
		endCol: 2,
		startOffset: 0,
		endOffset: 29,
		raw: '\n abc\n\n   =\n\n  "e\n\n     fg\n\n"',
		name: {
			raw: 'abc',
			startLine: 2,
			endLine: 2,
			startCol: 2,
			endCol: 5,
			startOffset: 2,
			endOffset: 5,
		},
		equal: {
			raw: '=',
			startLine: 4,
			endLine: 4,
			startCol: 4,
			endCol: 5,
			startOffset: 10,
			endOffset: 11,
		},
		value: {
			raw: 'e\n\n     fg\n\n',
			startLine: 6,
			endLine: 10,
			startCol: 4,
			endCol: 1,
			startOffset: 16,
			endOffset: 28,
		},
	});
});
