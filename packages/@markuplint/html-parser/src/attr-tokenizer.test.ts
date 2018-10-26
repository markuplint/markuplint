import attrTokenizer from './attr-tokenizer';

describe('attrTokenizer', async () => {
	it('void attribute', () => {
		expect(attrTokenizer(' abc', 1, 1, 0)).toMatchObject({
			raw: 'abc',
			startLine: 1,
			endLine: 1,
			startCol: 2,
			endCol: 5,
			startOffset: 1,
			endOffset: 4,
			isInvalid: false,
			beforeSpaces: {
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
			spacesBeforeEqual: null,
			equal: null,
			spacesAfterEqual: null,
			tokenBeforeValue: null,
			value: null,
			tokenAfterValue: null,
		});
	});
});

test('normal', async () => {
	expect(attrTokenizer(' abc="123"', 1, 1, 0)).toMatchObject({
		startLine: 1,
		endLine: 1,
		startCol: 2,
		endCol: 11,
		startOffset: 1,
		endOffset: 10,
		raw: 'abc="123"',
		isInvalid: false,
		beforeSpaces: {
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
		tokenBeforeValue: {
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
		tokenAfterValue: {
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
		startLine: 2,
		endLine: 2,
		startCol: 2,
		endCol: 11,
		startOffset: 2,
		endOffset: 11,
		raw: 'abc="123"',
		isInvalid: false,
		beforeSpaces: {
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
		tokenBeforeValue: {
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
		tokenAfterValue: {
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
		beforeSpaces: {
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

// test('single quote', t => {
// 	expect(attrTokenizer("  q='a'", 1, 1, 0)).toMatchObject({
// 		startLine: 1,
// 		endLine: 1,
// 		startCol: 3,
// 		endCol: 8,
// 		startOffset: 2,
// 		endOffset: 7,
// 		raw: "q='a'",
// 		isInvalid: false,
// 		name: {
// 			raw: 'q',
// 			startLine: 1,
// 			endLine: 1,
// 			startCol: 3,
// 			endCol: 4,
// 			startOffset: 2,
// 			endOffset: 3,
// 		},
// 		equal: {
// 			raw: '=',
// 			startLine: 1,
// 			endLine: 1,
// 			startCol: 4,
// 			endCol: 5,
// 			startOffset: 3,
// 			endOffset: 4,
// 		},
// 		value: {
// 			value: 'a',
// 			quote: "'",
// 			raw: "'a'",
// 			startLine: 1,
// 			endLine: 1,
// 			startCol: 5,
// 			endCol: 8,
// 			startOffset: 4,
// 			endOffset: 7,
// 		},
// 	});
// });

// test('no quote', t => {
// 	expect(attrTokenizer('q=a', 1, 1, 0)).toMatchObject({
// 		startLine: 1,
// 		endLine: 1,
// 		startCol: 1,
// 		endCol: 4,
// 		startOffset: 0,
// 		endOffset: 3,
// 		raw: 'q=a',
// 		isInvalid: false,
// 		name: {
// 			raw: 'q',
// 			startLine: 1,
// 			endLine: 1,
// 			startCol: 1,
// 			endCol: 2,
// 			startOffset: 0,
// 			endOffset: 1,
// 		},
// 		equal: {
// 			raw: '=',
// 			startLine: 1,
// 			endLine: 1,
// 			startCol: 2,
// 			endCol: 3,
// 			startOffset: 1,
// 			endOffset: 2,
// 		},
// 		value: {
// 			value: 'a',
// 			quote: null,
// 			raw: 'a',
// 			startLine: 1,
// 			endLine: 1,
// 			startCol: 3,
// 			endCol: 4,
// 			startOffset: 2,
// 			endOffset: 3,
// 		},
// 	});
// });

// test('empty', t => {
// 	expect(attrTokenizer('q', 1, 1, 0)).toMatchObject({
// 		startLine: 1,
// 		endLine: 1,
// 		startCol: 1,
// 		endCol: 2,
// 		startOffset: 0,
// 		endOffset: 1,
// 		raw: 'q',
// 		isInvalid: false,
// 		name: {
// 			raw: 'q',
// 			startLine: 1,
// 			endLine: 1,
// 			startCol: 1,
// 			endCol: 2,
// 			startOffset: 0,
// 			endOffset: 1,
// 		},
// 		equal: null,
// 		value: null,
// 	});
// });

// test('invalid: no value', t => {
// 	expect(attrTokenizer('q=', 1, 1, 0)).toMatchObject({
// 		startLine: 1,
// 		endLine: 1,
// 		startCol: 1,
// 		endCol: 3,
// 		startOffset: 0,
// 		endOffset: 2,
// 		raw: 'q=',
// 		isInvalid: true,
// 		name: {
// 			raw: 'q',
// 			startLine: 1,
// 			endLine: 1,
// 			startCol: 1,
// 			endCol: 2,
// 			startOffset: 0,
// 			endOffset: 1,
// 		},
// 		equal: {
// 			raw: '=',
// 			startLine: 1,
// 			endLine: 1,
// 			startCol: 2,
// 			endCol: 3,
// 			startOffset: 1,
// 			endOffset: 2,
// 		},
// 		value: null,
// 	});
// });

// test('spaces', t => {
// 	expect(attrTokenizer('abc  =  "efg"', 1, 1, 0)).toMatchObject({
// 		startLine: 1,
// 		endLine: 1,
// 		startCol: 1,
// 		endCol: 14,
// 		startOffset: 0,
// 		endOffset: 13,
// 		raw: 'abc  =  "efg"',
// 		isInvalid: false,
// 		name: {
// 			raw: 'abc',
// 			startLine: 1,
// 			endLine: 1,
// 			startCol: 1,
// 			endCol: 4,
// 			startOffset: 0,
// 			endOffset: 3,
// 		},
// 		equal: {
// 			raw: '=',
// 			startLine: 1,
// 			endLine: 1,
// 			startCol: 6,
// 			endCol: 7,
// 			startOffset: 5,
// 			endOffset: 6,
// 		},
// 		value: {
// 			value: 'efg',
// 			quote: '"',
// 			raw: '"efg"',
// 			startLine: 1,
// 			endLine: 1,
// 			startCol: 9,
// 			endCol: 14,
// 			startOffset: 8,
// 			endOffset: 13,
// 		},
// 	});
// });

// test('line break', t => {
// 	expect(
// 		attrTokenizer(
// 			`
//  abc

//    =

//   "e

//      fg

// "`,
// 			1,
// 			1,
// 			0,
// 		),
// 	).toMatchObject({
// 		startLine: 2,
// 		endLine: 10,
// 		startCol: 2,
// 		endCol: 2,
// 		startOffset: 2,
// 		endOffset: 29,
// 		raw: 'abc\n\n   =\n\n  "e\n\n     fg\n\n"',
// 		isInvalid: false,
// 		name: {
// 			raw: 'abc',
// 			startLine: 2,
// 			endLine: 2,
// 			startCol: 2,
// 			endCol: 5,
// 			startOffset: 2,
// 			endOffset: 5,
// 		},
// 		equal: {
// 			raw: '=',
// 			startLine: 4,
// 			endLine: 4,
// 			startCol: 4,
// 			endCol: 5,
// 			startOffset: 10,
// 			endOffset: 11,
// 		},
// 		value: {
// 			value: 'e\n\n     fg\n\n',
// 			quote: '"',
// 			raw: '"e\n\n     fg\n\n"',
// 			startLine: 6,
// 			endLine: 10,
// 			startCol: 3,
// 			endCol: 2,
// 			startOffset: 15,
// 			endOffset: 29,
// 		},
// 	});
// });
