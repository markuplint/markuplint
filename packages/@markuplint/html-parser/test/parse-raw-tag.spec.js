const parseRawTag = require('../lib/parse-raw-tag').default;

test('tag only', () => {
	expect(parseRawTag('<div>', 1, 1, 0)).toMatchObject({
		tagName: 'div',
		attrs: [],
	});
});

test('tag only has space', () => {
	expect(parseRawTag('<div >', 1, 1, 0)).toMatchObject({
		tagName: 'div',
		attrs: [],
	});
});

test('tag only has spaces', () => {
	expect(parseRawTag('<div  >', 1, 1, 0)).toMatchObject({
		tagName: 'div',
		attrs: [],
		selfClosingSolidus: {
			raw: '',
		},
		endSpace: {
			raw: '  ',
		},
	});
});

test('self closing tag', () => {
	expect(parseRawTag('<div />', 1, 1, 0)).toMatchObject({
		tagName: 'div',
		attrs: [],
		selfClosingSolidus: {
			raw: ' /',
		},
		endSpace: {
			raw: '',
		},
	});
});

test('has attribute', () => {
	expect(parseRawTag('<div a>', 1, 1, 0)).toMatchObject({
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
				spacesBeforeName: {
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
			},
		],
	});
});

test('2 attributes', () => {
	expect(parseRawTag('<div b c>', 1, 1, 0)).toMatchObject({
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
				spacesBeforeName: {
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
			},
			{
				raw: 'c',
				startLine: 1,
				endLine: 1,
				startCol: 8,
				endCol: 9,
				startOffset: 7,
				endOffset: 8,
				spacesBeforeName: {
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
	).toMatchObject({
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
				spacesBeforeName: {
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
	).toMatchObject({
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
				spacesBeforeName: {
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
			},
		],
	});
});

test('after line break', () => {
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
		spacesBeforeName: {
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

test('standard', () => {
	expect(
		parseRawTag(
			`<div
     a
      b c
      d>
		`,
			1,
			1,
			0,
		),
	).toMatchObject({
		tagName: 'div',
		attrs: [
			{
				name: {
					raw: 'a',
				},
				startLine: 2,
				startCol: 6,
				raw: 'a',
			},
			{
				name: {
					raw: 'b',
				},
				startLine: 3,
				startCol: 7,
				raw: 'b',
			},
			{
				name: {
					raw: 'c',
				},
				startLine: 3,
				startCol: 9,
				raw: 'c',
			},
			{
				name: {
					raw: 'd',
				},
				startLine: 4,
				startCol: 7,
				raw: 'd',
			},
		],
	});
});

test('standard', () => {
	expect(parseRawTag('<div a=a>', 1, 1, 0)).toMatchObject({
		tagName: 'div',
		attrs: [
			{
				raw: 'a=a',
				spacesBeforeName: { raw: ' ' },
				name: { raw: 'a' },
				spacesBeforeEqual: { raw: '' },
				equal: { raw: '=' },
				spacesAfterEqual: { raw: '' },
				startQuote: { raw: '' },
				value: { raw: 'a' },
				endQuote: { raw: '' },
				startLine: 1,
				startCol: 6,
			},
		],
	});
});

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
	).toMatchObject({
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
				spacesBeforeName: {
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
				startQuote: {
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
				endQuote: {
					raw: '"',
					startLine: 5,
					endLine: 5,
					startCol: 2,
					endCol: 3,
					startOffset: 16,
					endOffset: 17,
				},
			},
		],
	});
});

test('void element', () => {
	expect(parseRawTag('<img/>', 1, 1, 0)).toMatchObject({
		tagName: 'img',
		attrs: [],
	});
});

test('void element', () => {
	expect(parseRawTag('<void />', 1, 1, 0)).toMatchObject({
		tagName: 'void',
		attrs: [],
	});
});

test('namespace', () => {
	expect(parseRawTag('<ns:div>', 1, 1, 0)).toMatchObject({
		tagName: 'ns:div',
		attrs: [],
	});
});

test('custom element', () => {
	expect(parseRawTag('<a😁-element>', 1, 1, 0)).toMatchObject({
		tagName: 'a😁-element',
		attrs: [],
	});
});

test('custom element with full-width space', () => {
	expect(parseRawTag('<a　-element>', 1, 1, 0)).toMatchObject({
		tagName: 'a　-element',
		attrs: [],
	});
});

describe('error', () => {
	test('SyntaxError: <div', () => {
		expect(() => parseRawTag('<div', 1, 1, 0)).toThrow('Invalid tag syntax: "<div"');
	});

	test('SyntaxError: <>', () => {
		expect(() => parseRawTag('<>', 1, 1, 0)).toThrow('Invalid tag syntax: "<>"');
	});

	test('SyntaxError: < >', () => {
		expect(() => parseRawTag('< >', 1, 1, 0)).toThrow('Invalid tag name: "" in < >');
	});

	test('SyntaxError: <要素>', () => {
		expect(() => parseRawTag('<要素>', 1, 1, 0)).toThrow('Invalid tag name: "要素" in <要素>');
	});
});

test('include gt sign', () => {
	expect(parseRawTag('<div a=" > ">', 1, 1, 0).attrs[0].raw).toBe('a=" > "');
});
