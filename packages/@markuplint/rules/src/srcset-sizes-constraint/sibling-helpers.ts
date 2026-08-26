import type { Element } from '@markuplint/ml-core';

/**
 * Iterate the element's following element siblings in document order.
 *
 * Shared by `no-unpaired-srcset-sizes`, `sizes-auto-requires-lazy-loading`, and
 * `no-always-matching-source` — the three rules split out of the former
 * `srcset-sizes-constraint` rule that need to look at a `<source>`'s following
 * siblings.
 *
 * @param el - The element whose following siblings to iterate
 * @yields Each following element sibling, nearest first
 */
export function* followingElementSiblings(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean>,
): Generator<Element<boolean>> {
	let sibling = el.nextElementSibling;
	while (sibling != null) {
		yield sibling;
		sibling = sibling.nextElementSibling;
	}
}

/**
 * Find the first following sibling `<img>` element.
 * Per the spec, the img does not have to be the immediately next sibling.
 *
 * @param el - The starting element to search from
 * @returns The first following sibling `<img>` element, or `null` if none found
 */
export function findFollowingImg(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean>,
): Element<boolean> | null {
	for (const sibling of followingElementSiblings(el)) {
		if (sibling.localName === 'img') {
			return sibling;
		}
	}
	return null;
}
