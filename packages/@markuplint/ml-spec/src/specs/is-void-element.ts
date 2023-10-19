/**
 * @see https://html.spec.whatwg.org/multipage/syntax.html#void-elements
 */
const voidElements = new Set([
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
]);

export function isVoidElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
) {
	return voidElements.has(el.localName);
}
