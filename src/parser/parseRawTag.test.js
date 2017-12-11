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
					equal: null,
					line: 0,
					col: 5,
					raw: 'a',
					invalid: false,
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
					equal: null,
					line: 0,
					col: 5,
					raw: 'a',
					invalid: false,
				},
				{
					name: 'a',
					value: null,
					quote: null,
					equal: null,
					line: 0,
					col: 7,
					raw: 'a',
					invalid: false,
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
					equal: null,
					line: 0,
					col: 5,
					raw: 'a',
					invalid: false,
				},
				{
					name: 'a',
					value: null,
					quote: null,
					equal: null,
					line: 0,
					col: 7,
					raw: 'a',
					invalid: false,
				},
				{
					name: 'a',
					value: null,
					quote: null,
					equal: null,
					line: 0,
					col: 9,
					raw: 'a',
					invalid: false,
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
					equal: null,
					line: 0,
					col: 5,
					raw: 'abc',
					invalid: false,
				},
				{
					name: 'a',
					value: null,
					quote: null,
					equal: null,
					line: 0,
					col: 9,
					raw: 'a',
					invalid: false,
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
					equal: null,
					line: 0,
					col: 5,
					raw: 'abc',
					invalid: false,
				},
				{
					name: 'abc',
					value: null,
					quote: null,
					equal: null,
					line: 0,
					col: 9,
					raw: 'abc',
					invalid: false,
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
					equal: null,
					line: 0,
					col: 5,
					raw: 'abc',
					invalid: false,
				},
				{
					name: 'abc',
					value: null,
					quote: null,
					equal: null,
					line: 0,
					col: 9,
					raw: 'abc',
					invalid: false,
				},
				{
					name: 'abc',
					value: null,
					quote: null,
					equal: null,
					line: 0,
					col: 13,
					raw: 'abc',
					invalid: false,
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
					equal: null,
					line: 1,
					col: 1,
					raw: 'a',
					invalid: false,
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
					equal: null,
					line: 3,
					col: 4,
					raw: 'a',
					invalid: false,
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
					equal: null,
					line: 2,
					col: 1,
					raw: 'a',
					invalid: false,
				},
				{
					name: 'b',
					value: null,
					quote: null,
					equal: null,
					line: 3,
					col: 3,
					raw: 'b',
					invalid: false,
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
					equal: null,
					line: 1,
					col: 6,
					raw: 'a',
					invalid: false,
				},
				{
					name: 'b',
					value: null,
					quote: null,
					equal: null,
					line: 2,
					col: 7,
					raw: 'b',
					invalid: false,
				},
				{
					name: 'c',
					value: null,
					quote: null,
					equal: null,
					line: 2,
					col: 9,
					raw: 'c',
					invalid: false,
				},
				{
					name: 'd',
					value: null,
					quote: null,
					equal: null,
					line: 3,
					col: 7,
					raw: 'd',
					invalid: false,
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
					equal: '=',
					line: 0,
					col: 5,
					raw: 'a=a',
					invalid: false,
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
					equal: '=',
					line: 0,
					col: 5,
					raw: 'a="a"',
					invalid: false,
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
					equal: '=',
					line: 0,
					col: 5,
					raw: 'a=\'a\'',
					invalid: false,
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
					equal: '=',
					line: 0,
					col: 5,
					raw: 'a="1"',
					invalid: false,
				},
				{
					name: 'b',
					value: '2',
					quote: '"',
					equal: '=',
					line: 0,
					col: 11,
					raw: 'b="2"',
					invalid: false,
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div a="1" b=c=d>', 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: '1',
					quote: '"',
					equal: '=',
					line: 0,
					col: 5,
					raw: 'a="1"',
					invalid: false,
				},
				{
					name: 'b',
					value: 'c=d',
					quote: null,
					equal: '=',
					line: 0,
					col: 11,
					raw: 'b=c=d',
					invalid: true,
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div a=>', 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: null,
					quote: null,
					equal: '=',
					line: 0,
					col: 5,
					raw: 'a=',
					invalid: true,
				},
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div a = "abc">', 0, 0),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: 'abc',
					quote: '"',
					equal: ' = ',
					line: 0,
					col: 5,
					raw: 'a = "abc"',
					invalid: false,
				},
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
