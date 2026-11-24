import type { SpecAttr, SpecElement } from '../../types/spec-element.js';

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
 * `isDynamicValue` is read from the attribute that `@markuplint/ml-core` hands over. An attribute that
 * the framework does not output (`id={undefined}`) is not returned by `getAttrNode` of
 * `@markuplint/ml-core`, so it is not counted either. The Rust engine follows the same criterion
 * (`tree_may_hold_unknown_id` of `crates/markuplint-rules`).
 *
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute
 */

/**
 * Whether the value of the attribute is not known until it is rendered (`aria-labelledby={id}`).
 *
 * @param attr - The attribute that `getAttrNode` returns, or `null` for an element that has none
 * @returns `true` if the attribute is there and its value is not known
 */
export function isUnknownValueAttr(attr: SpecAttr | null): boolean {
	return !!attr?.isDynamicValue;
}

/**
 * Whether the tree that `el` is in (its `getRootNode()`: the document, the content of a `template`
 * element or a shadow root, each a tree of its own) may have an element whose `id` the markup does not
 * tell. `@markuplint/ml-core` answers for its own tree (`MLElement#treeMayHoldUnknownId`).
 *
 * @param el - An element of the tree
 * @returns `true` if the tree may hold such an element; `false` if it is in no tree
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute
 */
export function hasElementOfUnknownId(el: SpecElement): boolean {
	const root = el.getRootNode();
	if (root.nodeType !== 9 && root.nodeType !== 11) {
		return false;
	}
	return el.treeMayHoldUnknownId();
}
