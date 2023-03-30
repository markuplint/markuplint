// @ts-nocheck

import { astroParse } from './astro-parser';

it('Basic', () => {
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

it('Attr and Template Directive', () => {
	const ast = astroParse('<div a b=c d="e" f=`g` x:y prop={  prop  }></div>');
	expect(ast.children?.[0].attributes).toStrictEqual(
		expect.objectContaining([
			{
				type: 'attribute',
				kind: 'empty',
				name: 'a',
				value: '',
				position: { start: { column: 6, line: 1, offset: 5 } },
			},
			{
				type: 'attribute',
				kind: 'quoted',
				name: 'b',
				value: 'c',
				position: { start: { column: 8, line: 1, offset: 7 } },
			},
			{
				type: 'attribute',
				kind: 'quoted',
				name: 'd',
				value: 'e',
				position: { start: { column: 12, line: 1, offset: 11 } },
			},
			{
				type: 'attribute',
				kind: 'template-literal',
				name: 'f',
				value: 'g',
				position: { start: { column: 18, line: 1, offset: 17 } },
			},
			{
				type: 'attribute',
				kind: 'empty',
				name: 'x:y',
				value: '',
				position: { start: { column: 24, line: 1, offset: 23 } },
			},
			{
				type: 'attribute',
				kind: 'expression',
				name: 'prop',
				value: '  prop  ',
				position: { start: { column: 28, line: 1, offset: 27 } },
			},
		]),
	);
});
