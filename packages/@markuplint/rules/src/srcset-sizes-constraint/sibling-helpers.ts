import type { Element } from '@markuplint/ml-core';

import { hasSizesAuto } from './parse-srcset.js';

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

/**
 * Whether an `<img>`'s `loading` attribute is in the Lazy state.
 *
 * @param img - The `<img>` element
 * @returns `true` / `false`, or `null` when it cannot be known statically (a
 *   dynamic `loading` value, or spread attributes that may supply it)
 */
export function isLazyLoading(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	img: Element<boolean>,
): boolean | null {
	const loading = img.getAttributeNode('loading');
	if (loading?.isDynamicValue || (!loading && img.hasSpreadAttr)) {
		return null;
	}
	// The keyword is matched ASCII case-insensitively (HTML LS § lazy-loading attributes).
	return loading?.value.toLowerCase() === 'lazy';
}

/**
 * Whether an `<img>` "allows auto-sizes".
 *
 * HTML LS § allows-auto-sizes: its `loading` attribute is in the Lazy state,
 * and its `sizes` attribute's value is `auto` (ASCII case-insensitive) or
 * starts with `auto,`. `loading="lazy"` alone is not enough: that is what
 * the `<source>` direction of `no-unpaired-srcset-sizes` and
 * `sizes-auto-requires-lazy-loading` both depend on.
 *
 * @see https://html.spec.whatwg.org/multipage/embedded-content.html#allows-auto-sizes
 * @param img - The `<img>` element
 * @returns `true` / `false`, or `null` when it cannot be known statically
 */
export function allowsAutoSizes(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	img: Element<boolean>,
): boolean | null {
	const lazy = isLazyLoading(img);
	const auto = isAutoSizes(img);
	if (lazy === false || auto === false) {
		return false;
	}
	return lazy === null || auto === null ? null : true;
}

/**
 * Whether an `<img>`'s `sizes` attribute is `auto` or starts with `auto,`
 * (the `sizes` half of "allows auto-sizes"; see `hasSizesAuto`).
 *
 * @param img - The `<img>` element
 * @returns `true` / `false`, or `null` when it cannot be known statically (a
 *   dynamic `sizes` value, or spread attributes that may supply it)
 */
export function isAutoSizes(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	img: Element<boolean>,
): boolean | null {
	const sizes = img.getAttributeNode('sizes');
	if (sizes?.isDynamicValue || (!sizes && img.hasSpreadAttr)) {
		return null;
	}
	return sizes != null && hasSizesAuto(sizes.value);
}
