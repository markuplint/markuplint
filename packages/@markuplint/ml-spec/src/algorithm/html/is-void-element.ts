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

/**
 * Determines whether an element is a void element as defined by the HTML specification.
 * Void elements cannot have any contents (e.g., `<br>`, `<img>`, `<input>`).
 *
 * @see https://html.spec.whatwg.org/multipage/syntax.html#void-elements
 *
 * @param el - An object with a `localName` property representing the element's tag name
 * @returns `true` if the element is a void element
 */
export function isVoidElement(el: { readonly localName: string }) {
	return voidElements.has(el.localName);
}
