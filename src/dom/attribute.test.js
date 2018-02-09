import test from 'ava';
import Attribute from '../../lib/dom/attribute';

test('normal', (t) => {
	t.deepEqual(
		new Attribute(' abc="123"', 1, 1, 0).toJSON(),
		{
			line: 1,
			endLine: 1,
			col: 1,
			endCol: 11,
			startOffset: 0,
			endOffset: 10,
			raw: ' abc="123"',
			invalid: false,
			name: {
				raw: 'abc',
				line: 1,
				endLine: 1,
				col: 2,
				endCol: 5,
				startOffset: 1,
				endOffset: 4,
			},
			equal: {
				raw: '=',
				line: 1,
				endLine: 1,
				col: 5,
				endCol: 6,
				startOffset: 4,
				endOffset: 5,
			},
			value: {
				value: '123',
				quote: '"',
				raw: '"123"',
				line: 1,
				endLine: 1,
				col: 6,
				endCol: 11,
				startOffset: 5,
				endOffset: 10,
			},
		}
	);
});

test('single quote', (t) => {
	t.deepEqual(
		new Attribute('  q=\'a\'', 1, 1, 0).toJSON(),
		{
			line: 1,
			endLine: 1,
			col: 1,
			endCol: 8,
			startOffset: 0,
			endOffset: 7,
			raw: '  q=\'a\'',
			invalid: false,
			name: {
				raw: 'q',
				line: 1,
				endLine: 1,
				col: 3,
				endCol: 4,
				startOffset: 2,
				endOffset: 3,
			},
			equal: {
				raw: '=',
				line: 1,
				endLine: 1,
				col: 4,
				endCol: 5,
				startOffset: 3,
				endOffset: 4,
			},
			value: {
				value: 'a',
				quote: '\'',
				raw: '\'a\'',
				line: 1,
				endLine: 1,
				col: 5,
				endCol: 8,
				startOffset: 4,
				endOffset: 7,
			},
		}
	);
});

test('no quote', (t) => {
	t.deepEqual(
		new Attribute('q=a', 1, 1, 0).toJSON(),
		{
			line: 1,
			endLine: 1,
			col: 1,
			endCol: 4,
			startOffset: 0,
			endOffset: 3,
			raw: 'q=a',
			invalid: false,
			name: {
				raw: 'q',
				line: 1,
				endLine: 1,
				col: 1,
				endCol: 2,
				startOffset: 0,
				endOffset: 1,
			},
			equal: {
				raw: '=',
				line: 1,
				endLine: 1,
				col: 2,
				endCol: 3,
				startOffset: 1,
				endOffset: 2,
			},
			value: {
				value: 'a',
				quote: null,
				raw: 'a',
				line: 1,
				endLine: 1,
				col: 3,
				endCol: 4,
				startOffset: 2,
				endOffset: 3,
			},
		}
	);
});

test('empty', (t) => {
	t.deepEqual(
		new Attribute('q', 1, 1, 0).toJSON(),
		{
			line: 1,
			endLine: 1,
			col: 1,
			endCol: 2,
			startOffset: 0,
			endOffset: 1,
			raw: 'q',
			invalid: false,
			name: {
				raw: 'q',
				line: 1,
				endLine: 1,
				col: 1,
				endCol: 2,
				startOffset: 0,
				endOffset: 1,
			},
			equal: null,
			value: null,
		}
	);
});

test('invalid: no value', (t) => {
	t.deepEqual(
		new Attribute('q=', 1, 1, 0).toJSON(),
		{
			line: 1,
			endLine: 1,
			col: 1,
			endCol: 3,
			startOffset: 0,
			endOffset: 2,
			raw: 'q=',
			invalid: true,
			name: {
				raw: 'q',
				line: 1,
				endLine: 1,
				col: 1,
				endCol: 2,
				startOffset: 0,
				endOffset: 1,
			},
			equal: {
				raw: '=',
				line: 1,
				endLine: 1,
				col: 2,
				endCol: 3,
				startOffset: 1,
				endOffset: 2,
			},
			value: null,
		}
	);
});

test('spaces', (t) => {
	t.deepEqual(
		new Attribute('abc  =  "efg"', 1, 1, 0).toJSON(),
		{
			line: 1,
			endLine: 1,
			col: 1,
			endCol: 14,
			startOffset: 0,
			endOffset: 13,
			raw: 'abc  =  "efg"',
			invalid: false,
			name: {
				raw: 'abc',
				line: 1,
				endLine: 1,
				col: 1,
				endCol: 4,
				startOffset: 0,
				endOffset: 3,
			},
			equal: {
				raw: '=',
				line: 1,
				endLine: 1,
				col: 6,
				endCol: 7,
				startOffset: 5,
				endOffset: 6,
			},
			value: {
				value: 'efg',
				quote: '"',
				raw: '"efg"',
				line: 1,
				endLine: 1,
				col: 9,
				endCol: 14,
				startOffset: 8,
				endOffset: 13,
			},
		}
	);
});

test('line break', (t) => {
	t.deepEqual(
		new Attribute(`
 abc

   =

  "e

     fg

"`, 1, 1, 0).toJSON(),
		{
			line: 1,
			endLine: 10,
			col: 1,
			endCol: 2,
			startOffset: 0,
			endOffset: 29,
			raw: '\n abc\n\n   =\n\n  "e\n\n     fg\n\n"',
			invalid: false,
			name: {
				raw: 'abc',
				line: 2,
				endLine: 2,
				col: 2,
				endCol: 5,
				startOffset: 2,
				endOffset: 5,
			},
			equal: {
				raw: '=',
				line: 4,
				endLine: 4,
				col: 4,
				endCol: 5,
				startOffset: 10,
				endOffset: 11,
			},
			value: {
				value: 'e\n\n     fg\n\n',
				quote: '"',
				raw: '"e\n\n     fg\n\n"',
				line: 6,
				endLine: 10,
				col: 3,
				endCol: 2,
				startOffset: 15,
				endOffset: 29,
			},
		}
	);
});

test('noop', (t) => t.pass());
