import test from 'ava';
import { parseRawTag } from '../../lib/parser/parseRawTag';

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div>'),
		{
			tagName: 'div',
			attrs: [],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div >'),
		{
			tagName: 'div',
			attrs: [],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div >'),
		{
			tagName: 'div',
			attrs: [],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div  >'),
		{
			tagName: 'div',
			attrs: [],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag('<div a>'),
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
		parseRawTag('<div a a>'),
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
		parseRawTag('<div a a a>'),
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
		parseRawTag('<div abc a>'),
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
		parseRawTag('<div abc abc>'),
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
		parseRawTag('<div abc abc abc>'),
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
a>`),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: null,
					quote: null,
					line: 1,
					col: 0,
					raw: 'a',
				}
			],
		}
	);
});

test('standard', t => {
	t.deepEqual(
		parseRawTag(`<div


			a>`),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: null,
					quote: null,
					line: 3,
					col: 3,
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
>`),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: null,
					quote: null,
					line: 2,
					col: 0,
					raw: 'a',
				},
				{
					name: 'b',
					value: null,
					quote: null,
					line: 3,
					col: 2,
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
		`),
		{
			tagName: 'div',
			attrs: [
				{
					name: 'a',
					value: null,
					quote: null,
					line: 1,
					col: 5,
					raw: 'a',
				},
				{
					name: 'b',
					value: null,
					quote: null,
					line: 2,
					col: 6,
					raw: 'b',
				},
				{
					name: 'c',
					value: null,
					quote: null,
					line: 2,
					col: 8,
					raw: 'c',
				},
				{
					name: 'd',
					value: null,
					quote: null,
					line: 3,
					col: 6,
					raw: 'd',
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
