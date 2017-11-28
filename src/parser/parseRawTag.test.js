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

// test('standard', t => {
// 	t.deepEqual(
// 		parseRawTag(`<div
// a>`),
// 		{
// 			tagName: 'div',
// 			attrs: [
// 				{
// 					name: 'a',
// 					value: null,
// 					quote: null,
// 					line: 1,
// 					col: 0,
// 					raw: 'a',
// 				}
// 			],
// 		}
// 	);
// });

// test('standard', t => {
// 	t.deepEqual(
// 		parseRawTag(`<div


// 			a>`),
// 		{
// 			tagName: 'div',
// 			attrs: [
// 				{
// 					name: 'a',
// 					value: null,
// 					quote: null,
// 					line: 3,
// 					col: 3,
// 					raw: 'a',
// 				}
// 			],
// 		}
// 	);
// });

// test('standard', t => {
// 	t.deepEqual(
// 		parseRawTag(`
//    <div
//      a
//       b c
//       d>
// 		`),
// 		{
// 			tagName: 'div',
// 			attrs: [
// 				{
// 					name: 'a',
// 					value: null,
// 					quote: null,
// 					line: 2,
// 					col: 6,
// 					raw: 'a',
// 				},
// 				{
// 					name: 'b',
// 					value: null,
// 					quote: null,
// 					line: 3,
// 					col: 7,
// 					raw: 'b',
// 				},
// 				{
// 					name: 'c',
// 					value: null,
// 					quote: null,
// 					line: 3,
// 					col: 9,
// 					raw: 'c',
// 				},
// 				{
// 					name: 'd',
// 					value: null,
// 					quote: null,
// 					line: 4,
// 					col: 7,
// 					raw: 'd',
// 				}
// 			],
// 		}
// 	);
// });

// test('empty', t => {
// 	const r = parser(``);
// 	const e = [];
// 	r.walk((n) => e.push(n.nodeName));
// 	t.is(e.join(''), '');
// });

// test('doctype', t => {
// 	const r = parser(`<!doctype html>`);
// 	t.is(r.getNode(0).nodeName, '#doctype');
// 	t.is(r.getNode(0).publicId, null);
// 	t.is(r.getNode(0).dtd, null);
// });

// test('doctype', t => {
// 	const r = parser(`<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">`);
// 	t.is(r.getNode(0).publicId, '-//W3C//DTD HTML 4.01//EN');
// 	t.is(r.getNode(0).dtd, 'http://www.w3.org/TR/html4/strict.dtd');
// });

test('noop', t => t.pass());
