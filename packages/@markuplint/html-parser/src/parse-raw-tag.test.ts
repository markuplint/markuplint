import parseRawTag from './parse-raw-tag';

test('tag only', () => {
	expect(parseRawTag('<div>', 1, 1, 0)).toStrictEqual({
		tagName: 'div',
		attrs: [],
	});
});

test('tag only has space', () => {
	expect(parseRawTag('<div >', 1, 1, 0)).toStrictEqual({
		tagName: 'div',
		attrs: [],
	});
});

test('tag only has spaces', () => {
	expect(parseRawTag('<div  >', 1, 1, 0)).toStrictEqual({
		tagName: 'div',
		attrs: [],
	});
});

test('has attribute', () => {
	expect(parseRawTag('<div a>', 1, 1, 0)).toStrictEqual({
		tagName: 'div',
		attrs: [
			{
				raw: 'a',
				startLine: 1,
				endLine: 1,
				startCol: 6,
				endCol: 7,
				startOffset: 5,
				endOffset: 6,
				beforeSpaces: {
					raw: ' ',
					startLine: 1,
					endLine: 1,
					startCol: 5,
					endCol: 6,
					startOffset: 4,
					endOffset: 5,
				},
				name: {
					raw: 'a',
					startLine: 1,
					endLine: 1,
					startCol: 6,
					endCol: 7,
					startOffset: 5,
					endOffset: 6,
				},
				spacesBeforeEqual: null,
				equal: null,
				spacesAfterEqual: null,
				tokenBeforeValue: null,
				value: null,
				tokenAfterValue: null,
				isInvalid: false,
			},
		],
	});
});

test('2 attributes', () => {
	expect(parseRawTag('<div b c>', 1, 1, 0)).toStrictEqual({
		tagName: 'div',
		attrs: [
			{
				raw: 'b',
				startLine: 1,
				endLine: 1,
				startCol: 6,
				endCol: 7,
				startOffset: 5,
				endOffset: 6,
				beforeSpaces: {
					raw: ' ',
					startLine: 1,
					endLine: 1,
					startCol: 5,
					endCol: 6,
					startOffset: 4,
					endOffset: 5,
				},
				name: {
					raw: 'b',
					startLine: 1,
					endLine: 1,
					startCol: 6,
					endCol: 7,
					startOffset: 5,
					endOffset: 6,
				},
				spacesBeforeEqual: null,
				equal: null,
				spacesAfterEqual: null,
				tokenBeforeValue: null,
				value: null,
				tokenAfterValue: null,
				isInvalid: false,
			},
			{
				raw: 'c',
				startLine: 1,
				endLine: 1,
				startCol: 8,
				endCol: 9,
				startOffset: 7,
				endOffset: 8,
				beforeSpaces: {
					raw: ' ',
					startLine: 1,
					endLine: 1,
					startCol: 7,
					endCol: 8,
					startOffset: 6,
					endOffset: 7,
				},
				name: {
					raw: 'c',
					startLine: 1,
					endLine: 1,
					startCol: 8,
					endCol: 9,
					startOffset: 7,
					endOffset: 8,
				},
				spacesBeforeEqual: null,
				equal: null,
				spacesAfterEqual: null,
				tokenBeforeValue: null,
				value: null,
				tokenAfterValue: null,
				isInvalid: false,
			},
		],
	});
});

test('3 attributes', () => {
	expect(parseRawTag('<div a a a>', 1, 1, 0).attrs.length).toBe(3);
});

test('has line break', () => {
	expect(
		parseRawTag(
			`<div
a>`,
			1,
			1,
			0,
		),
	).toStrictEqual({
		tagName: 'div',
		attrs: [
			{
				raw: 'a',
				startLine: 2,
				endLine: 2,
				startCol: 1,
				endCol: 2,
				startOffset: 5,
				endOffset: 6,
				beforeSpaces: {
					raw: '\n',
					startLine: 1,
					endLine: 2,
					startCol: 5,
					endCol: 1,
					startOffset: 4,
					endOffset: 5,
				},
				name: {
					raw: 'a',
					startLine: 2,
					endLine: 2,
					startCol: 1,
					endCol: 2,
					startOffset: 5,
					endOffset: 6,
				},
				spacesBeforeEqual: null,
				equal: null,
				spacesAfterEqual: null,
				tokenBeforeValue: null,
				value: null,
				tokenAfterValue: null,
				isInvalid: false,
			},
		],
	});
});

test('has multiple line breaks', () => {
	expect(
		parseRawTag(
			`<div


			a>`,
			1,
			1,
			0,
		),
	).toStrictEqual({
		tagName: 'div',
		attrs: [
			{
				raw: 'a',
				startLine: 4,
				endLine: 4,
				startCol: 4,
				endCol: 5,
				startOffset: 10,
				endOffset: 11,
				beforeSpaces: {
					raw: '\n\n\n\t\t\t',
					startLine: 1,
					endLine: 4,
					startCol: 5,
					endCol: 4,
					startOffset: 4,
					endOffset: 10,
				},
				name: {
					raw: 'a',
					startLine: 4,
					endLine: 4,
					startCol: 4,
					endCol: 5,
					startOffset: 10,
					endOffset: 11,
				},
				spacesBeforeEqual: null,
				equal: null,
				spacesAfterEqual: null,
				tokenBeforeValue: null,
				value: null,
				tokenAfterValue: null,
				isInvalid: false,
			},
		],
	});
});

test('after line break', async () => {
	const { attrs } = parseRawTag(
		`<div attr
				attr2="value"
				attr3
			>`,
		1,
		1,
		0,
	);
	expect(attrs[1]).toMatchObject({
		beforeSpaces: {
			raw: '\n\t\t\t\t',
			startLine: 1,
			endLine: 2,
			startCol: 10,
			endCol: 5,
			startOffset: 9,
			endOffset: 14,
		},
	});
});

// test('standard', t => {
// 	expect(
// 		parseRawTag(
// 			`<div
//      a
//       b c
//       d>
// 		`,
// 			1,
// 			1,
// 			0,
// 		),
// 	).toStrictEqual({
// 		tagName: 'div',
// 		attrs: [
// 			{
// 				name: 'a',
// 				value: null,
// 				quote: null,
// 				equal: null,
// 				startLine: 1,
// 				startCol: 6,
// 				raw: 'a',
// 				isInvalid: false,
// 			},
// 			{
// 				name: 'b',
// 				value: null,
// 				quote: null,
// 				equal: null,
// 				startLine: 2,
// 				startCol: 7,
// 				raw: 'b',
// 				isInvalid: false,
// 			},
// 			{
// 				name: 'c',
// 				value: null,
// 				quote: null,
// 				equal: null,
// 				startLine: 2,
// 				startCol: 9,
// 				raw: 'c',
// 				isInvalid: false,
// 			},
// 			{
// 				name: 'd',
// 				value: null,
// 				quote: null,
// 				equal: null,
// 				startLine: 3,
// 				startCol: 7,
// 				raw: 'd',
// 				isInvalid: false,
// 			},
// 		],
// 	});
// });

// // test('standard', (t) => {
// // 	expect(
// // 		parseRawTag('<div a=a>', 1, 1, 0).toJSON(),
// // 		{
// // 			tagName: 'div',
// // 			attrs: [
// // 				{
// // 					name: 'a',
// // 					value: 'a',
// // 					quote: null,
// // 					equal: '=',
// // 					startLine: 0,
// // 					startCol: 5,
// // 					raw: 'a=a',
// // 					isInvalid: false,
// // 				},
// // 			],
// // 		}
// // 	);
// // });

// // test.only('standard', (t) => {
// // 	expect(
// // 		parseRawTag('<div a="a">', 1, 1, 0).toJSON(),
// // 		{
// // 			tagName: 'div',
// // 			attrs: [
// // 				{
// // 					name: {
// // 						raw: 'a',
// // 						startLine: 0,
// // 						startCol: 6,
// // 						endLine: 0,
// // 						endCol: 7,
// // 						startOffset: 6,
// // 						endOffset: 7,
// // 						beforeSpaces: {
// // 							raw: ' ',
// // 							style: 'space',
// // 						},
// // 					},
// // 					equal: {
// // 						raw: '=',
// // 						startLine: 1,
// // 						startCol: 1,
// // 						endLine: 1,
// // 						endCol: 1,
// // 						startOffset: 1,
// // 						endOffset: 1,
// // 						beforeSpaces: {
// // 							raw: '',
// // 							style: 'none',
// // 						},
// // 					},
// // 					quote: '"',
// // 					value: {
// // 						raw: 'a',
// // 						startLine: 1,
// // 						startCol: 1,
// // 						endLine: 1,
// // 						endCol: 1,
// // 						startOffset: 1,
// // 						endOffset: 1,
// // 						beforeSpaces: {
// // 							raw: '',
// // 							style: 'none',
// // 						},
// // 					},
// // 					startLine: 0,
// // 					startCol: 5,
// // 					raw: 'a="a"',
// // 					isInvalid: false,
// // 					beforeSpaces: {
// // 						raw: '',
// // 						style: 'none',
// // 					},
// // 				},
// // 			],
// // 		}
// // 	);
// // });

// // test('standard', (t) => {
// // 	expect(
// // 		parseRawTag('<div a=\'a\'>', 1, 1, 0).toJSON(),
// // 		{
// // 			tagName: 'div',
// // 			attrs: [
// // 				{
// // 					name: 'a',
// // 					value: 'a',
// // 					quote: '\'',
// // 					equal: '=',
// // 					startLine: 0,
// // 					startCol: 5,
// // 					raw: 'a=\'a\'',
// // 					isInvalid: false,
// // 				},
// // 			],
// // 		}
// // 	);
// // });

// // test('standard', (t) => {
// // 	expect(
// // 		parseRawTag('<div a="1" b="2">', 1, 1, 0).toJSON(),
// // 		{
// // 			tagName: 'div',
// // 			attrs: [
// // 				{
// // 					name: 'a',
// // 					value: '1',
// // 					quote: '"',
// // 					equal: '=',
// // 					startLine: 0,
// // 					startCol: 5,
// // 					raw: 'a="1"',
// // 					isInvalid: false,
// // 				},
// // 				{
// // 					name: 'b',
// // 					value: '2',
// // 					quote: '"',
// // 					equal: '=',
// // 					startLine: 0,
// // 					startCol: 11,
// // 					raw: 'b="2"',
// // 					isInvalid: false,
// // 				},
// // 			],
// // 		}
// // 	);
// // });

// // test('standard', (t) => {
// // 	expect(
// // 		parseRawTag('<div a="1" b=c=d>', 1, 1, 0).toJSON(),
// // 		{
// // 			tagName: 'div',
// // 			attrs: [
// // 				{
// // 					name: 'a',
// // 					value: '1',
// // 					quote: '"',
// // 					equal: '=',
// // 					startLine: 0,
// // 					startCol: 5,
// // 					raw: 'a="1"',
// // 					isInvalid: false,
// // 				},
// // 				{
// // 					name: 'b',
// // 					value: 'c=d',
// // 					quote: null,
// // 					equal: '=',
// // 					startLine: 0,
// // 					startCol: 11,
// // 					raw: 'b=c=d',
// // 					isInvalid: true,
// // 				},
// // 			],
// // 		}
// // 	);
// // });

// // test('standard', (t) => {
// // 	expect(
// // 		parseRawTag('<div a=>', 1, 1, 0).toJSON(),
// // 		{
// // 			tagName: 'div',
// // 			attrs: [
// // 				{
// // 					name: 'a',
// // 					value: null,
// // 					quote: null,
// // 					equal: '=',
// // 					startLine: 0,
// // 					startCol: 5,
// // 					raw: 'a=',
// // 					isInvalid: true,
// // 				},
// // 			],
// // 		}
// // 	);
// // });

test('standard', () => {
	expect(
		parseRawTag(
			`<div
a
	=
	"ab
c"
>`,
			1,
			1,
			0,
		),
	).toStrictEqual({
		tagName: 'div',
		attrs: [
			{
				raw: 'a\n\t=\n\t"ab\nc"',
				startLine: 2,
				endLine: 5,
				startCol: 1,
				endCol: 3,
				startOffset: 5,
				endOffset: 17,
				beforeSpaces: {
					raw: '\n',
					startLine: 1,
					endLine: 2,
					startCol: 5,
					endCol: 1,
					startOffset: 4,
					endOffset: 5,
				},
				name: {
					raw: 'a',
					startLine: 2,
					endLine: 2,
					startCol: 1,
					endCol: 2,
					startOffset: 5,
					endOffset: 6,
				},
				spacesBeforeEqual: {
					raw: '\n\t',
					startLine: 2,
					endLine: 3,
					startCol: 2,
					endCol: 2,
					startOffset: 6,
					endOffset: 8,
				},
				equal: {
					raw: '=',
					startLine: 3,
					endLine: 3,
					startCol: 2,
					endCol: 3,
					startOffset: 8,
					endOffset: 9,
				},
				spacesAfterEqual: {
					raw: '\n\t',
					startLine: 3,
					endLine: 4,
					startCol: 3,
					endCol: 2,
					startOffset: 9,
					endOffset: 11,
				},
				tokenBeforeValue: {
					raw: '"',
					startLine: 4,
					endLine: 4,
					startCol: 2,
					endCol: 3,
					startOffset: 11,
					endOffset: 12,
				},
				value: {
					raw: 'ab\nc',
					startLine: 4,
					endLine: 5,
					startCol: 3,
					endCol: 2,
					startOffset: 12,
					endOffset: 16,
				},
				tokenAfterValue: {
					raw: '"',
					startLine: 5,
					endLine: 5,
					startCol: 2,
					endCol: 3,
					startOffset: 16,
					endOffset: 17,
				},
				isInvalid: false,
			},
		],
	});
});

test('void element', () => {
	expect(parseRawTag('<img/>', 1, 1, 0)).toStrictEqual({
		tagName: 'img',
		attrs: [],
	});
});

test('void element', () => {
	expect(parseRawTag('<void />', 1, 1, 0)).toStrictEqual({
		tagName: 'void',
		attrs: [],
	});
});

test('namespace', () => {
	expect(parseRawTag('<ns:div>', 1, 1, 0)).toStrictEqual({
		tagName: 'ns:div',
		attrs: [],
	});
});

test('custom element', () => {
	expect(parseRawTag('<a😁-element>', 1, 1, 0)).toStrictEqual({
		tagName: 'a😁-element',
		attrs: [],
	});
});

test('custom element with full-width space', () => {
	expect(parseRawTag('<a　-element>', 1, 1, 0)).toStrictEqual({
		tagName: 'a　-element',
		attrs: [],
	});
});

describe('error', () => {
	// test('SyntaxError: <div', () => {
	// 	expect(parseRawTag('<div', 1, 1, 0)).toThrowError('Invalid tag syntax: <div');
	// });
	// test('SyntaxError: <>', () => {
	// 	expect(parseRawTag('<>', 1, 1, 0)).toThrowError('Invalid tag syntax: <>');
	// });
	// test('SyntaxError: < >', () => {
	// 	expect(parseRawTag('< >', 1, 1, 0)).toThrowError('Invalid tag name: "" in < >');
	// });
	// test('SyntaxError: <要素>', () => {
	// 	expect(parseRawTag('<要素>', 1, 1, 0)).toThrowError('Invalid tag name: "要素" in <要素>');
	// });
});
