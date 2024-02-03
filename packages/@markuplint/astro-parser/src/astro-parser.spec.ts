// @ts-nocheck

import { describe, test, expect } from 'vitest';

import { astroParse } from './astro-parser.js';

test('Basic', () => {
	const ast = astroParse(`---
const name = "World";
---
<!-- Comment -->
<style>
div {
    color: red;
}
</style>
<div data-attr="v">Hello {name}!</div>
`);
	expect(ast).toStrictEqual(
		expect.objectContaining({
			children: [
				{
					position: {
						end: {
							column: 4,
							line: 3,
							offset: 29,
						},
						start: {
							column: 1,
							line: 1,
							offset: 0,
						},
					},
					type: 'frontmatter',
					value: '\nconst name = "World";\n',
				},
				{
					position: {
						end: {
							column: 17,
							line: 4,
							offset: 46,
						},
						start: {
							column: 5,
							line: 4,
							offset: 30,
						},
					},
					type: 'comment',
					value: ' Comment ',
				},
				{
					attributes: [],
					children: [
						{
							position: {
								end: {
									column: 1,
									line: 9,
									offset: 79,
								},
								start: {
									column: 8,
									line: 5,
									offset: 54,
								},
							},
							type: 'text',
							value: '\ndiv {\n    color: red;\n}\n',
						},
					],
					name: 'style',
					position: {
						end: {
							column: 9,
							line: 9,
							offset: 87,
						},
						start: {
							column: 1,
							line: 5,
							offset: 47,
						},
					},
					type: 'element',
				},
				{
					position: {
						end: {
							column: 1,
							line: 10,
							offset: 88,
						},
						start: {
							column: 9,
							line: 9,
							offset: 87,
						},
					},
					type: 'text',
					value: '\n',
				},
				{
					attributes: [
						{
							kind: 'quoted',
							name: 'data-attr',
							position: {
								start: {
									column: 6,
									line: 10,
									offset: 93,
								},
							},
							raw: '"v"',
							type: 'attribute',
							value: 'v',
						},
					],
					children: [
						{
							position: {
								end: {
									column: 26,
									line: 10,
									offset: 113,
								},
								start: {
									column: 20,
									line: 10,
									offset: 107,
								},
							},
							type: 'text',
							value: 'Hello ',
						},
						{
							children: [
								{
									position: {
										end: {
											column: 31,
											line: 10,
											offset: 118,
										},
										start: {
											column: 27,
											line: 10,
											offset: 114,
										},
									},
									type: 'text',
									value: 'name',
								},
							],
							position: {
								end: {
									column: 9,
									line: 11,
									offset: 119,
								},
								start: {
									column: 25,
									line: 10,
									offset: 113,
								},
							},
							type: 'expression',
						},
						{
							position: {
								end: {
									column: 33,
									line: 10,
									offset: 120,
								},
								start: {
									column: 32,
									line: 10,
									offset: 119,
								},
							},
							type: 'text',
							value: '!',
						},
					],
					name: 'div',
					position: {
						end: {
							column: 39,
							line: 10,
							offset: 126,
						},
						start: {
							column: 1,
							line: 10,
							offset: 88,
						},
					},
					type: 'element',
				},
				{
					position: {
						end: {
							column: 1,
							line: 11,
							offset: 127,
						},
						start: {
							column: 39,
							line: 10,
							offset: 126,
						},
					},
					type: 'text',
					value: '\n',
				},
			],
			type: 'root',
		}),
	);
});

test('Attr and Template Directive', () => {
	const ast = astroParse('<div a b=c d="e" f=`g` x:y prop={  prop  }></div>');
	expect(ast.children?.[0].attributes).toStrictEqual(
		expect.objectContaining([
			{
				type: 'attribute',
				kind: 'empty',
				name: 'a',
				value: '',
				raw: '',
				position: { start: { column: 6, line: 1, offset: 5 } },
			},
			{
				type: 'attribute',
				kind: 'quoted',
				name: 'b',
				value: 'c',
				raw: 'c',
				position: { start: { column: 8, line: 1, offset: 7 } },
			},
			{
				type: 'attribute',
				kind: 'quoted',
				name: 'd',
				value: 'e',
				raw: '"e"',
				position: { start: { column: 12, line: 1, offset: 11 } },
			},
			{
				type: 'attribute',
				kind: 'template-literal',
				name: 'f',
				value: 'g',
				raw: '`g`',
				position: { start: { column: 18, line: 1, offset: 17 } },
			},
			{
				type: 'attribute',
				kind: 'empty',
				name: 'x:y',
				value: '',
				raw: '',
				position: { start: { column: 24, line: 1, offset: 23 } },
			},
			{
				type: 'attribute',
				kind: 'expression',
				name: 'prop',
				value: '  prop  ',
				raw: '',
				position: { start: { column: 28, line: 1, offset: 27 } },
			},
		]),
	);
});

test('Greater-than sign in attribute value', () => {
	const ast = astroParse('<div attr="a>b"></div>');
	expect(ast.children?.[0].attributes).toStrictEqual(
		expect.objectContaining([
			{
				kind: 'quoted',
				name: 'attr',
				position: { start: { column: 6, line: 1, offset: 5 } },
				type: 'attribute',
				value: 'a>b',
				raw: '"a>b"',
			},
		]),
	);
});

test('frontmatter', () => {
	const ast = astroParse(`---
// Example: <SomeComponent greeting="(Optional) Hello" name="Required Name" />
const { greeting = 'Hello', name } = Astro.props;
---
<div>
    <h1>{greeting}, {name}!</h1>
</div>`);
	expect(ast.children[0]).toStrictEqual(
		expect.objectContaining({
			position: {
				end: {
					column: 4,
					line: 4,
					offset: 136,
				},
				start: {
					column: 1,
					line: 1,
					offset: 0,
				},
			},
			type: 'frontmatter',
			value: `
// Example: <SomeComponent greeting="(Optional) Hello" name="Required Name" />
const { greeting = 'Hello', name } = Astro.props;
`,
		}),
	);
});

test('Missing end tag', () => {
	const ast = astroParse('<div><span><span /></div>');
	expect(ast).toStrictEqual(
		expect.objectContaining({
			type: 'root',
			children: [
				{
					type: 'element',
					name: 'div',
					position: {
						start: { line: 1, column: 2, offset: 0 },
					},
					attributes: [],
					children: [
						{
							type: 'element',
							name: 'span',
							position: {
								start: { line: 1, column: 6, offset: 5 },
								end: { line: 1, column: 27, offset: 19 },
							},
							attributes: [],
							children: [
								{
									type: 'element',
									name: 'span',
									position: {
										start: { line: 1, column: 12, offset: 11 },
										end: { line: 1, column: 19, offset: 19 },
									},
									attributes: [],
									children: [],
								},
							],
						},
					],
				},
			],
		}),
	);
});

describe('Issues', () => {
	test('#803', () => {
		const code = `<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>Title</title>
		<meta name="viewport" content="width=device-width" />
	</head>
</html>
`;
		const ast = astroParse(code);
		expect(ast).toStrictEqual(
			expect.objectContaining({
				type: 'root',
				children: [
					{
						type: 'element',
						name: 'html',
						position: { start: { line: 1, column: 2, offset: 0 } },
						attributes: [
							{
								type: 'attribute',
								kind: 'quoted',
								name: 'lang',
								value: 'en',
								raw: '"en"',
								position: { start: { line: 1, column: 7, offset: 6 } },
							},
						],
						children: [
							{
								type: 'text',
								value: '\n\t',
								position: {
									start: { line: 1, column: 17, offset: 16 },
									end: { line: 2, column: 2, offset: 18 },
								},
							},
							{
								type: 'element',
								name: 'head',
								attributes: [],
								position: {
									start: { line: 2, column: 2, offset: 18 },
									end: { line: 6, column: 9, offset: 139 },
								},
								children: [
									{
										type: 'text',
										value: '\n\t\t',
										position: {
											start: { line: 2, column: 8, offset: 24 },
											end: { line: 3, column: 3, offset: 27 },
										},
									},
									{
										type: 'element',
										name: 'meta',
										position: { start: { line: 3, column: 4, offset: 27 } },
										attributes: [
											{
												type: 'attribute',
												kind: 'quoted',
												name: 'charset',
												value: 'utf-8',
												raw: '"utf-8"',
												position: { start: { line: 3, column: 9, offset: 33 } },
											},
										],
										children: [],
									},
									{
										type: 'text',
										value: '\n\t\t',
										position: {
											start: { line: 3, column: 27, offset: 51 },
											end: { line: 4, column: 3, offset: 54 },
										},
									},
									{
										type: 'element',
										name: 'title',
										position: {
											start: { line: 4, column: 3, offset: 54 },
											end: { line: 4, column: 23, offset: 74 },
										},
										attributes: [],
										children: [
											{
												type: 'text',
												value: 'Title',
												position: {
													start: { line: 4, column: 10, offset: 61 },
													end: { line: 4, column: 15, offset: 66 },
												},
											},
										],
									},
									{
										type: 'text',
										value: '\n\t\t',
										position: {
											start: { line: 4, column: 23, offset: 74 },
											end: { line: 5, column: 3, offset: 77 },
										},
									},
									{
										type: 'element',
										name: 'meta',
										attributes: [
											{
												type: 'attribute',
												kind: 'quoted',
												name: 'name',
												value: 'viewport',
												raw: '"viewport"',
												position: { start: { line: 5, column: 9, offset: 83 } },
											},
											{
												type: 'attribute',
												kind: 'quoted',
												name: 'content',
												value: 'width=device-width',
												raw: '"width=device-width"',
												position: { start: { line: 5, column: 25, offset: 99 } },
											},
										],
										position: { start: { line: 5, column: 4, offset: 77 } },
										children: [],
									},
									{
										type: 'text',
										value: '\n\t',
										position: {
											start: { line: 5, column: 56, offset: 130 },
											end: { line: 6, column: 2, offset: 132 },
										},
									},
								],
							},
							{
								type: 'text',
								value: '\n',
								position: {
									start: { line: 6, column: 9, offset: 139 },
									end: { line: 7, column: 1, offset: 140 },
								},
							},
							{
								type: 'text',
								value: '',
								position: {
									start: { line: 7, column: 8, offset: 140 },
									end: { line: 8, column: 1, offset: 140 },
								},
							},
						],
					},
				],
			}),
		);
	});
});
