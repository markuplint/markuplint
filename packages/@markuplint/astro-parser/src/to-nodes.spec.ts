import { describe, test, expect } from 'vitest';

import { astroParse } from './astro-parser.js';
import { toNodes } from './to-nodes.js';

const nodes = (code: string) => toNodes(astroParse(code));

describe('toNodes', () => {
	test('lists the frontmatter, then the body', () => {
		expect(nodes('---\nconst a = 1;\n---\n<p>x</p>')).toStrictEqual([
			{ type: 'frontmatter', start: 0, end: 20 },
			{ type: 'element', start: 21, end: 29, children: [{ type: 'text', start: 24, end: 25 }] },
		]);
	});

	test('omits the frontmatter when the source has none', () => {
		expect(nodes('<p></p>')).toStrictEqual([{ type: 'element', start: 0, end: 7, children: [] }]);
	});

	test('keeps an empty frontmatter that is written', () => {
		expect(nodes('---\n---\n<p></p>')).toStrictEqual([
			{ type: 'frontmatter', start: 0, end: 7 },
			{ type: 'element', start: 8, end: 15, children: [] },
		]);
	});

	test('reports the doctype with its value and the comment', () => {
		expect(nodes('<!doctype html>\n<!-- c -->')).toStrictEqual([
			{ type: 'doctype', start: 0, end: 15, value: 'html' },
			{ type: 'text', start: 15, end: 16 },
			{ type: 'comment', start: 16, end: 26 },
		]);
	});

	test('takes the range of a script body from its start and end tags', () => {
		// The range of the `AstroScript` node itself is that of the whole element.
		expect(nodes('<script>let x=1<2;</script>')).toStrictEqual([
			{ type: 'element', start: 0, end: 27, children: [{ type: 'text', start: 8, end: 18 }] },
		]);
	});

	test('a self-closing script has no body', () => {
		expect(nodes('<script />')).toStrictEqual([{ type: 'element', start: 0, end: 10, children: [] }]);
	});

	test('a script nested in an element keeps the range of its own body', () => {
		expect(nodes('<div><script>let a;</script></div>')).toStrictEqual([
			{
				type: 'element',
				start: 0,
				end: 34,
				children: [{ type: 'element', start: 5, end: 28, children: [{ type: 'text', start: 13, end: 19 }] }],
			},
		]);
	});

	test('reports a fragment as an element', () => {
		expect(nodes('<><b></b></>')).toStrictEqual([
			{ type: 'element', start: 0, end: 12, children: [{ type: 'element', start: 2, end: 9, children: [] }] },
		]);
	});

	test('counts offsets in UTF-16 code units for multi-byte text', () => {
		expect(nodes('<p>日本語{x}</p>')).toStrictEqual([
			{
				type: 'element',
				start: 0,
				end: 13,
				children: [
					{ type: 'text', start: 3, end: 6 },
					{ type: 'expression', start: 6, end: 9, children: [] },
				],
			},
		]);
	});

	describe('expressions', () => {
		test('an expression without JSX has no children', () => {
			expect(nodes('<p>Hello {name}!</p>')).toStrictEqual([
				{
					type: 'element',
					start: 0,
					end: 20,
					children: [
						{ type: 'text', start: 3, end: 9 },
						{ type: 'expression', start: 9, end: 15, children: [] },
						{ type: 'text', start: 15, end: 16 },
					],
				},
			]);
		});

		test('JSX in an expression is a child, with the code around it as text', () => {
			expect(nodes('<ul>{items.map(i => <li>{i}</li>)}</ul>')).toStrictEqual([
				{
					type: 'element',
					start: 0,
					end: 39,
					children: [
						{
							type: 'expression',
							start: 4,
							end: 34,
							children: [
								{ type: 'text', start: 5, end: 20 },
								{
									type: 'element',
									start: 20,
									end: 32,
									children: [{ type: 'expression', start: 24, end: 27, children: [] }],
								},
								{ type: 'text', start: 32, end: 33 },
							],
						},
					],
				},
			]);
		});

		test('JSX that starts and ends the expression has no text around it', () => {
			expect(nodes('<p>{<b></b>}</p>')).toStrictEqual([
				{
					type: 'element',
					start: 0,
					end: 16,
					children: [
						{
							type: 'expression',
							start: 3,
							end: 12,
							children: [{ type: 'element', start: 4, end: 11, children: [] }],
						},
					],
				},
			]);
		});

		test('every outermost JSX node of a conditional expression is a child', () => {
			expect(nodes('<p>{a ? <b></b> : <i></i>}</p>')).toStrictEqual([
				{
					type: 'element',
					start: 0,
					end: 30,
					children: [
						{
							type: 'expression',
							start: 3,
							end: 26,
							children: [
								{ type: 'text', start: 4, end: 8 },
								{ type: 'element', start: 8, end: 15, children: [] },
								{ type: 'text', start: 15, end: 18 },
								{ type: 'element', start: 18, end: 25, children: [] },
							],
						},
					],
				},
			]);
		});
	});
});
