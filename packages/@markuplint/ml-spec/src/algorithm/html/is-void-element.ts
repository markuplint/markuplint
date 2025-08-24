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

export function isVoidElement(el: { readonly localName: string }) {
	return voidElements.has(el.localName);
}
