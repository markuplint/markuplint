import type { Element } from '@markuplint/ml-core';

/**
 * Cache for `findChildren` results, by element and then by selector.
 *
 * Keyed by the element itself, weakly: the result holds elements, and an element holds the document that it is in,
 * so a cache that outlives the document keeps every document that it has been asked about (a language server lints
 * one after another in one process).
 */
const findCache = new WeakMap<Element<boolean>, Map<string, Element<boolean>[]>>();

/**
 * Finds direct children of an element matching the given CSS selector, with caching.
 *
 * Results are cached by element and selector to avoid redundant DOM traversals
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
	let bySelector = findCache.get(el);
	if (!bySelector) {
		bySelector = new Map();
		findCache.set(el, bySelector);
	}
	const cached = bySelector.get(selector);
	if (cached) {
		return cached;
	}

	const children = [...el.children].filter(child => child.matches(selector));

	bySelector.set(selector, children);
	return children;
}
