/**
 * @module
 *
 * ID references of the WAI-ARIA properties whose value is an ID reference or an ID reference list
 * (`aria-owns` and so on).
 *
 * An ID is looked up in the tree of the element that has the property (`getRootNode()`): a reference
 * does not reach across the boundary of a shadow root or of the content of a `template` element, and
 * the first element in tree order with the ID is the one it refers to. The values are read with
 * `getAttribute()` and split on ASCII whitespace.
 *
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute
 */

/**
 * The root of a tree that can be searched: a document or a document fragment.
 */
export type QueryableRoot = Node & {
	querySelectorAll(selectors: string): Iterable<Element>;
};

/**
 * The root of the tree of `el`, when it can be searched.
 *
 * @param el - An element
 * @returns The root, or `null`
 */
export function getQueryableRoot(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
): QueryableRoot | null {
	const root: unknown = el.getRootNode();
	if (root && typeof root === 'object' && 'querySelectorAll' in root && typeof root.querySelectorAll === 'function') {
		return root as QueryableRoot;
	}
	return null;
}

/**
 * The tokens of an ID reference list.
 *
 * @param value - The value of the attribute
 * @returns The IDs
 */
export function splitIdReferences(value: string | null): string[] {
	return (value ?? '').split(/[\t\n\f\r ]+/).filter(Boolean);
}
