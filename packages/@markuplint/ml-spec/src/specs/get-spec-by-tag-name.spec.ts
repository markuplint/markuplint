import specs from '@markuplint/html-spec';

import { getSpecByTagName } from './get-spec-by-tag-name';

const divSpec = {
	conditional: [
		{
			condition: 'dl > div',
			contents: [
				{
					zeroOrMore: '#script-supporting',
				},
				{
					oneOrMore: 'dt',
				},
				{
					zeroOrMore: '#script-supporting',
				},
				{
					oneOrMore: 'dd',
				},
				{
					zeroOrMore: '#script-supporting',
				},
			],
		},
	],
	contents: [
		{
			zeroOrMore: '#flow',
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
					'#SVGAnimation',
					'#SVGDescriptive',
					'#SVGPaintServer',
					'#SVGShape',
					'#SVGStructural',
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
