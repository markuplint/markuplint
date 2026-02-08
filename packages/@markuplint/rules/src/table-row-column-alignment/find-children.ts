import type { Element } from '@markuplint/ml-core';

/** Cache for `findChildren` results, keyed by element UUID and selector. */
const findCache: Record<string, Element<boolean>[]> = {};

/**
 * Finds direct children of an element matching the given CSS selector, with caching.
 *
 * Results are cached by element UUID and selector to avoid redundant DOM traversals
 * when the same element/selector combination is queried multiple times.
 *
 * @param el - The parent element to search within.
 * @param selector - The CSS selector to match children against.
 * @returns An array of matching child elements.
 */
export function findChildren(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean>,
	selector: string,
) {
	const key = `${el.uuid}:${selector}`;
	const cached = findCache[key];
	if (cached) {
		return cached;
	}

	const children = [...el.children].filter(child => child.matches(selector));

	findCache[key] = children;
	return children;
}
