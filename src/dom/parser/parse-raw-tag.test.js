import test from 'ava';
import parseRawTag from '../../../lib/dom/parser/parse-raw-tag';

test('tag only', (t) => {
	t.deepEqual(
		parseRawTag('<div>', 1, 1, 0).toJSON(),
		{
			tagName: 'div',
			attrs: [],
		}
	);
});

test('tag only has space', (t) => {
	t.deepEqual(
		parseRawTag('<div >', 1, 1, 0).toJSON(),
		{
			tagName: 'div',
			attrs: [],
		}
	);
});

test('tag only has spaces', (t) => {
	t.deepEqual(
		parseRawTag('<div  >', 1, 1, 0).toJSON(),
		{
			tagName: 'div',
			attrs: [],
		}
	);
});

test('has attribute', (t) => {
	t.deepEqual(
		parseRawTag('<div a>', 1, 1, 0).toJSON(),
		{
			tagName: 'div',
			attrs: [
				{
					raw: 'a',
					line: 1,
					endLine: 1,
					col: 6,
					endCol: 7,
					startOffset: 5,
					endOffset: 6,
					name: {
						raw: 'a',
						line: 1,
						endLine: 1,
						col: 6,
						endCol: 7,
						startOffset: 5,
						endOffset: 6,
					},
					equal: null,
					value: null,
					invalid: false,
				},
			],
		}
	);
});

test('2 attributes', (t) => {
	t.deepEqual(
		parseRawTag('<div b c>', 1, 1, 0).toJSON(),
		{
			tagName: 'div',
			attrs: [
				{
					raw: 'b',
					line: 1,
					endLine: 1,
					col: 6,
					endCol: 7,
					startOffset: 5,
					endOffset: 6,
					name: {
						raw: 'b',
						line: 1,
						endLine: 1,
						col: 6,
						endCol: 7,
						startOffset: 5,
						endOffset: 6,
					},
					equal: null,
					value: null,
					invalid: false,
				},
				{
					raw: 'c',
					line: 1,
					endLine: 1,
					col: 8,
					endCol: 9,
					startOffset: 7,
					endOffset: 8,
					name: {
						raw: 'c',
						line: 1,
						endLine: 1,
						col: 8,
						endCol: 9,
						startOffset: 7,
						endOffset: 8,
					},
					equal: null,
					value: null,
					invalid: false,
				},
			],
		}
	);
});

test('3 attributes', (t) => {
	t.deepEqual(
		parseRawTag('<div a a a>', 1, 1, 0).attrs.length,
		3,
	);
});

test('has line break', (t) => {
	t.deepEqual(
		parseRawTag(`<div
a>`, 1, 1, 0).toJSON(),
		{
			tagName: 'div',
			attrs: [
				{
					raw: 'a',
					line: 2,
					endLine: 2,
					col: 1,
					endCol: 2,
					startOffset: 5,
					endOffset: 6,
					name: {
						raw: 'a',
						line: 2,
						endLine: 2,
						col: 1,
						endCol: 2,
						startOffset: 5,
						endOffset: 6,
					},
					equal: null,
					value: null,
					invalid: false,
				},
			],
		}
	);
});

test('has multiple line breaks', (t) => {
	t.deepEqual(
		parseRawTag(`<div


			a>`, 1, 1, 0).toJSON(),
		{
			tagName: 'div',
			attrs: [
				{
					raw: 'a',
					line: 4,
					endLine: 4,
					col: 4,
					endCol: 5,
					startOffset: 10,
					endOffset: 11,
					name: {
						raw: 'a',
						line: 4,
						endLine: 4,
						col: 4,
						endCol: 5,
						startOffset: 10,
						endOffset: 11,
					},
					equal: null,
					value: null,
					invalid: false,
				},
			],
		}
	);
});

// test('standard', (t) => {
// 	t.deepEqual(
// 		parseRawTag(`<div
//      a
//       b c
//       d>
// 		`, 1, 1, 0).toJSON(),
// 		{
// 			tagName: 'div',
// 			attrs: [
// 				{
// 					name: 'a',
// 					value: null,
// 					quote: null,
// 					equal: null,
// 					line: 1,
// 					col: 6,
// 					raw: 'a',
// 					invalid: false,
// 				},
// 				{
// 					name: 'b',
// 					value: null,
// 					quote: null,
// 					equal: null,
// 					line: 2,
// 					col: 7,
// 					raw: 'b',
// 					invalid: false,
// 				},
// 				{
// 					name: 'c',
// 					value: null,
// 					quote: null,
// 					equal: null,
// 					line: 2,
// 					col: 9,
// 					raw: 'c',
// 					invalid: false,
// 				},
// 				{
// 					name: 'd',
// 					value: null,
// 					quote: null,
// 					equal: null,
// 					line: 3,
// 					col: 7,
// 					raw: 'd',
// 					invalid: false,
// 				},
// 			],
// 		}
// 	);
// });

// test('standard', (t) => {
// 	t.deepEqual(
// 		parseRawTag('<div a=a>', 1, 1, 0).toJSON(),
// 		{
// 			tagName: 'div',
// 			attrs: [
// 				{
// 					name: 'a',
// 					value: 'a',
// 					quote: null,
// 					equal: '=',
// 					line: 0,
// 					col: 5,
// 					raw: 'a=a',
// 					invalid: false,
// 				},
// 			],
// 		}
// 	);
// });

// test.only('standard', (t) => {
// 	t.deepEqual(
// 		parseRawTag('<div a="a">', 1, 1, 0).toJSON(),
// 		{
// 			tagName: 'div',
// 			attrs: [
// 				{
// 					name: {
// 						raw: 'a',
// 						line: 0,
// 						col: 6,
// 						endLine: 0,
// 						endCol: 7,
// 						startOffset: 6,
// 						endOffset: 7,
// 						beforeSpaces: {
// 							raw: ' ',
// 							style: 'space',
// 						},
// 					},
// 					equal: {
// 						raw: '=',
// 						line: 1,
// 						col: 1,
// 						endLine: 1,
// 						endCol: 1,
// 						startOffset: 1,
// 						endOffset: 1,
// 						beforeSpaces: {
// 							raw: '',
// 							style: 'none',
// 						},
// 					},
// 					quote: '"',
// 					value: {
// 						raw: 'a',
// 						line: 1,
// 						col: 1,
// 						endLine: 1,
// 						endCol: 1,
// 						startOffset: 1,
// 						endOffset: 1,
// 						beforeSpaces: {
// 							raw: '',
// 							style: 'none',
// 						},
// 					},
// 					line: 0,
// 					col: 5,
// 					raw: 'a="a"',
// 					invalid: false,
// 					beforeSpaces: {
// 						raw: '',
// 						style: 'none',
// 					},
// 				},
// 			],
// 		}
// 	);
// });

// test('standard', (t) => {
// 	t.deepEqual(
// 		parseRawTag('<div a=\'a\'>', 1, 1, 0).toJSON(),
// 		{
// 			tagName: 'div',
// 			attrs: [
// 				{
// 					name: 'a',
// 					value: 'a',
// 					quote: '\'',
// 					equal: '=',
// 					line: 0,
// 					col: 5,
// 					raw: 'a=\'a\'',
// 					invalid: false,
// 				},
// 			],
// 		}
// 	);
// });

// test('standard', (t) => {
// 	t.deepEqual(
// 		parseRawTag('<div a="1" b="2">', 1, 1, 0).toJSON(),
// 		{
// 			tagName: 'div',
// 			attrs: [
// 				{
// 					name: 'a',
// 					value: '1',
// 					quote: '"',
// 					equal: '=',
// 					line: 0,
// 					col: 5,
// 					raw: 'a="1"',
// 					invalid: false,
// 				},
// 				{
// 					name: 'b',
// 					value: '2',
// 					quote: '"',
// 					equal: '=',
// 					line: 0,
// 					col: 11,
// 					raw: 'b="2"',
// 					invalid: false,
// 				},
// 			],
// 		}
// 	);
// });

// test('standard', (t) => {
// 	t.deepEqual(
// 		parseRawTag('<div a="1" b=c=d>', 1, 1, 0).toJSON(),
// 		{
// 			tagName: 'div',
// 			attrs: [
// 				{
// 					name: 'a',
// 					value: '1',
// 					quote: '"',
// 					equal: '=',
// 					line: 0,
// 					col: 5,
// 					raw: 'a="1"',
// 					invalid: false,
// 				},
// 				{
// 					name: 'b',
// 					value: 'c=d',
// 					quote: null,
// 					equal: '=',
// 					line: 0,
// 					col: 11,
// 					raw: 'b=c=d',
// 					invalid: true,
// 				},
// 			],
// 		}
// 	);
// });

// test('standard', (t) => {
// 	t.deepEqual(
// 		parseRawTag('<div a=>', 1, 1, 0).toJSON(),
// 		{
// 			tagName: 'div',
// 			attrs: [
// 				{
// 					name: 'a',
// 					value: null,
// 					quote: null,
// 					equal: '=',
// 					line: 0,
// 					col: 5,
// 					raw: 'a=',
// 					invalid: true,
// 				},
// 			],
// 		}
// 	);
// });

test('standard', (t) => {
	t.deepEqual(
		parseRawTag(`<div
a
  =
	"ab
c"
>`, 1, 1, 0).toJSON(),
		{
			tagName: 'div',
			attrs: [
				{
					raw: 'a\n  =\n\t"ab\nc"',
					line: 2,
					endLine: 5,
					col: 1,
					endCol: 3,
					startOffset: 5,
					endOffset: 18,
					name: {
						raw: 'a',
						line: 2,
						endLine: 2,
						col: 1,
						endCol: 2,
						startOffset: 5,
						endOffset: 6,
					},
					equal: {
						raw: '=',
						line: 3,
						endLine: 3,
						col: 3,
						endCol: 4,
						startOffset: 9,
						endOffset: 10,
					},
					value: {
						value: 'ab\nc',
						quote: '"',
						raw: '"ab\nc"',
						line: 4,
						endLine: 5,
						col: 2,
						endCol: 3,
						startOffset: 12,
						endOffset: 18,
					},
					invalid: false,
				},
			],
		}
	);
});

test('namespace', (t) => {
	t.deepEqual(
		parseRawTag('<ns:div>', 1, 1, 0).toJSON(),
		{
			tagName: 'ns:div',
			attrs: [],
		}
	);
});

test('custom element', (t) => {
	t.deepEqual(
		parseRawTag('<a😁-element>', 1, 1, 0).toJSON(),
		{
			tagName: 'a😁-element',
			attrs: [],
		}
	);
});

test('error', (t) => {
	t.is(t.throws(() => parseRawTag('<div').toJSON(), SyntaxError).message, 'Invalid tag syntax: <div');
});

test('error', (t) => {
	t.is(t.throws(() => parseRawTag('<>').toJSON(), SyntaxError).message, 'Invalid tag syntax: <>');
});

test('error', (t) => {
	t.is(t.throws(() => parseRawTag('< >').toJSON(), SyntaxError).message, 'Invalid tag name: < >');
});

test('error', (t) => {
	t.is(t.throws(() => parseRawTag('<要素>').toJSON(), SyntaxError).message, 'Invalid tag name: <要素>');
});

test('noop', (t) => t.pass());
