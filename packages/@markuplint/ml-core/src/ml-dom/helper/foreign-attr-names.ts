const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';

/**
 * The names of SVG attributes that are not all lower case, the second column of the table of
 * "adjust SVG attributes". The HTML parser lower-cases a name it reads and then restores these.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#adjust-svg-attributes
 */
const SVG_ATTR_NAMES = new Map(
	[
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
	].map(name => [name.toLowerCase(), name]),
);

/**
 * The name that the HTML parser gives an attribute of an element in a foreign namespace: the name
 * lower-cased, with the case restored for the names of SVG (`viewbox` is `viewBox`) and MathML
 * (`definitionurl` is `definitionURL`).
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#adjust-svg-attributes
 * @see https://html.spec.whatwg.org/multipage/parsing.html#adjust-mathml-attributes
 *
 * @param lowerCaseName - The name with its ASCII letters lower-cased
 * @param namespaceURI - The namespace of the element that the attribute is on
 * @returns The name in the DOM
 */
export function adjustForeignAttrName(lowerCaseName: string, namespaceURI: string | null): string {
	if (namespaceURI === SVG_NAMESPACE) {
		return SVG_ATTR_NAMES.get(lowerCaseName) ?? lowerCaseName;
	}
	if (namespaceURI === MATHML_NAMESPACE && lowerCaseName === 'definitionurl') {
		return 'definitionURL';
	}
	return lowerCaseName;
}
