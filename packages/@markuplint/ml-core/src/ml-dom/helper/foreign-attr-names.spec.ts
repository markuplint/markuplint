import { describe, test, expect } from 'vitest';

import { adjustForeignAttrName } from './foreign-attr-names.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

// The second column of the table "adjust SVG attributes" of the HTML Standard
const SVG_ATTR_NAMES = [
	'attributeName',
	'attributeType',
	'baseFrequency',
	'baseProfile',
	'calcMode',
	'clipPathUnits',
	'diffuseConstant',
	'edgeMode',
	'filterUnits',
	'glyphRef',
	'gradientTransform',
	'gradientUnits',
	'kernelMatrix',
	'kernelUnitLength',
	'keyPoints',
	'keySplines',
	'keyTimes',
	'lengthAdjust',
	'limitingConeAngle',
	'markerHeight',
	'markerUnits',
	'markerWidth',
	'maskContentUnits',
	'maskUnits',
	'numOctaves',
	'pathLength',
	'patternContentUnits',
	'patternTransform',
	'patternUnits',
	'pointsAtX',
	'pointsAtY',
	'pointsAtZ',
	'preserveAlpha',
	'preserveAspectRatio',
	'primitiveUnits',
	'refX',
	'refY',
	'repeatCount',
	'repeatDur',
	'requiredExtensions',
	'requiredFeatures',
	'specularConstant',
	'specularExponent',
	'spreadMethod',
	'startOffset',
	'stdDeviation',
	'stitchTiles',
	'surfaceScale',
	'systemLanguage',
	'tableValues',
	'targetX',
	'targetY',
	'textLength',
	'viewBox',
	'viewTarget',
	'xChannelSelector',
	'yChannelSelector',
	'zoomAndPan',
];

describe('the name of an attribute that the HTML parser adjusts', () => {
	test.each(SVG_ATTR_NAMES)(
		'[ml-foreign-attr-names-001] %s on an SVG element is restored from its lower-case form',
		name => {
			expect(adjustForeignAttrName(name.toLowerCase(), SVG_NAMESPACE)).toBe(name);
		},
	);

	test.each(SVG_ATTR_NAMES)(
		'[ml-foreign-attr-names-002] %s is left lower-case on an element of another namespace',
		name => {
			const lower = name.toLowerCase();
			expect(adjustForeignAttrName(lower, MATHML_NAMESPACE)).toBe(lower);
			expect(adjustForeignAttrName(lower, HTML_NAMESPACE)).toBe(lower);
			expect(adjustForeignAttrName(lower, null)).toBe(lower);
		},
	);

	test('[ml-foreign-attr-names-003] definitionurl is restored on a MathML element only', () => {
		expect(adjustForeignAttrName('definitionurl', MATHML_NAMESPACE)).toBe('definitionURL');
		expect(adjustForeignAttrName('definitionurl', SVG_NAMESPACE)).toBe('definitionurl');
		expect(adjustForeignAttrName('definitionurl', HTML_NAMESPACE)).toBe('definitionurl');
	});

	test('[ml-foreign-attr-names-004] a name outside the tables is unchanged', () => {
		for (const namespace of [SVG_NAMESPACE, MATHML_NAMESPACE, HTML_NAMESPACE, null]) {
			expect(adjustForeignAttrName('role', namespace)).toBe('role');
			expect(adjustForeignAttrName('data-x', namespace)).toBe('data-x');
			expect(adjustForeignAttrName('xlink:href', namespace)).toBe('xlink:href');
		}
		// A name of the table of MathML is not one of SVG, and the reverse
		expect(adjustForeignAttrName('viewbox', MATHML_NAMESPACE)).toBe('viewbox');
	});

	test('[ml-foreign-attr-names-005] only the lower-case form is adjusted', () => {
		expect(adjustForeignAttrName('VIEWBOX', SVG_NAMESPACE)).toBe('VIEWBOX');
		expect(adjustForeignAttrName('viewBox', SVG_NAMESPACE)).toBe('viewBox');
	});
});
