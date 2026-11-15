import type { MLMLSpec } from '@markuplint/ml-spec';

import { parser } from '@markuplint/html-parser';
import spec from '@markuplint/html-spec';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { convertRuleset } from '../../convert-ruleset.js';

import { MLDocument } from './document.js';

function createDocument(
	sourceCode: string,
	options?: { readonly tagNameCaseSensitive?: boolean; readonly attrNameRoute?: 'html-parser' | 'dom-api' },
) {
	return new MLDocument(
		parser.parse(sourceCode),
		convertRuleset(),
		[spec as unknown as MLMLSpec, {}],
		{ ariaVersion: ARIA_RECOMMENDED_VERSION },
		options,
	);
}

function localNamesUnder(document: MLDocument<any, any>, selector: string) {
	return [...document.querySelectorAll(selector)].map(el => el.localName);
}

describe('MLElement#localName of an element in a foreign namespace', () => {
	test('the HTML parser restores the case of an SVG element that it lower-cased', () => {
		const document = createDocument(
			'<svg><textpath></textpath><FOREIGNOBJECT></FOREIGNOBJECT><clipPath></clipPath><CIRCLE></CIRCLE></svg>',
		);

		expect(localNamesUnder(document, 'svg > *')).toStrictEqual(['textPath', 'foreignObject', 'clipPath', 'circle']);
	});

	test('the HTML parser lower-cases the name of an SVG element that it does not restore', () => {
		const document = createDocument('<svg><MyThing></MyThing></svg>');

		expect(localNamesUnder(document, 'svg > *')).toStrictEqual(['mything']);
	});

	test('the HTML parser lower-cases the name of a MathML element', () => {
		const document = createDocument('<math><MFENCED></MFENCED><mi></mi></math>');

		expect(localNamesUnder(document, 'math > *')).toStrictEqual(['mfenced', 'mi']);
	});

	test('an element of the HTML namespace is lower-cased as before', () => {
		const document = createDocument('<DIV></DIV>');

		expect(localNamesUnder(document, 'div')).toStrictEqual(['div']);
	});

	test('a language that keeps the case of a tag name keeps the name as written', () => {
		const document = createDocument('<svg><textpath></textpath><textPath></textPath></svg>', {
			tagNameCaseSensitive: true,
		});

		expect(localNamesUnder(document, 'svg > *')).toStrictEqual(['textpath', 'textPath']);
	});

	test('a language that sets the element through the DOM API keeps the name as written', () => {
		const document = createDocument('<svg><textpath></textpath></svg>', { attrNameRoute: 'dom-api' });

		expect(localNamesUnder(document, 'svg > *')).toStrictEqual(['textpath']);
	});
});
