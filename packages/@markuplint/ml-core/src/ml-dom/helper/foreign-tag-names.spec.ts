import { describe, test, expect } from 'vitest';

import { adjustForeignTagName } from './foreign-tag-names.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

// The second column of the table in the rule for a start tag in foreign content of the HTML Standard
const SVG_TAG_NAMES = [
	'altGlyph',
	'altGlyphDef',
	'altGlyphItem',
	'animateColor',
	'animateMotion',
	'animateTransform',
	'clipPath',
	'feBlend',
	'feColorMatrix',
	'feComponentTransfer',
	'feComposite',
	'feConvolveMatrix',
	'feDiffuseLighting',
	'feDisplacementMap',
	'feDistantLight',
	'feDropShadow',
	'feFlood',
	'feFuncA',
	'feFuncB',
	'feFuncG',
	'feFuncR',
	'feGaussianBlur',
	'feImage',
	'feMerge',
	'feMergeNode',
	'feMorphology',
	'feOffset',
	'fePointLight',
	'feSpecularLighting',
	'feSpotLight',
	'feTile',
	'feTurbulence',
	'foreignObject',
	'glyphRef',
	'linearGradient',
	'radialGradient',
	'textPath',
];

describe('adjustForeignTagName', () => {
	test('the table has the 37 names of the HTML Standard', () => {
		expect(SVG_TAG_NAMES).toHaveLength(37);
	});

	test.each(SVG_TAG_NAMES)('restores the case of %s in SVG', name => {
		expect(adjustForeignTagName(name.toLowerCase(), SVG_NAMESPACE)).toBe(name);
	});

	test('leaves the name of an SVG element that is all lower case', () => {
		expect(adjustForeignTagName('circle', SVG_NAMESPACE)).toBe('circle');
	});

	test('leaves a name that is not in the table, whatever it looks like', () => {
		expect(adjustForeignTagName('mything', SVG_NAMESPACE)).toBe('mything');
	});

	test('does not restore the case of a name that the table has in another namespace', () => {
		expect(adjustForeignTagName('textpath', MATHML_NAMESPACE)).toBe('textpath');
		expect(adjustForeignTagName('textpath', HTML_NAMESPACE)).toBe('textpath');
		expect(adjustForeignTagName('textpath', null)).toBe('textpath');
	});
});
