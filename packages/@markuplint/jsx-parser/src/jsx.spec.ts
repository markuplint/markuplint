import { describe, test, expect } from 'vitest';

import { jsxParser, getName } from './jsx.js';

describe('jsxParser', () => {
	test('spreadAttribute', () => {
		const ast = jsxParser('<div {...pros} />');
		// @ts-ignore
		expect(ast[0].__hasSpreadAttribute).toBeTruthy();
	});

	test('Comment in start tag', () => {
		const ast = jsxParser('<div /* comment */ />// comment');
		expect(ast).toStrictEqual([
			{
				type: 'JSXElement',
				range: [0, 21],
				loc: {
					end: {
						column: 21,
						line: 1,
					},
					start: {
						column: 0,
						line: 1,
					},
				},
				openingElement: {
					type: 'JSXOpeningElement',
					range: [0, 21],
					loc: {
						end: {
							column: 21,
							line: 1,
						},
						start: {
							column: 0,
							line: 1,
						},
					},
					name: {
						loc: {
							end: {
								column: 4,
								line: 1,
							},
							start: {
								column: 1,
								line: 1,
							},
						},
						name: 'div',
						range: [1, 4],
						type: 'JSXIdentifier',
					},
					attributes: [],
					selfClosing: true,
					typeArguments: undefined,
				},
				closingElement: null,
				children: [],
				__parentId: null,
			},
			{
				type: 'Block',
				loc: {
					end: {
						column: 18,
						line: 1,
					},
					start: {
						column: 5,
						line: 1,
					},
				},
				range: [5, 18],
				value: ' comment ',
				__parentId: null,
			},
			{
				type: 'Line',
				loc: {
					end: {
						column: 31,
						line: 1,
					},
					start: {
						column: 21,
						line: 1,
					},
				},
				range: [21, 31],
				value: ' comment',
				__parentId: null,
			},
		]);
	});
});

describe('getName', () => {
	test('tags', () => {
		// @ts-ignore
		expect(getName(jsxParser('<div></div>')[0].openingElement.name)).toBe('div');
		// @ts-ignore
		expect(getName(jsxParser('<XNode></XNode>')[0].openingElement.name)).toBe('XNode');
		// @ts-ignore
		expect(getName(jsxParser('<XNode.Prop.xxx></XNode.Prop.xxx>')[0].openingElement.name)).toBe('XNode.Prop.xxx');
		// @ts-ignore
		expect(getName(jsxParser('<svg></svg>')[0].openingElement.name)).toBe('svg');
		// @ts-ignore
		expect(getName(jsxParser('<ns:tag></ns:tag>')[0].openingElement.name)).toBe('ns:tag');
	});
});
