import { specs } from '@markuplint/html-spec';
import { test, expect } from 'vitest';

import { getSpecByTagName } from './get-spec-by-tag-name.js';

const divSpec = {
	conditional: [
		{
			condition: 'dl > div',
			contents: [
				{
					oneOrMore: [
						{
							zeroOrMore: ':model(script-supporting)',
						},
						{
							oneOrMore: 'dt',
						},
						{
							zeroOrMore: ':model(script-supporting)',
						},
						{
							oneOrMore: 'dd',
						},
						{
							zeroOrMore: ':model(script-supporting)',
						},
					],
				},
			],
		},
	],
	contents: [
		{
			oneOrMore: ':model(flow)',
		},
	],
};

test('html:div', () => {
	expect(getSpecByTagName(specs, 'div', null)?.contentModel).toStrictEqual(divSpec);
	expect(getSpecByTagName(specs, 'div', 'unknown-namespace')?.contentModel).toStrictEqual(divSpec);
	expect(getSpecByTagName(specs, 'div', 'http://www.w3.org/1999/xhtml')?.contentModel).toStrictEqual(divSpec);
});

test('svg:svg', () => {
	expect(getSpecByTagName(specs, 'svg', 'http://www.w3.org/2000/svg')?.contentModel).toStrictEqual({
		contents: [
			{
				zeroOrMore: [
					':model(SVGAnimation)',
					':model(SVGDescriptive)',
					':model(SVGPaintServer)',
					':model(SVGShape)',
					':model(SVGStructural)',
					'svg|a',
					'svg|clipPath',
					'svg|filter',
					'svg|foreignObject',
					'svg|image',
					'svg|marker',
					'svg|mask',
					'svg|script',
					'svg|style',
					'svg|switch',
					'svg|text',
					'svg|view',
				],
			},
		],
	});
	expect(getSpecByTagName(specs, 'svg', null)).toBe(null);
});
