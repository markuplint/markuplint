/**
 * @module
 *
 * ID references of the WAI-ARIA properties whose value is an ID reference or an ID reference list
 * (`aria-owns` and so on).
 *
 * An ID is looked up in the tree of the element that has the property (`getRootNode()`): a reference
 * does not reach across the boundary of a shadow root or of the content of a `template` element, and
 * the first element in tree order with the ID is the one it refers to. The tree order of the root of
 * `@markuplint/ml-core` holds the elements that a pretender declares as well, where the component renders them
 * ({@link getElementsInTreeOrder}). The values are read with `getAttribute()` and split on ASCII whitespace.
 *
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute
 */

/**
 * The root of a tree that can be searched: a document or a document fragment. `elementsInTreeOrder` is a method of
 * the root that `@markuplint/ml-core` hands over: the elements of the markup with those that a component renders and
 * the markup does not write (the elements that a pretender declares). A DOM has no such method, and
 * `querySelectorAll('*')` stands for it.
 */
export type QueryableRoot = Node & {
	querySelectorAll(selectors: string): Iterable<Element>;
	readonly elementsInTreeOrder?: () => Iterable<Element>;
};

/**
 * The elements of the tree in tree order, with those that a component renders when the root tells them
 * ({@link QueryableRoot}).
 *
 * @param root - The root of the tree
 * @returns The elements
 */
export function getElementsInTreeOrder(root: QueryableRoot): Iterable<Element> {
	return typeof root.elementsInTreeOrder === 'function'
		? root.elementsInTreeOrder.call(root)
		: root.querySelectorAll('*');
}

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
