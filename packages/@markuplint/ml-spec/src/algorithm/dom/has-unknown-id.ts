/**
 * @module
 *
 * What an id reference may refer to when the markup does not tell the id.
 *
 * An element whose `id` is not known until it is rendered (`<h2 id={x}>`), an element whose spread
 * attribute may carry one (`<h2 {...props}>`), a component that no pretender resolved, content that is
 * not known (`{children}`, a pretender whose `contents` has an unknown entry), and an element that a
 * pretender declares (a slot wrapper, an entry of `contents`) that is one of those (an `id` that is
 * `{ dynamic: true }`, a spread taken over from the usage site, a component name), may be the element that a
 * reference refers to. A rule that reports a reference to nothing, or an algorithm that decides from the
 * element that a reference finds, takes the tree to be undecidable instead (`no-refer-to-non-existent-id`
 * does the same). For an `aria-labelledby`, {@link labelledbyMayReferToUnknownId} below is the one reader
 * of the criterion: `isValidLandmarkRole` of `get-explicit-role.ts` in this package,
 * `MLElement#mayHaveAccessibleName` of `@markuplint/ml-core` (so `:aria(has name)` and
 * `require-accessible-name`), the `:aria()` selector of `@markuplint/selector` and
 * `accnameMayComeFromUnknownContent` of `@markuplint/rules` ask it, so a change to the criterion belongs
 * here.
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

import { decodeEntities, splitOnAsciiWhitespace } from '@markuplint/shared';

/**
 * The attribute as `@markuplint/ml-core` hands it over: `isDynamicValue` is true for a value that is not
 * known until it is rendered, and `isExpressionValue` for a value that is written as code.
 */
type MLAttrLike = Attr & { readonly isDynamicValue?: boolean; readonly isExpressionValue?: boolean };

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
 * Whether the `aria-labelledby` of the element may refer to an element that gives a name, as far as the
 * markup tells: its value is not known until it is rendered (`aria-labelledby={id}`), or a token refers
 * to no element of the tree while the tree may have an element whose `id` is not known
 * ({@link hasElementOfUnknownId}: `<p id={id}>`). Such a reference is not known to give nothing, and
 * markuplint does not decide what it cannot know.
 *
 * `isValidLandmarkRole` of `get-explicit-role.ts`, `MLElement#mayHaveAccessibleName` of
 * `@markuplint/ml-core` and `:aria(has name)` of `@markuplint/selector` read it, so the criterion is in one
 * place. An attribute that the framework does not output (`aria-labelledby={undefined}`) is not returned by
 * `getAttributeNode` of `@markuplint/ml-core`, so it refers to nothing. A value of nothing but white space
 * has no token.
 *
 * @param el - The element that has the `aria-labelledby`
 * @returns `true` if the reference may be to an element that gives a name
 * @see https://w3c.github.io/accname/#comp_labelledby
 */
export function labelledbyMayReferToUnknownId(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
): boolean {
	if (isUnknownValueAttr(el.getAttributeNode('aria-labelledby'))) {
		return true;
	}
	const resolved = resolveLabelledby(el);
	return !!resolved && resolved.some(target => !target) && hasElementOfUnknownId(el);
}

/**
 * Whether a token of the `aria-labelledby` of the element refers to an element of the tree it is in.
 * The tokens of a value that is not known until it is rendered are not known, so it refers to none.
 *
 * @param el - The element that has the `aria-labelledby`
 * @returns `true` if at least one token refers to an element
 */
export function labelledbyRefersToElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
): boolean {
	return !!resolveLabelledby(el)?.some(target => !!target);
}

/**
 * Looks each token of the `aria-labelledby` of the element up in the tree it is in, which is the document,
 * the content of a `template` element or a shadow root, each a tree of its own. A DOM has resolved the
 * character references of a token already, but the markuplint DOM gives it as written in the markup, so
 * the token is looked for as it is, and then with its character references resolved. The value of an
 * expression (`aria-labelledby={"a"}`) is a string of the code, not markup, so it is looked for as it is.
 *
 * @param el - The element that has the `aria-labelledby`
 * @returns The element each token refers to (`null` for none), or `null` for an element that is in no tree,
 * has no `aria-labelledby`, has a value that is not known until it is rendered (its tokens are not known),
 * or has a value of nothing but white space, which has no token
 */
function resolveLabelledby(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
): (Element | null)[] | null {
	const attr = el.getAttributeNode('aria-labelledby');
	const root = el.getRootNode();
	if (!attr || isUnknownValueAttr(attr) || (root.nodeType !== 9 && root.nodeType !== 11)) {
		return null;
	}
	const ids = splitOnAsciiWhitespace(attr.value);
	if (ids.length === 0) {
		return null;
	}
	const tree = root as Document;
	const isExpression = !!(attr as MLAttrLike).isExpressionValue;
	return ids.map(id => tree.getElementById(id) ?? (isExpression ? null : tree.getElementById(decodeEntities(id))));
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
