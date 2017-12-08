import test from 'ava';
import { parseRawTag } from '../../lib/parser/parseRawTag';

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div>', 0, 0),
		{
			tagName: 'div',
			attrs: [],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div >', 0, 0),
		{
			tagName: 'div',
			attrs: [],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div >', 0, 0),
		{
			tagName: 'div',
			attrs: [],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div  >', 0, 0),
		{
			tagName: 'div',
			attrs: [],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div a>', 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: null,
					quote: null,
					line: 0,
					col: 5,
					raw: 'a',
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div a a>', 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: null,
					quote: null,
					line: 0,
					col: 5,
					raw: 'a',
				},
				{
					name: 'a',
					value: null,
					quote: null,
					line: 0,
					col: 7,
					raw: 'a',
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div a a a>', 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: null,
					quote: null,
					line: 0,
					col: 5,
					raw: 'a',
				},
				{
					name: 'a',
					value: null,
					quote: null,
					line: 0,
					col: 7,
					raw: 'a',
				},
				{
					name: 'a',
					value: null,
					quote: null,
					line: 0,
					col: 9,
					raw: 'a',
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div abc a>', 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'abc',
					value: null,
					quote: null,
					line: 0,
					col: 5,
					raw: 'abc',
				},
				{
					name: 'a',
					value: null,
					quote: null,
					line: 0,
					col: 9,
					raw: 'a',
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div abc abc>', 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'abc',
					value: null,
					quote: null,
					line: 0,
					col: 5,
					raw: 'abc',
				},
				{
					name: 'abc',
					value: null,
					quote: null,
					line: 0,
					col: 9,
					raw: 'abc',
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div abc abc abc>', 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'abc',
					value: null,
					quote: null,
					line: 0,
					col: 5,
					raw: 'abc',
				},
				{
					name: 'abc',
					value: null,
					quote: null,
					line: 0,
					col: 9,
					raw: 'abc',
				},
				{
					name: 'abc',
					value: null,
					quote: null,
					line: 0,
					col: 13,
					raw: 'abc',
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag(`<div
a>`, 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: null,
					quote: null,
					line: 1,
					col: 1,
					raw: 'a',
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag(`<div


			a>`, 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: null,
					quote: null,
					line: 3,
					col: 4,
					raw: 'a',
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag(`

<div

a
  b
>`, 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: null,
					quote: null,
					line: 2,
					col: 1,
					raw: 'a',
				},
				{
					name: 'b',
					value: null,
					quote: null,
					line: 3,
					col: 3,
					raw: 'b',
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag(`<div
     a
      b c
      d>
		`, 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: null,
					quote: null,
					line: 1,
					col: 6,
					raw: 'a',
				},
				{
					name: 'b',
					value: null,
					quote: null,
					line: 2,
					col: 7,
					raw: 'b',
				},
				{
					name: 'c',
					value: null,
					quote: null,
					line: 2,
					col: 9,
					raw: 'c',
				},
				{
					name: 'd',
					value: null,
					quote: null,
					line: 3,
					col: 7,
					raw: 'd',
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div a=a>', 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: 'a',
					quote: null,
					line: 0,
					col: 5,
					raw: 'a=a',
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div a="a">', 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: 'a',
					quote: '"',
					line: 0,
					col: 5,
					raw: 'a="a"',
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div a=\'a\'>', 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: 'a',
					quote: '\'',
					line: 0,
					col: 5,
					raw: 'a=\'a\'',
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div a="1" b="2">', 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: '1',
					quote: '"',
					line: 0,
					col: 5,
					raw: 'a="1"',
				},
				{
					name: 'b',
					value: '2',
					quote: '"',
					line: 0,
					col: 11,
					raw: 'b="2"',
				}
			],
		}
	);
});

test('error', t => {
	t.is(t.throws(() => parseRawTag('<div'), SyntaxError).message, 'Invalid tag syntax');
});

test('error', t => {
	t.is(t.throws(() => parseRawTag('<>'), SyntaxError).message, 'Invalid tag syntax');
});

test('error', t => {
	t.is(t.throws(() => parseRawTag('< >'), SyntaxError).message, 'Invalid tag name');
});

test('error', t => {
	t.is(t.throws(() => parseRawTag('<要素>'), SyntaxError).message, 'Invalid tag name');
});

test('noop', t => t.pass());
