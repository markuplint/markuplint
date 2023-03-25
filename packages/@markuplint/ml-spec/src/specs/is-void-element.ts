/**
 * @see https://html.spec.whatwg.org/multipage/syntax.html#void-elements
 */
const voidElements = [
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'source',
	'track',
	'wbr',
];

export function isVoidElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
) {
	return voidElements.includes(el.localName);
}
