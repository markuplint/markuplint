/**
 * @module
 *
 * What an id reference may refer to when the markup does not tell the id.
 *
 * An element whose `id` is not known until it is rendered (`<h2 id={x}>`) is not found by its id,
 * and a reference to an id that no element has may be a reference to it. A rule that reports a
 * reference to nothing, or an algorithm that decides from the element that a reference finds,
 * takes the tree to be undecidable instead (`no-refer-to-non-existent-id` does the same, and
 * `isValidLandmarkRole` and `accnameMayComeFromUnknownContent` of `@markuplint/rules` follow it:
 * a change to the criterion belongs to all of them).
 *
 * That is a decision of markuplint, as it does not decide what it cannot know, and not text of a
 * specification: the specifications define an id and an id reference, and not an id that is not
 * known yet.
 *
 * `isDynamicValue` is read from the attribute that `@markuplint/ml-core` hands over; a DOM's `Attr`
 * has none, so a tree of a real DOM has no such element. An attribute that the framework does not
 * output (`id={undefined}`) is not returned by `getAttributeNode` of `@markuplint/ml-core`, so it
 * is not counted either.
 *
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute
 */

/**
 * The attribute as `@markuplint/ml-core` hands it over: `isDynamicValue` is true for a value that is not
 * known until it is rendered.
 */
type MLAttrLike = Attr & { readonly isDynamicValue?: boolean };

/**
 * Whether the value of the attribute is not known until it is rendered (`aria-labelledby={id}`).
 *
 * @param attr - The attribute that `getAttributeNode` returns, or `null` for an element that has none
 * @returns `true` if the attribute is there and its value is not known
 */
export function isUnknownValueAttr(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: Attr | null,
): boolean {
	return !!(attr as MLAttrLike | null)?.isDynamicValue;
}

/**
 * The answer for each tree. A tree does not change while a document is verified, as the map of ids that
 * `getElementById` of `@markuplint/ml-core` builds once does not.
 */
const cache = new WeakMap<object, boolean>();

/**
 * Whether the tree that `el` is in (its `getRootNode()`: the document, the content of a `template`
 * element or a shadow root, each a tree of its own) has an element whose `id` is not known until
 * it is rendered. The answer is the same for every element of the tree, so it is computed once
 * for the tree: call it on a tree that is not changed after the first call, such as the document
 * of `@markuplint/ml-core`.
 *
 * @param el - An element of the tree
 * @returns `true` if such an element is in the tree; `false` if it is in no tree
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute
 */
export function hasElementOfUnknownId(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
): boolean {
	const root = el.getRootNode();
	if (root.nodeType !== 9 && root.nodeType !== 11) {
		return false;
	}
	let result = cache.get(root);
	if (result === undefined) {
		result = false;
		for (const e of (root as Document).querySelectorAll('[id]')) {
			if (isUnknownValueAttr(e.getAttributeNode('id'))) {
				result = true;
				break;
			}
		}
		cache.set(root, result);
	}
	return result;
}
