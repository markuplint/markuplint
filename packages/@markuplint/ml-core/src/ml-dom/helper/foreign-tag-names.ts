const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * The names of SVG elements that are not all lower case, the second column of the table in the rule
 * for a start tag in foreign content. The HTML parser lower-cases a tag name it reads and then
 * restores these.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign
 */
const SVG_TAG_NAMES = new Map(
	[
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
	].map(name => [name.toLowerCase(), name]),
);

/**
 * The name that the HTML parser gives an element in a foreign namespace: the name lower-cased, with
 * the case restored for the names of SVG (`textpath` is `textPath`). The name of a MathML element
 * is all lower case, so the lower-cased name is the one.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign
 *
 * @param lowerCaseName - The name with its ASCII letters lower-cased
 * @param namespaceURI - The namespace of the element
 * @returns The name in the DOM
 */
export function adjustForeignTagName(lowerCaseName: string, namespaceURI: string | null): string {
	if (namespaceURI === SVG_NAMESPACE) {
		return SVG_TAG_NAMES.get(lowerCaseName) ?? lowerCaseName;
	}
	return lowerCaseName;
}
