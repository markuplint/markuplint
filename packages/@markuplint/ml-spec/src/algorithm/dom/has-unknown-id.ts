/**
 * @module
 *
 * What an id reference may refer to when the markup does not tell the id.
 *
 * An element whose `id` is not known until it is rendered (`<h2 id={x}>`), an element whose spread
 * attribute may carry one (`<h2 {...props}>`), a component that no pretender resolved, and content that is
 * not known (`{children}`, a pretender whose `contents` has an unknown entry) may be the element that a
 * reference refers to. A rule that reports a reference to nothing, or an algorithm that decides from the
 * element that a reference finds, takes the tree to be undecidable instead (`no-refer-to-non-existent-id`
 * does the same, and `isValidLandmarkRole` of `get-explicit-role.ts` in this package and
 * `accnameMayComeFromUnknownContent` of `@markuplint/rules` follow it: a change to the criterion
 * belongs to all of them).
 *
 * `isRoleUnknown` of `@markuplint/rules` rests on the same premise for a `role` that code gives, with a
 * criterion of its own. What counts here, and why, is in the module comment of `helper/unknown-id.ts` of
 * `@markuplint/ml-core`, which `MLElement#treeMayHoldUnknownId` answers from.
 *
 * That is a decision of markuplint, as it does not decide what it cannot know, and not text of a
 * specification: the specifications define an id and an id reference, and not an id that is not
 * known yet. An id that another file may hold (the file is a part of a page) is not counted: the
 * file is taken to be the whole document.
 *
 * `treeMayHoldUnknownId` and `isDynamicValue` are read from what `@markuplint/ml-core` hands over; a DOM
 * has neither, so the scan that stands for them finds nothing in a tree of a real DOM. An
 * attribute that the framework does not output (`id={undefined}`) is not returned by `getAttributeNode` of
 * `@markuplint/ml-core`, so it is not counted either.
 *
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute
 */

/**
 * The attribute as `@markuplint/ml-core` hands it over: `isDynamicValue` is true for a value that is not
 * known until it is rendered.
 */
type MLAttrLike = Attr & { readonly isDynamicValue?: boolean };

/**
 * The element as `@markuplint/ml-core` hands it over: `treeMayHoldUnknownId` is the answer of its own
 * tree. A DOM has no such method.
 */
type MLElementLike = Element & { readonly treeMayHoldUnknownId?: () => boolean };

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
 * element or a shadow root, each a tree of its own) may have an element whose `id` the markup does not
 * tell. `@markuplint/ml-core` answers for its own tree (`MLElement#treeMayHoldUnknownId`); the tree of a
 * DOM is scanned for an `id` that is not known until it is rendered. The answer is the same for every
 * element of the tree, so it is computed once for the tree: call it on a tree that is not changed after
 * the first call, such as the document of `@markuplint/ml-core`.
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
	const treeMayHoldUnknownId = (el as MLElementLike).treeMayHoldUnknownId;
	if (typeof treeMayHoldUnknownId === 'function') {
		return treeMayHoldUnknownId.call(el);
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
