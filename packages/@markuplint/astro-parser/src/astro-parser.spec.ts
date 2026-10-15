// @ts-nocheck

import { ParserError } from '@markuplint/parser-utils';
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
	// 	expect(ast).toStrictEqual(
	// 		expect.objectContaining({
	// 			children: [
	// 				{
	// 					position: {
	// 						end: {
	// 							column: 4,
	// 							line: 3,
	// 							offset: 29,
	// 						},
	// 						start: {
	// 							column: 1,
	// 							line: 1,
	// 							offset: 0,
	// 						},
	// 					},
	// 					type: 'frontmatter',
	// 					value: '\nconst name = "World";\n',
	// 				},
	// 				{
	// 					position: {
	// 						end: {
	// 							column: 17,
	// 							line: 4,
	// 							offset: 46,
	// 						},
	// 						start: {
	// 							column: 5,
	// 							line: 4,
	// 							offset: 30,
	// 						},
	// 					},
	// 					type: 'comment',
	// 					value: ' Comment ',
	// 				},
	// 				{
	// 					attributes: [],
	// 					children: [
	// 						{
	// 							position: {
	// 								end: {
	// 									column: 1,
	// 									line: 9,
	// 									offset: 79,
	// 								},
	// 								start: {
	// 									column: 8,
	// 									line: 5,
	// 									offset: 54,
	// 								},
	// 							},
	// 							type: 'text',
	// 							value: '\ndiv {\n    color: red;\n}\n',
	// 						},
	// 					],
	// 					name: 'style',
	// 					position: {
	// 						end: {
	// 							column: 9,
	// 							line: 9,
	// 							offset: 87,
	// 						},
	// 						start: {
	// 							column: 1,
	// 							line: 5,
	// 							offset: 47,
	// 						},
	// 					},
	// 					type: 'element',
	// 				},
	// 				{
	// 					position: {
	// 						end: {
	// 							column: 1,
	// 							line: 10,
	// 							offset: 88,
	// 						},
	// 						start: {
	// 							column: 9,
	// 							line: 9,
	// 							offset: 87,
	// 						},
	// 					},
	// 					type: 'text',
	// 					value: '\n',
	// 				},
	// 				{
	// 					attributes: [
	// 						{
	// 							kind: 'quoted',
	// 							name: 'data-attr',
	// 							position: {
	// 								start: {
	// 									column: 6,
	// 									line: 10,
	// 									offset: 93,
	// 								},
	// 							},
	// 							raw: '"v"',
	// 							type: 'attribute',
	// 							value: 'v',
	// 						},
	// 					],
	// 					children: [
	// 						{
	// 							position: {
	// 								end: {
	// 									column: 26,
	// 									line: 10,
	// 									offset: 113,
	// 								},
	// 								start: {
	// 									column: 20,
	// 									line: 10,
	// 									offset: 107,
	// 								},
	// 							},
	// 							type: 'text',
	// 							value: 'Hello ',
	// 						},
	// 						{
	// 							children: [
	// 								{
	// 									position: {
	// 										end: {
	// 											column: 31,
	// 											line: 10,
	// 											offset: 118,
	// 										},
	// 										start: {
	// 											column: 27,
	// 											line: 10,
	// 											offset: 114,
	// 										},
	// 									},
	// 									type: 'text',
	// 									value: 'name',
	// 								},
	// 							],
	// 							position: {
	// 								end: {
	// 									column: 9,
	// 									line: 11,
	// 									offset: 119,
	// 								},
	// 								start: {
	// 									column: 25,
	// 									line: 10,
	// 									offset: 113,
	// 								},
	// 							},
	// 							type: 'expression',
	// 						},
	// 						{
	// 							position: {
	// 								end: {
	// 									column: 33,
	// 									line: 10,
	// 									offset: 120,
	// 								},
	// 								start: {
	// 									column: 32,
	// 									line: 10,
	// 									offset: 119,
	// 								},
	// 							},
	// 							type: 'text',
	// 							value: '!',
	// 						},
	// 					],
	// 					name: 'div',
	// 					position: {
	// 						end: {
	// 							column: 39,
	// 							line: 10,
	// 							offset: 126,
	// 						},
	// 						start: {
	// 							column: 1,
	// 							line: 10,
	// 							offset: 88,
	// 						},
	// 					},
	// 					type: 'element',
	// 				},
	// 				{
	// 					position: {
	// 						end: {
	// 							column: 1,
	// 							line: 11,
	// 							offset: 127,
	// 						},
	// 						start: {
	// 							column: 39,
	// 							line: 10,
	// 							offset: 126,
	// 						},
	// 					},
	// 					type: 'text',
	// 					value: '\n',
	// 				},
	// 			],
	// 			type: 'root',
	// 		}),
	// 	);
	// The commented-out assertion above is the legacy `@astrojs/compiler` shape.
	// `astro-eslint-parser` v3 reports a JSX-style AST with offsets only.
	expect(ast).toMatchObject({
		type: 'AstroRoot',
		frontmatter: { type: 'AstroFrontmatter', start: 0, end: 29 },
		body: [
			{ type: 'AstroComment', value: ' Comment ', start: 30, end: 46 },
			// The newline between the comment and `<style>` is a text node (the legacy compiler dropped it)
			{ type: 'JSXText', value: '\n', start: 46, end: 47 },
			{
				type: 'JSXElement',
				start: 47,
				end: 87,
				openingElement: { name: { name: 'style' }, attributes: [] },
				children: [{ type: 'JSXText', value: '\ndiv {\n    color: red;\n}\n', start: 54, end: 79 }],
			},
			{ type: 'JSXText', value: '\n', start: 87, end: 88 },
			{
				type: 'JSXElement',
				start: 88,
				end: 126,
				openingElement: {
					name: { name: 'div' },
					attributes: [
						{ type: 'JSXAttribute', name: { name: 'data-attr' }, value: { type: 'Literal', value: 'v' } },
					],
				},
				children: [
					{ type: 'JSXText', value: 'Hello ', start: 107, end: 113 },
					{
						type: 'JSXExpressionContainer',
						start: 113,
						end: 119,
						expression: { type: 'Identifier', name: 'name' },
					},
					{ type: 'JSXText', value: '!', start: 119, end: 120 },
				],
			},
			{ type: 'JSXText', value: '\n', start: 126, end: 127 },
		],
	});
});

test('Attr and Template Directive', () => {
	const ast = astroParse('<div a b=c d="e" f=`g` x:y prop={  prop  }></div>');
	// 	expect(ast.children?.[0].attributes).toStrictEqual(
	// 		expect.objectContaining([
	// 			{
	// 				type: 'attribute',
	// 				kind: 'empty',
	// 				name: 'a',
	// 				value: '',
	// 				raw: '',
	// 				position: { start: { column: 6, line: 1, offset: 5 } },
	// 			},
	// 			{
	// 				type: 'attribute',
	// 				kind: 'quoted',
	// 				name: 'b',
	// 				value: 'c',
	// 				raw: 'c',
	// 				position: { start: { column: 8, line: 1, offset: 7 } },
	// 			},
	// 			{
	// 				type: 'attribute',
	// 				kind: 'quoted',
	// 				name: 'd',
	// 				value: 'e',
	// 				raw: '"e"',
	// 				position: { start: { column: 12, line: 1, offset: 11 } },
	// 			},
	// 			{
	// 				type: 'attribute',
	// 				kind: 'template-literal',
	// 				name: 'f',
	// 				value: 'g',
	// 				raw: '`g`',
	// 				position: { start: { column: 18, line: 1, offset: 17 } },
	// 			},
	// 			{
	// 				type: 'attribute',
	// 				kind: 'empty',
	// 				name: 'x:y',
	// 				value: '',
	// 				raw: '',
	// 				position: { start: { column: 24, line: 1, offset: 23 } },
	// 			},
	// 			{
	// 				type: 'attribute',
	// 				kind: 'expression',
	// 				name: 'prop',
	// 				value: '  prop  ',
	// 				raw: '',
	// 				position: { start: { column: 28, line: 1, offset: 27 } },
	// 			},
	// 		]),
	// 	);
	// The commented-out assertion above is the legacy `@astrojs/compiler` shape (`kind` / `raw` / `position`).
	// In the v3 AST an empty attribute has a `null` value, a quoted or bare one a `Literal`, and an
	// expression or a template literal a `JSXExpressionContainer`.
	expect(ast.body[0].openingElement.attributes).toMatchObject([
		{ type: 'JSXAttribute', name: { name: 'a' }, value: null, start: 5, end: 6 },
		{ type: 'JSXAttribute', name: { name: 'b' }, value: { type: 'Literal', value: 'c' }, start: 7, end: 10 },
		{
			type: 'JSXAttribute',
			name: { name: 'd' },
			value: { type: 'Literal', value: 'e', raw: '"e"' },
			start: 11,
			end: 16,
		},
		{ type: 'JSXAttribute', name: { name: 'f' }, value: { type: 'JSXExpressionContainer' }, start: 17, end: 22 },
		{ type: 'JSXAttribute', start: 23, end: 26, value: null },
		{
			type: 'JSXAttribute',
			name: { name: 'prop' },
			value: { type: 'JSXExpressionContainer', expression: { name: 'prop' } },
			start: 27,
			end: 42,
		},
	]);
});

test('Greater-than sign in attribute value', () => {
	const ast = astroParse('<div attr="a>b"></div>');
	// 	expect(ast.children?.[0].attributes).toStrictEqual(
	// 		expect.objectContaining([
	// 			{
	// 				kind: 'quoted',
	// 				name: 'attr',
	// 				position: { start: { column: 6, line: 1, offset: 5 } },
	// 				type: 'attribute',
	// 				value: 'a>b',
	// 				raw: '"a>b"',
	// 			},
	// 		]),
	// 	);
	// The commented-out assertion above is the legacy `@astrojs/compiler` shape.
	expect(ast.body[0].openingElement.attributes).toMatchObject([
		{
			type: 'JSXAttribute',
			name: { name: 'attr' },
			value: { type: 'Literal', value: 'a>b', raw: '"a>b"' },
			start: 5,
			end: 15,
		},
	]);
});

test('frontmatter', () => {
	const ast = astroParse(`---
// Example: <SomeComponent greeting="(Optional) Hello" name="Required Name" />
const { greeting = 'Hello', name } = Astro.props;
---
<div>
    <h1>{greeting}, {name}!</h1>
</div>`);
	// 	expect(ast.children[0]).toStrictEqual(
	// 		expect.objectContaining({
	// 			position: {
	// 				end: {
	// 					column: 4,
	// 					line: 4,
	// 					offset: 136,
	// 				},
	// 				start: {
	// 					column: 1,
	// 					line: 1,
	// 					offset: 0,
	// 				},
	// 			},
	// 			type: 'frontmatter',
	// 			value: `
	// // Example: <SomeComponent greeting="(Optional) Hello" name="Required Name" />
	// const { greeting = 'Hello', name } = Astro.props;
	// `,
	// 		}),
	// 	);
	// The commented-out assertion above is the legacy `@astrojs/compiler` shape. The frontmatter is no
	// longer a `children` entry but `frontmatter`, and its value is the parsed `program`.
	expect(ast.frontmatter).toMatchObject({ type: 'AstroFrontmatter', start: 0, end: 136 });
	expect(ast.body[0]).toMatchObject({ type: 'JSXElement', openingElement: { name: { name: 'div' } } });
});

test('Missing end tag', () => {
	// 	const ast = astroParse('<div><span><span /></div>');
	// 	expect(ast).toStrictEqual(
	// 		expect.objectContaining({
	// 			type: 'root',
	// 			children: [
	// 				{
	// 					type: 'element',
	// 					name: 'div',
	// 					position: {
	// 						start: { line: 1, column: 2, offset: 0 },
	// 					},
	// 					attributes: [],
	// 					children: [
	// 						{
	// 							type: 'element',
	// 							name: 'span',
	// 							position: {
	// 								start: { line: 1, column: 6, offset: 5 },
	// 								end: { line: 1, column: 27, offset: 19 },
	// 							},
	// 							attributes: [],
	// 							children: [
	// 								{
	// 									type: 'element',
	// 									name: 'span',
	// 									position: {
	// 										start: { line: 1, column: 12, offset: 11 },
	// 										end: { line: 1, column: 19, offset: 19 },
	// 									},
	// 									attributes: [],
	// 									children: [],
	// 								},
	// 							],
	// 						},
	// 					],
	// 				},
	// 			],
	// 		}),
	// 	);
	// The commented-out lines above are the legacy `@astrojs/compiler` behavior: it recovered from the
	// missing end tag. `astro-eslint-parser` v3 rejects it.
	expect(() => astroParse('<div><span><span /></div>')).toThrow(ParserError);
	expect(() => astroParse('<div><span><span /></div>')).toThrow(/Expected corresponding JSX closing tag for 'span'/);
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
		// 		expect(ast).toStrictEqual(
		// 			expect.objectContaining({
		// 				type: 'root',
		// 				children: [
		// 					{
		// 						type: 'element',
		// 						name: 'html',
		// 						position: {
		// 							start: { line: 1, column: 1, offset: 0 },
		// 							end: { line: 7, column: 8, offset: 147 },
		// 						},
		// 						attributes: [
		// 							{
		// 								type: 'attribute',
		// 								kind: 'quoted',
		// 								name: 'lang',
		// 								value: 'en',
		// 								raw: '"en"',
		// 								position: { start: { line: 1, column: 7, offset: 6 } },
		// 							},
		// 						],
		// 						children: [
		// 							{
		// 								type: 'text',
		// 								value: '\n\t',
		// 								position: {
		// 									start: { line: 1, column: 17, offset: 16 },
		// 									end: { line: 2, column: 2, offset: 18 },
		// 								},
		// 							},
		// 							{
		// 								type: 'element',
		// 								name: 'head',
		// 								attributes: [],
		// 								position: {
		// 									start: { line: 2, column: 2, offset: 18 },
		// 									end: { line: 6, column: 9, offset: 139 },
		// 								},
		// 								children: [
		// 									{
		// 										type: 'text',
		// 										value: '\n\t\t',
		// 										position: {
		// 											start: { line: 2, column: 8, offset: 24 },
		// 											end: { line: 3, column: 3, offset: 27 },
		// 										},
		// 									},
		// 									{
		// 										type: 'element',
		// 										name: 'meta',
		// 										position: { start: { line: 3, column: 4, offset: 27 } },
		// 										attributes: [
		// 											{
		// 												type: 'attribute',
		// 												kind: 'quoted',
		// 												name: 'charset',
		// 												value: 'utf-8',
		// 												raw: '"utf-8"',
		// 												position: { start: { line: 3, column: 9, offset: 33 } },
		// 											},
		// 										],
		// 										children: [],
		// 									},
		// 									{
		// 										type: 'text',
		// 										value: '\n\t\t',
		// 										position: {
		// 											start: { line: 3, column: 27, offset: 51 },
		// 											end: { line: 4, column: 3, offset: 54 },
		// 										},
		// 									},
		// 									{
		// 										type: 'element',
		// 										name: 'title',
		// 										position: {
		// 											start: { line: 4, column: 3, offset: 54 },
		// 											end: { line: 4, column: 23, offset: 74 },
		// 										},
		// 										attributes: [],
		// 										children: [
		// 											{
		// 												type: 'text',
		// 												value: 'Title',
		// 												position: {
		// 													start: { line: 4, column: 10, offset: 61 },
		// 													end: { line: 4, column: 15, offset: 66 },
		// 												},
		// 											},
		// 										],
		// 									},
		// 									{
		// 										type: 'text',
		// 										value: '\n\t\t',
		// 										position: {
		// 											start: { line: 4, column: 23, offset: 74 },
		// 											end: { line: 5, column: 3, offset: 77 },
		// 										},
		// 									},
		// 									{
		// 										type: 'element',
		// 										name: 'meta',
		// 										attributes: [
		// 											{
		// 												type: 'attribute',
		// 												kind: 'quoted',
		// 												name: 'name',
		// 												value: 'viewport',
		// 												raw: '"viewport"',
		// 												position: { start: { line: 5, column: 9, offset: 83 } },
		// 											},
		// 											{
		// 												type: 'attribute',
		// 												kind: 'quoted',
		// 												name: 'content',
		// 												value: 'width=device-width',
		// 												raw: '"width=device-width"',
		// 												position: { start: { line: 5, column: 25, offset: 99 } },
		// 											},
		// 										],
		// 										position: { start: { line: 5, column: 4, offset: 77 } },
		// 										children: [],
		// 									},
		// 									{
		// 										type: 'text',
		// 										value: '\n\t',
		// 										position: {
		// 											start: { line: 5, column: 56, offset: 130 },
		// 											end: { line: 6, column: 2, offset: 132 },
		// 										},
		// 									},
		// 								],
		// 							},
		// 							{
		// 								type: 'text',
		// 								value: '\n',
		// 								position: {
		// 									start: { line: 6, column: 9, offset: 139 },
		// 									end: { line: 7, column: 1, offset: 140 },
		// 								},
		// 							},
		// 						],
		// 					},
		// 					{
		// 						type: 'text',
		// 						value: '\n',
		// 						position: {
		// 							start: { line: 7, column: 8, offset: 147 },
		// 							end: { line: 8, column: 1, offset: 148 },
		// 						},
		// 					},
		// 				],
		// 			}),
		// 		);
		// The commented-out assertion above is the legacy `@astrojs/compiler` shape.
		expect(ast).toMatchObject({
			type: 'AstroRoot',
			body: [
				{
					type: 'JSXElement',
					start: 0,
					end: 147,
					openingElement: {
						name: { name: 'html' },
						attributes: [
							{ type: 'JSXAttribute', name: { name: 'lang' }, value: { value: 'en', raw: '"en"' } },
						],
					},
					children: [
						{ type: 'JSXText', value: '\n\t', start: 16, end: 18 },
						{
							type: 'JSXElement',
							start: 18,
							end: 139,
							openingElement: { name: { name: 'head' } },
							children: [
								{ type: 'JSXText', start: 24, end: 27 },
								{
									type: 'JSXElement',
									start: 27,
									end: 51,
									openingElement: {
										name: { name: 'meta' },
										attributes: [{ name: { name: 'charset' }, value: { value: 'utf-8' } }],
									},
									children: [],
								},
								{ type: 'JSXText', start: 51, end: 54 },
								{
									type: 'JSXElement',
									start: 54,
									end: 74,
									openingElement: { name: { name: 'title' } },
									children: [{ type: 'JSXText', value: 'Title', start: 61, end: 66 }],
								},
								{ type: 'JSXText', start: 74, end: 77 },
								{
									type: 'JSXElement',
									start: 77,
									end: 130,
									openingElement: {
										name: { name: 'meta' },
										attributes: [
											{ name: { name: 'name' }, value: { value: 'viewport' } },
											{ name: { name: 'content' }, value: { value: 'width=device-width' } },
										],
									},
									children: [],
								},
								{ type: 'JSXText', start: 130, end: 132 },
							],
						},
						{ type: 'JSXText', start: 139, end: 140 },
					],
				},
				{ type: 'JSXText', value: '\n', start: 147, end: 148 },
			],
		});
	});

	/**
	 * Astro emits a Hint (severity=4) for `<script>` tags carrying any
	 * non-`src` attribute without an explicit `is:inline`, and Warnings
	 * (severity=2) for things like `set:html` overwriting children. The AST
	 * is fully populated in both cases, so markuplint must not treat them as
	 * a parse failure (#3823). This block also pins down the negative side:
	 * severity=Error diagnostics and raw upstream syntax errors must still
	 * surface as ParserError, never as a silent pass-through or as a leaked
	 * upstream error type.
	 */
	describe('#3823 only severity=Error Astro diagnostics are fatal', () => {
		describe('Hint (severity=4) is non-fatal', () => {
			test('script with define:vars', () => {
				expect(() => astroParse('<script define:vars={{ foo: 1 }}>console.log(foo);</script>')).not.toThrow();
				const ast = astroParse('<script define:vars={{ foo: 1 }}>console.log(foo);</script>');
				// Legacy `@astrojs/compiler` shape:
				// expect(ast.children?.[0]).toEqual(
				// 	expect.objectContaining({
				// 		type: 'element',
				// 		name: 'script',
				// 	}),
				// );
				expect(ast.body[0]).toMatchObject({ type: 'JSXElement', openingElement: { name: { name: 'script' } } });
			});

			test('script type="module"', () => {
				expect(() => astroParse('<script type="module">console.log("hello");</script>')).not.toThrow();
				const ast = astroParse('<script type="module">console.log("hello");</script>');
				// Legacy `@astrojs/compiler` shape:
				// expect(ast.children?.[0]).toEqual(
				// 	expect.objectContaining({
				// 		type: 'element',
				// 		name: 'script',
				// 	}),
				// );
				expect(ast.body[0]).toMatchObject({ type: 'JSXElement', openingElement: { name: { name: 'script' } } });
			});

			test('script with data-* attribute', () => {
				expect(() => astroParse('<script data-widget="example">console.log("hello");</script>')).not.toThrow();
				const ast = astroParse('<script data-widget="example">console.log("hello");</script>');
				// Legacy `@astrojs/compiler` shape:
				// expect(ast.children?.[0]).toEqual(
				// 	expect.objectContaining({
				// 		type: 'element',
				// 		name: 'script',
				// 	}),
				// );
				expect(ast.body[0]).toMatchObject({ type: 'JSXElement', openingElement: { name: { name: 'script' } } });
			});

			test('script defer', () => {
				expect(() => astroParse('<script defer>console.log("hello");</script>')).not.toThrow();
				const ast = astroParse('<script defer>console.log("hello");</script>');
				// Legacy `@astrojs/compiler` shape:
				// expect(ast.children?.[0]).toEqual(
				// 	expect.objectContaining({
				// 		type: 'element',
				// 		name: 'script',
				// 	}),
				// );
				expect(ast.body[0]).toMatchObject({ type: 'JSXElement', openingElement: { name: { name: 'script' } } });
			});
		});

		describe('Warning (severity=2) is non-fatal', () => {
			test('set:html with children passes through (WARNING_SET_WITH_CHILDREN, code 2006)', () => {
				expect(() => astroParse('<div set:html="x">child</div>')).not.toThrow();
				const ast = astroParse('<div set:html="x">child</div>');
				// Legacy `@astrojs/compiler` shape:
				// expect(ast.children?.[0]).toEqual(
				// 	expect.objectContaining({
				// 		type: 'element',
				// 		name: 'div',
				// 	}),
				// );
				expect(ast.body[0]).toMatchObject({ type: 'JSXElement', openingElement: { name: { name: 'div' } } });
			});
		});

		describe('Error (severity=1) and upstream syntax errors are fatal', () => {
			test('unterminated /* in frontmatter throws ParserError with location', () => {
				const fn = () => astroParse('---\n/* unterminated\n---\n<div></div>');
				expect(fn).toThrow(ParserError);
				expect(fn).toThrow(/unterminated/i);
			});

			test('unclosed HTML comment throws ParserError (normalized from upstream SyntaxError)', () => {
				expect(() => astroParse('<!-- not closed\n<div></div>')).toThrow(ParserError);
			});

			test('unclosed expression throws ParserError (normalized from upstream SyntaxError)', () => {
				expect(() => astroParse('<div>{ x </div>')).toThrow(ParserError);
			});
		});
	});
});
