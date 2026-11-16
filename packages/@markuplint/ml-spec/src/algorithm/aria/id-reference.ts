import type { SpecElement, SpecRoot } from '../../types/spec-element.js';

/**
 * @module
 *
 * ID references of the WAI-ARIA properties whose value is an ID reference or an ID reference list
 * (`aria-owns` and so on).
 *
 * An ID is looked up in the tree of the element that has the property (`getRootNode()`): a reference
 * does not reach across the boundary of a shadow root or of the content of a `template` element, and
 * the first element in tree order with the ID is the one it refers to. The values are read with
 * `getAttrValue()` and split on ASCII whitespace.
 *
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute
 */

/**
 * The elements of the tree of a root, in tree order: those whose own root ({@link SpecElement.getRootNode})
 * is the root. An element in a tree of its own (the content of a `template` element, a shadow root) is
 * not listed, though it is below an element that is.
 *
 * @param root - The root of a tree: a document, a document fragment or a shadow root
 * @returns The elements of the tree
 */
export function getTreeElements(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	root: SpecRoot,
): SpecElement[] {
	const elements: SpecElement[] = [];
	const walk = (
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		parent: SpecRoot | SpecElement,
	) => {
		for (const child of parent.childElements) {
			if (child.getRootNode() === root) {
				elements.push(child);
			}
			walk(child);
		}
	};
	walk(root);
	return elements;
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
